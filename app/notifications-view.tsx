import React, { useState, useRef, useEffect } from "react";
import { Icon, type AppData, type Employee, type Vendor, type ClientUnit } from "./payroll-app";
import type { ApplicationDocument } from "../lib/employee-application";

export function NotificationsView({
  data,
  initialTab = "rejected",
  onOpenEmployeeApplication,
  onEditEmployee,
  onGoToPayroll,
  onReuploadDocument,
}: {
  data: AppData;
  initialTab?: string;
  onOpenEmployeeApplication?: (employee: Employee) => void;
  onEditEmployee?: (employee: Employee) => void;
  onGoToPayroll?: () => void;
  onReuploadDocument?: (
    employeeId: string,
    category: string,
    filename: string,
    dataUrl: string
  ) => Promise<ApplicationDocument[] | void>;
}) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ employeeId: string; category: string; empName: string } | null>(null);

  const empMap = new Map<string, Employee>();
  data.employees.forEach((e) => empMap.set(e.id, e));

  const unitMap = new Map<string, ClientUnit>();
  data.units.forEach((u) => unitMap.set(u.id, u));

  const vendorMap = new Map<string, Vendor>();
  data.vendors.forEach((v) => vendorMap.set(v.id, v));

  // 1. Rejected Documents List
  const rejectedDocs: Array<{
    id: string;
    employeeId: string;
    empId: string;
    empName: string;
    category: string;
    rejectionReason: string;
    reviewedBy: string;
    reviewedAt: string;
    clientName: string;
    unitName: string;
  }> = [];

  (data.applicationDocuments || []).forEach((doc) => {
    if (doc.status === "rejected") {
      const emp = empMap.get(doc.employeeId);
      const unit = emp?.clientUnitId ? unitMap.get(emp.clientUnitId) : null;
      const vendor = emp?.vendorId ? vendorMap.get(emp.vendorId) : null;

      rejectedDocs.push({
        id: `${doc.employeeId}-${doc.category}`,
        employeeId: doc.employeeId,
        empId: emp?.employeeCode || "N/A",
        empName: emp?.name || "Unknown Employee",
        category: doc.category,
        rejectionReason: doc.rejectionReason || "Please re-upload a clear copy",
        reviewedBy: doc.reviewedBy || "Super Admin",
        reviewedAt: doc.reviewedAt || "",
        clientName: vendor?.name || unit?.clientName || "Group Company",
        unitName: unit?.unitName || "Operating Unit",
      });
    }
  });

  // 2. Pending Documents List (Strictly unverified/pending)
  const pendingDocs: Array<{
    id: string;
    employeeId: string;
    empId: string;
    empName: string;
    category: string;
    clientName: string;
    unitName: string;
  }> = [];

  // 3. Approved Documents List (Strictly manually approved with approver name)
  const approvedDocs: Array<{
    id: string;
    employeeId: string;
    empId: string;
    empName: string;
    category: string;
    reviewedBy: string;
    reviewedAt: string;
    clientName: string;
    unitName: string;
  }> = [];

  (data.applicationDocuments || []).forEach((doc) => {
    if (doc.status === "rejected") return;

    const emp = empMap.get(doc.employeeId);
    const unit = emp?.clientUnitId ? unitMap.get(emp.clientUnitId) : null;
    const vendor = emp?.vendorId ? vendorMap.get(emp.vendorId) : null;

    // Only show documents that were manually approved by an admin/super admin with recorded approver name
    if (doc.status === "approved" && doc.reviewedBy && doc.reviewedBy.trim() !== "") {
      approvedDocs.push({
        id: `${doc.employeeId}-${doc.category}`,
        employeeId: doc.employeeId,
        empId: emp?.employeeCode || "N/A",
        empName: emp?.name || "Unknown Employee",
        category: doc.category,
        reviewedBy: doc.reviewedBy,
        reviewedAt: doc.reviewedAt || "",
        clientName: vendor?.name || unit?.clientName || "Group Company",
        unitName: unit?.unitName || "Operating Unit",
      });
    } else {
      pendingDocs.push({
        id: `${doc.employeeId}-${doc.category}`,
        employeeId: doc.employeeId,
        empId: emp?.employeeCode || "N/A",
        empName: emp?.name || "Unknown Employee",
        category: doc.category,
        clientName: vendor?.name || unit?.clientName || "Group Company",
        unitName: unit?.unitName || "Operating Unit",
      });
    }
  });

  // 3. Compliance Missing List
  const complianceGaps: Array<{
    empId: string;
    empName: string;
    employee: Employee;
    missingItems: string[];
    clientName: string;
    unitName: string;
  }> = [];

  data.employees
    .filter((emp) => emp.status === "active")
    .forEach((emp) => {
      const missing: string[] = [];
      if (!emp.uanMasked) missing.push("UAN / EPF");
      if (!emp.esiMasked) missing.push("ESI Number");
      if (!emp.bankAccountMasked || !emp.ifscMasked) missing.push("Bank Account / IFSC");

      if (missing.length > 0) {
        const unit = emp.clientUnitId ? unitMap.get(emp.clientUnitId) : null;
        const vendor = emp.vendorId ? vendorMap.get(emp.vendorId) : null;
        complianceGaps.push({
          empId: emp.employeeCode || "N/A",
          empName: emp.name,
          employee: emp,
          missingItems: missing,
          clientName: vendor?.name || unit?.clientName || "Group Company",
          unitName: unit?.unitName || "Operating Unit",
        });
      }
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget || !onReuploadDocument) return;

    setIsUploading(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        await onReuploadDocument(uploadTarget.employeeId, uploadTarget.category, file.name, dataUrl);
        setFeedback({
          text: `Successfully re-uploaded "${uploadTarget.category}" for ${uploadTarget.empName}! Status reset to pending verification.`,
          type: "success",
        });
      } catch (err) {
        setFeedback({
          text: `Error re-uploading file: ${err instanceof Error ? err.message : "Upload failed"}`,
          type: "error",
        });
      } finally {
        setIsUploading(false);
        setUploadTarget(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerReupload = (employeeId: string, category: string, empName: string) => {
    setUploadTarget({ employeeId, category, empName });
    fileInputRef.current?.click();
  };

  // Filter rejected docs by search
  const filteredRejected = rejectedDocs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.empId.toLowerCase().includes(q) ||
      d.empName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.rejectionReason.toLowerCase().includes(q) ||
      d.reviewedBy.toLowerCase().includes(q) ||
      d.clientName.toLowerCase().includes(q) ||
      d.unitName.toLowerCase().includes(q)
    );
  });

  // Filter pending docs by search
  const filteredPending = pendingDocs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.empId.toLowerCase().includes(q) ||
      d.empName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.clientName.toLowerCase().includes(q) ||
      d.unitName.toLowerCase().includes(q)
    );
  });

  // Filter approved docs by search
  const filteredApproved = approvedDocs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.empId.toLowerCase().includes(q) ||
      d.empName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.reviewedBy.toLowerCase().includes(q) ||
      d.clientName.toLowerCase().includes(q) ||
      d.unitName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="section-stack" style={{ paddingBottom: "40px" }}>
      {/* Hidden File Input for Instant 1-Click Re-upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      {/* Screen Header */}
      <div
        className="panel"
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#ffffff",
          padding: "20px 24px",
          borderRadius: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#f87171", letterSpacing: "0.06em" }}>
            HR Action & Document Review
          </span>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "4px 0 2px 0", color: "#ffffff" }}>
            Rejected Documents & Compliance Center
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "13.5px", margin: 0 }}>
            Review rejected candidate documents, see why they were rejected and by whom, and re-upload corrected files directly.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fca5a5" }}>{rejectedDocs.length}</div>
            <div style={{ fontSize: "11px", color: "#fecdd3", fontWeight: 600 }}>Rejected Docs</div>
          </div>
          <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid #f59e0b", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fde68a" }}>{pendingDocs.length}</div>
            <div style={{ fontSize: "11px", color: "#fef3c7", fontWeight: 600 }}>Pending Approval</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            background: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1.5px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`,
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
            fontWeight: 700,
            fontSize: "13.5px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs & Search Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "#ffffff",
          padding: "10px 16px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              border: activeTab === "rejected" ? "1.5px solid #dc2626" : "1px solid #fee2e2",
              background: activeTab === "rejected" ? "#fef2f2" : "#ffffff",
              color: activeTab === "rejected" ? "#b91c1c" : "#991b1b",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="alert" size={14} />
            <span>Rejected Docs</span>
            <span
              style={{
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
                fontWeight: 800,
              }}
            >
              {rejectedDocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              border: activeTab === "pending" ? "1.5px solid #d97706" : "1px solid #fef3c7",
              background: activeTab === "pending" ? "#fffbeb" : "#ffffff",
              color: activeTab === "pending" ? "#b45309" : "#78350f",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="refresh" size={14} />
            <span>Pending Approval</span>
            <span
              style={{
                background: "#d97706",
                color: "#ffffff",
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {pendingDocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              border: activeTab === "approved" ? "1.5px solid #059669" : "1px solid #dcfce7",
              background: activeTab === "approved" ? "#ecfdf5" : "#ffffff",
              color: activeTab === "approved" ? "#065f46" : "#166534",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="check" size={14} />
            <span>Approved Docs</span>
            <span
              style={{
                background: "#059669",
                color: "#ffffff",
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {approvedDocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compliance")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
              border: activeTab === "compliance" ? "1.5px solid #0284c7" : "1px solid #e0f2fe",
              background: activeTab === "compliance" ? "#f0f9ff" : "#ffffff",
              color: activeTab === "compliance" ? "#0369a1" : "#0c4a6e",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="shield" size={14} />
            <span>Statutory Gaps</span>
            <span
              style={{
                background: "#0284c7",
                color: "#ffffff",
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "10px",
              }}
            >
              {complianceGaps.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", minWidth: "240px" }}>
          <input
            type="text"
            placeholder="Search Emp ID, name, doc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 30px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "12.5px",
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "inline-flex" }}>
            <Icon name="search" size={14} />
          </span>
        </div>
      </div>

      {/* Tab 1: Rejected Documents Table */}
      {activeTab === "rejected" && (
        <div className="panel table-panel" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #fecdd3", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 18px", background: "#fef2f2", borderBottom: "1px solid #fecdd3", display: "flex", borderLeft: "4px solid #dc2626", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ fontSize: "14px", color: "#991b1b" }}>Action Required: Rejected Candidate Documents</strong>
              <div style={{ fontSize: "12px", color: "#7f1d1d" }}>
                Click <strong>"Re-upload"</strong> on any row to choose the corrected file from your device and submit.
              </div>
            </div>
            <span style={{ background: "#dc2626", color: "#ffffff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 800 }}>
              {filteredRejected.length} item(s)
            </span>
          </div>

          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                  <th style={{ padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0", width: "110px" }}>Emp ID</th>
                  <th style={{ padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0", width: "180px" }}>Candidate Name</th>
                  <th style={{ padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0" }}>Rejected Document & Reason</th>
                  <th style={{ padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0", width: "220px" }}>Rejected By</th>
                  <th style={{ padding: "10px 14px", borderBottom: "1.5px solid #e2e8f0", textAlign: "center", width: "160px" }}>Edit / Re-upload</th>
                </tr>
              </thead>
              <tbody>
                {filteredRejected.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px 20px", textAlign: "center", color: "#059669", background: "#f0fdf4" }}>
                      <div style={{ color: "#059669", marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                        <Icon name="check" size={28} />
                      </div>
                      <strong style={{ fontSize: "15px" }}>Zero Rejected Documents!</strong>
                      <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#166534" }}>
                        All employee documents are approved and up to date.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRejected.map((item) => {
                    const emp = empMap.get(item.employeeId);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        {/* Emp ID */}
                        <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                          <span
                            style={{
                              display: "inline-block",
                              background: "#f1f5f9",
                              color: "#0f172a",
                              fontWeight: 800,
                              fontFamily: "monospace",
                              fontSize: "12px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            {item.empId}
                          </span>
                        </td>

                        {/* Name */}
                        <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                          <strong style={{ display: "block", color: "#0f172a", fontSize: "13.5px" }}>
                            {item.empName}
                          </strong>
                          <small style={{ color: "#64748b", fontSize: "11px" }}>
                            {item.clientName} · {item.unitName}
                          </small>
                        </td>

                        {/* Document & Reason */}
                        <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                fontWeight: 800,
                                fontSize: "11px",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                border: "1px solid #fca5a5",
                              }}
                            >
                              {item.category}
                            </span>
                          </div>
                          <div
                            style={{
                              background: "#fff1f2",
                              borderLeft: "3px solid #dc2626",
                              padding: "5px 8px",
                              borderRadius: "0 4px 4px 0",
                              fontSize: "12px",
                              color: "#7f1d1d",
                              fontWeight: 500,
                            }}
                          >
                            <strong>Reason:</strong> {item.rejectionReason}
                          </div>
                        </td>

                        {/* Rejected By */}
                        <td style={{ padding: "12px 14px", verticalAlign: "top", fontSize: "12px" }}>
                          <div style={{ fontWeight: 700, color: "#334155" }}>
                            {item.reviewedBy}
                          </div>
                          {item.reviewedAt && (
                            <small style={{ color: "#64748b", fontSize: "11px" }}>
                              {new Date(item.reviewedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                          )}
                        </td>

                        {/* Action / Edit */}
                        <td style={{ padding: "12px 14px", verticalAlign: "top", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "center" }}>
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => triggerReupload(item.employeeId, item.category, item.empName)}
                              style={{
                                background: "#2563eb",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "5px 12px",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                                width: "100%",
                                maxWidth: "130px",
                              }}
                            >
                              {isUploading && uploadTarget?.employeeId === item.employeeId && uploadTarget?.category === item.category
                                ? "Uploading..."
                                : "Re-upload"}
                            </button>

                            {emp && onOpenEmployeeApplication && (
                              <button
                                type="button"
                                onClick={() => onOpenEmployeeApplication(emp)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#475569",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                              >
                                View all docs
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pending Approval Table */}
      {activeTab === "pending" && (
        <div className="panel table-panel" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #fde68a", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 18px", background: "#fffbeb", borderBottom: "1px solid #fde68a", borderLeft: "4px solid #d97706" }}>
            <strong style={{ fontSize: "14px", color: "#92400e" }}>Candidate Documents Waiting for Super Admin Verification</strong>
          </div>
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                  <th style={{ padding: "10px 14px", width: "120px" }}>Emp ID</th>
                  <th style={{ padding: "10px 14px" }}>Candidate Name</th>
                  <th style={{ padding: "10px 14px" }}>Document Category</th>
                  <th style={{ padding: "10px 14px", width: "180px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "#059669" }}>
                      No documents pending approval
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((item) => {
                    const emp = empMap.get(item.employeeId);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace" }}>{item.empId}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <strong>{item.empName}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>{item.clientName} · {item.unitName}</small>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 7px", borderRadius: "4px", fontSize: "11.5px", fontWeight: 700 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          {emp && onOpenEmployeeApplication && (
                            <button
                              type="button"
                              onClick={() => onOpenEmployeeApplication(emp)}
                              style={{
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Review & Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Approved Documents Table */}
      {activeTab === "approved" && (
        <div className="panel table-panel" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #bbf7d0", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 18px", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", borderLeft: "4px solid #16a34a" }}>
            <strong style={{ fontSize: "14px", color: "#166534" }}>Verified & Approved Candidate Documents</strong>
          </div>
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                  <th style={{ padding: "10px 14px", width: "120px" }}>Emp ID</th>
                  <th style={{ padding: "10px 14px" }}>Candidate Name</th>
                  <th style={{ padding: "10px 14px" }}>Document Category</th>
                  <th style={{ padding: "10px 14px" }}>Approved By</th>
                  <th style={{ padding: "10px 14px", width: "140px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApproved.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                      No manually approved documents recorded yet
                    </td>
                  </tr>
                ) : (
                  filteredApproved.map((item) => {
                    const emp = empMap.get(item.employeeId);
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace" }}>{item.empId}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <strong>{item.empName}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>{item.clientName} · {item.unitName}</small>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 7px", borderRadius: "4px", fontSize: "11.5px", fontWeight: 700 }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: "12px" }}>
                          <div style={{ fontWeight: 700, color: "#15803d" }}>
                            {item.reviewedBy}
                          </div>
                          {item.reviewedAt && (
                            <small style={{ color: "#64748b", fontSize: "11px" }}>
                              {new Date(item.reviewedAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </small>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          {emp && onOpenEmployeeApplication && (
                            <button
                              type="button"
                              onClick={() => onOpenEmployeeApplication(emp)}
                              style={{
                                background: "#f8fafc",
                                color: "#334155",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Statutory Gaps Table */}
      {activeTab === "compliance" && (
        <div className="panel table-panel" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #bae6fd", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "14px 18px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd", borderLeft: "4px solid #0284c7" }}>
            <strong style={{ fontSize: "14px", color: "#0369a1" }}>Active Employees with Missing Statutory Compliance</strong>
          </div>
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                  <th style={{ padding: "10px 14px", width: "120px" }}>Emp ID</th>
                  <th style={{ padding: "10px 14px" }}>Employee Name</th>
                  <th style={{ padding: "10px 14px" }}>Missing Statutory Items</th>
                  <th style={{ padding: "10px 14px", width: "150px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complianceGaps.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "#059669" }}>
                      All active employees have full statutory compliance.
                    </td>
                  </tr>
                ) : (
                  complianceGaps.map((item) => (
                    <tr key={item.employee.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace" }}>{item.empId}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <strong>{item.empName}</strong>
                        <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>{item.clientName} · {item.unitName}</small>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {item.missingItems.map((m) => (
                            <span key={m} style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {onEditEmployee && (
                          <button
                            type="button"
                            onClick={() => onEditEmployee(item.employee)}
                            style={{
                              background: "#0284c7",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            Edit Profile
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
