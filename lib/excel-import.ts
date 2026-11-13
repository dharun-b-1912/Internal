import { strFromU8, unzipSync } from "fflate";
import { numberValue, roundMoney } from "./payroll-calculations.ts";

type CellValue = string | number;
type SheetRow = Map<number, CellValue>;

export type ImportedEmployee = {
  employeeCode: string;
  name: string;
  department: string;
  dateOfJoining: string;
  uanMasked: string | null;
  esiMasked: string | null;
  bankAccountMasked: string | null;
  ifscMasked: string | null;
  bankName: string | null;
  bankBranch?: string | null;
  accommodationType: string;
  hostelName?: string | null;
  roomNumber: string | null;
  roomRentAmount?: number;
  paymentMode: string;
  salaryAmount: number;
  salaryBasis: string;
  defaultShift: string;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  emailAddress?: string | null;
  emergencyContactNumber?: string | null;
  addressLine?: string | null;
  district?: string | null;
  stateName?: string | null;
  pincode?: string | null;
  bloodGroup?: string | null;
  gender?: string | null;
  highestQualification?: string | null;
  fatherName?: string | null;
  maritalStatus?: string | null;
  spouseName?: string | null;
  pfApplicable?: string;
  pfWageAmount?: number;
  esiApplicable?: string;
  esiWageAmount?: number;
  ptApplicable?: string;
  lwfApplicable?: string;
  shiftPattern?: string;
  applicableShiftsJson?: string;
  remarks?: string | null;
  employmentType?: string;
};

export const EMPLOYEE_IMPORT_HEADERS = [
  "Employee code",
  "Employee name",
  "Department",
  "Employment type",
  "Date of joining",
  "Date of birth",
  "Employee mobile number",
  "Employee email ID",
  "Emergency contact number",
  "Residential address",
  "District",
  "State",
  "Pincode",
  "Blood group",
  "Highest qualification",
  "Father name",
  "Marital status",
  "Spouse name",
  "Basic salary / daily rate",
  "Salary basis",
  "Default shift",
  "Shift pattern",
  "Applicable shifts",
  "Payment mode",
  "UAN",
  "ESI number",
  "Bank account number",
  "IFSC code",
  "Bank name",
  "Bank account branch / City",
  "EPF applicable",
  "Customized EPF wage",
  "ESI applicable",
  "Customized ESI wage",
  "Professional Tax",
  "Tamil Nadu LWF",
  "Accommodation type",
  "Hostel / area",
  "Room number",
  "Individual monthly rent",
  "Other remarks",
] as const;

export type ImportedAttendance = {
  employeeCode: string;
  attendanceDate: string;
  statusCode: string;
  shiftCode: string;
  overtimeHours: number;
};

export type ImportedSalaryItem = Record<string, string | number> & {
  employeeCode: string;
};

export type WorkbookImport = {
  sourceType: "attendance" | "salary" | "employee" | "csv" | "txt";
  sheetName: string;
  employees: ImportedEmployee[];
  attendance: ImportedAttendance[];
  salaryItems: ImportedSalaryItem[];
};

const validCodes = new Set([
  "P",
  "HD",
  "HALF DAY",
  "HALFDAY",
  "0.5P",
  "A",
  "L",
  "WO",
  "H",
  "HP",
]);

function xml(bytes: Uint8Array | undefined, name: string) {
  if (!bytes) throw new Error(`The workbook is missing ${name}.`);
  const document = new DOMParser().parseFromString(
    strFromU8(bytes),
    "application/xml",
  );
  if (document.getElementsByTagName("parsererror").length)
    throw new Error(`Unable to read ${name}.`);
  return document;
}

function columnIndex(address: string) {
  let result = 0;
  for (const character of address.replace(/\d/g, "").toUpperCase())
    result = result * 26 + character.charCodeAt(0) - 64;
  return result - 1;
}

function formatRawExcelValue(raw: string): string {
  const trimmed = raw.trim();
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(trimmed)) {
    try {
      const [mantissaStr, expStr] = trimmed.split(/[eE]/i);
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
    } catch {
      // fallback to trimmed
    }
  }
  return trimmed;
}

function text(value: CellValue | undefined) {
  if (value === undefined || value === null) return "";
  const str = String(value).trim();
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(str)) {
    return formatRawExcelValue(str);
  }
  return str;
}

function nullable(value: CellValue | undefined) {
  return text(value) || null;
}

function dateValue(value: CellValue | undefined, fallback: string) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isNaN(num) && num > 25000 && num < 80000) {
    const date = new Date(Math.round((num - 25569) * 86400000));
    return date.toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : fallback;
}

function normalizeAccommodation(value: CellValue | undefined) {
  const name = text(value);
  if (!name) return "Tamil / Own Accommodation";
  const lower = name.toLowerCase();
  if (
    lower === "tamil" ||
    lower === "tamil own" ||
    lower === "own" ||
    lower === "own accommodation" ||
    lower === "tamil / own accommodation" ||
    lower === "tamil accommodation" ||
    lower === "none"
  ) {
    return "Tamil / Own Accommodation";
  }
  if (lower === "joy" || lower === "joy hostel" || lower === "joy room") {
    return "Joy Room";
  }
  if (lower === "outside" || lower === "outside room" || lower === "outside hostel") {
    return "Outside Room";
  }
  return name;
}

function normalizeHeader(value: CellValue | undefined) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function worksheetRows(document: Document, strings: string[]) {
  const rows: SheetRow[] = [];
  for (const element of Array.from(document.getElementsByTagName("row"))) {
    const row = new Map<number, CellValue>();
    for (const cell of Array.from(element.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") ?? "");
      if (index < 0 || index > 70) continue;
      const kind = cell.getAttribute("t");
      const isElement = cell.getElementsByTagName("is")[0] || cell.getElementsByTagName("t")[0];
      const raw = cell.getElementsByTagName("v")[0]?.textContent;
      let value: CellValue | undefined;
      if (kind === "inlineStr" || (isElement && !raw))
        value = isElement?.textContent ?? "";
      else if (kind === "s") {
        const strIdx = Number(raw);
        value = Number.isFinite(strIdx) && strings[strIdx] !== undefined ? strings[strIdx] : "";
      } else if (kind === "str") {
        value = raw ?? "";
      } else if (raw !== undefined && raw !== null) {
        value = formatRawExcelValue(raw);
      }
      if (value !== undefined && value !== "") row.set(index, value);
    }
    if (row.size) rows.push(row);
  }
  return rows;
}

function workbookSheets(buffer: ArrayBuffer) {
  const archive = unzipSync(new Uint8Array(buffer), {
    filter: (file) =>
      file.name.startsWith("xl/") ||
      file.name === "xl/workbook.xml" ||
      file.name === "xl/_rels/workbook.xml.rels" ||
      file.name === "xl/sharedStrings.xml" ||
      file.name.includes("worksheets/"),
  });
  const workbook = xml(archive["xl/workbook.xml"], "workbook.xml");
  const relationships = xml(
    archive["xl/_rels/workbook.xml.rels"],
    "workbook relationships",
  );
  const relationshipMap = new Map(
    Array.from(relationships.getElementsByTagName("Relationship")).map(
      (relationship) => [
        relationship.getAttribute("Id"),
        relationship.getAttribute("Target") ?? "",
      ],
    ),
  );
  const strings = archive["xl/sharedStrings.xml"]
    ? Array.from(
        xml(archive["xl/sharedStrings.xml"], "shared strings").getElementsByTagName(
          "si",
        ),
        (entry) => {
          const tElements = entry.getElementsByTagName("t");
          if (tElements.length > 0) {
            return Array.from(tElements).map(t => t.textContent ?? "").join("");
          }
          return entry.textContent ?? "";
        },
      )
    : [];
  return Array.from(workbook.getElementsByTagName("sheet"), (sheet) => {
    const relationshipId =
      sheet.getAttribute("r:id") ??
      sheet.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      );
    const target = relationshipMap.get(relationshipId) ?? "";
    const path = target.startsWith("/")
      ? target.slice(1)
      : target.startsWith("xl/")
        ? target
        : `xl/${target.replace(/^\.\//, "")}`;
    return {
      name: sheet.getAttribute("name") ?? "Sheet",
      rows: archive[path]
        ? worksheetRows(xml(archive[path], path), strings)
        : [],
    };
  });
}

