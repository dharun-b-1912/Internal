"use client";

import { useMemo, useState } from "react";
import type { AppData, Employee, PayrollRun, Vendor } from "./payroll-app";

type VendorDeskViewProps = {
  data: AppData;
  currentRun: PayrollRun | null;
  currentVendor: Vendor | null;
  onAction: (action: string, successMessage: string, payload: any) => Promise<boolean>;
  isActing: boolean;
  onNavigateToRecoveries: () => void;
};

type RecentSubmission = {
  id: string;
  billNumber: string;
  storeName: string;
  employeeName: string;
  employeeCode: string;
  roomNumber?: string;
  isSplit: boolean;
  splitCount: number;
  totalAmount: number;
  perCandidateAmount: number;
  category: string;
  billDate: string;
  receiptImage?: string | null;
  submittedAt: string;
};

const CATEGORIES = [
  { id: "provision", label: "🛒 Groceries & Provision", isGroupDefault: true },
  { id: "gas", label: "🛢️ Gas Cylinder", isGroupDefault: true },
  { id: "ration", label: "🍱 Food & Ration", isGroupDefault: true },
  { id: "advance", label: "💵 Cash Advance", isGroupDefault: false },
  { id: "medical", label: "🏥 Medical Expense", isGroupDefault: false },
  { id: "shoe", label: "👕 Uniform / Shoes / ID", isGroupDefault: false },
  { id: "bus", label: "🎟️ Travel / Bus / Train", isGroupDefault: false },
];

