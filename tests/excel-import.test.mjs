import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { parsePayrollWorkbook } from "../lib/excel-import.ts";
import { installXmlDomParser } from "./xml-dom-shim.mjs";

installXmlDomParser();

function workbook(name, sheetXml) {
  const xml = {
    "xl/workbook.xml": `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${sheetXml}</sheetData></worksheet>`,
  };
  return new File([zipSync(Object.fromEntries(Object.entries(xml).map(([path, value]) => [path, strToU8(value)])))], `${name}.xlsx`);
}

function cell(address, value) {
  return typeof value === "number" ? `<c r="${address}"><v>${value}</v></c>` : `<c r="${address}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

test("imports Attendance Input rows, flexible week offs, and employee shifts", async () => {
  const file = workbook("Attendance Input", `<row r="5">${cell("B5", "EMP NO")}${cell("C5", "Name")}${cell("E5", "Department")}${cell("F5", "Shift")}${cell("G5", "1-Jul")}${cell("H5", "2-Jul")}${cell("I5", "3-Jul")}</row><row r="6">${cell("B6", "J83")}${cell("C6", "Employee One")}${cell("E6", "Production")}${cell("F6", "2nd Shift")}${cell("G6", "P")}${cell("H6", "WO")}${cell("I6", "HP")}</row>`);
  const result = await parsePayrollWorkbook(file, "2025-07");
  assert.equal(result.sourceType, "attendance");
  assert.equal(result.employees.length, 1);
  assert.equal(result.employees[0].defaultShift, "2nd Shift");
  assert.deepEqual(result.attendance.map((entry) => entry.statusCode), ["P", "WO", "HP"]);
  assert.equal(result.attendance[1].attendanceDate, "2025-07-02");
});

test("imports Salary Register components without expanding stray XFD cells", async () => {
  const file = workbook("Salary Register", `<row r="2">${cell("B2", "Emp ID")}${cell("C2", "Name")}</row><row r="3">${cell("B3", 13021)}${cell("C3", "Employee Two")}${cell("D3", "Quality")}${cell("I3", 123456789)}${cell("K3", "CUB0000123")}${cell("Y3", 18000)}${cell("AA3", 3500)}${cell("AM3", 1800)}${cell("AZ3", "Joy Room")}${cell("BB3", "AR1")}${cell("XFD3", "Ignored")}</row>`);
  const result = await parsePayrollWorkbook(file, "2025-07");
  assert.equal(result.sourceType, "salary");
  assert.equal(result.employees[0].employeeCode, "13021");
  assert.equal(result.employees[0].salaryAmount, 18000);
  assert.equal(result.employees[0].paymentMode, "bank");
  assert.equal(result.employees[0].roomNumber, "AR1");
  assert.equal(result.salaryItems[0].basic, 18000);
  assert.equal(result.salaryItems[0].hra, 3500);
  assert.equal(result.salaryItems[0].pfDeduction, 1800);
});

test("imports the employee-master format with hostel and UI profile fields", async () => {
  const file = workbook(
    "Employee Master",
    `<row r="1">${cell("A1", "Employee code")}${cell("B1", "Employee name")}${cell("C1", "Employee email ID")}${cell("D1", "Date of birth")}${cell("E1", "Accommodation type")}${cell("F1", "Hostel / area")}${cell("G1", "Room number")}${cell("H1", "Individual monthly rent")}${cell("I1", "EPF applicable")}${cell("J1", "Applicable shifts")}${cell("K1", "Employment type")}</row><row r="2">${cell("A2", "J1007")}${cell("B2", "Employee Three")}${cell("C2", "three@example.com")}${cell("D2", "2000-01-31")}${cell("E2", "Joy Hostel")}${cell("F2", "Joy Madhapur")}${cell("G2", "MF1")}${cell("H2", 1200)}${cell("I2", "No")}${cell("J2", "General, Night")}${cell("K2", "Direct")}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-09");
  assert.equal(result.sourceType, "employee");
  assert.equal(result.employees.length, 1);
  assert.equal(result.employees[0].employeeCode, "J1007");
  assert.equal(result.employees[0].hostelName, "Joy Madhapur");
  assert.equal(result.employees[0].roomNumber, "MF1");
  assert.equal(result.employees[0].roomRentAmount, 1200);
  assert.equal(result.employees[0].pfApplicable, "no");
  assert.deepEqual(JSON.parse(result.employees[0].applicableShiftsJson), [
    "General",
    "Night",
  ]);
  assert.equal(result.employees[0].employmentType, "direct");
});