function emptyEmployee(
  code: string,
  name: string,
  period: string,
): ImportedEmployee {
  return {
    employeeCode: code,
    name,
    department: "General",
    dateOfJoining: `${period}-01`,
    uanMasked: null,
    esiMasked: null,
    bankAccountMasked: null,
    ifscMasked: null,
    bankName: null,
    accommodationType: "Tamil / Own Accommodation",
    roomNumber: null,
    paymentMode: "cash",
    salaryAmount: 0,
    salaryBasis: "monthly",
    defaultShift: "General",
  };
}

const VALID_ATTENDANCE_CODES = new Set([
  "P",
  "A",
  "HD",
  "WO",
  "H",
  "HP",
  "CO",
  "L",
]);

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function normalizeAttendanceStatus(raw: string): string {
  const clean = raw.trim().toUpperCase();
  if (["PRESENT", "PR", "P"].includes(clean)) return "P";
  if (["ABSENT", "AB", "A"].includes(clean)) return "A";
  if (["HALF DAY", "HALFDAY", "0.5P", "0.5", "HD"].includes(clean)) return "HD";
  if (["WEEK OFF", "WEEKOFF", "OFF", "WO"].includes(clean)) return "WO";
  if (["HOLIDAY", "HOL", "H"].includes(clean)) return "H";
  if (["HOLIDAY PRESENT", "HP"].includes(clean)) return "HP";
  if (["COMP OFF", "COMPOFF", "CO"].includes(clean)) return "CO";
  if (["LEAVE", "L", "PL", "CL", "SL", "EL"].includes(clean)) return "L";
  return clean;
}

function parseAttendanceCellText(
  cellText: string,
  shiftHours = 8,
  breakHours = 1,
): { statusCode: string; overtimeHours: number } | null {
  const trimmed = cellText.trim();
  if (!trimmed) return null;

  // 1. Check for punch in - punch out pattern: "09:00 - 21:00", "08:30 to 20:30", "09:00 am - 09:00 pm"
  const punchMatch = trimmed.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|\/)\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (punchMatch) {
    const inMins = parseTimeToMinutes(punchMatch[1]);
    const outMins = parseTimeToMinutes(punchMatch[2]);
    if (inMins !== null && outMins !== null) {
      let diff = outMins - inMins;
      if (diff < 0) diff += 24 * 60; // overnight shift handling
      const grossHours = Math.round((diff / 60) * 10) / 10;
      const netWorkedHours = Math.max(0, Math.round((grossHours - breakHours) * 10) / 10);
      const otHours = Math.max(0, Math.round((netWorkedHours - shiftHours) * 10) / 10);
      const statusCode = netWorkedHours >= Math.floor(shiftHours / 2) ? (netWorkedHours >= Math.max(1, shiftHours - 2) ? "P" : "HD") : "A";
      return { statusCode, overtimeHours: otHours };
    }
  }

  // 2. Check for pipe/slash/hyphen/colon/space separation: "P | 4", "P | 3.5", "P|4", "P/4", "P - 4", "P:4", "P 4", "A | 0", "A 0"
  const sepMatch = trimmed.match(/^([A-Za-z]+)\s*(?:[|/:\-]\s*|\s+)\+?(\d+(?:\.\d+)?)\s*(?:h|hrs|hours)?$/i);
  if (sepMatch) {
    const status = normalizeAttendanceStatus(sepMatch[1]);
    const ot = Number(sepMatch[2]) || 0;
    if (VALID_ATTENDANCE_CODES.has(status)) {
      return { statusCode: status, overtimeHours: ot };
    }
  }

  // 3. Check for bracketed OT: "P (4h)", "P (+4)", "P(+4h)", "P+4h"
  const bracketMatch = trimmed.match(/^([A-Za-z]+)\s*(?:\(\+?(\d+(?:\.\d+)?)\s*h?\s*\)|\+\s*(\d+(?:\.\d+)?)\s*h?)/i);
  if (bracketMatch) {
    const status = normalizeAttendanceStatus(bracketMatch[1]);
    const ot = Number(bracketMatch[2] || bracketMatch[3]) || 0;
    if (VALID_ATTENDANCE_CODES.has(status)) {
      return { statusCode: status, overtimeHours: ot };
    }
  }

  // 4. Plain attendance status code: "P", "A", "HD", "WO", "H", "HP", "CO", "L", "PRESENT", "ABSENT"
  const plainStatus = normalizeAttendanceStatus(trimmed);
  if (VALID_ATTENDANCE_CODES.has(plainStatus)) {
    return { statusCode: plainStatus, overtimeHours: 0 };
  }

  return null;
}

function attendanceSheet(
  name: string,
  rows: SheetRow[],
  period: string,
): WorkbookImport {
  const headerIndex = rows.findIndex((row) =>
    Array.from(row.values()).some((value) =>
      /^(emp\s*(no|id|code)|employee\s*(no|id|code)|id|code)$/i.test(text(value).trim()),
    ),
  );
  if (headerIndex < 0)
    throw new Error("Attendance sheet needs an EMP NO or Emp ID column.");
  const headers = rows[headerIndex];
  const employeeColumn =
    Array.from(headers).find(([, value]) =>
      /^(emp\s*(no|id|code)|employee\s*(no|id|code)|id|code)$/i.test(text(value).trim()),
    )?.[0] ?? 1;
  const nameColumn =
    Array.from(headers).find(([, value]) =>
      /^(name|employee\s*name|emp\s*name|full\s*name)$/i.test(text(value).trim()),
    )?.[0] ?? 2;
  const departmentColumn =
    Array.from(headers).find(([, value]) =>
      /department|dept/i.test(text(value).trim()),
    )?.[0] ?? 4;
  const shiftColumn =
    Array.from(headers).find(([, value]) =>
      /^(shift|default\s*shift)$/i.test(text(value).trim()),
    )?.[0] ?? 5;
  type DayColumnGroup = {
    day: number;
    attColumn?: number;
    otColumn?: number;
    genericColumn?: number;
  };

  const dayMap = new Map<number, DayColumnGroup>();
  for (const [column, value] of headers) {
    const raw = text(value).trim();
    const match = raw.match(/^(\d{1,2})(?:[-/ ]|$)/);
    if (!match) continue;
    const day = Number(match[1]);
    if (day < 1 || day > 31) continue;

    let group = dayMap.get(day);
    if (!group) {
      group = { day };
      dayMap.set(day, group);
    }

    const lower = raw.toLowerCase();
    if (lower.includes("ot") || lower.includes("overtime")) {
      group.otColumn = column;
    } else if (lower.includes("att") || lower.includes("status")) {
      group.attColumn = column;
    } else {
      if (group.genericColumn === undefined) {
        group.genericColumn = column;
      }
    }
  }

  const dayGroups = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  if (!dayGroups.length)
    throw new Error("Attendance sheet needs day columns such as 1-Jul and 2-Jul.");

  const imported: WorkbookImport = {
    sourceType: "attendance",
    sheetName: name,
    employees: [],
    attendance: [],
    salaryItems: [],
  };
  for (const row of rows.slice(headerIndex + 1)) {
    const code = text(row.get(employeeColumn));
    const nameValue = text(row.get(nameColumn));
    if (!code || !nameValue) continue;
    const employee = emptyEmployee(code, nameValue, period);
    employee.department = text(row.get(departmentColumn)) || "General";
    employee.defaultShift = text(row.get(shiftColumn)) || "General";
    imported.employees.push(employee);

    const shiftHours = /12\s*(?:h|hr|hour)/i.test(employee.defaultShift) ? 12 : 8;
    const breakHours = 1;

    for (const group of dayGroups) {
      let statusCode = "";
      let overtimeHours = 0;

      // 1. Check explicit Att column
      if (group.attColumn !== undefined) {
        const attText = text(row.get(group.attColumn)).trim();
        if (attText) {
          const parsed = parseAttendanceCellText(attText, shiftHours, breakHours);
          if (parsed) {
            statusCode = parsed.statusCode;
            overtimeHours = parsed.overtimeHours;
          }
        }
      }

      // 2. Check generic column if status not found yet
      if (!statusCode && group.genericColumn !== undefined) {
        const genText = text(row.get(group.genericColumn)).trim();
        if (genText) {
          const parsed = parseAttendanceCellText(genText, shiftHours, breakHours);
          if (parsed) {
            statusCode = parsed.statusCode;
            overtimeHours = parsed.overtimeHours;
          }
        }
      }

      // 3. Check explicit OT column
      if (group.otColumn !== undefined) {
        const otText = text(row.get(group.otColumn)).trim();
        if (otText) {
          const otNum = Number(otText);
          if (Number.isFinite(otNum) && otNum >= 0) {
            overtimeHours = otNum;
            if (!statusCode) statusCode = "P";
          }
        }
      }

      if (statusCode) {
        imported.attendance.push({
          employeeCode: code,
          attendanceDate: `${period}-${String(group.day).padStart(2, "0")}`,
          statusCode,
          shiftCode: employee.defaultShift,
          overtimeHours,
        });
      }
    }
  }
  return imported;
}

