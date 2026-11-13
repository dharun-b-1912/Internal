"use client";
import { useEffect, useState, type FormEvent } from "react";
import { applicationSections, DOCUMENT_CATEGORIES, type ApplicationDocument } from "../lib/employee-application";
import { FreshOnboarding, type NewApplicant } from "./fresh-onboarding";
import type { ClientUnit, Vendor, Employee } from "./payroll-app";
import { SignaturePad } from "./signature-pad";
import {
  UserPlus, Mail, Link2, Copy, MessageSquare, MessageCircle, Share2,
  Check, AlertTriangle, CheckCircle2, User, Globe, Activity, HeartHandshake,
  Users, Home, Clock, Trash2, Camera, FileText, FileCheck, ArrowRight
} from "lucide-react";

export async function onboardingRequest(endpoint: string, key: string | undefined, payload: Record<string, unknown>, accessToken?: string) {
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...(key ? { apikey: key } : {}), ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Onboarding service unavailable. Ask the administrator to deploy the employee-onboarding function.");
  return result;
}

const overlay = { position: "fixed" as const, inset: 0, zIndex: 10000, overflowY: "auto" as const, background: "rgba(15,23,42,.65)", padding: 16 };
const card = { maxWidth: 780, margin: "20px auto", background: "white", color: "#172b4d", borderRadius: 16, padding: 24, fontSize: 16, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" };

async function compressImageFile(file: File): Promise<{ filename: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ filename: file.name, dataUrl: String(reader.result) });
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

