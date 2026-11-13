"use client";

import { useMemo, useState } from "react";
import { Building2, Award, Users, Search, BarChart3, Plus, ArrowUpRight, Check, AlertTriangle } from "lucide-react";
import type { AppData, Employee, Vendor } from "./payroll-app";
import { formatDisplayDate } from "../lib/date-format";

type TimeHorizon = "all" | "this_month" | "this_quarter" | "this_year";

type StaffMember = {
  id: string;
  source: "user" | "employee";
  employeeCode: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  role: string;
  vendorId: string;
  vendorName: string;
  status: string;
  dateOfJoining: string | null;
  referredCandidates: Employee[];
  referredCount: number;
  joinedCount: number;
  activeCount: number;
  estimatedIncentive: number;
};

export function InternalStaffLeaderboardView({
  data,
  onAction,
  onNavigateToReferrals,
}: {
  data: AppData;
  onAction?: (action: string, summary: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
  onNavigateToReferrals?: (query?: string) => void;
}) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeHorizon>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedStaffForModal, setSelectedStaffForModal] = useState<StaffMember | null>(null);
  const [newStaff, setNewStaff] = useState<{
    name: string;
    employeeCode: string;
    department: string;
    vendorId: string;
    mobile: string;
    email: string;
    dateOfJoining: string;
  }>({
    name: "",
    employeeCode: `DIR-${Date.now().toString().slice(-4)}`,
    department: "Talent Acquisition",
    vendorId: data.vendors[0]?.id || "",
    mobile: "",
    email: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");


  // Map candidate applications to find referrals
  const candidateReferralMap = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of data.employees || []) {
      let refId = "";
      let refCode = "";
      let refName = "";
      try {
        const app = JSON.parse(emp.applicationJson || "{}");
        refId = app["Reference 1 - Employee ID"] || "";
        refCode = app["Reference 1 - Employee Code"] || "";
        refName = app["Reference 1 - Name"] || "";
      } catch {}

      const keys = [refId, refCode, refName.toLowerCase().trim()].filter(Boolean);
      for (const k of keys) {
        const list = map.get(k) || [];
        list.push(emp);
        map.set(k, list);
      }
    }
    return map;
  }, [data.employees]);

  // Aggregate internal staff from system users and direct employees
  // Strictly derive internal staff solely from data.appUsers (Users & Access)
  const staffList = useMemo<StaffMember[]>(() => {
    const list: StaffMember[] = [];
    const seenEmails = new Set<string>();

    for (const user of data.appUsers || []) {
      // Exclude external vendor/supplier accounts from internal staff directory
      const isVendor =
        user.role === "vendor" ||
        Boolean(user.department?.toLowerCase().startsWith("vendor")) ||
        Boolean(user.department?.toLowerCase().includes("vendor:"));
      if (isVendor) continue;

      if (seenEmails.has(user.email.toLowerCase())) continue;
      seenEmails.add(user.email.toLowerCase());

      const code = user.employeeCode || `USR-${user.id.slice(0, 5).toUpperCase()}`;

      // Determine vendor/company scope
      const primaryVendorId = user.clientScope?.[0] || "all";
      const vendorObj = (data.vendors || []).find((v) => v.id === primaryVendorId);

      // Candidate matches
      const refsById = candidateReferralMap.get(user.id) || [];
      const refsByCode = candidateReferralMap.get(code) || [];
      const refsByName = user.fullName
        ? candidateReferralMap.get(user.fullName.toLowerCase().trim()) || []
        : [];
      
      const allRefs = Array.from(new Set([...refsById, ...refsByCode, ...refsByName]));
      const joined = allRefs.filter((e) => e.status === "active" || e.status === "left").length;
      const active = allRefs.filter((e) => e.status === "active").length;

      list.push({
        id: user.id,
        source: "user",
        employeeCode: code,
        name: user.fullName || user.email.split("@")[0],
        email: user.email,
        mobile: user.mobileNumber || "—",
        department: user.department || "Operations & HR",
        role: user.role === "super_admin" ? "Super Admin" : user.role === "hr_team" ? "HR Manager" : "Field HR",
        vendorId: primaryVendorId,
        vendorName: user.role === "super_admin" || !user.clientScope?.length ? "All Companies Scope" : (vendorObj?.name || "Assigned Company"),
        status: user.status,
        dateOfJoining: user.dateOfJoining || user.createdAt.slice(0, 10),
        referredCandidates: allRefs,
        referredCount: allRefs.length,
        joinedCount: joined,
        activeCount: active,
        estimatedIncentive: joined * 500, // standard ₹500 referral incentive
      });
    }

    return list;
  }, [data.appUsers, data.vendors, candidateReferralMap]);

  // Filter staff by company and search query
  const filteredStaff = useMemo(() => {
    return staffList
      .filter((staff) => {
        if (selectedVendorId !== "all") {
          // If the user has access to all companies (e.g. Super Admin), or is assigned to this vendor
          const userObj = data.appUsers.find((u) => u.id === staff.id);
          const isSuperAdminOrAll = userObj?.role === "super_admin" || !userObj?.clientScope?.length;
          const isAssigned = userObj?.clientScope?.includes(selectedVendorId);
          if (!isSuperAdminOrAll && !isAssigned) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            staff.name.toLowerCase().includes(q) ||
            staff.employeeCode.toLowerCase().includes(q) ||
            staff.department.toLowerCase().includes(q) ||
            staff.email.toLowerCase().includes(q) ||
            staff.mobile.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.joinedCount - a.joinedCount || b.referredCount - a.referredCount || a.name.localeCompare(b.name));
  }, [staffList, selectedVendorId, searchQuery, data.appUsers]);

  // Top 3 Podium
  const top1 = filteredStaff[0];
  const top2 = filteredStaff[1];
  const top3 = filteredStaff[2];

  const totalReferrals = filteredStaff.reduce((sum, s) => sum + s.referredCount, 0);
  const totalJoined = filteredStaff.reduce((sum, s) => sum + s.joinedCount, 0);
  const activeReferrers = filteredStaff.filter((s) => s.referredCount > 0).length;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    setSaving(true);
    try {
      if (onAction) {
        await onAction("save-app-user", `Created internal staff user: ${newStaff.name}`, {
          email: newStaff.email.trim(),
          temporaryPassword: "Password@123",
          fullName: newStaff.name.trim(),
          employeeCode: newStaff.employeeCode.trim(),
          department: newStaff.department.trim(),
          dateOfJoining: newStaff.dateOfJoining,
          mobileNumber: newStaff.mobile.trim(),
          role: "hr_team",
          clientScope: newStaff.vendorId && newStaff.vendorId !== "all" ? [newStaff.vendorId] : [],
          unitScope: [],
          hostelScope: [],
          canApprovePayroll: false,
        });
      }
      setToastMsg(`✓ Direct staff ${newStaff.name} added to Users & Access successfully.`);
      setShowAddModal(false);
      setNewStaff({
        name: "",
        employeeCode: `DIR-${Date.now().toString().slice(-4)}`,
        department: "Talent Acquisition",
        vendorId: data.vendors[0]?.id || "",
        mobile: "",
        email: "",
        dateOfJoining: new Date().toISOString().slice(0, 10),
      });
      setTimeout(() => setToastMsg(""), 4000);
    } catch {
      setToastMsg("Unable to add staff member. Please check details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-stack" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {toastMsg && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", fontWeight: 600 }}>
          {toastMsg}
        </div>
      )}

      {/* Top Filter Bar */}
      <section className="panel" style={{ padding: "1.25rem 1.5rem", borderRadius: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Super Admin Management
            </span>
            <h2 style={{ margin: "2px 0 0", fontSize: "1.4rem", color: "#0f172a", fontWeight: 800 }}>
              Internal Direct Staff &amp; Referral Leaderboard
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
              Manage corporate direct staff and monitor talent sourcing performance across Joy entities.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowAddModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} /> Add Internal Staff
            </button>
          </div>
        </div>

        {/* Company & Period Filter Chips */}
        <div style={{ marginTop: "1.25rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Company Filter:</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSelectedVendorId("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: selectedVendorId === "all" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: selectedVendorId === "all" ? "#eff6ff" : "#fff",
                  color: selectedVendorId === "all" ? "#1e40af" : "#475569",
                  fontWeight: selectedVendorId === "all" ? 700 : 500,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Building2 size={14} /> All Companies ({staffList.length})
              </button>
              {data.vendors.map((vendor) => {
                const count = staffList.filter((s) => s.vendorId === vendor.id || s.vendorName === "All Companies Scope").length;
                const isSelected = selectedVendorId === vendor.id;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(vendor.id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: isSelected ? "#eff6ff" : "#fff",
                      color: isSelected ? "#1e40af" : "#475569",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Building2 size={13} style={{ opacity: 0.75 }} />
                    {vendor.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
            <input
              type="text"
              placeholder="Search staff by name, code or role…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                minWidth: "240px",
              }}
            />
          </div>
        </div>
      </section>

      {/* KPI Stats Bar */}
      <section className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Internal Staff</span>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>{filteredStaff.length}</div>
          <small style={{ color: "#10b981", fontWeight: 600 }}>Active corporate workforce</small>
        </div>
        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Recruiters</span>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#2563eb", margin: "4px 0" }}>{activeReferrers}</div>
          <small style={{ color: "#64748b" }}>Staff with active candidate referrals</small>
        </div>
        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Candidates Sourced</span>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7c3aed", margin: "4px 0" }}>{totalReferrals}</div>
          <small style={{ color: "#059669", fontWeight: 600 }}>{totalJoined} onboarded &amp; joined</small>
        </div>
        <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Top Sourcing Leader</span>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#b45309", margin: "6px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "6px" }}>
            {top1 ? (
              <>
                <Award size={20} style={{ color: "#d97706", flexShrink: 0 }} />
                <span>{top1.name}</span>
              </>
            ) : "—"}
          </div>
          <small style={{ color: "#b45309", fontWeight: 600 }}>{top1 ? `${top1.joinedCount} Joined (${top1.referredCount} Sourced)` : "No referrals yet"}</small>
        </div>
      </section>

      {/* Podium Cards for Top 3 */}
      {filteredStaff.length > 0 && (
        <section className="panel" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e3a8a", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={18} style={{ color: "#2563eb" }} /> Top Referral Performers (Leaderboard Podium)
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Click on any card or candidate count to view sourced people
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {/* Rank 1 - Gold */}
            {top1 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStaffForModal(top1)}
                style={{
                  background: "linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)",
                  border: "2px solid #f59e0b",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Award size={28} style={{ position: "absolute", top: 12, right: 12, color: "#d97706" }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#92400e", background: "#fde68a", padding: "3px 8px", borderRadius: "6px" }}>
                  RANK 1 · GOLD CHAMPION
                </span>
                <h4 style={{ margin: "10px 0 2px", fontSize: "1.15rem", color: "#78350f", fontWeight: 800 }}>{top1.name}</h4>
                <div style={{ fontSize: "12px", color: "#92400e" }}>{top1.employeeCode} · {top1.department}</div>
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255,255,255,0.75)", padding: "10px", borderRadius: "8px" }}>
                  <div>
                    <small style={{ display: "block", color: "#78350f", fontSize: "11px", fontWeight: 600 }}>Candidates Joined</small>
                    <strong style={{ fontSize: "18px", color: "#92400e" }}>{top1.joinedCount}</strong>
                  </div>
                  <div>
                    <small style={{ display: "block", color: "#78350f", fontSize: "11px", fontWeight: 600 }}>Total Sourced</small>
                    <strong style={{ fontSize: "18px", color: "#92400e", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {top1.referredCount} <Search size={14} style={{ color: "#b45309" }} />
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 2 - Silver */}
            {top2 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStaffForModal(top2)}
                style={{
                  background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                  border: "2px solid #94a3b8",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Award size={28} style={{ position: "absolute", top: 12, right: 12, color: "#64748b" }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#334155", background: "#cbd5e1", padding: "3px 8px", borderRadius: "6px" }}>
                  RANK 2 · SILVER
                </span>
                <h4 style={{ margin: "10px 0 2px", fontSize: "1.15rem", color: "#0f172a", fontWeight: 800 }}>{top2.name}</h4>
                <div style={{ fontSize: "12px", color: "#475569" }}>{top2.employeeCode} · {top2.department}</div>
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255,255,255,0.75)", padding: "10px", borderRadius: "8px" }}>
                  <div>
                    <small style={{ display: "block", color: "#334155", fontSize: "11px", fontWeight: 600 }}>Candidates Joined</small>
                    <strong style={{ fontSize: "18px", color: "#1e293b" }}>{top2.joinedCount}</strong>
                  </div>
                  <div>
                    <small style={{ display: "block", color: "#334155", fontSize: "11px", fontWeight: 600 }}>Total Sourced</small>
                    <strong style={{ fontSize: "18px", color: "#1e293b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {top2.referredCount} <Search size={14} style={{ color: "#64748b" }} />
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStaffForModal(top3)}
                style={{
                  background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
                  border: "2px solid #f97316",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  position: "relative",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <Award size={28} style={{ position: "absolute", top: 12, right: 12, color: "#ea580c" }} />
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#9a3412", background: "#fdba74", padding: "3px 8px", borderRadius: "6px" }}>
                  RANK 3 · BRONZE
                </span>
                <h4 style={{ margin: "10px 0 2px", fontSize: "1.15rem", color: "#7c2d12", fontWeight: 800 }}>{top3.name}</h4>
                <div style={{ fontSize: "12px", color: "#9a3412" }}>{top3.employeeCode} · {top3.department}</div>
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(255,255,255,0.75)", padding: "10px", borderRadius: "8px" }}>
                  <div>
                    <small style={{ display: "block", color: "#7c2d12", fontSize: "11px", fontWeight: 600 }}>Candidates Joined</small>
                    <strong style={{ fontSize: "18px", color: "#9a3412" }}>{top3.joinedCount}</strong>
                  </div>
                  <div>
                    <small style={{ display: "block", color: "#7c2d12", fontSize: "11px", fontWeight: 600 }}>Total Sourced</small>
                    <strong style={{ fontSize: "18px", color: "#9a3412", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {top3.referredCount} <Search size={14} style={{ color: "#ea580c" }} />
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Staff Directory & Full Leaderboard Table */}
      <section className="panel" style={{ padding: "1.5rem", borderRadius: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={18} style={{ color: "#2563eb" }} /> Internal Staff Directory &amp; Performance Records
          </h3>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            Showing <strong>{filteredStaff.length}</strong> staff members · Click any count to view candidate details
          </span>
        </div>

        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Rank</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Employee Code</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Staff Name</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Role / Department</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Company Scope</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Mobile / Contact</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0", textAlign: "center" }}>Candidates Sourced</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0", textAlign: "center" }}>Joined &amp; Active</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                <th style={{ padding: "10px 12px", borderBottom: "2px solid #e2e8f0", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff, index) => {
                const rankBadge =
                  index === 0 ? "Rank #1" : index === 1 ? "Rank #2" : index === 2 ? "Rank #3" : `#${index + 1}`;
                return (
                  <tr key={staff.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: index < 3 ? "#b45309" : "#64748b" }}>
                      {rankBadge}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e3a8a" }}>
                      {staff.employeeCode}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <strong style={{ color: "#0f172a", display: "block" }}>{staff.name}</strong>
                      <small style={{ color: "#64748b" }}>{staff.email}</small>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontWeight: 600, color: "#334155" }}>{staff.department}</span>
                      <small style={{ display: "block", color: "#64748b" }}>{staff.role}</small>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "2px 8px", background: "#f1f5f9", borderRadius: "4px", fontSize: "12px", color: "#475569" }}>
                        {staff.vendorName}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>
                      {staff.mobile}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForModal(staff)}
                        style={{
                          background: staff.referredCount ? "#eff6ff" : "#f1f5f9",
                          color: staff.referredCount ? "#1e40af" : "#94a3b8",
                          border: staff.referredCount ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Click to view candidate list"
                      >
                        {staff.referredCount} {staff.referredCount === 1 ? "candidate" : "candidates"} <ArrowUpRight size={13} />
                      </button>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: staff.joinedCount ? "#059669" : "#94a3b8" }}>
                        {staff.joinedCount} Joined
                      </span>
                      {staff.activeCount > 0 && (
                        <small style={{ display: "block", color: "#64748b" }}>({staff.activeCount} active)</small>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: staff.status === "active" ? "#d1fae5" : "#fee2e2",
                          color: staff.status === "active" ? "#065f46" : "#991b1b",
                        }}
                      >
                        {staff.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffForModal(staff)}
                        className="secondary-button"
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Search size={12} /> View ({staff.referredCount})
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredStaff.length && (
                <tr>
                  <td colSpan={10} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                    No internal staff found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Candidate Drilldown Modal */}
      {selectedStaffForModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={22} style={{ color: "#2563eb" }} />
                  <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 800 }}>
                    Candidates Sourced by {selectedStaffForModal.name}
                  </h3>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Staff Code: <strong>{selectedStaffForModal.employeeCode}</strong> · {selectedStaffForModal.department} · {selectedStaffForModal.vendorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffForModal(null)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Quick summary strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <small style={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>Total Sourced</small>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e293b" }}>{selectedStaffForModal.referredCount} candidates</div>
              </div>
              <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <small style={{ color: "#166534", fontSize: "11px", fontWeight: 600 }}>Joined Workforce</small>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#14532d" }}>{selectedStaffForModal.joinedCount} joined</div>
              </div>
              <div style={{ background: "#eff6ff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <small style={{ color: "#1e40af", fontSize: "11px", fontWeight: 600 }}>Currently Active</small>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#1e3a8a" }}>{selectedStaffForModal.activeCount} active</div>
              </div>
            </div>

            {/* Candidates Table */}
            {selectedStaffForModal.referredCandidates.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  No candidate application forms currently reference this staff member in Reference 1.
                </p>
              </div>
            ) : (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto", marginBottom: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Candidate Name</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Employee Code</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Placement (Client &amp; Unit)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Date of Joining</th>
                      <th style={{ padding: "10px 12px", fontWeight: 700, color: "#334155" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffForModal.referredCandidates.map((candidate) => {
                      const unitObj = data.units.find((u) => u.id === candidate.clientUnitId);
                      const vendorObj = data.vendors.find((v) => v.id === candidate.vendorId);
                      return (
                        <tr key={candidate.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <strong style={{ color: "#0f172a" }}>{candidate.name}</strong>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#1e3a8a", fontWeight: 600 }}>
                              {candidate.employeeCode}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <strong style={{ color: "#334155", display: "block" }}>
                              {unitObj ? `${unitObj.clientName} - ${unitObj.unitName}` : "Unassigned Unit"}
                            </strong>
                            <small style={{ color: "#64748b" }}>{vendorObj?.name || "Group Company"}</small>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>
                            {formatDisplayDate(candidate.dateOfJoining)}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: candidate.status === "active" ? "#d1fae5" : "#fee2e2",
                                color: candidate.status === "active" ? "#065f46" : "#991b1b",
                              }}
                            >
                              {candidate.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "16px" }}>
              {onNavigateToReferrals ? (
                <button
                  type="button"
                  onClick={() => {
                    const staffName = selectedStaffForModal.name;
                    setSelectedStaffForModal(null);
                    onNavigateToReferrals(staffName);
                  }}
                  className="primary-button"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                >
                  <BarChart3 size={15} /> Open in Referrals Register &amp; Payouts
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedStaffForModal(null)}
                className="secondary-button"
                style={{ padding: "8px 16px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Quick Add Staff Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} style={{ color: "#2563eb" }} /> Add Internal Direct Staff
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "block" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Staff Full Name *
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Employee Code *
                  </span>
                  <input
                    type="text"
                    required
                    value={newStaff.employeeCode}
                    onChange={(e) => setNewStaff({ ...newStaff, employeeCode: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                  />
                </label>

                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Department / Role *
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Talent Acquisition"
                    value={newStaff.department}
                    onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                  />
                </label>
              </div>

              <label style={{ display: "block" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Assign to Company Entity *
                </span>
                <select
                  value={newStaff.vendorId}
                  onChange={(e) => setNewStaff({ ...newStaff, vendorId: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff" }}
                >
                  {data.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Mobile Number
                  </span>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={newStaff.mobile}
                    onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                  />
                </label>

                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Date of Joining
                  </span>
                  <input
                    type="date"
                    value={newStaff.dateOfJoining}
                    onChange={(e) => setNewStaff({ ...newStaff, dateOfJoining: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                  />
                </label>
              </div>

              <label style={{ display: "block" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Email Address
                </span>
                <input
                  type="email"
                  placeholder="staff@joycorporatesolutions.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </label>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="primary-button"
                  style={{ padding: "8px 20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {saving ? "Saving Staff Member…" : (
                    <>
                      <Check size={16} /> Add Direct Staff
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