function looksLikeAttendance(rows: SheetRow[]) {
  return rows.some((row) => {
    const values = Array.from(row.values()).map(text);
    const hasEmp = values.some((v) =>
      /^(emp\s*(no|id|code)|employee\s*(no|id|code)|id|code)$/i.test(v.trim()),
    );
    const dateColCount = values.filter((v) =>
      /^(\d{1,2})(?:[-/ ](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|[-/ ]|$)/i.test(
        v.trim(),
      ),
    ).length;
    return hasEmp && dateColCount >= 2;
  });
}

function looksLikeEmployeeMaster(rows: SheetRow[]) {
  if (looksLikeAttendance(rows)) return false;
  return rows.some((row) => {
    const headers = new Set(Array.from(row.values()).map(normalizeHeader));
    const hasCode =
      headers.has("employee code") ||
      headers.has("employee id") ||
      headers.has("emp id") ||
      headers.has("emp code") ||
      headers.has("code") ||
      headers.has("emp no");
    const hasName =
      headers.has("employee name") ||
      headers.has("name") ||
      headers.has("emp name") ||
      headers.has("full name");
    if (!hasCode || !hasName) return false;
    const empSpecificHeaders = [
      "employee email id",
      "email",
      "email id",
      "mail",
      "date of birth",
      "dob",
      "birth date",
      "blood group",
      "blood",
      "bg",
      "pf applicable",
      "epf applicable",
      "accommodation type",
      "highest qualification",
      "qualification",
      "education",
      "father name",
      "father",
      "marital status",
      "emergency contact number",
      "emergency contact",
      "residential address",
      "address",
      "mobile number",
      "employee mobile number",
      "mobile",
      "phone",
      "contact",
      "designation",
      "date of joining",
      "doj",
      "joining date",
      "hostel area",
      "district",
      "state",
      "pincode",
      "pin code",
    ];
    return empSpecificHeaders.some((h) => headers.has(h));
  });
}

function looksLikeSalaryRegister(rows: SheetRow[]) {
  if (looksLikeAttendance(rows)) return false;
  return rows.some((row) => {
    const headers = new Set(Array.from(row.values()).map(normalizeHeader));
    const hasCode =
      headers.has("emp id") ||
      headers.has("employee code") ||
      headers.has("employee id") ||
      headers.has("emp code") ||
      headers.has("code") ||
      headers.has("emp no");
    const hasName =
      headers.has("name") ||
      headers.has("employee name") ||
      headers.has("emp name") ||
      headers.has("full name");
    return (
      hasCode &&
      hasName &&
      (headers.has("w days") ||
        headers.has("w d") ||
        headers.has("fixed w d") ||
        headers.has("fixed w days") ||
        headers.has("payable days") ||
        headers.has("payable d") ||
        headers.has("basic") ||
        headers.has("wages") ||
        headers.has("gross earnings") ||
        headers.has("total deductions") ||
        headers.has("net payable") ||
        headers.has("ot hrs") ||
        headers.has("hra") ||
        headers.has("pf deduction") ||
        headers.has("pf deductions") ||
        headers.has("esi deduction") ||
        headers.has("esi deductions") ||
        headers.has("gross") ||
        headers.has("salary"))
    );
  });
}

function employeeMasterSheet(
  name: string,
  rows: SheetRow[],
  period: string,
): WorkbookImport {
  const headerIndex = rows.findIndex((row) => {
    const headers = new Set(Array.from(row.values()).map(normalizeHeader));
    const hasCode =
      headers.has("employee code") ||
      headers.has("employee id") ||
      headers.has("emp id") ||
      headers.has("emp code") ||
      headers.has("code") ||
      headers.has("emp no");
    const hasName =
      headers.has("employee name") ||
      headers.has("name") ||
      headers.has("emp name") ||
      headers.has("full name");
    return hasCode && hasName;
  });
  if (headerIndex < 0)
    throw new Error("Employee Master needs Employee code and Employee name columns.");
  const headerMap = new Map<string, number>();
  for (const [column, cellValue] of rows[headerIndex]) {
    const header = normalizeHeader(cellValue);
    if (header && !headerMap.has(header)) headerMap.set(header, column);
  }
  const column = (...aliases: string[]) => {
    for (const alias of aliases) {
      const match = headerMap.get(normalizeHeader(alias));
      if (match !== undefined) return match;
    }
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      if (!norm) continue;
      for (const [key, idx] of headerMap.entries()) {
        const isBranchSearch = norm.includes("branch") || norm.includes("city");
        const isAcctNumSearch = norm.includes("account") || norm.includes("acct") || norm.includes("a c");
        if (isBranchSearch && (key.includes("number") || key.includes("no") || key.includes("num") || key.includes("code"))) continue;
        if (isAcctNumSearch && (key.includes("branch") || key.includes("city"))) continue;
        if (key === norm || key.startsWith(norm + " ") || key.endsWith(" " + norm) || key.includes(" " + norm + " ")) {
          return idx;
        }
      }
    }
    return undefined;
  };
  const value = (row: SheetRow, ...aliases: string[]) => {
    const index = column(...aliases);
    return index === undefined ? undefined : row.get(index);
  };
  const yesNo = (input: CellValue | undefined, fallback = "yes") => {
    const normalized = text(input).toLowerCase();
    if (!normalized) return fallback;
    return ["no", "n", "false", "0", "not required", "not applicable"].includes(
      normalized,
    )
      ? "no"
      : "yes";
  };
  const imported: WorkbookImport = {
    sourceType: "employee",
    sheetName: name,
    employees: [],
    attendance: [],
    salaryItems: [],
  };
  for (const row of rows.slice(headerIndex + 1)) {
    const code = text(
      value(row, "Employee code", "Employee ID", "Emp ID", "Emp Code", "Code", "EmpNo", "ID"),
    );
    const employeeName = text(
      value(row, "Employee name", "Name", "Emp Name", "Full Name"),
    );
    if (!code || !employeeName) continue;
    const employee = emptyEmployee(code, employeeName, period);
    employee.department = text(value(row, "Department", "Dept")) || "General";
    employee.employmentType = /direct/i.test(
      text(value(row, "Employment type", "Type")),
    )
      ? "direct"
      : "client";
    employee.dateOfJoining = dateValue(
      value(row, "Date of joining", "DOJ", "Joining Date", "Join Date"),
      `${period}-01`,
    );
    const birthDate = value(row, "Date of birth", "DOB", "Birth Date");
    employee.dateOfBirth = birthDate ? dateValue(birthDate, "") || null : null;
    employee.mobileNumber = nullable(
      value(row, "Employee mobile number", "Mobile number", "Mobile", "Phone", "Contact"),
    );
    employee.emailAddress = nullable(
      value(row, "Employee email ID", "Email", "Email ID", "Mail"),
    );
    employee.emergencyContactNumber = nullable(
      value(
        row,
        "Emergency contact number",
        "Emergency contact",
        "Emergency number",
        "Emergency phone",
      ),
    );
    employee.addressLine = nullable(
      value(
        row,
        "Residential address",
        "Address",
        "Address line",
        "Permanent address",
        "Current address",
      ),
    );
    employee.district = nullable(value(row, "District"));
    employee.stateName = nullable(value(row, "State", "State name"));
    employee.pincode = nullable(
      value(row, "Pincode", "PIN code", "PIN", "Postal code"),
    );
    employee.bloodGroup = nullable(value(row, "Blood group", "Blood", "BG"));
    employee.gender = nullable(value(row, "Gender", "Sex"));
    employee.highestQualification = nullable(
      value(row, "Highest qualification", "Qualification", "Education", "Degree"),
    );
    employee.fatherName = nullable(
      value(row, "Father name", "Father", "Father's name"),
    );
    employee.maritalStatus = nullable(
      value(row, "Marital status", "Marital"),
    );
    employee.spouseName = nullable(value(row, "Spouse name", "Spouse"));
    employee.salaryAmount = numberValue(
      value(
        row,
        "Basic salary / daily rate",
        "Salary amount",
        "Basic salary",
        "Basic wage",
        "Rate",
        "Salary",
      ),
    );
    employee.salaryBasis = /daily|day/i.test(
      text(value(row, "Salary basis", "Basis", "Pay basis")),
    )
      ? "daily"
      : "monthly";
    employee.defaultShift =
      text(value(row, "Default shift", "Shift")) || "General";
    employee.shiftPattern = /rotational/i.test(
      text(value(row, "Shift pattern", "Pattern")),
    )
      ? "rotational"
      : "general";
    const applicableShifts = text(
      value(row, "Applicable shifts", "Allowed shifts"),
    )
      .split(/[,|;]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    employee.applicableShiftsJson = JSON.stringify(
      applicableShifts.length ? applicableShifts : [employee.defaultShift],
    );
    employee.uanMasked = nullable(
      value(row, "UAN", "UAN / EPF", "UAN Number", "UAN No", "EPF No", "PF No", "EPF Number", "PF Number", "PF / UAN", "PF / UAN Number", "EPF / UAN", "PF Member ID", "PF", "EPF"),
    );
    employee.esiMasked = nullable(
      value(row, "ESI number", "ESI No", "ESI", "ESI IP", "IP No", "IP Number", "ESI IP Number", "ESI IP No", "ESIC No", "ESIC", "ESIC Number"),
    );
    employee.bankAccountMasked = nullable(
      value(row, "Bank account number", "Bank account no", "Bank account", "Account number", "Account no", "A/c No", "A/c Number", "Bank A/c", "Bank A/C No", "Bank Acc", "Bank Acc No", "Acc No", "Account", "A/c", "Acct No", "SB Account No", "SB A/c No", "Savings Account No"),
    );
    employee.paymentMode = employee.bankAccountMasked ? "bank" : "cash";
    employee.ifscMasked = nullable(
      value(row, "IFSC code", "IFSC", "IFSC Code", "Branch IFSC", "IFS Code", "Bank IFSC", "RTGS / IFSC"),
    );
    employee.bankName = nullable(value(row, "Bank name", "Bank", "Bank Name", "Name of Bank"));
    employee.bankBranch = nullable(
      value(row, "Bank account branch / City", "Bank account branch", "Bank branch", "City", "Branch", "Branch name", "Bank City"),
    );
    employee.pfApplicable = yesNo(
      value(row, "EPF applicable", "PF applicable", "EPF eligible", "PF eligible"),
    );
    const rawPfWage = numberValue(
      value(row, "Customized EPF wage", "Customized PF wage", "EPF wage amount", "PF wage amount", "EPF wage", "PF wage"),
    );
    employee.pfWageAmount = rawPfWage > 1000000 ? 0 : rawPfWage;

    employee.esiApplicable = yesNo(
      value(row, "ESI applicable", "ESI eligible", "ESI eligibility"),
    );
    const rawEsiWage = numberValue(
      value(row, "Customized ESI wage", "ESI wage amount", "ESI gross wage", "ESI wage"),
    );
    employee.esiWageAmount = rawEsiWage > 1000000 ? 0 : rawEsiWage;
    employee.ptApplicable = yesNo(
      value(row, "Professional Tax", "PT applicable", "PT"),
    );
    employee.lwfApplicable = yesNo(
      value(row, "Tamil Nadu LWF", "LWF applicable", "LWF"),
    );
    employee.accommodationType = normalizeAccommodation(
      value(row, "Accommodation type", "Accommodation"),
    );
    employee.hostelName = nullable(
      value(row, "Hostel / area", "Hostel", "Area", "Building"),
    );
    employee.roomNumber = nullable(
      value(row, "Room number", "Existing room", "Room", "Room no"),
    );
    employee.roomRentAmount = numberValue(
      value(row, "Individual monthly rent", "Room rent amount", "Rent", "Monthly rent", "Room rent"),
    );
    employee.remarks = nullable(
      value(row, "Other remarks", "Remarks", "Remark", "Note", "Comments"),
    );
    imported.employees.push(employee);
  }
  return imported;
}

function salarySheet(name: string, rows: SheetRow[], period: string): WorkbookImport {
  const normalizeHeader = (value: CellValue | undefined) =>
    text(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const headerIndex = rows.findIndex((row) => {
    const values = Array.from(row.values()).map(normalizeHeader);
    const hasCode =
      values.includes("emp id") ||
      values.includes("employee code") ||
      values.includes("employee id") ||
      values.includes("emp code") ||
      values.includes("code") ||
      values.includes("emp no");
    const hasName =
      values.includes("name") ||
      values.includes("employee name") ||
      values.includes("emp name") ||
      values.includes("full name");
    return hasCode && hasName;
  });
  if (headerIndex < 0)
    throw new Error("Salary Register sheet needs Emp ID and Name columns.");

  const headers = rows[headerIndex];
  const headerMap = new Map<string, number>();
  for (const [columnIndex, value] of headers) {
    const normalized = normalizeHeader(value);
    if (normalized && !headerMap.has(normalized)) headerMap.set(normalized, columnIndex);
  }

  const claimedColumns = new Set<number>();

  const peekColumn = (...aliases: string[]): number | undefined => {
    for (const alias of aliases) {
      const match = headerMap.get(normalizeHeader(alias));
      if (match !== undefined) return match;
    }
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      if (!norm) continue;
      for (const [key, idx] of headerMap.entries()) {
        if (norm.length > 3 && (key.startsWith(norm) || (key.length > 3 && norm.startsWith(key)))) {
          return idx;
        } else if (norm.length <= 3 && (key === norm || key.startsWith(norm + " "))) {
          return idx;
        }
      }
    }
    return undefined;
  };

  const column = (...aliases: string[]): number | undefined => {
    // 1. Exact match across all aliases first
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      for (const [key, idx] of headerMap.entries()) {
        if (!claimedColumns.has(idx) && key === norm) {
          claimedColumns.add(idx);
          return idx;
        }
      }
    }
    // 2. Strict prefix match across all aliases
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      if (!norm) continue;
      for (const [key, idx] of headerMap.entries()) {
        if (claimedColumns.has(idx)) continue;
        const isAliasMonetary = /wage|amount|pay|allow|bonus|arrear|incentive|earning|salary|rent|deduct|tax|canteen|snack/i.test(alias);
        const isKeyMonetary = /wage|amount|pay|allow|bonus|arrear|incentive|earning|salary|rent|deduct|tax|canteen|snack/i.test(key);
        const isAliasHoursOrDays = /^(ot|ot hrs|ot hours|w days|w d|working days|present days|nfh|sunday|sundays|wo|co|od|pl|cl|sl|payable days)$/i.test(alias);
        const isKeyHoursOrDays = /^(ot|ot hrs|ot hours|w days|w d|working days|present days|nfh|sunday|sundays|wo|co|od|pl|cl|sl|payable days)$/i.test(key);
        
        if (isAliasMonetary && isKeyHoursOrDays) continue;
        if (isAliasHoursOrDays && isKeyMonetary) continue;

        const isMatch = norm.length > 3
          ? (key.startsWith(norm) || (key.length > 3 && norm.startsWith(key)))
          : (key === norm || key.startsWith(norm + " "));

        if (isMatch) {
          claimedColumns.add(idx);
          return idx;
        }
      }
    }
    return undefined;
  };

  const isEmployerPayrollFormat =
    peekColumn("Emp ID", "Employee Code", "Employee ID") !== undefined &&
    peekColumn("Name", "Employee Name") !== undefined &&
    (peekColumn("W Days", "Working Days", "Present Days") !== undefined ||
      peekColumn("Basic", "Wages") !== undefined ||
      peekColumn("Gross Earnings", "Gross") !== undefined);

  if (!isEmployerPayrollFormat) return legacySalarySheet(name, rows, period);

  const codeColumn = column("Emp ID", "Employee Code", "Employee ID", "Emp Code", "Code", "EmpNo", "ID")!;
  const nameColumn = column("Name", "Employee Name", "Emp Name", "Full Name")!;
  const salaryBasisColumn = column("Pay Monthly/Daily", "Pay Monthly Daily", "Pay Mont", "Salary Basis", "Pay Basis");
  const fixedWorkingDaysColumn = column("Fixed W Days", "Fixed W D", "Fixed Working Days");
  const workedDaysColumn = column("W Days", "W D", "Working Days", "Present Days");
  const nfhColumn = column("NFH", "NFH Days");
  const compOffColumn = column("CO", "Comp Off");
  const onDutyColumn = column("OD", "On Duty");
  const sundayColumn = column("Sundays", "Sunday", "Week Off", "WO");
  const plColumn = column("PL", "Privilege Leave");
  const clColumn = column("CL", "Casual Leave");
  const slColumn = column("SL", "Sick Leave");
  const payableDaysColumn = column("Payable Days", "Payable D", "Paid Days");
  const overtimeHoursColumn = column("OT Hrs", "OT Hours", "Overtime Hours", "OT");
  const grossColumn = column("Gross Earnings", "Gross Salary", "Gross", "Gross Earr", "Gross Earn", "Gross Pay", "Gross Amount", "Total Gross");
  const totalDeductionColumn = column("Total Deductions", "Total Deduction", "Total Dedi", "Total Ded", "Deductions");
  const netColumn = column("Net Payable", "Net Pay", "Net Salary", "Take Home", "Net");

  const dayRateColumn = column("Day rate", "Day Rate", "Daily Rate", "Dayrate", "Rate per day");
  const wagesColumn = column("Wages", "Wage", "Basic Wages", "Earned Wages", "Basic Pay", "Basic Wage");
  const basicColumn = column("Basic", "Basic Salary", "Statutory Basic");
  const monetaryBasicColumn = wagesColumn ?? basicColumn;

  const monetaryColumns: Array<[number | undefined, string]> = [
    [monetaryBasicColumn, "basic"],
    [column("DA", "Dearness Allowance"), "da"],
    [column("HRA", "House Rent Allowance"), "hra"],
    [column("Conveyance Allowance", "Conveyance", "Conv Allow", "Conv", "CA Allowance", "CA"), "conveyance"],
    [column("Food Allowance", "Food Allow", "Food"), "foodAllowance"],
    [column("Night Allowance", "Night Allo", "Night"), "nightAllowance"],
    [column("OT Wages", "Overtime Wages", "OT Amount"), "overtimeWages"],
    [column("Attendance Bonus", "Att Bonus", "Bonus", "Attendanc"), "attendanceBonus"],
    [column("Arrears", "Arrear"), "arrears"],
    [column("Holiday Wages", "NFH Wage", "NFH Wages", "Holiday Pay"), "holidayWages"],
    [column("Sunday Earnings", "Sunday Ea", "Sunday Wages", "Sunday Wage", "Sunday"), "sundayEarnings"],
    [column("Leave Wages", "Leave Wage", "Leave wages", "Leave wage", "Leave Pay", "Leave", "Leave Salary", "Earned Leave Wage", "EL Wage", "PL Wages", "PL Wage"), "leaveWages"],
    [column("Room Allowance", "Room Allow", "Room Allo", "Room"), "roomAllowance"],
    [column("Production Incentive", "Production", "Productio", "Incentive"), "productionIncentive"],
    [column("Medical Allowance", "Medical Allow", "Medical A", "Medical"), "medicalAllowance"],
    [column("PF Deductions", "PF Deduction", "PF Deduct", "PF", "EPF"), "pfDeduction"],
    [column("ESI Deductions", "ESI Deduction", "ESI Deduc", "ESI"), "esiDeduction"],
    [column("Professional Tax", "Professor", "PT"), "professionalTax"],
    [column("LWF", "Labour Welfare"), "lwf"],
    [column("Canteen", "Canteen Deduction", "Mess", "Canteen Fee"), "canteen"],
    [column("Snacks", "Tea"), "snacks"],
    [column("Rent", "Tent", "Room Rent", "Accommodation Rent"), "tent"],
    [column("Advance", "Salary Advance", "Token"), "advance"],
    [column("Others", "Other Deduction", "Other Deductions", "Misc"), "otherDeduction"],
    [column("TDS", "Income Tax", "Tax"), "tds"],
    [column("Medical insurance", "Medical Insurance", "Medical In", "Insurance"), "medicalInsurance"],
  ];

  const accountColumn = column("Bank account number", "Bank account no", "Bank account", "Account number", "Account no", "A/c No", "A/c Number", "Bank A/c", "Bank A/C No", "Bank Acc", "Bank Acc No", "Acc No", "Account", "A/c", "Acct No", "SB Account No", "SB A/c No", "Savings Account No");
  const ifscColumn = column("IFSC code", "IFSC", "IFSC Code", "Branch IFSC", "IFS Code", "Bank IFSC", "RTGS / IFSC");
  const bankNameColumn = column("Bank name", "Bank", "Bank Name", "Name of Bank");
  const bankBranchColumn = column("Bank account branch / City", "Bank account branch", "Bank branch", "City", "Branch", "Branch name", "Bank City");
  const uanColumn = column("UAN", "UAN / EPF", "UAN Number", "UAN No", "EPF No", "PF No", "EPF Number", "PF Number", "PF / UAN");
  const esiColumn = column("ESI number", "ESI No", "ESI", "ESI IP", "IP No", "IP Number", "ESI IP Number", "ESI IP No", "ESIC No", "ESIC", "ESIC Number");
  const mobileColumn = column("Employee mobile number", "Mobile number", "Mobile no", "Mobile", "Phone", "Contact");
  const departmentColumn = column("Department", "Dept");
  const joiningColumn = column("Date of joining", "DOJ", "Joining Date", "Join Date");

  const imported: WorkbookImport = {
    sourceType: "salary",
    sheetName: name,
    employees: [],
    attendance: [],
    salaryItems: [],
  };

  for (const row of rows.slice(headerIndex + 1)) {
    const code = text(row.get(codeColumn));
    const employeeName = text(row.get(nameColumn));
    if (!code || !employeeName) continue;

    const employee = emptyEmployee(code, employeeName, period);
    if (departmentColumn !== undefined) employee.department = text(row.get(departmentColumn)) || "General";
    if (joiningColumn !== undefined) employee.dateOfJoining = dateValue(row.get(joiningColumn), `${period}-01`);
    if (accountColumn !== undefined) employee.bankAccountMasked = nullable(row.get(accountColumn));
    if (ifscColumn !== undefined) employee.ifscMasked = nullable(row.get(ifscColumn));
    if (bankNameColumn !== undefined) employee.bankName = nullable(row.get(bankNameColumn));
    if (bankBranchColumn !== undefined) employee.bankBranch = nullable(row.get(bankBranchColumn));
    if (uanColumn !== undefined) employee.uanMasked = nullable(row.get(uanColumn));
    if (esiColumn !== undefined) employee.esiMasked = nullable(row.get(esiColumn));
    if (mobileColumn !== undefined) employee.mobileNumber = nullable(row.get(mobileColumn));

    const salaryBasisText =
      salaryBasisColumn === undefined ? "" : text(row.get(salaryBasisColumn));
    if (/daily/i.test(salaryBasisText)) {
      employee.salaryBasis = "daily";
    } else if (/monthly/i.test(salaryBasisText)) {
      employee.salaryBasis = "monthly";
    }
    const grossVal = grossColumn === undefined ? 0 : numberValue(row.get(grossColumn));
    
    const dayRateVal = dayRateColumn === undefined ? 0 : numberValue(row.get(dayRateColumn));
    const wagesVal = wagesColumn === undefined ? 0 : numberValue(row.get(wagesColumn));
    const basicVal = basicColumn === undefined ? 0 : numberValue(row.get(basicColumn));
    const payableDays = payableDaysColumn === undefined ? 0 : numberValue(row.get(payableDaysColumn));

    if (dayRateVal > 0) {
      employee.salaryAmount = dayRateVal;
      employee.salaryBasis = "daily";
    }

    let earnedBasic = 0;
    if (wagesVal > 0) {
      if (dayRateVal > 0) {
        earnedBasic = wagesVal;
      } else if (wagesVal <= 1500 && payableDays > 0 && wagesVal * payableDays <= (grossVal || Infinity)) {
        employee.salaryAmount = wagesVal;
        employee.salaryBasis = "daily";
        earnedBasic = roundMoney(wagesVal * payableDays);
      } else {
        earnedBasic = wagesVal;
        if (!employee.salaryAmount && payableDays > 0) {
          employee.salaryAmount = Math.round((wagesVal / payableDays) * 100) / 100;
          employee.salaryBasis = "daily";
        }
      }
    } else if (dayRateVal > 0 && payableDays > 0) {
      earnedBasic = roundMoney(dayRateVal * payableDays);
    } else if (basicVal > 0) {
      if (basicVal <= 1500 && payableDays > 0 && basicVal * payableDays <= (grossVal || Infinity)) {
        employee.salaryAmount = basicVal;
        employee.salaryBasis = "daily";
        earnedBasic = roundMoney(basicVal * payableDays);
      } else {
        earnedBasic = basicVal;
        if (!employee.salaryAmount) employee.salaryAmount = basicVal;
      }
    } else if (grossVal > 0 && payableDays > 0) {
      const estimatedDailyRate = Math.round((grossVal / Math.max(1, payableDays)) * 100) / 100;
      if (!employee.salaryAmount) employee.salaryAmount = estimatedDailyRate;
    }
    imported.employees.push(employee);

    const co = compOffColumn === undefined ? 0 : numberValue(row.get(compOffColumn));
    const pl = plColumn === undefined ? 0 : numberValue(row.get(plColumn));
    const cl = clColumn === undefined ? 0 : numberValue(row.get(clColumn));
    const sl = slColumn === undefined ? 0 : numberValue(row.get(slColumn));
    const item: ImportedSalaryItem = {
      employeeCode: code,
      salaryBasis: employee.salaryBasis,
      fixedWorkingDays:
        fixedWorkingDaysColumn === undefined
          ? 0
          : numberValue(row.get(fixedWorkingDaysColumn)),
      presentDays:
        workedDaysColumn === undefined ? 0 : numberValue(row.get(workedDaysColumn)),
      holidayPresentDays:
        nfhColumn === undefined ? 0 : numberValue(row.get(nfhColumn)),
      compOffDays: co,
      onDutyDays:
        onDutyColumn === undefined ? 0 : numberValue(row.get(onDutyColumn)),
      weekOffDays:
        sundayColumn === undefined ? 0 : numberValue(row.get(sundayColumn)),
      plDays: pl,
      clDays: cl,
      slDays: sl,
      leaveDays: co + pl + cl + sl,
      payableDays:
        payableDaysColumn === undefined ? 0 : numberValue(row.get(payableDaysColumn)),
      overtimeHours:
        overtimeHoursColumn === undefined
          ? 0
          : numberValue(row.get(overtimeHoursColumn)),
      sourceGrossEarnings: grossVal,
      importedGrossEarnings: grossVal,
      sourceTotalDeductions:
        totalDeductionColumn === undefined
          ? 0
          : numberValue(row.get(totalDeductionColumn)),
      importedTotalDeductions:
        totalDeductionColumn === undefined
          ? 0
          : numberValue(row.get(totalDeductionColumn)),
      sourceNetPayable:
        netColumn === undefined ? 0 : numberValue(row.get(netColumn)),
      importedNetPayable:
        netColumn === undefined ? 0 : numberValue(row.get(netColumn)),
    };
    for (const [mappedColumn, field] of monetaryColumns) {
      item[field] =
        mappedColumn === undefined ? 0 : numberValue(row.get(mappedColumn));
    }
    item.basic = earnedBasic;
    if (item.overtimeHours && !item.overtimeWages) {
      const derivedHourlyRate = employee.salaryAmount > 0 && employee.salaryBasis === "daily"
        ? roundMoney(employee.salaryAmount / 8)
        : (employee.salaryAmount > 0 ? roundMoney((employee.salaryAmount / (Number(item.fixedWorkingDays) || 26)) / 8) : 75);
      item.overtimeWages = roundMoney(Number(item.overtimeHours) * (derivedHourlyRate || 75));
    }
    const currentEarningsSum = roundMoney(
      (Number(item.basic) || 0) +
      (Number(item.overtimeWages) || 0) +
      (Number(item.da) || 0) +
      (Number(item.hra) || 0) +
      (Number(item.conveyance) || 0) +
      (Number(item.foodAllowance) || 0) +
      (Number(item.nightAllowance) || 0) +
      (Number(item.attendanceBonus) || 0) +
      (Number(item.arrears) || 0) +
      (Number(item.holidayWages) || 0) +
      (Number(item.sundayEarnings) || 0) +
      (Number(item.leaveWages) || 0) +
      (Number(item.roomAllowance) || 0) +
      (Number(item.productionIncentive) || 0) +
      (Number(item.medicalAllowance) || 0)
    );
    if (!item.basic && grossVal > 0) {
      item.basic = Math.max(0, roundMoney(grossVal - (currentEarningsSum - (Number(item.basic) || 0))));
    } else if (grossVal > currentEarningsSum) {
      const diff = roundMoney(grossVal - currentEarningsSum);
      if (diff > 0) {
        if (!item.holidayWages && Number(item.holidayPresentDays) > 0) {
          item.holidayWages = diff;
        } else if (!item.sundayEarnings && Number(item.weekOffDays) > 0) {
          item.sundayEarnings = diff;
        } else if (!item.leaveWages && Number(item.leaveDays) > 0) {
          item.leaveWages = diff;
        } else {
          item.arrears = roundMoney((Number(item.arrears) || 0) + diff);
        }
      }
    }

    const currentDeductionsSum = roundMoney(
      (Number(item.pfDeduction) || 0) +
      (Number(item.esiDeduction) || 0) +
      (Number(item.professionalTax) || 0) +
      (Number(item.lwf) || 0) +
      (Number(item.canteen) || 0) +
      (Number(item.snacks) || 0) +
      (Number(item.tent) || 0) +
      (Number(item.advance) || 0) +
      (Number(item.otherDeduction) || 0) +
      (Number(item.tds) || 0) +
      (Number(item.medicalInsurance) || 0)
    );
    const importedTotalDeductions = Number(item.importedTotalDeductions || 0);
    if (importedTotalDeductions > currentDeductionsSum) {
      const remainingDeduction = roundMoney(importedTotalDeductions - currentDeductionsSum);
      item.otherDeduction = roundMoney((Number(item.otherDeduction) || 0) + remainingDeduction);
    }
    const finalEarningsSum = roundMoney(
      (Number(item.basic) || 0) +
      (Number(item.overtimeWages) || 0) +
      (Number(item.da) || 0) +
      (Number(item.hra) || 0) +
      (Number(item.conveyance) || 0) +
      (Number(item.foodAllowance) || 0) +
      (Number(item.nightAllowance) || 0) +
      (Number(item.attendanceBonus) || 0) +
      (Number(item.arrears) || 0) +
      (Number(item.holidayWages) || 0) +
      (Number(item.sundayEarnings) || 0) +
      (Number(item.leaveWages) || 0) +
      (Number(item.roomAllowance) || 0) +
      (Number(item.productionIncentive) || 0) +
      (Number(item.medicalAllowance) || 0)
    );
    item.importedGrossEarnings = Math.max(grossVal, finalEarningsSum);
    item.sourceGrossEarnings = item.importedGrossEarnings;
    const finalDeductions = Number(item.importedTotalDeductions) || currentDeductionsSum;
    item.importedTotalDeductions = finalDeductions;
    item.sourceTotalDeductions = finalDeductions;
    item.importedNetPayable = roundMoney(Number(item.importedGrossEarnings) - finalDeductions);
    item.sourceNetPayable = item.importedNetPayable;
    imported.salaryItems.push(item);
  }
  return imported;
}

