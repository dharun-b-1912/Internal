"use client";

import { useState, useMemo, useRef } from "react";
import { Calendar, UserPlus, ChevronLeft, ChevronRight, FileSpreadsheet, Download, Printer, CalendarDays, Building2, MapPin, Search, Users, Clock, AlertCircle, FileCheck, FileText, Edit2 } from "lucide-react";
import type { AppData, Employee, Vendor, ClientUnit } from "./payroll-app";
import { formatDisplayDate } from "../lib/date-format";
import { printIsolatedElement } from "../lib/print-document";
import { buildDailyWorkforcePdf } from "../lib/daily-workforce-pdf";
import { DailyReportModal } from "./daily-report-modal";

type Row = (string | number)[];

function downloadRows(name: string, rows: Row[], excel = false) {
  const escape = (v: string | number) =>
    String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const body = excel
    ? `\ufeff<html><head><meta charset="utf-8"></head><body><table>${rows
        .map((r, i) => `<tr>${r.map((c) => `<${i === 0 ? "th" : 'td style="mso-number-format:\\@;"'}>${escape(c)}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`)
        .join("")}</table></body></html>`
    : "\ufeff" +
      rows
        .map((r) =>
          r.map((c) => {
            if (c === null || c === undefined) return '""';
            const str = String(c);
            if (/^\d{10,}$/.test(str) || (/^0\d+$/.test(str) && str.length > 1)) {
              return `="${str.replaceAll('"', '""')}"`;
            }
            return `"${str.replaceAll('"', '""')}"`;
          }).join(",")
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

function formatMonthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  const dt = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(dt);
}

// Generate an array of YYYY-MM-DD for every day in a given YYYY-MM
function getDaysInMonth(yearMonth: string): Array<{ dateStr: string; dayNum: number; dayName: string; isToday: boolean }> {
  const [yStr, mStr] = yearMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1; // 0-indexed
  const daysCount = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const days: Array<{ dateStr: string; dayNum: number; dayName: string; isToday: boolean }> = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let d = 1; d <= daysCount; d++) {
    const dt = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      dateStr,
      dayNum: d,
      dayName: dayNames[dt.getDay()],
      isToday: dateStr === todayIso,
    });
  }
  return days;
}

