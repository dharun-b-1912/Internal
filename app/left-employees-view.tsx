"use client";

import { useState, useMemo, useRef } from "react";
import { UserMinus, Lock, FileText, ChevronLeft, ChevronRight, Calendar, Printer, FileSpreadsheet, Download, Users, Filter, ClipboardList, Phone, Edit2 } from "lucide-react";
import type { AppData, Employee, Vendor, ClientUnit } from "./payroll-app";
import { formatDisplayDate } from "../lib/date-format";
import { printIsolatedElement } from "../lib/print-document";
import { downloadXlsx } from "../lib/export-xlsx";
import { buildDailyWorkforcePdf } from "../lib/daily-workforce-pdf";
import { DailyReportModal } from "./daily-report-modal";

type Row = (string | number)[];

function downloadRows(name: string, rows: Row[], excel = false) {
  if (excel) {
    downloadXlsx(`${name}.xlsx`, rows, "Left Employees");
    return;
  }
  const body =
    "\ufeff" +
    rows
      .map((r) =>
        r
          .map((c) => {
            if (c === null || c === undefined) return '""';
            const str = String(c);
            return `"${str.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([body], {
      type: "text/csv;charset=utf-8",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
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

function getTenureDays(joining: string, leaving?: string | null) {
  if (!joining) return 0;
  const start = new Date(`${joining}T00:00:00Z`).getTime();
  const end = leaving
    ? new Date(`${leaving}T00:00:00Z`).getTime()
    : Date.now();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

function getTenureLabel(joining: string, leaving?: string | null) {
  if (!joining) return "—";
  const totalDays = getTenureDays(joining, leaving);
  const months = Math.floor(totalDays / 30.4);
  if (months < 1) return `${totalDays} days`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${months} mos (${totalDays}d)`;
  return `${years} yr ${remMonths} mo (${totalDays}d)`;
}

export function LeftEmployeesView({
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
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || "all"); // "all" or "YYYY-MM-DD" or "all_history"
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  // Filter only left employees across the entire database
  const allLeftEmployees = useMemo(() => {
    return data.employees.filter(
      (emp) => emp.status === "left" || Boolean(emp.dateOfLeaving)
    );
  }, [data.employees]);

  // Compute stats, tenure, and month-wise attendance breakdown per left employee
  const enrichedLeftEmployees = useMemo(() => {
    return allLeftEmployees.map((employee) => {
      const vendor = data.vendors.find((v) => v.id === employee.vendorId);
      const unit = data.units.find((u) => u.id === employee.clientUnitId);
      const employeeItems = data.payrollItems.filter((i) => i.employeeId === employee.id);
      const employeeAttendance = data.attendance.filter(
        (a) => a.employeeId === employee.id && ["P", "HP", "HD"].includes(a.statusCode)
      );

      const monthMap = new Map<string, number>();
      for (const a of employeeAttendance) {
        const ym = a.attendanceDate.slice(0, 7);
        monthMap.set(ym, (monthMap.get(ym) || 0) + (a.statusCode === "HD" ? 0.5 : 1));
      }
      for (const pi of employeeItems) {
        const pRun = data.runs.find((r) => r.id === pi.runId);
        if (pRun?.payPeriod && !monthMap.has(pRun.payPeriod) && pi.payableDays > 0) {
          monthMap.set(pRun.payPeriod, pi.payableDays);
        }
      }

      const totalWorkedDays = Array.from(monthMap.values()).reduce((a, b) => a + b, 0);
      const monthBreakdowns = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, days]) => ({ month: m, days }));

      const leaveDate = employee.dateOfLeaving ? employee.dateOfLeaving.slice(0, 10) : "";
      const leaveMonth = employee.dateOfLeaving ? employee.dateOfLeaving.slice(0, 7) : "";
      const tenureText = getTenureLabel(employee.dateOfJoining, employee.dateOfLeaving);

      return {
        employee,
        vendor,
        unit,
        companyName: vendor?.legalName || vendor?.name || "Unassigned",
        clientName: unit?.clientName || "Direct Unit",
        unitName: unit?.unitName || "General",
        leaveDate,
        leaveMonth,
        tenureText,
        totalWorkedDays,
        monthBreakdowns,
        breakdownText:
          monthBreakdowns.length > 0
            ? monthBreakdowns.map((b) => `${b.month}: ${b.days}d`).join(" | ")
            : "No days recorded",
      };
    });
  }, [allLeftEmployees, data.vendors, data.units, data.payrollItems, data.attendance, data.runs]);

  // Filter employees for the selected month (to compute day counts on the calendar strip)
  const monthLeftEmployees = useMemo(() => {
    return enrichedLeftEmployees.filter((item) => {
      if (item.leaveMonth !== selectedMonth) return false;
      if (companyFilter !== "all" && item.vendor?.id !== companyFilter) return false;
      if (unitFilter !== "all" && item.employee.clientUnitId !== unitFilter) return false;
      return true;
    });
  }, [enrichedLeftEmployees, selectedMonth, companyFilter, unitFilter]);

  // Date-wise counts for the selected month
  const dateCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of monthLeftEmployees) {
      if (item.leaveDate) {
        map.set(item.leaveDate, (map.get(item.leaveDate) || 0) + 1);
      }
    }
    return map;
  }, [monthLeftEmployees]);

  // Available Client Units based on company selection
  const availableUnits = useMemo(() => {
    if (companyFilter === "all") {
      return data.units.filter(
        (u) => u.status === "active" || allLeftEmployees.some((e) => e.clientUnitId === u.id)
      );
    }
    return data.units.filter(
      (u) =>
        u.vendorId === companyFilter &&
        (u.status === "active" || allLeftEmployees.some((e) => e.clientUnitId === u.id))
    );
  }, [companyFilter, data.units, allLeftEmployees]);

  // Filtered employees list based on search, selectedDate, and company/unit filters
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return enrichedLeftEmployees.filter((item) => {
      // Company and Unit filters
      if (companyFilter !== "all" && item.vendor?.id !== companyFilter) {
        return false;
      }
      if (unitFilter !== "all" && item.employee.clientUnitId !== unitFilter) {
        return false;
      }

      // Date filtering
      if (selectedDate === "all_history") {
        // Show all history regardless of month
      } else if (selectedDate === "all") {
        // Show all in the selected month
        if (item.leaveMonth !== selectedMonth) return false;
      } else {
        // Specific date selected
        if (item.leaveDate !== selectedDate) return false;
      }

      // Search query
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
  }, [enrichedLeftEmployees, selectedDate, selectedMonth, companyFilter, unitFilter, searchQuery]);

  // Summary Metrics
  const totalMonthExits = monthLeftEmployees.length;
  const todayExitsCount = dateCountsMap.get(todayStr) || 0;
  const totalFilteredWorkedDays = useMemo(() => {
    return filteredEmployees.reduce((acc, curr) => acc + curr.totalWorkedDays, 0);
  }, [filteredEmployees]);
  const averageWorkedDays = useMemo(() => {
    if (filteredEmployees.length === 0) return 0;
    return Math.round(totalFilteredWorkedDays / filteredEmployees.length);
  }, [filteredEmployees.length, totalFilteredWorkedDays]);

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
      "Date of Leaving",
      "Tenure",
      "Total Worked Days",
      "Month-wise Worked Days Breakdown",
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
        formatDisplayDate(item.employee.dateOfLeaving) || "Left",
        item.tenureText,
        item.totalWorkedDays,
        item.breakdownText,
        item.employee.status || "left",
      ]),
    ];

    const dateTag = selectedDate === "all" ? selectedMonth : selectedDate === "all_history" ? "All_History" : selectedDate;
    downloadRows(`Left_Employees_Register_${dateTag}`, rows, isExcel);
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
          background: "linear-gradient(135deg, #450a0a 0%, #1e1b4b 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 8px 20px -4px rgba(69, 10, 10, 0.4)",
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
                background: "rgba(239, 68, 68, 0.25)",
                color: "#fca5a5",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(252, 165, 165, 0.5)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UserMinus size={13} />
              <span>Daily Left Employees Register &amp; Work History</span>
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                background: "rgba(147, 51, 234, 0.25)",
                color: "#d8b4fe",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(216, 180, 254, 0.5)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Lock size={12} />
              <span>Super Admin Exclusive</span>
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
            <FileText size={22} />
            <span>Left Employees Calendar &amp; Service Ledger</span>
          </h2>
          <p style={{ margin: 0, color: "#fecaca", fontSize: "13px", maxWidth: "600px" }}>
            Track date-wise employee exits, examine daily departure counts, inspect tenure, and review complete month-by-month worked days across all group companies.
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
              border: "1.5px solid #ef4444",
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
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                }}
              />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0f172a",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <Calendar size={14} />
                <span>{monthLabel}</span>
              </span>
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
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                borderRadius: "6px",
                padding: "5px 10px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDailyReportModal(true)}
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
            }}
          >
            <FileText size={15} />
            <span>Daily PDF Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport(true)}
            style={{
              background: "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport(false)}
            style={{
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Horizontal Interactive Calendar Strip */}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: "14px",
          padding: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Calendar size={16} style={{ color: "#0f172a" }} />
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
              {monthLabel} Exit Calendar Strip
            </span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              (Click any day to filter that date&apos;s exits)
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Show All Month Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate("all");
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: selectedDate === "all" ? "#dc2626" : "#f1f5f9",
                color: selectedDate === "all" ? "#ffffff" : "#475569",
                border: selectedDate === "all" ? "1px solid #b91c1c" : "1px solid #cbd5e1",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Calendar size={13} />
              <span>All of {monthLabel} ({totalMonthExits})</span>
            </button>

            {/* Show All Historical Exits Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate("all_history");
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: selectedDate === "all_history" ? "#7c3aed" : "#f1f5f9",
                color: selectedDate === "all_history" ? "#ffffff" : "#475569",
                border: selectedDate === "all_history" ? "1px solid #6d28d9" : "1px solid #cbd5e1",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Users size={13} />
              <span>Entire Left Directory ({allLeftEmployees.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Day Chips */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "8px",
            scrollbarWidth: "thin",
          }}
        >
          {monthDays.map((day) => {
            const count = dateCountsMap.get(day.dateStr) || 0;
            const isSelected = selectedDate === day.dateStr;
            const isToday = day.isToday;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDate(day.dateStr);
                  setCurrentPage(1);
                }}
                style={{
                  minWidth: "68px",
                  padding: "8px 6px",
                  borderRadius: "10px",
                  border: isSelected
                    ? "2px solid #dc2626"
                    : isToday
                    ? "2px solid #3b82f6"
                    : count > 0
                    ? "1px solid #fca5a5"
                    : "1px solid #e2e8f0",
                  background: isSelected
                    ? "#fee2e2"
                    : isToday
                    ? "#eff6ff"
                    : count > 0
                    ? "#fef2f2"
                    : "#f8fafc",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3px",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: isSelected ? "#991b1b" : isToday ? "#1d4ed8" : "#64748b",
                  }}
                >
                  {day.dayName}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 800,
                    color: isSelected ? "#991b1b" : isToday ? "#1d4ed8" : "#0f172a",
                  }}
                >
                  {String(day.dayNum).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: isSelected
                      ? "#dc2626"
                      : count > 0
                      ? "#ef4444"
                      : "#e2e8f0",
                    color: count > 0 || isSelected ? "#ffffff" : "#64748b",
                  }}
                >
                  {count > 0 ? `${count} left` : "0"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Metric Row */}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Filters Box */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "16px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <strong style={{ fontSize: "14px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Filter size={15} />
            <span>Scope &amp; Search Filters</span>
          </strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              <span>Group Company</span>
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setUnitFilter("all");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="all">All Group Companies ({allLeftEmployees.length})</option>
                {data.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              <span>Employer Unit</span>
              <select
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#fff",
                }}
              >
                <option value="all">All Employer Units</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.clientName} · {u.unitName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: 700, color: "#475569" }}>
            <span>Search Employee</span>
            <input
              type="text"
              placeholder="Search by name, ID code, mobile, department, unit..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
              }}
            />
          </label>
        </div>

        {/* Quick Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#991b1b" }}>
              {selectedDate === "all_history"
                ? "Total Historical Exits"
                : selectedDate === "all"
                ? `Total Left in ${monthLabel}`
                : `Left on ${formatDisplayDate(selectedDate)}`}
            </span>
            <strong style={{ fontSize: "28px", fontWeight: 800, color: "#7f1d1d", margin: "6px 0" }}>
              {filteredEmployees.length}
            </strong>
            <small style={{ color: "#b91c1c", fontSize: "11px" }}>
              {selectedDate === todayStr ? "Today's exits" : "Filtered departures"}
            </small>
          </div>

          <div
            style={{
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#5b21b6" }}>
              Month Total &amp; Avg Days
            </span>
            <strong style={{ fontSize: "28px", fontWeight: 800, color: "#4c1d95", margin: "6px 0" }}>
              {averageWorkedDays} <span style={{ fontSize: "14px", fontWeight: 600 }}>days/emp</span>
            </strong>
            <small style={{ color: "#6d28d9", fontSize: "11px" }}>
              {totalMonthExits} exited in {monthLabel} ({todayExitsCount} today)
            </small>
          </div>
        </div>
      </div>

      {/* Main Table Register */}
      <div
        ref={printRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: "14px",
          padding: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <strong style={{ fontSize: "15px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ClipboardList size={16} />
              <span>Left Employees List &amp; Service Ledger</span>
            </strong>
            <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "8px" }}>
              Showing {filteredEmployees.length} record(s)
            </span>
          </div>

          {/* Quick Date Tag Indicator */}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "6px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            Showing:{" "}
            {selectedDate === "all_history"
              ? "Entire History"
              : selectedDate === "all"
              ? `Full Month (${monthLabel})`
              : formatDisplayDate(selectedDate)}
          </span>
        </div>

        {filteredEmployees.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontSize: "15px", margin: "0 0 6px" }}>No employee exits recorded for this selection.</p>
            <small>Try selecting a different date from the calendar strip or choosing &quot;All of {monthLabel}&quot;.</small>
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Employee</th>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Company &amp; Unit</th>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Joining &amp; Leaving</th>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Tenure</th>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Total Worked Days</th>
                  <th style={{ padding: "10px 12px", color: "#334155" }}>Month-wise Worked Ledger</th>
                  <th style={{ padding: "10px 12px", color: "#334155", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((item) => {
                  const emp = item.employee;
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                          {emp.name}
                        </strong>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          {emp.employeeCode} · {emp.department || "General"}
                        </span>
                        {emp.mobileNumber && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0284c7", fontSize: "11px", marginTop: 2 }}>
                            <Phone size={11} />
                            <span>{emp.mobileNumber}</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontWeight: 600, color: "#334155", display: "block" }}>
                          {item.companyName}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "11px" }}>
                          {item.clientName} · {item.unitName}
                        </span>
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ display: "block", color: "#15803d", fontWeight: 600 }}>
                          Joined: {formatDisplayDate(emp.dateOfJoining)}
                        </span>
                        <span style={{ display: "block", color: "#b91c1c", fontWeight: 700 }}>
                          Left: {formatDisplayDate(emp.dateOfLeaving) || "Left"}
                        </span>
                        {emp.finalPayrollMonth ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "3px",
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "#fef3c7",
                              color: "#92400e",
                              fontWeight: 700,
                            }}
                          >
                            Final pay: {emp.finalPayrollMonth}
                          </span>
                        ) : null}
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "#f1f5f9",
                            color: "#334155",
                            fontWeight: 700,
                            fontSize: "11px",
                          }}
                        >
                          {item.tenureText}
                        </span>
                      </td>

                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: item.totalWorkedDays > 0 ? "#0f766e" : "#94a3b8",
                          }}
                        >
                          {item.totalWorkedDays} days
                        </span>
                      </td>

                      <td style={{ padding: "10px 12px", maxWidth: "340px" }}>
                        {item.monthBreakdowns.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {item.monthBreakdowns.map((b) => (
                              <span
                                key={b.month}
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  color: "#334155",
                                }}
                              >
                                {b.month}: <strong>{b.days}d</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <small style={{ color: "#94a3b8" }}>No attendance recorded</small>
                        )}
                      </td>

                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {onEditEmployee && (
                            <button
                              type="button"
                              onClick={() => onEditEmployee(emp)}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                background: "#f1f5f9",
                                color: "#0f172a",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="Edit employee details"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                          )}
                          {onViewDocuments && (
                            <button
                              type="button"
                              onClick={() => onViewDocuments(emp)}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                              title="View & verify uploaded documents"
                            >
                              <FileText size={12} />
                              <span>Docs</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #f1f5f9",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Page {currentPage} of {totalPages} ({filteredEmployees.length} total)
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: currentPage === 1 ? "#f8fafc" : "#fff",
                  color: currentPage === 1 ? "#94a3b8" : "#0f172a",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: currentPage === totalPages ? "#f8fafc" : "#fff",
                  color: currentPage === totalPages ? "#94a3b8" : "#0f172a",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showDailyReportModal && (
        <DailyReportModal
          data={data}
          initialDate={selectedDate === "all" || selectedDate === "all_history" ? todayStr : selectedDate}
          onClose={() => setShowDailyReportModal(false)}
        />
      )}
    </div>
  );
}
