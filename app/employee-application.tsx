"use client";

import { useEffect, useRef, useState } from "react";
import {
  applicationSections,
  DOCUMENT_CATEGORIES,
  getDocumentUploadDate,
  readApplication,
  safeApplicationImage,
  type ApplicationData,
  type ApplicationDocument,
  type ApplicationRequest,
} from "../lib/employee-application";
import { printIsolatedElement } from "../lib/print-document";
import { formatDisplayDate } from "../lib/date-format";
import type { Employee, Vendor } from "./payroll-app";
import { SignaturePad } from "./signature-pad";
import {
  Info, UserCheck, AlertTriangle, Phone, Paperclip, CheckCircle2,
  XCircle, Clock, FileText, Upload, ShieldCheck, Search, ChevronRight,
  X, Check, Eye, FolderCheck, FileCheck
} from "lucide-react";

export function EmployeeApplicationFields({
  value,
  onChange,
  employeeId,
  loadDocuments,
  uploads,
  onUploadsChange,
  directStaff = [],
  allEmployees = [],
}: {
  value: ApplicationData;
  onChange: (data: ApplicationData) => void;
  employeeId?: string;
  loadDocuments: ApplicationRequest;
  uploads: ApplicationDocument[];
  onUploadsChange: (docs: ApplicationDocument[]) => void;
  directStaff?: Array<{ id: string; employeeCode: string; name: string; department?: string }>;
  allEmployees?: Array<{ id: string; employeeCode: string; name: string; mobileNumber?: string | null; department?: string; status?: string; addressLine?: string | null }>;
}) {
  const [saved, setSaved] = useState<ApplicationDocument[]>([]);
  const [error, setError] = useState("");
  const [ref1Search, setRef1Search] = useState("");
  const [ref2MobileSearch, setRef2MobileSearch] = useState("");
  const [ref2LookupMsg, setRef2LookupMsg] = useState("");

  useEffect(() => {
    let active = true;
    if (employeeId)
      loadDocuments(employeeId)
        .then((d) => {
          if (active) setSaved(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [employeeId]);

  const update = (key: string, next: string) => onChange({ ...value, [key]: next });

  // Filtered direct staff for Reference 1
  const matchingStaff = directStaff.filter(
    (s) =>
      ref1Search.trim() &&
      (`${s.name} ${s.employeeCode} ${s.department || ""}`
        .toLowerCase()
        .includes(ref1Search.toLowerCase().trim())),
  );

  // Handle Reference 2 Mobile Lookup
  const handleRef2MobileLookup = (mobileInput: string) => {
    setRef2MobileSearch(mobileInput);
    const cleaned = mobileInput.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      const match = allEmployees.find(
        (e) => e.mobileNumber && e.mobileNumber.replace(/\D/g, "").includes(cleaned.slice(-10)),
      );
      if (match) {
        onChange({
          ...value,
          "Reference 2 - Name": match.name,
          "Reference 2 - Position": match.department || (match.status === "left" ? "Ex-Employee" : "Employee"),
          "Reference 2 - Address": match.addressLine || "On Record",
          "Reference 2 - Phone No": match.mobileNumber || cleaned,
        });
        setRef2LookupMsg(`Found matching ${match.status === "left" ? "ex-employee" : "active employee"}: ${match.name} (${match.employeeCode})`);
      } else {
        setRef2LookupMsg("No existing employee matched this mobile number (manual entry mode).");
      }
    } else {
      setRef2LookupMsg("");
    }
  };

  return (
    <details className="form-span" style={{ margin: "16px 0" }}>
      <summary style={{ fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span>Company e-Job Application - additional details, documents &amp; digital signature</span>
        {(value["Digital Signature (Type your full name)"] || value["Signature image"] || uploads.some(d => d.category === "Candidate Signature") || saved.some(d => d.category === "Candidate Signature")) ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} /> Digitally Signed
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", background: "#fef3c7", color: "#92400e", borderRadius: 4 }}>
            Signature pending
          </span>
        )}
      </summary>
      <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, margin: "10px 0", fontSize: 13, color: "#166534", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <CheckCircle2 size={16} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <strong>Automatic synchronization:</strong> Personal identity, DOB, gender, marital status, joining date, department, contact, and banking details entered above are automatically populated in the e-Job application. You only need to enter additional questionnaire details, references, and verification documents below if required.
        </div>
      </div>

      {/* Reference 1: Joy Staff Only */}
      <fieldset style={{ margin: "12px 0", padding: 16, border: "2px solid #3b82f6", borderRadius: 8, background: "#f0f7ff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <legend style={{ fontWeight: 700, color: "#1e40af", padding: "0 6px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <UserCheck size={16} /> Reference 1 — Joy Staff (Internal Joy Staff Member Only)
          </legend>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 4 }}>
            JOY STAFF ONLY
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#334155", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
          <span><strong>Required for referral tracking:</strong> Type or search the name / employee code of the <strong>Joy Staff member</strong> (from Users &amp; Access) who referred this candidate.</span>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 10 }}>
          <label style={{ gridColumn: "1 / -1" }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Search Joy Staff Member (Name or Emp Code):</span>
            <input
              type="text"
              placeholder="e.g. Type staff name or code to auto-populate..."
              value={ref1Search}
              onChange={(e) => setRef1Search(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #60a5fa", marginTop: 4 }}
            />
          </label>

          {ref1Search.trim() && matchingStaff.length > 0 && (
            <div style={{ gridColumn: "1 / -1", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 6, padding: 8, maxHeight: 150, overflowY: "auto" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>Select Staff Member:</div>
              {matchingStaff.map((staff) => (
                <div
                  key={staff.id}
                  onClick={() => {
                    onChange({
                      ...value,
                      "Reference 1 - Employee ID": staff.id,
                      "Reference 1 - Employee Code": staff.employeeCode,
                      "Reference 1 - Name": staff.name,
                    });
                    setRef1Search("");
                  }}
                  style={{ padding: "6px 10px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 13 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <strong>{staff.name} ({staff.employeeCode})</strong>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{staff.department || "Internal Staff"}</span>
                </div>
              ))}
            </div>
          )}

          {ref1Search.trim() && matchingStaff.length === 0 && (
            <div style={{ gridColumn: "1 / -1", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#991b1b" }}>
              No Joy Staff member found matching &quot;{ref1Search}&quot;.
            </div>
          )}

          <label>
            <span>Reference 1 - Employee Code</span>
            <input
              type="text"
              value={value["Reference 1 - Employee Code"] || ""}
              onChange={(e) => update("Reference 1 - Employee Code", e.target.value)}
            />
          </label>
          <label>
            <span>Reference 1 - Name</span>
            <input
              type="text"
              value={value["Reference 1 - Name"] || ""}
              onChange={(e) => update("Reference 1 - Name", e.target.value)}
            />
          </label>
          <label>
            <span>Reference 1 - Employee ID</span>
            <input
              type="text"
              value={value["Reference 1 - Employee ID"] || ""}
              onChange={(e) => update("Reference 1 - Employee ID", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {/* Reference 2: Other Reference with 10-Digit Mobile Auto-Lookup */}
      <fieldset style={{ margin: "12px 0", padding: 16, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fafafa" }}>
        <legend style={{ fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Phone size={16} /> Reference 2 — Other Reference (Dual Mode: Mobile Lookup or Manual)
        </legend>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px" }}>
          Enter a 10-digit mobile number to auto-match existing (active or left) employees, or enter details manually.
        </p>

        <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="tel"
            placeholder="Enter 10-digit mobile number for auto-lookup"
            value={ref2MobileSearch}
            onChange={(e) => handleRef2MobileLookup(e.target.value)}
            style={{ flex: "1 1 250px", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
          />
        </div>
        {ref2LookupMsg && (
          <div style={{ fontSize: 12, color: ref2LookupMsg.toLowerCase().includes("found") ? "#15803d" : "#64748b", marginBottom: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {ref2LookupMsg.toLowerCase().includes("found") ? <CheckCircle2 size={14} /> : <Info size={14} />}
            <span>{ref2LookupMsg}</span>
          </div>
        )}

        <div className="form-grid">
          <label>
            <span>Reference 2 - Name</span>
            <input
              type="text"
              value={value["Reference 2 - Name"] || ""}
              onChange={(e) => update("Reference 2 - Name", e.target.value)}
            />
          </label>
          <label>
            <span>Reference 2 - Position</span>
            <input
              type="text"
              value={value["Reference 2 - Position"] || ""}
              onChange={(e) => update("Reference 2 - Position", e.target.value)}
            />
          </label>
          <label>
            <span>Reference 2 - Phone No</span>
            <input
              type="tel"
              value={value["Reference 2 - Phone No"] || ""}
              onChange={(e) => update("Reference 2 - Phone No", e.target.value)}
            />
          </label>
          <label>
            <span>Reference 2 - Address</span>
            <input
              type="text"
              value={value["Reference 2 - Address"] || ""}
              onChange={(e) => update("Reference 2 - Address", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {/* Remaining Application Sections (Excluding redundant master fields and Declaration) */}
      {applicationSections
        .filter(
          (s) =>
            s.title !== "Supporting document links" &&
            s.title !== "Applicant identity" &&
            s.title !== "Application details" &&
            s.title !== "Declaration" &&
            !s.title.startsWith("Reference 1") &&
            !s.title.startsWith("Reference 2"),
        )
        .map((section) => (
          <fieldset
            key={section.title}
            style={{ margin: "12px 0", padding: 16, border: "1px solid #cbd5e1", borderRadius: 8 }}
          >
            <legend style={{ fontWeight: 700, color: "#1e3a8a" }}>{section.title}</legend>
            {section.title === "Language proficiency" && (
              <p>Enter Read / Write / Speak for each applicable language.</p>
            )}
            <div className="form-grid">
              {section.fields
                .map((key) => (
                  <label key={key}>
                    <span>{key}</span>
                    {key === "Date" ? (
                      <input
                        type="date"
                        value={value[key] || ""}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    ) : (
                      <textarea
                        rows={2}
                        maxLength={2000}
                        value={value[key] || ""}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    )}
                  </label>
                ))}
            </div>
          </fieldset>
        ))}
    <fieldset style={{ padding: 16, border: "1px solid #cbd5e1", borderRadius: 8 }}><legend style={{ fontWeight: 700, color: "#0f172a" }}>Uploaded verification documents</legend>
      <p>PDF, PNG or JPEG. Files are saved when you click Save changes.</p>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#f8fafc", textAlign: "left" }}><th style={{ padding: 10, borderBottom: "2px solid #cbd5e1" }}>Document Category</th><th style={{ padding: 10, borderBottom: "2px solid #cbd5e1" }}>Requirement</th><th style={{ padding: 10, borderBottom: "2px solid #cbd5e1" }}>Current Status &amp; Upload</th></tr></thead><tbody>
        {DOCUMENT_CATEGORIES.map(category => {
          const file = uploads.find(d => d.category === category.id) || saved.find(d => d.category === category.id);
          return <tr key={category.id}><td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {category.icon ? <span>{category.icon}</span> : <FileText size={16} style={{ color: "#2563eb" }} />}
              <strong>{category.label}</strong>
            </div>
            <small style={{ color: "#64748b" }}>{category.helper}</small>
          </td>
            <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>
              {category.required ? <span style={{ padding: "2px 6px", background: "#fee2e2", color: "#991b1b", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>MANDATORY</span> : <span style={{ padding: "2px 6px", background: "#f1f5f9", color: "#475569", borderRadius: 4, fontSize: 11 }}>Optional</span>}
            </td>
            <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ marginBottom: 4 }}>
                {file ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ color: "#0f766e", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Paperclip size={13} /> {file.filename}{uploads.some(d => d.category === category.id) ? " (ready to save)" : ""}
                    </span>
                    {getDocumentUploadDate(file, { applicationJson: JSON.stringify(value) }) ? (
                      <span style={{ fontSize: 11, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Upload size={11} style={{ color: "#2563eb" }} /> Uploaded: <strong>{getDocumentUploadDate(file, { applicationJson: JSON.stringify(value) })}</strong>
                        {file.uploadedBy ? ` by ${file.uploadedBy.includes("@") ? file.uploadedBy.split("@")[0] : file.uploadedBy}` : ""}
                      </span>
                    ) : null}
                    {file.status === "approved" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                          <CheckCircle2 size={12} /> Super Admin Approved
                        </span>
                        {file.reviewedBy ? (
                          <small style={{ color: "#15803d", fontSize: 11, fontWeight: 500 }}>
                            Approved by: <strong>{file.reviewedBy}</strong>{file.reviewedAt ? ` on ${new Date(file.reviewedAt).toLocaleDateString()}` : ""}
                          </small>
                        ) : null}
                      </div>
                    ) : file.status === "rejected" ? (
                      <div style={{ padding: "6px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, fontSize: 11, color: "#991b1b" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <XCircle size={13} style={{ flexShrink: 0 }} />
                          <div><strong>Rejected by Super Admin:</strong> {file.rejectionReason || "Please re-upload a clear and valid copy."}</div>
                        </div>
                        {file.reviewedBy ? (
                          <div style={{ marginTop: 2, fontSize: 10, color: "#7f1d1d" }}>
                            Rejected by: <strong>{file.reviewedBy}</strong>{file.reviewedAt ? ` on ${new Date(file.reviewedAt).toLocaleDateString()}` : ""}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 4, fontSize: 11, fontWeight: 700, width: "fit-content" }}>
                        <Clock size={12} /> Pending Super Admin Approval
                      </span>
                    )}
                  </div>
                ) : (
                  <small style={{ color: "#94a3b8" }}>No file attached</small>
                )}
              </div>
              <input aria-label={`Upload ${category.label}`} type="file" accept="application/pdf,image/png,image/jpeg" onChange={async event => {
                const next = event.target.files?.[0]; if (!next) return;
                setError("");
                try {
                  const isAllowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"].includes(next.type) || /\.(pdf|jpe?g|png|webp)$/i.test(next.name); if (!isAllowed) throw new Error("Choose a valid PDF, PNG or JPEG file.");
                  if (next.type === "application/pdf") { const { PDFDocument } = await import("pdf-lib"); await PDFDocument.load(await next.arrayBuffer()); }
                  else { const bitmap = await createImageBitmap(next); bitmap.close(); }
                  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unable to read file")); reader.readAsDataURL(next); });
                  const updated = [...uploads.filter(d => d.category !== category.id), { category: category.id, filename: next.name, dataUrl, status: "pending_approval" as const }];
                  if (JSON.stringify(updated).length > 60000000) throw new Error("Please save these files before uploading more.");
                  onUploadsChange(updated);
                } catch (e) { setError(e instanceof Error ? e.message : "Unable to load file. Password-protected PDFs are not supported."); }
              }} />
            </td></tr>;
        })}
      </tbody></table></div>
    </fieldset>

    {/* Section 7: Declaration & Digital Signature Fieldset */}
    <fieldset style={{ margin: "16px 0", padding: 18, border: "2px solid #2563eb", borderRadius: 10, background: "#f0f7ff" }}>
      <legend style={{ fontWeight: 800, color: "#1e40af", padding: "0 8px", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ShieldCheck size={18} style={{ color: "#2563eb" }} /> Section 7: Declaration &amp; Digital Signature
      </legend>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#334155" }}>
        Statutory employee declaration and digital signature. Both the typed full legal name and drawn/scanned signature appear directly in the application summary and generated PDF.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <input
            type="checkbox"
            checked={Boolean(value.Declaration)}
            onChange={(e) => update("Declaration", e.target.checked ? "I hereby confirm and declare that all information and uploaded documents provided above are genuine, true, and correct to the best of my knowledge and belief." : "")}
            style={{ marginTop: 2, width: 18, height: 18 }}
          />
          <span style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.4 }}>
            <strong>Candidate Declaration:</strong> {value.Declaration || "I hereby confirm and declare that all information and uploaded documents provided above are genuine, true, and correct to the best of my knowledge and belief."}
          </span>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", display: "block", marginBottom: 4 }}>
              Digital Signature (Type employee&apos;s full legal name) *
            </span>
            <input
              type="text"
              placeholder="e.g. Full Legal Name"
              value={value["Digital Signature (Type your full name)"] || ""}
              onChange={(e) => update("Digital Signature (Type your full name)", e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "2px solid #3b82f6", fontSize: 15, fontWeight: 600, background: "#fff" }}
            />
            <small style={{ color: "#64748b", display: "block", marginTop: 4 }}>
              This typed legal name serves as the statutory digital signature on the application form and PDF.
            </small>
          </label>

          <label style={{ display: "block" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", display: "block", marginBottom: 4 }}>
              Declaration Date
            </span>
            <input
              type="date"
              value={value["Date"] || ""}
              onChange={(e) => update("Date", e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}
            />
          </label>
        </div>

        <div style={{ marginTop: 4, background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <SignaturePad
            value={value["Signature image"] || saved.find(d => d.category === "Candidate Signature")?.dataUrl || uploads.find(d => d.category === "Candidate Signature")?.dataUrl}
            onChange={(dataUrl) => {
              update("Signature image", dataUrl);
              const updatedUploads = [...uploads.filter(d => d.category !== "Candidate Signature"), { category: "Candidate Signature", filename: "candidate-signature.png", dataUrl, status: "pending_approval" as const }];
              onUploadsChange(updatedUploads);
            }}
            label="Employee Real Signature (Drawn or Photo)"
            helperText="Draw real signature directly with finger/stylus/mouse, snap paper signature with phone camera, or upload signature image."
          />
        </div>
      </div>
    </fieldset>
  </details>
);
}

const applicationCss = `
 .joy-application-document { box-sizing:border-box; width:190mm; max-width:100%; margin:0 auto; padding:8mm; background:white; color:#111827; font:11pt/1.4 Arial,sans-serif; }
 .joy-application-document * { box-sizing:border-box; }
 .joy-application-document h1 { font-size:16pt; margin:0 0 4mm; }
 .joy-application-document h2 { font-size:12pt; margin:5mm 0 2mm; border-bottom:1px solid #94a3b8; padding-bottom:2mm; break-after:avoid; }
 .joy-application-document p { margin:2mm 0; white-space:pre-wrap; overflow-wrap:anywhere; }
 .joy-application-document table { width:100%; table-layout:fixed; border-collapse:collapse; font-size:10pt; }
 .joy-application-document td { border:1px solid #cbd5e1; padding:2mm; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; }
 .joy-application-document td:first-child { width:40%; font-weight:600; background:#f8fafc; }
 .joy-application-document tr { break-inside:avoid; }
 .joy-application-document .application-brand { display:flex; gap:5mm; align-items:center; border-bottom:2px solid #1e3a5f; padding-bottom:4mm; }
 .joy-application-document .application-brand img { width:20mm; height:20mm; object-fit:contain; }
 .joy-application-document .application-personal { display:flex; align-items:flex-start; gap:5mm; }
 .joy-application-document .application-personal table { flex:1; min-width:0; }
 .joy-application-document .application-photo { flex:0 0 35mm; text-align:center; font-size:9pt; }
 .joy-application-document .application-photo img { width:32mm; height:40mm; object-fit:contain; }
 .joy-application-document .application-signature { width:35mm; height:15mm; object-fit:contain; }
 .joy-application-document .application-photo .application-signature { width:32mm; height:15mm; }
 .joy-application-document .application-declaration { break-inside:avoid; }
 .joy-application-document .doc-page-break { page-break-before:always; break-before:page; }
 @media print {
   .joy-application-document { width:190mm!important; max-width:100%!important; padding:5mm!important; margin:0 auto!important; box-shadow:none!important; }
   .joy-application-document .doc-page-break { page-break-before:always!important; break-before:page!important; }
  }
`;

function formatCleanDigits(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const raw = String(val).trim();
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(raw)) {
    try {
      const [mantissaStr, expStr] = raw.split(/[eE]/i);
      const exp = parseInt(expStr, 10);
      if (Number.isFinite(exp) && exp > 0 && exp <= 35) {
        const isNegative = mantissaStr.startsWith("-");
        const cleanMantissa = mantissaStr.replace(/^[+-]/, "");
        const parts = cleanMantissa.split(".");
        const integerPart = parts[0] || "0";
        const decimalPart = parts[1] || "";
        let result = "";
        if (exp >= decimalPart.length) {
          result = integerPart + decimalPart + "0".repeat(exp - decimalPart.length);
        } else {
          result = integerPart + decimalPart.slice(0, exp) + "." + decimalPart.slice(exp);
        }
        return (isNegative ? "-" : "") + result;
      }
    } catch {}
  }
  return raw;
}

export function EmployeeApplicationDocument({ employee, vendor, documents = [] }: { employee?: Employee; vendor?: Vendor; documents?: ApplicationDocument[] }) {
  const data = readApplication(employee?.applicationJson);
  const rows = (entries: [string, string | null | undefined][]) => <table><tbody>{entries.map(([label, value]) => <tr key={label}><td>{label}</td><td>{value || "________________"}</td></tr>)}</tbody></table>;
  const signature = safeApplicationImage(
    data["Signature image"] ||
    data["Signature Image"] ||
    documents.find(d => d.category === "Candidate Signature")?.dataUrl
  );
  return <article className="joy-application-document">
    <style>{applicationCss}</style>
    <header className="application-brand">
      {vendor?.logoDataUrl && <img src={vendor.logoDataUrl} alt={`${vendor.name} logo`} />}
      <div><h1>{vendor?.legalName || vendor?.name || "Joy Corporate Solutions"}</h1><p>Company e-Job Application &amp; Employee Questionnaire</p></div>
    </header>
    <h2>1. Position &amp; personal information</h2>
    <div className="application-personal">
      {rows([
        ["Position Applied For", data["Position Applied For"] || employee?.department],
        ["Application Date", formatDisplayDate(data.Date || employee?.dateOfJoining)],
        ["Employee Code", employee?.employeeCode],
        ["Full Name", employee?.name || data["Full name"] || data["Applicant Name"]],
        ["Father / Spouse Name", employee?.fatherName || employee?.spouseName || data["Father - Name"] || data["Spouse - Name"]],
        ["Date of Birth", formatDisplayDate(employee?.dateOfBirth || data["Date of birth"])],
        ["Gender", (employee as any)?.gender || data.Gender],
        ["Marital Status", employee?.maritalStatus || data["Marital status"]],
        ["Mobile Number", employee?.mobileNumber || data["Mobile number"]],
        ["Emergency Contact", employee?.emergencyContactNumber],
        ["Contact Person & Relationship", [data["Contact person name"], data["Contact person relationship"]].filter(Boolean).join(" - ")],
        ["Residential Address", [employee?.addressLine, employee?.district, employee?.stateName, employee?.pincode].filter(Boolean).join(", ") || "—"],
        ["Permanent Address", data["Permanent Address"] || data["Permanent address"] || "—"],
        ["Age", data.Age],
        ["Place of Birth", data["Place of Birth"]],
        ["Height / Weight", [data["Height (cm)"] ? `${data["Height (cm)"]} cm` : "", data["Weight (kg)"] ? `${data["Weight (kg)"]} kg` : ""].filter(Boolean).join(" / ")],
        ["Smoker?", data["Do you smoke?"]],
        ["Identification Marks", data["Identification Marks"]],
        ["Surgery / Chronic Illness", data["Have you had any major surgery / illness recently, or suffer from chronic disease?"]],
        ["Mother Tongue", data["Mother Tongue"]]
      ])}
      <aside className="application-photo">
        {(() => {
          const photoUrl = employee?.photoDataUrl || documents.find(d => d.category === "Candidate Photo")?.dataUrl;
          return photoUrl ? <img src={photoUrl} alt="Applicant photo" /> : <div style={{ border: "1px solid #94a3b8", height: 120, lineHeight: "120px", background: "#f8fafc" }}>Photo</div>;
        })()}
        {signature && <img className="application-signature" src={signature} alt="Specimen signature" />}
      </aside>
    </div>
    <h2>2. Language proficiency</h2>
    {(() => {
      const langEntries: [string, string][] = [];
      const seen = new Set<string>();

      // Check configured languages
      const standardLangs = applicationSections.find(s => s.title === "Language proficiency")?.fields || [];
      for (const key of standardLangs) {
        const val = data[key]?.trim();
        const langName = key.replace("Other Languages Proficiency [", "").replace("]", "").trim();
        if (val && val !== "None" && !seen.has(langName.toLowerCase())) {
          seen.add(langName.toLowerCase());
          langEntries.push([langName, val]);
        }
      }

      // Check any dynamic/custom languages in data
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith("Other Languages Proficiency [") && key.endsWith("]")) {
          const langName = key.replace("Other Languages Proficiency [", "").replace("]", "").trim();
          const level = typeof val === "string" ? val.trim() : "";
          if (level && level !== "None" && !seen.has(langName.toLowerCase())) {
            seen.add(langName.toLowerCase());
            langEntries.push([langName, level]);
          }
        }
      }

      if (data["Other Language"] && !seen.has(data["Other Language"].toLowerCase())) {
        const customName = data["Other Language"].trim();
        const customLevel = data[`Other Languages Proficiency [${customName}]`]?.trim() || "Read & Write";
        langEntries.push([customName, customLevel]);
        seen.add(customName.toLowerCase());
      }

      return langEntries.length > 0
        ? rows(langEntries)
        : rows([["Languages Known", "None specified / Not filled"]]);
    })()}
    <h2>3. Family profile</h2>
    {rows(applicationSections.filter(s => s.title.startsWith("Family - ")).flatMap(s => {
      const values = s.fields.map(k => data[k]).filter(Boolean);
      return values.length ? [[s.title.replace("Family - ", ""), values.join(" · ")] as [string, string]] : [];
    }))}
    <h2>4. Education &amp; qualifications</h2>
    {rows([["Highest Qualification", employee?.highestQualification], ...applicationSections.find(s => s.title === "Education profile")!.fields.map(key => [key, data[key]] as [string, string | undefined])])}
    <h2>5. Previous employment &amp; statutory</h2>
    {rows(applicationSections.filter(s => s.title.startsWith("Previous employment")).flatMap(s => {
      const values = s.fields.map(k => data[k]).filter(Boolean);
      return values.length ? [[s.title, values.join(" · ")] as [string, string]] : [];
    }))}
    {rows([
      ["ESI Number", formatCleanDigits(employee?.esiMasked)],
      ["PF / UAN Number", formatCleanDigits(employee?.uanMasked)],
    ])}
    <h2>6. Banking &amp; living details</h2>
    {rows([
      ["Bank Name", employee?.bankName],
      ["Account Number", formatCleanDigits(employee?.bankAccountMasked)],
      ["IFSC Code", employee?.ifscMasked],
      [
        "Branch Name",
        employee?.bankBranch &&
        employee.bankBranch !== employee.bankAccountMasked &&
        !/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(employee.bankBranch)
          ? employee.bankBranch
          : undefined,
      ],
      ["Own House?", data["Do you own House?"]],
      ["City / Town", data["If Yes, in which City / Town?"]],
    ])}
    <section className="application-declaration">
      <h2>7. Declaration &amp; signature</h2>
      <p>{data.Declaration || "I hereby declare that all the information provided above is true, complete, and correct to the best of my knowledge and belief."}</p>
      <p>Declaration date: {formatDisplayDate(data.Date) || formatDisplayDate(employee?.dateOfJoining) || "________________"}</p>
      <p><strong>Digital signature (typed name):</strong> {data["Digital Signature (Type your full name)"] || data["Digital signature"] || employee?.name || "________________"}</p>
      <p>Employee signature:</p>
      {signature ? <img className="application-signature application-declaration-signature" src={signature} alt="Declaration signature" /> : <p>____________________________</p>}
    </section>
    {applicationSections.filter(s => s.title === "Supporting document links").map(s => {
      const links = s.fields.filter(key => data[key]);
      return links.length ? <section key={s.title}><h2>Supporting document links</h2><p>Documents retain their existing access permissions.</p>{rows(links.map(key => [key, data[key]]))}</section> : null;
    })}
    {documents && documents.length > 0 && (
      <div className="application-attached-documents">
        {documents.map((doc, idx) => (
          <section key={idx} className="doc-page-break" style={{ pageBreakBefore: "always", breakBefore: "page", marginTop: "10mm", paddingTop: "6mm" }}>
            <h2 style={{ fontSize: "13pt", borderBottom: "2px solid #1e3a5f", paddingBottom: "2mm", color: "#1e3a5f" }}>
              Attached Verification Document: {doc.category}
            </h2>
            <p style={{ fontSize: "10pt", color: "#64748b", margin: "2mm 0 6mm" }}>
              File: {doc.filename}
            </p>
            <div style={{ textAlign: "center", width: "100%", display: "flex", justifyContent: "center" }}>
              {doc.dataUrl.startsWith("data:image/") ? (
                <img
                  src={doc.dataUrl}
                  alt={doc.category}
                  style={{ maxWidth: "100%", maxHeight: "220mm", objectFit: "contain", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                />
              ) : (
                <div style={{ padding: "24px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#f8fafc", textAlign: "left", width: "100%" }}>
                  <p style={{ fontSize: "11pt", fontWeight: 700, margin: "0 0 6px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <FileText size={16} /> Attached PDF Document: {doc.filename}
                  </p>
                  <p style={{ color: "#64748b", fontSize: "10pt", margin: 0 }}>This PDF attachment is preserved in the employee records and merged into the downloaded application package.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    )}
  </article>;
}

export default function EmployeeApplicationPreview({
  employee,
  vendor,
  onClose,
  loadDocuments,
  onReviewDocument,
  onReviewAllDocuments,
  onReuploadDocument,
  isSuperAdmin = false,
}: {
  employee?: Employee;
  vendor?: Vendor;
  onClose: () => void;
  loadDocuments: ApplicationRequest;
  onReviewDocument?: (category: string, decision: "approve" | "reject", rejectionReason?: string) => Promise<ApplicationDocument[] | void>;
  onReviewAllDocuments?: (decision: "approve" | "reject", rejectionReason?: string) => Promise<ApplicationDocument[] | void>;
  onReuploadDocument?: (category: string, filename: string, dataUrl: string) => Promise<ApplicationDocument[] | void>;
  isSuperAdmin?: boolean;
}) {
  const source = useRef<HTMLDivElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);
  const [reuploadTargetCategory, setReuploadTargetCategory] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [loading, setLoading] = useState(Boolean(employee));
  const [selectedDoc, setSelectedDoc] = useState<ApplicationDocument | null>(null);
  const [error, setError] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<ApplicationDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [photoUrl, setPhotoUrl] = useState(employee?.photoDataUrl || "");

  useEffect(() => {
    let active = true;
    if (employee) {
      loadDocuments(employee.id)
        .then((res: any) => {
          if (!active) return;
          const docs: ApplicationDocument[] = Array.isArray(res) ? res : res?.documents || [];
          setDocuments(docs);
          const photo = (res && typeof res === "object" && !Array.isArray(res) && res.photoDataUrl) ||
            docs.find(d => d.category === "Candidate Photo")?.dataUrl ||
            employee.photoDataUrl ||
            "";
          if (photo) setPhotoUrl(photo);
        })
        .catch(e => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [employee?.id]);

  const handleReview = async (category: string, decision: "approve" | "reject", reason?: string) => {
    if (!onReviewDocument) return;
    setActionBusy(true);
    setError("");
    setFeedbackMsg(null);
    try {
      const updated = await onReviewDocument(category, decision, reason);
      const nowIso = new Date().toISOString();
      if (Array.isArray(updated) && updated.length > 0) {
        setDocuments(updated);
        if (selectedDoc) {
          const match = updated.find(d => d.category === selectedDoc.category);
          if (match) setSelectedDoc(match);
        }
      } else {
        setDocuments(prev => prev.map(d => d.category === category ? {
          ...d,
          status: decision === "approve" ? "approved" : "rejected",
          rejectionReason: decision === "reject" ? (reason || "Document does not meet verification requirements") : null,
          reviewedBy: d.reviewedBy || (isSuperAdmin ? "Super Admin" : "Verified Reviewer"),
          reviewedAt: nowIso,
        } : d));
        if (selectedDoc && selectedDoc.category === category) {
          setSelectedDoc(prev => prev ? {
            ...prev,
            status: decision === "approve" ? "approved" : "rejected",
            rejectionReason: decision === "reject" ? (reason || "Document does not meet verification requirements") : null,
            reviewedBy: prev.reviewedBy || (isSuperAdmin ? "Super Admin" : "Verified Reviewer"),
            reviewedAt: nowIso,
          } : null);
        }
      }
      setFeedbackMsg({
        type: "success",
        text: decision === "approve" ? `Document "${category}" marked as Approved.` : `Document "${category}" marked as Rejected.`,
      });
      setRejectionTarget(null);
      setRejectionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record review");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReviewAll = async (decision: "approve" | "reject") => {
    if (!onReviewAllDocuments) return;
    setActionBusy(true);
    setError("");
    setFeedbackMsg(null);
    try {
      const updated = await onReviewAllDocuments(decision);
      const nowIso = new Date().toISOString();
      if (Array.isArray(updated) && updated.length > 0) {
        setDocuments(updated);
        if (selectedDoc) {
          const match = updated.find(d => d.category === selectedDoc.category);
          if (match) setSelectedDoc(match);
        }
      } else {
        setDocuments(prev => prev.map(d => ({
          ...d,
          status: decision === "approve" ? "approved" : "rejected",
          rejectionReason: null,
          reviewedBy: d.reviewedBy || (isSuperAdmin ? "Super Admin" : "Verified Reviewer"),
          reviewedAt: nowIso,
        })));
        if (selectedDoc) {
          setSelectedDoc(prev => prev ? {
            ...prev,
            status: decision === "approve" ? "approved" : "rejected",
            rejectionReason: null,
            reviewedBy: prev.reviewedBy || (isSuperAdmin ? "Super Admin" : "Verified Reviewer"),
            reviewedAt: nowIso,
          } : null);
        }
      }
      setFeedbackMsg({
        type: "success",
        text: decision === "approve" ? "All verification documents have been approved." : "All verification documents have been rejected.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to review all documents");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReuploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const category = reuploadTargetCategory;
    event.target.value = "";
    if (!file || !category || !onReuploadDocument) return;
    setActionBusy(true);
    setError("");
    setFeedbackMsg(null);
    try {
      const isAllowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type) || /\.(pdf|jpe?g|png|webp)$/i.test(file.name); if (!isAllowed) {
        throw new Error("Choose a valid PDF, PNG or JPEG file.");
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read file"));
        reader.readAsDataURL(file);
      });
      const updated = await onReuploadDocument(category, file.name, dataUrl);
      if (Array.isArray(updated) && updated.length > 0) {
        setDocuments(updated);
        if (selectedDoc) {
          const match = updated.find(d => d.category === category);
          if (match) setSelectedDoc(match);
        }
      } else {
        setDocuments(prev => prev.map(d => category === d.category ? { ...d, filename: file.name, dataUrl, status: "pending_approval", rejectionReason: null } : d));
        if (selectedDoc && selectedDoc.category === category) {
          setSelectedDoc({ category, filename: file.name, dataUrl, status: "pending_approval", rejectionReason: null });
        }
      }
      setFeedbackMsg({
        type: "success",
        text: `Document "${category}" re-uploaded successfully. Ready for Super Admin approval.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to re-upload document");
    } finally {
      setActionBusy(false);
      setReuploadTargetCategory(null);
    }
  };

  const aadhaarFront = documents.find(d => d.category === "Aadhar Front side");
  const aadhaarBack = documents.find(d => d.category === "Aadhar Back side");
  const rejectedCount = documents.filter(d => d.status === "rejected").length;
  const pendingCount = documents.filter(d => !d.status || d.status === "pending_approval").length;
  const unverifiedCount = documents.filter(d => !d.reviewedBy && d.status !== "rejected").length;

  return <div role="dialog" aria-modal="true" aria-label="Company application preview" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.65)", padding: 16, overflowY: "auto" }}>
    <input
      ref={reuploadInputRef}
      type="file"
      accept="application/pdf,image/png,image/jpeg"
      style={{ display: "none" }}
      onChange={handleReuploadFile}
    />
    <div style={{ maxWidth: 960, margin: "0 auto", background: "#fff", borderRadius: 12, paddingBottom: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
      <div style={{ position: "sticky", top: -16, background: "#fff", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", zIndex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="primary-button" disabled={printing || loading || Boolean(error)} onClick={async () => {
            if (!source.current) return; setPrinting(true);
            try { const { downloadApplicationPdf } = await import("../lib/application-pdf"); await downloadApplicationPdf(source.current, documents, employee?.employeeCode || "blank"); }
            catch (e) { setError(e instanceof Error ? e.message : "Unable to create PDF"); } finally { setPrinting(false); }
          }}>Download application + documents PDF</button>
          <button className="primary-button" disabled={printing} onClick={async () => {
            if (!source.current) return;
            setPrinting(true);
            try { await printIsolatedElement(source.current, "application"); } catch { window.alert("Unable to open print preview. Please try again."); } finally { setPrinting(false); }
          }}>{printing ? "Opening…" : "Print / Save as PDF"}</button>
          {isSuperAdmin && onReviewAllDocuments && documents.length > 0 && unverifiedCount > 0 && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleReviewAll("approve")}
              style={{ padding: "8px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <CheckCircle2 size={15} /> Verify All Documents ({unverifiedCount})
            </button>
          )}
        </div>
        <button className="secondary-button" onClick={onClose} style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <X size={14} /> Close
        </button>
      </div>

      <div style={{ padding: "12px 18px" }}>
        {loading ? <p role="status">Loading verification documents…</p> : error ? <p role="alert" style={{ color: "#b42318", background: "#fef2f2", padding: "8px 12px", borderRadius: 6 }}>{error}</p> : null}

        {/* Action Feedback Message */}
        {feedbackMsg && (
          <div style={{
            background: feedbackMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${feedbackMsg.type === "success" ? "#86efac" : "#fecaca"}`,
            color: feedbackMsg.type === "success" ? "#166534" : "#991b1b",
            padding: "8px 14px",
            borderRadius: 6,
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            fontSize: 13,
          }}>
            <span>{feedbackMsg.text}</span>
            <button type="button" onClick={() => setFeedbackMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Rejection Alert Notice for HR */}
        {rejectedCount > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 14, color: "#991b1b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={20} style={{ color: "#dc2626", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 14 }}>{rejectedCount} Document(s) Rejected by Super Admin</strong>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#b91c1c" }}>
                  Please review the rejection reason(s) below and click <strong>Re-upload</strong> to submit clear, updated copies for Super Admin verification.
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <strong style={{ fontSize: 15, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FolderCheck size={17} style={{ color: "#2563eb" }} /> Verification Documents ({documents.length})
              </strong>
              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
                {documents.filter(d => d.status === "approved").length} Approved · {pendingCount} Pending · {rejectedCount} Rejected
              </span>
            </div>
            {isSuperAdmin && (
              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: 4, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={13} /> Super Admin Verification Mode
              </span>
            )}
          </div>

          {documents.length > 0 && pendingCount === 0 && rejectedCount === 0 && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1.5px solid #86efac",
                borderRadius: "8px",
                padding: "8px 14px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#166534",
                fontWeight: 700,
                fontSize: "12.5px",
              }}
            >
              <span><CheckCircle2 size={16} style={{ color: "#166534" }} /></span>
              <span>All documents for this candidate are verified and approved by Super Admin.</span>
            </div>
          )}

          {/* Side-by-side Aadhaar Preview */}
          {(aadhaarFront || aadhaarBack) && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 13, color: "#1e40af", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FileCheck size={15} /> Aadhaar Card Verification (Front &amp; Back)
                </strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {[aadhaarFront, aadhaarBack].filter(Boolean).map((doc) => {
                  if (!doc) return null;
                  const isApproved = doc.status === "approved" && Boolean(doc.reviewedBy);
                  const isRejected = doc.status === "rejected";
                  const hasAdminReview = Boolean(doc.reviewedBy);
                  return (
                    <div key={doc.category} style={{ background: "#fff", padding: 10, borderRadius: 6, border: `1px solid ${isRejected ? "#fca5a5" : isApproved ? "#bbf7d0" : "#cbd5e1"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <small style={{ fontWeight: 700, color: "#334155", display: "block" }}>{doc.category === "Aadhar Front side" ? "Front Side" : "Back Side"}</small>
                          <span style={{ fontSize: 10, color: "#475569", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                            <Upload size={10} style={{ color: "#2563eb", flexShrink: 0 }} />
                            <span>Uploaded: <strong>{getDocumentUploadDate(doc, employee) || "Recent"}</strong>{doc.uploadedBy ? ` by ${doc.uploadedBy.includes("@") ? doc.uploadedBy.split("@")[0] : doc.uploadedBy}` : ""}</span>
                          </span>
                          {doc.reviewedBy ? (
                            <span style={{ fontSize: 10, color: isApproved ? "#15803d" : isRejected ? "#991b1b" : "#64748b", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                              {isApproved ? <CheckCircle2 size={10} /> : isRejected ? <XCircle size={10} /> : <Clock size={10} />}
                              <span>
                                {isApproved ? "Approved by: " : isRejected ? "Rejected by: " : "Reviewed by: "}<strong>{doc.reviewedBy}</strong>
                                {doc.reviewedAt ? ` (${new Date(doc.reviewedAt).toLocaleDateString()})` : ""}
                              </span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: "#92400e", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                              <Clock size={11} /> Awaiting Super Admin Review
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7",
                          color: isApproved ? "#166534" : isRejected ? "#991b1b" : "#92400e",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}>
                          {isApproved ? <><CheckCircle2 size={11} /> Approved</> : isRejected ? <><XCircle size={11} /> Rejected</> : <><Clock size={11} /> Pending</>}
                        </span>
                      </div>
                      <img src={doc.dataUrl} alt={doc.category} onClick={() => setSelectedDoc(doc)} style={{ width: "100%", maxHeight: 110, objectFit: "contain", cursor: "pointer", borderRadius: 4, border: "1px solid #e2e8f0" }} title="Click to view fullscreen" />
                      {isRejected && doc.rejectionReason && (
                        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#b91c1c", background: "#fef2f2", padding: "4px 6px", borderRadius: 4 }}>
                          <strong>Reason:</strong> {doc.rejectionReason}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                        {isSuperAdmin && onReviewDocument && (
                          <>
                            <button
                              type="button"
                              disabled={actionBusy || (isApproved && hasAdminReview)}
                              onClick={() => handleReview(doc.category, "approve")}
                              style={{
                                padding: "4px 10px",
                                fontSize: 11,
                                background: isApproved && hasAdminReview ? "#dcfce7" : "#059669",
                                color: isApproved && hasAdminReview ? "#15803d" : "#fff",
                                border: isApproved && hasAdminReview ? "1px solid #86efac" : "none",
                                borderRadius: 4,
                                cursor: isApproved && hasAdminReview ? "default" : "pointer",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {isApproved && hasAdminReview ? <><CheckCircle2 size={12} /> Approved</> : isApproved ? <><CheckCircle2 size={12} /> Verify as Admin</> : <><Check size={12} /> Approve</>}
                            </button>
                            <button
                              type="button"
                              disabled={actionBusy || isRejected}
                              onClick={() => setRejectionTarget(doc)}
                              style={{
                                padding: "4px 10px",
                                fontSize: 11,
                                background: isRejected ? "#fee2e2" : "#dc2626",
                                color: isRejected ? "#991b1b" : "#fff",
                                border: isRejected ? "1px solid #fca5a5" : "none",
                                borderRadius: 4,
                                cursor: isRejected ? "default" : "pointer",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {isRejected ? <><XCircle size={12} /> Rejected</> : <><X size={12} /> Reject</>}
                            </button>
                          </>
                        )}
                        {isRejected && onReuploadDocument && (
                          <button type="button" disabled={actionBusy} onClick={() => { setReuploadTargetCategory(doc.category); reuploadInputRef.current?.click(); }} style={{ padding: "4px 10px", fontSize: 11, background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Upload size={12} /> Re-upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Documents Thumbnail List */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {documents.filter(d => !d.category.startsWith("Aadhar")).map((doc, idx) => {
              const isApproved = doc.status === "approved" && Boolean(doc.reviewedBy);
              const isRejected = doc.status === "rejected";
              const hasAdminReview = Boolean(doc.reviewedBy);
              return (
                <div key={idx} style={{ padding: "8px 10px", background: "#fff", border: `1px solid ${isRejected ? "#fca5a5" : isApproved ? "#bbf7d0" : "#cbd5e1"}`, borderRadius: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                    <div style={{ cursor: "pointer", flex: 1 }} onClick={() => setSelectedDoc(doc)}>
                      <strong style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, color: "#1e293b" }}>
                        <Paperclip size={13} /> {doc.category}
                      </strong>
                      <span style={{ color: "#64748b", fontSize: 11, wordBreak: "break-all", display: "block" }}>{doc.filename}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#475569", marginTop: 2 }}>
                        <Upload size={10} style={{ color: "#2563eb", flexShrink: 0 }} />
                        <span>Uploaded: <strong>{getDocumentUploadDate(doc, employee) || "Recent"}</strong>{doc.uploadedBy ? ` by ${doc.uploadedBy.includes("@") ? doc.uploadedBy.split("@")[0] : doc.uploadedBy}` : ""}</span>
                      </span>
                      {doc.reviewedBy ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: isApproved ? "#15803d" : isRejected ? "#991b1b" : "#64748b", marginTop: 2 }}>
                          {isApproved ? <CheckCircle2 size={10} /> : isRejected ? <XCircle size={10} /> : <Clock size={10} />}
                          <span>
                            {isApproved ? "Approved by: " : isRejected ? "Rejected by: " : "Reviewed by: "}<strong>{doc.reviewedBy}</strong>
                            {doc.reviewedAt ? ` (${new Date(doc.reviewedAt).toLocaleDateString()})` : ""}
                          </span>
                        </span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#92400e", marginTop: 2 }}>
                          <Clock size={11} /> Awaiting Super Admin Review
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7",
                      color: isApproved ? "#166534" : isRejected ? "#991b1b" : "#92400e",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}>
                      {isApproved ? <><CheckCircle2 size={11} /> Approved</> : isRejected ? <><XCircle size={11} /> Rejected</> : <><Clock size={11} /> Pending</>}
                    </span>
                  </div>
                  {isRejected && doc.rejectionReason && (
                    <div style={{ fontSize: 11, color: "#991b1b", background: "#fef2f2", padding: "4px 6px", borderRadius: 4 }}>
                      <strong>Reason:</strong> {doc.rejectionReason}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", borderTop: "1px dashed #e2e8f0", paddingTop: 6 }}>
                    <button type="button" onClick={() => setSelectedDoc(doc)} style={{ padding: "3px 8px", fontSize: 11, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Eye size={12} /> View
                    </button>
                    {isSuperAdmin && onReviewDocument && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy || (isApproved && hasAdminReview)}
                          onClick={() => handleReview(doc.category, "approve")}
                          style={{
                            padding: "3px 8px",
                            fontSize: 11,
                            background: isApproved && hasAdminReview ? "#dcfce7" : "#059669",
                            color: isApproved && hasAdminReview ? "#15803d" : "#fff",
                            border: isApproved && hasAdminReview ? "1px solid #86efac" : "none",
                            borderRadius: 4,
                            cursor: isApproved && hasAdminReview ? "default" : "pointer",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isApproved && hasAdminReview ? <><CheckCircle2 size={12} /> Approved</> : <><Check size={12} /> Approve</>}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy || isRejected}
                          onClick={() => setRejectionTarget(doc)}
                          style={{
                            padding: "3px 8px",
                            fontSize: 11,
                            background: isRejected ? "#fee2e2" : "#dc2626",
                            color: isRejected ? "#991b1b" : "#fff",
                            border: isRejected ? "1px solid #fca5a5" : "none",
                            borderRadius: 4,
                            cursor: isRejected ? "default" : "pointer",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {isRejected ? <><XCircle size={12} /> Rejected</> : <><X size={12} /> Reject</>}
                        </button>
                      </>
                    )}
                    {isRejected && onReuploadDocument && (
                      <button type="button" disabled={actionBusy} onClick={() => { setReuploadTargetCategory(doc.category); reuploadInputRef.current?.click(); }} style={{ padding: "3px 8px", fontSize: 11, background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Upload size={12} /> Re-upload
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fullscreen Document Viewer Modal */}
      {selectedDoc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 11000, background: "rgba(0,0,0,0.85)", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 880, width: "100%", background: "#fff", borderRadius: 8, padding: 16, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid #e2e8f0", paddingBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{selectedDoc.category} · {selectedDoc.filename}</strong>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "#dcfce7" : selectedDoc.status === "rejected" ? "#fee2e2" : "#fef3c7",
                  color: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "#166534" : selectedDoc.status === "rejected" ? "#991b1b" : "#92400e",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? <><CheckCircle2 size={12} /> Approved</> : selectedDoc.status === "rejected" ? <><XCircle size={12} /> Rejected</> : <><Clock size={12} /> Pending Super Admin Approval</>}
                </span>
                <span style={{ fontSize: 11, color: "#475569", display: "inline-flex", alignItems: "center", gap: 4, background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>
                  <Upload size={11} style={{ color: "#2563eb" }} /> Uploaded: <strong>{getDocumentUploadDate(selectedDoc, employee) || "Recent"}</strong>{selectedDoc.uploadedBy ? ` by ${selectedDoc.uploadedBy.includes("@") ? selectedDoc.uploadedBy.split("@")[0] : selectedDoc.uploadedBy}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {isSuperAdmin && onReviewDocument && (
                  <>
                    <button
                      type="button"
                      disabled={actionBusy || (selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy))}
                      onClick={() => handleReview(selectedDoc.category, "approve")}
                      style={{
                        padding: "4px 10px",
                        background: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "#dcfce7" : "#059669",
                        color: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "#15803d" : "#fff",
                        border: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "1px solid #86efac" : "none",
                        borderRadius: 4,
                        cursor: selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? "default" : "pointer",
                        fontWeight: 700,
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {selectedDoc.status === "approved" && Boolean(selectedDoc.reviewedBy) ? <><CheckCircle2 size={12} /> Approved</> : selectedDoc.status === "approved" ? <><CheckCircle2 size={12} /> Verify as Admin</> : <><Check size={12} /> Approve</>}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || selectedDoc.status === "rejected"}
                      onClick={() => setRejectionTarget(selectedDoc)}
                      style={{
                        padding: "4px 10px",
                        background: selectedDoc.status === "rejected" ? "#fee2e2" : "#dc2626",
                        color: selectedDoc.status === "rejected" ? "#991b1b" : "#fff",
                        border: selectedDoc.status === "rejected" ? "1px solid #fca5a5" : "none",
                        borderRadius: 4,
                        cursor: selectedDoc.status === "rejected" ? "default" : "pointer",
                        fontWeight: 700,
                        fontSize: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {selectedDoc.status === "rejected" ? <><XCircle size={12} /> Rejected</> : <><X size={12} /> Reject</>}
                    </button>
                  </>
                )}
                {selectedDoc.status === "rejected" && onReuploadDocument && (
                  <button type="button" disabled={actionBusy} onClick={() => { setReuploadTargetCategory(selectedDoc.category); reuploadInputRef.current?.click(); }} style={{ padding: "4px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Upload size={12} /> Re-upload
                  </button>
                )}
                <button type="button" onClick={() => setSelectedDoc(null)} style={{ padding: "4px 12px", background: "#64748b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <X size={14} /> Close
                </button>
              </div>
            </div>
            {selectedDoc.status === "rejected" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "6px 12px", borderRadius: 6, fontSize: 12, color: "#991b1b", marginBottom: 8 }}>
                <strong>Rejection Reason:</strong> {selectedDoc.rejectionReason || "Verification failed"}
                {selectedDoc.reviewedBy ? <span style={{ marginLeft: 8 }}>— Rejected by: <strong>{selectedDoc.reviewedBy}</strong>{selectedDoc.reviewedAt ? ` on ${new Date(selectedDoc.reviewedAt).toLocaleDateString()}` : ""}</span> : null}
              </div>
            )}
            {selectedDoc.status === "approved" && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 6, fontSize: 12, color: "#166534", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                <span>
                  {selectedDoc.reviewedBy ? (
                    <>Verified and Approved by <strong>{selectedDoc.reviewedBy}</strong>{selectedDoc.reviewedAt ? ` on ${new Date(selectedDoc.reviewedAt).toLocaleDateString()}` : ""}</>
                  ) : (
                    <>Pre-existing document record. Click <strong>Verify as Admin</strong> to record your Super Admin verification approval.</>
                  )}
                </span>
              </div>
            )}
            <div style={{ flex: 1, overflow: "auto", textAlign: "center", background: "#0f172a", borderRadius: 6, padding: 8 }}>
              {selectedDoc.dataUrl.startsWith("data:image/") ? (
                <img src={selectedDoc.dataUrl} alt={selectedDoc.category} style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain" }} />
              ) : (
                <iframe src={selectedDoc.dataUrl} title={selectedDoc.filename} style={{ width: "100%", height: "72vh", border: "none", background: "#fff", borderRadius: 4 }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Rejection Reason Prompt Modal */}
      {rejectionTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,0.7)", padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: 500, width: "100%", background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#991b1b", display: "flex", alignItems: "center", gap: 6 }}>
              <XCircle size={18} /> Reject Verification Document
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#475569" }}>
              Rejecting <strong>{rejectionTarget.category}</strong> ({rejectionTarget.filename}). A rejection notice will be flagged for the respective HR to re-upload.
            </p>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#334155" }}>
              Quick Preset Reasons:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {[
                "Image is blurry or details are not clearly visible",
                "Name / DOB does not match employee master data",
                "Document is expired or invalid format",
                "Bank account number or IFSC code is illegible",
                "Wrong document uploaded for this category",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    background: rejectionReason === reason ? "#fee2e2" : "#f8fafc",
                    border: `1px solid ${rejectionReason === reason ? "#f87171" : "#e2e8f0"}`,
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    color: "#334155",
                  }}
                >
                  • {reason}
                </button>
              ))}
            </div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#334155" }}>
              Custom / Specific Rejection Note:
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter details explaining why this document is rejected..."
              style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => { setRejectionTarget(null); setRejectionReason(""); }}
                style={{ padding: "8px 14px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleReview(rejectionTarget.category, "reject", rejectionReason || "Document does not meet verification requirements")}
                style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >
                {actionBusy ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}><div ref={source}><EmployeeApplicationDocument employee={photoUrl && employee ? { ...employee, photoDataUrl: photoUrl } : employee} vendor={vendor} documents={documents} /></div></div>
    </div>
  </div>;
}