export function OnboardingInvite(props: { employees: Employee[]; initialEmployee?: Employee; endpoint: string; publishableKey?: string; accessToken?: string; onClose: () => void; vendors?: Vendor[]; units?: ClientUnit[]; vendorId?: string; unitId?: string; onReview?: (applicant: NewApplicant) => void }) {
  const [mode, setMode] = useState(props.initialEmployee ? "existing" : "new");
  if (mode === "existing" || !props.vendors || !props.units || !props.onReview) return <ExistingOnboardingInvite {...props} onSwitchMode={() => setMode("new")} hasNewMode={Boolean(props.vendors && props.units && props.onReview)} />;
  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="fresh-title">
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 id="fresh-title" style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 800, display: "flex", alignItems: "center" }}>
            <UserPlus size={20} style={{ color: "#2563eb", marginRight: 8 }} /> New Candidate Onboarding
          </h2>
          <button type="button" onClick={props.onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <button type="button" className="secondary-button" onClick={() => setMode("existing")}>Switch to Existing Employee Invitation</button>
        </div>
        <FreshOnboarding vendors={props.vendors} units={props.units} vendorId={props.vendorId || ""} unitId={props.unitId || ""} endpoint={props.endpoint} publishableKey={props.publishableKey} accessToken={props.accessToken} onReview={props.onReview} />
        <div style={{ marginTop: 16 }}>
          <button type="button" className="secondary-button" onClick={props.onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function ExistingOnboardingInvite({ employees, initialEmployee, endpoint, publishableKey, accessToken, onClose, onSwitchMode, hasNewMode }: { employees: Employee[]; initialEmployee?: Employee; endpoint: string; publishableKey?: string; accessToken?: string; onClose: () => void; onSwitchMode?: () => void; hasNewMode?: boolean }) {
  const [employeeId, setEmployeeId] = useState(initialEmployee?.id || "");
  const [email, setEmail] = useState(initialEmployee?.emailAddress || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  const employee = employees.find(e => e.id === employeeId);

  const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());

  const handleEmployeeChange = (newId: string) => {
    setEmployeeId(newId);
    const emp = employees.find(e => e.id === newId);
    setEmail(emp?.emailAddress || "");
    setLink("");
    setMessage("");
    setError("");
  };

  async function create(sendEmail: boolean) {
    if (busy) return;
    if (sendEmail && !isValidEmail(email)) {
      setError("Please enter a valid email address to send the invitation.");
      return;
    }
    setBusy(true); setError(""); setMessage(""); setLink("");
    try {
      const result = await onboardingRequest(endpoint, publishableKey, { action: "create", employeeId: employeeId || undefined, email: email.trim(), sendEmail }, accessToken);
      setLink(result.link);
      setMessage(result.sent ? `Invitation sent successfully to ${result.recipient || email.trim()}.` : "Your onboarding link is ready to share.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create invitation"); } finally { setBusy(false); }
  }

  const shareText = `Hello ${employee?.name || "Candidate"}, please complete your Joy Payroll employee application: ${link}`;
  const digits = (employee?.mobileNumber || "").replace(/\D/g, "");
  const mobile = digits.length === 10 ? `91${digits}` : digits;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Invitation link copied to clipboard.");
    } catch {
      setError("Select the link below and copy it manually.");
    }
  }

  const canSendEmail = Boolean(isValidEmail(email) && !busy);
  const canCreateLink = Boolean(!busy);

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 id="invite-title" style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 800, display: "flex", alignItems: "center" }}>
            <Mail size={20} style={{ color: "#2563eb", marginRight: 8 }} /> Invite Candidate for Onboarding
          </h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b" }}>
          Enter the candidate's email address to send an invitation email, or create a direct link to share over WhatsApp/SMS.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
              Candidate Email ID {employeeId ? "(Optional)" : "*"}
            </span>
            <input
              type="email"
              autoFocus
              placeholder="e.g. candidate@example.com"
              value={email}
              disabled={busy}
              onChange={e => {
                setEmail(e.target.value);
                setError("");
                setMessage("");
              }}
              style={{ width: "100%", fontSize: 15, padding: "10px 12px", borderRadius: 8, border: isValidEmail(email) ? "2px solid #10b981" : "1px solid #cbd5e1", background: "#f8fafc" }}
            />
          </label>

          <label style={{ display: "block" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 }}>
              Link to Existing Employee (Optional)
            </span>
            <select
              value={employeeId}
              disabled={busy}
              onChange={e => handleEmployeeChange(e.target.value)}
              style={{ width: "100%", fontSize: 14, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155" }}
            >
              <option value="">-- Optional: New Candidate (No existing employee record) --</option>
              {employees.filter(e => e.status === "active").map(e => (
                <option key={e.id} value={e.id}>{e.employeeCode} · {e.name}</option>
              ))}
            </select>
          </label>

          {employee && (
            <div style={{ padding: "10px 14px", background: "#f1f5f9", borderRadius: 8, fontSize: 13, color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span><strong>Selected Employee:</strong> {employee.name} ({employee.employeeCode})</span>
              <span><strong>Designation:</strong> {employee.department || "Standard"}</span>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              className="primary-button"
              disabled={!canSendEmail}
              onClick={() => void create(true)}
              style={{ flex: "1 1 180px", padding: "12px 18px", fontSize: 15, fontWeight: 700, borderRadius: 8, cursor: canSendEmail ? "pointer" : "not-allowed", opacity: canSendEmail ? 1 : 0.5, background: "#2563eb", color: "#fff", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {busy ? "Sending…" : (
                <>
                  <Mail size={16} /> Send email invitation
                </>
              )}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!canCreateLink}
              onClick={() => void create(false)}
              style={{ flex: "1 1 160px", padding: "12px 18px", fontSize: 15, fontWeight: 600, borderRadius: 8, cursor: canCreateLink ? "pointer" : "not-allowed", opacity: canCreateLink ? 1 : 0.5, background: "#f1f5f9", color: "#1e293b", border: "1px solid #cbd5e1", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Link2 size={16} /> Create sharing link
            </button>
          </div>

          {link && (
            <div style={{ marginTop: 8, padding: 14, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#166534", display: "block", marginBottom: 4 }}>
                  Personal Onboarding Link
                </span>
                <input
                  readOnly
                  value={link}
                  onFocus={e => e.target.select()}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 6, border: "1px solid #86efac", background: "#fff" }}
                />
              </label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => void copy()} style={{ padding: "8px 14px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Copy size={14} /> Copy link
                </button>
                {mobile && (
                  <>
                    <a href={`sms:+${mobile}?body=${encodeURIComponent(shareText)}`} style={{ padding: "8px 14px", background: "#e2e8f0", color: "#1e293b", textDecoration: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MessageSquare size={14} /> SMS
                    </a>
                    <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${mobile}?text=${encodeURIComponent(shareText)}`} style={{ padding: "8px 14px", background: "#25d366", color: "#fff", textDecoration: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  </>
                )}
                <button type="button" onClick={async () => { if (!navigator.share) return void copy(); try { await navigator.share({ title: "Joy Payroll onboarding", text: shareText }); } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setError("Unable to share. Please use Copy link."); } }} style={{ padding: "8px 14px", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Share2 size={14} /> Mobile share
                </button>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#15803d" }}>
                Valid for 7 days. When candidate completes the form, details and documents will automatically link to their employee profile.
              </p>
            </div>
          )}

          {message && (
            <div role="status" style={{ padding: "10px 14px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={16} /> {message}
            </div>
          )}

          {error && (
            <div role="alert" style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" disabled={busy} onClick={onClose} style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EmployeeOnboardingForm({ endpoint, publishableKey, invitation }: { endpoint: string; publishableKey: string; invitation: string }) {
  const separator = invitation.lastIndexOf(".");
  const employeeId = invitation.slice(0, separator), token = invitation.slice(separator + 1);
  const [name, setName] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fields, setFields] = useState<Record<string, string>>({
    Date: new Date().toISOString().slice(0, 10),
    "Position Applied For": "",
    "Permanent Address": "",
    "Contact person name": "",
    "Contact person relationship": "",
    "Father - Name": "",
    "Father - Monthly Income": "",
    "Mother - Monthly Income": "",
    "Height (cm)": "",
    "Weight (kg)": "",
    "Do you smoke?": "No",
    "Marital Status": "Single",
    "Spouse - Name": "",
    "Spouse - Contact": "",
    "Spouse - Address": "",
    "Sibling 1 - Name": "",
    "Sibling 1 - Relationship": "Brother",
    "Sibling 1 - Contact": "",
    "Sibling 1 - Address": "",
    "Do you own House?": "No",
    "If Yes, in which City / Town?": "",
    "10th / SSLC Details": "",
    "Employment 1 - Company Name": "",
    Declaration: "",
    "Digital Signature (Type your full name)": ""
  });
  const [hasSiblings, setHasSiblings] = useState<boolean>(false);
  const [hasSecondSibling, setHasSecondSibling] = useState<boolean>(false);
  
  // Language proficiencies: { Tamil: "Read & Write", English: "Speak Only", ... }
  const [langProficiency, setLangProficiency] = useState<Record<string, string>>({
    Tamil: "Read & Write",
    English: "Read & Write"
  });
  const [otherLangName, setOtherLangName] = useState("");
  const [otherLangProf, setOtherLangProf] = useState<string>("Read & Write");

  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    if (token === "demo" || !token) {
      setName("Candidate (Local Preview)");
      return;
    }
    onboardingRequest(endpoint, publishableKey, { action: "read", employeeId, token })
      .then(r => { if (active) setName(r.name || "Candidate"); })
      .catch(e => {
        if (active) {
          setName("Candidate (Local Test Mode)");
        }
      });
    return () => { active = false; };
  }, [endpoint, publishableKey, employeeId, token]);

  const handleFileUpload = async (category: string, file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploadProgress(`Compressing & preparing ${file.name}…`);
    try {
      const compressed = await compressImageFile(file);
      setDocuments(prev => [...prev.filter(d => d.category !== category), { category, filename: compressed.filename, dataUrl: compressed.dataUrl }]);
      setUploadProgress("");
    } catch (err) {
      setUploadProgress("");
      setError(err instanceof Error ? err.message : "Failed to process photo.");
    }
  };

  const removeDoc = (category: string) => {
    setDocuments(prev => prev.filter(d => d.category !== category));
  };

  const setLanguageLevel = (lang: string, level: string) => {
    setLangProficiency(prev => {
      const next = { ...prev };
      if (next[lang] === level) {
        delete next[lang];
      } else {
        next[lang] = level;
      }
      return next;
    });
  };

  const hasAadhaarFront = documents.some(d => d.category === "Aadhar Front side" && d.dataUrl);
  const hasAadhaarBack = documents.some(d => d.category === "Aadhar Back side" && d.dataUrl);

  const goToStep2 = () => {
    setError("");
    setStep(2);
  };

  const goToStep3 = () => {
    setError("");
    if (!hasAadhaarFront || !hasAadhaarBack) {
      setError("Please take/upload both Aadhaar Front and Back photos before continuing.");
      return;
    }
    setStep(3);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (!hasAadhaarFront || !hasAadhaarBack) {
      setError("Aadhaar Card (both Front & Back photos) is required before submitting your application.");
      setStep(2);
      return;
    }

    if (!fields.Declaration || !fields["Digital Signature (Type your full name)"]) {
      setError("Please accept the declaration and enter your full name as digital signature.");
      return;
    }

    setBusy(true);
    // Combine languages into fields for backward compatibility
    const submissionFields = { ...fields };
    Object.entries(langProficiency).forEach(([lang, level]) => {
      if (level) {
        submissionFields[`Other Languages Proficiency [${lang}]`] = level;
      }
    });
    if (otherLangName.trim() && otherLangProf) {
      submissionFields[`Other Languages Proficiency [${otherLangName.trim()}]`] = otherLangProf;
    }
    delete submissionFields["Other Language"];
    if (fields["Signature image"]) {
      submissionFields["Signature image"] = fields["Signature image"];
    }

    const submissionDocuments = [...documents];
    if (fields["Signature image"]) {
      const existingIdx = submissionDocuments.findIndex(d => d.category === "Candidate Signature");
      if (existingIdx >= 0) {
        submissionDocuments[existingIdx] = {
          category: "Candidate Signature",
          filename: "signature.png",
          dataUrl: fields["Signature image"]
        };
      } else {
        submissionDocuments.push({
          category: "Candidate Signature",
          filename: "signature.png",
          dataUrl: fields["Signature image"]
        });
      }
    }

    try {
      await onboardingRequest(endpoint, publishableKey, {
        action: "submit",
        employeeId,
        token,
        fields: submissionFields,
        documents: submissionDocuments
      });
      setDone(true);
      setFields({});
      setDocuments([]);
      history.replaceState(null, "", location.pathname);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit application. Please contact HR.");
    } finally {
      setBusy(false);
    }
  }

  const standardLanguages = ["Tamil", "English", "Hindi", "Telugu", "Malayalam", "Kannada"];

  return <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)", padding: "24px 12px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
    <section style={{ maxWidth: 800, margin: "0 auto", background: "#ffffff", borderRadius: 16, padding: "24px 20px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <header style={{ borderBottom: "2px solid #e2e8f0", paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>
            J
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, color: "#0f172a", fontWeight: 800 }}>Joy Corporate Solutions</h1>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>Candidate Digital Onboarding &amp; Statutory Portal</p>
          </div>
        </div>
      </header>

      {done ? (
        <div style={{ textAlign: "center", padding: "40px 16px" }}>
          <CheckCircle2 size={56} style={{ color: "#059669", margin: "0 auto 12px", display: "block" }} />
          <h2 style={{ color: "#0f766e", margin: "0 0 10px", fontSize: 22 }}>Application Submitted Successfully!</h2>
          <p style={{ color: "#334155", fontSize: 16, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.5 }}>
            Your details and verification documents have been received by the HR department. You can now close this page.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#d1fae5", color: "#065f46", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
            <Check size={16} /> Reference Token Verified &amp; Saved
          </div>
        </div>
      ) : (
        <>
          {/* 3-Step Wizard Navigation Indicator */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, padding: "10px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ textAlign: "center", borderBottom: step === 1 ? "3px solid #2563eb" : "3px solid transparent", paddingBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: step === 1 ? "#2563eb" : "#64748b" }}>1. Personal &amp; Family Info</span>
            </div>
            <div style={{ textAlign: "center", borderBottom: step === 2 ? "3px solid #2563eb" : "3px solid transparent", paddingBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: step === 2 ? "#2563eb" : "#64748b" }}>2. Documents *</span>
            </div>
            <div style={{ textAlign: "center", borderBottom: step === 3 ? "3px solid #2563eb" : "3px solid transparent", paddingBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: step === 3 ? "#2563eb" : "#64748b" }}>3. Declaration</span>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 14, color: "#166534" }}>
            Welcome <strong>{name}</strong>! Fill in your details below.
          </div>

          {error && (
            <div role="alert" style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #f87171", padding: "10px 14px", borderRadius: 8, marginBottom: 18, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* STEP 1: Personal & Family Information */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. Basic & Position Details */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <User size={18} style={{ color: "#2563eb" }} /> Candidate &amp; Contact Details
                  </h3>
                  
                  {/* Candidate / Form Filler Full Name */}
                  <label style={{ display: "block", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", display: "block", marginBottom: 4 }}>
                      Full Name of Candidate (Form Filler) *
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Enter candidate's full legal name as per Aadhaar"
                      value={fields["Applicant Name"] !== undefined ? fields["Applicant Name"] : (name.startsWith("Candidate (") ? "" : name)}
                      onChange={e => {
                        const val = e.target.value;
                        setFields({ ...fields, ["Applicant Name"]: val });
                        if (val) setName(val);
                      }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "2px solid #3b82f6", fontSize: 15, fontWeight: 600, background: "#f0f7ff" }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                      * Make sure this matches the exact name printed on your Aadhaar card.
                    </span>
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Position Applied For</span>
                      <input type="text" placeholder="e.g. Machine Operator, Electrician, Helper" value={fields["Position Applied For"] || ""} onChange={e => setFields({ ...fields, ["Position Applied For"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Father's Name</span>
                      <input type="text" placeholder="Father's full name" value={fields["Father - Name"] || ""} onChange={e => setFields({ ...fields, ["Father - Name"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Emergency Contact Person Name</span>
                      <input type="text" placeholder="Family member or relative name" value={fields["Contact person name"] || ""} onChange={e => setFields({ ...fields, ["Contact person name"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Emergency Contact Relationship</span>
                      <select value={fields["Contact person relationship"] || ""} onChange={e => setFields({ ...fields, ["Contact person relationship"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}>
                        <option value="">Select Relationship</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Spouse">Spouse (Husband/Wife)</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Relative / Friend">Relative / Friend</option>
                      </select>
                    </label>
                  </div>

                  <label style={{ display: "block", marginTop: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Permanent Residential Address</span>
                    <textarea rows={2} placeholder="Door No, Street, Village/Town, District, State, PIN code" value={fields["Permanent Address"] || ""} onChange={e => setFields({ ...fields, ["Permanent Address"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 12 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Highest Education Qualification</span>
                      <select value={fields["10th / SSLC Details"] || ""} onChange={e => setFields({ ...fields, ["10th / SSLC Details"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}>
                        <option value="">Select Qualification</option>
                        <option value="10th / SSLC">10th / SSLC</option>
                        <option value="12th / Higher Secondary">12th / Higher Secondary</option>
                        <option value="ITI / Technical Diploma">ITI / Technical Diploma</option>
                        <option value="Graduation / Degree">Graduation / Degree (B.A, B.Sc, B.E, etc.)</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="Below 10th">Below 10th</option>
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Previous Employer (If any)</span>
                      <input type="text" placeholder="Previous company name or None" value={fields["Employment 1 - Company Name"] || ""} onChange={e => setFields({ ...fields, ["Employment 1 - Company Name"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>
                  </div>
                </div>

                {/* 2. Language Proficiency (Read/Write, Speak Only, Other) */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 6px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Globe size={18} style={{ color: "#2563eb" }} /> Language Proficiency
                  </h3>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>Select whether you can <strong>Read &amp; Write</strong> or <strong>Speak Only</strong> for each language.</p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
                    {standardLanguages.map(lang => {
                      const level = langProficiency[lang] || "";
                      return (
                        <div key={lang} style={{ padding: "10px 12px", background: level ? "#eff6ff" : "#fff", border: level ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: 8 }}>
                          <strong style={{ fontSize: 14, color: "#1e293b", display: "block", marginBottom: 6 }}>{lang}</strong>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" onClick={() => setLanguageLevel(lang, "Read & Write")} style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: level === "Read & Write" ? "2px solid #2563eb" : "1px solid #cbd5e1", background: level === "Read & Write" ? "#2563eb" : "#fff", color: level === "Read & Write" ? "#fff" : "#475569", fontSize: 11, fontWeight: level === "Read & Write" ? 700 : 500, cursor: "pointer" }}>
                              Read &amp; Write
                            </button>
                            <button type="button" onClick={() => setLanguageLevel(lang, "Speak Only")} style={{ flex: 1, padding: "5px 8px", borderRadius: 5, border: level === "Speak Only" ? "2px solid #0284c7" : "1px solid #cbd5e1", background: level === "Speak Only" ? "#0284c7" : "#fff", color: level === "Speak Only" ? "#fff" : "#475569", fontSize: 11, fontWeight: level === "Speak Only" ? 700 : 500, cursor: "pointer" }}>
                              Speak Only
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Other Language Input */}
                  <div style={{ marginTop: 14, padding: "12px", background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>Other Language (Optional)</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <input type="text" placeholder="Specify language (e.g. Marathi, French)" value={otherLangName} onChange={e => setOtherLangName(e.target.value)} style={{ flex: "1 1 180px", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => setOtherLangProf("Read & Write")} style={{ padding: "8px 12px", borderRadius: 6, border: otherLangProf === "Read & Write" ? "2px solid #2563eb" : "1px solid #cbd5e1", background: otherLangProf === "Read & Write" ? "#2563eb" : "#fff", color: otherLangProf === "Read & Write" ? "#fff" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Read &amp; Write
                        </button>
                        <button type="button" onClick={() => setOtherLangProf("Speak Only")} style={{ padding: "8px 12px", borderRadius: 6, border: otherLangProf === "Speak Only" ? "2px solid #0284c7" : "1px solid #cbd5e1", background: otherLangProf === "Speak Only" ? "#0284c7" : "#fff", color: otherLangProf === "Speak Only" ? "#fff" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Speak Only
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Physical Information & Lifestyle */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Activity size={18} style={{ color: "#2563eb" }} /> Physical Details &amp; Lifestyle
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Height (cm)</span>
                      <input type="number" placeholder="e.g. 170" value={fields["Height (cm)"] || ""} onChange={e => setFields({ ...fields, ["Height (cm)"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Weight (kg)</span>
                      <input type="number" placeholder="e.g. 65" value={fields["Weight (kg)"] || ""} onChange={e => setFields({ ...fields, ["Weight (kg)"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Gender</span>
                      <select value={fields["Gender"] || ""} onChange={e => setFields({ ...fields, ["Gender"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Do you smoke?</span>
                      <select value={fields["Do you smoke?"] || "No"} onChange={e => setFields({ ...fields, ["Do you smoke?"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}>
                        <option value="No">No (Non-smoker)</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </label>
                  </div>
                </div>

                {/* 4. Marital Status & Spouse Details */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <HeartHandshake size={18} style={{ color: "#2563eb" }} /> Marital Status &amp; Spouse
                  </h3>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Marital Status</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["Single", "Married", "Divorced", "Widowed"].map(status => (
                        <button key={status} type="button" onClick={() => setFields({ ...fields, "Marital Status": status })} style={{ padding: "8px 18px", borderRadius: 20, border: fields["Marital Status"] === status ? "2px solid #2563eb" : "1px solid #cbd5e1", background: fields["Marital Status"] === status ? "#2563eb" : "#fff", color: fields["Marital Status"] === status ? "#fff" : "#475569", fontWeight: fields["Marital Status"] === status ? 700 : 500, fontSize: 14, cursor: "pointer" }}>
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {fields["Marital Status"] === "Married" && (
                    <div style={{ marginTop: 14, padding: "14px", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
                      <strong style={{ fontSize: 14, color: "#1e40af", display: "block", marginBottom: 10 }}>Spouse Information</strong>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                        <label style={{ display: "block" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Spouse (Husband / Wife) Name *</span>
                          <input type="text" placeholder="Full name of spouse" value={fields["Spouse - Name"] || ""} onChange={e => setFields({ ...fields, ["Spouse - Name"]: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                        </label>

                        <label style={{ display: "block" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Spouse Contact Number</span>
                          <input type="tel" placeholder="10-digit mobile number" value={fields["Spouse - Contact"] || ""} onChange={e => setFields({ ...fields, ["Spouse - Contact"]: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                        </label>
                      </div>

                      <label style={{ display: "block", marginTop: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Spouse Residential Address</span>
                        <input type="text" placeholder="Address (or 'Same as Permanent Address')" value={fields["Spouse - Address"] || ""} onChange={e => setFields({ ...fields, ["Spouse - Address"]: e.target.value })} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                    </div>
                  )}
                </div>

                {/* 5. Siblings Details */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <Users size={18} style={{ color: "#2563eb" }} /> Siblings (Brothers / Sisters)
                    </h3>
                    <button type="button" onClick={() => setHasSiblings(!hasSiblings)} style={{ padding: "5px 12px", borderRadius: 16, border: hasSiblings ? "2px solid #10b981" : "1px solid #cbd5e1", background: hasSiblings ? "#ecfdf5" : "#fff", color: hasSiblings ? "#065f46" : "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {hasSiblings ? "I have Siblings" : "+ Add Siblings"}
                    </button>
                  </div>

                  {hasSiblings && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Sibling 1 */}
                      <div style={{ padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                        <strong style={{ fontSize: 13, color: "#334155", display: "block", marginBottom: 8 }}>Sibling 1 Details</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                          <label style={{ display: "block" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Sibling Name</span>
                            <input type="text" placeholder="Name" value={fields["Sibling 1 - Name"] || ""} onChange={e => setFields({ ...fields, ["Sibling 1 - Name"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                          </label>

                          <label style={{ display: "block" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Relationship</span>
                            <select value={fields["Sibling 1 - Relationship"] || "Brother"} onChange={e => setFields({ ...fields, ["Sibling 1 - Relationship"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                            </select>
                          </label>

                          <label style={{ display: "block" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Contact Number</span>
                            <input type="tel" placeholder="Mobile number" value={fields["Sibling 1 - Contact"] || ""} onChange={e => setFields({ ...fields, ["Sibling 1 - Contact"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                          </label>
                        </div>

                        <label style={{ display: "block", marginTop: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Address / Location</span>
                          <input type="text" placeholder="Address or Location" value={fields["Sibling 1 - Address"] || ""} onChange={e => setFields({ ...fields, ["Sibling 1 - Address"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                        </label>
                      </div>

                      {/* Sibling 2 */}
                      {hasSecondSibling ? (
                        <div style={{ padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <strong style={{ fontSize: 13, color: "#334155" }}>Sibling 2 Details</strong>
                            <button type="button" onClick={() => setHasSecondSibling(false)} style={{ color: "#ef4444", fontSize: 12, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Remove</button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                            <label style={{ display: "block" }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Sibling Name</span>
                              <input type="text" placeholder="Name" value={fields["Sibling 2 - Name"] || ""} onChange={e => setFields({ ...fields, ["Sibling 2 - Name"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                            </label>

                            <label style={{ display: "block" }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Relationship</span>
                              <select value={fields["Sibling 2 - Relationship"] || "Sister"} onChange={e => setFields({ ...fields, ["Sibling 2 - Relationship"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                              </select>
                            </label>

                            <label style={{ display: "block" }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Contact Number</span>
                              <input type="tel" placeholder="Mobile number" value={fields["Sibling 2 - Contact"] || ""} onChange={e => setFields({ ...fields, ["Sibling 2 - Contact"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setHasSecondSibling(true)} style={{ padding: "8px", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 6, fontSize: 13, color: "#1e40af", fontWeight: 600, cursor: "pointer" }}>
                          + Add Sibling 2
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. House Details & Family Incomes */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Home size={18} style={{ color: "#2563eb" }} /> House Details &amp; Family Income
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Do you own House?</span>
                      <select value={fields["Do you own House?"] || "No"} onChange={e => setFields({ ...fields, ["Do you own House?"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15, background: "#fff" }}>
                        <option value="No">No (Rented House)</option>
                        <option value="Yes">Yes (Own House)</option>
                        <option value="Living with Parents">Living with Parents</option>
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>If Yes, in which City / Town?</span>
                      <input type="text" placeholder="City or Village Name" value={fields["If Yes, in which City / Town?"] || ""} onChange={e => setFields({ ...fields, ["If Yes, in which City / Town?"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Father - Monthly Income (₹)</span>
                      <input type="text" placeholder="e.g. 15,000 / Farmer / Retired" value={fields["Father - Monthly Income"] || ""} onChange={e => setFields({ ...fields, ["Father - Monthly Income"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>

                    <label style={{ display: "block" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Mother - Monthly Income (₹)</span>
                      <input type="text" placeholder="e.g. 10,000 / Homemaker / None" value={fields["Mother - Monthly Income"] || ""} onChange={e => setFields({ ...fields, ["Mother - Monthly Income"]: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 15 }} />
                    </label>
                  </div>
                </div>

                {/* 7. References (Non-Relatives) */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 16, color: "#1e3a8a", margin: "0 0 12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={18} style={{ color: "#2563eb" }} /> References
                  </h3>
                  
                  {/* Reference 1: Joy Staff Only */}
                  <div style={{ padding: "14px", background: "#f0f7ff", border: "2px solid #3b82f6", borderRadius: 8, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <strong style={{ fontSize: 14, color: "#1e40af" }}>
                        Reference 1: Joy Staff Member (Joy Internal Staff Only)
                      </strong>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#dbeafe", color: "#1e40af", borderRadius: 4 }}>
                        JOY STAFF ONLY
                      </span>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#334155" }}>
                      <strong>Note:</strong> Enter only an official Joy internal staff member (HR Manager, Field HR, or Joy Corporate employee) who referred you.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                      <label style={{ display: "block" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Joy Staff Member Name *</span>
                        <input type="text" placeholder="e.g. Joy HR / Staff Name" value={fields["Reference 1 - Name"] || ""} onChange={e => setFields({ ...fields, ["Reference 1 - Name"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                      <label style={{ display: "block" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Joy Staff Employee Code (Optional)</span>
                        <input type="text" placeholder="e.g. DIR-101 / USR-01" value={fields["Reference 1 - Employee Code"] || ""} onChange={e => setFields({ ...fields, ["Reference 1 - Employee Code"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                    </div>
                  </div>

                  {/* Reference 2: Other Reference */}
                  <div style={{ padding: "12px", background: "#fafafa", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                    <strong style={{ fontSize: 14, color: "#334155", display: "block", marginBottom: 6 }}>
                      Reference 2: Other Non-Relative Reference
                    </strong>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <label style={{ display: "block" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Reference Person Name</span>
                        <input type="text" placeholder="Full name" value={fields["Reference 2 - Name"] || ""} onChange={e => setFields({ ...fields, ["Reference 2 - Name"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                      <label style={{ display: "block" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Phone Number</span>
                        <input type="tel" placeholder="10-digit mobile" value={fields["Reference 2 - Phone No"] || ""} onChange={e => setFields({ ...fields, ["Reference 2 - Phone No"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                      <label style={{ display: "block" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>Position / Relationship</span>
                        <input type="text" placeholder="e.g. Supervisor / Colleague" value={fields["Reference 2 - Position"] || ""} onChange={e => setFields({ ...fields, ["Reference 2 - Position"]: e.target.value })} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }} />
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button type="button" onClick={goToStep2} style={{ width: "100%", padding: "14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Continue to Step 2: Upload Documents <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Document Upload Section (Big Camera Cards) */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 18, color: "#1e3a8a", margin: "0 0 4px", fontWeight: 800 }}>Step 2: Upload Verification Documents</h2>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b" }}>
                  Use your phone camera or select images from your gallery.
                </p>

                {uploadProgress && (
                  <div style={{ padding: "10px 14px", background: "#e0f2fe", color: "#0369a1", borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={16} /> {uploadProgress}
                  </div>
                )}

                {/* Big Aadhaar Mandatory Upload Card */}
                <div style={{ border: hasAadhaarFront && hasAadhaarBack ? "2px solid #10b981" : "2px solid #f59e0b", borderRadius: 12, padding: "18px 16px", background: "#f8fafc", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <strong style={{ fontSize: 17, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <FileCheck size={18} style={{ color: "#2563eb" }} /> Aadhaar Card (MANDATORY) *
                      </strong>
                      <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>Both Front and Back photos are required to verify identity &amp; address</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: hasAadhaarFront && hasAadhaarBack ? "#d1fae5" : "#fef3c7", color: hasAadhaarFront && hasAadhaarBack ? "#065f46" : "#92400e", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {hasAadhaarFront && hasAadhaarBack ? (
                        <><Check size={14} /> Both Sides Attached</>
                      ) : (
                        <><AlertTriangle size={14} /> Front &amp; Back Required</>
                      )}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                    {/* Front side */}
                    {["Aadhar Front side", "Aadhar Back side"].map(catId => {
                      const doc = documents.find(d => d.category === catId);
                      const isFront = catId === "Aadhar Front side";
                      return (
                        <div key={catId} style={{ border: doc ? "2px solid #10b981" : "2px dashed #94a3b8", borderRadius: 10, padding: 14, background: "#ffffff", textAlign: "center" }}>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#0f172a" }}>
                            {isFront ? "1. Aadhaar Front Side *" : "2. Aadhaar Back Side *"}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                            {isFront ? "Shows Photo & Aadhaar Number" : "Shows Full Address & QR Code"}
                          </div>

                          {doc ? (
                            <div>
                              <img src={doc.dataUrl} alt={catId} style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: 6, border: "1px solid #cbd5e1", marginBottom: 8 }} />
                              <button type="button" onClick={() => removeDoc(catId)} style={{ padding: "6px 12px", background: "#fee2e2", color: "#991b1b", border: "1px solid #f87171", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <Trash2 size={13} /> Remove / Re-take Photo
                              </button>
                            </div>
                          ) : (
                            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, cursor: "pointer" }}>
                              <Camera size={32} style={{ color: "#166534", marginBottom: 4 }} />
                              <strong style={{ fontSize: 14, color: "#166534" }}>Take / Upload {isFront ? "Front" : "Back"} Photo</strong>
                              <span style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>Tap to open Camera or Gallery</span>
                              <input type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }} onChange={e => handleFileUpload(catId, e.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Supporting Documents */}
                <h3 style={{ fontSize: 15, color: "#334155", margin: "20px 0 10px", fontWeight: 700 }}>Optional Supporting Documents (Upload if available)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {DOCUMENT_CATEGORIES.filter(c => !c.required).map(cat => {
                    const doc = documents.find(d => d.category === cat.id);
                    return (
                      <div key={cat.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          {cat.icon ? <span style={{ fontSize: 18 }}>{cat.icon}</span> : <FileText size={16} style={{ color: "#2563eb" }} />}
                          <strong style={{ fontSize: 13, color: "#1e293b" }}>{cat.label}</strong>
                        </div>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px" }}>{cat.helper}</p>

                        {doc ? (
                          <div style={{ textAlign: "center" }}>
                            {doc.dataUrl.startsWith("data:image/") ? (
                              <img src={doc.dataUrl} alt={cat.label} style={{ width: "100%", maxHeight: 90, objectFit: "contain", borderRadius: 4, border: "1px solid #cbd5e1", marginBottom: 6 }} />
                            ) : (
                              <div style={{ padding: "6px", background: "#e2e8f0", borderRadius: 4, fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                <FileText size={12} /> PDF Document attached
                              </div>
                            )}
                            <button type="button" onClick={() => removeDoc(cat.id)} style={{ padding: "4px 8px", background: "#fee2e2", color: "#991b1b", border: "1px solid #f87171", borderRadius: 4, fontSize: 11, cursor: "pointer" }}>
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#1e293b", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            <Camera size={14} /> Take / Upload Photo
                            <input type="file" accept="image/*,application/pdf" capture="environment" style={{ display: "none" }} onChange={e => handleFileUpload(cat.id, e.target.files?.[0])} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    ← Back to Info
                  </button>
                  <button type="button" onClick={goToStep3} style={{ flex: 2, padding: "12px", background: hasAadhaarFront && hasAadhaarBack ? "#2563eb" : "#94a3b8", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    Continue to Step 3: Declaration <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Declaration & Submit */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h2 style={{ fontSize: 18, color: "#1e3a8a", margin: "0 0 4px", fontWeight: 800 }}>Step 3: Declaration &amp; Submission</h2>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#64748b" }}>Please review your declaration and sign with your legal name.</p>

                {/* Summary Box */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                  <strong style={{ fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <FileCheck size={16} style={{ color: "#2563eb" }} /> Application Summary
                  </strong>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                    • <strong>Applicant Name:</strong> {fields["Applicant Name"] || name}<br />
                    • <strong>Position:</strong> {fields["Position Applied For"] || "Standard"}<br />
                    • <strong>Marital Status:</strong> {fields["Marital Status"] || "Single"} {fields["Marital Status"] === "Married" && fields["Spouse - Name"] ? `(Spouse: ${fields["Spouse - Name"]})` : ""}<br />
                    • <strong>Emergency Contact:</strong> {fields["Contact person name"] || "Not provided"} ({fields["Contact person relationship"] || "N/A"})<br />
                    • <strong>Attached Documents:</strong> {documents.length} files attached (including Aadhaar Front &amp; Back)
                  </div>
                </div>

                <div style={{ padding: "16px", background: "#fff", border: "2px solid #e2e8f0", borderRadius: 10 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" required checked={Boolean(fields.Declaration)} onChange={e => setFields({ ...fields, Declaration: e.target.checked ? "I confirm that the information I supplied is correct to the best of my knowledge." : "" })} style={{ marginTop: 3, width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>
                      I hereby confirm and declare that all information and uploaded documents provided above are genuine, true, and correct to the best of my knowledge.
                    </span>
                  </label>

                  <label style={{ display: "block", marginTop: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", display: "block", marginBottom: 6 }}>
                      Type your full legal name as your digital declaration signature *
                    </span>
                    <input required maxLength={200} placeholder="e.g. John Doe" value={fields["Digital Signature (Type your full name)"] || ""} onChange={e => setFields({ ...fields, ["Digital Signature (Type your full name)"]: e.target.value })} style={{ width: "100%", padding: "12px 14px", fontSize: 16, border: "2px solid #cbd5e1", borderRadius: 8, fontWeight: 600 }} />
                  </label>

                  <div style={{ marginTop: 20 }}>
                    <SignaturePad
                      value={fields["Signature image"]}
                      onChange={dataUrl => setFields({ ...fields, ["Signature image"]: dataUrl })}
                      label="Draw or Snap Real Handwritten Signature (Optional / Recommended)"
                      helperText="Draw your real signature on screen with your finger/stylus, or snap a photo of your signature on paper."
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setStep(2)} disabled={busy} style={{ flex: 1, padding: "14px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    ← Back to Documents
                  </button>
                  <button type="submit" disabled={busy} style={{ flex: 2, padding: "14px", background: "#10b981", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {busy ? "Submitting Application & Documents…" : <><CheckCircle2 size={18} /> Submit Application</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </>
      )}
    </section>
  </main>;
}


