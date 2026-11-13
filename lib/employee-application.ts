// Application-only fields. Payroll values remain in the employee master.
export const DOCUMENT_CATEGORIES = [
  { id: "Aadhar Front side", label: "Aadhaar Card (Front Side)", required: true, icon: "", helper: "Clear photo showing Photo, Name, DOB and Aadhaar Number" },
  { id: "Aadhar Back side", label: "Aadhaar Card (Back Side)", required: true, icon: "", helper: "Clear photo showing Full Address and QR Code" },
  { id: "PAN Card", label: "PAN Card (Front)", required: false, icon: "", helper: "Clear photo showing PAN Number and Photo" },
  { id: "Bank Proofs", label: "Bank Proof (Passbook / Cheque)", required: false, icon: "", helper: "Cancelled Cheque or Passbook front page with IFSC & Account No" },
  { id: "Candidate Photo", label: "Passport Size Photo / Selfie", required: false, icon: "", helper: "Recent formal photo or clear front-facing selfie" },
  { id: "Candidate Signature", label: "Candidate Signature", required: false, icon: "", helper: "Clear specimen signature or scanned handwritten signature" },
  { id: "Driving License Front", label: "Driving License (Front)", required: false, icon: "", helper: "Front side showing License Number & Validity" },
  { id: "Driving License Back", label: "Driving License (Back)", required: false, icon: "", helper: "Back side showing Vehicle Class / Endorsements" },
  { id: "Education Qualification certificates 1", label: "10th / SSLC Certificate", required: false, icon: "", helper: "10th mark sheet or passing certificate" },
  { id: "Education Qualification certificates 2", label: "12th / Higher Secondary", required: false, icon: "", helper: "12th / HSC mark sheet" },
  { id: "Education Qualification certificates 3", label: "Degree / Diploma / ITI / Course Completion", required: false, icon: "", helper: "Degree certificate, diploma, or technical course completion" },
  { id: "Education Qualification certificates 4", label: "Postgraduate / Additional Degree", required: false, icon: "", helper: "PG degree or additional certificate" },
  { id: "Education Qualification certificates 5", label: "Other Educational Certificate", required: false, icon: "", helper: "Other certificates or diplomas" },
  { id: "Previous Employment proofs 1", label: "Relieving / Experience Certificate", required: false, icon: "", helper: "Relieving letter or experience certificate" },
  { id: "Previous Employment proofs 2", label: "Previous Payslip / Salary Slip", required: false, icon: "", helper: "Recent payslip from past employer" },
  { id: "Previous Employment proofs 3", label: "Appointment Letter / Bank Statement", required: false, icon: "", helper: "Appointment letter or bank statement" },
  { id: "Other proofs 1", label: "Medical / Fitness / Other Proof", required: false, icon: "", helper: "Medical fitness certificate or other documents" },
  { id: "Other proofs 2", label: "Additional Supporting Document", required: false, icon: "", helper: "Any other supporting document" },
];

export const applicationSections = [
  { title: "Applicant identity", fields: ["Full name", "Mobile number", "Date of birth", "Gender", "Highest qualification", "Marital status", "Employment status"] },
  { title: "Application details", fields: ["Applicant Name", "Position Applied For", "Date"] },
  { title: "Personal information", fields: ["Contact person name", "Contact person relationship", "Permanent Address", "Age", "Place of Birth", "Height (cm)", "Weight (kg)", "Do you smoke?", "Identification Marks", "Have you had any major surgery / illness recently, or suffer from chronic disease?", "Mother Tongue", "Sibling count", "Children count", "Employment records"] },
  { title: "Language proficiency", fields: ["Tamil", "English", "Hindi", "Malayalam", "Kannada", "Telugu", "Bengali", "Marathi", "Arabi", "Assame"].map(language => `Other Languages Proficiency [${language}]`) },
  ...["Father", "Mother", "Spouse", "Sibling 1", "Sibling 2", "Child 1", "Child 2", "Child 3"].map(relation => ({ title: `Family - ${relation}`, fields: ["Name", "Age", "Qualification", "Occupation", "Monthly Income", "Contact", "Address", "Relationship"].map(field => `${relation} - ${field}`) })),
  { title: "Education profile", fields: ["10th / SSLC Details", "12th / Higher Secondary Details", "Graduation / Diploma Details"] },
  ...[1, 2].map(index => ({ title: `Previous employment ${index}`, fields: ["Company Name", "Designation", "Period of Service", "Salary", "Reason for Leaving"].map(field => `Employment ${index} - ${field}`) })),
  { title: "House details", fields: ["Do you own House?", "If Yes, in which City / Town?"] },
  { title: "Reference 1 — Joy staff (internal user only)", fields: ["Employee ID", "Employee Code", "Name"].map(field => `Reference 1 - ${field}`) },
  { title: "Reference 2 — other reference", fields: ["Name", "Position", "Address", "Phone No"].map(field => `Reference 2 - ${field}`) },
  { title: "Declaration", fields: ["Declaration", "Digital Signature (Type your full name)"] },
  { title: "Supporting document links", fields: ["Aadhar Front side", "Aadhar Back side", "PAN Card", "Bank Proofs", "Candidate Photo", "Candidate Signature", "Driving License Front", "Driving License Back", ...[1,2,3,4,5].map(i => `Education Qualification certificates ${i}`), ...[1,2,3].map(i => `Previous Employment proofs ${i}`), "Other proofs 1", "Other proofs 2"] },
];