export function JoinedEmployeesView({
  data,
  initialDate,
  onNavigateBack,
  onSelectEmployee,
  onEditEmployee,
  onViewDocuments,
}: {
  data: AppData;
  initialDate?: string;
  onNavigateBack?: () => void;
  onSelectEmployee?: (employee: Employee) => void;
  onEditEmployee?: (employee: Employee) => void;
  onViewDocuments?: (employee: Employee) => void;
}) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialMonth = (initialDate || todayStr).slice(0, 7);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || "all"); // "all" or "YYYY-MM-DD"
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyPendingFilter, setOnlyPendingFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const pageSize = 25;
  const printRef = useRef<HTMLDivElement>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(prevStr);
    setSelectedDate("all");
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextStr);
    setSelectedDate("all");
    setCurrentPage(1);
  };

  const handleCurrentMonth = () => {
    const curStr = todayStr.slice(0, 7);
    setSelectedMonth(curStr);
    setSelectedDate(todayStr);
    setCurrentPage(1);
  };

  const monthLabel = useMemo(() => formatMonthTitle(selectedMonth), [selectedMonth]);

  // Days list for selected month
  const monthDays = useMemo(() => getDaysInMonth(selectedMonth), [selectedMonth]);

  // All employees with company, unit, and verification metadata
  const enrichedEmployees = useMemo(() => {
    return data.employees.map((emp) => {
      const vendor = data.vendors.find((v) => v.id === emp.vendorId);
      const unit = data.units.find((u) => u.id === emp.clientUnitId);
      const docs = (data.applicationDocuments || []).filter((d) => d.employeeId === emp.id);

      const hasAadhaarFront = docs.some((d) => d.category === "Aadhar Front side");
      const hasAadhaarBack = docs.some((d) => d.category === "Aadhar Back side");
      const hasBankDoc = docs.some((d) => d.category === "Bank Proofs");
      const hasAadhaar = hasAadhaarFront && hasAadhaarBack;
      const hasBank = Boolean(emp.bankAccountMasked && emp.ifscMasked);
      const hasUan = Boolean(emp.uanMasked);
      const hasEsi = Boolean(emp.esiMasked);

      const docCount = docs.length;
      const rejectedDocs = docs.filter((d) => d.status === "rejected");
      const approvedDocs = docs.filter((d) => d.status === "approved" && Boolean(d.reviewedBy));
      const pendingDocs = docs.filter((d) => d.status !== "rejected" && (!d.status || d.status === "pending_approval" || !d.reviewedBy));
      const hasPendingVerification = pendingDocs.length > 0;
      const isAllVerified = docCount > 0 && approvedDocs.length === docCount;
      const hasRejectedVerification = rejectedDocs.length > 0;

      return {
        employee: emp,
        vendor,
        unit,
        companyName: vendor?.legalName || vendor?.name || "Unassigned",
        clientName: unit?.clientName || "Direct Client",
        unitName: unit?.unitName || "General Unit",
        joinDate: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 10) : "",
        joinMonth: emp.dateOfJoining ? emp.dateOfJoining.slice(0, 7) : "",
        hasAadhaar,
        hasBankDoc,
        hasBank,
        hasUan,
        hasEsi,
        isFullyCompliant: hasAadhaar && hasBank && hasUan && hasEsi,
        docCount,
        pendingDocsCount: pendingDocs.length,
        approvedDocsCount: approvedDocs.length,
        rejectedDocsCount: rejectedDocs.length,
        hasPendingVerification,
        isAllVerified,
        hasRejectedVerification,
      };
    });
  }, [data.employees, data.vendors, data.units, data.applicationDocuments]);

  // Filter employees for the selected month (independent of date selection to compute day counts)
  const monthJoinings = useMemo(() => {
    return enrichedEmployees.filter((item) => {
      if (item.joinMonth !== selectedMonth) return false;
      if (companyFilter !== "all" && item.vendor?.id !== companyFilter) return false;
      if (unitFilter !== "all" && item.employee.clientUnitId !== unitFilter) return false;
      return true;
    });
  }, [enrichedEmployees, selectedMonth, companyFilter, unitFilter]);

  // Date-wise counts for the selected month
  const dateCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of monthJoinings) {
      if (item.joinDate) {
        map.set(item.joinDate, (map.get(item.joinDate) || 0) + 1);
      }
    }
    return map;
  }, [monthJoinings]);

  // Available client units based on company filter
  const availableUnits = useMemo(() => {
    if (companyFilter === "all") {
      return data.units.filter((u) => u.status === "active" || data.employees.some((e) => e.clientUnitId === u.id));
    }
    return data.units.filter(
      (u) => u.vendorId === companyFilter && (u.status === "active" || data.employees.some((e) => e.clientUnitId === u.id))
    );
  }, [companyFilter, data.units, data.employees]);

  // Filtered employees list based on search, selectedDate, and filters
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return monthJoinings.filter((item) => {
      // Pending verification toggle filter
      if (onlyPendingFilter && !item.hasPendingVerification) {
        return false;
      }
      // Date filter
      if (selectedDate !== "all" && item.joinDate !== selectedDate) {
        return false;
      }
      // Search filter
      if (query) {
        const emp = item.employee;
        const matchName = emp.name.toLowerCase().includes(query);
        const matchCode = (emp.employeeCode || "").toLowerCase().includes(query);
        const matchMobile = (emp.mobileNumber || "").toLowerCase().includes(query);
        const matchDept = (emp.department || "").toLowerCase().includes(query);
        const matchCompany = item.companyName.toLowerCase().includes(query);
        const matchClient = item.clientName.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchMobile && !matchDept && !matchCompany && !matchClient) {
          return false;
        }
      }
      return true;
    });
  }, [monthJoinings, selectedDate, searchQuery, onlyPendingFilter]);

  // Total pending in current filtered month
  const totalPendingInMonth = useMemo(() => {
    return monthJoinings.filter((i) => i.hasPendingVerification).length;
  }, [monthJoinings]);

  // Summary Metrics
  const totalMonthJoinings = monthJoinings.length;
  const todayJoiningsCount = dateCountsMap.get(todayStr) || 0;

  // Find day with highest joinings
  const peakJoiningDay = useMemo(() => {
    let max = 0;
    let peakDate = "";
    for (const [dateStr, count] of dateCountsMap.entries()) {
      if (count > max) {
        max = count;
        peakDate = dateStr;
      }
    }
    return { date: peakDate, count: max };
  }, [dateCountsMap]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Export handlers
  const handleExport = (isExcel = false) => {
    const headers = [
      "Group Company",
      "Client Name",
      "Employer Unit",
      "Employee ID",
      "Employee Name",
      "Department",
      "Mobile Number",
      "Date of Joining",
      "Aadhaar KYC",
      "Bank Details",
      "EPF / UAN",
      "ESI",
      "Status",
    ];

    const rows: Row[] = [
      headers,
      ...filteredEmployees.map((item) => [
        item.companyName,
        item.clientName,
        item.unitName,
        item.employee.employeeCode,
        item.employee.name,
        item.employee.department || "",
        item.employee.mobileNumber || "",
        formatDisplayDate(item.employee.dateOfJoining),
        item.hasAadhaar ? "Verified" : "Pending",
        item.hasBank ? "Available" : "Pending",
        item.hasUan ? "Linked" : "Pending",
        item.hasEsi ? "Linked" : "Pending",
        item.employee.status || "active",
      ]),
    ];

    const dateTag = selectedDate === "all" ? selectedMonth : selectedDate;
    downloadRows(`Joined_Employees_Register_${dateTag}`, rows, isExcel);
  };

  const handlePrint = () => {
    if (printRef.current) {
      printIsolatedElement(printRef.current, "report");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {/* Top Banner & Header */}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          background: "#064e3b",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 8px 20px -4px rgba(6, 78, 59, 0.35)",
        }}
      >
        <div style={{ minWidth: "260px", flex: "1 1 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                background: "rgba(16, 185, 129, 0.25)",
                color: "#6ee7b7",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(110, 231, 183, 0.5)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Calendar size={13} />
              <span>Daily Joining Register &amp; Analytics</span>
            </span>
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                style={{
                  background: "rgba(255, 255, 255, 0.18)",
                  border: "none",
                  color: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ← Back to Overview
              </button>
            )}
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px", color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={22} style={{ color: "#a7f3d0" }} />
            <span>Daily Workforce Joining Register</span>
          </h2>
          <p style={{ margin: 0, color: "#a7f3d0", fontSize: "13px", maxWidth: "580px" }}>
            Track day-by-day candidate onboarding, examine daily headcounts, and inspect joined workforce compliance across all group companies &amp; client units.
          </p>
        </div>

        {/* Action Controls & Month Stepper */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Month Selector Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffffff",
              padding: "4px 8px",
              borderRadius: "10px",
              border: "1.5px solid #10b981",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "6px",
                padding: "5px 10px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Prominent High-Contrast Month Display */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setSelectedDate("all");
                    setCurrentPage(1);
                  }
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: "13px",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "6px",
                padding: "5px 10px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              style={{
                background: "#065f46",
                border: "none",
                color: "#ffffff",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Today
            </button>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => handleExport(true)}
            style={{ background: "#ffffff", color: "#064e3b", fontWeight: 700, padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel (.xls)</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => handleExport(false)}
            style={{ background: "#ffffff", color: "#064e3b", fontWeight: 700, padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handlePrint}
            style={{ background: "#10b981", border: "none", padding: "6px 12px", fontSize: "12px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <Printer size={14} />
            <span>Print View</span>
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowDailyReportModal(true)}
            style={{
              background: "#0284c7",
              border: "none",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.4)",
              cursor: "pointer",
            }}
          >
            <FileText size={14} />
            <span>Daily PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <section className="workforce-number-grid">
        <article className="enhancement-number-card enhancement-tone-emerald">
          <span>Total joined in {monthLabel}</span>
          <strong>{totalMonthJoinings}</strong>
          <small>Across all group units in {monthLabel}</small>
        </article>
        <article
          className={`enhancement-number-card ${selectedDate === todayStr ? "enhancement-tone-emerald" : "enhancement-tone-indigo"}`}
          onClick={() => {
            setSelectedDate(todayStr);
            setCurrentPage(1);
          }}
          style={{ cursor: "pointer" }}
          title="Click to filter by today's joinings"
        >
          <span>Today's joinings ({formatDisplayDate(todayStr)})</span>
          <strong>{todayJoiningsCount}</strong>
          <small>Click to filter today's entries ➔</small>
        </article>
        <article className="enhancement-number-card enhancement-tone-blue">
          <span>Peak joining day</span>
          <strong>{peakJoiningDay.count > 0 ? `${peakJoiningDay.count} Joined` : "0"}</strong>
          <small>
            {peakJoiningDay.date ? formatDisplayDate(peakJoiningDay.date) : "No joinings yet"}
          </small>
        </article>
        <article className="enhancement-number-card enhancement-tone-violet">
          <span>Currently viewing</span>
          <strong style={{ fontSize: "18px" }}>
            {selectedDate === "all" ? `All of ${monthLabel}` : formatDisplayDate(selectedDate)}
          </strong>
          <small>{filteredEmployees.length} matching employee(s)</small>
        </article>
      </section>

      {/* Date-wise Calendar Day Strip */}
      <section
        className="panel"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: "14px",
          padding: "16px 20px",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Calendar size={16} style={{ color: "#065f46" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#1e293b" }}>
              Date-wise Joining Breakdown for {monthLabel}
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              (Click any day to view joined employees)
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedDate("all");
              setCurrentPage(1);
            }}
            style={{
              background: selectedDate === "all" ? "#065f46" : "#f1f5f9",
              color: selectedDate === "all" ? "#ffffff" : "#334155",
              border: selectedDate === "all" ? "none" : "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalendarDays size={14} />
            <span>View All Days in Month ({totalMonthJoinings})</span>
          </button>
        </div>

        {/* Horizontal Scrollable Days Strip */}
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "10px",
            scrollbarWidth: "thin",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {monthDays.map((day) => {
            const count = dateCountsMap.get(day.dateStr) || 0;
            const isSelected = selectedDate === day.dateStr;
            const hasJoinings = count > 0;

            let bgColor = "#f8fafc";
            let borderColor = "#e2e8f0";
            let textColor = "#475569";
            let countBg = "#e2e8f0";
            let countColor = "#475569";

            if (isSelected) {
              bgColor = "#065f46";
              borderColor = "#047857";
              textColor = "#ffffff";
              countBg = "#10b981";
              countColor = "#ffffff";
            } else if (hasJoinings) {
              bgColor = "#ecfdf5";
              borderColor = "#6ee7b7";
              textColor = "#065f46";
              countBg = "#10b981";
              countColor = "#ffffff";
            } else if (day.isToday) {
              borderColor = "#3b82f6";
            }

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDate(day.dateStr);
                  setCurrentPage(1);
                }}
                style={{
                  minWidth: "60px",
                  padding: "8px 6px",
                  borderRadius: "10px",
                  border: `1.5px solid ${borderColor}`,
                  background: bgColor,
                  color: textColor,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  flexShrink: 0,
                  transition: "transform 0.12s ease, box-shadow 0.12s ease",
                  transform: isSelected ? "scale(1.04)" : "none",
                  boxShadow: isSelected ? "0 4px 10px rgba(6, 95, 70, 0.2)" : "none",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 600, opacity: isSelected ? 0.9 : 0.7 }}>
                  {day.dayName}
                </span>
                <span style={{ fontSize: "15px", fontWeight: 800 }}>
                  {day.dayNum}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: countBg,
                    color: countColor,
                    marginTop: "2px",
                  }}
                >
                  {count}
                </span>
                {day.isToday && (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      color: isSelected ? "#a7f3d0" : "#3b82f6",
                      textTransform: "uppercase",
                    }}
                  >
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter and Search Bar Panel */}
      <section
        className="panel"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: "14px",
          padding: "16px 20px",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            alignItems: "end",
          }}
        >
          {/* Company Filter */}
          <div style={{ minWidth: 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              <Building2 size={13} style={{ color: "#475569" }} />
              <span>Group Company</span>
            </label>
            <select
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setUnitFilter("all");
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#f8fafc",
                fontWeight: 600,
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Group Companies</option>
              {data.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client Unit Filter */}
          <div style={{ minWidth: 0 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              <MapPin size={13} style={{ color: "#475569" }} />
              <span>Client Name / Location</span>
            </label>
            <select
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#f8fafc",
                fontWeight: 600,
                boxSizing: "border-box",
              }}
            >
              <option value="all">All Accessible Client Units</option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.clientName} · {unit.unitName}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div style={{ minWidth: 0, gridColumn: "span 1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              <Search size={13} style={{ color: "#475569" }} />
              <span>Search Employees</span>
            </label>
            <input
              type="search"
              placeholder="Search by candidate name, code, mobile, department..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#f8fafc",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Table Panel */}
      <section
        ref={printRef}
        className="panel"
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: "14px",
          padding: "20px",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={18} style={{ color: "#0f172a" }} />
              <span>Joined Workforce List</span>
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
              Showing {filteredEmployees.length} joined employee(s) for{" "}
              <strong>{selectedDate === "all" ? `all days in ${monthLabel}` : formatDisplayDate(selectedDate)}</strong>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Quick Toggle: Only Pending Verification */}
            <button
              type="button"
              onClick={() => {
                setOnlyPendingFilter(!onlyPendingFilter);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: onlyPendingFilter ? "#fef2f2" : "#ffffff",
                border: onlyPendingFilter ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                color: onlyPendingFilter ? "#991b1b" : "#475569",
                boxShadow: onlyPendingFilter ? "0 2px 6px rgba(220,38,38,0.2)" : "none",
                transition: "all 0.15s ease",
              }}
              title="Click to hide already approved employees and only show candidates needing verification"
            >
              <Clock size={13} style={{ color: onlyPendingFilter ? "#dc2626" : "#64748b" }} />
              <span>
                {onlyPendingFilter ? "Showing Pending Only" : "Filter: Needs Verification"}
              </span>
              <span
                style={{
                  background: onlyPendingFilter ? "#dc2626" : "#f1f5f9",
                  color: onlyPendingFilter ? "#ffffff" : "#334155",
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 800,
                }}
              >
                {totalPendingInMonth}
              </span>
            </button>

            {/* Quick Pagination indicator */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="secondary-button"
                  style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="secondary-button"
                  style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <UserPlus size={28} style={{ color: "#94a3b8", display: "block", margin: "0 auto 8px" }} />
            <h4 style={{ margin: 0, fontSize: "16px", color: "#334155", fontWeight: 700 }}>
              No joinings recorded for this selection
            </h4>
            <p style={{ margin: "4px 0 12px", color: "#64748b", fontSize: "13px" }}>
              Try selecting another date or click "View All Days in Month".
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedDate("all");
                setCompanyFilter("all");
                setUnitFilter("all");
                setSearchQuery("");
              }}
              style={{
                background: "#065f46",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            <table className="data-table" style={{ width: "100%", minWidth: "950px", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", color: "#334155", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 12px" }}>#</th>
                  <th style={{ padding: "10px 12px" }}>Employee Code</th>
                  <th style={{ padding: "10px 12px" }}>Employee Name</th>
                  <th style={{ padding: "10px 12px" }}>Date of Joining</th>
                  <th style={{ padding: "10px 12px" }}>Group Company</th>
                  <th style={{ padding: "10px 12px" }}>Client &amp; Unit</th>
                  <th style={{ padding: "10px 12px" }}>Department</th>
                  <th style={{ padding: "10px 12px" }}>Mobile Number</th>
                  <th style={{ padding: "10px 12px" }}>Compliance Badges</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((item, index) => {
                  const emp = item.employee;
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: "#0f172a",
                            background: "#f1f5f9",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {emp.employeeCode || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              fontWeight: 800,
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ color: "#0f172a", display: "block" }}>{emp.name}</strong>
                            {emp.employmentType && (
                              <span style={{ fontSize: "11px", color: "#64748b" }}>
                                {emp.employmentType}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#065f46" }}>
                        {formatDisplayDate(emp.dateOfJoining)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600 }}>
                        {item.companyName}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ color: "#0f172a", fontWeight: 600 }}>{item.clientName}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{item.unitName}</div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#475569" }}>
                        {emp.department || "General"}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#334155" }}>
                        {emp.mobileNumber || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {/* Verification Chip */}
                          {item.hasPendingVerification ? (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "1px solid #fca5a5",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                width: "fit-content",
                              }}
                              title={`${item.pendingDocsCount} document(s) awaiting Super Admin review`}
                            >
                              <Clock size={11} style={{ color: "#dc2626" }} />
                              <span>{item.pendingDocsCount} Pending Review</span>
                            </span>
                          ) : item.isAllVerified ? (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #86efac",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                width: "fit-content",
                              }}
                              title="All documents verified"
                            >
                              ✓ All Verified
                            </span>
                          ) : item.hasRejectedVerification ? (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecdd3",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                width: "fit-content",
                              }}
                            >
                              <AlertCircle size={11} style={{ color: "#b91c1c" }} />
                              <span>{item.rejectedDocsCount} Rejected</span>
                            </span>
                          ) : null}

                          {/* Compliance Badges */}
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            <span
                              title={item.hasAadhaar ? "Aadhaar Card Front & Back Verified" : "Aadhaar Proof Missing"}
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 5px",
                                borderRadius: "4px",
                                background: item.hasAadhaar ? "#dcfce7" : "#fee2e2",
                                color: item.hasAadhaar ? "#166534" : "#991b1b",
                              }}
                            >
                              Aadhaar {item.hasAadhaar ? "✓" : "✗"}
                            </span>
                            <span
                              title={item.hasBank ? "Bank Account & IFSC Available" : "Bank Details Incomplete"}
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 5px",
                                borderRadius: "4px",
                                background: item.hasBank ? "#dcfce7" : "#fef3c7",
                                color: item.hasBank ? "#166534" : "#92400e",
                              }}
                            >
                              Bank {item.hasBank ? "✓" : "✗"}
                            </span>
                            <span
                              title={item.hasUan ? "EPF / UAN Available" : "UAN Missing"}
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 5px",
                                borderRadius: "4px",
                                background: item.hasUan ? "#dcfce7" : "#fee2e2",
                                color: item.hasUan ? "#166534" : "#991b1b",
                              }}
                            >
                              EPF {item.hasUan ? "✓" : "✗"}
                            </span>
                            <span
                              title={item.hasEsi ? "ESI Number Available" : "ESI Missing"}
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 5px",
                                borderRadius: "4px",
                                background: item.hasEsi ? "#dcfce7" : "#fee2e2",
                                color: item.hasEsi ? "#166534" : "#991b1b",
                              }}
                            >
                              ESI {item.hasEsi ? "✓" : "✗"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: emp.status === "left" ? "#f1f5f9" : "#dcfce7",
                            color: emp.status === "left" ? "#64748b" : "#166534",
                            textTransform: "capitalize",
                          }}
                        >
                          {emp.status || "active"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="record-action"
                            onClick={() => onViewDocuments?.(emp)}
                            title="Review employee verification documents"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              background: item.hasPendingVerification ? "#059669" : "#f8fafc",
                              color: item.hasPendingVerification ? "#ffffff" : "#334155",
                              border: item.hasPendingVerification ? "none" : "1px solid #cbd5e1",
                              boxShadow: item.hasPendingVerification ? "0 1px 3px rgba(5,150,105,0.3)" : "none",
                              transition: "all 0.12s ease",
                            }}
                          >
                            {item.hasPendingVerification ? (
                              <>
                                <FileCheck size={13} />
                                <span>Review ({item.pendingDocsCount})</span>
                              </>
                            ) : item.isAllVerified ? (
                              <span>✓ Verified</span>
                            ) : (
                              <>
                                <FileText size={13} />
                                <span>Docs</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="record-action"
                            onClick={() => onEditEmployee?.(emp)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              transition: "all 0.12s ease",
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #e2e8f0",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} total joinings
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="secondary-button"
                style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 3 }}
              >
                <ChevronLeft size={13} /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <span key={page} style={{ display: "flex", alignItems: "center" }}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span style={{ padding: "0 4px" }}>…</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: currentPage === page ? "#065f46" : "#cbd5e1",
                        background: currentPage === page ? "#065f46" : "#fff",
                        color: currentPage === page ? "#fff" : "#334155",
                        cursor: "pointer",
                      }}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="secondary-button"
                style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: 3 }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </section>

      {showDailyReportModal && (
        <DailyReportModal
          data={data}
          initialDate={selectedDate === "all" ? todayStr : selectedDate}
          onClose={() => setShowDailyReportModal(false)}
        />
      )}
    </div>
  );
}