export function VendorDeskView({
  data,
  currentRun,
  currentVendor,
  onAction,
  isActing,
  onNavigateToRecoveries,
}: VendorDeskViewProps) {
  const isVendorAccount = data.currentUser.role === "vendor" || Boolean(data.currentUser.department?.startsWith("Vendor:"));

  // Store vendors registered by Super Admin (from appUsers with role === 'vendor')
  const registeredVendors = useMemo(() => {
    return (data.appUsers || []).filter(
      (user) => (user.role === "vendor" || Boolean(user.department?.startsWith("Vendor:"))) && user.status !== "inactive",
    );
  }, [data.appUsers]);

  const [selectedVendorId, setSelectedVendorId] = useState<string>(() => {
    if (isVendorAccount) {
      return data.currentUser.id;
    }
    return registeredVendors[0]?.id || "";
  });

  const selectedVendor = useMemo(() => {
    if (isVendorAccount) return data.currentUser;
    return (
      registeredVendors.find((v) => v.id === selectedVendorId) ||
      registeredVendors[0] ||
      null
    );
  }, [registeredVendors, selectedVendorId, isVendorAccount, data.currentUser]);

  const activeStoreName = isVendorAccount
    ? data.currentUser.fullName || data.currentUser.email
    : selectedVendor
      ? selectedVendor.fullName || selectedVendor.email
      : "";

  // Search Mode: Aadhaar vs Mobile vs Code
  const [searchMode, setSearchMode] = useState<"aadhaar" | "mobile" | "code">("aadhaar");
  const [lookupQuery, setLookupQuery] = useState("");
  const [verifiedEmployee, setVerifiedEmployee] = useState<Employee | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Bill Information
  const [category, setCategory] = useState("provision");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billAmount, setBillAmount] = useState<number | "">("");
  const [billNotes, setBillNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  // Room & Split Configuration
  const [splitAmongRoommates, setSplitAmongRoommates] = useState(true);

  // Local submissions session log & Preview Modal
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);

  // Find Room & Roommates for verified candidate
  const candidateRoomInfo = useMemo(() => {
    if (!verifiedEmployee) return null;
    const room =
      (verifiedEmployee.roomId
        ? data.accommodationRooms.find((r) => r.id === verifiedEmployee.roomId)
        : null) ??
      (verifiedEmployee.roomNumber
        ? data.accommodationRooms.find(
            (r) =>
              r.roomNumber === verifiedEmployee.roomNumber &&
              (!verifiedEmployee.vendorId || r.vendorId === verifiedEmployee.vendorId),
          )
        : null);

    const roomNumber = room?.roomNumber ?? verifiedEmployee.roomNumber;
    if (!roomNumber) return null;

    const roommates = data.employees.filter(
      (e) =>
        e.status === "active" &&
        ((room?.id && e.roomId === room.id) ||
          (e.roomNumber && e.roomNumber === roomNumber)),
    );

    return {
      room,
      roomNumber,
      roommates: roommates.length > 0 ? roommates : [verifiedEmployee],
    };
  }, [data.accommodationRooms, data.employees, verifiedEmployee]);

  // Clean / Format Aadhaar input
  function handleLookupInput(raw: string) {
    setLookupError("");
    if (searchMode === "aadhaar") {
      // Keep only digits, up to 12
      const digits = raw.replace(/\D/g, "").slice(0, 12);
      // Format with spaces XXXX XXXX XXXX
      const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
      setLookupQuery(formatted);
      if (digits.length === 12) {
        performLookup(digits);
      }
    } else if (searchMode === "mobile") {
      const digits = raw.replace(/\D/g, "").slice(0, 10);
      setLookupQuery(digits);
      if (digits.length === 10) {
        performLookup(digits);
      }
    } else {
      setLookupQuery(raw);
    }
  }

  function performLookup(explicitQuery?: string) {
    const q = (explicitQuery ?? lookupQuery).replace(/\s+/g, "").trim().toLowerCase();
    if (!q) {
      setLookupError("Please enter an Aadhaar number, Mobile number or Employee code.");
      return;
    }

    setLookupError("");
    const matched = data.employees.find((emp) => {
      if (emp.status !== "active") return false;

      // 1. Employee Code match (e.g. JOY-0142)
      if (emp.employeeCode.toLowerCase() === q || emp.employeeCode.toLowerCase().replace(/[^a-z0-9]/g, "") === q) {
        return true;
      }
      // 2. Mobile match
      if (emp.mobileNumber && emp.mobileNumber.replace(/\D/g, "") === q) {
        return true;
      }
      // 3. Aadhaar / UAN / Bank matches
      if (emp.uanMasked && emp.uanMasked.replace(/\D/g, "").includes(q)) {
        return true;
      }
      // 4. Name match if code search
      if (searchMode === "code" && emp.name.toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });

    if (matched) {
      setVerifiedEmployee(matched);
      setLookupError("");
      // Default to split if room has multiple occupants
      setSplitAmongRoommates(true);
    } else {
      setVerifiedEmployee(null);
      setLookupError(
        searchMode === "aadhaar"
          ? `No active employee found for Aadhaar '${lookupQuery}'. Verify digits or try searching by Mobile / Code.`
          : `No active employee found matching '${lookupQuery}'.`,
      );
    }
  }

  // Calculate live split values
  const numAmount = typeof billAmount === "number" ? billAmount : Number(billAmount) || 0;
  const isMultiRoomSplit =
    splitAmongRoommates &&
    candidateRoomInfo &&
    candidateRoomInfo.roommates.length > 1;

  const targetCount = isMultiRoomSplit ? candidateRoomInfo.roommates.length : 1;
  const perCandidateAmount =
    targetCount > 0 ? Math.round((numAmount / targetCount) * 100) / 100 : numAmount;

  async function handleBillSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verifiedEmployee) {
      setLookupError("Verify employee identity first before submitting bill.");
      return;
    }
    if (numAmount <= 0) {
      alert("Please enter a valid bill amount greater than ₹0.");
      return;
    }
    if (!billNumber.trim()) {
      alert("Please enter the Bill / Voucher / Invoice number.");
      return;
    }

    // Determine target candidates:
    const targetEmployees = isMultiRoomSplit
      ? candidateRoomInfo.roommates
      : [verifiedEmployee];

    // Reference details
    const cleanBillNo = billNumber.trim();
    let finalRef = `[${activeStoreName}] Bill #${cleanBillNo}`;
    if (isMultiRoomSplit && candidateRoomInfo?.roomNumber) {
      finalRef += ` · Room ${candidateRoomInfo.roomNumber} (Split: 1/${targetCount})`;
    }

    // Notes with Receipt photo
    let finalNotes = billNotes.trim();
    if (receiptImage) {
      finalNotes = finalNotes ? `${finalNotes} | Receipt: ${receiptImage}` : `Receipt: ${receiptImage}`;
    }

    const targetIds = targetEmployees.map((e) => e.id);

    // Save recovery entry
    const success = await onAction(
      "save-recovery-entry",
      `Credit bill #${cleanBillNo} recorded: ₹${numAmount.toFixed(2)} (${targetCount > 1 ? `Split: ₹${perCandidateAmount.toFixed(2)} × ${targetCount}` : `₹${numAmount.toFixed(2)}`})`,
      {
        employeeIds: targetIds,
        recoveryDate: billDate,
        recoveryType: category,
        amount: perCandidateAmount,
        reference: finalRef,
        notes: finalNotes || null,
      },
    );

    if (success) {
      // Record in local session log
      const newSubmission: RecentSubmission = {
        id: `SUB-${Date.now()}`,
        billNumber: cleanBillNo,
        storeName: activeStoreName,
        employeeName: verifiedEmployee.name,
        employeeCode: verifiedEmployee.employeeCode,
        roomNumber: candidateRoomInfo?.roomNumber,
        isSplit: Boolean(isMultiRoomSplit),
        splitCount: targetCount,
        totalAmount: numAmount,
        perCandidateAmount,
        category,
        billDate,
        receiptImage,
        submittedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setRecentSubmissions((prev) => [newSubmission, ...prev]);

      setLastSuccessMessage(
        `✅ Bill #${cleanBillNo} for ₹${numAmount.toFixed(2)} recorded successfully for ${verifiedEmployee.name}${targetCount > 1 ? ` (Split across ${targetCount} roommates)` : ""}.`,
      );

      // Reset form for next customer
      setVerifiedEmployee(null);
      setLookupQuery("");
      setBillNumber("");
      setBillAmount("");
      setBillNotes("");
      setReceiptImage(null);
      setSplitAmongRoommates(true);
    }
  }

  return (
    <div className="section-stack" style={{ maxWidth: "880px", margin: "0 auto", padding: "10px" }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🏪</span>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "#38bdf8",
                }}
              >
                Joy Expense &amp; Credit Desk
              </span>
              <h1 style={{ margin: "2px 0 0", fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
                Vendor &amp; Store Counter Desk
              </h1>
            </div>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Fast mobile entry for shopkeepers, mess wardens, and provision stores to bill Joy workers with instant receipt proof.
          </p>
        </div>

        {!isVendorAccount ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onNavigateToRecoveries}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.25)",
              fontSize: "12px",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📋</span> View HR Recovery Ledger
          </button>
        ) : (
          <span
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              color: "#86efac",
              border: "1px solid rgba(134, 239, 172, 0.4)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🟢</span> Store Login: {activeStoreName}
          </span>
        )}
      </div>

      {lastSuccessMessage && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "10px",
            padding: "12px 16px",
            color: "#166534",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "13px" }}>
            <span>🎉</span>
            <span>{lastSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastSuccessMessage(null)}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Counter Form */}
      <form
        onSubmit={handleBillSubmit}
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Step 1: Store / Vendor Selection */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
            🏪 {isVendorAccount ? "STORE / VENDOR ACCOUNT" : "SHOP / VENDOR IDENTITY"}
          </label>
          {isVendorAccount ? (
            <div
              style={{
                background: "#f8fafc",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>{activeStoreName}</strong>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Login: <strong>{data.currentUser.email}</strong>
                  {data.currentUser.mobileNumber ? ` · 📱 ${data.currentUser.mobileNumber}` : ""}
                </div>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  background: "#dcfce7",
                  color: "#166534",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontWeight: 700,
                }}
              >
                ✓ AUTHENTICATED STORE COUNTER
              </span>
            </div>
          ) : registeredVendors.length > 0 ? (
            <div>
              <select
                value={selectedVendor?.id ?? ""}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "#f8fafc",
                  color: "#0f172a",
                }}
              >
                {registeredVendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.fullName || vendor.email}
                    {vendor.department ? ` (${vendor.department})` : ""}
                    {vendor.mobileNumber ? ` · 📱 ${vendor.mobileNumber}` : ""}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "5px" }}>
                ✓ Listing {registeredVendors.length} store vendor{registeredVendors.length > 1 ? "s" : ""} added by Super Admin in <strong>Users & Access</strong>.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "12px 16px",
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <strong style={{ fontSize: "13px" }}>⚠️ No Store Vendors Found</strong>
                <div style={{ fontSize: "12px", marginTop: "2px" }}>
                  No store vendors have been added by the Super Admin yet.
                </div>
              </div>
              <a
                href="#users"
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  display: "inline-block",
                }}
              >
                + Add Store Vendor in Users & Access
              </a>
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: 0 }} />

        {/* Step 2: Employee Aadhaar / Mobile Lookup */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              👤 STEP 1: VERIFY EMPLOYEE IDENTITY
            </label>
            <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("aadhaar");
                  setLookupQuery("");
                  setVerifiedEmployee(null);
                }}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: searchMode === "aadhaar" ? "#ffffff" : "transparent",
                  color: searchMode === "aadhaar" ? "#0f172a" : "#64748b",
                  boxShadow: searchMode === "aadhaar" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Aadhaar (12 digits)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("mobile");
                  setLookupQuery("");
                  setVerifiedEmployee(null);
                }}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: searchMode === "mobile" ? "#ffffff" : "transparent",
                  color: searchMode === "mobile" ? "#0f172a" : "#64748b",
                  boxShadow: searchMode === "mobile" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Mobile Number
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode("code");
                  setLookupQuery("");
                  setVerifiedEmployee(null);
                }}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: searchMode === "code" ? "#ffffff" : "transparent",
                  color: searchMode === "code" ? "#0f172a" : "#64748b",
                  boxShadow: searchMode === "code" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Employee Code (JOY-)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => handleLookupInput(e.target.value)}
                placeholder={
                  searchMode === "aadhaar"
                    ? "Enter 12-digit Aadhaar (e.g. 9876 5432 1098)"
                    : searchMode === "mobile"
                      ? "Enter 10-digit mobile number"
                      : "Enter employee code (e.g. JOY-0142) or Name"
                }
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: "15px",
                  letterSpacing: searchMode === "aadhaar" ? "1.5px" : "normal",
                  fontWeight: searchMode === "aadhaar" ? 700 : 500,
                  borderRadius: "8px",
                  border: "2px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => performLookup()}
              style={{ padding: "0 20px", fontSize: "14px", fontWeight: 700 }}
            >
              🔍 Verify
            </button>
          </div>

          {lookupError && (
            <p style={{ margin: "6px 0 0", color: "#dc2626", fontSize: "12px", fontWeight: 600 }}>
              ⚠️ {lookupError}
            </p>
          )}

          {/* Verified Candidate Profile Card */}
          {verifiedEmployee && (
            <div
              style={{
                marginTop: "12px",
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "#166534",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: 800,
                    }}
                  >
                    {verifiedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "16px", color: "#14532d" }}>
                        {verifiedEmployee.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          background: "#22c55e",
                          color: "#ffffff",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          fontWeight: 700,
                        }}
                      >
                        ✓ VERIFIED ACTIVE
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>
                      Code: <strong>{verifiedEmployee.employeeCode}</strong>
                      {verifiedEmployee.mobileNumber ? ` · 📱 ${verifiedEmployee.mobileNumber}` : ""}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedEmployee(null);
                    setLookupQuery("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Change candidate
                </button>
              </div>

              {/* Room & Occupant Context */}
              {candidateRoomInfo?.roomNumber ? (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: 700 }}>
                      🏠 Accommodation: Room {candidateRoomInfo.roomNumber}
                    </span>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {candidateRoomInfo.roommates.length} active worker{candidateRoomInfo.roommates.length > 1 ? "s" : ""} staying in this room
                    </div>
                  </div>

                  {candidateRoomInfo.roommates.length > 1 && (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={splitAmongRoommates}
                        onChange={(e) => setSplitAmongRoommates(e.target.checked)}
                      />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#15803d" }}>
                        Split bill among all {candidateRoomInfo.roommates.length} roommates
                      </span>
                    </label>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  📍 Assigned Unit: {data.units.find((u) => u.id === verifiedEmployee.clientUnitId)?.unitName ?? "Standard Plant"} (No room allocated)
                </div>
              )}
            </div>
          )}
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: 0 }} />

        {/* Step 3: Bill / Purchase Information */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "12px" }}>
            🧾 STEP 2: BILL &amp; PURCHASE DETAILS
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Expense Category *</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Bill / Invoice No. *</span>
              <input
                required
                placeholder="e.g. BILL-8921 or Memo 402"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Bill Date *</span>
              <input
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                {isMultiRoomSplit ? "Total Bill Amount (₹) *" : "Bill Amount (₹) *"}
              </span>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 700,
                    color: "#64748b",
                    fontSize: "16px",
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 28px",
                    borderRadius: "8px",
                    border: "2px solid #0f172a",
                    fontSize: "16px",
                    fontWeight: 700,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </label>
          </div>

          {/* Live Math Division Banner */}
          {isMultiRoomSplit && numAmount > 0 && (
            <div
              style={{
                marginTop: "12px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#0369a1",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>
                💡 Split Formula: Total ₹{numAmount.toFixed(2)} ÷ {targetCount} roommates in Room {candidateRoomInfo?.roomNumber}
              </span>
              <strong style={{ fontSize: "15px", color: "#0284c7" }}>
                = ₹{perCandidateAmount.toFixed(2)} / worker
              </strong>
            </div>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
              Items / Particulars (Optional)
            </span>
            <input
              placeholder="e.g. Rice 10kg, Toor Dal 2kg, Cooking Oil 1L"
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
            />
          </label>
        </div>

        <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: 0 }} />

        {/* Step 4: 📸 Camera / Receipt Photo Upload */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
            📸 STEP 3: BILL / RECEIPT PHOTO PROOF
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 18px",
                background: "#0284c7",
                color: "#ffffff",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
              }}
            >
              <span>📷 Snap with Camera / Upload Bill</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setReceiptImage(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            {receiptImage ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#f8fafc",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              >
                <img
                  src={receiptImage}
                  alt="Receipt"
                  onClick={() => setPreviewImage(receiptImage)}
                  style={{
                    width: "44px",
                    height: "44px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: "1px solid #cbd5e1",
                  }}
                />
                <div>
                  <div style={{ fontSize: "12px", color: "#166534", fontWeight: 700 }}>
                    ✓ Bill Photo Attached
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "11px",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Remove / Retake
                  </button>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                (Snap clear photo of handwritten memo, cash register slip, or delivery voucher)
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="primary-button"
          disabled={isActing || !verifiedEmployee || numAmount <= 0 || !billNumber.trim()}
          style={{
            padding: "16px",
            fontSize: "16px",
            fontWeight: 800,
            borderRadius: "10px",
            background:
              !verifiedEmployee || numAmount <= 0 || !billNumber.trim()
                ? "#94a3b8"
                : "#16a34a",
            cursor:
              !verifiedEmployee || numAmount <= 0 || !billNumber.trim()
                ? "not-allowed"
                : "pointer",
            boxShadow: "0 4px 6px -1px rgba(22, 163, 74, 0.3)",
          }}
        >
          {isActing
            ? "Submitting Credit Bill…"
            : verifiedEmployee
              ? `🚀 Submit Bill #${billNumber || "—"} for ₹${numAmount > 0 ? numAmount.toFixed(2) : "0.00"}`
              : "Verify employee identity above to submit"}
        </button>
      </form>

      {/* Recent Submissions Log */}
      {recentSubmissions.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "20px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              📋 Bills Submitted This Session ({recentSubmissions.length})
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Live sync with HR Payroll Draft</span>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bill #</th>
                  <th>Candidate</th>
                  <th>Room &amp; Split</th>
                  <th>Total Bill</th>
                  <th>Deduction / Head</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td><small>{sub.submittedAt}</small></td>
                    <td><strong>{sub.billNumber}</strong></td>
                    <td>
                      <div><strong>{sub.employeeName}</strong></div>
                      <small>{sub.employeeCode}</small>
                    </td>
                    <td>
                      {sub.isSplit ? (
                        <span style={{ fontSize: "11px", background: "#f0fdf4", color: "#166534", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          Room {sub.roomNumber} ({sub.splitCount} ways)
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Individual</span>
                      )}
                    </td>
                    <td><strong>₹{sub.totalAmount.toFixed(2)}</strong></td>
                    <td><strong style={{ color: "#0369a1" }}>₹{sub.perCandidateAmount.toFixed(2)}</strong></td>
                    <td>
                      {sub.receiptImage ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(sub.receiptImage!)}
                          style={{
                            padding: "2px 6px",
                            fontSize: "11px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "4px",
                            color: "#1d4ed8",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          📸 View
                        </button>
                      ) : (
                        <small className="muted-label">No photo</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Receipt Image Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "16px",
              maxWidth: "92vw",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "14px", color: "#1e293b" }}>Captured Bill Receipt</strong>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "4px 8px", fontSize: "12px" }}
                onClick={() => setPreviewImage(null)}
              >
                ✕ Close
              </button>
            </div>
            <img
              src={previewImage}
              alt="Receipt preview"
              style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: "6px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