export type ApplicationData = Record<string, string>;
export type DocumentVerificationStatus = "pending_approval" | "approved" | "rejected";

export type ApplicationDocument = {
  id?: string;
  category: string;
  filename: string;
  dataUrl: string;
  status?: DocumentVerificationStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
};

function parseAnyDate(str?: string | null): Date | null {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;
  return null;
}

export function getDocumentUploadDate(
  doc?: ApplicationDocument | null,
  employee?: { dateOfJoining?: string | null; applicationJson?: string | null } | null
): string {
  if (!doc) return "";
  const explicit = doc.uploadedAt || (doc as any).uploaded_at || (doc as any).createdAt || (doc as any).created_at;
  const explicitParsed = parseAnyDate(explicit);
  if (explicitParsed) {
    return explicitParsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (doc.filename) {
    const matchIso = doc.filename.match(/(\d{4}[-_]\d{2}[-_]\d{2})/);
    if (matchIso) {
      const parsed = parseAnyDate(matchIso[1].replace(/_/g, "-"));
      if (parsed) {
        return parsed.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    const matchCompact = doc.filename.match(/(?:IMG[-_]|WP[-_]|photo[-_]|)(\d{4})(\d{2})(\d{2})/i);
    if (matchCompact) {
      const parsed = parseAnyDate(`${matchCompact[1]}-${matchCompact[2]}-${matchCompact[3]}`);
      if (parsed) {
        return parsed.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
  }

  if (employee?.applicationJson) {
    try {
      const app = JSON.parse(employee.applicationJson);
      const onboardingSubmitted = app._joyOnboarding?.submitted || app.submittedAt || app.submissionDate;
      if (onboardingSubmitted) {
        const parsed = parseAnyDate(String(onboardingSubmitted));
        if (parsed) {
          return parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
      }
    } catch {}
  }

  return "";
}

export type ApplicationRequest = (employeeId: string) => Promise<ApplicationDocument[]>;
export type ReferenceOption = { id: string; employeeCode: string; name: string };
export const requiredApplicationFields = ["Full name", "Mobile number", "Date of birth", "Gender", "Highest qualification", "Marital status", "Employment status", "Reference 1 - Employee ID"];
export const documentCategories = applicationSections.find(s => s.title === "Supporting document links")!.fields;
export const isLanguageField = (key: string) => /^Other Languages Proficiency \[[^\[\]\r\n]{1,60}\]$/.test(key);
export const languageFields = (data: ApplicationData) => [...new Set([...applicationSections.find(s => s.title === "Language proficiency")!.fields, ...Object.keys(data).filter(isLanguageField)])];

export function educationLevel(qualification = "") {
  if (/below|no formal|primary|middle/i.test(qualification)) return 0;
  if (/^10|sslc/i.test(qualification)) return 1;
  if (/^12|higher secondary|hsc/i.test(qualification)) return 2;
  return qualification.trim() ? 3 : 0;
}

export function applicableFields(data: ApplicationData): ApplicationData {
  const next = { ...data };
  for (const key of Object.keys(next)) {
    if (/^(religion|caste|category|community|community type)$/i.test(key)) delete next[key];
    if (next["Employment status"] === "Fresher" && (/^Employment [12] -/.test(key) || /^Previous Employment proofs/.test(key))) delete next[key];
    if (/^(unmarried|single)$/i.test(next["Marital status"] || "") && /^(Spouse|Child [1-3]) -/.test(key)) delete next[key];
    for (const [relation, countKey] of [["Sibling", "Sibling count"], ["Child", "Children count"]]) {
      const match = key.match(new RegExp(`^${relation} ([1-3]) -`));
      if (match && next[countKey] !== undefined && Number(match[1]) > Number(next[countKey])) delete next[key];
    }
  }
  if (/^(unmarried|single)$/i.test(next["Marital status"] || "")) next["Children count"] = "0";
  if (next["Highest qualification"]) {
    const level = educationLevel(next["Highest qualification"]);
    applicationSections.find(s => s.title === "Education profile")!.fields.forEach((key, i) => { if (i >= level) delete next[key]; });
  }
  if (next["Do you own House?"] === "No") delete next["If Yes, in which City / Town?"];
  return next;
}

export function readApplication(value?: string | null): ApplicationData {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, val]) => key !== "__proto__" && typeof val === "string")) as ApplicationData;
  } catch { return {}; }
}

export function safeApplicationImage(value?: string | null) {
  return value && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : undefined;
}
