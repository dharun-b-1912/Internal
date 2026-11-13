// supabase/functions/employee-onboarding/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import nodemailer from "npm:nodemailer@6.9.16";
var projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
var secretKeyDictionary = Deno.env.get("SUPABASE_SECRET_KEYS");
var modernSecretKey = secretKeyDictionary ? JSON.parse(secretKeyDictionary).default : void 0;
var secretKey = modernSecretKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
var admin = createClient(projectUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set([
  "https://joy-payroll.praveen-red-07.workers.dev",
  "https://payroll.joycorporatesolutions.com",
  "https://internalpayroll.joypeoplehr.com",
  "http://localhost:5173",
  "http://localhost:4173",
  ...(Deno.env.get("APP_ORIGIN") || "").split(",").map((s) => s.trim()).filter(Boolean)
]);
function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.includes("joypeoplehr") || host.includes("joycorporatesolutions") || host === "localhost" || host === "127.0.0.1") return true;
  } catch {
  }
  return false;
}
var META = "_joyOnboarding";
var applicationSections = [
  { title: "Application details", fields: ["Applicant Name", "Position Applied For", "Date"] },
  { title: "Personal information", fields: ["Contact person name", "Contact person relationship", "Permanent Address", "Age", "Place of Birth", "Height (cm)", "Weight (kg)", "Do you smoke?", "Marital Status", "Identification Marks", "Have you had any major surgery / illness recently, or suffer from chronic disease?", "Mother Tongue"] },
  { title: "Language proficiency", fields: ["Tamil", "English", "Hindi", "Malayalam", "Kannada", "Telugu", "Bengali", "Marathi", "Arabi", "Assame", "Other Language"].map((l) => `Other Languages Proficiency [${l}]`) },
  ...["Father", "Mother", "Spouse", "Sibling 1", "Sibling 2", "Child 1", "Child 2", "Child 3"].map((r) => ({ title: `Family - ${r}`, fields: ["Name", "Age", "Qualification", "Occupation", "Monthly Income", "Contact", "Address", "Relationship"].map((f) => `${r} - ${f}`) })),
  { title: "Education profile", fields: ["10th / SSLC Details", "12th / Higher Secondary Details", "Graduation / Diploma Details"] },
  ...[1, 2].map((i) => ({ title: `Previous employment ${i}`, fields: ["Company Name", "Designation", "Period of Service", "Salary", "Reason for Leaving"].map((f) => `Employment ${i} - ${f}`) })),
  { title: "House details", fields: ["Do you own House?", "If Yes, in which City / Town?"] },
  ...[1, 2].map((i) => ({ title: `Non-relative reference ${i}`, fields: ["Name", "Position", "Address", "Phone No"].map((f) => `Reference ${i} - ${f}`) })),
  { title: "Declaration", fields: ["Declaration", "Digital Signature (Type your full name)"] },
  { title: "Supporting document links", fields: ["Aadhar Front side", "Aadhar Back side", "Bank Proofs", "PAN Card", "Candidate Photo", "Driving License Front", "Driving License Back", ...[1, 2, 3, 4, 5].map((i) => `Education Qualification certificates ${i}`), ...[1, 2, 3].map((i) => `Previous Employment proofs ${i}`), "Other proofs 1", "Other proofs 2"] }
];
function parseObject(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function canInvite(profile, employee) {
  if (profile.status !== "active") return false;
  if (profile.role === "super_admin") return true;
  if (!["hr_team", "field_hr", "payroll_team"].includes(profile.role)) return false;
  const permissions = parseObject(profile.permissions_json);
  const scope = (value, id) => {
    try {
      const list = JSON.parse(String(value));
      return Array.isArray(list) && list.includes(id);
    } catch {
      return false;
    }
  };
  return permissions.employees === "manage" && scope(profile.client_scope_json, employee.vendor_id) && (!["hr_team", "field_hr"].includes(profile.role) || scope(profile.unit_scope_json, employee.client_unit_id));
}
function validatedFields(value) {
  const input = parseObject(value);
  const allowed = new Set(applicationSections.filter((s) => s.title !== "Supporting document links").flatMap((s) => s.fields));
  allowed.add("Marital status");
  allowed.add("Marital Status");
  const isLanguage = (key) => /^Other Languages Proficiency \[[^\[\]\r\n]{1,60}\]$/.test(key);
  const entries = Object.entries(input).filter(([key]) => key !== "Signature image" && key !== "Signature Image");
  if (entries.length > 200 || entries.some(([key, val]) => !allowed.has(key) && !isLanguage(key) || typeof val !== "string" || val.length > 2e3)) throw new Error("Invalid application field or field longer than 2,000 characters.");
  if (!String(input["Digital Signature (Type your full name)"] || "").trim() || !String(input.Declaration || "").trim()) throw new Error("Confirm the declaration and type your full name.");
  return Object.fromEntries(entries);
}
async function tokenHash(token) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (n) => n.toString(16).padStart(2, "0")).join("");
}
function validInvite(metadata, hash, now = Date.now()) {
  return metadata.hash === hash && typeof metadata.expires === "number" && metadata.expires > now && !metadata.submitted;
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && isOriginAllowed(origin) ? origin : [...ALLOWED_ORIGINS][0];
  const headers = { "access-control-allow-origin": allowOrigin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "cache-control": "no-store", vary: "Origin" };
  const json = (body, status = 200) => Response.json(body, { status, headers });
  if (origin && !isOriginAllowed(origin)) return json({ error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  try {
    const text = await req.text();
    if (text.length > 6e7) return json({ error: "Application is too large" }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
    if (!body || typeof body !== "object" || !["create", "read", "submit"].includes(body.action)) return json({ error: "Invalid request" }, 400);
    if (body.action !== "create" && (typeof body.employeeId !== "string" || body.employeeId.length > 100)) return json({ error: "Invalid request" }, 400);
    let actor = null;
    if (body.action === "create") {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
      if (!jwt) return json({ error: "Sign in to invite employees" }, 401);
      const { data, error } = await admin.auth.getUser(jwt);
      if (error || !data.user?.email_confirmed_at || !data.user.email) return json({ error: "Verified login required" }, 401);
      const profile = await admin.from("app_users").select("*").eq("email", data.user.email.toLowerCase()).maybeSingle();
      if (profile.error || !profile.data) return json({ error: "Employee management access required" }, 403);
      actor = profile.data;
    } else if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return json({ error: "Invalid or expired invitation. Ask HR for a new link." }, 403);
    let employee = null;
    let application = {};
    let metadata = {};
    const save = async (next) => {
      if (!employee) return false;
      let query = admin.from("employees").update({ application_json: JSON.stringify(next) }).eq("id", employee.id).eq("status", "active");
      query = employee.application_json == null ? query.is("application_json", null) : query.eq("application_json", employee.application_json);
      const saved = await query.select("id");
      if (saved.error) throw new Error("Unable to save application");
      return Boolean(saved.data?.length);
    };
    if (body.action === "create") {
      if (!origin || !isOriginAllowed(origin)) return json({ error: "Open invitations from the payroll application" }, 400);
      const sendEmail = body.sendEmail === true;
      const smtpPassword = Deno.env.get("JOY_SMTP_PASSWORD");
      if (body.employeeId && typeof body.employeeId === "string" && body.employeeId.trim()) {
        const result2 = await admin.from("employees").select("id,name,status,vendor_id,client_unit_id,email_address,application_json").eq("id", body.employeeId).maybeSingle();
        if (result2.error) throw new Error("Employee lookup failed");
        employee = result2.data;
        if (!employee || employee.status !== "active") return json({ error: "Invitation unavailable for this employee. Contact HR." }, 403);
        if (!actor || !canInvite(actor, employee)) return json({ error: "You do not have management access to this employee's company and unit." }, 403);
        const targetEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : employee.email_address || "";
        if (sendEmail && !smtpPassword) return json({ error: "The onboarding function needs the existing JOY_SMTP_PASSWORD secret." }, 503);
        if (sendEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) return json({ error: "Add a valid employee email in Employee Master first." }, 400);
        if (targetEmail && targetEmail !== (employee.email_address || "").toLowerCase()) {
          await admin.from("employees").update({ email_address: targetEmail }).eq("id", employee.id);
          employee.email_address = targetEmail;
        }
      } else {
        const targetEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : "";
        if (sendEmail && !smtpPassword) return json({ error: "The onboarding function needs the existing JOY_SMTP_PASSWORD secret." }, 503);
        if (sendEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) return json({ error: "Please enter a valid recipient email address." }, 400);
        let vendorId = "";
        let unitId = "";
        try {
          const clientScope = JSON.parse(actor?.client_scope_json || "[]");
          const unitScope = JSON.parse(actor?.unit_scope_json || "[]");
          vendorId = Array.isArray(clientScope) && clientScope[0] ? clientScope[0] : "";
          unitId = Array.isArray(unitScope) && unitScope[0] ? unitScope[0] : "";
        } catch {
        }
        if (!vendorId || !unitId) {
          const unitRes = await admin.from("client_units").select("id,vendor_id").limit(1).maybeSingle();
          if (unitRes.data) {
            vendorId = unitRes.data.vendor_id;
            unitId = unitRes.data.id;
          }
        }
        if (!vendorId || !unitId) {
          const vendorRes = await admin.from("vendors").select("id").limit(1).maybeSingle();
          vendorId = vendorRes.data?.id || "joy_vendor";
          const unitRes = await admin.from("client_units").select("id").eq("vendor_id", vendorId).limit(1).maybeSingle();
          unitId = unitRes.data?.id || "joy_unit";
        }
        const newId = `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const candCode = `CAND-${Date.now().toString().slice(-6)}`;
        const candName = typeof body.candidateName === "string" && body.candidateName.trim() ? body.candidateName.trim() : targetEmail ? targetEmail.split("@")[0] : "New Candidate";
        const ins = await admin.from("employees").insert({
          id: newId,
          vendor_id: vendorId,
          client_unit_id: unitId,
          employee_code: candCode,
          name: candName,
          department: "Onboarding",
          date_of_joining: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          email_address: targetEmail || null,
          status: "active",
          application_json: JSON.stringify({})
        }).select("id,name,status,vendor_id,client_unit_id,email_address,application_json").maybeSingle();
        employee = ins.data || {
          id: newId,
          name: candName,
          status: "active",
          vendor_id: vendorId,
          client_unit_id: unitId,
          email_address: targetEmail || null,
          application_json: "{}"
        };
      }
      application = parseObject(employee.application_json);
      metadata = parseObject(application[META]);
      if (typeof metadata.created === "number" && Date.now() - metadata.created < 6e4) return json({ error: "An invitation was just created. Wait one minute before issuing another." }, 429);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
      const expires = Date.now() + 7 * 864e5;
      const next = { ...application, [META]: { hash: await tokenHash(token), expires, created: Date.now(), createdBy: actor?.email || "hr" } };
      if (!await save(next)) return json({ error: "Employee details changed. Refresh and try again." }, 409);
      const link = `${origin}/#onboarding=${encodeURIComponent(employee.id)}.${token}`;
      const recipientEmail = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : employee.email_address || "";
      if (sendEmail) {
        const host = Deno.env.get("JOY_SMTP_HOST") || "mail.joycorporatesolutions.com";
        const port = Number(Deno.env.get("JOY_SMTP_PORT") || "465");
        const user = Deno.env.get("JOY_SMTP_USER") || "noreply@joycorporatesolutions.com";
        const transport = nodemailer.createTransport({ host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass: smtpPassword }, tls: { servername: host }, connectionTimeout: 15e3, socketTimeout: 2e4 });
        try {
          const receipt = await transport.sendMail({ from: `Joy Payroll <${user}>`, to: recipientEmail, subject: "Joy Payroll \u2014 complete your employee application", text: `Dear ${employee.name},

Please complete your employee application:
${link}

This personal link expires in seven days and can be submitted once. Please do not forward it.

Regards,
Joy Payroll HR` });
          if (!receipt.accepted?.length) throw new Error("SMTP rejected recipient");
        } catch {
          await admin.from("employees").update({ application_json: employee.application_json }).eq("id", employee.id).eq("application_json", JSON.stringify(next));
          return json({ error: "SMTP did not confirm sending. Check the mail service and try again." }, 502);
        } finally {
          transport.close();
        }
      }
      await admin.from("audit_events").insert({ action: "employee-onboarding-invited", entity_type: "employee", entity_id: employee.id, actor_email: actor?.email || "hr", summary: sendEmail ? "Onboarding invitation sent by SMTP" : "Onboarding sharing link created" });
      return json({ link, expires, sent: sendEmail, recipient: sendEmail ? recipientEmail : void 0 });
    }
    const result = await admin.from("employees").select("id,name,status,vendor_id,client_unit_id,email_address,application_json").eq("id", body.employeeId).maybeSingle();
    if (result.error) throw new Error("Employee lookup failed");
    employee = result.data;
    if (!employee || employee.status !== "active") return json({ error: "Invitation unavailable. Contact HR." }, 403);
    application = parseObject(employee.application_json);
    metadata = parseObject(application[META]);
    if (!validInvite(metadata, await tokenHash(body.token))) return json({ error: "Invalid, expired or already submitted invitation. Ask HR for a new link." }, 403);
    if (body.action === "read") return json({ name: employee.name, expires: metadata.expires });
    let fields;
    try {
      fields = validatedFields(body.fields);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Invalid application" }, 400);
    }
    const rawDocuments = Array.isArray(body.documents) ? body.documents : [];
    if (body.documents !== void 0) {
      const hasAadhaarFront = rawDocuments.some((d) => d && d.category === "Aadhar Front side" && typeof d.dataUrl === "string" && d.dataUrl.length > 0);
      const hasAadhaarBack = rawDocuments.some((d) => d && d.category === "Aadhar Back side" && typeof d.dataUrl === "string" && d.dataUrl.length > 0);
      if (!hasAadhaarFront || !hasAadhaarBack) {
        return json({ error: "Aadhaar Card (both Front and Back) is mandatory." }, 400);
      }
    }
    if (!await save({ ...application, ...fields, [META]: { ...metadata, hash: null, submitted: (/* @__PURE__ */ new Date()).toISOString() } })) return json({ error: "This application changed or was already submitted. Contact HR before retrying." }, 409);
    for (const doc of rawDocuments) {
      if (doc && typeof doc.category === "string" && typeof doc.filename === "string" && typeof doc.dataUrl === "string" && (doc.dataUrl.startsWith("data:image/") || doc.dataUrl.startsWith("data:application/pdf"))) {
        const docId = `doc_${employee.id}_${(await tokenHash(doc.category)).slice(0, 16)}`;
        await admin.from("application_documents").upsert({
          id: docId,
          employee_id: employee.id,
          category: doc.category,
          filename: String(doc.filename || "document").slice(0, 255),
          data_url: doc.dataUrl,
          uploaded_at: (/* @__PURE__ */ new Date()).toISOString(),
          uploaded_by: "onboarding-applicant"
        }, { onConflict: "employee_id,category" });
      }
    }
    await admin.from("audit_events").insert({ action: "employee-onboarding-submitted", entity_type: "employee", entity_id: employee.id, actor_email: "onboarding-applicant", summary: "Employee submitted application with documents using a one-time invitation" });
    return json({ submitted: true });
  } catch (err) {
    console.error("Employee onboarding error:", err);
    return json({ error: "Unable to process onboarding. Please contact HR or retry later." }, 500);
  }
});