function legacySalarySheet(name: string, rows: SheetRow[], period: string): WorkbookImport {
  const headerIndex = rows.findIndex((row) => {
    const values = Array.from(row.values()).map(normalizeHeader);
    const hasCode =
      values.includes("emp id") ||
      values.includes("employee code") ||
      values.includes("employee id") ||
      values.includes("emp code") ||
      values.includes("code") ||
      values.includes("emp no");
    const hasName =
      values.includes("name") ||
      values.includes("employee name") ||
      values.includes("emp name") ||
      values.includes("full name");
    return hasCode && hasName;
  });
  if (headerIndex < 0)
    throw new Error("Salary Register sheet needs Emp ID and Name columns.");

  const headers = rows[headerIndex];
  const headerMap = new Map<string, number>();
  for (const [column, value] of headers) headerMap.set(normalizeHeader(value), column);
  const claimedColumns = new Set<number>();
  const findColumn = (...aliases: string[]) => {
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      for (const [key, idx] of headerMap.entries()) {
        if (!claimedColumns.has(idx) && key === norm) {
          claimedColumns.add(idx);
          return idx;
        }
      }
    }
    for (const alias of aliases) {
      const norm = normalizeHeader(alias);
      if (!norm) continue;
      for (const [key, idx] of headerMap.entries()) {
        if (claimedColumns.has(idx)) continue;
        const isAliasMonetary = /wage|amount|pay|allow|bonus|arrear|incentive|earning|salary|rent|deduct|tax|canteen|snack/i.test(alias);
        const isKeyMonetary = /wage|amount|pay|allow|bonus|arrear|incentive|earning|salary|rent|deduct|tax|canteen|snack/i.test(key);
        const isAliasHoursOrDays = /^(ot|ot hrs|ot hours|w days|w d|working days|present days|nfh|sunday|sundays|wo|co|od|pl|cl|sl|payable days)$/i.test(alias);
        const isKeyHoursOrDays = /^(ot|ot hrs|ot hours|w days|w d|working days|present days|nfh|sunday|sundays|wo|co|od|pl|cl|sl|payable days)$/i.test(key);
        
        if (isAliasMonetary && isKeyHoursOrDays) continue;
        if (isAliasHoursOrDays && isKeyMonetary) continue;

        const isMatch = norm.length > 3
          ? (key.startsWith(norm) || (key.length > 3 && norm.startsWith(key)))
          : (key === norm || key.startsWith(norm + " "));

        if (isMatch) {
          claimedColumns.add(idx);
          return idx;
        }
      }
    }
    return undefined;
  };

  const codeColumn = findColumn("Emp ID", "Employee ID", "Employee Code", "Emp Code", "Code", "EmpNo", "ID")!;
  const nameColumn = findColumn("Name", "Employee Name", "Emp Name", "Full Name")!;
  // JOY_LEGACY_SALARY_REGISTER_V1
  const legacyLayout = headerMap.size <= 6 && rows.slice(headerIndex + 1).some((row) => row.has(24));
  const legacyColumn = (column: number | undefined, fallback: number) =>
    column ?? (legacyLayout ? fallback : undefined);
  const departmentColumn = legacyColumn(findColumn("Department", "Dept"), 3);
  const joiningColumn = findColumn("Date of Joining", "DOJ", "Joining Date");
  const uanColumn = findColumn("UAN", "UAN No", "UAN / EPF");
  const esiNumberColumn = findColumn("ESI No", "ESI Number", "ESI");
  const accountColumn = legacyColumn(findColumn("Bank Account", "Account No", "Account Number", "Bank A/c"), 8);
  const ifscColumn = legacyColumn(findColumn("IFSC", "IFSC Code"), 10);
  const bankNameColumn = findColumn("Bank Name", "Bank");
  const accommodationColumn = legacyColumn(findColumn("Accommodation Type", "Accommodation"), 51);
  const roomColumn = legacyColumn(findColumn("Room", "Room Number"), 53);
  const basisColumn = findColumn("Pay Monthly/Daily", "Pay Monthly / Daily", "Salary Basis", "Pay Basis", "Monthly/Daily", "Pay Mode", "Pay Type", "Salary Type");

  const itemFields: Record<string, string[]> = {
    presentDays: ["W Days", "W D", "Working Days", "Present Days"],
    payableDays: ["Payable Days", "Payable D", "Paid Days"],
    overtimeHours: ["OT Hrs", "OT Hours", "Overtime Hours", "OT"],
    basic: ["Basic", "Basic Salary", "Wages", "Basic Pay"],
    da: ["DA", "Dearness Allowance"],
    hra: ["HRA", "House Rent Allowance"],
    conveyance: ["Conveyance Allowance", "Conveyance", "Conv Allow", "Conv", "CA Allowance", "CA"],
    foodAllowance: ["Food Allowance", "Food Allow", "Food"],
    nightAllowance: ["Night Allowance", "Night Allo", "Night"],
    overtimeWages: ["OT Wages", "Overtime Wages", "OT Amount"],
    attendanceBonus: ["Attendance Bonus", "Att Bonus", "Bonus", "Attendanc"],
    arrears: ["Arrears", "Arrear"],
    holidayWages: ["Holiday Wages", "Holiday Wage", "NFH Wage", "NFH Wages", "Holiday Pay", "NFH Pay", "NFH Amount"],
    sundayEarnings: ["Sunday Earnings", "Sunday Ea", "Sunday Wages", "Sunday Wage", "Sunday"],
    leaveWages: ["Leave Wages", "Leave Wage", "Leave wages", "Leave wage", "Leave Pay", "Leave", "Leave Salary", "Earned Leave Wage", "EL Wage", "PL Wages", "PL Wage"],
    roomAllowance: ["Room Allowance", "Room Allow", "Room Allo", "Room"],
    productionIncentive: ["Production Incentive", "Production", "Productio", "Incentive"],
    medicalAllowance: ["Medical Allowance", "Medical Allow", "Medical A", "Medical"],
    pfDeduction: ["PF Deductions", "PF Deduction", "PF Deduct", "PF", "EPF"],
    esiDeduction: ["ESI Deductions", "ESI Deduction", "ESI Deduc", "ESI"],
    professionalTax: ["Professional Tax", "Professor", "PT"],
    lwf: ["LWF", "Labour Welfare"],
    canteen: ["Canteen", "Canteen Deduction", "Mess", "Canteen Fee"],
    snacks: ["Snacks", "Tea"],
    tent: ["Rent", "Tent", "Room Rent", "Accommodation Rent"],
    advance: ["Advance", "Salary Advance", "Token"],
    otherDeduction: ["Others", "Other Deduction", "Other Deductions", "Misc"],
    tds: ["TDS", "Income Tax", "Tax"],
    medicalInsurance: ["Medical insurance", "Medical Insurance", "Medical In", "Insurance"],
  };
  const legacyItemColumns: Record<string, number> = {
    basic: 24,
    hra: 26,
    pfDeduction: 38,
  };
  const extraAuditFields: Record<string, string[]> = {
    fixedWorkingDays: ["Fixed W Days", "Fixed W D", "Fixed Working Days"],
    nfhDays: ["NFH", "NFH Day", "NFH Days", "National Holiday", "Festival Holiday", "NFH D"],
    compOffDays: ["CO", "Comp Off"],
    onDutyDays: ["OD", "On Duty"],
    sundayDays: ["Sundays", "Sunday"],
    plDays: ["PL"],
    clDays: ["CL"],
    slDays: ["SL"],
  };
  const mappedFields = Object.entries(itemFields)
    .map(([field, aliases]) => [
      field,
      findColumn(...aliases) ?? (legacyLayout ? legacyItemColumns[field] : undefined),
    ] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== undefined);
  const mappedAudit = Object.entries(extraAuditFields)
    .map(([field, aliases]) => [field, findColumn(...aliases)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== undefined);

  const imported: WorkbookImport = {
    sourceType: "salary",
    sheetName: name,
    employees: [],
    attendance: [],
    salaryItems: [],
  };
  for (const row of rows.slice(headerIndex + 1)) {
    const code = text(row.get(codeColumn));
    const nameValue = text(row.get(nameColumn));
    if (!code || !nameValue) continue;
    const employee = emptyEmployee(code, nameValue, period);
    if (departmentColumn !== undefined)
      employee.department = text(row.get(departmentColumn)) || "General";
    if (joiningColumn !== undefined)
      employee.dateOfJoining = dateValue(row.get(joiningColumn), `${period}-01`);
    if (uanColumn !== undefined) employee.uanMasked = nullable(row.get(uanColumn));
    if (esiNumberColumn !== undefined)
      employee.esiMasked = nullable(row.get(esiNumberColumn));
    if (accountColumn !== undefined)
      employee.bankAccountMasked = nullable(row.get(accountColumn));
    if (ifscColumn !== undefined) employee.ifscMasked = nullable(row.get(ifscColumn));
    if (bankNameColumn !== undefined)
      employee.bankName = nullable(row.get(bankNameColumn));
    if (accommodationColumn !== undefined)
      employee.accommodationType = normalizeAccommodation(row.get(accommodationColumn));
    if (roomColumn !== undefined) employee.roomNumber = nullable(row.get(roomColumn));
    employee.paymentMode = employee.bankAccountMasked ? "bank" : "cash";
    const rawBasis = basisColumn !== undefined ? text(row.get(basisColumn)) : "";
    if (/daily/i.test(rawBasis)) {
      employee.salaryBasis = "daily";
    } else if (/monthly/i.test(rawBasis)) {
      employee.salaryBasis = "monthly";
    }

    const basicColumn = findColumn("Basic", "Basic Salary", "Wages") ??
      (legacyLayout ? legacyItemColumns.basic : undefined);
    const grossColumn = findColumn("Gross Earnings", "Gross Salary", "Gross", "Gross Earr", "Gross Earn", "Gross Pay", "Gross Amount", "Total Gross");
    const grossVal = grossColumn === undefined ? 0 : numberValue(row.get(grossColumn));
    employee.salaryAmount =
      (basicColumn === undefined ? 0 : numberValue(row.get(basicColumn))) || grossVal;
    imported.employees.push(employee);

    const item: ImportedSalaryItem = {
      employeeCode: code,
      ...(employee.salaryBasis ? { salaryBasis: employee.salaryBasis } : {}),
    };
    for (const [field, column] of mappedFields)
      item[field] = numberValue(row.get(column));
    for (const [field, column] of mappedAudit)
      item[field] = numberValue(row.get(column));
    const gross = findColumn("Gross Earnings", "Gross", "Gross Earr", "Gross Earn", "Gross Pay", "Gross Amount", "Total Gross");
    const totalDeductions = findColumn("Total Deductions", "Total Deduction", "Total Dedi", "Total Ded", "Deductions");
    const netPayable = findColumn("Net Payable", "Net Pay", "Net Salary", "Take Home", "Net");
    if (gross !== undefined) {
      item.importedGrossEarnings = numberValue(row.get(gross));
      item.sourceGrossEarnings = item.importedGrossEarnings;
    }
    if (totalDeductions !== undefined) {
      item.importedTotalDeductions = numberValue(row.get(totalDeductions));
      item.sourceTotalDeductions = item.importedTotalDeductions;
    }
    if (netPayable !== undefined) {
      item.importedNetPayable = numberValue(row.get(netPayable));
      item.sourceNetPayable = item.importedNetPayable;
    }
    if (!item.basic && grossVal > 0) {
      item.basic = grossVal;
    }
    if (item.overtimeHours && !item.overtimeWages) {
      const derivedHourlyRate = employee.salaryAmount > 0 && employee.salaryBasis === "daily"
        ? roundMoney(employee.salaryAmount / 8)
        : (employee.salaryAmount > 0 ? roundMoney((employee.salaryAmount / (Number(item.fixedWorkingDays) || 26)) / 8) : 75);
      item.overtimeWages = roundMoney(Number(item.overtimeHours) * (derivedHourlyRate || 75));
    }
    imported.salaryItems.push(item);
  }
  return imported;
}

