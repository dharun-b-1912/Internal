"use client";

import { useMemo, useRef, useState } from "react";
import { Award, FileSpreadsheet, Download, Printer, UserCheck, Users, Building2, MapPin, Calendar, CalendarDays, Coins, Search, Check, BarChart3 } from "lucide-react";
import { referenceReport } from "../lib/referral-reports";
import { printIsolatedElement } from "../lib/print-document";
import { formatDisplayDate } from "../lib/date-format";
import type { AppData, PayrollItem, PayrollRun } from "./payroll-app";

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

type Row = (string | number)[];

function downloadRows(name: string, rows: Row[], excel = false) {
  const text = (v: string | number) =>
    typeof v === "string" && /^[\s]*[=+@-]/.test(v) ? `'${v}` : String(v);
  const escape = (v: string | number) =>
    text(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const body = excel
    ? `\ufeff<html><head><meta charset="utf-8"></head><body><table>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`)
        .join("")}</table></body></html>`
    : "\ufeff" +
      rows
        .map((r) =>
          r.map((c) => `"${text(c).replaceAll('"', '""')}"`).join(",")
        )
        .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([body], {
      type: excel ? "application/vnd.ms-excel" : "text/csv;charset=utf-8",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.${excel ? "xls" : "csv"}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReferenceReports({
  data,
  run,
  vendorId,
  unitId,
  initialQuery,
}: {
  data: AppData;
  run?: PayrollRun | null;
  vendorId?: string;
  unitId?: string;
  initialQuery?: string;
}) {
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const r of data.runs) {
      if (r.payPeriod) set.add(r.payPeriod);
    }
    for (const a of data.attendance || []) {
      if (a.attendanceDate) set.add(a.attendanceDate.slice(0, 7));
    }
    if (run?.payPeriod) set.add(run.payPeriod);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data.runs, data.attendance, run?.payPeriod]);

  const [reference, setReference] = useState<1 | 2>(1);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId || "all");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId || "all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(run?.payPeriod || availablePeriods[0] || "all");
  const [cadence, setCadence] = useState<"monthly" | "quarterly" | "half_yearly" | "annually">("monthly");
  const [minimum, setMinimum] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [query, setQuery] = useState(initialQuery || "");
  const print = useRef<HTMLDivElement>(null);

  // Filter people based on selected company & unit filters (defaulting to all for organization-wide visibility)
  const people = useMemo(() => {
    return data.employees.filter((e) => {
      if (selectedVendorId !== "all" && e.vendorId !== selectedVendorId) {
        return false;
      }
      if (selectedUnitId !== "all" && e.clientUnitId !== selectedUnitId) {
        return false;
      }
      return true;
    });
  }, [data.employees, selectedVendorId, selectedUnitId]);

  // Available units for the selected company
  const availableUnits = useMemo(() => {
    if (selectedVendorId === "all") {
      return data.units;
    }
    return data.units.filter((u) => u.vendorId === selectedVendorId);
  }, [data.units, selectedVendorId]);

  // Unit lookup helper
  const unitMap = useMemo(() => {
    return new Map(data.units.map((u) => [u.id, u]));
  }, [data.units]);

  // Vendor lookup helper
  const vendorMap = useMemo(() => {
    return new Map(data.vendors.map((v) => [v.id, v]));
  }, [data.vendors]);

  // Determine items based on selected filters (Company, Unit, Period, Cadence)
  const items = useMemo(() => {
    const targetPeriods = new Set<string>();
    const activePeriod = selectedPeriod || run?.payPeriod || availablePeriods[0] || "";

    if (activePeriod === "all" || !activePeriod) {
      for (const p of availablePeriods) targetPeriods.add(p);
    } else {
      const [yearStr, monthStr] = activePeriod.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);

      if (cadence === "monthly") {
        targetPeriods.add(activePeriod);
      } else if (cadence === "quarterly") {
        const q = Math.ceil(month / 3);
        const startMonth = (q - 1) * 3 + 1;
        for (let m = startMonth; m < startMonth + 3; m++) {
          targetPeriods.add(`${year}-${String(m).padStart(2, "0")}`);
        }
      } else if (cadence === "half_yearly") {
        const startMonth = month <= 6 ? 1 : 7;
        for (let m = startMonth; m < startMonth + 6; m++) {
          targetPeriods.add(`${year}-${String(m).padStart(2, "0")}`);
        }
      } else if (cadence === "annually") {
        for (let m = 1; m <= 12; m++) {
          targetPeriods.add(`${year}-${String(m).padStart(2, "0")}`);
        }
      } else {
        targetPeriods.add(activePeriod);
      }
    }

    // Filter runs matching the scope & period
    const matchingRuns = data.runs.filter((r: PayrollRun) => {
      if (selectedVendorId !== "all" && r.vendorId !== selectedVendorId) {
        return false;
      }
      if (selectedUnitId !== "all" && r.clientUnitId !== selectedUnitId) {
        return false;
      }
      if (activePeriod !== "all" && r.payPeriod && !targetPeriods.has(r.payPeriod)) {
        return false;
      }
      return true;
    });

    const matchingRunIds = new Set(matchingRuns.map((r) => r.id));
    const matchingPayrollItems = data.payrollItems.filter((i) => matchingRunIds.has(i.runId));

    // Aggregate by employeeId
    const employeeMap = new Map<string, { employeeId: string; presentDays: number; payableDays: number }>();

    for (const item of matchingPayrollItems) {
      const existing = employeeMap.get(item.employeeId);
      if (!existing) {
        employeeMap.set(item.employeeId, {
          employeeId: item.employeeId,
          presentDays: Number(item.presentDays || item.payableDays || 0),
          payableDays: Number(item.payableDays || 0),
        });
      } else {
        existing.presentDays += Number(item.presentDays || item.payableDays || 0);
        existing.payableDays += Number(item.payableDays || 0);
      }
    }

    // Also include attendance records if present
    if (Array.isArray(data.attendance)) {
      const attMap = new Map<string, number>();
      for (const a of data.attendance) {
        if (!a.employeeId || !a.attendanceDate) continue;
        if (!["P", "HP", "HD"].includes(a.statusCode)) continue;
        const ym = a.attendanceDate.slice(0, 7);
        if (activePeriod !== "all" && targetPeriods.size > 0 && !targetPeriods.has(ym)) continue;
        const weight = a.statusCode === "HD" ? 0.5 : 1;
        attMap.set(a.employeeId, (attMap.get(a.employeeId) || 0) + weight);
      }

      for (const [empId, days] of attMap.entries()) {
        const existing = employeeMap.get(empId);
        if (!existing) {
          employeeMap.set(empId, {
            employeeId: empId,
            presentDays: days,
            payableDays: days,
          });
        } else if (days > existing.presentDays) {
          existing.presentDays = Math.max(existing.presentDays, days);
          existing.payableDays = Math.max(existing.payableDays, days);
        }
      }
    }

    return Array.from(employeeMap.values());
  }, [
    data.runs,
    data.payrollItems,
    data.attendance,
    selectedPeriod,
    run?.payPeriod,
    availablePeriods,
    cadence,
    selectedVendorId,
    selectedUnitId,
  ]);

  const rows = useMemo(() => {
    return referenceReport(people, items, reference, minimum, bonus).filter((r) =>
      `${r.referrerName} ${r.referrerCode} ${r.employeeName} ${r.employeeCode}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [people, items, reference, minimum, bonus, query]);

  const totalBonus = useMemo(() => {
    return rows.reduce((n, r) => n + r.bonusEstimate, 0);
  }, [rows]);

  const eligibleCount = useMemo(() => {
    return rows.filter((r) => r.eligible).length;
  }, [rows]);

  // Group by Referrer for summary breakdown & top performer
  const summaries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; code: string; count: number; eligible: number; total: number }
    >();
    for (const r of rows) {
      const key = r.referrerId || `${r.referrerName.trim().toLowerCase()}|${r.phone || ""}`;
      const group = map.get(key) || {
        name: r.referrerName,
        code: r.referrerCode || "N/A",
        count: 0,
        eligible: 0,
        total: 0,
      };
      group.count++;
      if (r.eligible) group.eligible++;
      group.total += r.bonusEstimate;
      map.set(key, group);
    }
    return map;
  }, [rows]);

  const topReferrer = useMemo(() => {
    let top: { name: string; count: number } | null = null;
    for (const g of summaries.values()) {
      if (!top || g.count > top.count) {
        top = { name: g.name, count: g.count };
      }
    }
    return top;
  }, [summaries]);

  const title =
    reference === 1
      ? "Reference 1: Joy Staff Member Referral Report"
      : "Reference 2: Other Non-Relative Reference Report";

  const headings = [
    "Referrer Code",
    "Referrer Name",
    ...(reference === 2 ? ["Phone", "Position", "Address"] : []),
    "Employee Code",
    "Employee Name",
    "Company Entity",
    "Client Unit Placement",
    "Joining Date",
    "Status",
    "Worked Days",
    "Payable Days",
    "Bonus Estimate",
  ];

  const exportRows: Row[] = [
    [title],
    ["Cadence", cadence.toUpperCase()],
    ["Company Scope", selectedVendorId === "all" ? "All Group Companies" : (vendorMap.get(selectedVendorId)?.name || selectedVendorId)],
    ["Client Unit Scope", selectedUnitId === "all" ? "All Client Units" : (unitMap.get(selectedUnitId)?.unitName || selectedUnitId)],
    ["Payroll period", selectedPeriod === "all" ? "All recorded periods" : (selectedPeriod || "All periods")],
    ["Minimum worked days", minimum],
    ["Bonus per qualifying employee", bonus],
    ["Note", "Bonus estimates are provisional and subject to HR review."],
    headings,
    ...rows.map((r) => {
      const vObj = r.vendorId ? vendorMap.get(r.vendorId) : null;
      const uObj = r.clientUnitId ? unitMap.get(r.clientUnitId) : null;
      return [
        r.referrerCode,
        r.referrerName,
        ...(reference === 2 ? [r.phone, r.position, r.address] : []),
        r.employeeCode,
        r.employeeName,
        vObj?.name || "—",
        uObj ? `${uObj.clientName} · ${uObj.unitName}` : "—",
        formatDisplayDate(r.joiningDate),
        r.status,
        r.workedDays,
        r.payableDays,
        r.bonusEstimate,
      ];
    }),
  ];

  return (
    <section
      className="panel joy-referral-revenue"
      style={{
        borderRadius: "16px",
        padding: "24px",
        background: "#ffffff",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
        marginTop: "16px",
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "18px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <Award size={22} style={{ color: "#2563eb" }} />
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Staff Referral Incentives &amp; Recruiter Payouts
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: "6px",
                background: "#dbeafe",
                color: "#1e40af",
              }}
            >
              {cadence.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Track candidate referrals credited to Joy staff across all client units, set qualification thresholds, and calculate period bonus payouts.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              downloadRows(`referral-report-${reference}-${cadence}-${selectedPeriod || "all"}`, exportRows, true)
            }
            style={{ fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FileSpreadsheet size={15} style={{ color: "#166534" }} />
            <span>Export Excel (.xls)</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              downloadRows(`referral-report-${reference}-${cadence}-${selectedPeriod || "all"}`, exportRows, false)
            }
            style={{ fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} style={{ color: "#475569" }} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (print.current) void printIsolatedElement(print.current, "report");
            }}
            style={{ fontWeight: 600, fontSize: "13px", background: "#2563eb", border: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Control Strip (Pill Tabs + Rules Card) */}
      <div
        style={{
          background: "#f8fafc",
          borderRadius: "12px",
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
        }}
      >
        {/* Row 1: Target Reference Type & Cadence Selection */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "16px",
            paddingBottom: "14px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          {/* Reference Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Reference Target:
            </span>
            <button
              type="button"
              onClick={() => setReference(1)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                border: reference === 1 ? "2px solid #2563eb" : "1px solid #cbd5e1",
                background: reference === 1 ? "#eff6ff" : "#fff",
                color: reference === 1 ? "#1e40af" : "#475569",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UserCheck size={14} />
              <span>Reference 1: Joy Staff Only</span>
            </button>
            <button
              type="button"
              onClick={() => setReference(2)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                border: reference === 2 ? "2px solid #2563eb" : "1px solid #cbd5e1",
                background: reference === 2 ? "#eff6ff" : "#fff",
                color: reference === 2 ? "#1e40af" : "#475569",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Users size={14} />
              <span>Reference 2: Other Reference</span>
            </button>
          </div>

          {/* Cadence Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Period Cadence:
            </span>
            {(
              [
                ["monthly", "Monthly"],
                ["quarterly", "Quarterly (3M)"],
                ["half_yearly", "Half-Yearly (6M)"],
                ["annually", "Annually (1Yr)"],
              ] as const
            ).map(([cad, label]) => (
              <button
                key={cad}
                type="button"
                onClick={() => setCadence(cad)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: cadence === cad ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                  background: cadence === cad ? "#0284c7" : "#fff",
                  color: cadence === cad ? "#ffffff" : "#475569",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Organization Scope & Incentive Parameters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "14px",
          }}
        >
          {/* Company Entity Scope */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <Building2 size={13} style={{ color: "#475569" }} /> Company Entity
            </span>
            <select
              value={selectedVendorId}
              onChange={(e) => {
                setSelectedVendorId(e.target.value);
                setSelectedUnitId("all");
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            >
              <option value="all">All Group Companies (Org-Wide)</option>
              {data.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Filter by employer legal company
            </small>
          </label>

          {/* Client Unit Scope */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <MapPin size={13} style={{ color: "#475569" }} /> Client Unit Location
            </span>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            >
              <option value="all">All Client Units</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.clientName} - {u.unitName} ({u.location})
                </option>
              ))}
            </select>
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Filter by client workplace
            </small>
          </label>

          {/* Payroll Period / Month */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <Calendar size={13} style={{ color: "#475569" }} /> Payroll Month / Period
            </span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            >
              <option value="all">All Recorded Periods</option>
              {availablePeriods.map((p) => {
                let label = p;
                try {
                  const [y, m] = p.split("-").map(Number);
                  if (y && m) {
                    label = `${new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} (${p})`;
                  }
                } catch {}
                return (
                  <option key={p} value={p}>
                    {label}
                  </option>
                );
              })}
            </select>
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Filter by payroll calculation period
            </small>
          </label>

          {/* Min Worked Days */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <CalendarDays size={13} style={{ color: "#475569" }} /> Min. Worked Days to Qualify
            </span>
            <input
              type="number"
              min={0}
              step="0.5"
              placeholder="e.g. 26"
              value={minimum || ""}
              onChange={(e) => setMinimum(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            />
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Min days worked in {cadence.replace("_", " ")}
            </small>
          </label>

          {/* Bonus Amount */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <Coins size={13} style={{ color: "#475569" }} /> Bonus per Candidate (₹)
            </span>
            <input
              type="number"
              min={0}
              step="10"
              placeholder="e.g. 500"
              value={bonus || ""}
              onChange={(e) => setBonus(Math.max(0, Number(e.target.value) || 0))}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            />
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Incentive payable per qualifying person
            </small>
          </label>

          {/* Search */}
          <label style={{ display: "block" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "4px" }}>
              <Search size={13} style={{ color: "#475569" }} /> Search Referrer or Employee
            </span>
            <input
              type="text"
              placeholder="Search staff, candidate, code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#fff",
              }}
            />
            <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "3px" }}>
              Filter by name or employee code
            </small>
          </label>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
            Total Referred
          </span>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#14532d", margin: "4px 0" }}>
            {rows.length} <span style={{ fontSize: "14px", fontWeight: 600 }}>candidates</span>
          </div>
          <small style={{ color: "#16a34a", fontSize: "12px" }}>In {cadence.replace("_", " ")} period</small>
        </div>

        <div
          style={{
            padding: "16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
            Qualified Candidates
          </span>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e3a8a", margin: "4px 0" }}>
            {eligibleCount} <span style={{ fontSize: "14px", fontWeight: 600 }}>met criteria</span>
          </div>
          <small style={{ color: "#2563eb", fontSize: "12px" }}>{minimum > 0 ? `≥ ${minimum} days worked` : "All with worked days"}</small>
        </div>

        <div
          style={{
            padding: "16px",
            background: "#faf5ff",
            border: "1px solid #e9d5ff",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#6b21a8", textTransform: "uppercase" }}>
            Total Estimated Bonus
          </span>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#581c87", margin: "4px 0" }}>
            {money(totalBonus)}
          </div>
          <small style={{ color: "#9333ea", fontSize: "12px" }}>@{bonus > 0 ? `₹${bonus}/candidate` : "₹0 configured"}</small>
        </div>

        <div
          style={{
            padding: "16px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
            Top Sourcing Leader
          </span>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#78350f", margin: "6px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
            {topReferrer ? (
              <>
                <Award size={18} style={{ color: "#d97706" }} />
                <span>{topReferrer.name}</span>
              </>
            ) : (
              "No referrals"
            )}
          </div>
          <small style={{ color: "#d97706", fontSize: "12px" }}>
            {topReferrer ? `${topReferrer.count} referred candidates` : "—"}
          </small>
        </div>
      </div>

      {/* Styled Data Table */}
      <div ref={print}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
            {title} ({cadence.replace("_", " ").toUpperCase()})
          </h3>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Payroll Period: <strong>{selectedPeriod === "all" ? "All recorded periods" : (selectedPeriod || "All periods")}</strong> · {rows.length} records
          </span>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            overflowX: "auto",
            background: "#fff",
            marginBottom: "20px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                  Joy Referrer (Staff)
                </th>
                {reference === 2 && (
                  <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                    Contact / Address
                  </th>
                )}
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                  Referred Employee
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                  Company &amp; Unit Placement
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                  Joining Date &amp; Status
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#1e3a8a" }}>
                  Worked Days
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                  Payable Days
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                  Bonus Estimate
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={reference === 2 ? 8 : 7}
                    style={{ textAlign: "center", padding: "36px", color: "#64748b" }}
                  >
                    No {reference === 1 ? "Joy Staff referrals" : "second references"} found for the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const vObj = r.vendorId ? vendorMap.get(r.vendorId) : null;
                  const uObj = r.clientUnitId ? unitMap.get(r.clientUnitId) : null;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: r.eligible ? "#ffffff" : "#fcfcfc",
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ color: "#0f172a", display: "block" }}>{r.referrerName}</strong>
                        {r.referrerCode ? (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "#eff6ff",
                              color: "#1e40af",
                              fontWeight: 600,
                            }}
                          >
                            {r.referrerCode}
                          </span>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>No code</span>
                        )}
                      </td>
                      {reference === 2 && (
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ display: "block", color: "#334155" }}>{r.phone || "—"}</span>
                          <small style={{ color: "#64748b" }}>{r.position || r.address || ""}</small>
                        </td>
                      )}
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ color: "#1e293b", display: "block" }}>{r.employeeName}</strong>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "#f1f5f9",
                            color: "#475569",
                          }}
                        >
                          {r.employeeCode}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <strong style={{ color: "#0f172a", fontSize: "12px", display: "block" }}>
                          {uObj ? `${uObj.clientName} - ${uObj.unitName}` : "Unassigned Unit"}
                        </strong>
                        <small style={{ color: "#64748b", fontSize: "11px" }}>
                          {vObj?.name || "Group Entity"} {uObj?.location ? `(${uObj.location})` : ""}
                        </small>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: "12px", color: "#334155", display: "block" }}>
                          {formatDisplayDate(r.joiningDate)}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: r.status === "active" ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {r.status === "active" ? "● Active" : "○ Left"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "13px",
                            fontWeight: 700,
                            background: r.workedDays >= (minimum || 1) ? "#dcfce7" : "#f1f5f9",
                            color: r.workedDays >= (minimum || 1) ? "#15803d" : "#64748b",
                          }}
                        >
                          {r.workedDays} d
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", color: "#475569" }}>
                        {r.payableDays} d
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        {r.eligible ? (
                          <div>
                            <strong style={{ color: "#15803d", fontSize: "14px" }}>
                              {money(r.bonusEstimate)}
                            </strong>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: "10px",
                                fontWeight: 700,
                                color: "#166534",
                                textTransform: "uppercase",
                              }}
                            >
                              <Check size={11} /> Qualified
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: "#94a3b8", fontSize: "13px" }}>₹0.00</span>
                            <span
                              style={{
                                display: "block",
                                fontSize: "10px",
                                color: "#64748b",
                              }}
                            >
                              {minimum > 0 && r.workedDays < minimum
                                ? `Needs ${minimum - r.workedDays}d more`
                                : "Not eligible"}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>


        {/* Referrer Summary Table Card */}
        {summaries.size > 0 && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a8a", margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <BarChart3 size={15} style={{ color: "#1e3a8a" }} />
                <span>Referrer Summary &amp; Payout Rollup</span>
              </h4>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  downloadRows(
                    `referrer-summary-${reference}-${cadence}`,
                    [
                      [title],
                      ["Referrer Code", "Referrer Name", "Total Referred", "Qualifying Candidates", "Total Bonus (INR)"],
                      ...[...summaries.values()].map((g) => [g.code, g.name, g.count, g.eligible, g.total]),
                    ],
                    false
                  )
                }
                style={{ fontSize: "12px", padding: "4px 10px" }}
              >
                Download Summary CSV
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#ffffff", borderBottom: "1.5px solid #cbd5e1" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                      Referrer Name
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#334155" }}>
                      Staff Code
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#334155" }}>
                      Referred Candidates
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>
                      Qualifying
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#1e3a8a" }}>
                      Total Estimated Bonus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...summaries.values()].map((g, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>{g.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{g.code}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>{g.count}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>
                        {g.eligible}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                        {money(g.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
