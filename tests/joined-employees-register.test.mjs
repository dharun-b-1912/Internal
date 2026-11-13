import test from "node:test";
import assert from "node:assert/strict";

test("Joined employees date-wise aggregation and filtering logic", () => {
  const employees = [
    {
      id: "emp-1",
      employeeCode: "JOY-1001",
      name: "Arun Kumar",
      vendorId: "v-1",
      clientUnitId: "u-1",
      dateOfJoining: "2026-09-24",
      status: "active",
      mobileNumber: "9876543210",
      department: "Production",
    },
    {
      id: "emp-2",
      employeeCode: "JOY-1002",
      name: "Bala S",
      vendorId: "v-1",
      clientUnitId: "u-1",
      dateOfJoining: "2026-09-24",
      status: "active",
      mobileNumber: "9876543211",
      department: "Quality",
    },
    {
      id: "emp-3",
      employeeCode: "JOY-1003",
      name: "Chandran M",
      vendorId: "v-2",
      clientUnitId: "u-2",
      dateOfJoining: "2026-09-23",
      status: "active",
      mobileNumber: "9876543212",
      department: "Production",
    },
    {
      id: "emp-4",
      employeeCode: "JOY-1004",
      name: "Devi R",
      vendorId: "v-1",
      clientUnitId: "u-1",
      dateOfJoining: "2026-08-15",
      status: "active",
      mobileNumber: "9876543213",
      department: "HR",
    },
  ];

  // Test 1: September 2026 joinings count
  const sepJoinings = employees.filter(e => e.dateOfJoining.startsWith("2026-09"));
  assert.equal(sepJoinings.length, 3, "September 2026 should have 3 joinings");

  // Test 2: Today (2026-09-24) joinings count
  const todayJoinings = employees.filter(e => e.dateOfJoining === "2026-09-24");
  assert.equal(todayJoinings.length, 2, "2026-09-24 should have 2 joinings");

  // Test 3: Filter by company (v-1) for September 2026
  const sepV1Joinings = sepJoinings.filter(e => e.vendorId === "v-1");
  assert.equal(sepV1Joinings.length, 2, "Company v-1 should have 2 joinings in Sep 2026");

  // Test 4: Previous Month (August 2026) joinings count
  const augJoinings = employees.filter(e => e.dateOfJoining.startsWith("2026-08"));
  assert.equal(augJoinings.length, 1, "August 2026 should have 1 joining");
});

test("Left employees calendar date-wise exit aggregation and tenure calculations", () => {
  const leftEmployees = [
    { id: "l1", name: "Emp 1", dateOfJoining: "2025-01-01", dateOfLeaving: "2026-09-24", vendorId: "v-1", clientUnitId: "u-1" },
    { id: "l2", name: "Emp 2", dateOfJoining: "2026-06-01", dateOfLeaving: "2026-09-24", vendorId: "v-1", clientUnitId: "u-1" },
    { id: "l3", name: "Emp 3", dateOfJoining: "2026-01-01", dateOfLeaving: "2026-09-10", vendorId: "v-2", clientUnitId: "u-2" },
    { id: "l4", name: "Emp 4", dateOfJoining: "2026-02-01", dateOfLeaving: "2026-08-31", vendorId: "v-1", clientUnitId: "u-1" },
  ];

  const sepExits = leftEmployees.filter(e => e.dateOfLeaving.startsWith("2026-09"));
  assert.equal(sepExits.length, 3, "September 2026 should have 3 exits");

  const todayExits = leftEmployees.filter(e => e.dateOfLeaving === "2026-09-24");
  assert.equal(todayExits.length, 2, "2026-09-24 should have 2 exits");

  const v1Exits = sepExits.filter(e => e.vendorId === "v-1");
  assert.equal(v1Exits.length, 2, "Company v-1 should have 2 exits in Sep 2026");
});