function cleanDelimitedCell(val: string): string {
  let cleaned = val.trim();
  if (cleaned.startsWith('="') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(2, -1);
  } else if (cleaned.startsWith("=") && cleaned.length > 1) {
    cleaned = cleaned.slice(1);
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
  }
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/i.test(cleaned)) {
    cleaned = formatRawExcelValue(cleaned);
  }
  return cleaned;
}

function delimitedCells(source: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      value += '"';
      index++;
    } else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) {
      row.push(cleanDelimitedCell(value));
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(cleanDelimitedCell(value));
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(cleanDelimitedCell(value));
    rows.push(row);
  }
  return rows;
}

function delimitedSheet(
  filename: string,
  source: string,
  period: string,
  sourceType: "csv" | "txt",
) {
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    sourceType === "txt"
      ? (["\t", "|", ",", ";"].sort(
          (a, b) => firstLine.split(b).length - firstLine.split(a).length,
        )[0] ?? "\t")
      : ",";
  const rows = delimitedCells(source, delimiter).map(
    (cells) => new Map(cells.map((value, index) => [index, value] as const)),
  );

  // 1. Check filename hints first
  if (/attendance|muster|punch|shift/i.test(filename) && looksLikeAttendance(rows)) {
    return attendanceSheet(filename, rows, period);
  }
  if (/(salary|payroll|wage|earning|payout).*register/i.test(filename) && looksLikeSalaryRegister(rows)) {
    return salarySheet(filename, rows, period);
  }
  if (/employee.*(master|import|list|details)|^employees/i.test(filename) && looksLikeEmployeeMaster(rows)) {
    return employeeMasterSheet(filename, rows, period);
  }

  // 2. Check structure heuristics
  if (looksLikeAttendance(rows)) {
    return attendanceSheet(filename, rows, period);
  }
  if (looksLikeSalaryRegister(rows)) {
    return salarySheet(filename, rows, period);
  }
  if (looksLikeEmployeeMaster(rows)) {
    return employeeMasterSheet(filename, rows, period);
  }

  // 3. Fallbacks
  try {
    return attendanceSheet(filename, rows, period);
  } catch {
    try {
      return salarySheet(filename, rows, period);
    } catch {
      return employeeMasterSheet(filename, rows, period);
    }
  }
}