test("imports custom sheet name like payroll-register-2026-08 (10) and abbreviated headers", async () => {
  const file = workbook(
    "payroll-register-2026-08 (10)",
    `<row r="1">${cell("B1", "Emp ID")}${cell("C1", "Name")}${cell("D1", "Pay Mont")}${cell("E1", "Fixed W D")}${cell("F1", "W Days")}${cell("N1", "Payable D")}${cell("O1", "OT Hrs")}${cell("S1", "Wages")}${cell("U1", "OT Wages")}</row><row r="2">${cell("B2", "CE0017")}${cell("C2", "PALANJOY")}${cell("D2", "Daily")}${cell("E2", 25)}${cell("F2", 20)}${cell("N2", 20)}${cell("O2", 0)}${cell("S2", 12000)}${cell("U2", 225)}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-08");
  assert.equal(result.sourceType, "salary");
  assert.equal(result.employees.length, 1);
  assert.equal(result.employees[0].employeeCode, "CE0017");
  assert.equal(result.employees[0].name, "PALANJOY");
  assert.equal(result.employees[0].salaryBasis, "daily");
  assert.equal(result.salaryItems[0].fixedWorkingDays, 25);
  assert.equal(result.salaryItems[0].presentDays, 20);
  assert.equal(result.salaryItems[0].payableDays, 20);
  assert.equal(result.salaryItems[0].basic, 12000);
  assert.equal(result.salaryItems[0].overtimeWages, 225);
});

test("imports minimal employee master with missing optional headers and null defaults", async () => {
  const file = workbook(
    "Sheet1",
    `<row r="1">${cell("A1", "Emp ID")}${cell("B1", "Name")}${cell("C1", "Department")}${cell("D1", "Mobile")}</row><row r="2">${cell("A2", "CE0099")}${cell("B2", "John Doe")}${cell("C2", "Spinning")}${cell("D2", "9876543210")}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-08");
  assert.equal(result.sourceType, "employee");
  assert.equal(result.employees.length, 1);
  assert.equal(result.employees[0].employeeCode, "CE0099");
  assert.equal(result.employees[0].name, "John Doe");
  assert.equal(result.employees[0].department, "Spinning");
  assert.equal(result.employees[0].mobileNumber, "9876543210");
  assert.equal(result.employees[0].uanMasked, null);
  assert.equal(result.employees[0].esiMasked, null);
  assert.equal(result.employees[0].bankAccountMasked, null);
  assert.equal(result.employees[0].bloodGroup, null);
  assert.equal(result.employees[0].highestQualification, null);
});

test("prevents duplicate column claiming and calculates OT wages from OT hours", async () => {
  const file = workbook(
    "Arjuna Register",
    `<row r="1">${cell("A1", "Emp ID")}${cell("B1", "Name")}${cell("C1", "Pay Monthly/Daily")}${cell("D1", "Fixed W Days")}${cell("E1", "W Days")}${cell("F1", "Payable Days")}${cell("G1", "OT Hrs")}${cell("H1", "Wages")}${cell("I1", "Gross Earnings")}${cell("J1", "PF")}${cell("K1", "ESI")}</row><row r="2">${cell("A2", "AJ001")}${cell("B2", "LALHRIATPUIA")}${cell("C2", "Daily")}${cell("D2", 26)}${cell("E2", 26)}${cell("F2", 26)}${cell("G2", 108)}${cell("H2", 322)}${cell("I2", 24490)}${cell("J2", 1934)}${cell("K2", 121)}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-08");
  assert.equal(result.sourceType, "salary");
  assert.equal(result.employees[0].employeeCode, "AJ001");
  assert.equal(result.salaryItems[0].basic, 8372); // 322 * 26
  assert.equal(result.salaryItems[0].overtimeHours, 108);
  assert.equal(result.salaryItems[0].overtimeWages, 4347); // 108 * (322 / 8 = 40.25) = 4347
  assert.notEqual(result.salaryItems[0].basic, result.salaryItems[0].overtimeWages);
  assert.equal(result.salaryItems[0].attendanceBonus ?? 0, 0); // No spurious attendance bonus
});

test("hybrid payroll totals prioritize explicit imported Excel values with fallback and discrepancy check", async () => {
  const { payrollTotals } = await import("../lib/payroll-calculations.ts");

  // Case 1: Full explicit Excel totals match
  const exactTotals = payrollTotals({
    basic: 12000,
    hra: 2400,
    pfDeduction: 1440,
    importedGrossEarnings: 14400,
    importedTotalDeductions: 1440,
    importedNetPayable: 12960,
  });
  assert.equal(exactTotals.grossEarnings, 14400);
  assert.equal(exactTotals.totalDeductions, 1440);
  assert.equal(exactTotals.netPayable, 12960);
  assert.equal(exactTotals.hasMathDiscrepancy, false);

  // Case 2: Math difference in Excel input (e.g. human typing error in Excel Net)
  const discrepancyTotals = payrollTotals({
    basic: 12000,
    hra: 2400,
    pfDeduction: 1440,
    importedGrossEarnings: 14400,
    importedTotalDeductions: 1440,
    importedNetPayable: 12000, // Excel Net is 12000 instead of 12960
  });
  assert.equal(discrepancyTotals.grossEarnings, 14400);
  assert.equal(discrepancyTotals.totalDeductions, 1440);
  assert.equal(discrepancyTotals.netPayable, 12000); // Preserves exact Excel Net
  assert.equal(discrepancyTotals.calculatedNet, 12960);
  assert.equal(discrepancyTotals.hasMathDiscrepancy, true);

  // Case 3: Missing imported totals falls back smoothly to itemized sum
  const fallbackTotals = payrollTotals({
    basic: 10000,
    da: 2000,
    overtimeWages: 1500,
    pfDeduction: 1200,
    esiDeduction: 101,
  });
  assert.equal(fallbackTotals.grossEarnings, 13500);
  assert.equal(fallbackTotals.totalDeductions, 1301);
  assert.equal(fallbackTotals.netPayable, 12199);
  assert.equal(fallbackTotals.hasMathDiscrepancy, false);

  // Case 4: Negative net balance (deductions exceed earnings) clamps netPayable to 0.00 and captures unrecoveredAmount
  const negativeTotals = payrollTotals({
    basic: 2000,
    pfDeduction: 250,
    accommodationDeduction: 3500,
  });
  assert.equal(negativeTotals.grossEarnings, 2000);
  assert.equal(negativeTotals.totalDeductions, 3750);
  assert.equal(negativeTotals.netPayable, 0);
  assert.equal(negativeTotals.unrecoveredAmount, 1750);
  assert.equal(negativeTotals.rawNetPayable, -1750);
});

test("accurately maps Canteen as a deduction and does not falsely match Conveyance/CA", async () => {
  const file = workbook(
    "payroll-register-2026-08 (10)",
    `<row r="1">${cell("B1", "Emp ID")}${cell("C1", "Name")}${cell("N1", "Payable D")}${cell("S1", "Wages")}${cell("U1", "OT Wages")}${cell("AD1", "Gross Earr")}${cell("AI1", "Canteen")}${cell("AP1", "Total Dedi")}${cell("AQ1", "Net Payable")}</row>` +
    `<row r="2">${cell("B2", "CE0383")}${cell("C2", "PREMSAGAR RAM")}${cell("N2", 19)}${cell("S2", 11400)}${cell("U2", 112.5)}${cell("AD2", 11512.5)}${cell("AI2", 2100)}${cell("AP2", 3800)}${cell("AQ2", 7712.5)}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-08");
  assert.equal(result.sourceType, "salary");
  const item = result.salaryItems[0];
  assert.equal(item.employeeCode, "CE0383");
  assert.equal(item.basic, 11400);
  assert.equal(item.overtimeWages, 112.5);
  assert.equal(item.conveyance || 0, 0, "Conveyance must be 0, not mapped to Canteen!");
  assert.equal(item.canteen, 2100, "Canteen must be 2100 deduction!");
  assert.equal(item.importedGrossEarnings, 11512.5);
  assert.equal(item.importedTotalDeductions, 3800);
  assert.equal(item.importedNetPayable, 7712.5);
});

test("accurately preserves 16-18 digit bank account numbers, leading zeros, and expands scientific notation", async () => {
  const file = workbook(
    "Employee Master",
    `<row r="1">${cell("A1", "Employee code")}${cell("B1", "Employee name")}${cell("C1", "Bank account number")}${cell("D1", "Bank account branch / City")}${cell("E1", "IFSC code")}${cell("F1", "UAN")}</row>` +
    `<row r="2">${cell("A2", "J1001")}${cell("B2", "Emp One")}${cell("C2", "1837201700018130")}${cell("D2", "Chennai Central")}${cell("E2", "IDIB000M040")}${cell("F2", "101234567890")}</row>` +
    `<row r="3">${cell("A3", "J1002")}${cell("B3", "Emp Two")}<c r="C3"><v>1.83720170001813E+15</v></c>${cell("D3", "Madurai")}${cell("E3", "SBIN0001234")}${cell("F3", "101234567891")}</row>` +
    `<row r="4">${cell("A4", "J1003")}${cell("B4", "Emp Three")}${cell("C4", "00501071193150")}${cell("D4", "Coimbatore")}${cell("E4", "HDFC0000001")}${cell("F4", "101234567892")}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-09");
  assert.equal(result.sourceType, "employee");
  assert.equal(result.employees.length, 3);
  assert.equal(result.employees[0].bankAccountMasked, "1837201700018130");
  assert.equal(result.employees[0].bankBranch, "Chennai Central");
  assert.equal(result.employees[1].bankAccountMasked, "1837201700018130");
  assert.equal(result.employees[1].bankBranch, "Madurai");
  assert.equal(result.employees[2].bankAccountMasked, "00501071193150");
  assert.equal(result.employees[2].bankBranch, "Coimbatore");
});

test("accurately parses employee master room data and accommodation types for unit uploads", async () => {
  const file = workbook(
    "Employee Master",
    `<row r="1">${cell("A1", "Employee code")}${cell("B1", "Employee name")}${cell("C1", "Accommodation type")}${cell("D1", "Room number")}${cell("E1", "Hostel / area")}</row>` +
    `<row r="2">${cell("A2", "59750")}${cell("B2", "BINOD KUMAR")}${cell("C2", "Joy Room")}${cell("D2", "MF3")}${cell("E2", "Joy - Madhappur")}</row>` +
    `<row r="3">${cell("A3", "59181")}${cell("B3", "SOHU RAI")}${cell("C3", "Tamil / Own Accommodation")}${cell("D3", "")}${cell("E3", "")}</row>` +
    `<row r="4">${cell("A4", "5000595")}${cell("B4", "SAMBITA REANG")}${cell("C4", "Outside Room")}${cell("D4", "AR9")}${cell("E4", "Arugampalayam")}</row>` +
    `<row r="5">${cell("A5", "5000141")}${cell("B5", "MUTHU MANI V")}${cell("C5", "")}${cell("D5", "")}${cell("E5", "")}</row>` +
    `<row r="6">${cell("A6", "5000157")}${cell("B6", "MADAPPAN")}${cell("C6", "Tamil Own")}${cell("D6", "")}${cell("E6", "")}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-09");
  assert.equal(result.sourceType, "employee");
  assert.equal(result.employees.length, 5);
  assert.equal(result.employees[0].roomNumber, "MF3");
  assert.equal(result.employees[0].hostelName, "Joy - Madhappur");
  assert.equal(result.employees[1].accommodationType, "Tamil / Own Accommodation");
  assert.equal(result.employees[1].roomNumber, null);
  assert.equal(result.employees[2].accommodationType, "Outside Room");
  assert.equal(result.employees[2].roomNumber, "AR9");
  assert.equal(result.employees[3].accommodationType, "Tamil / Own Accommodation");
  assert.equal(result.employees[3].roomNumber, null);
  assert.equal(result.employees[4].accommodationType, "Tamil / Own Accommodation");
  assert.equal(result.employees[4].roomNumber, null);
});test("accurately imports standard 44-column payroll register with Day rate, Wages, and Basic", async () => {
  const headers = [
    "Sl no", "Emp ID", "Name", "Pay Monthly/Daily", "Fixed W Days", "W Days", "NFH", "CO", "OD",
    "Sundays", "PL", "CL", "Payable Days", "Day rate", "Wages", "Basic", "DA", "HRA",
    "Food Allowance", "Night Allowance", "OT Hrs", "OT Wages", "Attendance Bonus", "Arrears",
    "Holiday Wages", "Sunday Earnings", "Leave Wages", "Room Allowance", "Production Incentive",
    "Medical Allowance", "Gross Earnings", "PF Deductions", "ESI Deductions", "Professional Tax",
    "LWF", "Canteen", "Snacks", "Rent", "Advance", "Others", "TDS", "Medical insurance",
    "Total Deductions", "Net Payable",
  ];
  let hRow = "";
  headers.forEach((h, i) => {
    // Generate Excel column name (A..Z, AA..AR)
    const colCode = i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`;
    hRow += cell(`${colCode}1`, h);
  });

  const rowValues = [
    1, "J0018", "Krishna Hansda", "Daily", 26, 20, 0, 0, 0,
    0, 0, 0, 20, 585, 11697, 8189, 0, 0,
    0, 0, 87, 6360.2, 0, 0,
    0, 0, 0, 0, 0,
    0, 18057.2, 983, 141, 0,
    0, 330, 0, 0, 0, 0, 0, 0,
    1454, 16603.2,
  ];
  let dRow = "";
  rowValues.forEach((v, i) => {
    const colCode = i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`;
    dRow += cell(`${colCode}2`, v);
  });

  const file = workbook(
    "Payroll Register",
    `<row r="1">${hRow}</row><row r="2">${dRow}</row>`,
  );
  const result = await parsePayrollWorkbook(file, "2026-09");
  assert.equal(result.sourceType, "salary");
  assert.equal(result.employees[0].employeeCode, "J0018");
  assert.equal(result.employees[0].salaryAmount, 585);
  assert.equal(result.employees[0].salaryBasis, "daily");
  assert.equal(result.salaryItems[0].payableDays, 20);
  assert.equal(result.salaryItems[0].basic, 11697);
  assert.equal(result.salaryItems[0].overtimeHours, 87);
  assert.equal(result.salaryItems[0].overtimeWages, 6360.2);
  assert.equal(result.salaryItems[0].arrears, 0);
  assert.equal(result.salaryItems[0].importedGrossEarnings, 18057.2);
  assert.equal(result.salaryItems[0].pfDeduction, 983);
  assert.equal(result.salaryItems[0].esiDeduction, 141);
  assert.equal(result.salaryItems[0].canteen, 330);
  assert.equal(result.salaryItems[0].importedTotalDeductions, 1454);
  assert.equal(result.salaryItems[0].importedNetPayable, 16603.2);
});
