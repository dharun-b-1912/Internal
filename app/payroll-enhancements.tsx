"use client";

/* Edit forms intentionally synchronize their drafts when the selected payroll run or room changes. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, type FormEvent } from "react";
import { calendarPeriod } from "../lib/payroll-operations";
import { printIsolatedElement } from "../lib/print-document";
import { formatDisplayDate } from "../lib/date-format";
import type { ApplicationDocument } from "../lib/employee-application";
import { downloadXlsx } from "../lib/export-xlsx";
import { Search, CheckCircle2, Phone, Printer, FileText } from "lucide-react";
import { buildDailyWorkforcePdf } from "../lib/daily-workforce-pdf";
import { DailyReportModal } from "./daily-report-modal";
import type {
  AccommodationCharge,
  AccommodationRoom,
  AccommodationType,
  AppData,
  ClientUnit,
  Employee,
  PayrollBatch,
  PayrollItem,
  PayrollRun,
  RoomExpense,
} from "./payroll-app";

type Action = (
  action: string,
  message: string,
  details?: Record<string, unknown>,
) => Promise<boolean>;
const DASHBOARD_RENDER_EPOCH = Date.now();

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function downloadRows(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return '""';
          const str = String(value);
          if (/^\d{10,}$/.test(str) || (/^0\d+$/.test(str) && str.length > 1)) {
            return `="${str.replaceAll('"', '""')}"`;
          }
          return `"${str.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function NumberCard({
  label,
  value,
  note,
  tone,
  badge,
}: {
  label: string;
  value: number;
  note: string;
  tone: string;
  badge?: React.ReactNode;
}) {
  return (
    <article className={`enhancement-number-card enhancement-tone-${tone}`} style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <span>{label}</span>
        {badge}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function WorkforceDashboard({
  data,
  onNavigateToLeftEmployees,
  onNavigateToJoinedEmployees,
  onNavigateToNotifications,
  onOpenEmployeeApplication,
  onReuploadDocument,
}: {
  data: AppData;
  onNavigateToLeftEmployees?: (date?: string) => void;
  onNavigateToJoinedEmployees?: (date?: string) => void;
  onNavigateToNotifications?: (filterTab?: string) => void;
  onOpenEmployeeApplication?: (employee: Employee) => void;
  onReuploadDocument?: (
    employeeId: string,
    category: string,
    filename: string,
    dataUrl: string,
  ) => Promise<ApplicationDocument[] | void>;
}) {
  const [clientId, setClientId] = useState("all");
  const [unitId, setUnitId] = useState("all");
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [reachoutUnit, setReachoutUnit] = useState<ClientUnit | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const eligibleUnits = data.units.filter(
    (unit) => clientId === "all" || unit.vendorId === clientId,
  );
  const selectedEmployees = data.employees.filter(
    (employee) =>
      (clientId === "all" || employee.vendorId === clientId) &&
      (unitId === "all" || employee.clientUnitId === unitId),
  );
  const live = selectedEmployees.filter(
    (employee) => employee.status === "active",
  );
  const todayStr = new Date().toLocaleDateString("en-CA");
  const joinedToday = selectedEmployees.filter(
    (employee) => employee.dateOfJoining === todayStr,
  );
  const joinedTodayIds = new Set(joinedToday.map((e) => e.id));
  const pendingTodayDocsCount = (data.applicationDocuments || []).filter(
    (d) =>
      joinedTodayIds.has(d.employeeId) &&
      d.status !== "rejected" &&
      (!d.status || d.status === "pending_approval" || !d.reviewedBy),
  ).length;
  const totalPendingDocsCount = (data.applicationDocuments || []).filter(
    (d) =>
      d.status !== "rejected" &&
      (!d.status || d.status === "pending_approval" || !d.reviewedBy),
  ).length;
  const selectedEmpIds = new Set(selectedEmployees.map((e) => e.id));
  const rejectedDocs = (data.applicationDocuments || []).filter(
    (d) => d.status === "rejected" && selectedEmpIds.has(d.employeeId),
  );
  const leftToday = selectedEmployees.filter(
    (employee) =>
      (employee.status === "left" || Boolean(employee.dateOfLeaving)) &&
      employee.dateOfLeaving === todayStr,
  );
  const totalLeftEmployees = selectedEmployees.filter(
    (employee) => employee.status === "left" || Boolean(employee.dateOfLeaving),
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentDate = new Date(`${currentMonth}-01T00:00:00Z`);
  currentDate.setUTCMonth(currentDate.getUTCMonth() - 1);
  const previousMonth = currentDate.toISOString().slice(0, 7);
  const monthEnd = (period: string) =>
    new Date(
      Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0),
    )
      .toISOString()
      .slice(0, 10);
  const liveAtMonthEnd = (employee: Employee, period: string) =>
    employee.dateOfJoining <= monthEnd(period) &&
    (!employee.dateOfLeaving || employee.dateOfLeaving > monthEnd(period));
  const currentLive = selectedEmployees.filter((employee) =>
    liveAtMonthEnd(employee, currentMonth),
  );
  const previousLive = selectedEmployees.filter((employee) =>
    liveAtMonthEnd(employee, previousMonth),
  );
  const currentJoined = selectedEmployees.filter((employee) =>
    employee.dateOfJoining?.startsWith(`${currentMonth}-`),
  );
  const previousJoined = selectedEmployees.filter((employee) =>
    employee.dateOfJoining?.startsWith(`${previousMonth}-`),
  );
  const currentLeft = selectedEmployees.filter((employee) =>
    employee.dateOfLeaving?.startsWith(`${currentMonth}-`),
  );
  const previousLeft = selectedEmployees.filter((employee) =>
    employee.dateOfLeaving?.startsWith(`${previousMonth}-`),
  );
  const aadhaarPending = live.filter((employee) => {
    const docs = (data.applicationDocuments || []).filter(
      (d) => d.employeeId === employee.id,
    );
    const hasFront = docs.some((d) => d.category === "Aadhar Front side");
    const hasBack = docs.some((d) => d.category === "Aadhar Back side");
    return !hasFront || !hasBack;
  });
  const passbookPending = live.filter((employee) => {
    const docs = (data.applicationDocuments || []).filter(
      (d) => d.employeeId === employee.id,
    );
    return !docs.some((d) => d.category === "Bank Proofs");
  });
  const bankPending = live.filter(
    (employee) => !employee.bankAccountMasked || !employee.ifscMasked,
  );
  const epfPending = live.filter((employee) => !employee.uanMasked);
  const esiPending = live.filter((employee) => !employee.esiMasked);
  const pendingEmployees = live.filter(
    (employee) =>
      !employee.bankAccountMasked ||
      !employee.ifscMasked ||
      !employee.uanMasked ||
      !employee.esiMasked,
  );
  const allUnitsBreakdown = eligibleUnits.map((unit) => {
    const assigned = data.employees.filter(
      (employee) =>
        (clientId === "all" || employee.vendorId === clientId) &&
        employee.clientUnitId === unit.id,
    );
    const active = assigned.filter((employee) => employee.status === "active");
    return {
      unit,
      total: assigned.length,
      active: active.length,
      left: assigned.length - active.length,
      joined: assigned.filter((employee) =>
        employee.dateOfJoining.startsWith(`${currentMonth}-`),
      ).length,
      aadhaarDocs: active.filter((employee) => {
        const docs = (data.applicationDocuments || []).filter(
          (d) => d.employeeId === employee.id,
        );
        return (
          !docs.some((d) => d.category === "Aadhar Front side") ||
          !docs.some((d) => d.category === "Aadhar Back side")
        );
      }).length,
      passbookDocs: active.filter((employee) => {
        const docs = (data.applicationDocuments || []).filter(
          (d) => d.employeeId === employee.id,
        );
        return !docs.some((d) => d.category === "Bank Proofs");
      }).length,
      bank: active.filter(
        (employee) => !employee.bankAccountMasked || !employee.ifscMasked,
      ).length,
      epf: active.filter((employee) => !employee.uanMasked).length,
      esi: active.filter((employee) => !employee.esiMasked).length,
      mobile: active.filter(
        (employee) => !employee.mobileNumber || !employee.mobileNumber.trim(),
      ).length,
    };
  });

  const breakdown = allUnitsBreakdown.filter(
    (entry) => unitId === "all" || entry.unit.id === unitId,
  );

  const totalUnitsWithPendingCount = allUnitsBreakdown
    .map((entry) => {
      const totalPending =
        entry.aadhaarDocs +
        entry.passbookDocs +
        entry.bank +
        entry.epf +
        entry.esi +
        entry.mobile;
      return totalPending;
    })
    .filter((count) => count > 0).length;

  const pendingUnits = breakdown
    .map((entry) => {
      const totalPending =
        entry.aadhaarDocs +
        entry.passbookDocs +
        entry.bank +
        entry.epf +
        entry.esi +
        entry.mobile;
      return {
        ...entry,
        totalPending,
      };
    })
    .filter((entry) => entry.totalPending > 0)
    .sort((a, b) => b.totalPending - a.totalPending);

  const reachoutEmployees = reachoutUnit
    ? data.employees.filter((emp) => {
        if (emp.clientUnitId !== reachoutUnit.id || emp.status !== "active") return false;
        const docs = (data.applicationDocuments || []).filter((d) => d.employeeId === emp.id);
        const hasFront = docs.some((d) => d.category === "Aadhar Front side");
        const hasBack = docs.some((d) => d.category === "Aadhar Back side");
        const hasPassbook = docs.some((d) => d.category === "Bank Proofs");
        const hasBank = Boolean(emp.bankAccountMasked && emp.ifscMasked);
        const hasEpf = Boolean(emp.uanMasked);
        const hasEsi = Boolean(emp.esiMasked);
        const hasMobile = Boolean(emp.mobileNumber && emp.mobileNumber.trim());
        return !hasFront || !hasBack || !hasPassbook || !hasBank || !hasEpf || !hasEsi || !hasMobile;
      })
    : [];

  const getMissingItems = (emp: Employee) => {
    const docs = (data.applicationDocuments || []).filter((d) => d.employeeId === emp.id);
    const items: { label: string; tone: "amber" | "red" }[] = [];
    if (!emp.mobileNumber || !emp.mobileNumber.trim()) {
      items.push({ label: "Mobile missing", tone: "red" });
    }
    if (!docs.some((d) => d.category === "Aadhar Front side") || !docs.some((d) => d.category === "Aadhar Back side")) {
      items.push({ label: "Aadhaar Doc", tone: "amber" });
    }
    if (!docs.some((d) => d.category === "Bank Proofs")) {
      items.push({ label: "Passbook Doc", tone: "amber" });
    }
    if (!emp.bankAccountMasked || !emp.ifscMasked) {
      items.push({ label: "Bank Account / IFSC", tone: "amber" });
    }
    if (!emp.uanMasked) {
      items.push({ label: "UAN / EPF", tone: "red" });
    }
    if (!emp.esiMasked) {
      items.push({ label: "ESI", tone: "red" });
    }
    return items;
  };

  return (
    <div className="section-stack workforce-dashboard">
      <section className="panel workforce-filter-panel">
        <div>
          <span className="eyebrow">Scope selector</span>
          <h2>Overall, client-wise & employer-unit-wise</h2>
        </div>
        <div className="workforce-filters">
          <label>
            <span>Client</span>
            <select
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setUnitId("all");
              }}
            >
              <option value="all">All accessible clients</option>
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Employer / unit</span>
            <select
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="all">All employer units</option>
              {eligibleUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.clientName} · {unit.unitName}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowDailyReportModal(true)}
              style={{
                background: "#0284c7",
                border: "none",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: "8px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.35)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                height: "38px",
              }}
              title="View and download company-wise daily joining & exit PDF report"
            >
              <FileText size={15} />
              <span>Daily PDF Report</span>
            </button>
          </div>
        </div>
      </section>

      <section className="workforce-number-grid">
        <div
          onClick={() => onNavigateToJoinedEmployees?.(todayStr)}
          style={{
            cursor: onNavigateToJoinedEmployees ? "pointer" : "default",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          title={
            data.currentUser.role === "super_admin" && (pendingTodayDocsCount > 0 || totalPendingDocsCount > 0)
              ? `Click to view today's joinings & verify ${pendingTodayDocsCount > 0 ? `${pendingTodayDocsCount} pending document(s)` : `${totalPendingDocsCount} total pending document(s)`}`
              : "Click to view daily joining register & date-wise breakdown"
          }
        >
          <NumberCard
            label="Joined today"
            value={joinedToday.length}
            note={
              data.currentUser.role === "super_admin" && pendingTodayDocsCount > 0
                ? `${pendingTodayDocsCount} doc(s) waiting approval ➔`
                : `Today's joinings (${todayStr}) ➔`
            }
            tone="emerald"
            badge={
              data.currentUser.role === "super_admin" && (pendingTodayDocsCount > 0 || totalPendingDocsCount > 0) ? (
                <span
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    letterSpacing: "0.02em",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={
                    pendingTodayDocsCount > 0
                      ? `${pendingTodayDocsCount} document(s) from today's joinings waiting for Super Admin approval`
                      : `${totalPendingDocsCount} total document(s) waiting for Super Admin approval`
                  }
                >
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                  {pendingTodayDocsCount > 0
                    ? `${pendingTodayDocsCount} pending approval`
                    : `${totalPendingDocsCount} docs pending`}
                </span>
              ) : null
            }
          />
        </div>
        <div
          onClick={() => onNavigateToLeftEmployees?.(todayStr)}
          style={{
            cursor: onNavigateToLeftEmployees ? "pointer" : "default",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          title="Click to view daily left employees register & date-wise breakdown"
        >
          <NumberCard
            label="Left today"
            value={leftToday.length}
            note={`Today's exits (${todayStr}) ➔`}
            tone="red"
          />
        </div>
        {data.currentUser.role === "super_admin" && (
          <div
            onClick={() => onNavigateToLeftEmployees?.()}
            style={{
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            title="Click to view company-wise left employees directory & total working days"
          >
            <NumberCard
              label="Total left employees"
              value={totalLeftEmployees.length}
              note="Click for left register & worked days ➔"
              tone="violet"
            />
          </div>
        )}
        <div
          onClick={() => {
            if (onNavigateToNotifications) {
              onNavigateToNotifications("rejected");
            } else {
              window.location.hash = "notifications";
            }
          }}
          style={{
            cursor: "pointer",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          title={
            rejectedDocs.length > 0
              ? `Click to view ${rejectedDocs.length} rejected document(s) on Notifications page`
              : "No rejected documents"
          }
        >
          <NumberCard
            label="Rejected docs"
            value={rejectedDocs.length}
            note={
              rejectedDocs.length > 0
                ? `${rejectedDocs.length} doc(s) need re-upload ➔`
                : "All candidate docs clean"
            }
            tone="red"
            badge={
              rejectedDocs.length > 0 ? (
                <span
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    letterSpacing: "0.02em",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title={`${rejectedDocs.length} document(s) rejected by Super Admin`}
                >
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                  Re-upload
                </span>
              ) : null
            }
          />
        </div>
        <NumberCard
          label="Current month live"
          value={currentLive.length}
          note={`Live at ${currentMonth} month-end`}
          tone="green"
        />
        <NumberCard
          label="Last month live"
          value={previousLive.length}
          note={`Live at ${previousMonth} month-end`}
          tone="blue"
        />
        <div
          onClick={() => onNavigateToJoinedEmployees?.(`${currentMonth}-01`)}
          style={{
            cursor: onNavigateToJoinedEmployees ? "pointer" : "default",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          title={`Click to view daily breakdown for ${currentMonth}`}
        >
          <NumberCard
            label="Joined this month"
            value={currentJoined.length}
            note={`Joined in ${currentMonth} ➔`}
            tone="emerald"
          />
        </div>
        <div
          onClick={() => onNavigateToJoinedEmployees?.(`${previousMonth}-01`)}
          style={{
            cursor: onNavigateToJoinedEmployees ? "pointer" : "default",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          title={`Click to view daily breakdown for ${previousMonth}`}
        >
          <NumberCard
            label="Last month joined"
            value={previousJoined.length}
            note={`Joined in ${previousMonth} ➔`}
            tone="indigo"
          />
        </div>
        <NumberCard
          label="Left this month"
          value={currentLeft.length}
          note={`Left dates in ${currentMonth}`}
          tone="violet"
        />
        <NumberCard
          label="Last month left"
          value={previousLeft.length}
          note={`Left dates in ${previousMonth}`}
          tone="slate"
        />
      </section>

      <section className="workforce-number-grid compliance-number-grid">
        <NumberCard
          label="Aadhaar doc pending"
          value={aadhaarPending.length}
          note={`Front or Back image missing · ${live.length} active`}
          tone="amber"
        />
        <NumberCard
          label="Bank passbook pending"
          value={passbookPending.length}
          note={`Passbook / cheque proof missing · ${live.length} active`}
          tone="amber"
        />
        <NumberCard
          label="Bank account pending"
          value={bankPending.length}
          note={`Account or IFSC missing · ${live.length} active`}
          tone="amber"
        />
        <NumberCard
          label="EPF / UAN pending"
          value={epfPending.length}
          note={`UAN missing · ${live.length} active`}
          tone="red"
        />
        <NumberCard
          label="ESI number pending"
          value={esiPending.length}
          note={`ESI number missing · ${live.length} active`}
          tone="red"
        />
        <NumberCard
          label="Fully compliant"
          value={live.length - pendingEmployees.length}
          note="Bank, IFSC, UAN & ESI available"
          tone="green"
        />
      </section>

      <div
        className="overview-units-split-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(320px, 1fr)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Employer-unit manpower summary</span>
              <h2>Workforce & pending compliance by unit</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {unitId !== "all" && (
                <button
                  type="button"
                  className="secondary-button"
                  style={{
                    padding: "3px 10px",
                    fontSize: "12px",
                    minHeight: "26px",
                    background: "#eff6ff",
                    borderColor: "#93c5fd",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                  onClick={() => setUnitId("all")}
                >
                  ✕ Clear Filter (Show All)
                </button>
              )}
              <span className="muted-label">Current month: {currentMonth}</span>
            </div>
          </div>

          {unitId !== "all" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "8px 14px",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "#1e40af",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Search size={13} /> Filtered:
                </span>
                <strong>
                  {data.units.find((u) => u.id === unitId)?.clientName} ·{" "}
                  {data.units.find((u) => u.id === unitId)?.unitName}
                </strong>
              </span>
              <button
                type="button"
                className="secondary-button"
                style={{
                  padding: "3px 10px",
                  fontSize: "12px",
                  minHeight: "26px",
                  background: "#ffffff",
                  fontWeight: 700,
                }}
                onClick={() => setUnitId("all")}
              >
                ✕ Show All Units
              </button>
            </div>
          )}

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / employer unit</th>
                  <th>Overall</th>
                  <th>Live</th>
                  <th>Left</th>
                  <th>Joined</th>
                  <th>Aadhaar pending</th>
                  <th>Passbook pending</th>
                  <th>Bank pending</th>
                  <th>EPF pending</th>
                  <th>ESI pending</th>
                  <th>Mobile pending</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((entry) => (
                  <tr key={entry.unit.id}>
                    <td>
                      <strong>{entry.unit.clientName}</strong>
                      <small>
                        {
                          data.vendors.find(
                            (vendor) => vendor.id === entry.unit.vendorId,
                          )?.code
                        }{" "}
                        · {entry.unit.unitName}
                      </small>
                    </td>
                    <td>{entry.total}</td>
                    <td className="workforce-positive">{entry.active}</td>
                    <td>{entry.left}</td>
                    <td>{entry.joined}</td>
                    <td className={entry.aadhaarDocs ? "workforce-pending" : ""}>
                      {entry.aadhaarDocs}
                    </td>
                    <td className={entry.passbookDocs ? "workforce-pending" : ""}>
                      {entry.passbookDocs}
                    </td>
                    <td className={entry.bank ? "workforce-pending" : ""}>
                      {entry.bank}
                    </td>
                    <td className={entry.epf ? "workforce-pending" : ""}>
                      {entry.epf}
                    </td>
                    <td className={entry.esi ? "workforce-pending" : ""}>
                      {entry.esi}
                    </td>
                    <td className={entry.mobile ? "workforce-pending" : ""}>
                      {entry.mobile}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!breakdown.length ? (
            <div className="enhancement-empty">
              Add employer units and employees to populate your manpower
              dashboard.
            </div>
          ) : null}
        </section>

        <section
          className="panel"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#ffffff",
          }}
        >
          <div
            className="panel-heading"
            style={{
              margin: 0,
              paddingBottom: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span className="eyebrow" style={{ color: "#d97706" }}>
                Direct Action
              </span>
              <h2 style={{ fontSize: "1.15rem", margin: "2px 0 0" }}>
                Units Requiring Follow-up
              </h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {unitId !== "all" && (
                <button
                  type="button"
                  className="secondary-button"
                  style={{
                    padding: "2px 8px",
                    fontSize: "11px",
                    minHeight: "24px",
                    background: "#eff6ff",
                    borderColor: "#bfdbfe",
                    color: "#1d4ed8",
                    fontWeight: 600,
                  }}
                  onClick={() => setUnitId("all")}
                >
                  Show all ({totalUnitsWithPendingCount})
                </button>
              )}
              <span
                style={{
                  background: pendingUnits.length > 0 ? "#fef3c7" : "#dcfce7",
                  color: pendingUnits.length > 0 ? "#92400e" : "#166534",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {pendingUnits.length} {pendingUnits.length === 1 ? "unit" : "units"} pending
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "520px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {pendingUnits.length === 0 ? (
              <div
                className="enhancement-empty"
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  background: "#f0fdf4",
                  border: "1px dashed #86efac",
                  borderRadius: "10px",
                }}
              >
                <div style={{ marginBottom: "6px", display: "flex", justifyContent: "center" }}>
                  <CheckCircle2 size={32} style={{ color: "#16a34a" }} />
                </div>
                <strong style={{ color: "#166534" }}>
                  All employer units fully compliant!
                </strong>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12.5px",
                    color: "#15803d",
                  }}
                >
                  No pending Aadhaar, Passbook, Bank, or Statutory documents.
                </p>
              </div>
            ) : (
              pendingUnits.map((entry) => {
                const isFilteredUnit = unitId === entry.unit.id;
                return (
                  <div
                    key={entry.unit.id}
                    style={{
                      border: isFilteredUnit
                        ? "2px solid #2563eb"
                        : "1px solid var(--line, #e2e8f0)",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      background: isFilteredUnit ? "#f8faff" : "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      boxShadow: isFilteredUnit
                        ? "0 2px 8px rgba(37,99,235,0.12)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "13.5px",
                            color: "#0f172a",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {entry.unit.clientName}
                          {isFilteredUnit && (
                            <span
                              style={{
                                fontSize: "10.5px",
                                background: "#2563eb",
                                color: "#ffffff",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontWeight: 600,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          <span style={{ fontWeight: 600, color: "#2563eb" }}>
                            {
                              data.vendors.find(
                                (v) => v.id === entry.unit.vendorId,
                              )?.code
                            }
                          </span>{" "}
                          · {entry.unit.unitName} · {entry.active} live
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.totalPending} pending
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                      }}
                    >
                      {entry.aadhaarDocs > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Aadhaar: {entry.aadhaarDocs}
                        </span>
                      )}
                      {entry.passbookDocs > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Passbook: {entry.passbookDocs}
                        </span>
                      )}
                      {entry.bank > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#ffedd5",
                            color: "#9a3412",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Bank: {entry.bank}
                        </span>
                      )}
                      {entry.epf > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          EPF: {entry.epf}
                        </span>
                      )}
                      {entry.esi > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          ESI: {entry.esi}
                        </span>
                      )}
                      {entry.mobile > 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "#fee2e2",
                            color: "#991b1b",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Mobile: {entry.mobile}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "8px",
                        marginTop: "4px",
                      }}
                    >
                      {isFilteredUnit ? (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            minHeight: "28px",
                            background: "#eff6ff",
                            borderColor: "#93c5fd",
                            color: "#1d4ed8",
                            fontWeight: 700,
                          }}
                          onClick={() => setUnitId("all")}
                          title="Click to reset filter and show all units"
                        >
                          ✓ Active (Reset)
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            minHeight: "28px",
                          }}
                          onClick={() => setUnitId(entry.unit.id)}
                          title="Filter entire overview to this employer unit"
                        >
                          Filter Scope
                        </button>
                      )}
                      <button
                        type="button"
                        className="primary-button"
                        style={{
                          padding: "4px 12px",
                          fontSize: "12px",
                          minHeight: "28px",
                        }}
                        onClick={() => setReachoutUnit(entry.unit)}
                      >
                        <Phone size={13} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} />
                        Reach Out ({entry.totalPending})
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {reachoutUnit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "880px",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid var(--line, #e2e8f0)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#2563eb",
                  }}
                >
                  Employer Unit Reach Out & Follow-up
                </span>
                <h2
                  style={{
                    margin: "2px 0 0",
                    fontSize: "18px",
                    color: "#0f172a",
                    fontWeight: 800,
                  }}
                >
                  {reachoutUnit.clientName} · {reachoutUnit.unitName}
                </h2>
                <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                  {reachoutEmployees.length} active employee
                  {reachoutEmployees.length === 1 ? "" : "s"} requiring document /
                  compliance submission
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReachoutUnit(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "22px",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              <table
                className="data-table"
                style={{ width: "100%", fontSize: "13px" }}
              >
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Contact Number</th>
                    <th>Department</th>
                    <th>Joining Date</th>
                    <th>Missing Documents / Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {reachoutEmployees.map((emp) => {
                    const missing = getMissingItems(emp);
                    return (
                      <tr key={emp.id}>
                        <td>
                          <strong>{emp.name}</strong>
                          <small>{emp.employeeCode}</small>
                        </td>
                        <td>
                          {emp.mobileNumber ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <a
                                href={`tel:${emp.mobileNumber}`}
                                style={{
                                  color: "#2563eb",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                                title="Click to call directly"
                              >
                                <Phone size={12} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} />
                                {emp.mobileNumber}
                              </a>
                              <button
                                type="button"
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  padding: "2px 6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  color: copiedId === emp.id ? "#16a34a" : "#475569",
                                }}
                                onClick={() => {
                                  if (emp.mobileNumber) {
                                    navigator.clipboard?.writeText(emp.mobileNumber);
                                    setCopiedId(emp.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }
                                }}
                                title="Copy mobile number"
                              >
                                {copiedId === emp.id ? "✓ Copied" : "Copy"}
                              </button>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "#94a3b8",
                                fontStyle: "italic",
                              }}
                            >
                              No mobile
                            </span>
                          )}
                        </td>
                        <td>{emp.department || "—"}</td>
                        <td>{formatDisplayDate(emp.dateOfJoining)}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "4px",
                            }}
                          >
                            {missing.map((item, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  background:
                                    item.tone === "red" ? "#fee2e2" : "#fef3c7",
                                  color:
                                    item.tone === "red" ? "#991b1b" : "#92400e",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {item.label}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {reachoutEmployees.length === 0 && (
                <div className="enhancement-empty">
                  No pending employees found for this employer unit.
                </div>
              )}
            </div>

            <div
              style={{
                padding: "12px 20px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line, #e2e8f0)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Tip: Call or WhatsApp employees directly to submit their pending documents.
              </span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setReachoutUnit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main compliance follow-up table */}

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Compliance follow-up</span>
            <h2>Pending bank, EPF & ESI records</h2>
          </div>
          <span className="muted-label">
            {pendingEmployees.length} employee
            {pendingEmployees.length === 1 ? "" : "s"} need follow-up
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employer / unit</th>
                <th>Joined</th>
                <th>Pending age</th>
                <th>Bank / IFSC</th>
                <th>EPF / UAN</th>
                <th>ESI</th>
              </tr>
            </thead>
            <tbody>
              {pendingEmployees.slice(0, 50).map((employee) => {
                const unit = data.units.find(
                  (entry) => entry.id === employee.clientUnitId,
                );
                const days = Math.max(
                  0,
                  Math.floor(
                    (DASHBOARD_RENDER_EPOCH -
                      new Date(
                        `${employee.dateOfJoining}T00:00:00`,
                      ).getTime()) /
                      86400000,
                  ),
                );
                const aging =
                  days > 30
                    ? "30+ days"
                    : days > 15
                      ? "16–30 days"
                      : days > 10
                        ? "11–15 days"
                        : days > 5
                          ? "6–10 days"
                          : "0–5 days";
                return (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <small>{employee.employeeCode}</small>
                    </td>
                    <td>
                      {unit?.clientName ?? "—"}
                      <small>{unit?.unitName}</small>
                    </td>
                    <td>{formatDisplayDate(employee.dateOfJoining)}</td>
                    <td>
                      <span
                        className={`aging-badge ${days > 15 ? "aging-overdue" : ""}`}
                      >
                        {aging}
                      </span>
                    </td>
                    <td
                      className={
                        !employee.bankAccountMasked || !employee.ifscMasked
                          ? "workforce-pending"
                          : "workforce-positive"
                      }
                    >
                      {!employee.bankAccountMasked || !employee.ifscMasked
                        ? "Pending"
                        : "Ready"}
                    </td>
                    <td
                      className={
                        !employee.uanMasked
                          ? "workforce-pending"
                          : "workforce-positive"
                      }
                    >
                      {employee.uanMasked ? "Ready" : "Pending"}
                    </td>
                    <td
                      className={
                        !employee.esiMasked
                          ? "workforce-pending"
                          : "workforce-positive"
                      }
                    >
                      {employee.esiMasked ? "Ready" : "Pending"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!pendingEmployees.length ? (
          <div className="enhancement-empty">
            No pending bank, EPF, or ESI records in this view.
          </div>
        ) : null}
      </section>

      {showDailyReportModal && (
        <DailyReportModal
          data={data}
          initialDate={todayStr}
          onClose={() => setShowDailyReportModal(false)}
        />
      )}
    </div>
  );
}

export function PayrollPeriodEditor({
  run,
  canManage,
  isActing,
  onAction,
}: {
  run: PayrollRun;
  canManage: boolean;
  isActing: boolean;
  onAction: Action;
}) {
  const defaults = calendarPeriod(run.payPeriod);
  const [periodStart, setPeriodStart] = useState(
    run.periodStart ?? defaults.start,
  );
  const [periodEnd, setPeriodEnd] = useState(run.periodEnd ?? defaults.end);
  const [workingDays, setWorkingDays] = useState(run.workingDays || 26);
  useEffect(() => {
    const month = calendarPeriod(run.payPeriod);
    setPeriodStart(run.periodStart ?? month.start);
    setPeriodEnd(run.periodEnd ?? month.end);
    setWorkingDays(run.workingDays || 26);
  }, [run.id, run.payPeriod, run.periodStart, run.periodEnd, run.workingDays]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAction(
      "update-run-period",
      "Custom payroll dates and working days updated",
      { periodStart, periodEnd, workingDays },
    );
  }

  return (
    <form className="panel payroll-period-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Custom monthly calculation period</span>
          <h2>Payroll dates & working-day divisor</h2>
        </div>
        <span className="muted-label">
          Salary = monthly amount ÷ working days × payable days
        </span>
      </div>
      <fieldset
        className="period-editor-fields"
        disabled={!canManage || run.status === "approved" || isActing}
      >
        <label>
          <span>Period starts</span>
          <input
            aria-label="Payroll period start"
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Period ends</span>
          <input
            aria-label="Payroll period end"
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            required
          />
        </label>
        <label>
          <span>Working days</span>
          <input
            aria-label="Payroll working days"
            type="number"
            min="1"
            max="62"
            value={workingDays}
            onChange={(event) => setWorkingDays(Number(event.target.value))}
            required
          />
        </label>
        {canManage && run.status !== "approved" ? (
          <button className="primary-button" type="submit" disabled={isActing}>
            {isActing ? "Saving…" : "Save calculation period"}
          </button>
        ) : (
          <span className="access-mode-note">
            {run.status === "approved" ? "Approved period locked" : "View only"}
          </span>
        )}
      </fieldset>
    </form>
  );
}

export function PayrollBatchPanel({
  run,
  items,
  batches,
  canPrepare,
  canClear,
  isActing,
  onAction,
}: {
  run: PayrollRun;
  items: PayrollItem[];
  batches: PayrollBatch[];
  canPrepare: boolean;
  canClear: boolean;
  isActing: boolean;
  onAction: Action;
}) {
  const groups = [...new Set(items.map((item) => item.accommodationType))]
    .sort()
    .map((type) => {
      const employees = items.filter((item) => item.accommodationType === type);
      return {
        type,
        employees,
        batch: batches.find(
          (candidate) => candidate.accommodationType === type,
        ),
      };
    });

  function exportBatch(type: string, employees: PayrollItem[], format: "xlsx" | "csv" = "xlsx") {
    const filenameBase = `payroll-batch-${run.payPeriod}-${type.toLowerCase().replaceAll(/\s+/g, "-")}`;
    const rows = [
      [
        "Employee code",
        "Employee name",
        "Accommodation type",
        "Room",
        "Payment mode",
        "Gross earnings",
        "Total deductions",
        "Net payable",
      ],
      ...employees.map((item) => [
        item.employeeCode,
        item.employeeName,
        type,
        item.roomNumber ?? "",
        item.paymentMode,
        item.grossEarnings,
        item.totalDeductions,
        item.netPayable,
      ]),
    ];
    if (format === "xlsx") {
      downloadXlsx(`${filenameBase}.xlsx`, rows, `${type} Batch`);
    } else {
      downloadRows(`${filenameBase}.csv`, rows);
    }
  }

  async function clear(batch: PayrollBatch) {
    const reference = window.prompt(
      `Payment / transfer reference for ${batch.accommodationType} (optional):`,
      "",
    );
    if (reference === null) return;
    await onAction(
      "clear-payroll-batch",
      `${batch.accommodationType} payment batch cleared`,
      { batchId: batch.id, paymentReference: reference },
    );
  }

  return (
    <section className="panel table-panel payroll-batch-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Accommodation-wise salary processing</span>
          <h2>Payroll batches & payment clearance</h2>
        </div>
        {canPrepare ? (
          <button
            className="primary-button"
            disabled={isActing || !groups.length}
            onClick={() =>
              void onAction(
                "prepare-payroll-batches",
                "Accommodation-wise payroll batches prepared",
              )
            }
          >
            Prepare all batches
          </button>
        ) : null}
      </div>
      <div className="batch-summary-strip">
        <span>
          {groups.length} accommodation type{groups.length === 1 ? "" : "s"}
        </span>
        <span>
          {batches.filter((batch) => batch.status === "prepared").length}{" "}
          prepared
        </span>
        <span>
          {batches.filter((batch) => batch.status === "cleared").length}{" "}
          payment-cleared
        </span>
        <span>
          {run.status === "approved"
            ? "Payroll approved"
            : "Approve payroll to clear payments"}
        </span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Accommodation batch</th>
              <th>Employees</th>
              <th>Gross earnings</th>
              <th>Net payable</th>
              <th>Preparation</th>
              <th>Payment clearance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ type, employees, batch }) => (
              <tr key={type}>
                <td>
                  <strong>{type}</strong>
                  <small>{run.payPeriod}</small>
                </td>
                <td>{employees.length}</td>
                <td>
                  {money(
                    employees.reduce(
                      (sum, item) => sum + item.grossEarnings,
                      0,
                    ),
                  )}
                </td>
                <td className="net-cell">
                  {money(
                    employees.reduce((sum, item) => sum + item.netPayable, 0),
                  )}
                </td>
                <td>
                  <span
                    className={`enhancement-status ${batch ? "status-positive" : "status-muted"}`}
                  >
                    {batch ? "Prepared" : "Not prepared"}
                  </span>
                </td>
                <td>
                  <span
                    className={`enhancement-status ${batch?.status === "cleared" ? "status-positive" : "status-pending"}`}
                  >
                    {batch?.status === "cleared" ? "Cleared" : "Pending"}
                  </span>
                  {batch?.paymentReference ? (
                    <small>{batch.paymentReference}</small>
                  ) : null}
                </td>
                <td>
                  <div className="record-actions">
                    {!batch && canPrepare ? (
                      <button
                        className="record-action"
                        disabled={isActing}
                        onClick={() =>
                          void onAction(
                            "prepare-payroll-batch",
                            `${type} payroll batch prepared`,
                            { accommodationType: type },
                          )
                        }
                      >
                        Prepare
                      </button>
                    ) : null}
                    {batch && (canPrepare || canClear) ? (
                      <>
                        <button
                          className="record-action"
                          onClick={() => exportBatch(type, employees, "xlsx")}
                        >
                          Excel (.xlsx)
                        </button>
                        <button
                          className="record-action"
                          onClick={() => exportBatch(type, employees, "csv")}
                        >
                          CSV
                        </button>
                      </>
                    ) : null}
                    {batch?.status === "prepared" && canClear ? (
                      <button
                        className="record-action"
                        disabled={isActing || run.status !== "approved"}
                        onClick={() => void clear(batch)}
                      >
                        Clear payment
                      </button>
                    ) : null}
                    {batch?.status === "cleared" && canClear ? (
                      <button
                        className="record-action"
                        disabled={isActing}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Reopen payment clearance for ${type}?`,
                            )
                          )
                            void onAction(
                              "reopen-payroll-batch",
                              `${type} payment clearance reopened`,
                              { batchId: batch.id },
                            );
                        }}
                      >
                        Reopen
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!groups.length ? (
        <div className="enhancement-empty">
          Add payroll employees to prepare accommodation-wise salary batches.
        </div>
      ) : null}
    </section>
  );
}

type RoomDraft = {
  accommodationTypeId: string;
  hostelId: string;
  roomNumber: string;
  capacity: number;
  address: string;
  remarks: string;
  rentSettingsJson: string;
  rentCutoffDay: number;
  lateJoinRentPercent: number;
};

export function AccommodationControlCenter({
  vendorId,
  selectedUnitId,
  types,
  hostels,
  units,
  rooms,
  employees,
  allEmployees,
  expenses,
  charges,
  runs,
  payrollItems,
  payPeriod,
  canManage,
  isSuperAdmin = false,
  isActing,
  onAction,
  onRoomStatus,
  onDeleteRoom,
}: {
  vendorId: string;
  selectedUnitId?: string;
  types: AccommodationType[];
  hostels: AppData["hostels"];
  units: AppData["units"];
  rooms: AccommodationRoom[];
  employees: Employee[];
  allEmployees?: Employee[];
  expenses: RoomExpense[];
  charges: AccommodationCharge[];
  runs: PayrollRun[];
  payrollItems: PayrollItem[];
  payPeriod: string;
  canManage: boolean;
  isSuperAdmin?: boolean;
  isActing: boolean;
  onAction: Action;
  onRoomStatus: (room: AccommodationRoom) => void;
  onDeleteRoom: (room: AccommodationRoom) => void;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState<string>(selectedUnitId || "all");
  const [roomId, setRoomId] = useState("");
  const [editingRoom, setEditingRoom] = useState<
    AccommodationRoom | "new" | null
  >(null);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>({
    accommodationTypeId: "",
    hostelId: "",
    roomNumber: "",
    capacity: 0,
    address: "",
    remarks: "",
    rentSettingsJson: "{}",
    rentCutoffDay: 25,
    lateJoinRentPercent: 50,
  });
  const [allocationId, setAllocationId] = useState("");
  const [allocationRent, setAllocationRent] = useState(0);
  const [gasAmount, setGasAmount] = useState(0);
  const [gasDate, setGasDate] = useState("");
  const [gasCylinderCount, setGasCylinderCount] = useState(0);
  const [gasPaymentReference, setGasPaymentReference] = useState("");
  const [rationAmount, setRationAmount] = useState(0);
  const [rationDate, setRationDate] = useState("");
  const [rationPaymentReference, setRationPaymentReference] = useState("");
  const [provisionAmount, setProvisionAmount] = useState(0);
  const [provisionDate, setProvisionDate] = useState("");
  const [provisionPaymentReference, setProvisionPaymentReference] =
    useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [reportRooms, setReportRooms] = useState<AccommodationRoom[] | null>(
    null,
  );
  const [cardModalRoom, setCardModalRoom] = useState<AccommodationRoom | null>(
    null,
  );

  useEffect(() => {
    if (selectedUnitId) {
      setUnitFilter(selectedUnitId);
    }
  }, [selectedUnitId]);

  const allEmps = (allEmployees && allEmployees.length > 0) ? allEmployees : employees;

  function getHostelScope(hostelId?: string | null): string[] {
    if (!hostelId) return [];
    const hostel = hostels.find((h) => h.id === hostelId);
    if (!hostel?.clientScopeJson) return [];
    try {
      const parsed = JSON.parse(hostel.clientScopeJson);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function isRoomMappedToUnit(room: AccommodationRoom, targetUnitId: string): boolean {
    if (targetUnitId === "all") return true;
    const scope = getHostelScope(room.hostelId);
    if (scope.includes(targetUnitId)) return true;

    // Active employees in this room who belong to this unit
    const hasOccupantInTargetUnit = allEmps.some(
      (emp) => emp.roomId === room.id && emp.status === "active" && emp.clientUnitId === targetUnitId,
    );
    if (hasOccupantInTargetUnit) return true;

    // If hostel has no specific unit restriction (shared across all units of this vendor)
    if (scope.length === 0) {
      const occupantUnitIds = Array.from(
        new Set(
          allEmps
            .filter((emp) => emp.roomId === room.id && emp.status === "active")
            .map((emp) => emp.clientUnitId)
            .filter(Boolean),
        ),
      );
      if (occupantUnitIds.length === 0 || occupantUnitIds.includes(targetUnitId)) {
        return true;
      }
    }
    return false;
  }

  const vendorTypes = types.filter((type) => type.vendorId === vendorId);
  const vendorRooms = rooms.filter(
    (room) =>
      room.vendorId === vendorId &&
      (typeFilter === "all" || room.accommodationTypeId === typeFilter) &&
      isRoomMappedToUnit(room, unitFilter),
  );
  const selectedRoom =
    vendorRooms.find((room) => room.id === roomId) ?? vendorRooms[0] ?? null;
  const roomEmployees = selectedRoom
    ? allEmps.filter(
        (employee) =>
          employee.roomId === selectedRoom.id && employee.status === "active",
      )
    : [];
  const selectedExpense = selectedRoom
    ? (expenses.find(
        (expense) =>
          expense.roomId === selectedRoom.id && expense.payPeriod === payPeriod,
      ) ?? null)
    : null;
  const typeFor = (room: AccommodationRoom) =>
    types.find((type) => type.id === room.accommodationTypeId);
  const activeTypes = vendorTypes.filter((type) => type.status === "active");
  const selectedTypeName = selectedRoom ? typeFor(selectedRoom)?.name : null;
  const allocatable = allEmps.filter(
    (employee) =>
      employee.vendorId === vendorId &&
      (unitFilter === "all" || employee.clientUnitId === unitFilter) &&
      employee.status === "active" &&
      !employee.roomId &&
      employee.accommodationType === selectedTypeName,
  );

  useEffect(() => {
    setGasAmount(selectedExpense?.gasAmount ?? 0);
    setGasDate(selectedExpense?.gasDate ?? `${payPeriod}-01`);
    setGasCylinderCount(selectedExpense?.gasCylinderCount ?? 0);
    setGasPaymentReference(selectedExpense?.gasPaymentReference ?? "");
    setRationAmount(selectedExpense?.rationAmount ?? 0);
    setRationDate(selectedExpense?.rationDate ?? `${payPeriod}-01`);
    setRationPaymentReference(selectedExpense?.rationPaymentReference ?? "");
    setProvisionAmount(selectedExpense?.provisionAmount ?? 0);
    setProvisionDate(selectedExpense?.provisionDate ?? `${payPeriod}-01`);
    setProvisionPaymentReference(
      selectedExpense?.provisionPaymentReference ?? "",
    );
    setExpenseNotes(selectedExpense?.notes ?? "");
  }, [
    selectedExpense?.id,
    selectedExpense?.gasAmount,
    selectedExpense?.gasDate,
    selectedExpense?.gasCylinderCount,
    selectedExpense?.gasPaymentReference,
    selectedExpense?.rationAmount,
    selectedExpense?.rationDate,
    selectedExpense?.rationPaymentReference,
    selectedExpense?.provisionAmount,
    selectedExpense?.provisionDate,
    selectedExpense?.provisionPaymentReference,
    selectedExpense?.notes,
    selectedRoom?.id,
    payPeriod,
  ]);

  function openEditor(room?: AccommodationRoom) {
    setEditingRoom(room ?? "new");
    setRoomDraft({
      accommodationTypeId:
        room?.accommodationTypeId ?? activeTypes[0]?.id ?? "",
      hostelId: room?.hostelId ?? "",
      roomNumber: room?.roomNumber ?? "",
      capacity: room?.capacity ?? 0,
      address: room?.address ?? "",
      remarks: room?.remarks ?? "",
      rentSettingsJson: room?.rentSettingsJson ?? "{}",
      rentCutoffDay: room?.rentCutoffDay ?? 25,
      lateJoinRentPercent: room?.lateJoinRentPercent ?? 50,
    });
  }

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await onAction(
      "save-room",
      editingRoom === "new"
        ? "Accommodation room created"
        : "Accommodation room updated",
      {
        ...roomDraft,
        vendorId,
        id: editingRoom === "new" ? undefined : editingRoom?.id,
      },
    );
    if (ok) setEditingRoom(null);
  }

  async function allocate() {
    if (!selectedRoom || !allocationId) return;
    const ok = await onAction(
      "allocate-room",
      "Employee allocated to accommodation room",
      {
        roomId: selectedRoom.id,
        employeeId: allocationId,
        roomRentAmount: allocationRent,
      },
    );
    if (ok) {
      setAllocationId("");
      setAllocationRent(0);
    }
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoom) return;
    await onAction(
      "save-room-expense",
      "Room gas, ration, and provision expenses saved",
      {
        roomId: selectedRoom.id,
        payPeriod,
        gasAmount,
        gasDate,
        gasCylinderCount,
        gasPaymentReference,
        rationAmount,
        rationDate,
        rationPaymentReference,
        provisionAmount,
        provisionDate,
        provisionPaymentReference,
        notes: expenseNotes,
      },
    );
  }

  return (
    <div className="section-stack room-control-center">
      <section className="accommodation-type-grid accommodation-type-filter-grid">
        {vendorTypes.map((type) => {
          const typeRooms = rooms.filter(
            (room) =>
              room.vendorId === vendorId &&
              room.accommodationTypeId === type.id &&
              isRoomMappedToUnit(room, unitFilter),
          );
          const roomIds = new Set(typeRooms.map((r) => r.id));
          const occupants = allEmps.filter(
            (employee) =>
              employee.vendorId === vendorId &&
              employee.status === "active" &&
              (unitFilter === "all" || employee.clientUnitId === unitFilter) &&
              ((employee.roomId && roomIds.has(employee.roomId)) ||
                (!employee.roomId && employee.accommodationType === type.name)),
          );
          return (
            <button
              type="button"
              className={`accommodation-card accommodation-filter-card ${typeFilter === type.id ? "accommodation-filter-selected" : ""}`}
              key={type.id}
              onClick={() => {
                setTypeFilter(type.id);
                setRoomId("");
              }}
            >
              <span className="accommodation-icon">
                {type.name === "Tamil" ? "T" : "R"}
              </span>
              <div>
                <span>{type.name}</span>
                <strong>{occupants.length} employees</strong>
                <small>
                  {typeRooms.length} rooms · {type.status}
                </small>
              </div>
            </button>
          );
        })}
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Accommodation room master</span>
            <h2>Choose an accommodation type and room</h2>
          </div>
          <div className="attendance-toolbar" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", margin: 0 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Employer unit:</span>
              <select
                aria-label="Filter by employer unit"
                value={unitFilter}
                onChange={(event) => {
                  setUnitFilter(event.target.value);
                  setRoomId("");
                }}
                style={{ padding: "0.35rem 0.6rem", borderRadius: "6px" }}
              >
                <option value="all">All Employer Units ({units.length})</option>
                {units.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.clientName} · {unit.unitName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`secondary-button ${typeFilter === "all" ? "active" : ""}`}
              onClick={() => {
                setTypeFilter("all");
                setRoomId("");
              }}
            >
              All types
            </button>
            <span className="muted-label">
              Create hostels/local areas and rooms only through Hostel Master
            </span>
          </div>
        </div>
        {editingRoom ? (
          <form className="room-editor-form" onSubmit={saveRoom}>
            <label>
              <span>Accommodation type *</span>
              <select
                value={roomDraft.accommodationTypeId}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    accommodationTypeId: event.target.value,
                    hostelId: "",
                  }))
                }
                required
              >
                {activeTypes.map((type) => (
                  <option value={type.id} key={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Hostel / local area *</span>
              <select
                value={roomDraft.hostelId}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    hostelId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Choose stored hostel / local area</option>
                {hostels
                  .filter(
                    (hostel) =>
                      hostel.vendorId === vendorId &&
                      hostel.accommodationTypeId ===
                        roomDraft.accommodationTypeId &&
                      hostel.status === "active",
                  )
                  .map((hostel) => (
                    <option value={hostel.id} key={hostel.id}>
                      {hostel.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Room number *</span>
              <input
                value={roomDraft.roomNumber}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    roomNumber: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <span>Capacity</span>
              <input
                type="number"
                min="0"
                value={roomDraft.capacity}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    capacity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>Full-rent cutoff day</span>
              <input
                type="number"
                min="1"
                max="31"
                value={roomDraft.rentCutoffDay}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    rentCutoffDay: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>Late-joining rent %</span>
              <input
                type="number"
                min="0"
                max="100"
                value={roomDraft.lateJoinRentPercent}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    lateJoinRentPercent: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              <span>Address</span>
              <input
                value={roomDraft.address}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    address: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Remarks</span>
              <input
                value={roomDraft.remarks}
                onChange={(event) =>
                  setRoomDraft((draft) => ({
                    ...draft,
                    remarks: event.target.value,
                  }))
                }
              />
            </label>
            <div className="room-editor-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setEditingRoom(null)}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={isActing}
              >
                Save room
              </button>
            </div>
          </form>
        ) : null}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Accommodation type</th>
                <th>Room</th>
                <th>Occupants</th>
                <th>Mapped Company / Unit</th>
                <th>Location</th>
                <th>Room status</th>
                {isSuperAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {vendorRooms.map((room) => {
                const totalOccupants = allEmps.filter(
                  (employee) =>
                    employee.roomId === room.id && employee.status === "active",
                );
                const unitOccupants =
                  unitFilter === "all"
                    ? totalOccupants
                    : totalOccupants.filter(
                        (employee) => employee.clientUnitId === unitFilter,
                      );
                const scope = getHostelScope(room.hostelId);
                const scopedUnits = scope.length > 0 ? units.filter((u) => scope.includes(u.id)) : [];
                const occupantUnitIds = Array.from(
                  new Set(
                    totalOccupants.map((emp) => emp.clientUnitId).filter(Boolean),
                  ),
                );
                const occupantUnits = units.filter((u) => occupantUnitIds.includes(u.id));

                return (
                  <tr
                    className={
                      selectedRoom?.id === room.id ? "room-row-selected" : ""
                    }
                    key={room.id}
                  >
                    <td>{typeFor(room)?.name ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="text-button"
                        style={{ fontWeight: 700, color: "#1d4ed8", textDecoration: "underline" }}
                        title="Click to open Room Occupants Card View"
                        onClick={() => {
                          setRoomId(room.id);
                          setCardModalRoom(room);
                        }}
                      >
                        {room.roomNumber}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-button"
                        style={{ textAlign: "left", color: "inherit", cursor: "pointer", width: "100%" }}
                        title="Click to open Room Occupants Card View"
                        onClick={() => {
                          setRoomId(room.id);
                          setCardModalRoom(room);
                        }}
                      >
                        {unitFilter === "all" ? (
                          <span>
                            <strong>{totalOccupants.length}</strong>
                            {room.capacity ? ` / ${room.capacity}` : ""}
                          </span>
                        ) : (
                          <span>
                            <strong>{unitOccupants.length}</strong>
                            <small className="muted-label" style={{ display: "block" }}>
                              ({totalOccupants.length} total{room.capacity ? ` / ${room.capacity}` : ""})
                            </small>
                          </span>
                        )}
                      </button>
                    </td>
                    <td>
                      {scopedUnits.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {scopedUnits.map((u) => (
                            <span
                              key={u.id}
                              className="status-pill status-active"
                              style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                            >
                              {u.clientName} · {u.unitName}
                            </span>
                          ))}
                        </div>
                      ) : occupantUnits.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {occupantUnits.map((u) => (
                            <span
                              key={u.id}
                              className="status-pill"
                              style={{ fontSize: "0.72rem", padding: "2px 6px" }}
                            >
                              {u.clientName} · {u.unitName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted-label" style={{ fontSize: "0.8rem" }}>Shared / All units</span>
                      )}
                    </td>
                    <td>{room.address ?? "—"}</td>
                    <td>{room.status === "active" ? "Active" : "Inactive"}</td>
                    {isSuperAdmin ? (
                      <td>
                        <div className="record-actions">
                          <button
                            className="record-action"
                            onClick={() => openEditor(room)}
                          >
                            Edit
                          </button>
                          <button
                            className="record-action"
                            onClick={() => onRoomStatus(room)}
                          >
                            {room.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                          <button
                            className="record-action record-delete"
                            onClick={() => onDeleteRoom(room)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!vendorRooms.length ? (
          <div className="enhancement-empty">
            {unitFilter === "all"
              ? "Add a room under an accommodation type to start allocating employees."
              : "No rooms found mapped to the selected employer unit / company."}
          </div>
        ) : null}
      </section>

      {selectedRoom ? (
        <section className="panel room-allocation-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {typeFor(selectedRoom)?.name} · {payPeriod}
              </span>
              <h2>Room {selectedRoom.roomNumber}: employee allocations</h2>
            </div>
            <span className="muted-label">
              {roomEmployees.length}
              {selectedRoom.capacity ? ` / ${selectedRoom.capacity}` : ""}{" "}
              active roommates
            </span>
          </div>
          {canManage && selectedRoom.status === "active" ? (
            <div className="room-allocation-controls">
              <label>
                <span>Add employee to this room</span>
                <select
                  value={allocationId}
                  onChange={(event) => setAllocationId(event.target.value)}
                >
                  <option value="">Choose an active employee</option>
                  {allocatable.map((employee) => (
                    <option value={employee.id} key={employee.id}>
                      {employee.employeeCode} · {employee.name}
                      {employee.roomNumber
                        ? ` · currently ${employee.roomNumber}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Individual monthly rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={allocationRent}
                  onChange={(event) =>
                    setAllocationRent(Number(event.target.value))
                  }
                />
              </label>
              <button
                className="primary-button"
                disabled={!allocationId || isActing}
                onClick={() => void allocate()}
              >
                Allocate room
              </button>
            </div>
          ) : null}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employer unit</th>
                  <th>Individual monthly rent</th>
                  {canManage ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {roomEmployees.map((employee) => {
                  const unit = units.find(
                    (entry) => entry.id === employee.clientUnitId,
                  );
                  return (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.name}</strong>
                        <small>{employee.employeeCode}</small>
                      </td>
                      <td>
                        {unit
                          ? `${unit.clientName} · ${unit.unitName}`
                          : "Employer unit unavailable"}
                      </td>
                      <td>
                        {employee.roomRentAmount
                          ? money(employee.roomRentAmount)
                          : "—"}
                      </td>
                      {canManage ? (
                        <td>
                          <button
                            className="record-action"
                            disabled={isActing}
                            onClick={() =>
                              void onAction(
                                "allocate-room",
                                `Removed ${employee.name} from the room`,
                                { employeeId: employee.id, roomId: null },
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!roomEmployees.length ? (
            <div className="enhancement-empty">
              No employees have been allocated to this room.
            </div>
          ) : null}
        </section>
      ) : null}

      {cardModalRoom ? (
        <div className="modal-layer" onClick={() => setCardModalRoom(null)}>
          <div
            className="action-modal room-card-modal"
            style={{
              width: "min(840px, 96vw)",
              maxHeight: "90vh",
              borderRadius: "18px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-toolbar"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <span
                  className="eyebrow"
                  style={{
                    textTransform: "uppercase",
                    fontSize: "11px",
                    letterSpacing: "0.05em",
                    color: "var(--blue)",
                    display: "block",
                  }}
                >
                  {typeFor(cardModalRoom)?.name ?? "Accommodation"} · {hostels.find((h) => h.id === cardModalRoom.hostelId)?.name ?? "Hostel Room"}
                </span>
                <h2 style={{ margin: "2px 0 0", fontSize: "20px", color: "#0f172a" }}>
                  Room {cardModalRoom.roomNumber} Occupants & Details
                </h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const source = document.querySelector<HTMLElement>(".room-card-modal-content");
                    if (source) void printIsolatedElement(source, "room");
                  }}
                  title="Print Room Door / Warden Notice Chart"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 14px" }}
                >
                  <Printer size={14} /> Print Room Door Chart
                </button>
                <button
                  type="button"
                  className="record-action"
                  onClick={() => setCardModalRoom(null)}
                  style={{ fontSize: "16px", padding: "4px 10px", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              className="action-modal-body room-card-modal-content"
              style={{
                padding: "20px 24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {/* Room Stats Header */}
              {(() => {
                const occupants = allEmps.filter(
                  (emp) => emp.roomId === cardModalRoom.id && emp.status === "active",
                );
                const expense = expenses.find(
                  (e) => e.roomId === cardModalRoom.id && e.payPeriod === payPeriod,
                );
                const hostel = hostels.find((h) => h.id === cardModalRoom.hostelId);
                const isFull = cardModalRoom.capacity > 0 && occupants.length >= cardModalRoom.capacity;
                const availableBeds = cardModalRoom.capacity > 0 ? Math.max(0, cardModalRoom.capacity - occupants.length) : 0;

                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      <div className="metric-card" style={{ padding: "12px 16px", margin: 0 }}>
                        <small>Hostel / Location</small>
                        <strong style={{ fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cardModalRoom.address || hostel?.name || "Main Hostel"}
                        </strong>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                          Room Status: <strong style={{ color: cardModalRoom.status === "active" ? "#166534" : "#64748b" }}>{cardModalRoom.status}</strong>
                        </span>
                      </div>
                      <div className="metric-card" style={{ padding: "12px 16px", margin: 0 }}>
                        <small>Cycle Recoveries ({payPeriod})</small>
                        <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                          {money(
                            (expense?.gasAmount ?? 0) +
                            (expense?.rationAmount ?? 0) +
                            (expense?.provisionAmount ?? 0)
                          )}
                        </strong>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                          Gas: {money(expense?.gasAmount ?? 0)} · Ration: {money(expense?.rationAmount ?? 0)}
                        </span>
                      </div>
                    </div>

                    {/* Occupant Cards Grid */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                          Registered Occupants ({occupants.length})
                        </h3>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          All roommates sharing Room {cardModalRoom.roomNumber}
                        </span>
                      </div>

                      {occupants.length === 0 ? (
                        <div
                          className="enhancement-empty"
                          style={{
                            padding: "24px",
                            textAlign: "center",
                            background: "#f8fafc",
                            borderRadius: "12px",
                            border: "1px dashed #cbd5e1",
                          }}
                        >
                          No employees are currently allocated to Room {cardModalRoom.roomNumber}.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
                          {occupants.map((emp) => {
                            const empUnit = units.find((u) => u.id === emp.clientUnitId);
                            const charge = charges.find(
                              (c) => c.employeeId === emp.id && runs.some((r) => r.id === c.runId && r.payPeriod === payPeriod),
                            );

                            return (
                              <div
                                key={emp.id}
                                className="occupant-card"
                                style={{
                                  padding: "16px",
                                  borderRadius: "14px",
                                  border: "1px solid #e2e8f0",
                                  background: "linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)",
                                  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.05)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "12px",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div
                                      style={{
                                        width: "42px",
                                        height: "42px",
                                        borderRadius: "12px",
                                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                                        color: "#ffffff",
                                        display: "grid",
                                        placeItems: "center",
                                        fontWeight: 800,
                                        fontSize: "14px",
                                        flexShrink: 0,
                                        boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                                      }}
                                    >
                                      {emp.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <strong style={{ fontSize: "14.5px", color: "#0f172a", display: "block" }}>
                                        {emp.name}
                                      </strong>
                                      <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700 }}>
                                        {emp.employeeCode}
                                      </span>
                                    </div>
                                  </div>
                                  {canManage ? (
                                    <button
                                      type="button"
                                      className="record-action record-delete"
                                      style={{ fontSize: "11.5px", padding: "4px 10px", borderRadius: "6px" }}
                                      disabled={isActing}
                                      onClick={() =>
                                        void onAction(
                                          "allocate-room",
                                          `Removed ${emp.name} from room ${cardModalRoom.roomNumber}`,
                                          { employeeId: emp.id, roomId: null },
                                        )
                                      }
                                    >
                                      Remove
                                    </button>
                                  ) : null}
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "8px 14px",
                                    fontSize: "11.5px",
                                    paddingTop: "10px",
                                    borderTop: "1px solid #f1f5f9",
                                  }}
                                >
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Company / Unit
                                    </span>
                                    <strong style={{ color: "#334155", fontSize: "11.5px" }}>
                                      {empUnit?.clientName ? `${empUnit.clientName} · ${empUnit.unitName}` : empUnit?.unitName || "—"}
                                    </strong>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Department
                                    </span>
                                    <span style={{ color: "#475569", fontWeight: 500 }}>{emp.department || "General"}</span>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Mobile Number
                                    </span>
                                    <span style={{ color: "#475569", fontWeight: 600 }}>{emp.mobileNumber || "—"}</span>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Emergency Contact
                                    </span>
                                    <span style={{ color: "#475569" }}>{emp.emergencyContactNumber || "—"}</span>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Monthly Rent
                                    </span>
                                    <strong style={{ color: "#0f172a" }}>{money(emp.roomRentAmount || 0)}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: "var(--muted)", fontSize: "9.5px", textTransform: "uppercase", display: "block", letterSpacing: "0.03em" }}>
                                      Date of Joining
                                    </span>
                                    <span style={{ color: "#475569" }}>{formatDisplayDate(emp.dateOfJoining)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Allocate to this room */}
                    {canManage && cardModalRoom.status === "active" ? (
                      <div
                        style={{
                          padding: "16px 20px",
                          borderRadius: "14px",
                          border: "2px dashed #cbd5e1",
                          background: "#f8fafc",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "13.5px", color: "#1e293b" }}>
                            + Allocate Employee into Room {cardModalRoom.roomNumber}
                          </strong>
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>
                            Select an active employee to assign them to this room.
                          </p>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                          <select
                            value={allocationId}
                            onChange={(e) => setAllocationId(e.target.value)}
                            style={{ flex: "1 1 240px", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", border: "1px solid #cbd5e1" }}
                          >
                            <option value="">Choose an active unassigned employee...</option>
                            {allEmps
                              .filter((e) => e.vendorId === vendorId && e.status === "active" && !e.roomId)
                              .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.employeeCode} · {emp.name} ({emp.accommodationType || "No Type"})
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Monthly Rent (₹)"
                            min="0"
                            step="0.01"
                            value={allocationRent || ""}
                            onChange={(e) => setAllocationRent(Number(e.target.value))}
                            style={{ width: "130px", padding: "8px 10px", borderRadius: "8px", fontSize: "12px", border: "1px solid #cbd5e1" }}
                          />
                          <button
                            type="button"
                            className="primary-button"
                            disabled={!allocationId || isActing}
                            onClick={async () => {
                              if (!cardModalRoom || !allocationId) return;
                              const ok = await onAction(
                                "allocate-room",
                                "Employee allocated to accommodation room",
                                {
                                  employeeId: allocationId,
                                  roomId: cardModalRoom.id,
                                  roomRentAmount: allocationRent || 0,
                                },
                              );
                              if (ok) {
                                setAllocationId("");
                                setAllocationRent(0);
                              }
                            }}
                            style={{ padding: "8px 16px", minHeight: "36px", fontSize: "12.5px" }}
                          >
                            Allocate
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>

            <div
              className="modal-actions"
              style={{
                padding: "14px 24px",
                background: "#f8fafc",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setCardModalRoom(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reportRooms ? (
        <RoomBreakupReport
          rooms={reportRooms}
          types={types}
          employees={employees}
          units={units}
          expenses={expenses}
          charges={charges}
          runs={runs}
          payrollItems={payrollItems}
          payPeriod={payPeriod}
          onClose={() => setReportRooms(null)}
        />
      ) : null}
    </div>
  );
}

function RoomBreakupReport({
  rooms,
  types,
  employees,
  units,
  expenses,
  charges,
  runs,
  payrollItems,
  payPeriod,
  onClose,
}: {
  rooms: AccommodationRoom[];
  types: AccommodationType[];
  employees: Employee[];
  units: AppData["units"];
  expenses: RoomExpense[];
  charges: AccommodationCharge[];
  runs: PayrollRun[];
  payrollItems: PayrollItem[];
  payPeriod: string;
  onClose: () => void;
}) {
  function printRoomBreakupReport() {
    const source = document.querySelector<HTMLElement>(".room-report-layer .room-report-pages");
    if (!source) return;
    void printIsolatedElement(source, "room");
  }

  return (
    <div className="modal-layer room-report-layer">
      <button
        className="modal-scrim"
        aria-label="Close room breakup report"
        onClick={onClose}
      />
      <div className="room-report-modal">
        <div className="modal-toolbar">
          <div>
            <strong>
              {rooms.length === 1
                ? "Room-wise salary deduction breakup"
                : "Bulk room-wise deduction breakups"}
            </strong>
            <span>
              {payPeriod} · {rooms.length} room{rooms.length === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            <button className="secondary-button" onClick={printRoomBreakupReport}>
              Print / save PDF
            </button>
            <button
              className="icon-button"
              aria-label="Close report"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        <div className="room-report-pages">
          {rooms.map((room) => {
            const expense = expenses.find(
              (candidate) =>
                candidate.roomId === room.id &&
                candidate.payPeriod === payPeriod &&
                candidate.status === "finalized",
            );
            const deductions = expense
              ? charges.filter((charge) => charge.roomExpenseId === expense.id)
              : [];
            return (
              <article
                className="room-report-page room-recovery-full-report"
                key={room.id}
              >
                <header>
                  <div>
                    <span className="eyebrow">
                      Finalized room-wise salary recovery statement
                    </span>
                    <h2>
                      {
                        types.find(
                          (type) => type.id === room.accommodationTypeId,
                        )?.name
                      }{" "}
                      · Room {room.roomNumber}
                    </h2>
                    <p>
                      {room.address ??
                        "Net salary, all recovery types and final payable"}
                    </p>
                  </div>
                  <strong>{payPeriod}</strong>
                </header>
                <section className="room-report-summary">
                  <div>
                    <span>Gas</span>
                    <strong>{money(expense?.gasAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Ration</span>
                    <strong>{money(expense?.rationAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Provision</span>
                    <strong>{money(expense?.provisionAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Roommates</span>
                    <strong>
                      {expense?.occupantCount ?? deductions.length}
                    </strong>
                  </div>
                  <div>
                    <span>Shared total</span>
                    <strong>
                      {money(
                        (expense?.gasAmount ?? 0) +
                          (expense?.rationAmount ?? 0) +
                          (expense?.provisionAmount ?? 0),
                      )}
                    </strong>
                  </div>
                </section>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee / Punching No.</th>
                      <th>Net before recovery</th>
                      <th>Rent</th>
                      <th>Bus</th>
                      <th>Food</th>
                      <th>Advance</th>
                      <th>ID</th>
                      <th>Medical</th>
                      <th>Ticket</th>
                      <th>Shoe</th>
                      <th>Aadhaar</th>
                      <th>Bank A/c</th>
                      <th>T-shirt</th>
                      <th>Old pending</th>
                      <th>Gas</th>
                      <th>Ration</th>
                      <th>Provision</th>
                      <th>Total recovery</th>
                      <th>Return</th>
                      <th>Final payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.map((charge) => {
                      const employee = employees.find(
                        (candidate) => candidate.id === charge.employeeId,
                      );
                      const run = runs.find(
                        (candidate) =>
                          candidate.payPeriod === payPeriod &&
                          candidate.clientUnitId === employee?.clientUnitId,
                      );
                      const item = payrollItems.find(
                        (candidate) =>
                          candidate.runId === run?.id &&
                          candidate.employeeId === employee?.id,
                      );
                      const individual =
                        charge.rent +
                        charge.bus +
                        charge.food +
                        charge.advance +
                        charge.idCard +
                        charge.medical +
                        charge.ticket +
                        charge.shoe +
                        charge.aadhaarUpdate +
                        charge.bankAccountCharge +
                        charge.tshirt +
                        charge.oldPending;
                      const shared =
                        charge.gasShare +
                        charge.rationShare +
                        charge.provisionShare;
                      const totalRecovery = individual + shared;
                      const beforeRecovery = item
                        ? item.netPayable +
                          item.accommodationDeduction -
                          item.returnAmount
                        : 0;
                      return (
                        <tr key={charge.id}>
                          <td>
                            <strong>{employee?.name ?? "Employee"}</strong>
                            <small style={{ display: "block" }}>
                              {employee?.employeeCode ?? charge.employeeId}
                            </small>
                          </td>
                          <td>{money(beforeRecovery)}</td>
                          <td>{money(charge.rent)}</td>
                          <td>{money(charge.bus)}</td>
                          <td>{money(charge.food)}</td>
                          <td>{money(charge.advance)}</td>
                          <td>{money(charge.idCard)}</td>
                          <td>{money(charge.medical)}</td>
                          <td>{money(charge.ticket)}</td>
                          <td>{money(charge.shoe)}</td>
                          <td>{money(charge.aadhaarUpdate)}</td>
                          <td>{money(charge.bankAccountCharge)}</td>
                          <td>{money(charge.tshirt)}</td>
                          <td>{money(charge.oldPending)}</td>
                          <td>{money(charge.gasShare)}</td>
                          <td>{money(charge.rationShare)}</td>
                          <td>{money(charge.provisionShare)}</td>
                          <td>
                            <strong>{money(totalRecovery)}</strong>
                          </td>
                          <td>{money(charge.returnAmount)}</td>
                          <td>
                            <strong>{money(item?.netPayable ?? 0)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <footer>
                  Finalized by{" "}
                  {expense?.finalizedBy ?? "authorized payroll user"}
                  {expense?.finalizedAt
                    ? ` · ${new Date(expense.finalizedAt).toLocaleString("en-IN")}`
                    : ""}
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
