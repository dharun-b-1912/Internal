"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  X,
  UserPlus,
  UserMinus,
  Building2,
  Users,
  Filter,
  Send,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Settings,
  Share2,
} from "lucide-react";
import type { AppData } from "./payroll-app";
import {
  buildDailyWorkforcePdf,
  formatReportDate,
  formatReportFileName,
  type WorkforcePdfEmployee,
} from "../lib/daily-workforce-pdf";
import { formatDailyReportWhatsAppText } from "../lib/whatsapp";

function calculateTenure(joinedDateStr?: string | null, leftDateStr?: string | null): string {
  if (!joinedDateStr || !leftDateStr) return "-";
  const start = new Date(joinedDateStr);
  const end = new Date(leftDateStr);
  const diffTime = end.getTime() - start.getTime();
  if (isNaN(diffTime) || diffTime < 0) return "-";
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `${months}m ${remDays}d` : `${months} month${months === 1 ? "" : "s"}`;
}

export function DailyReportModal({
  data,
  initialDate,
  onClose,
}: {
  data: AppData;
  initialDate?: string;
  onClose: () => void;
}) {
  const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"summary" | "joined" | "left">("summary");
  const [isDownloading, setIsDownloading] = useState(false);

  // WhatsApp states
  const [waPhone, setWaPhone] = useState<string>("919944399088");
  const [waToken, setWaToken] = useState<string>("");
  const [waPhoneId, setWaPhoneId] = useState<string>("");
  const [showWaConfig, setShowWaConfig] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error" | "info" | null; message: string }>({
    type: null,
    message: "",
  });

  // Stepper functions
  const handlePrevDay = () => {
    const dt = new Date(`${selectedDate}T00:00:00`);
    dt.setDate(dt.getDate() - 1);
    setSelectedDate(dt.toLocaleDateString("en-CA"));
    setWaStatus({ type: null, message: "" });
  };

  const handleNextDay = () => {
    const dt = new Date(`${selectedDate}T00:00:00`);
    dt.setDate(dt.getDate() + 1);
    setSelectedDate(dt.toLocaleDateString("en-CA"));
    setWaStatus({ type: null, message: "" });
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
    setWaStatus({ type: null, message: "" });
  };

  // Friendly date display
  const formattedFullDate = useMemo(() => {
    try {
      const dt = new Date(`${selectedDate}T00:00:00`);
      return new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(dt);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Map units and vendors
  const unitMap = useMemo(() => {
    const map = new Map<string, { unitName: string; clientName: string }>();
    const vendorMap = new Map(data.vendors.map((v) => [v.id, v.name || v.legalName]));
    for (const u of data.units) {
      map.set(u.id, {
        unitName: u.unitName || "General Unit",
        clientName: u.clientName || vendorMap.get(u.vendorId) || "Direct Client",
      });
    }
    return map;
  }, [data.units, data.vendors]);

  // Compute all joinings and exits on date (unfiltered by company)
  const allJoinedOnDate = useMemo(() => {
    return data.employees.filter((e) => e.dateOfJoining === selectedDate);
  }, [data.employees, selectedDate]);

  const allLeftOnDate = useMemo(() => {
    return data.employees.filter(
      (e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving === selectedDate,
    );
  }, [data.employees, selectedDate]);

  // Distinct company/unit list available on this date
  const availableCompanyList = useMemo(() => {
    const set = new Set<string>();
    for (const emp of [...allJoinedOnDate, ...allLeftOnDate]) {
      const uInfo = unitMap.get(emp.clientUnitId);
      const cName = uInfo?.clientName || "Direct Client";
      const uName = uInfo?.unitName || "Main Plant";
      set.add(`${cName} · ${uName}`);
    }
    return Array.from(set).sort();
  }, [allJoinedOnDate, allLeftOnDate, unitMap]);

  // Filter joinings and exits by selectedCompany
  const joinedOnDate = useMemo(() => {
    if (selectedCompany === "all") return allJoinedOnDate;
    return allJoinedOnDate.filter((e) => {
      const uInfo = unitMap.get(e.clientUnitId);
      const cName = uInfo?.clientName || "Direct Client";
      const uName = uInfo?.unitName || "Main Plant";
      return cName === selectedCompany || `${cName} · ${uName}` === selectedCompany;
    });
  }, [allJoinedOnDate, selectedCompany, unitMap]);

  const leftOnDate = useMemo(() => {
    if (selectedCompany === "all") return allLeftOnDate;
    return allLeftOnDate.filter((e) => {
      const uInfo = unitMap.get(e.clientUnitId);
      const cName = uInfo?.clientName || "Direct Client";
      const uName = uInfo?.unitName || "Main Plant";
      return cName === selectedCompany || `${cName} · ${uName}` === selectedCompany;
    });
  }, [allLeftOnDate, selectedCompany, unitMap]);

  const netDelta = joinedOnDate.length - leftOnDate.length;

  // Group by CLIENT COMPANY & UNIT for Summary table
  const clientSummaries = useMemo(() => {
    type ClientGroup = {
      key: string;
      fullBadge: string;
      clientName: string;
      unitName: string;
      jCount: number;
      lCount: number;
      net: number;
    };

    const groupMap = new Map<string, ClientGroup>();

    const targetJoined = selectedCompany === "all" ? allJoinedOnDate : joinedOnDate;
    const targetLeft = selectedCompany === "all" ? allLeftOnDate : leftOnDate;

    for (const emp of [...targetJoined, ...targetLeft]) {
      const uInfo = unitMap.get(emp.clientUnitId);
      const clientName = uInfo?.clientName || "Direct Client";
      const unitName = uInfo?.unitName || "Main Plant";
      const key = `${clientName}:::${unitName}`;
      const fullBadge = `${clientName} · ${unitName}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          fullBadge,
          clientName,
          unitName,
          jCount: 0,
          lCount: 0,
          net: 0,
        });
      }
    }

    for (const emp of targetJoined) {
      const uInfo = unitMap.get(emp.clientUnitId);
      const clientName = uInfo?.clientName || "Direct Client";
      const unitName = uInfo?.unitName || "Main Plant";
      const key = `${clientName}:::${unitName}`;
      const grp = groupMap.get(key);
      if (grp) grp.jCount++;
    }

    for (const emp of targetLeft) {
      const uInfo = unitMap.get(emp.clientUnitId);
      const clientName = uInfo?.clientName || "Direct Client";
      const unitName = uInfo?.unitName || "Main Plant";
      const key = `${clientName}:::${unitName}`;
      const grp = groupMap.get(key);
      if (grp) grp.lCount++;
    }

    for (const grp of groupMap.values()) {
      grp.net = grp.jCount - grp.lCount;
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => b.jCount - a.jCount || b.lCount - a.lCount,
    );
  }, [selectedCompany, allJoinedOnDate, allLeftOnDate, joinedOnDate, leftOnDate, unitMap]);

  // Group joined employees by company/unit
  const joinedCompanyGroups = useMemo(() => {
    const groups = new Map<string, { fullBadge: string; clientName: string; unitName: string; list: WorkforcePdfEmployee[] }>();
    for (const emp of joinedOnDate) {
      const u = unitMap.get(emp.clientUnitId);
      const clientName = u?.clientName || "Direct Client";
      const unitName = u?.unitName || "Main Plant";
      const fullBadge = `${clientName} · ${unitName}`;
      const key = `${clientName}:::${unitName}`;
      if (!groups.has(key)) {
        groups.set(key, { fullBadge, clientName, unitName, list: [] });
      }
      groups.get(key)!.list.push(emp);
    }
    return Array.from(groups.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [joinedOnDate, unitMap]);

  // Group left employees by company/unit
  const leftCompanyGroups = useMemo(() => {
    const groups = new Map<string, { fullBadge: string; clientName: string; unitName: string; list: WorkforcePdfEmployee[] }>();
    for (const emp of leftOnDate) {
      const u = unitMap.get(emp.clientUnitId);
      const clientName = u?.clientName || "Direct Client";
      const unitName = u?.unitName || "Main Plant";
      const fullBadge = `${clientName} · ${unitName}`;
      const key = `${clientName}:::${unitName}`;
      if (!groups.has(key)) {
        groups.set(key, { fullBadge, clientName, unitName, list: [] });
      }
      groups.get(key)!.list.push(emp);
    }
    return Array.from(groups.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [leftOnDate, unitMap]);

  // Generate WhatsApp summary text for preview or web share
  const waSummaryText = useMemo(() => {
    return formatDailyReportWhatsAppText({
      dateFormatted: formatReportDate(selectedDate),
      totalJoined: joinedOnDate.length,
      totalLeft: leftOnDate.length,
      netDelta,
      companySummaries: clientSummaries,
    });
  }, [selectedDate, joinedOnDate.length, leftOnDate.length, netDelta, clientSummaries]);

  // PDF download handler
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const pdfBytes = await buildDailyWorkforcePdf({
        date: selectedDate,
        employees: data.employees,
        vendors: data.vendors,
        units: data.units,
        companyFilter: selectedCompany,
      });

      const fileName = formatReportFileName(selectedDate, selectedCompany);
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      window.alert("Unable to generate PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // WhatsApp Web fallback share
  const handleShareWhatsAppWeb = () => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waSummaryText)}`;
    window.open(waUrl, "_blank");
  };

  // Meta Cloud API Direct Send
  const handleSendMetaWhatsApp = async () => {
    if (!waPhone.trim()) {
      setWaStatus({ type: "error", message: "Please provide a valid recipient WhatsApp number." });
      return;
    }

    try {
      setWaSending(true);
      setWaStatus({ type: "info", message: "Generating PDF and uploading to Meta WhatsApp Cloud API..." });

      // Generate PDF in browser
      const pdfBytes = await buildDailyWorkforcePdf({
        date: selectedDate,
        employees: data.employees,
        vendors: data.vendors,
        units: data.units,
        companyFilter: selectedCompany,
      });

      // Convert to base64
      let binary = "";
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const pdfBase64 = window.btoa(binary);

      // Call API
      const res = await fetch("/api/daily-workforce-report/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          toPhone: waPhone,
          companyFilter: selectedCompany,
          pdfBase64,
          token: waToken || undefined,
          phoneId: waPhoneId || undefined,
          summaryData: {
            totalJoined: joinedOnDate.length,
            totalLeft: leftOnDate.length,
            netDelta,
            companySummaries: clientSummaries,
          },
        }),
      });

      const resData = await res.json();

      if (resData.success) {
        setWaStatus({
          type: "success",
          message: `Report successfully delivered to ${waPhone} via Meta WhatsApp! (Message ID: ${resData.messageId})`,
        });
      } else {
        setWaStatus({
          type: "error",
          message: resData.error || "Meta WhatsApp failed to deliver report.",
        });
      }
    } catch (err: any) {
      console.error("Meta WhatsApp dispatch error", err);
      setWaStatus({
        type: "error",
        message: err.message || "Failed to communicate with WhatsApp dispatch server.",
      });
    } finally {
      setWaSending(false);
    }
  };

  const isSelectedToday = selectedDate === todayStr;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f2e59 0%, #1e4a85 100%)",
            color: "#ffffff",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, letterSpacing: "-0.01em" }}>
                Daily Workforce Report (Client Company-Wise)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255, 255, 255, 0.8)" }}>
                Move forward/backward dates to review detailed joinings, exits, and send automated reports via WhatsApp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "8px",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#ffffff",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: "1 1 auto" }}>
          {/* Controls Bar: Date Navigator & Company Filter */}
          <div
            style={{
              background: "#f8fafc",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {/* Date buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handlePrevDay}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 11px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#1e293b",
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev Day</span>
              </button>

              <button
                type="button"
                onClick={handleToday}
                style={{
                  background: isSelectedToday ? "#0f2e59" : "#ffffff",
                  color: isSelectedToday ? "#ffffff" : "#1e293b",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 11px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#1e293b",
                }}
              >
                <span>Next Day</span>
                <ChevronRight size={14} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: 4 }}>
                <Calendar size={15} color="#0f2e59" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setWaStatus({ type: null, message: "" });
                    }
                  }}
                  style={{
                    border: "1.5px solid #0f2e59",
                    borderRadius: "8px",
                    padding: "5px 9px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f2e59",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            {/* Company Filter Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569", fontSize: "12px", fontWeight: 700 }}>
                <Filter size={14} />
                <span>Filter Company:</span>
              </div>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                style={{
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: selectedCompany === "all" ? "#1e293b" : "#0f2e59",
                  background: selectedCompany === "all" ? "#ffffff" : "#eff6ff",
                  cursor: "pointer",
                  maxWidth: "240px",
                }}
              >
                <option value="all">All Companies (Consolidated)</option>
                {availableCompanyList.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>

              {selectedCompany !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCompany("all")}
                  style={{
                    border: "none",
                    background: "#fee2e2",
                    color: "#991b1b",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Selected Date Header */}
          <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#64748b",
                }}
              >
                Report Date
              </span>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f2e59" }}>
                {formattedFullDate}
              </div>
            </div>

            {selectedCompany !== "all" && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1d4ed8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Building2 size={14} />
                <span>Filtered by: {selectedCompany}</span>
              </div>
            )}
          </div>

          {/* 3 KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            {/* Joined */}
            <div
              onClick={() => setActiveTab("joined")}
              style={{
                background: activeTab === "joined" ? "#dcfce7" : "#f0fdf4",
                border: activeTab === "joined" ? "2px solid #16a34a" : "1.5px solid #bbf7d0",
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to view joined employee details"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#166534", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
                <UserPlus size={13} />
                <span>Joined Today</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#166534", margin: "4px 0" }}>
                {joinedOnDate.length}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Click to view details ➔</div>
            </div>

            {/* Left */}
            <div
              onClick={() => setActiveTab("left")}
              style={{
                background: activeTab === "left" ? "#fee2e2" : "#fef2f2",
                border: activeTab === "left" ? "2px solid #dc2626" : "1.5px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to view left employee details"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#991b1b", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
                <UserMinus size={13} />
                <span>Left / Relieved</span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#991b1b", margin: "4px 0" }}>
                {leftOnDate.length}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Click to view details ➔</div>
            </div>

            {/* Net Delta */}
            <div
              onClick={() => setActiveTab("summary")}
              style={{
                background: activeTab === "summary" ? "#e0f2fe" : "#f8fafc",
                border: activeTab === "summary" ? "2px solid #0284c7" : "1.5px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Click to view company summary table"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#0f2e59", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
                <Users size={13} />
                <span>Net Headcount Delta</span>
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  color: netDelta >= 0 ? "#166534" : "#991b1b",
                  margin: "4px 0",
                }}
              >
                {netDelta > 0 ? `+${netDelta}` : netDelta}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>Click for company summary ➔</div>
            </div>
          </div>

          {/* WhatsApp Action & Delivery Card */}
          <div
            style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              border: "1.5px solid #86efac",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "18px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                  }}
                >
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                    Automated Meta WhatsApp Delivery
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#15803d" }}>
                    Send this PDF report &amp; executive summary directly via WhatsApp Cloud API
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Phone Input */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534" }}>To:</span>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="919944399088"
                    style={{
                      border: "1px solid #86efac",
                      borderRadius: "6px",
                      padding: "5px 8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#166534",
                      width: "125px",
                      background: "#ffffff",
                    }}
                  />
                </div>

                {/* Direct Meta Cloud API Send */}
                <button
                  type="button"
                  disabled={waSending}
                  onClick={handleSendMetaWhatsApp}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 13px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: waSending ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)",
                  }}
                  title="Uploads PDF and sends document message via Meta Cloud API"
                >
                  <Send size={13} />
                  <span>{waSending ? "Sending via Meta…" : "Send via Meta API"}</span>
                </button>

                {/* WhatsApp Web Fallback Share */}
                <button
                  type="button"
                  onClick={handleShareWhatsAppWeb}
                  style={{
                    background: "#ffffff",
                    color: "#166534",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    padding: "6px 11px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Opens WhatsApp Web or mobile app with pre-filled summary"
                >
                  <Share2 size={13} />
                  <span>WhatsApp Web</span>
                </button>

                {/* Toggle Settings */}
                <button
                  type="button"
                  onClick={() => setShowWaConfig(!showWaConfig)}
                  style={{
                    background: "transparent",
                    color: "#15803d",
                    border: "none",
                    padding: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Meta API Credentials Configuration"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>

            {/* Optional Meta API Credentials Override Box */}
            {showWaConfig && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px dashed #bbf7d0",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: 3 }}>
                    Meta Access Token (Overrides default):
                  </label>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="Leave blank to use server environment token"
                    style={{
                      width: "100%",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #86efac",
                      background: "#ffffff",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#166534", display: "block", marginBottom: 3 }}>
                    Phone Number ID (Default: 1320562981133693):
                  </label>
                  <input
                    type="text"
                    value={waPhoneId}
                    onChange={(e) => setWaPhoneId(e.target.value)}
                    placeholder="1320562981133693"
                    style={{
                      width: "100%",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #86efac",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Status Alert Banner */}
            {waStatus.type && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background:
                    waStatus.type === "success"
                      ? "#dcfce7"
                      : waStatus.type === "error"
                        ? "#fee2e2"
                        : "#e0f2fe",
                  color:
                    waStatus.type === "success"
                      ? "#166534"
                      : waStatus.type === "error"
                        ? "#991b1b"
                        : "#0369a1",
                  border: `1px solid ${
                    waStatus.type === "success"
                      ? "#86efac"
                      : waStatus.type === "error"
                        ? "#fca5a5"
                        : "#7dd3fc"
                  }`,
                }}
              >
                {waStatus.type === "success" && <CheckCircle2 size={16} />}
                {waStatus.type === "error" && <AlertCircle size={16} />}
                {waStatus.type === "info" && <MessageSquare size={16} />}
                <span>{waStatus.message}</span>
              </div>
            )}
          </div>

          {/* Interactive Tabs Header */}
          <div
            style={{
              display: "flex",
              borderBottom: "2px solid #e2e8f0",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              style={{
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "summary" ? "3px solid #0f2e59" : "3px solid transparent",
                color: activeTab === "summary" ? "#0f2e59" : "#64748b",
                fontWeight: activeTab === "summary" ? 800 : 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: "-2px",
              }}
            >
              <Building2 size={15} />
              <span>Client Company Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("joined")}
              style={{
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "joined" ? "3px solid #16a34a" : "3px solid transparent",
                color: activeTab === "joined" ? "#16a34a" : "#64748b",
                fontWeight: activeTab === "joined" ? 800 : 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: "-2px",
              }}
            >
              <UserPlus size={15} />
              <span>Joined Employees Details ({joinedOnDate.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("left")}
              style={{
                padding: "8px 14px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "left" ? "3px solid #dc2626" : "3px solid transparent",
                color: activeTab === "left" ? "#dc2626" : "#64748b",
                fontWeight: activeTab === "left" ? 800 : 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: "-2px",
              }}
            >
              <UserMinus size={15} />
              <span>Left Employees Details ({leftOnDate.length})</span>
            </button>
          </div>

          {/* TAB 1: Client Company Movement Summary */}
          {activeTab === "summary" && (
            <div>
              {clientSummaries.length === 0 ? (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  No employee joinings or exits recorded on {formatReportDate(selectedDate)}
                  {selectedCompany !== "all" ? ` for ${selectedCompany}` : ""}.
                </div>
              ) : (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#0f2e59" }}>
                        <th style={{ padding: "9px 12px", fontWeight: 800 }}>Client Company Name</th>
                        <th style={{ padding: "9px 12px", fontWeight: 800 }}>Employer Unit / Plant</th>
                        <th style={{ padding: "9px 12px", fontWeight: 800, textAlign: "center" }}>Joined</th>
                        <th style={{ padding: "9px 12px", fontWeight: 800, textAlign: "center" }}>Left</th>
                        <th style={{ padding: "9px 12px", fontWeight: 800, textAlign: "center" }}>Net Change</th>
                        <th style={{ padding: "9px 12px", fontWeight: 800, textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientSummaries.map((row, idx) => (
                        <tr
                          key={row.key}
                          style={{
                            background: idx % 2 === 1 ? "#f8fafc" : "#ffffff",
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <td style={{ padding: "9px 12px", fontWeight: 800, color: "#0f2e59" }}>
                            {row.clientName}
                          </td>
                          <td style={{ padding: "9px 12px", color: "#475569" }}>
                            {row.unitName}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 800, color: row.jCount > 0 ? "#166534" : "#64748b" }}>
                            {row.jCount}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 800, color: row.lCount > 0 ? "#991b1b" : "#64748b" }}>
                            {row.lCount}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 800, color: row.net > 0 ? "#166534" : row.net < 0 ? "#991b1b" : "#64748b" }}>
                            {row.net > 0 ? `+${row.net}` : row.net}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCompany(row.fullBadge);
                                setActiveTab("joined");
                              }}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#0f2e59",
                                cursor: "pointer",
                              }}
                            >
                              Filter Company
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#edf2fa", borderTop: "2px solid #cbd5e1", fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: "9px 12px", color: "#0f2e59" }}>
                          TOTAL {selectedCompany === "all" ? "ALL CLIENTS" : selectedCompany.toUpperCase()}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center", color: "#166534" }}>
                          {joinedOnDate.length}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center", color: "#991b1b" }}>
                          {leftOnDate.length}
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center", color: netDelta >= 0 ? "#166534" : "#991b1b" }}>
                          {netDelta > 0 ? `+${netDelta}` : netDelta}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Detailed Joined Register (GROUPED COMPANY BY COMPANY) */}
          {activeTab === "joined" && (
            <div>
              {joinedCompanyGroups.length === 0 ? (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  No new employees joined on {formatReportDate(selectedDate)}
                  {selectedCompany !== "all" ? ` for ${selectedCompany}` : ""}.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {joinedCompanyGroups.map((group) => (
                    <div
                      key={group.fullBadge}
                      style={{
                        border: "1.5px solid #bbf7d0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#ffffff",
                      }}
                    >
                      {/* Company Header Banner */}
                      <div
                        style={{
                          background: "#f0fdf4",
                          borderBottom: "1px solid #bbf7d0",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color="#166534" />
                          <span style={{ fontSize: "13px", fontWeight: 800, color: "#166534" }}>
                            {group.clientName} · {group.unitName}
                          </span>
                        </div>
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            border: "1px solid #86efac",
                          }}
                        >
                          {group.list.length} {group.list.length === 1 ? "Joinee" : "Joinees"}
                        </span>
                      </div>

                      {/* Employees for this company */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "600px" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                              <th style={{ padding: "8px 10px", fontWeight: 700, width: "35px" }}>#</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Emp Code</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Employee Name</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Department / Role</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Mobile</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Hostel / Accommodation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.list.map((emp, subIdx) => {
                              const hostelStr = emp.accommodationType === "day_scholar"
                                ? "Day Scholar"
                                : emp.roomNumber
                                  ? `Room ${emp.roomNumber}`
                                  : emp.accommodationType || "-";
                              return (
                                <tr
                                  key={emp.id}
                                  style={{
                                    background: subIdx % 2 === 1 ? "#fafaf9" : "#ffffff",
                                    borderTop: "1px solid #f1f5f9",
                                  }}
                                >
                                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{subIdx + 1}</td>
                                  <td style={{ padding: "8px 10px", fontWeight: 800, color: "#0f2e59" }}>{emp.employeeCode}</td>
                                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>{emp.name}</td>
                                  <td style={{ padding: "8px 10px", color: "#475569" }}>{emp.department || "-"}</td>
                                  <td style={{ padding: "8px 10px", color: "#64748b" }}>{emp.mobileNumber || "-"}</td>
                                  <td style={{ padding: "8px 10px", color: "#166534", fontWeight: 600 }}>{hostelStr}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Detailed Left Register (GROUPED COMPANY BY COMPANY) */}
          {activeTab === "left" && (
            <div>
              {leftCompanyGroups.length === 0 ? (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  No employees relieved or marked left on {formatReportDate(selectedDate)}
                  {selectedCompany !== "all" ? ` for ${selectedCompany}` : ""}.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {leftCompanyGroups.map((group) => (
                    <div
                      key={group.fullBadge}
                      style={{
                        border: "1.5px solid #fecaca",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#ffffff",
                      }}
                    >
                      {/* Company Header Banner */}
                      <div
                        style={{
                          background: "#fef2f2",
                          borderBottom: "1px solid #fecaca",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color="#991b1b" />
                          <span style={{ fontSize: "13px", fontWeight: 800, color: "#991b1b" }}>
                            {group.clientName} · {group.unitName}
                          </span>
                        </div>
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            border: "1px solid #fca5a5",
                          }}
                        >
                          {group.list.length} {group.list.length === 1 ? "Exit" : "Exits"}
                        </span>
                      </div>

                      {/* Employees for this company */}
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "600px" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                              <th style={{ padding: "8px 10px", fontWeight: 700, width: "35px" }}>#</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Emp Code</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Employee Name</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Joined Date</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Tenure Worked</th>
                              <th style={{ padding: "8px 10px", fontWeight: 700 }}>Exit Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.list.map((emp, subIdx) => {
                              const tenure = calculateTenure(emp.dateOfJoining, emp.dateOfLeaving);
                              return (
                                <tr
                                  key={emp.id}
                                  style={{
                                    background: subIdx % 2 === 1 ? "#fafaf9" : "#ffffff",
                                    borderTop: "1px solid #f1f5f9",
                                  }}
                                >
                                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{subIdx + 1}</td>
                                  <td style={{ padding: "8px 10px", fontWeight: 800, color: "#991b1b" }}>{emp.employeeCode}</td>
                                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#1e293b" }}>{emp.name}</td>
                                  <td style={{ padding: "8px 10px", color: "#475569" }}>{formatReportDate(emp.dateOfJoining)}</td>
                                  <td style={{ padding: "8px 10px", color: "#0f2e59", fontWeight: 700 }}>{tenure}</td>
                                  <td style={{ padding: "8px 10px", color: "#991b1b", fontWeight: 600 }}>{formatReportDate(emp.dateOfLeaving || selectedDate)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            File name: <strong>{formatReportFileName(selectedDate, selectedCompany)}</strong>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Close
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: isDownloading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.4)",
              }}
            >
              <Download size={15} />
              <span>
                {isDownloading
                  ? "Generating PDF…"
                  : selectedCompany === "all"
                    ? `Download Consolidated Report (${formatReportDate(selectedDate)})`
                    : `Download ${selectedCompany.split("·")[0].trim()} Report`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