export async function parsePayrollWorkbook(
  file: File,
  period: string,
): Promise<WorkbookImport> {
  if (!/^\d{4}-\d{2}$/.test(period))
    throw new Error("Choose the payroll month before importing.");
  if (/\.csv$/i.test(file.name))
    return delimitedSheet(file.name, await file.text(), period, "csv");
  if (/\.txt$/i.test(file.name))
    return delimitedSheet(file.name, await file.text(), period, "txt");
  if (!/\.xlsx$/i.test(file.name))
    throw new Error("Upload an .xlsx, .csv, or .txt file.");

  const sheets = workbookSheets(await file.arrayBuffer());
  if (!sheets.length)
    throw new Error("The uploaded Excel workbook contains no worksheets.");

  // 1. First check sheet names explicitly
  const attendanceByName = sheets.find((sheet) =>
    /attendance|muster|punch|shift/i.test(sheet.name),
  );
  if (attendanceByName)
    return attendanceSheet(attendanceByName.name, attendanceByName.rows, period);

  const employeeMasterByName = sheets.find((sheet) =>
    /employee.*(master|import|list|details)|^employees$/i.test(sheet.name),
  );
  if (employeeMasterByName)
    return employeeMasterSheet(employeeMasterByName.name, employeeMasterByName.rows, period);

  const salaryByName = sheets.find((sheet) =>
    /(salary|payroll|wage|earning|payout).*register|salary|payroll|wages/i.test(sheet.name),
  );
  if (salaryByName)
    return salarySheet(salaryByName.name, salaryByName.rows, period);

  // 2. Second check by content heuristics
  const attendanceByContent = sheets.find((sheet) => looksLikeAttendance(sheet.rows));
  if (attendanceByContent)
    return attendanceSheet(attendanceByContent.name, attendanceByContent.rows, period);

  const salaryByContent = sheets.find((sheet) => looksLikeSalaryRegister(sheet.rows));
  if (salaryByContent)
    return salarySheet(salaryByContent.name, salaryByContent.rows, period);

  const employeeMasterByContent = sheets.find((sheet) => looksLikeEmployeeMaster(sheet.rows));
  if (employeeMasterByContent)
    return employeeMasterSheet(employeeMasterByContent.name, employeeMasterByContent.rows, period);

  // 3. Fallback on any sheet that has data
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    try {
      return salarySheet(sheet.name, sheet.rows, period);
    } catch {
      try {
        return employeeMasterSheet(sheet.name, sheet.rows, period);
      } catch {
        // try next
      }
    }
  }

  // 4. Final fallback on the first sheet
  const firstSheet = sheets[0];
  try {
    return salarySheet(firstSheet.name, firstSheet.rows, period);
  } catch {
    return employeeMasterSheet(firstSheet.name, firstSheet.rows, period);
  }
}