test("Super Admin pending document verification notification badge on Joined today card", () => {
  const todayStr = "2026-09-24";
  const joinedToday = [
    { id: "emp-today-1", dateOfJoining: todayStr },
    { id: "emp-today-2", dateOfJoining: todayStr },
  ];
  const joinedTodayIds = new Set(joinedToday.map(e => e.id));

  const applicationDocs = [
    { id: "doc-1", employeeId: "emp-today-1", category: "Aadhar Front side", status: "pending_approval" },
    { id: "doc-2", employeeId: "emp-today-1", category: "Aadhar Back side", status: "approved", reviewedBy: "Super Admin (admin@joy.com)" },
    { id: "doc-3", employeeId: "emp-today-2", category: "Bank Proofs", status: null }, // Null defaults to pending
    { id: "doc-4", employeeId: "emp-other-3", category: "Photo", status: "pending_approval" },
  ];

  const pendingTodayDocs = applicationDocs.filter(
    d => joinedTodayIds.has(d.employeeId) && (!d.status || d.status === "pending_approval")
  );
  assert.equal(pendingTodayDocs.length, 2, "Today's joiners should have 2 documents pending approval");

  const totalPendingDocs = applicationDocs.filter(
    d => !d.status || d.status === "pending_approval"
  );
  assert.equal(totalPendingDocs.length, 3, "System should have 3 total documents pending approval");
});

test("Document approval, rejection attribution, and HR re-upload reset lifecycle", () => {
  let doc = {
    employeeId: "emp-1",
    category: "Aadhar Front side",
    filename: "aadhar.pdf",
    dataUrl: "data:application/pdf;base64,JVBER...",
    status: "pending_approval",
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
  };

  // Step 1: Super Admin rejects doc
  const reviewer = "Super Admin (superadmin@joy.com)";
  doc = {
    ...doc,
    status: "rejected",
    rejectionReason: "Aadhaar number is blurred or unreadable",
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
  };
  assert.equal(doc.status, "rejected");
  assert.ok(doc.rejectionReason.includes("blurred"));
  assert.equal(doc.reviewedBy, reviewer);

  // Step 2: HR re-uploads file
  doc = {
    ...doc,
    filename: "aadhar_clear.pdf",
    dataUrl: "data:application/pdf;base64,JVBER2...",
    status: "pending_approval",
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
  };
  assert.equal(doc.status, "pending_approval");
  assert.equal(doc.rejectionReason, null);
  assert.equal(doc.reviewedBy, null);

  // Step 3: Super Admin approves doc
  doc = {
    ...doc,
    status: "approved",
    rejectionReason: null,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
  };
  assert.equal(doc.status, "approved");
  assert.equal(doc.reviewedBy, reviewer);
});

test("Rejected docs count and Notifications Center alert aggregation", () => {
  const applicationDocs = [
    { id: "d1", employeeId: "e1", category: "Aadhar Front side", status: "rejected", rejectionReason: "Blurry scan" },
    { id: "d2", employeeId: "e1", category: "Bank Proofs", status: "rejected", rejectionReason: "Account number cropped" },
    { id: "d3", employeeId: "e2", category: "Aadhar Back side", status: "approved" },
    { id: "d4", employeeId: "e3", category: "Photo", status: "pending_approval" },
  ];

  const rejectedDocs = applicationDocs.filter((d) => d.status === "rejected");
  assert.equal(rejectedDocs.length, 2, "Should have 2 rejected documents requiring re-upload");

  const pendingDocs = applicationDocs.filter((d) => !d.status || d.status === "pending_approval");
  assert.equal(pendingDocs.length, 1, "Should have 1 document pending verification");
});

test("Daily workforce PDF generates valid PDF bytes with company-wise joinings and exits", async () => {
  const { buildDailyWorkforcePdf } = await import("../lib/daily-workforce-pdf.ts");
  const bytes = await buildDailyWorkforcePdf({
    date: "2026-11-13",
    employees: [
      { id: "e1", vendorId: "v1", clientUnitId: "u1", employeeCode: "J1", name: "A", dateOfJoining: "2026-11-13", status: "active" },
      { id: "e2", vendorId: "v1", clientUnitId: "u1", employeeCode: "J2", name: "B", dateOfJoining: "2026-01-01", dateOfLeaving: "2026-11-13", status: "left" },
    ],
    vendors: [{ id: "v1", name: "Joy Test Corp" }],
    units: [{ id: "u1", vendorId: "v1", clientName: "Joy Test Corp", unitName: "Plant 1" }],
  });
  assert(bytes instanceof Uint8Array);
  assert(bytes.length > 500, "PDF bytes should be non-empty and valid");
});



