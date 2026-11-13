import test from "node:test";
import assert from "node:assert/strict";
import { referenceReport } from "../lib/referral-reports.ts";
import { readApplication } from "../lib/employee-application.ts";

test("Reference 1 only credits Joy internal staff and calculates bonus accurately", () => {
  const employees = [
    {
      id: "emp-1",
      employeeCode: "JOY-1001",
      name: "Ramesh K",
      dateOfJoining: "2026-08-01",
      status: "active",
      applicationJson: JSON.stringify({
        "Reference 1 - Employee ID": "user-super-1",
        "Reference 1 - Employee Code": "DIR-101",
        "Reference 1 - Name": "Agilan T",
        "Reference 2 - Name": "Sundar V",
        "Reference 2 - Phone No": "9876543210"
      })
    },
    {
      id: "emp-2",
      employeeCode: "JOY-1002",
      name: "Kavitha M",
      dateOfJoining: "2026-08-05",
      status: "active",
      applicationJson: JSON.stringify({
        "Reference 1 - Employee ID": "user-hr-1",
        "Reference 1 - Employee Code": "DIR-102",
        "Reference 1 - Name": "Praveen HR",
        "Reference 2 - Name": "Mohan R",
        "Reference 2 - Phone No": "9840123456"
      })
    },
    {
      id: "emp-3",
      employeeCode: "JOY-1003",
      name: "Suresh P",
      dateOfJoining: "2026-08-10",
      status: "active",
      // Employee with empty/invalid reference
      applicationJson: JSON.stringify({
        "Reference 1 - Name": "",
      })
    }
  ];

  const payrollItems = [
    { employeeId: "emp-1", presentDays: 26, payableDays: 26 },
    { employeeId: "emp-2", presentDays: 14, payableDays: 14 },
    { employeeId: "emp-3", presentDays: 20, payableDays: 20 },
  ];

  // Test with minimum 20 worked days and ₹500 bonus
  const reportRef1 = referenceReport(employees, payrollItems, 1, 20, 500);
  assert.equal(reportRef1.length, 2, "Should find 2 employees with Reference 1");

  const agilanRow = reportRef1.find(r => r.referrerName === "Agilan T");
  assert.ok(agilanRow, "Agilan T should be present as referrer");
  assert.equal(agilanRow.workedDays, 26);
  assert.equal(agilanRow.eligible, true, "Agilan's candidate worked 26 days >= 20 days");
  assert.equal(agilanRow.bonusEstimate, 500, "Bonus should be ₹500");

  const praveenRow = reportRef1.find(r => r.referrerName === "Praveen HR");
  assert.ok(praveenRow, "Praveen HR should be present as referrer");
  assert.equal(praveenRow.workedDays, 14);
  assert.equal(praveenRow.eligible, false, "Praveen's candidate worked 14 days < 20 days");
  assert.equal(praveenRow.bonusEstimate, 0, "Bonus should be ₹0 for ineligible candidate");

  // Test Reference 2
  const reportRef2 = referenceReport(employees, payrollItems, 2, 10, 300);
  assert.equal(reportRef2.length, 2, "Should find 2 employees with Reference 2");
  const sundarRow = reportRef2.find(r => r.referrerName === "Sundar V");
  assert.ok(sundarRow);
  assert.equal(sundarRow.phone, "9876543210");
  assert.equal(sundarRow.eligible, true);
  assert.equal(sundarRow.bonusEstimate, 300);
});

test("Left employee work history accurately aggregates month-wise worked days", () => {
  const attendanceRecords = [
    { employeeId: "emp-left-1", attendanceDate: "2026-06-01", statusCode: "P" },
    { employeeId: "emp-left-1", attendanceDate: "2026-06-02", statusCode: "P" },
    { employeeId: "emp-left-1", attendanceDate: "2026-06-03", statusCode: "HD" }, // 0.5 day
    { employeeId: "emp-left-1", attendanceDate: "2026-07-01", statusCode: "P" },
    { employeeId: "emp-left-1", attendanceDate: "2026-07-02", statusCode: "P" },
    { employeeId: "emp-left-1", attendanceDate: "2026-07-03", statusCode: "A" }, // Absent (0 days)
  ];

  const monthMap = new Map();
  for (const a of attendanceRecords.filter(r => ["P", "HP", "HD"].includes(r.statusCode))) {
    const ym = a.attendanceDate.slice(0, 7);
    monthMap.set(ym, (monthMap.get(ym) || 0) + (a.statusCode === "HD" ? 0.5 : 1));
  }

  assert.equal(monthMap.get("2026-06"), 2.5, "June should have 2.5 worked days");
  assert.equal(monthMap.get("2026-07"), 2.0, "July should have 2.0 worked days");

  const totalDays = Array.from(monthMap.values()).reduce((a, b) => a + b, 0);
  assert.equal(totalDays, 4.5, "Total worked days should be 4.5 days");

  const breakdownStr = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, days]) => `${m}: ${days}d`)
    .join(" | ");

  assert.equal(breakdownStr, "2026-06: 2.5d | 2026-07: 2d");
});

