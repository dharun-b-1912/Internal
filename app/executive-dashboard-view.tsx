import React, { useState, useMemo } from "react";
import { BarChart3, Target, Users, TrendingUp, ArrowUpRight, ShieldCheck, Search, Edit2 } from "lucide-react";
import type { AppData, ClientUnit, Employee } from "./payroll-app";

interface ExecutiveDashboardProps {
  data: AppData;
  onNavigate: (section: string, filter?: { unitId?: string; date?: string; filterTab?: string }) => void;
  onSaveUnitScope: (unitId: string, scope: number) => Promise<void>;
  canManage: boolean;
}

export function ExecutiveDashboardView({
  data,
  onNavigate,
  onSaveUnitScope,
  canManage,
}: ExecutiveDashboardProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "opportunity" | "full" | "compliance">("all");
  const [editingUnit, setEditingUnit] = useState<ClientUnit | null>(null);
  const [newScopeValue, setNewScopeValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [quickSaveId, setQuickSaveId] = useState<string | null>(null);
  const [quickScopeVal, setQuickScopeVal] = useState<number>(0);

  // Current month string (YYYY-MM) and today's date
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-CA");
  }, []);

  // Compute unit level manpower and compliance statistics
  const unitSummaries = useMemo(() => {
    return data.units
      .filter((unit) => selectedVendorId === "all" || unit.vendorId === selectedVendorId)
      .map((unit) => {
        const unitEmployees = data.employees.filter((e) => e.clientUnitId === unit.id);
        
        // Live active employees on ground
        const live = unitEmployees.filter((e) => e.status === "active");
        
        // Month turnover
        const left = unitEmployees.filter(
          (e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving?.startsWith(currentMonth),
        );
        const joined = unitEmployees.filter(
          (e) => e.dateOfJoining && e.dateOfJoining.startsWith(currentMonth),
        );
        const joinedToday = unitEmployees.filter((e) => e.dateOfJoining === todayStr);

        // Document compliance calculation using applicationDocuments
        const activeIds = new Set(live.map((e) => e.id));
        const aadhaarPending = live.filter((employee) => {
          const docs = (data.applicationDocuments || []).filter(
            (d) => d.employeeId === employee.id && d.status !== "rejected",
          );
          const hasFront = docs.some((d) => d.category === "Aadhar Front side");
          const hasBack = docs.some((d) => d.category === "Aadhar Back side");
          return !hasFront || !hasBack;
        }).length;

        const passbookPending = live.filter((employee) => {
          const docs = (data.applicationDocuments || []).filter(
            (d) => d.employeeId === employee.id && d.status !== "rejected",
          );
          return !docs.some((d) => d.category === "Bank Proofs");
        }).length;

        const bankPending = live.filter(
          (e) => !e.bankAccountMasked || !e.ifscMasked,
        ).length;

        const scope = unit.employeeCount || 0;
        const liveCount = live.length;
        const opportunity = Math.max(0, scope - liveCount);
        const utilization = scope > 0 ? (liveCount / scope) * 100 : 0;
        const company = data.vendors.find((v) => v.id === unit.vendorId);

        return {
          unit,
          vendorId: unit.vendorId,
          companyCode: company?.code || "JCS",
          companyName: company?.name || "Joy Corporate",
          clientName: unit.clientName,
          unitName: unit.unitName,
          location: unit.location,
          overall: unitEmployees.length,
          liveCount,
          scope,
          opportunity,
          utilization,
          leftCount: left.length,
          joinedCount: joined.length,
          joinedTodayCount: joinedToday.length,
          aadhaarPending,
          passbookPending,
          bankPending,
          totalCompliancePending: aadhaarPending + passbookPending + bankPending,
        };
      });
  }, [data.units, data.employees, data.vendors, data.applicationDocuments, selectedVendorId, currentMonth, todayStr]);

  // Overall aggregate statistics
  const totals = useMemo(() => {
    const totalScope = unitSummaries.reduce((acc, u) => acc + u.scope, 0);
    const totalLive = unitSummaries.reduce((acc, u) => acc + u.liveCount, 0);
    const totalOpportunity = unitSummaries.reduce((acc, u) => acc + u.opportunity, 0);
    const totalJoined = unitSummaries.reduce((acc, u) => acc + u.joinedCount, 0);
    const totalLeft = unitSummaries.reduce((acc, u) => acc + u.leftCount, 0);
    const totalJoinedToday = unitSummaries.reduce((acc, u) => acc + u.joinedTodayCount, 0);
    const totalOverall = unitSummaries.reduce((acc, u) => acc + u.overall, 0);
    const totalAadhaar = unitSummaries.reduce((acc, u) => acc + u.aadhaarPending, 0);
    const totalPassbook = unitSummaries.reduce((acc, u) => acc + u.passbookPending, 0);
    const totalBankPending = unitSummaries.reduce((acc, u) => acc + u.bankPending, 0);
    const fillRate = totalScope > 0 ? ((totalLive / totalScope) * 100).toFixed(1) : "0.0";

    return {
      totalScope,
      totalLive,
      totalOpportunity,
      totalJoined,
      totalLeft,
      totalJoinedToday,
      totalOverall,
      totalAadhaar,
      totalPassbook,
      totalBankPending,
      fillRate,
      unitsWithOpportunity: unitSummaries.filter((u) => u.opportunity > 0).length,
      unitsAtCapacity: unitSummaries.filter((u) => u.scope > 0 && u.liveCount >= u.scope).length,
      unitsWithoutScope: unitSummaries.filter((u) => u.scope === 0).length,
    };
  }, [unitSummaries]);

  // Filtered summaries based on search and tabs
  const filteredSummaries = useMemo(() => {
    return unitSummaries.filter((u) => {
      const matchesSearch =
        u.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.companyCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === "opportunity") return u.opportunity > 0;
      if (filterTab === "full") return u.scope > 0 && u.liveCount >= u.scope;
      if (filterTab === "compliance") return u.totalCompliancePending > 0;

      return true;
    });
  }, [unitSummaries, searchQuery, filterTab]);

  const handleOpenScopeModal = (unit: ClientUnit) => {
    setEditingUnit(unit);
    setNewScopeValue(unit.employeeCount || 0);
  };

  const handleSaveScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setIsSaving(true);
    try {
      await onSaveUnitScope(editingUnit.id, Number(newScopeValue) || 0);
      setEditingUnit(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSave = async (unitId: string) => {
    setIsSaving(true);
    try {
      await onSaveUnitScope(unitId, Number(quickScopeVal) || 0);
      setQuickSaveId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Company Code",
      "Client Name",
      "Employer Unit",
      "Location",
      "Deployment Scope (Capacity)",
      "Live Deployed",
      "Opportunity Gap (Open Seats)",
      "Utilization %",
      "Overall Registered",
      "Joined (Month)",
      "Left (Month)",
      "Aadhaar Pending",
      "Passbook Pending",
      "Bank Details Pending",
    ];

    const rows = unitSummaries.map((u) => [
      u.companyCode,
      u.clientName,
      u.unitName,
      u.location,
      u.scope,
      u.liveCount,
      u.opportunity,
      `${u.utilization.toFixed(1)}%`,
      u.overall,
      u.joinedCount,
      u.leftCount,
      u.aadhaarPending,
      u.passbookPending,
      u.bankPending,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Deployment_Scope_Dashboard_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="section-stack executive-dashboard">
      {/* Top Banner Header */}
      <div
        className="executive-hero-banner"
        style={{
          background: "linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #0284c7 100%)",
          color: "#ffffff",
          padding: "24px 28px",
          borderRadius: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                background: "rgba(56, 189, 248, 0.25)",
                color: "#38bdf8",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "3px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(56, 189, 248, 0.4)",
              }}
            >
              Executive Manpower & Deployment Scope
            </span>
            <span style={{ fontSize: "12px", opacity: 0.85 }}>Period: {currentMonth}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Deployment Scope & Workforce Dashboard
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "13.5px", opacity: 0.9, maxWidth: "680px", lineHeight: "1.4" }}>
            Track live deployed employees vs authorized client scope (target capacity), identify open deployment opportunities, and set unit-wise headcount targets.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate("dashboard")}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              fontWeight: 700,
              fontSize: "13px",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BarChart3 size={15} />
            <span>Detailed Overview</span>
          </button>
        </div>
      </div>

      {/* Scope Briefing Key Metrics Grid */}
      <div
        className="executive-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Scope */}
        <article
          className="metric-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            borderLeft: "5px solid #0284c7",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <small style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Potential Scope
            </small>
            <Target size={18} style={{ color: "#0284c7" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <strong style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a" }}>
              {totals.totalScope}
            </strong>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Total authorized capacity</span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
            Across {unitSummaries.length} employer units {totals.unitsWithoutScope > 0 ? `(${totals.unitsWithoutScope} unset)` : ""}
          </p>
        </article>

        {/* Live Deployed */}
        <article
          className="metric-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            borderLeft: "5px solid #16a34a",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <small style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Live Deployed Workforce
            </small>
            <Users size={18} style={{ color: "#16a34a" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <strong style={{ fontSize: "28px", fontWeight: 800, color: "#16a34a" }}>
              {totals.totalLive}
            </strong>
            <span style={{ fontSize: "12.5px", color: "#15803d", fontWeight: 800, background: "#dcfce7", padding: "2px 8px", borderRadius: "10px" }}>
              {totals.fillRate}% Scope Filled
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
            Active on payroll registers
          </p>
        </article>

        {/* Additional Opportunity */}
        <article
          className="metric-card"
          style={{
            background: "#f0fdf4",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #bbf7d0",
            borderLeft: "5px solid #22c55e",
            boxShadow: "0 2px 8px rgba(34, 197, 94, 0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <small style={{ fontSize: "11px", fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Additional Opportunity (Gap)
            </small>
            <TrendingUp size={18} style={{ color: "#15803d" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px" }}>
            <strong style={{ fontSize: "28px", fontWeight: 800, color: "#15803d" }}>
              +{totals.totalOpportunity}
            </strong>
            <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700 }}>Open seats to deploy</span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#166534" }}>
            In {totals.unitsWithOpportunity} client units with open capacity
          </p>
        </article>

        {/* Month Influx / Movement */}
        <article
          className="metric-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            borderLeft: "5px solid #8b5cf6",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <small style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Monthly Influx & Movement
            </small>
            <ArrowUpRight size={18} style={{ color: "#8b5cf6" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "6px" }}>
            <span
              style={{ fontSize: "20px", fontWeight: 800, color: "#059669", cursor: "pointer" }}
              onClick={() => onNavigate("joined_employees")}
              title="View Joined Employees register"
            >
              +{totals.totalJoined} Joined
            </span>
            <span style={{ fontSize: "14px", color: "#cbd5e1" }}>|</span>
            <span
              style={{ fontSize: "20px", fontWeight: 800, color: "#e11d48", cursor: "pointer" }}
              onClick={() => onNavigate("left_employees")}
              title="View Left Employees register"
            >
              -{totals.totalLeft} Left
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
            Net Growth: <strong style={{ color: totals.totalJoined >= totals.totalLeft ? "#059669" : "#e11d48" }}>
              {totals.totalJoined - totals.totalLeft >= 0 ? `+${totals.totalJoined - totals.totalLeft}` : totals.totalJoined - totals.totalLeft}
            </strong> {totals.totalJoinedToday > 0 ? `· ${totals.totalJoinedToday} joined today` : ""}
          </p>
        </article>

        {/* Compliance / Document Verification */}
        <article
          className="metric-card"
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "18px 20px",
            border: "1px solid #e2e8f0",
            borderLeft: "5px solid #f59e0b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <small style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Compliance & Bank Proofs
            </small>
            <ShieldCheck size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: totals.totalAadhaar ? "#d97706" : "#16a34a" }}>
              {totals.totalAadhaar} Aadhaar
            </span>
            <span style={{ fontSize: "14px", color: "#cbd5e1" }}>·</span>
            <span style={{ fontSize: "15px", fontWeight: 800, color: totals.totalPassbook ? "#d97706" : "#16a34a" }}>
              {totals.totalPassbook} Bank Proof
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748b" }}>
            {totals.totalBankPending > 0 ? `${totals.totalBankPending} bank details pending` : "All bank accounts ready"}
          </p>
        </article>
      </div>

      {/* Main Manpower & Scope Table Section */}
      <section
        className="panel table-panel"
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Table Toolbar / Filters */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "#f8fafc",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Employer-Unit Deployment Matrix
            </span>
            <h2 style={{ margin: "2px 0 0", fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
              Deployment Scope vs Live Deployed Headcount
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Client Company Filter */}
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              style={{
                padding: "6px 12px",
                fontSize: "12.5px",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                outline: "none",
              }}
            >
              <option value="all">All Group Companies ({data.vendors.length})</option>
              {data.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))}
            </select>

            {/* Search Box */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search unit / client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "6px 12px 6px 30px",
                  fontSize: "12.5px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  width: "190px",
                  outline: "none",
                  background: "#ffffff",
                }}
              />
              <span style={{ position: "absolute", left: "9px", top: "7px", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                <Search size={14} />
              </span>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: "inline-flex",
                background: "#e2e8f0",
                padding: "3px",
                borderRadius: "8px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: filterTab === "all" ? "#ffffff" : "transparent",
                  color: filterTab === "all" ? "#0f172a" : "#64748b",
                  boxShadow: filterTab === "all" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                All ({unitSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("opportunity")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: filterTab === "opportunity" ? "#ffffff" : "transparent",
                  color: filterTab === "opportunity" ? "#16a34a" : "#64748b",
                  boxShadow: filterTab === "opportunity" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Open Scope ({totals.unitsWithOpportunity})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("full")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: filterTab === "full" ? "#ffffff" : "transparent",
                  color: filterTab === "full" ? "#0284c7" : "#64748b",
                  boxShadow: filterTab === "full" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Full Capacity ({totals.unitsAtCapacity})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("compliance")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: filterTab === "compliance" ? "#ffffff" : "transparent",
                  color: filterTab === "compliance" ? "#d97706" : "#64748b",
                  boxShadow: filterTab === "compliance" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Docs Pending
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "11.5px", color: "#64748b", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px" }}>Client / Employer Unit</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Live Deployed</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Deployment Scope</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Opportunity Gap</th>
                <th style={{ padding: "12px 16px", minWidth: "150px" }}>Capacity Progress</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Overall</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Joined (M)</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Left (M)</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Aadhaar</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>Bank Proof</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.map((entry) => {
                const isOverCapacity = entry.scope > 0 && entry.liveCount > entry.scope;
                const isAtCapacity = entry.scope > 0 && entry.liveCount === entry.scope;
                const hasOpportunity = entry.opportunity > 0;

                return (
                  <tr
                    key={entry.unit.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Client Unit info */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: entry.companyCode === "JMS" ? "#fef3c7" : "#e0e7ff",
                            color: entry.companyCode === "JMS" ? "#92400e" : "#3730a3",
                          }}
                        >
                          {entry.companyCode}
                        </span>
                        <div>
                          <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                            {entry.clientName}
                          </strong>
                          <small style={{ color: "#64748b", fontSize: "12px" }}>
                            {entry.unitName} · {entry.location}
                          </small>
                        </div>
                      </div>
                    </td>

                    {/* Live Count */}
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>
                      <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                        {entry.liveCount}
                      </strong>
                    </td>

                    {/* Scope Target (with inline quick edit) */}
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>
                      {quickSaveId === entry.unit.id ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="number"
                            min="0"
                            value={quickScopeVal}
                            onChange={(e) => setQuickScopeVal(Number(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleQuickSave(entry.unit.id);
                              if (e.key === "Escape") setQuickSaveId(null);
                            }}
                            style={{
                              width: "70px",
                              padding: "4px 6px",
                              fontSize: "13px",
                              fontWeight: 700,
                              borderRadius: "4px",
                              border: "1.5px solid #0284c7",
                              textAlign: "center",
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleQuickSave(entry.unit.id)}
                            style={{
                              border: "none",
                              background: "#0284c7",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                            title="Save Scope"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickSaveId(null)}
                            style={{
                              border: "none",
                              background: "#94a3b8",
                              color: "#fff",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: canManage ? "pointer" : "default",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: entry.scope ? "#f8fafc" : "#fef2f2",
                            border: entry.scope ? "1px solid #e2e8f0" : "1px dashed #fca5a5",
                          }}
                          onClick={() => {
                            if (canManage) {
                              setQuickSaveId(entry.unit.id);
                              setQuickScopeVal(entry.scope);
                            }
                          }}
                          title={canManage ? "Click to edit scope capacity" : ""}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 700,
                              color: entry.scope ? "#0f172a" : "#dc2626",
                            }}
                          >
                            {entry.scope || "Set Scope"}
                          </span>
                          {canManage && (
                            <Edit2 size={12} style={{ color: "#64748b" }} />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Opportunity Gap */}
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>
                      {hasOpportunity ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: "#dcfce7",
                            color: "#15803d",
                            fontWeight: 800,
                            fontSize: "12px",
                            border: "1px solid #bbf7d0",
                          }}
                        >
                          +{entry.opportunity} seats open
                        </span>
                      ) : isAtCapacity ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "#f1f5f9",
                            color: "#64748b",
                            fontWeight: 700,
                            fontSize: "11.5px",
                          }}
                        >
                          100% Full
                        </span>
                      ) : isOverCapacity ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            fontWeight: 700,
                            fontSize: "11.5px",
                          }}
                        >
                          +{entry.liveCount - entry.scope} over
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>No scope</span>
                      )}
                    </td>

                    {/* Capacity Progress Bar */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                          <span style={{ fontWeight: 700 }}>{entry.utilization.toFixed(0)}%</span>
                          <span>{entry.liveCount} / {entry.scope || "∞"}</span>
                        </div>
                        <div
                          style={{
                            height: "7px",
                            width: "100%",
                            background: "#e2e8f0",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, entry.utilization)}%`,
                              background:
                                entry.utilization > 100
                                  ? "#ef4444"
                                  : entry.utilization >= 85
                                  ? "#0284c7"
                                  : "#22c55e",
                              borderRadius: "4px",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Overall Registered */}
                    <td style={{ padding: "12px 10px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                      {entry.overall}
                    </td>

                    {/* Joined Month */}
                    <td style={{ padding: "12px 10px", textAlign: "center" }}>
                      <span style={{ color: entry.joinedCount ? "#16a34a" : "#94a3b8", fontWeight: entry.joinedCount ? 700 : 500 }}>
                        {entry.joinedCount ? `+${entry.joinedCount}` : "—"}
                      </span>
                    </td>

                    {/* Left Month */}
                    <td style={{ padding: "12px 10px", textAlign: "center" }}>
                      <span style={{ color: entry.leftCount ? "#e11d48" : "#94a3b8", fontWeight: entry.leftCount ? 700 : 500 }}>
                        {entry.leftCount ? `-${entry.leftCount}` : "—"}
                      </span>
                    </td>

                    {/* Aadhaar Pending */}
                    <td style={{ padding: "12px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          color: entry.aadhaarPending ? "#d97706" : "#94a3b8",
                          fontWeight: entry.aadhaarPending ? 700 : 500,
                          background: entry.aadhaarPending ? "#fef3c7" : "transparent",
                          padding: entry.aadhaarPending ? "2px 6px" : "0",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {entry.aadhaarPending || "—"}
                      </span>
                    </td>

                    {/* Passbook Pending */}
                    <td style={{ padding: "12px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          color: entry.passbookPending ? "#d97706" : "#94a3b8",
                          fontWeight: entry.passbookPending ? 700 : 500,
                          background: entry.passbookPending ? "#fef3c7" : "transparent",
                          padding: entry.passbookPending ? "2px 6px" : "0",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {entry.passbookPending || "—"}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {canManage && (
                          <button
                            type="button"
                            className="secondary-button"
                            style={{
                              padding: "4px 8px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              borderRadius: "6px",
                            }}
                            onClick={() => handleOpenScopeModal(entry.unit)}
                          >
                            Set Scope
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary-button"
                          style={{
                            padding: "4px 8px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            background: "#eff6ff",
                            borderColor: "#bfdbfe",
                            color: "#1e40af",
                          }}
                          onClick={() => onNavigate("employees", { unitId: entry.unit.id })}
                        >
                          View Employees
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filteredSummaries.length && (
          <div style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
              No employer units found matching your search and filter criteria.
            </p>
          </div>
        )}
      </section>

      {/* Scope Target Editor Modal */}
      {editingUnit && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUnit(null);
          }}
        >
          <div
            className="modal-card"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Deployment Scope (Target Capacity)
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                  {editingUnit.clientName}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                  Unit: {editingUnit.unitName} · {editingUnit.location}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScope}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Authorized Deployment Scope (Number of employees we can deploy) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={newScopeValue}
                  onChange={(e) => setNewScopeValue(Number(e.target.value) || 0)}
                  placeholder="e.g. 150"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "16px",
                    fontWeight: 800,
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />
                
                {/* Quick Add Helper Buttons */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const liveCount = data.employees.filter(
                        (e) => e.clientUnitId === editingUnit.id && e.status === "active",
                      ).length;
                      setNewScopeValue(liveCount);
                    }}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    Match Current Live ({data.employees.filter((e) => e.clientUnitId === editingUnit.id && e.status === "active").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewScopeValue((prev) => prev + 10)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    +10 Seats
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewScopeValue((prev) => prev + 25)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    +25 Seats
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewScopeValue((prev) => prev + 50)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    +50 Seats
                  </button>
                </div>

                <small style={{ display: "block", marginTop: "8px", color: "#64748b", fontSize: "11.5px" }}>
                  This specifies the maximum authorized manpower deployment capacity for this unit.
                </small>
              </div>

              {/* Live Preview Info */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Currently Live Employees:</span>
                  <strong style={{ color: "#0f172a" }}>
                    {data.employees.filter((e) => e.clientUnitId === editingUnit.id && e.status === "active").length}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Resulting Opportunity Gap:</span>
                  <strong style={{ color: newScopeValue > data.employees.filter((e) => e.clientUnitId === editingUnit.id && e.status === "active").length ? "#15803d" : "#64748b" }}>
                    {newScopeValue > data.employees.filter((e) => e.clientUnitId === editingUnit.id && e.status === "active").length
                      ? `+${newScopeValue - data.employees.filter((e) => e.clientUnitId === editingUnit.id && e.status === "active").length} seats available`
                      : "0 (At / Over capacity)"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingUnit(null)}
                  disabled={isSaving}
                  style={{ padding: "8px 16px", borderRadius: "8px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                  }}
                >
                  {isSaving ? "Saving Scope..." : "Save Scope Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