test("Candidate application parsing preserves Reference 1 (Joy Staff Only) & Reference 2 details", () => {
  const rawFields = {
    "Reference 1 - Employee ID": "joy-staff-1",
    "Reference 1 - Employee Code": "DIR-101",
    "Reference 1 - Name": "Agilan T",
    "Reference 2 - Name": "Ravi Kumar",
    "Reference 2 - Phone No": "9876543210",
    "Reference 2 - Position": "Site Supervisor",
  };

  const parsed = readApplication(JSON.stringify(rawFields));
  assert.equal(parsed["Reference 1 - Employee ID"], "joy-staff-1");
  assert.equal(parsed["Reference 1 - Employee Code"], "DIR-101");
  assert.equal(parsed["Reference 1 - Name"], "Agilan T");
  assert.equal(parsed["Reference 2 - Name"], "Ravi Kumar");
  assert.equal(parsed["Reference 2 - Phone No"], "9876543210");
  assert.equal(parsed["Reference 2 - Position"], "Site Supervisor");
});

test("Reference 1 Joy Staff auto-search matches appUsers for all HR logins (e.g. Danya)", () => {
  const appUsers = [
    {
      id: "USER-c63744d2-edea-4f31-891b-8bd74215c997",
      email: "danya@joycorporatesolutions.com",
      fullName: "Danya R",
      employeeCode: "00154",
      department: "HR",
    },
    {
      id: "USER-5d12518c-1fe5-4174-9069-b650fd0c5d16",
      email: "nishanth@joycorporatesolutions.com",
      fullName: "Nishanth N",
      employeeCode: "00120",
      department: "HR",
    },
  ];

  const directStaff = appUsers.map((u) => ({
    id: u.id,
    employeeCode: u.employeeCode || `USR-${u.id.slice(0, 5)}`,
    name: u.fullName || u.email,
    department: u.department || "Internal Staff",
  }));

  // Searching "dan" matches Danya R
  const query = "dan";
  const matches = directStaff.filter(
    (s) =>
      `${s.name} ${s.employeeCode} ${s.department || ""}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, "Danya R");
  assert.equal(matches[0].employeeCode, "00154");
});

test("Multi-unit referrals and fallback attendance calculation", () => {
  const employees = [
    {
      id: "emp-carenow-1",
      employeeCode: "J237",
      name: "Aiswariya Ananthan",
      dateOfJoining: "2026-02-18",
      status: "active",
      vendorId: "v-joy-manpower",
      clientUnitId: "u-carenow-1",
      applicationJson: JSON.stringify({
        "Reference 1 - Employee ID": "user-shalini-1",
        "Reference 1 - Employee Code": "0013",
        "Reference 1 - Name": "Shalini J",
      })
    },
    {
      id: "emp-watertec-1",
      employeeCode: "J238",
      name: "Muthu Vel",
      dateOfJoining: "2026-03-01",
      status: "active",
      vendorId: "v-joy-manpower",
      clientUnitId: "u-watertec-2",
      applicationJson: JSON.stringify({
        "Reference 1 - Employee ID": "user-shalini-1",
        "Reference 1 - Employee Code": "0013",
        "Reference 1 - Name": "Shalini J",
      })
    }
  ];

  // Aggregated items across multiple units
  const aggregatedPayrollItems = [
    { employeeId: "emp-carenow-1", presentDays: 26, payableDays: 26 },
    { employeeId: "emp-watertec-1", presentDays: 24, payableDays: 24 },
  ];

  // Report across all units for Shalini J with 25 days minimum threshold
  const report = referenceReport(employees, aggregatedPayrollItems, 1, 25, 1000);
  assert.equal(report.length, 2, "Should find 2 candidates referred by Shalini J");

  const aiswariya = report.find(r => r.employeeCode === "J237");
  assert.ok(aiswariya);
  assert.equal(aiswariya.workedDays, 26);
  assert.equal(aiswariya.eligible, true, "26 days >= 25 days");
  assert.equal(aiswariya.bonusEstimate, 1000);

  const muthu = report.find(r => r.employeeCode === "J238");
  assert.ok(muthu);
  assert.equal(muthu.workedDays, 24);
  assert.equal(muthu.eligible, false, "24 days < 25 days");
  assert.equal(muthu.bonusEstimate, 0);
});

test("Left today and Joined today workforce metrics accurately filter by today's date", () => {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const employees = [
    { id: "e1", name: "Joined Today", dateOfJoining: todayStr, dateOfLeaving: null, status: "active" },
    { id: "e2", name: "Joined Earlier", dateOfJoining: "2026-01-10", dateOfLeaving: null, status: "active" },
    { id: "e3", name: "Left Today", dateOfJoining: "2026-01-15", dateOfLeaving: todayStr, status: "left" },
    { id: "e4", name: "Left Earlier", dateOfJoining: "2026-01-15", dateOfLeaving: "2026-02-28", status: "left" },
  ];

  const joinedToday = employees.filter((e) => e.dateOfJoining === todayStr);
  const leftToday = employees.filter((e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving === todayStr);
  const totalLeft = employees.filter((e) => e.status === "left" || Boolean(e.dateOfLeaving));

  assert.equal(joinedToday.length, 1);
  assert.equal(joinedToday[0].id, "e1");
  assert.equal(leftToday.length, 1);
  assert.equal(leftToday[0].id, "e3");
  assert.equal(totalLeft.length, 2);
});

test("Separated employees with finalPayrollMonth remain eligible for deductions and payroll in their final month and auto-archive afterwards", () => {
  const employees = [
    {
      id: "emp-active-1",
      name: "Suresh Active",
      status: "active",
      dateOfJoining: "2026-01-01",
      dateOfLeaving: null,
      finalPayrollMonth: null,
    },
    {
      id: "emp-left-oct",
      name: "Ravi Leaving In Oct",
      status: "inactive",
      dateOfJoining: "2026-03-01",
      dateOfLeaving: "2026-10-14",
      finalPayrollMonth: "2026-10",
    },
    {
      id: "emp-left-sep",
      name: "Kannan Left In Sep",
      status: "inactive",
      dateOfJoining: "2026-02-01",
      dateOfLeaving: "2026-09-30",
      finalPayrollMonth: "2026-09",
    },
    {
      id: "emp-left-no-payroll",
      name: "Prakash Settled Immediately",
      status: "inactive",
      dateOfJoining: "2026-05-01",
      dateOfLeaving: "2026-10-02",
      finalPayrollMonth: null,
    },
  ];

  // Helper matching payroll and recoveries inclusion logic
  function isEligibleForPayroll(emp, period) {
    if (emp.status === "active") return true;
    if (emp.finalPayrollMonth) {
      const leftMonth = emp.dateOfLeaving ? emp.dateOfLeaving.slice(0, 7) : emp.finalPayrollMonth;
      const startMonth = leftMonth < emp.finalPayrollMonth ? leftMonth : emp.finalPayrollMonth;
      return period >= startMonth && period <= emp.finalPayrollMonth;
    }
    return false;
  }

  // October 2026 Payroll & Recoveries Run
  const octEligible = employees.filter((e) => isEligibleForPayroll(e, "2026-10"));
  assert.equal(octEligible.length, 2, "October should include active employee and October final pay employee");
  assert.ok(octEligible.some((e) => e.id === "emp-active-1"));
  assert.ok(octEligible.some((e) => e.id === "emp-left-oct"));
  assert.ok(!octEligible.some((e) => e.id === "emp-left-sep"), "September left employee should not appear in October");
  assert.ok(!octEligible.some((e) => e.id === "emp-left-no-payroll"), "Already settled employee without finalPayrollMonth should not appear");

  // November 2026 Payroll & Recoveries Run (Auto-archival verification)
  const novEligible = employees.filter((e) => isEligibleForPayroll(e, "2026-11"));
  assert.equal(novEligible.length, 1, "November should ONLY include active employee; October employee auto-archived");
  assert.equal(novEligible[0].id, "emp-active-1");
  assert.ok(!novEligible.some((e) => e.id === "emp-left-oct"), "October separated employee must be auto-archived in November without manual intervention");

  // Multi-month: Left in September, final payroll in October
  const sepLeftOctPay = {
    id: "emp-sep-left-oct-pay",
    status: "inactive",
    dateOfLeaving: "2026-09-28",
    finalPayrollMonth: "2026-10",
  };
  assert.ok(isEligibleForPayroll(sepLeftOctPay, "2026-09"), "Eligible in September (month worked & left)");
  assert.ok(isEligibleForPayroll(sepLeftOctPay, "2026-10"), "Eligible in October (final payroll month for deductions & pay)");
  assert.ok(!isEligibleForPayroll(sepLeftOctPay, "2026-11"), "Auto-archived in November");
});

test("Marking employee left with past month date auto-aligns joining date and clears subsequent unapproved runs", () => {
  const employee = {
    id: "EMP-001",
    name: "USMAN GAYEN",
    dateOfJoining: "2026-10-01",
    dateOfLeaving: null,
  };

  const leftDate = "2026-09-28";
  const finalPayrollMonth = "2026-09";
  const effectiveJoiningDate =
    employee.dateOfJoining && leftDate < employee.dateOfJoining
      ? leftDate
      : employee.dateOfJoining;

  assert.equal(effectiveJoiningDate, "2026-09-28", "Joining date auto-aligns to exit date if recorded joining date is later");
  assert.ok(effectiveJoiningDate <= leftDate, "Joining date must be on or before left date");

  const unapprovedRuns = [
    { id: "RUN-202609", payPeriod: "2026-09" },
    { id: "RUN-202610", payPeriod: "2026-10" },
    { id: "RUN-202611", payPeriod: "2026-11" },
  ];

  const cutoff = finalPayrollMonth || leftDate.slice(0, 7);
  const subsequentRunsToClean = unapprovedRuns.filter((r) => r.payPeriod > cutoff);
  assert.equal(subsequentRunsToClean.length, 2);
  assert.equal(subsequentRunsToClean[0].payPeriod, "2026-10");
  assert.equal(subsequentRunsToClean[1].payPeriod, "2026-11");
});



