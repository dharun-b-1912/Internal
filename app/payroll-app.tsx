"use client";
// JOY_PRODUCTION_EXCELLENCE_V1 · bank-only payroll + release quality gates
// JOY_BANK_PAYMENT_BATCH_ENHANCEMENTS_V1
/* eslint-disable react/no-unescaped-entities */

import { Component, Fragment, startTransition, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import { strToU8, zipSync } from "fflate";
import {
  EMPLOYEE_IMPORT_HEADERS,
  parsePayrollWorkbook,
  type WorkbookImport,
} from "../lib/excel-import";
import {
  defaultPayrollRules,
  deductionFields,
  earningFields,
} from "../lib/payroll-calculations";
import { calendarPeriod, payrollPeriodRange } from "../lib/payroll-operations";
import { printIsolatedElement } from "../lib/print-document";
import { formatDisplayDate, formatIsoDate } from "../lib/date-format";
import {
  AccommodationControlCenter,
  PayrollBatchPanel,
  PayrollPeriodEditor,
  WorkforceDashboard,
} from "./payroll-enhancements";
import { OperationsView } from "./operations-view";
import EnhancedEmployeeIdCard from "./employee-id-card";
import { OnboardingInvite } from "./employee-onboarding";
import EmployeeApplicationPreview, { EmployeeApplicationFields } from "./employee-application";
import { readApplication, type ApplicationDocument, type ApplicationRequest } from "../lib/employee-application";
import { HostelMaster } from "./hostel-master";
import { RecoveryCenter, ReportsCenter } from "./reports-recovery";
import { VendorDeskView } from "./vendor-desk-view";
import { RevenueProjectionPage } from "./revenue-projection";
import { ReferenceReports } from "./referral-revenue";
import { InternalStaffLeaderboardView } from "./internal-staff-leaderboard";
import { LeftEmployeesView } from "./left-employees-view";
import { JoinedEmployeesView } from "./joined-employees-view";
import { NotificationsView } from "./notifications-view";
import { ExecutiveDashboardView } from "./executive-dashboard-view";
import type { NewApplicant } from "./fresh-onboarding";
import {
  BarChart3, Phone, Check, X, CalendarOff, Download, AlertTriangle,
  CheckCircle2, User, Camera, FolderOpen, Trash2, Clock, Search, ShieldCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import {
  ACCESS_MODULES,
  DEFAULT_APPROVAL_ACCESS,
  DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  canManage,
  canView,
  type AccessModule,
  type PermissionMap,
  type UserRole,
} from "../lib/access-control";

type Section =
  | "main_dashboard"
  | "dashboard"
  | "notifications"
  | "payroll"
  | "attendance"
  | "employees"
  | "internal_staff"
  | "tasks"
  | "referrals"
  | "left_employees"
  | "joined_employees"
  | "accommodation"
  | "recoveries"
  | "vendor_desk"
  | "hostels"
  | "payments"
  | "vendors"
  | "masters"
  | "operations"
  | "revenue"
  | "reports"
  | "users"
  | "settings";

export type StaffTask = {
  id: string;
  title: string;
  description?: string | null;
  assignedToUserId?: string | null;
  assignedToName: string;
  assignedToPhone: string;
  priority: "normal" | "high" | "urgent" | string;
  dueDate?: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | string;
  completedAt?: string | null;
  completionNotes?: string | null;
  acceptedAt?: string | null;
  lastReminderAt?: string | null;
  reminderCount?: number | null;
  autoRemind?: number | boolean | null;
  whatsappMessageId?: string | null;
  whatsappStatus?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type AppUserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  employeeCode: string | null;
  department: string | null;
  dateOfJoining: string | null;
  mobileNumber: string | null;
  role: UserRole;
  status: string;
  permissions: PermissionMap;
  clientScope: string[];
  unitScope: string[];
  hostelScope: string[];
  canApprovePayroll: boolean;
  approvalManagerEmail: string | null;
  approvalSequence: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type Vendor = {
  id: string;
  code: string;
  name: string;
  legalName: string;
  epfCode: string | null;
  esiCode: string | null;
  gstin: string | null;
  remarks: string | null;
  logoDataUrl: string | null;
  status: string;
};

export type ClientUnit = {
  id: string;
  vendorId: string;
  clientName: string;
  unitName: string;
  location: string;
  employeeCount: number;
  remarks: string | null;
  attendanceCycleStartDay: number;
  attendanceCycleEndDay: number;
  attendanceWorkingDays: number;
  overtimeMultiplier: number;
  voucherHeader: string | null;
  payslipTitle: string | null;
  payslipSubtitle: string | null;
  payslipAddress: string | null;
  payslipContact: string | null;
  payslipFooter: string | null;
  payslipEarningsJson: string;
  payslipDeductionsJson: string;
  status: string;
};

export type Employee = {
  id: string;
  vendorId: string;
  clientUnitId: string;
  employeeCode: string;
  name: string;
  department: string;
  dateOfJoining: string;
  dateOfBirth: string | null;
  dateOfLeaving: string | null;
  finalPayrollMonth?: string | null;
  uanMasked: string | null;
  esiMasked: string | null;
  bankAccountMasked: string | null;
  ifscMasked: string | null;
  bankName: string | null;
  bankBranch: string | null;
  accommodationType: string;
  roomId: string | null;
  roomNumber: string | null;
  roomRentAmount: number;
  photoDataUrl: string | null;
  mobileNumber: string | null;
  emailAddress: string | null;
  emergencyContactNumber: string | null;
  addressLine: string | null;
  district: string | null;
  stateName: string | null;
  pincode: string | null;
  bloodGroup: string | null;
  gender: string | null;
  fatherName: string | null;
  spouseName: string | null;
  maritalStatus: string | null;
  highestQualification: string | null;
  applicationJson: string | null;
  pfApplicable: number;
  pfWageAmount: number;
  esiApplicable: number;
  esiWageAmount: number;
  ptApplicable: number;
  lwfApplicable: number;
  paymentMode: string;
  salaryAmount: number;
  salaryBasis: string;
  defaultShift: string;
  shiftPattern: string;
  applicableShiftsJson: string;
  remarks: string | null;
  complianceStatus: string;
  status: string;
  employmentType: string;
  processingStage: string;
  finalizedBy: string | null;
  finalizedAt: string | null;
};

export type Vehicle = {
  id: string;
  vendorId: string;
  registrationNumber: string;
  vehicleName: string;
  vehicleType: string;
  currentOdometer: number;
  permitExpiry: string | null;
  insuranceExpiry: string | null;
  fcExpiry: string | null;
  pollutionExpiry: string | null;
  nextServiceDate: string | null;
  nextServiceKm: number | null;
  tyreChangedDate: string | null;
  tyreChangedKm: number | null;
  lastWaterWashDate: string | null;
  lastWheelAlignmentDate: string | null;
  status: string;
  remarks: string | null;
};
export type VehicleRecord = {
  id: string;
  vehicleId: string;
  recordDate: string;
  recordType: string;
  tripFrom: string | null;
  tripTo: string | null;
  purpose: string | null;
  startKm: number | null;
  endKm: number | null;
  litres: number;
  amount: number;
  nextDueDate: string | null;
  nextDueKm: number | null;
  remarks: string | null;
  status: string;
};
export type UtilityMeter = {
  id: string;
  vendorId: string;
  locationType: string;
  locationName: string;
  meterNumber: string | null;
  status: string;
  remarks: string | null;
};
export type EbReading = {
  id: string;
  meterId: string;
  readingDate: string;
  readingValue: number;
  unitsConsumed: number;
  amount: number;
  remarks: string | null;
  status: string;
};

export type PayrollRun = {
  id: string;
  vendorId: string;
  clientUnitId: string;
  payPeriod: string;
  periodStart: string | null;
  periodEnd: string | null;
  workingDays: number;
  processingMode: "attendance" | "salary_import";
  status: string;
  employeeCount: number;
  grossEarnings: number;
  statutoryDeductions: number;
  otherDeductions: number;
  accommodationDeductions: number;
  netPayable: number;
  bankPayable: number;
  cashPayable: number;
  issueCount: number;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type PayrollItem = {
  id: string;
  runId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  accommodationType: string;
  roomNumber: string | null;
  paymentMode: string;
  bankAccountMasked: string | null;
  ifscMasked: string | null;
  complianceStatus: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  weekOffDays: number;
  holidayPresentDays: number;
  payableDays: number;
  overtimeHours: number;
  salaryBasis: string;
  fixedWorkingDays: number;
  nfhDays: number;
  compOffDays: number;
  onDutyDays: number;
  sundayDays: number;
  plDays: number;
  clDays: number;
  slDays: number;
  importedGrossEarnings: number | null;
  importedTotalDeductions: number | null;
  importedNetPayable: number | null;
  punchIn: string | null;
  punchOut: string | null;
  workedHours: number;
  deductionHours: number;
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  foodAllowance: number;
  nightAllowance: number;
  overtimeWages: number;
  attendanceBonus: number;
  arrears: number;
  holidayWages: number;
  sundayEarnings?: number;
  leaveWages?: number;
  roomAllowance?: number;
  productionIncentive: number;
  medicalAllowance: number;
  pfDeduction: number;
  esiDeduction: number;
  professionalTax: number;
  lwf: number;
  canteen: number;
  snacks: number;
  tent: number;
  advance: number;
  otherDeduction: number;
  tds: number;
  medicalInsurance: number;
  accommodationDeduction: number;
  returnAmount: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  unrecoveredAmount?: number;
  validationStatus: string;
  validationMessage: string | null;
};

type AttendanceEntry = {
  id: number;
  employeeId: string;
  attendanceDate: string;
  statusCode: string;
  shiftCode: string;
  overtimeHours: number;
  punchIn: string | null;
  punchOut: string | null;
  workedHours: number;
  deductionHours: number;
  remarks: string | null;
};

type ShiftDefinition = {
  id: string;
  vendorId: string;
  clientUnitId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  requiredWorkMinutes: number;
  lateGraceMinutes: number;
  lateDeductionMinutes: number;
  earlyGraceMinutes: number;
  earlyDeductionMinutes: number;
  otMode: string;
  fixedOtHours: number;
  remarks: string | null;
  status: string;
};

type PayrollRemark = {
  id: string;
  vendorId: string;
  title: string;
  category: string;
  notes: string | null;
  status: string;
};

export type AccommodationCharge = {
  id: number;
  runId: string;
  employeeId: string;
  roomExpenseId: string | null;
  roomNumber: string | null;
  idCard: number;
  rent: number;
  bus: number;
  medical: number;
  ticket: number;
  shoe: number;
  advance: number;
  food: number;
  aadhaarUpdate: number;
  bankAccountCharge: number;
  tshirt: number;
  oldPending: number;
  gasShare: number;
  rationShare: number;
  provisionShare: number;
  returnAmount: number;
};

export type RecoveryEntry = {
  id: string;
  runId: string;
  employeeId: string;
  recoveryDate: string;
  recoveryType: string;
  amount: number;
  reference: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};
export type RecoveryFinalization = {
  id: string;
  runId: string;
  employeeId: string;
  voucherNumber: string;
  finalizedBy: string | null;
  finalizedAt: string;
};

export type AccommodationType = {
  id: string;
  vendorId: string;
  name: string;
  remarks: string | null;
  status: string;
};

export type AccommodationRoom = {
  id: string;
  vendorId: string;
  accommodationTypeId: string;
  hostelId: string | null;
  rentSettingsJson: string;
  rentCutoffDay: number;
  lateJoinRentPercent: number;
  roomNumber: string;
  capacity: number;
  address: string | null;
  remarks: string | null;
  status: string;
};

export type RoomExpense = {
  id: string;
  roomId: string;
  payPeriod: string;
  gasAmount: number;
  gasDate: string | null;
  gasCylinderCount: number;
  gasPaymentReference: string | null;
  rationAmount: number;
  rationDate: string | null;
  rationPaymentReference: string | null;
  provisionAmount: number;
  provisionDate: string | null;
  provisionPaymentReference: string | null;
  occupantCount: number;
  status: string;
  notes: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
};

export type Hostel = {
  id: string;
  vendorId: string;
  accommodationTypeId: string | null;
  name: string;
  address: string | null;
  inchargeName: string | null;
  ebMeterNumber: string | null;
  clientScopeJson: string;
  status: string;
  remarks: string | null;
};
export type HostelUtilityReading = {
  id: string;
  hostelId: string;
  readingDate: string;
  utilityType: "eb" | "water" | "payment" | "housekeeping" | "other";
  readingValue: number;
  consumption: number;
  tankerQuantity: number;
  amount: number;
  activityName: string | null;
  remarks: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type PayrollBatch = {
  id: string;
  runId: string;
  accommodationType: string;
  employeeCount: number;
  grossEarnings: number;
  netPayable: number;
  status: string;
  paymentReference: string | null;
  preparedBy: string | null;
  preparedAt: string | null;
  clearedBy: string | null;
  clearedAt: string | null;
};

export type PaymentExportBatch = {
  id: string;
  runId: string;
  status: "locked" | "downloaded" | string;
  exportFormat: string | null;
  employeeCount: number;
  totalPayable: number;
  lockedBy: string;
  lockedAt: string;
  downloadedBy: string | null;
  downloadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentExportBatchItem = {
  id: string;
  batchId: string;
  runId: string;
  payrollItemId: string;
  employeeId: string;
  amount: number;
  createdAt: string;
};

type BankExportFormat =
  | "bank_csv"
  | "bank_xlsx"
  | "indian_bank_xlsx"
  | "cub_any_bank_txt"
  | "cub_to_cub_txt"
  | "cash_excel";

function bankFormatLabel(format: BankExportFormat | string) {
  if (format === "indian_bank_xlsx") return "Indian Bank Excel";
  if (format === "cub_any_bank_txt") return "CUB Any Bank TXT";
  if (format === "cub_to_cub_txt") return "CUB-to-CUB TXT";
  if (format === "bank_xlsx") return "Bank Excel (.xlsx)";
  if (format === "bank_csv") return "Bank CSV";
  if (format === "cash_excel") return "Cash Payment Excel";
  return "Bank upload";
}

function isCubBeneficiary(item: PayrollItem) {
  return String(item.ifscMasked ?? "")
    .toUpperCase()
    .startsWith("CIUB");
}

function isEligibleForBankFormat(
  format: BankExportFormat,
  item: PayrollItem,
) {
  if (format === "cash_excel") {
    return item.paymentMode === "cash" || !item.bankAccountMasked || !item.ifscMasked;
  }
  if (!item.bankAccountMasked || !item.ifscMasked) return false;
  if (format === "cub_any_bank_txt") return !isCubBeneficiary(item);
  if (format === "cub_to_cub_txt") return isCubBeneficiary(item);
  return true;
}

type AuditEvent = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
};

type PayrollRule = {
  id: string;
  vendorId: string;
  standardWorkingDays: number;
  pfRate: number;
  esiRate: number;
  professionalTax: number;
  lwf: number;
  overtimeHourlyRate: number;
  paidLeave: number;
  paidWeekOff: number;
  effectiveFrom: string;
};

export type ApplicationDocumentSummary = {
  id: string;
  employeeId: string;
  category: string;
  filename: string;
  status?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export type AppData = {
  demo: boolean;
  vendors: Vendor[];
  units: ClientUnit[];
  employees: Employee[];
  runs: PayrollRun[];
  payrollItems: PayrollItem[];
  attendance: AttendanceEntry[];
  accommodationCharges: AccommodationCharge[];
  recoveryEntries: RecoveryEntry[];
  recoveryFinalizations: RecoveryFinalization[];
  accommodationTypes: AccommodationType[];
  accommodationRooms: AccommodationRoom[];
  roomExpenses: RoomExpense[];
  hostels: Hostel[];
  hostelUtilityReadings: HostelUtilityReading[];
  payrollBatches: PayrollBatch[];
  paymentExportBatches: PaymentExportBatch[];
  paymentExportBatchItems: PaymentExportBatchItem[];
  auditEvents: AuditEvent[];
  rules: PayrollRule[];
  shifts: ShiftDefinition[];
  remarks: PayrollRemark[];
  currentUser: AppUserProfile;
  appUsers: AppUserProfile[];
  vehicles: Vehicle[];
  vehicleRecords: VehicleRecord[];
  utilityMeters: UtilityMeter[];
  ebReadings: EbReading[];
  applicationDocuments?: ApplicationDocumentSummary[];
  tasks?: StaffTask[];
  selectedRunId?: string;
};

type ActiveModal =
  | { kind: "vendor"; vendor?: Vendor }
  | { kind: "unit"; unit?: ClientUnit }
  | { kind: "employee"; employee?: Employee }
  | { kind: "employee-left"; employee: Employee }
  | { kind: "shift"; shift?: ShiftDefinition }
  | { kind: "accommodation-type"; accommodationType?: AccommodationType }
  | { kind: "remark"; remark?: PayrollRemark }
  | { kind: "app-user"; profile?: AppUserProfile; defaultRole?: UserRole }
  | { kind: "run" }
  | {
    kind: "attendance";
    employee: Employee;
    date: string;
    entry?: AttendanceEntry;
  }
  | { kind: "salary"; item: PayrollItem }
  | { kind: "accommodation"; employee?: Employee; charge?: AccommodationCharge }
  | { kind: "import"; context?: "employees" | "attendance" | "payroll" };

const navItems: Array<{ id: Section; label: string; icon: string }> = [
  { id: "main_dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "dashboard", label: "Overview", icon: "grid" },
  { id: "payroll", label: "Payroll Run", icon: "calculator" },
  { id: "attendance", label: "Attendance", icon: "calendar" },
  { id: "employees", label: "Employees", icon: "users" },
  { id: "internal_staff", label: "Internal Staff", icon: "trophy" },
  { id: "referrals", label: "Referrals", icon: "star" },
  { id: "accommodation", label: "Accommodation", icon: "home" },
  { id: "recoveries", label: "Recoveries", icon: "calculator" },
  { id: "vendor_desk", label: "Vendor Counter Desk", icon: "camera" },
  { id: "hostels", label: "Hostel Master", icon: "building" },
  { id: "payments", label: "Payments & Payslips", icon: "bank" },
  { id: "vendors", label: "Group Companies & Clients", icon: "building" },
  { id: "masters", label: "Operational Masters", icon: "calendar" },
  { id: "operations", label: "Vehicle Monitoring", icon: "building" },
  { id: "revenue", label: "Revenue Projection", icon: "calculator" },
  { id: "reports", label: "Reports", icon: "file" },
  { id: "users", label: "Users & Access", icon: "users" },
  { id: "settings", label: "Rules & Settings", icon: "settings" },
];

const sectionPermission: Record<Section, AccessModule> = {
  main_dashboard: "dashboard",
  dashboard: "dashboard",
  notifications: "dashboard",
  payroll: "payroll",
  attendance: "attendance",
  employees: "employees",
  internal_staff: "users",
  tasks: "dashboard",
  referrals: "dashboard",
  left_employees: "dashboard",
  joined_employees: "dashboard",
  accommodation: "accommodation",
  recoveries: "accommodation",
  vendor_desk: "accommodation",
  hostels: "accommodation",
  payments: "payments",
  vendors: "clients",
  masters: "masters",
  operations: "operations",
  revenue: "dashboard",
  reports: "dashboard",
  users: "users",
  settings: "settings",
};

const sectionTitles: Record<
  Section,
  { eyebrow: string; title: string; description: string }
> = {
  main_dashboard: {
    eyebrow: "Executive Control & Deployment Scope",
    title: "Deployment Scope & Workforce Dashboard",
    description:
      "High-level workforce briefing, deployed live manpower vs potential capacity, opportunity gaps, and unit-wise deployment scope management.",
  },
  dashboard: {
    eyebrow: "Workforce and payroll control centre",
    title: "Manpower & payroll overview",
    description:
      "Client-wise and unit-wise manpower, joining, compliance, payroll, and payment visibility.",
  },
  notifications: {
    eyebrow: "Real-time compliance & system alerts",
    title: "Notification & Action Centre",
    description:
      "Monitor document rejections, verification requests, statutory compliance gaps, and payroll exceptions.",
  },
  payroll: {
    eyebrow: "Salary processing",
    title: "Payroll run",
    description:
      "Review every employee calculation before approval and payment.",
  },
  attendance: {
    eyebrow: "Daily workforce",
    title: "Attendance & shift register",
    description:
      "Day-wise status, changing shifts, week offs and holiday work.",
  },
  employees: {
    eyebrow: "Employee master",
    title: "Employee compliance readiness",
    description:
      "Identity, statutory, bank and assignment information used by payroll.",
  },
  internal_staff: {
    eyebrow: "Super Admin · Direct staff & recruitment leaders",
    title: "Internal Staff & Referral Leaderboard",
    description:
      "Direct Joy staff directory, recruitment performance, dynamic referral leaderboard, and candidate attribution.",
  },
  tasks: {
    eyebrow: "Super Admin · Staff Delegation & WhatsApp Notifications",
    title: "Task Delegation & WhatsApp Notification System",
    description:
      "Assign critical tasks to internal staff with real-time WhatsApp alerts, track completion statuses, and receive instant WhatsApp alerts when finished.",
  },
  referrals: {
    eyebrow: "Corporate recruitment & incentive tracking",
    title: "Staff Referral & Candidate Payout Register",
    description:
      "All candidate referral records across companies and client units, worked days qualification, and recruiter payout calculations.",
  },
  left_employees: {
    eyebrow: "Super Admin · Left Workforce Archive",
    title: "Left Employees & Work History Register",
    description:
      "Company-wise left employee directory with calculated total worked days and month-wise attendance breakdown.",
  },
  joined_employees: {
    eyebrow: "Workforce Influx · Daily Joining Directory",
    title: "Daily Joining Register & Date-wise Breakdown",
    description:
      "Date-wise onboarding timeline, day-by-day joining headcounts, and candidate compliance tracking across group companies.",
  },
  accommodation: {
    eyebrow: "Accommodation rooms & recoveries",
    title: "Room allocations & shared deductions",
    description:
      "Accommodation-type masters, room allocations, gas, ration, provision, and printable room-wise breakups.",
  },
  recoveries: {
    eyebrow: "Salary recovery control",
    title: "Employee & room-wise recoveries",
    description:
      "Maintain individual deductions separately from shared Gas, Ration and Provision room deductions.",
  },
  vendor_desk: {
    eyebrow: "Storekeeper & field counter",
    title: "Vendor Entry Desk",
    description:
      "Aadhaar verification, grocery/ration bill logging, bill photo upload and roommate splitting.",
  },
  hostels: {
    eyebrow: "Hostel hierarchy & utilities",
    title: "Hostel master",
    description:
      "Select accommodation type first, create hostels beneath it, map rooms, and track hostel-wise EB and water daily.",
  },
  payments: {
    eyebrow: "Disbursement",
    title: "Payments & payslips",
    description:
      "Bank-ready rows, cash list and employee salary slips after approval.",
  },
  vendors: {
    eyebrow: "Organisation structure",
    title: "Group companies, clients & locations",
    description:
      "Joy companies are group companies; their customer employers are clients with operating locations.",
  },
  masters: {
    eyebrow: "Operational master data",
    title: "Accommodation, shifts & remarks",
    description:
      "Add, edit, deactivate, or remove accommodation types, shift timings, and reusable remarks for each client.",
  },
  operations: {
    eyebrow: "Administration controls",
    title: "Vehicle monitoring",
    description:
      "Trips, fuel, mileage, compliance reminders, service follow-ups and vehicle expenses.",
  },
  revenue: {
    eyebrow: "Super Admin · Monthly planning",
    title: "Revenue projection & recruitment",
    description:
      "Calendar-month actuals, attendance-driven forecasts, client calendars and what-if recruitment calculators.",
  },
  reports: {
    eyebrow: "Management information",
    title: "Reports & downloads",
    description:
      "Payroll, attendance, employee, compliance, recovery, hostel and vehicle reports in Excel, CSV and PDF.",
  },
  users: {
    eyebrow: "Security & responsibility",
    title: "Users & access",
    description:
      "Assign roles and customize what each person can view or manage.",
  },
  settings: {
    eyebrow: "Calculation governance",
    title: "Payroll rules & settings",
    description:
      "Configurable earning, deduction, attendance and approval rules.",
  },
};

const statusMeta: Record<string, { label: string; className: string }> = {
  P: { label: "Present", className: "status-present" },
  HD: { label: "Half Day Present", className: "status-leave" },
  A: { label: "Absent", className: "status-absent" },
  L: { label: "Leave", className: "status-leave" },
  WO: { label: "Week off", className: "status-weekoff" },
  H: { label: "Holiday", className: "status-holiday" },
  HP: { label: "Holiday present", className: "status-holiday-present" },
  CO: { label: "Comp off", className: "status-compoff" },
};

const iconPaths: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  calculator:
    "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01",
  calendar: "M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  trophy:
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 4h16v5a7 7 0 0 1-14 0V4ZM10 15v3m4-3v3M8 21h8",
  home: "M3 11 12 3l9 8M5 10v11h14V10M9 21v-7h6v7",
  bank: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3 3 8h18Z",
  building: "M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h.01M17 17h.01",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 14.7a1.7 1.7 0 0 0-1.56-1.03H5.3v-3h.08A1.7 1.7 0 0 0 6.94 9.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4.3h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H21v3h-.08A1.7 1.7 0 0 0 19.4 15Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  alert: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  chevron: "m9 18 6-6-6-6",
  check: "m5 12 4 4L19 6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  refresh:
    "M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5",
  close: "M18 6 6 18M6 6l12 12",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16h16V8Zm0 0v6h6M8 13h8M8 17h6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] ?? iconPaths.grid} />
    </svg>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

class SectionErrorBoundary extends Component<
  { section: string; onReset?: () => void; children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { section: string; onReset?: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("SectionErrorBoundary caught an error in section:", this.props.section, error, errorInfo);
  }

  componentDidUpdate(prevProps: { section: string }) {
    if (prevProps.section !== this.props.section && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="panel empty-payroll" style={{ borderColor: "#fca5a5", background: "#fef2f2" }}>
          <span style={{ background: "#fee2e2", color: "#dc2626" }}>
            <Icon name="alert" size={28} />
          </span>
          <h2 style={{ color: "#991b1b" }}>Module Display Notice</h2>
          <p style={{ color: "#7f1d1d" }}>
            The {this.props.section.replace(/_/g, " ")} view encountered a temporary display issue:
            <br />
            <code>{this.state.error?.message || "Render exception"}</code>
          </p>
          <div>
            <button
              className="primary-button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset?.();
              }}
            >
              Reload Section
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function PayrollApp({
  displayName,
  apiEndpoint = "/api/app-data",
  accessToken,
  publishableKey,
  onSignOut,
  onChangePassword,
}: {
  displayName: string;
  apiEndpoint?: string;
  accessToken?: string;
  publishableKey?: string;
  onSignOut?: () => void | Promise<void>;
  onChangePassword?: (password: string) => Promise<void>;
}) {
  const [data, setData] = useState<AppData | null>(null);
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (typeof window !== "undefined") {
      let rawHash = window.location.hash.replace(/^#/, "");
      if (rawHash === "vendor-entry" || rawHash === "vendor-desk") rawHash = "vendor_desk";
      const hash = rawHash as Section;
      if (
        navItems.some((item) => item.id === hash) ||
        hash === "notifications" ||
        hash === "joined_employees" ||
        hash === "left_employees"
      ) {
        return hash;
      }
    }
    return "main_dashboard";
  });
  const [activeVendorId, setActiveVendorId] = useState("");
  const [activeUnitId, setActiveUnitId] = useState("");
  const [activePeriod, setActivePeriod] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);
  const [bulkPayslipsOpen, setBulkPayslipsOpen] = useState(false);
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteEmployee, setInviteEmployee] = useState<Employee | "select" | null>(null);
  const [initialJoiningDate, setInitialJoiningDate] = useState<string | undefined>(undefined);
  const [initialLeavingDate, setInitialLeavingDate] = useState<string | undefined>(undefined);
  const [referralInitialQuery, setReferralInitialQuery] = useState<string>("");
  const [appPreviewEmployee, setAppPreviewEmployee] = useState<Employee | "blank" | null>(null);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState<boolean>(false);
  const [notificationInitialTab, setNotificationInitialTab] = useState<string>("rejected");

  useEffect(() => {
    if (typeof window !== "undefined" && activeSection) {
      if (window.location.hash !== `#${activeSection}`) {
        window.history.replaceState(null, "", `#${activeSection}`);
      }
    }
  }, [activeSection]);

  useEffect(() => {
    const isVendor = data?.currentUser?.role === "vendor" || Boolean(data?.currentUser?.department?.startsWith("Vendor:"));
    if (isVendor && activeSection !== "vendor_desk") {
      setActiveSection("vendor_desk");
    }
  }, [data?.currentUser, activeSection]);

  useEffect(() => {
    const handleHashChange = () => {
      let rawHash = window.location.hash.replace(/^#/, "");
      if (rawHash === "vendor-entry" || rawHash === "vendor-desk") rawHash = "vendor_desk";
      const hash = rawHash as Section;
      if (
        hash &&
        (navItems.some((item) => item.id === hash) ||
          hash === "notifications" ||
          hash === "joined_employees" ||
          hash === "left_employees")
      ) {
        if (hash === "notifications") {
          setNotificationInitialTab("rejected");
        }
        setActiveSection(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    fetch(apiEndpoint, {
      headers: {
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error ?? "Unable to load application");
        return payload as AppData;
      })
      .then((payload) => {
        const normalizedPayload: AppData = {
          ...payload,
          vendors: payload.vendors || [],
          units: payload.units || [],
          employees: payload.employees || [],
          runs: payload.runs || [],
          payrollItems: payload.payrollItems || [],
          attendance: payload.attendance || [],
          accommodationCharges: payload.accommodationCharges || [],
          recoveryEntries: payload.recoveryEntries || [],
          recoveryFinalizations: payload.recoveryFinalizations || [],
          accommodationTypes: payload.accommodationTypes || [],
          accommodationRooms: payload.accommodationRooms || [],
          roomExpenses: payload.roomExpenses || [],
          hostels: payload.hostels || [],
          hostelUtilityReadings: payload.hostelUtilityReadings || [],
          payrollBatches: payload.payrollBatches || [],
          paymentExportBatches: payload.paymentExportBatches || [],
          paymentExportBatchItems: payload.paymentExportBatchItems || [],
          auditEvents: payload.auditEvents || [],
          rules: payload.rules || [],
          shifts: payload.shifts || [],
          remarks: payload.remarks || [],
          appUsers: payload.appUsers || [],
          vehicles: payload.vehicles || [],
          vehicleRecords: payload.vehicleRecords || [],
          utilityMeters: payload.utilityMeters || [],
          ebReadings: payload.ebReadings || [],
          applicationDocuments: payload.applicationDocuments || [],
          tasks: payload.tasks || [],
        };
        setData(normalizedPayload);
        const isVendor = payload.currentUser.role === "vendor" || Boolean(payload.currentUser.department?.startsWith("Vendor:"));
        const firstAllowedSection = isVendor
          ? "vendor_desk"
          : (navItems.find((item) =>
            canView(
              payload.currentUser.permissions,
              sectionPermission[item.id],
            ),
          )?.id ?? "main_dashboard");
        setActiveSection((prev) => {
          if (isVendor) return "vendor_desk";
          if (prev && canView(payload.currentUser.permissions, sectionPermission[prev])) {
            return prev;
          }
          return firstAllowedSection;
        });
        const firstRun = payload.runs.findLast(
          (run) =>
            payload.vendors.some(
              (client) =>
                client.id === run.vendorId && client.status === "active",
            ) &&
            payload.units.some(
              (unit) =>
                unit.id === run.clientUnitId && unit.status === "active",
            ),
        );
        const firstClient = payload.vendors.find(
          (client) => client.status === "active",
        );
        const firstUnit = payload.units.find(
          (unit) =>
            unit.vendorId === firstClient?.id && unit.status === "active",
        );
        setActiveVendorId((prev) => prev || (firstRun?.vendorId ?? firstClient?.id ?? ""));
        setActiveUnitId((prev) => prev || (firstRun?.clientUnitId ?? firstUnit?.id ?? ""));
        setActivePeriod((prev) =>
          prev || (firstRun?.payPeriod ?? new Date().toISOString().slice(0, 7)),
        );
      })
      .catch((error) =>
        setAccessError(
          error instanceof Error ? error.message : "Unable to load application",
        ),
      );
  }, [apiEndpoint, accessToken, publishableKey]);


  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const mainCol = document.querySelector(".main-column, .content, main");
      if (mainCol) {
        mainCol.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [activeSection, activeUnitId, activeVendorId, activePeriod]);

  const vendorUnits = useMemo(
    () =>
      data?.units.filter(
        (unit) => unit.vendorId === activeVendorId && unit.status === "active",
      ) ?? [],
    [data, activeVendorId],
  );
  const currentUnit =
    data?.units.find((unit) => unit.id === activeUnitId) ?? null;
  const currentVendor =
    data?.vendors.find((vendor) => vendor.id === activeVendorId) ?? null;
  const unitRuns =
    data?.runs
      .filter((run) => run.clientUnitId === activeUnitId)
      .sort((left, right) => right.payPeriod.localeCompare(left.payPeriod)) ??
    [];
  const currentRun =
    unitRuns.find((run) => run.payPeriod === activePeriod) ??
    unitRuns[0] ??
    null;
  const currentItems = currentRun
    ? (data?.payrollItems.filter((item) => item.runId === currentRun.id) ?? [])
    : [];
  const currentEmployees =
    data?.employees.filter(
      (employee) => employee.clientUnitId === activeUnitId,
    ) ?? [];
  const operationalEmployees = currentEmployees.filter((employee) => {
    if (employee.status === "active") return true;
    if (!currentRun) return false;
    if (employee.finalPayrollMonth) {
      const leftMonth = employee.dateOfLeaving ? employee.dateOfLeaving.slice(0, 7) : employee.finalPayrollMonth;
      const startMonth = leftMonth < employee.finalPayrollMonth ? leftMonth : employee.finalPayrollMonth;
      return currentRun.payPeriod >= startMonth && currentRun.payPeriod <= employee.finalPayrollMonth;
    }
    return false;
  });
  const attendancePeriodRange = currentRun
    ? payrollPeriodRange(
      currentRun.payPeriod,
      currentRun.periodStart,
      currentRun.periodEnd,
    )
    : null;
  const attendanceEmployees = currentEmployees.filter((employee) => {
    if (employee.status === "active") return true;
    if (employee.finalPayrollMonth && currentRun) {
      const leftMonth = employee.dateOfLeaving ? employee.dateOfLeaving.slice(0, 7) : employee.finalPayrollMonth;
      const startMonth = leftMonth < employee.finalPayrollMonth ? leftMonth : employee.finalPayrollMonth;
      if (currentRun.payPeriod >= startMonth && currentRun.payPeriod <= employee.finalPayrollMonth) {
        return true;
      }
    }
    if (
      employee.dateOfLeaving &&
      attendancePeriodRange &&
      employee.dateOfLeaving >= attendancePeriodRange.start
    )
      return true;
    if (
      attendancePeriodRange &&
      data?.attendance.some(
        (a) =>
          a.employeeId === employee.id &&
          a.attendanceDate >= attendancePeriodRange.start &&
          a.attendanceDate < attendancePeriodRange.end,
      )
    )
      return true;
    return false;
  });
  const currentDownloadedBatchIds = new Set(
    (data?.paymentExportBatches ?? [])
      .filter(
        (batch) =>
          batch.runId === currentRun?.id && batch.status === "downloaded",
      )
      .map((batch) => batch.id),
  );
  const downloadedPayrollItemIds = new Set(
    (data?.paymentExportBatchItems ?? [])
      .filter(
        (item) =>
          item.runId === currentRun?.id &&
          currentDownloadedBatchIds.has(item.batchId),
      )
      .map((item) => item.payrollItemId),
  );
  const currentPayrollEmployeeIds = new Set(
    currentItems.map((item) => item.employeeId),
  );
  const missingPayrollEmployeeCount = operationalEmployees.filter(
    (employee) => !currentPayrollEmployeeIds.has(employee.id),
  ).length;
  const hasDownloadedPaymentBatch = currentDownloadedBatchIds.size > 0;
  const currentRules =
    data?.rules.find((rule) => rule.vendorId === activeVendorId) ?? null;
  const currentShifts =
    data?.shifts.filter((shift) => shift.vendorId === activeVendorId) ?? [];
  const currentRemarks =
    data?.remarks.filter((remark) => remark.vendorId === activeVendorId) ?? [];
  const currentTypes =
    data?.accommodationTypes.filter(
      (type) => type.vendorId === activeVendorId,
    ) ?? [];
  const rejectedDocsCount = (data?.applicationDocuments || []).filter(
    (d) => d.status === "rejected",
  ).length;
  const pendingDocsCount = (data?.applicationDocuments || []).filter(
    (d) =>
      d.status !== "rejected" &&
      (!d.status || d.status === "pending_approval" || !d.reviewedBy),
  ).length;
  const nonCompliantEmpCount = (data?.employees || []).filter(
    (e) => e.status === "active" && (!e.uanMasked || !e.esiMasked || !e.bankAccountMasked || !e.ifscMasked),
  ).length;
  const totalActionableCount =
    rejectedDocsCount +
    (data?.currentUser.role === "super_admin" ? pendingDocsCount : 0) +
    nonCompliantEmpCount +
    (currentRun?.issueCount ?? 0);
  const title = sectionTitles[activeSection];
  const isVendorUser = data?.currentUser.role === "vendor" || Boolean(data?.currentUser.department?.startsWith("Vendor:"));
  const visibleNavItems = data
    ? navItems.filter((item) => {
      if (isVendorUser) {
        return item.id === "vendor_desk";
      }
      if (item.id === "vendor_desk") {
        return data.currentUser.role === "super_admin";
      }
      if (item.id === "revenue") {
        return data.currentUser.role === "super_admin";
      }
      if (item.id === "internal_staff" || item.id === "referrals" || item.id === "left_employees") {
        return data.currentUser.role === "super_admin" || data.currentUser.role === "hr_team" || canView(data.currentUser.permissions, sectionPermission[item.id]);
      }
      return canView(data.currentUser.permissions, sectionPermission[item.id]);
    })
    : [];
  const mayView = (section: Section) => {
    if (isVendorUser) {
      return section === "vendor_desk";
    }
    if (section === "revenue") {
      return data?.currentUser.role === "super_admin";
    }
    if (section === "internal_staff" || section === "referrals" || section === "left_employees") {
      return Boolean(data?.currentUser.role === "super_admin" || data?.currentUser.role === "hr_team" || (data && canView(data.currentUser.permissions, sectionPermission[section])));
    }
    return Boolean(
      data && canView(data.currentUser.permissions, sectionPermission[section]),
    );
  };
  const mayManage = (section: Section) =>
    Boolean(
      data &&
      canManage(data.currentUser.permissions, sectionPermission[section]),
    );

  async function performAction(
    action: string,
    successMessage: string,
    details: Record<string, unknown> = {},
  ) {
    const payrollContextFreeActions = new Set([
      "save-accommodation-type",
      "save-hostel",
      "delete-hostel",
      "save-room",
      "assign-room-hostel",
      "save-hostel-utility",
      "approve-hostel-utility",
      "save-vehicle",
      "save-vehicle-record",
      "save-utility-meter",
      "save-eb-reading",
      "save-shift",
      "save-remark",
      "create-vendor",
      "save-client",
      "create-unit",
      "save-unit",
      "update-unit-scope",
      "save-app-user",
      "save-own-profile",
      "create-staff-task",
      "update-staff-task",
      "delete-staff-task",
      "send-task-whatsapp-reminder",
      "trigger-due-task-reminders",
    ]);
    const omitPayrollContext = payrollContextFreeActions.has(action);
    if (isActing) return false;
    setIsActing(true);
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({
          action,
          runId: omitPayrollContext ? undefined : currentRun?.id,
          vendorId: activeVendorId,
          unitId: omitPayrollContext ? undefined : activeUnitId,
          ...details,
        }),
      });
      let payload: (AppData & { error?: string; message?: string }) | null = null;
      try {
        payload = (await response.json()) as AppData & { error?: string; message?: string };
      } catch {
        // Response was not JSON (e.g. gateway error)
      }
      if (!response.ok || !payload)
        throw new Error(payload?.error ?? payload?.message ?? "Action could not be completed");
      startTransition(() => {
        setData(payload);
        const selectedRun = payload.runs.find(
          (run) => run.id === payload.selectedRunId,
        );
        if (["create-run", "import-workbook"].includes(action) && selectedRun) {
          setActiveVendorId(selectedRun.vendorId);
          setActiveUnitId(selectedRun.clientUnitId);
          setActivePeriod(selectedRun.payPeriod);
        }
        if (["create-vendor", "save-client"].includes(action) && !details.id) {
          const vendor = payload.vendors.find(
            (item) => item.code === String(details.code ?? "").toUpperCase(),
          );
          if (vendor) {
            setActiveVendorId(vendor.id);
            setActiveUnitId("");
          }
        }
        if (["create-unit", "save-unit"].includes(action) && !details.id) {
          const unit = payload.units.find(
            (item) =>
              item.vendorId === details.vendorId &&
              item.clientName === details.clientName &&
              item.unitName === details.unitName,
          );
          if (unit) {
            setActiveVendorId(unit.vendorId);
            setActiveUnitId(unit.id);
          }
        }
        if (["set-record-status", "delete-record"].includes(action)) {
          const currentClient = payload.vendors.find(
            (client) =>
              client.id === activeVendorId && client.status === "active",
          );
          const nextClient =
            currentClient ??
            payload.vendors.find((client) => client.status === "active");
          const currentEmployer = payload.units.find(
            (unit) =>
              unit.id === activeUnitId &&
              unit.vendorId === nextClient?.id &&
              unit.status === "active",
          );
          const nextEmployer =
            currentEmployer ??
            payload.units.find(
              (unit) =>
                unit.vendorId === nextClient?.id && unit.status === "active",
            );
          setActiveVendorId(nextClient?.id ?? "");
          setActiveUnitId(nextEmployer?.id ?? "");
        }
        setModal(null);
        setSelectedItem(null);
      });
      setToast(successMessage);
      return true;
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Action could not be completed",
        type: "error",
      });
      return false;
    } finally {
      setIsActing(false);
    }
  }

  async function loadApplicationDocuments(employeeId: string): Promise<ApplicationDocument[]> {
    const response = await fetch(apiEndpoint, { method: "POST", headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), ...(publishableKey ? { apikey: publishableKey } : {}) }, body: JSON.stringify({ action: "get-application-documents", employeeId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load application documents");
    const docs = result.documents || [];
    if (result.photoDataUrl) {
      (docs as any).photoDataUrl = result.photoDataUrl;
    }
    return docs;
  }

  async function reviewApplicationDocument(
    employeeId: string,
    category: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApplicationDocument[]> {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
      body: JSON.stringify({
        action: "review-application-document",
        employeeId,
        category,
        decision,
        rejectionReason,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to record review");
    return result.documents;
  }

  async function reviewAllApplicationDocuments(
    employeeId: string,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ): Promise<ApplicationDocument[]> {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
      body: JSON.stringify({
        action: "review-all-application-documents",
        employeeId,
        decision,
        rejectionReason,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to review all documents");
    return result.documents;
  }

  async function reuploadApplicationDocument(
    employeeId: string,
    category: string,
    filename: string,
    dataUrl: string,
  ): Promise<ApplicationDocument[]> {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
      body: JSON.stringify({
        action: "reupload-application-document",
        employeeId,
        category,
        filename,
        dataUrl,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to re-upload document");
    return result.documents;
  }

  function selectVendor(vendorId: string) {
    setActiveVendorId(vendorId);
    const firstUnit = data?.units.find(
      (unit) => unit.vendorId === vendorId && unit.status === "active",
    );
    setActiveUnitId(firstUnit?.id ?? "");
  }

  async function updateRecordStatus(
    entityType: string,
    entityId: string,
    currentStatus: string,
    label: string,
  ) {
    const status = currentStatus === "active" ? "inactive" : "active";
    if (
      status === "inactive" &&
      !window.confirm(
        `Make ${label} inactive? Existing payroll history will be preserved.`,
      )
    )
      return;
    await performAction(
      "set-record-status",
      `${label} ${status === "active" ? "reactivated" : "made inactive"}`,
      { entityType, entityId, status },
    );
  }

  async function deleteRecord(
    entityType: string,
    entityId: string,
    label: string,
  ) {
    if (
      !window.confirm(
        `Permanently delete ${label}? This cannot be undone. Approved payroll history cannot be deleted.`,
      )
    )
      return;
    await performAction("delete-record", `${label} deleted`, {
      entityType,
      entityId,
    });
  }

  if (!data && accessError) {
    return (
      <main className="access-denied-page">
        <div className="access-denied-card">
          <span>
            <Icon name="alert" size={28} />
          </span>
          <h1>Payroll access unavailable</h1>
          <p>{accessError}</p>
          <small>
            Ask your Super Admin to add or reactivate your email under Users &
            Access.
          </small>
          {onSignOut ? (
            <button
              className="secondary-button"
              onClick={() => void onSignOut()}
            >
              Sign out and use another account
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-page">
        <div className="loading-mark">
          <span>J</span>
        </div>
        <div className="loading-copy">
          <strong>Preparing your payroll workspace</strong>
          <span>Mapping attendance, salary and payment controls…</span>
        </div>
      </main>
    );
  }

  if (!visibleNavItems.length) {
    return (
      <main className="access-denied-page">
        <div className="access-denied-card">
          <span>
            <Icon name="alert" size={28} />
          </span>
          <h1>No modules assigned</h1>
          <p>
            Your payroll profile is active, but every module is set to No
            access.
          </p>
          <small>
            Ask your Super Admin to enable at least one module under Users &
            Access.
          </small>
          {onSignOut ? (
            <button
              className="secondary-button"
              onClick={() => void onSignOut()}
            >
              Sign out and use another account
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <span>J</span>
          </div>
          <div>
            <strong>JOY</strong>
            <small>Payroll Manager</small>
          </div>
        </div>
        <div className="sidebar-context">
          <span>WORKSPACE</span>
          <strong>People · Payroll · Digital</strong>
        </div>
        <nav aria-label="Application navigation">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              className={
                activeSection === item.id ? "nav-item nav-active" : "nav-item"
              }
              onClick={() => {
                setActiveSection(item.id);
                setMobileNavOpen(false);
              }}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.id === "payroll" && currentRun?.issueCount ? (
                <b>{currentRun.issueCount}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <div>
            <strong>Need a payroll check?</strong>
            <small>Review exceptions before approval.</small>
          </div>
        </div>
        <div className="sidebar-footer">
          <span>joycorporatesolutions.com</span>
          <span>v1.0</span>
        </div>
      </aside>

      {mobileNavOpen ? (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Icon name="menu" />
          </button>
          {isVendorUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>🏪</span> {data.currentUser.fullName || "Store Counter"}
              </span>
              <span style={{ fontSize: "11px", background: "#dbeafe", color: "#1e40af", padding: "3px 10px", borderRadius: "10px", fontWeight: 700 }}>
                Vendor Counter Portal
              </span>
            </div>
          ) : (
            <div className="topbar-selectors">
              <label>
                <span>Group of company</span>
                <select
                  value={activeVendorId}
                  onChange={(event) => selectVendor(event.target.value)}
                >
                  {!data.vendors.some((client) => client.status === "active") ? (
                    <option value="">Add a group company</option>
                  ) : null}
                  {data.vendors
                    .filter((client) => client.status === "active")
                    .map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                </select>
              </label>
              <span className="selector-divider" />
              <label>
                <span>Client name / location</span>
                <select
                  value={activeUnitId}
                  onChange={(event) => setActiveUnitId(event.target.value)}
                >
                  {!vendorUnits.length ? (
                    <option value="">Add a client location</option>
                  ) : null}
                  {vendorUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.clientName} · {unit.unitName}
                    </option>
                  ))}
                </select>
              </label>
              {unitRuns.length ? (
                <>
                  <span className="selector-divider period-divider" />
                  <label className="period-selector">
                    <span>Payroll month</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <select
                        value={currentRun?.payPeriod ?? ""}
                        onChange={(event) => setActivePeriod(event.target.value)}
                      >
                        {unitRuns.map((run) => (
                          <option key={run.id} value={run.payPeriod}>
                            {monthLabel(run.payPeriod)}
                          </option>
                        ))}
                      </select>
                      {mayManage("payroll") ? (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "4px 8px", fontSize: "12px", minHeight: "32px", fontWeight: 700 }}
                          onClick={() => setModal({ kind: "run" })}
                          title="Create a new payroll month for this unit"
                        >
                          + Month
                        </button>
                      ) : null}
                    </div>
                  </label>
                </>
              ) : mayManage("payroll") ? (
                <>
                  <span className="selector-divider period-divider" />
                  <button
                    type="button"
                    className="primary-button"
                    style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 700 }}
                    onClick={() => setModal({ kind: "run" })}
                    title="Create payroll month"
                  >
                    + Create payroll month
                  </button>
                </>
              ) : null}
            </div>
          )}
          <div className="topbar-actions" style={{ position: "relative" }}>
            <div style={{ position: "relative" }}>
              <button
                className="icon-button notification-bell-button"
                aria-label="Notifications"
                onClick={() => setNotificationMenuOpen((prev) => !prev)}
                style={{
                  position: "relative",
                  background: totalActionableCount > 0 ? "#fff1f2" : undefined,
                  borderColor: totalActionableCount > 0 ? "#fca5a5" : undefined,
                  color: totalActionableCount > 0 ? "#e11d48" : undefined,
                }}
                title={`${totalActionableCount} notifications & compliance alerts`}
              >
                <Icon name="bell" size={20} />
                {totalActionableCount > 0 ? (
                  <i
                    style={{
                      background: "#dc2626",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 800,
                      borderRadius: "10px",
                      minWidth: "18px",
                      height: "18px",
                      lineHeight: "18px",
                      padding: "0 4px",
                      boxShadow: "0 2px 5px rgba(220, 38, 38, 0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {totalActionableCount > 99 ? "99+" : totalActionableCount}
                  </i>
                ) : null}
              </button>

              {/* Notification Dropdown Flyout */}
              {notificationMenuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 999 }}
                    onClick={() => setNotificationMenuOpen(false)}
                  />
                  <div
                    className="notification-dropdown-menu"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "350px",
                      maxWidth: "90vw",
                      background: "#ffffff",
                      borderRadius: "14px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid #e2e8f0",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "linear-gradient(135deg, #0f172a, #1e293b)",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "13.5px", display: "block" }}>Notifications & Action Hub</strong>
                        <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                          {totalActionableCount} actionable item(s)
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationMenuOpen(false)}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          border: "none",
                          color: "#fff",
                          borderRadius: "50%",
                          width: "22px",
                          height: "22px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ maxHeight: "340px", overflowY: "auto", padding: "8px" }}>
                      {rejectedDocsCount > 0 && (
                        <div
                          onClick={() => {
                            setNotificationMenuOpen(false);
                            setNotificationInitialTab("rejected");
                            setActiveSection("notifications");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fef2f2",
                            border: "1px solid #fecdd3",
                            marginBottom: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#991b1b", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <Icon name="alert" size={13} /> {rejectedDocsCount} Rejected Document(s)
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626" }}>Re-upload →</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#7f1d1d" }}>
                            Admin rejected documents requiring immediate re-upload.
                          </p>
                        </div>
                      )}

                      {pendingDocsCount > 0 && (
                        <div
                          onClick={() => {
                            setNotificationMenuOpen(false);
                            setNotificationInitialTab("pending");
                            setActiveSection("notifications");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            marginBottom: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400e", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <Icon name="file" size={13} /> {pendingDocsCount} Pending Verification
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>Review →</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#78350f" }}>
                            Candidate documents waiting for Super Admin approval.
                          </p>
                        </div>
                      )}

                      {nonCompliantEmpCount > 0 && (
                        <div
                          onClick={() => {
                            setNotificationMenuOpen(false);
                            setNotificationInitialTab("compliance");
                            setActiveSection("notifications");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            marginBottom: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#075985", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <Icon name="shield" size={13} /> {nonCompliantEmpCount} Statutory Compliance Gaps
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7" }}>View →</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#0369a1" }}>
                            Active employees missing UAN, ESI, or Bank Account.
                          </p>
                        </div>
                      )}

                      {currentRun && (currentRun.issueCount ?? 0) > 0 && (
                        <div
                          onClick={() => {
                            setNotificationMenuOpen(false);
                            setActiveSection("payroll");
                          }}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "#f5f3ff",
                            border: "1px solid #ddd6fe",
                            marginBottom: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 800, color: "#5b21b6", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <Icon name="alert" size={13} /> {currentRun.issueCount} Payroll Exceptions
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed" }}>Payroll →</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#6d28d9" }}>
                            Attendance or calculation discrepancies in active run.
                          </p>
                        </div>
                      )}

                      {totalActionableCount === 0 && (
                        <div style={{ textAlign: "center", padding: "20px 10px", color: "#64748b" }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px", color: "#16a34a" }}>
                            <Icon name="check" size={24} />
                          </div>
                          <strong style={{ fontSize: "13px", color: "#334155" }}>All Caught Up!</strong>
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                            No pending document rejections, verification requests, or alerts.
                          </p>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        textAlign: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationMenuOpen(false);
                          setNotificationInitialTab("all");
                          setActiveSection("notifications");
                        }}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "7px 12px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          width: "100%",
                          boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                        }}
                      >
                        Open Full Notification Center →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              className="user-chip user-chip-button"
              onClick={() => setProfileOpen(true)}
            >
              <span>
                {initials(data.currentUser.fullName ?? displayName) || "PA"}
              </span>
              <div>
                <strong>{data.currentUser.fullName ?? displayName}</strong>
                <small>
                  {ROLE_LABELS[data.currentUser.role]} · Edit profile
                </small>
              </div>
            </button>
            {onSignOut ? (
              <button
                className="secondary-button"
                onClick={() => void onSignOut()}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        <main className="content" style={{ width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
          <SectionErrorBoundary section={activeSection} onReset={() => setActiveSection("dashboard")}>
            {!["left_employees", "joined_employees", "referrals", "notifications"].includes(activeSection) ? (
              <>
                <section className="page-heading">
                  <div>
                    <span className="eyebrow">{title.eyebrow}</span>
                    <h1>{title.title}</h1>
                    <p>{title.description}</p>
                  </div>
                  <div className="heading-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setActiveSection("reports")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 700,
                        background: "#ffffff",
                        border: "1.5px solid #cbd5e1",
                        color: "#1e293b",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                      title="Open Reports & Recovery"
                    >
                      <Icon name="file" size={16} />
                      <span>Reports</span>
                    </button>
                  </div>
                </section>

                <div className="demo-banner">
                  <span>
                    <Icon name="file" size={17} />
                  </span>
                  <p>
                    <strong>Excel-connected payroll workspace.</strong> Add or manage
                    clients, employers and employees; import Attendance Input or
                    Salary Register workbooks; edit attendance, salary and room
                    recoveries before approval.
                  </p>
                </div>
              </>
            ) : null}

            {!currentRun && (activeSection === "payroll" || activeSection === "attendance" || activeSection === "payments") ? (
              <EmptyPayroll
                unit={currentUnit}
                canCreate={mayManage("payroll")}
                canImport={mayManage("attendance") || mayManage("payroll")}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "run" })}
                onImport={() => setModal({ kind: "import", context: activeSection === "payroll" ? "payroll" : "attendance" })}
              />
            ) : null}

            {activeSection === "main_dashboard" && data ? (
              <ExecutiveDashboardView
                data={data}
                onNavigate={(section, opts) => {
                  if (section === "employees" && opts?.unitId) {
                    setActiveUnitId(opts.unitId);
                    const unit = data.units.find((u) => u.id === opts.unitId);
                    if (unit) setActiveVendorId(unit.vendorId);
                  }
                  if (section === "joined_employees") {
                    setInitialJoiningDate(opts?.date);
                  }
                  if (section === "left_employees") {
                    setInitialLeavingDate(opts?.date);
                  }
                  if (section === "notifications") {
                    setNotificationInitialTab(opts?.filterTab || "all");
                  }
                  if (mayView(section as Section)) {
                    setActiveSection(section as Section);
                  } else {
                    setToast("Your profile does not have access to that module");
                  }
                }}
                onSaveUnitScope={async (unitId, scope) => {
                  const ok = await performAction(
                    "update-unit-scope",
                    "Deployment scope updated successfully",
                    { unitId, scope, employeeCount: scope },
                  );
                  if (ok !== false) {
                    setToast("Deployment scope target updated successfully");
                  }
                }}
                canManage={mayManage("vendors")}
              />
            ) : null}

            {activeSection === "dashboard" ? (
              <>
                <WorkforceDashboard
                  data={data}
                  onNavigateToLeftEmployees={(date?: string) => {
                    setInitialLeavingDate(date);
                    setActiveSection("left_employees");
                  }}
                  onNavigateToJoinedEmployees={(date?: string) => {
                    setInitialJoiningDate(date);
                    setActiveSection("joined_employees");
                  }}
                  onNavigateToNotifications={(filterTab?: string) => {
                    setNotificationInitialTab(filterTab || "all");
                    setActiveSection("notifications");
                  }}
                  onOpenEmployeeApplication={(emp) => setAppPreviewEmployee(emp)}
                  onReuploadDocument={async (employeeId, category, filename, dataUrl) => {
                    const updated = await reuploadApplicationDocument(employeeId, category, filename, dataUrl);
                    setData((prev) =>
                      prev
                        ? {
                          ...prev,
                          applicationDocuments: [
                            ...(prev.applicationDocuments || []).filter(
                              (d) => !(d.employeeId === employeeId && d.category === category),
                            ),
                            ...(updated || [])
                              .filter((d) => d.category === category)
                              .map((d) => ({
                                id: (d as unknown as { id?: string }).id || `${employeeId}-${d.category}`,
                                employeeId,
                                category: d.category,
                                filename: d.filename,
                                status: d.status,
                                rejectionReason: d.rejectionReason,
                                reviewedBy: d.reviewedBy,
                                reviewedAt: d.reviewedAt,
                              })),
                          ],
                        }
                        : prev,
                    );
                    return updated;
                  }}
                />
                {currentRun ? (
                  <Dashboard
                    run={currentRun}
                    items={currentItems}
                    employees={operationalEmployees}
                    data={data}
                    onNavigate={(section) =>
                      mayView(section)
                        ? setActiveSection(section)
                        : setToast(
                          "Your profile does not have access to that module",
                        )
                    }
                  />
                ) : null}
              </>
            ) : null}
            {activeSection === "payroll" && currentRun ? (
              <>
                <PayrollPeriodEditor
                  key={currentRun.id}
                  run={currentRun}
                  canManage={mayManage("payroll")}
                  isActing={isActing}
                  onAction={performAction}
                />
                <PayrollRunView
                  run={currentRun}
                  items={currentItems}
                  employees={data.employees}
                  charges={data.accommodationCharges}
                  recoveryEntries={data.recoveryEntries}
                  missingEmployeeCount={missingPayrollEmployeeCount}
                  paymentProtected={hasDownloadedPaymentBatch}
                  isActing={isActing}
                  canManage={mayManage("payroll")}
                  canManageEmployees={mayManage("employees")}
                  canApprove={data.currentUser.canApprovePayroll}
                  onAction={performAction}
                  onSelect={setSelectedItem}
                  onEmployees={() => setActiveSection("employees")}
                  onImport={() => setModal({ kind: "import", context: "payroll" })}
                  onCreateMonth={() => setModal({ kind: "run" })}
                />
                <PayrollBatchPanel
                  run={currentRun}
                  items={currentItems}
                  batches={data.payrollBatches.filter(
                    (batch) => batch.runId === currentRun.id,
                  )}
                  canPrepare={mayManage("payroll")}
                  canClear={mayManage("payments")}
                  isActing={isActing}
                  onAction={performAction}
                />
              </>
            ) : null}
            {activeSection === "attendance" && currentRun ? (
              <AttendanceView
                period={currentRun.payPeriod}
                periodStart={currentRun.periodStart}
                periodEnd={currentRun.periodEnd}
                items={currentItems}
                employees={attendanceEmployees}
                attendance={data.attendance.filter((entry) => {
                  const range = payrollPeriodRange(
                    currentRun.payPeriod,
                    currentRun.periodStart,
                    currentRun.periodEnd,
                  );
                  return (
                    entry.attendanceDate >= range.start &&
                    entry.attendanceDate < range.end &&
                    attendanceEmployees.some(
                      (employee) => employee.id === entry.employeeId,
                    )
                  );
                })}
                canManage={mayManage("attendance")}
                onEdit={(employee, date, entry) =>
                  setModal({ kind: "attendance", employee, date, entry })
                }
                onImport={() => setModal({ kind: "import", context: "attendance" })}
                locked={
                  currentRun.status === "approved" ||
                  hasDownloadedPaymentBatch ||
                  !mayManage("attendance")
                }
              />
            ) : null}
            {activeSection === "employees" && currentUnit ? (
              <>
                {inviteEmployee && (
                  <OnboardingInvite
                    employees={currentEmployees}
                    initialEmployee={inviteEmployee === "select" ? undefined : inviteEmployee}
                    endpoint={apiEndpoint.replace(/\/payroll-api\/?$/, "/employee-onboarding")}
                    accessToken={accessToken}
                    publishableKey={publishableKey}
                    vendors={data.vendors}
                    units={data.units}
                    vendorId={activeVendorId}
                    unitId={activeUnitId}
                    onReview={(applicant) => {
                      setInviteEmployee(null);
                      const fields = applicant.application_json || {};
                      setModal({
                        kind: "employee",
                        employee: {
                          id: "",
                          vendorId: applicant.vendor_id || activeVendorId,
                          clientUnitId: applicant.client_unit_id || activeUnitId,
                          employeeCode: "",
                          name: applicant.name || fields["Full name"] || "",
                          department: fields["Department"] || fields["Designation"] || "Operations",
                          dateOfJoining: fields["Date of joining"] || new Date().toISOString().slice(0, 10),
                          dateOfBirth: fields["Date of birth"] || null,
                          dateOfLeaving: null,
                          uanMasked: fields["UAN number"] || null,
                          esiMasked: fields["ESI number"] || null,
                          bankAccountMasked: fields["Bank account number"] || null,
                          ifscMasked: fields["IFSC code"] || null,
                          bankName: fields["Bank name"] || null,
                          bankBranch: fields["Branch name"] || null,
                          accommodationType: fields["Accommodation required"] === "Yes" ? "hostel" : "own",
                          roomId: null,
                          roomNumber: null,
                          roomRentAmount: 0,
                          photoDataUrl: null,
                          mobileNumber: fields["Mobile number"] || null,
                          emailAddress: applicant.email_address || fields["Email"] || null,
                          emergencyContactNumber: fields["Emergency contact number"] || null,
                          addressLine: fields["Present address"] || fields["Permanent address"] || null,
                          district: fields["District"] || null,
                          state: fields["State"] || null,
                          pinCode: fields["Pincode"] || null,
                          status: "active",
                          employmentType: applicant.employment_type || "client",
                        } as unknown as Employee,
                      });
                    }}
                    onClose={() => setInviteEmployee(null)}
                  />
                )}
                <EmployeesView
                  loadApplicationDocuments={loadApplicationDocuments}
                  applicationDocuments={data.applicationDocuments}
                  employees={currentEmployees}
                  vendors={data.vendors}
                  units={data.units}
                  appUsers={data.appUsers}
                  canManage={mayManage("employees")}
                  isSuperAdmin={data?.currentUser?.role === "super_admin"}
                  onReviewDocument={reviewApplicationDocument}
                  onReviewAllDocuments={reviewAllApplicationDocuments}
                  onReuploadDocument={reuploadApplicationDocument}
                  onAdd={() => setModal({ kind: "employee" })}
                  onEdit={(employee) => setModal({ kind: "employee", employee })}
                  onInvite={(employee) => setInviteEmployee(employee || "select")}
                  onImport={() => setModal({ kind: "import", context: "employees" })}
                  onLeft={(employee) =>
                    setModal({ kind: "employee-left", employee })
                  }
                  onReactivate={(employee) =>
                    void performAction(
                      "reactivate-employee",
                      `${employee.name} reactivated`,
                      { employeeId: employee.id },
                    )
                  }
                  onWorkflow={(employee) =>
                    void performAction(
                      "advance-employee-workflow",
                      `${employee.name} moved to the next approval stage`,
                      { employeeId: employee.id },
                    )
                  }
                  onDelete={(employeeIds) =>
                    performAction(
                      "delete-employees",
                      `${employeeIds.length} employee(s) permanently deleted`,
                      { employeeIds },
                    )
                  }
                />
              </>
            ) : null}
            {activeSection === "employees" && !currentUnit ? (
              <EmptyPayroll
                unit={null}
                canCreate={mayManage("payroll")}
                canImport={mayManage("employees")}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "run" })}
                onImport={() => setModal({ kind: "import", context: "employees" })}
              />
            ) : null}
            {activeSection === "internal_staff" && data ? (
              data.currentUser.role === "super_admin" || data.currentUser.role === "hr_team" || mayView("internal_staff") ? (
                <InternalStaffLeaderboardView
                  data={data}
                  onAction={performAction}
                  onNavigateToReferrals={(query) => {
                    setReferralInitialQuery(query || "");
                    setActiveSection("referrals");
                  }}
                />
              ) : (
                <section className="panel empty-payroll">
                  <span><Icon name="users" size={28} /></span>
                  <h2>Internal Staff Leaderboard Restricted</h2>
                  <p>This module requires Super Admin or HR Team administrative privileges.</p>
                  <div>
                    <button className="secondary-button" onClick={() => setActiveSection("dashboard")}>
                      Back to Overview
                    </button>
                  </div>
                </section>
              )
            ) : null}
            {activeSection === "referrals" && data ? (
              data.currentUser.role === "super_admin" || data.currentUser.role === "hr_team" || mayView("referrals") ? (
                <ReferenceReports
                  data={data}
                  run={currentRun}
                  vendorId={activeVendorId}
                  unitId={activeUnitId}
                  initialQuery={referralInitialQuery}
                />
              ) : (
                <section className="panel empty-payroll">
                  <span><Icon name="users" size={28} /></span>
                  <h2>Referrals Report Restricted</h2>
                  <p>This module requires Super Admin or HR Team administrative privileges.</p>
                  <div>
                    <button className="secondary-button" onClick={() => setActiveSection("dashboard")}>
                      Back to Overview
                    </button>
                  </div>
                </section>
              )
            ) : null}
            {activeSection === "left_employees" && data ? (
              <LeftEmployeesView
                data={data}
                initialDate={initialLeavingDate}
                onNavigateBack={() => setActiveSection("dashboard")}
                onEditEmployee={(emp) => setModal({ kind: "employee", employee: emp })}
                onViewDocuments={(emp) => setAppPreviewEmployee(emp)}
              />
            ) : null}
            {activeSection === "joined_employees" && data ? (
              <JoinedEmployeesView
                data={data}
                initialDate={initialJoiningDate}
                onNavigateBack={() => setActiveSection("dashboard")}
                onEditEmployee={(emp) => setModal({ kind: "employee", employee: emp })}
                onViewDocuments={(emp) => setAppPreviewEmployee(emp)}
              />
            ) : null}
            {activeSection === "notifications" && data ? (
              <NotificationsView
                data={data}
                initialTab={notificationInitialTab}
                onOpenEmployeeApplication={(emp) => setAppPreviewEmployee(emp)}
                onEditEmployee={(emp) => setModal({ kind: "employee", employee: emp })}
                onGoToPayroll={() => setActiveSection("payroll")}
                onReuploadDocument={async (employeeId, category, filename, dataUrl) => {
                  const updated = await reuploadApplicationDocument(employeeId, category, filename, dataUrl);
                  setData((prev) =>
                    prev
                      ? {
                        ...prev,
                        applicationDocuments: [
                          ...(prev.applicationDocuments || []).filter(
                            (d) => !(d.employeeId === employeeId && d.category === category),
                          ),
                          ...(updated || [])
                            .filter((d) => d.category === category)
                            .map((d) => ({
                              id: (d as unknown as { id?: string }).id || `${employeeId}-${d.category}`,
                              employeeId,
                              category: d.category,
                              filename: d.filename,
                              status: d.status,
                              rejectionReason: d.rejectionReason,
                              reviewedBy: d.reviewedBy,
                              reviewedAt: d.reviewedAt,
                            })),
                        ],
                      }
                      : prev,
                  );
                  return updated;
                }}
              />
            ) : null}
            {activeSection === "hostels" && currentVendor ? (
              <HostelMaster
                vendorId={activeVendorId}
                units={data.units}
                types={data.accommodationTypes}
                hostels={data.hostels}
                rooms={data.accommodationRooms}
                employees={currentEmployees}
                readings={data.hostelUtilityReadings}
                expenses={data.roomExpenses}
                payPeriod={
                  currentRun?.payPeriod ??
                  activePeriod ??
                  new Date().toISOString().slice(0, 7)
                }
                canManage={mayManage("accommodation")}
                isSuperAdmin={data?.currentUser?.role === "super_admin"}
                canApprove={
                  data.currentUser.role === "super_admin" ||
                  data.currentUser.role === "hr_team"
                }
                isActing={isActing}
                onAction={performAction}
              />
            ) : null}
            {activeSection === "hostels" && !currentVendor ? (
              <EmptyPayroll
                unit={null}
                canCreate={mayManage("accommodation")}
                canImport={false}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "vendor" })}
                onImport={() => setModal({ kind: "import", context: "employees" })}
              />
            ) : null}
            {activeSection === "accommodation" && currentVendor ? (
              <>
                <AccommodationControlCenter
                  vendorId={activeVendorId}
                  selectedUnitId={activeUnitId}
                  types={currentTypes}
                  hostels={data.hostels}
                  units={data.units.filter(
                    (entry) => entry.vendorId === activeVendorId,
                  )}
                  rooms={data.accommodationRooms}
                  employees={currentEmployees}
                  allEmployees={data.employees.filter(
                    (entry) => entry.vendorId === activeVendorId,
                  )}
                  expenses={data.roomExpenses}
                  charges={data.accommodationCharges}
                  runs={data.runs}
                  payrollItems={data.payrollItems}
                  payPeriod={
                    currentRun?.payPeriod ??
                    activePeriod ??
                    new Date().toISOString().slice(0, 7)
                  }
                  canManage={mayManage("accommodation")}
                  isSuperAdmin={data?.currentUser?.role === "super_admin"}
                  isActing={isActing}
                  onAction={performAction}
                  onRoomStatus={(room) =>
                    updateRecordStatus(
                      "room",
                      room.id,
                      room.status,
                      `room ${room.roomNumber}`,
                    )
                  }
                  onDeleteRoom={(room) =>
                    deleteRecord("room", room.id, `room ${room.roomNumber}`)
                  }
                />
              </>
            ) : null}
            {activeSection === "accommodation" && !currentVendor ? (
              <EmptyPayroll
                unit={null}
                canCreate={mayManage("accommodation")}
                canImport={false}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "vendor" })}
                onImport={() => setModal({ kind: "import", context: "employees" })}
              />
            ) : null}
            {activeSection === "recoveries" ? (
              <RecoveryCenter
                run={currentRun}
                vendorId={activeVendorId}
                employees={currentEmployees}
                items={currentItems}
                charges={data.accommodationCharges}
                data={data}
                canManage={
                  mayManage("recoveries") &&
                  currentRun?.status !== "approved" &&
                  !hasDownloadedPaymentBatch
                }
                canApprove={
                  data.currentUser.role === "super_admin" ||
                  data.currentUser.canApprovePayroll
                }
                isActing={isActing}
                onAction={performAction}
              />
            ) : null}
            {activeSection === "vendor_desk" && data ? (
              <VendorDeskView
                data={data}
                currentRun={currentRun}
                currentVendor={currentVendor}
                onAction={performAction}
                isActing={isActing}
                onNavigateToRecoveries={() => setActiveSection("recoveries")}
              />
            ) : null}
            {activeSection === "payments" && currentRun ? (
              <>
                <PaymentsView
                  run={currentRun}
                  items={currentItems}
                  employees={currentEmployees}
                  vendor={currentVendor || (currentRun ? data.vendors.find((v) => v.id === currentRun.vendorId) : null) || data.vendors[0]}
                  unit={currentUnit || (currentRun ? data.units.find((u) => u.id === currentRun.clientUnitId) : null) || data.units[0]}
                  paymentExportBatches={data.paymentExportBatches.filter(
                    (batch) => batch.runId === currentRun.id,
                  )}
                  paymentExportBatchItems={data.paymentExportBatchItems.filter(
                    (item) => item.runId === currentRun.id,
                  )}
                  canExport={mayManage("payments")}
                  onAction={performAction}
                  onPayslip={setPayslipItem}
                  onBulkPayslips={() => setBulkPayslipsOpen(true)}
                />
                <PayrollBatchPanel
                  run={currentRun}
                  items={currentItems}
                  batches={data.payrollBatches.filter(
                    (batch) => batch.runId === currentRun.id,
                  )}
                  canPrepare={mayManage("payroll")}
                  canClear={mayManage("payments")}
                  isActing={isActing}
                  onAction={performAction}
                />
              </>
            ) : null}
            {activeSection === "vendors" ? (
              <VendorsView
                vendors={data.vendors}
                units={data.units}
                activeVendorId={activeVendorId}
                canManage={mayManage("vendors")}
                onSelect={(vendorId, unitId) => {
                  setActiveVendorId(vendorId);
                  setActiveUnitId(unitId);
                }}
                onAddVendor={() => setModal({ kind: "vendor" })}
                onEditVendor={(vendor) => setModal({ kind: "vendor", vendor })}
                onAddUnit={() => setModal({ kind: "unit" })}
                onEditUnit={(unit) => setModal({ kind: "unit", unit })}
                onVendorStatus={(vendor) =>
                  updateRecordStatus(
                    "client",
                    vendor.id,
                    vendor.status,
                    vendor.name,
                  )
                }
                onDeleteVendor={(vendor) =>
                  deleteRecord("client", vendor.id, vendor.name)
                }
                onUnitStatus={(unit) =>
                  updateRecordStatus(
                    "unit",
                    unit.id,
                    unit.status,
                    `${unit.clientName} · ${unit.unitName}`,
                  )
                }
                onDeleteUnit={(unit) =>
                  deleteRecord(
                    "unit",
                    unit.id,
                    `${unit.clientName} · ${unit.unitName}`,
                  )
                }
              />
            ) : null}
            {activeSection === "masters" && currentVendor ? (
              <MasterDataView
                client={currentVendor}
                types={currentTypes}
                rooms={data.accommodationRooms}
                employees={currentEmployees}
                shifts={currentShifts}
                remarks={currentRemarks}
                canManage={mayManage("masters")}
                onAddType={() => setModal({ kind: "accommodation-type" })}
                onEditType={(accommodationType) =>
                  setModal({ kind: "accommodation-type", accommodationType })
                }
                onTypeStatus={(type) =>
                  updateRecordStatus(
                    "accommodation_type",
                    type.id,
                    type.status,
                    type.name,
                  )
                }
                onDeleteType={(type) =>
                  deleteRecord("accommodation_type", type.id, type.name)
                }
                onAddShift={() => setModal({ kind: "shift" })}
                onEditShift={(shift) => setModal({ kind: "shift", shift })}
                onShiftStatus={(shift) =>
                  updateRecordStatus("shift", shift.id, shift.status, shift.name)
                }
                onDeleteShift={(shift) =>
                  deleteRecord("shift", shift.id, shift.name)
                }
                onAddRemark={() => setModal({ kind: "remark" })}
                onEditRemark={(remark) => setModal({ kind: "remark", remark })}
                onRemarkStatus={(remark) =>
                  updateRecordStatus(
                    "remark",
                    remark.id,
                    remark.status,
                    remark.title,
                  )
                }
                onDeleteRemark={(remark) =>
                  deleteRecord("remark", remark.id, remark.title)
                }
              />
            ) : null}
            {activeSection === "masters" && !currentVendor ? (
              <EmptyPayroll
                unit={null}
                canCreate={mayManage("payroll")}
                canImport={mayManage("masters")}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "run" })}
                onImport={() => setModal({ kind: "import", context: "employees" })}
              />
            ) : null}
            {activeSection === "operations" ? (
              <OperationsView
                data={data}
                canManage={mayManage("operations")}
                canApprove={
                  data.currentUser.role === "super_admin" ||
                  data.currentUser.role === "hr_team"
                }
                isActing={isActing}
                onAction={performAction}
              />
            ) : null}
            {activeSection === "revenue" && data ? (
              data.currentUser.role === "super_admin" || mayView("revenue") ? (
                <RevenueProjectionPage
                  data={data}
                  role={data.currentUser.role}
                  endpoint={apiEndpoint}
                  accessToken={accessToken}
                  publishableKey={publishableKey}
                  exportExcel={(filename, rows, sheetName) => downloadXlsx(`${filename}.xlsx`, rows, sheetName)}
                />
              ) : (
                <section className="panel empty-payroll">
                  <span><Icon name="calculator" size={28} /></span>
                  <h2>Revenue Projection Restricted</h2>
                  <p>This executive financial projection module is restricted to Super Admin leadership.</p>
                  <div>
                    <button className="secondary-button" onClick={() => setActiveSection("dashboard")}>
                      Back to Overview
                    </button>
                  </div>
                </section>
              )
            ) : null}
            {activeSection === "reports" ? (
              <>
                <ReportsCenter
                  data={data}
                  run={currentRun}
                  items={currentItems}
                  vendorId={activeVendorId}
                  unitId={activeUnitId}
                />
                <ReferenceReports
                  data={data}
                  run={currentRun}
                  vendorId={activeVendorId}
                  unitId={activeUnitId}
                />
              </>
            ) : null}
            {activeSection === "users" ? (
              <UsersAccessView
                users={data.appUsers}
                vendors={data.vendors}
                units={data.units}
                currentUser={data.currentUser}
                canManage={
                  data.currentUser.role === "super_admin" && mayManage("users")
                }
                onAdd={() => setModal({ kind: "app-user" })}
                onAddVendor={() => setModal({ kind: "app-user", defaultRole: "vendor" })}
                onEdit={(profile) => setModal({ kind: "app-user", profile })}
                onStatus={(profile) =>
                  updateRecordStatus(
                    "app_user",
                    profile.id,
                    profile.status,
                    profile.fullName ?? profile.email,
                  )
                }
                onDelete={(profile) =>
                  deleteRecord(
                    "app_user",
                    profile.id,
                    profile.fullName ?? profile.email,
                  )
                }
              />
            ) : null}
            {activeSection === "settings" && currentVendor ? (
              <SettingsView
                key={currentVendor.id}
                vendor={currentVendor}
                rules={currentRules}
                canManage={mayManage("settings")}
                isActing={isActing}
                onSave={(rules) =>
                  performAction("save-rules", "Payroll rules saved", {
                    vendorId: currentVendor.id,
                    rules,
                  })
                }
              />
            ) : null}
            {activeSection === "settings" && !currentVendor ? (
              <EmptyPayroll
                unit={null}
                canCreate={mayManage("settings")}
                canImport={false}
                canOpenClients={mayView("vendors")}
                onGoToVendors={() => setActiveSection("vendors")}
                onCreate={() => setModal({ kind: "vendor" })}
                onImport={() => setModal({ kind: "import", context: "employees" })}
              />
            ) : null}
          </SectionErrorBoundary>
        </main>
      </div>

      {selectedItem ? (
        <PayrollDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPayslip={() => {
            setPayslipItem(selectedItem);
            setSelectedItem(null);
          }}
          onEdit={() => {
            setModal({ kind: "salary", item: selectedItem });
            setSelectedItem(null);
          }}
          locked={
            currentRun?.status === "approved" ||
            downloadedPayrollItemIds.has(selectedItem.id) ||
            !mayManage("payroll")
          }
        />
      ) : null}
      {payslipItem && currentVendor && currentUnit ? (
        <PayslipModal
          item={payslipItem}
          employee={currentEmployees.find((employee) => employee.id === payslipItem.employeeId)}
          vendor={currentVendor}
          unit={currentUnit}
          run={currentRun}
          period={currentRun?.payPeriod ?? new Date().toISOString().slice(0, 7)}
          canExport={mayManage("payroll") || mayManage("payments")}
          apiEndpoint={apiEndpoint}
          accessToken={accessToken}
          publishableKey={publishableKey}
          onClose={() => setPayslipItem(null)}
        />
      ) : null}
      {bulkPayslipsOpen && currentVendor && currentUnit && currentRun ? (
        <BulkPayslipModal
          items={currentItems}
          employees={currentEmployees}
          vendor={currentVendor}
          unit={currentUnit}
          run={currentRun}
          canEmail={mayManage("payments") || mayManage("payroll")}
          accessToken={accessToken}
          publishableKey={publishableKey}
          onClose={() => setBulkPayslipsOpen(false)}
        />
      ) : null}
      {profileOpen ? (
        <ProfileModal
          profile={data.currentUser}
          busy={isActing}
          onClose={() => setProfileOpen(false)}
          onSave={async (details) => {
            const ok = await performAction(
              "save-own-profile",
              "Profile details updated",
              details,
            );
            if (ok) setProfileOpen(false);
          }}
          onChangePassword={onChangePassword}
        />
      ) : null}
      {modal ? (
        <PayrollActionModal
          loadApplicationDocuments={loadApplicationDocuments}
          modal={modal}
          vendors={data.vendors}
          units={data.units}
          hostels={data.hostels}
          accommodationTypes={data.accommodationTypes}
          rooms={data.accommodationRooms}
          employees={currentEmployees}
          allEmployees={data.employees}
          appUsers={data.appUsers}
          shifts={currentShifts}
          remarks={currentRemarks}
          unit={currentUnit}
          vendorId={activeVendorId}
          currentPeriod={
            currentRun?.payPeriod ??
            activePeriod ??
            new Date().toISOString().slice(0, 7)
          }
          currentRun={currentRun}
          attendance={data.attendance}
          busy={isActing}
          onClose={() => setModal(null)}
          onAction={performAction}
          apiEndpoint={apiEndpoint}
          accessToken={accessToken}
          publishableKey={publishableKey}
        />
      ) : null}
      {appPreviewEmployee && data ? (
        <EmployeeApplicationPreview
          employee={appPreviewEmployee === "blank" ? undefined : appPreviewEmployee}
          vendor={
            appPreviewEmployee === "blank"
              ? data.vendors[0]
              : data.vendors.find((v) => v.id === appPreviewEmployee.vendorId)
          }
          loadDocuments={loadApplicationDocuments}
          onReviewDocument={async (category, decision, rejectionReason) => {
            if (appPreviewEmployee && appPreviewEmployee !== "blank") {
              const updated = await reviewApplicationDocument(appPreviewEmployee.id, category, decision, rejectionReason);
              setData(prev => prev ? {
                ...prev,
                applicationDocuments: [
                  ...(prev.applicationDocuments || []).filter(d => !(d.employeeId === appPreviewEmployee.id && d.category === category)),
                  ...(updated || []).filter(d => d.category === category).map(d => ({
                    id: (d as unknown as { id?: string }).id || `${appPreviewEmployee.id}-${d.category}`,
                    employeeId: appPreviewEmployee.id,
                    category: d.category,
                    filename: d.filename,
                    status: d.status,
                    rejectionReason: d.rejectionReason,
                    reviewedBy: d.reviewedBy,
                    reviewedAt: d.reviewedAt,
                  }))
                ]
              } : prev);
              return updated;
            }
          }}
          onReviewAllDocuments={async (decision, rejectionReason) => {
            if (appPreviewEmployee && appPreviewEmployee !== "blank") {
              const updated = await reviewAllApplicationDocuments(appPreviewEmployee.id, decision, rejectionReason);
              setData(prev => prev ? {
                ...prev,
                applicationDocuments: [
                  ...(prev.applicationDocuments || []).filter(d => d.employeeId !== appPreviewEmployee.id),
                  ...(updated || []).map(d => ({
                    id: (d as unknown as { id?: string }).id || `${appPreviewEmployee.id}-${d.category}`,
                    employeeId: appPreviewEmployee.id,
                    category: d.category,
                    filename: d.filename,
                    status: d.status,
                    rejectionReason: d.rejectionReason,
                    reviewedBy: d.reviewedBy,
                    reviewedAt: d.reviewedAt,
                  }))
                ]
              } : prev);
              return updated;
            }
          }}
          onReuploadDocument={async (category, filename, dataUrl) => {
            if (appPreviewEmployee && appPreviewEmployee !== "blank") {
              const updated = await reuploadApplicationDocument(appPreviewEmployee.id, category, filename, dataUrl);
              setData(prev => prev ? {
                ...prev,
                applicationDocuments: [
                  ...(prev.applicationDocuments || []).filter(d => !(d.employeeId === appPreviewEmployee.id && d.category === category)),
                  ...(updated || []).filter(d => d.category === category).map(d => ({
                    id: (d as unknown as { id?: string }).id || `${appPreviewEmployee.id}-${d.category}`,
                    employeeId: appPreviewEmployee.id,
                    category: d.category,
                    filename: d.filename,
                    status: d.status,
                    rejectionReason: d.rejectionReason,
                    reviewedBy: d.reviewedBy,
                    reviewedAt: d.reviewedAt,
                  }))
                ]
              } : prev);
              return updated;
            }
          }}
          isSuperAdmin={data.currentUser.role === "super_admin"}
          onClose={() => setAppPreviewEmployee(null)}
        />
      ) : null}
      {toast ? (
        <div className={`toast ${typeof toast === "object" && toast.type === "error" ? "toast-error" : ""}`}>
          <Icon name={typeof toast === "object" && toast.type === "error" ? "alert" : "check"} size={17} />
          {typeof toast === "object" ? toast.message : toast}
        </div>
      ) : null}
    </div>
  );
}

function Dashboard({
  run,
  items,
  employees,
  data,
  onNavigate,
}: {
  run: PayrollRun;
  items: PayrollItem[];
  employees: Employee[];
  data: AppData;
  onNavigate: (section: Section) => void;
}) {
  const issueItems = items.filter((item) => item.validationStatus !== "ready");
  const paymentBankPercent = run.netPayable
    ? Math.round((run.bankPayable / run.netPayable) * 100)
    : 0;
  const departmentCounts = Array.from(
    new Set(items.map((item) => item.department)),
  ).map((department) => ({
    department,
    count: items.filter((item) => item.department === department).length,
    amount: items
      .filter((item) => item.department === department)
      .reduce((sum, item) => sum + item.netPayable, 0),
  }));
  const maxAmount = Math.max(...departmentCounts.map((row) => row.amount), 1);
  const workflow = [
    {
      label: "Attendance",
      detail: `${items.reduce((sum, item) => sum + item.presentDays, 0)} present days`,
      state: "complete",
    },
    {
      label: "Salary calculated",
      detail: `${items.length} employees`,
      state: "complete",
    },
    {
      label: "Validation",
      detail: run.issueCount ? `${run.issueCount} issues` : "All checks passed",
      state: run.issueCount ? "attention" : "complete",
    },
    {
      label: "Approval",
      detail: run.status === "approved" ? "Approved" : "Pending",
      state: run.status === "approved" ? "complete" : "pending",
    },
    {
      label: "Payment",
      detail: run.status === "approved" ? "Ready to export" : "Locked",
      state: run.status === "approved" ? "ready" : "pending",
    },
  ];

  return (
    <div className="section-stack">
      <section className="kpi-grid">
        <MetricCard
          label="Employees in run"
          value={String(run.employeeCount)}
          note={`${employees.filter((employee) => employee.paymentMode === "bank").length} bank · ${employees.filter((employee) => employee.paymentMode === "cash").length} cash`}
          tone="blue"
          icon="users"
        />
        <MetricCard
          label="Gross earnings"
          value={compactMoney(run.grossEarnings)}
          note="Before all deductions"
          tone="violet"
          icon="calculator"
        />
        <MetricCard
          label="Total deductions"
          value={compactMoney(
            run.statutoryDeductions +
            run.otherDeductions +
            run.accommodationDeductions,
          )}
          note={`${compactMoney(run.statutoryDeductions)} statutory`}
          tone="amber"
          icon="file"
        />
        <MetricCard
          label="Net payable"
          value={compactMoney(run.netPayable)}
          note={`${paymentBankPercent}% through bank`}
          tone="green"
          icon="bank"
        />
        <MetricCard
          label="Exceptions"
          value={String(run.issueCount)}
          note={
            run.issueCount
              ? "Resolve before approval"
              : "Payroll is validation-ready"
          }
          tone={run.issueCount ? "red" : "green"}
          icon="alert"
        />
      </section>

      <section className="panel workflow-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Month-end control</span>
            <h2>Payroll readiness</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("payroll")}>
            Open payroll run <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="workflow-line">
          {workflow.map((step, index) => (
            <div
              className={`workflow-step workflow-${step.state}`}
              key={step.label}
            >
              <div className="workflow-marker">
                {step.state === "complete" ? (
                  <Icon name="check" size={15} />
                ) : (
                  index + 1
                )}
              </div>
              <div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
              {index < workflow.length - 1 ? <i /> : null}
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Net payroll mix</span>
              <h2>Department view</h2>
            </div>
            <span className="muted-label">{money(run.netPayable)} total</span>
          </div>
          <div className="bar-list">
            {departmentCounts.map((row) => (
              <div className="bar-row" key={row.department}>
                <div>
                  <strong>{row.department}</strong>
                  <span>
                    {row.count} employee{row.count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${Math.max(10, (row.amount / maxAmount) * 100)}%`,
                    }}
                  />
                </div>
                <b>{money(row.amount)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel payment-mix-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Payment mode</span>
              <h2>Final payable distribution</h2>
            </div>
            <span className="muted-label">{money(run.netPayable)}</span>
          </div>
          <div className="payment-mix">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#2677f2 0 ${paymentBankPercent}%, #f2a94b ${paymentBankPercent}% 100%)`,
              }}
            >
              <span>
                <strong>{paymentBankPercent}%</strong>
                <small>account pay</small>
              </span>
            </div>
            <div className="mix-legend">
              <div>
                <i className="legend-bank" />
                <span>
                  <strong>Account: {money(run.bankPayable)}</strong>
                  <small>Bank transfer</small>
                </span>
              </div>
              <div>
                <i className="legend-cash" />
                <span>
                  <strong>Cash: {money(run.cashPayable)}</strong>
                  <small>Cash payout</small>
                </span>
              </div>
              <div>
                <i style={{ background: "#10b981", borderRadius: "50%" }} />
                <span>
                  <strong>Total: {money(run.netPayable)}</strong>
                  <small>Final net payable</small>
                </span>
              </div>
            </div>
          </div>
          <button
            className="secondary-button full-button"
            onClick={() => onNavigate("payments")}
          >
            Prepare payment outputs
          </button>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Validation queue</span>
            <h2>Exceptions requiring action</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate("payroll")}>
            {issueItems.length ? "Review all" : "View payroll"}{" "}
            <Icon name="arrow" size={16} />
          </button>
        </div>
        {issueItems.length ? (
          <div className="exception-list">
            {issueItems.map((item) => (
              <div className="exception-row" key={item.id}>
                <span className="employee-avatar">
                  {initials(item.employeeName)}
                </span>
                <div>
                  <strong>{item.employeeName}</strong>
                  <small>
                    {item.employeeCode} · {item.department}
                  </small>
                </div>
                <span className="exception-message">
                  <Icon name="alert" size={16} />
                  {item.validationMessage}
                </span>
                <b>{money(item.netPayable)}</b>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="check"
            title="No payroll exceptions"
            detail="All employee and calculation checks are ready for approval."
          />
        )}
      </section>

      {data.auditEvents.length ? (
        <section className="panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Control history</span>
              <h2>Recent activity</h2>
            </div>
          </div>
          <div className="activity-row">
            {data.auditEvents
              .slice(-3)
              .reverse()
              .map((event) => (
                <div key={event.id}>
                  <span>
                    <Icon name="check" size={15} />
                  </span>
                  <p>
                    <strong>{event.summary}</strong>
                    <small>{event.actorEmail ?? "Payroll system"}</small>
                  </p>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
  icon,
  onClick,
  active,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  icon: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <article
      className={`metric-card metric-${tone}${onClick ? " metric-card-interactive" : ""}${active ? " metric-card-selected" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
      title={onClick ? `Click to filter by ${label}` : undefined}
    >
      <div className="metric-top">
        <span>{label}</span>
        <i>
          <Icon name={icon} size={18} />
        </i>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const changePage = (targetPage: number, event?: React.MouseEvent) => {
    onPageChange(targetPage);
    if (typeof window !== "undefined") {
      const closestTable = (event?.currentTarget as HTMLElement)?.closest(
        ".table-panel, .panel, .data-table, .table-scroll, .section-card, .table-toolbar, section"
      );
      if (closestTable) {
        closestTable.scrollIntoView({ behavior: "instant", block: "start" });
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const mainCol = document.querySelector(".main-column, .content, main");
      if (mainCol) {
        mainCol.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
      }
    }
  };

  return (
    <div className="table-pagination-toolbar">
      <div className="pagination-info">
        Showing <strong>{start}</strong> to <strong>{end}</strong> of{" "}
        <strong>{totalItems}</strong> entries
      </div>
      <div className="pagination-buttons">
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage <= 1}
          onClick={(e) => changePage(1, e)}
          title="First page"
        >
          «
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage <= 1}
          onClick={(e) => changePage(currentPage - 1, e)}
          title="Previous page"
        >
          ‹ Prev
        </button>
        {startPage > 1 ? <span style={{ padding: "0 4px", color: "var(--muted)" }}>…</span> : null}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={p === currentPage ? "primary-button" : "secondary-button"}
            onClick={(e) => changePage(p, e)}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages ? <span style={{ padding: "0 4px", color: "var(--muted)" }}>…</span> : null}
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage >= totalPages}
          onClick={(e) => changePage(currentPage + 1, e)}
          title="Next page"
        >
          Next ›
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage >= totalPages}
          onClick={(e) => changePage(totalPages, e)}
          title="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

function PayrollRunView({
  run,
  items,
  employees,
  charges,
  recoveryEntries,
  missingEmployeeCount,
  paymentProtected,
  isActing,
  canManage,
  canManageEmployees,
  canApprove,
  onAction,
  onSelect,
  onEmployees,
  onImport,
  onCreateMonth,
}: {
  run: PayrollRun;
  items: PayrollItem[];
  employees?: Employee[];
  charges?: AccommodationCharge[];
  recoveryEntries?: RecoveryEntry[];
  missingEmployeeCount: number;
  paymentProtected: boolean;
  isActing: boolean;
  canManage: boolean;
  canManageEmployees: boolean;
  canApprove: boolean;
  onAction: (
    action: string,
    message: string,
    details?: Record<string, unknown>,
  ) => Promise<boolean>;
  onSelect: (item: PayrollItem) => void;
  onEmployees: () => void;
  onImport?: () => void;
  onCreateMonth?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [query, filter]);
  const visible = items.filter((item) => {
    const matchesQuery =
      `${item.employeeCode} ${item.employeeName} ${item.department}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "review"
        ? item.validationStatus !== "ready"
        : item.validationStatus === "ready");
    return matchesQuery && matchesFilter;
  });
  const paginatedVisible = visible.slice((page - 1) * 20, page * 20);
  function exportPayroll(format: "xlsx" | "csv" = "xlsx") {
    const rows = [
      [
        "Sl no",
        "Emp ID",
        "Name",
        "Pay Monthly/Daily",
        "Fixed W Days",
        "W Days",
        "NFH",
        "CO",
        "OD",
        "Sundays",
        "PL",
        "CL",
        "Payable Days",
        "Day rate",
        "Wages",
        "Basic",
        "DA",
        "HRA",
        "Food Allowance",
        "Night Allowance",
        "OT Hrs",
        "OT Wages",
        "Attendance Bonus",
        "Arrears",
        "Holiday Wages",
        "Sunday Earnings",
        "Leave Wages",
        "Room Allowance",
        "Production Incentive",
        "Medical Allowance",
        "Gross Earnings",
        "PF Deductions",
        "ESI Deductions",
        "Professional Tax",
        "LWF",
        "Canteen",
        "Snacks",
        "Rent",
        "Advance",
        "Others",
        "TDS",
        "Medical insurance",
        "Total Company Deductions",
        "Payslip Net Salary",
        "Hostel Room Rent",
        "Food / Mess",
        "Gas Share",
        "Provisions / Ration",
        "Bus / Transport",
        "Ticket",
        "Staff Advance Recovery",
        "Other Internal Recoveries",
        "Total Internal Deductions",
        "Final Net Payable",
        "Unrecovered Balance (Carryover)",
      ],
      ...visible.map((item, index) => {
        const emp = employees?.find((e) => e.employeeCode === item.employeeCode || e.id === item.employeeId);
        const isDaily = item.salaryBasis === "daily" || emp?.salaryBasis === "daily";
        const dayRate = (isDaily && emp?.salaryAmount && Number(emp.salaryAmount) > 0)
          ? Number(emp.salaryAmount)
          : (item.payableDays > 0
            ? Math.round(((item.basic + (item.arrears || 0) + (item.da || 0)) / item.payableDays) * 100) / 100
            : (Number(emp?.salaryAmount) || 0));
        const wages = (item.payableDays > 0 && dayRate > 0)
          ? Math.round(dayRate * item.payableDays * 100) / 100
          : (item.basic + (item.arrears || 0));

        const companyDeds = Number(item.importedTotalDeductions || 0) > 0
          ? Number(item.importedTotalDeductions)
          : Math.max(0, item.totalDeductions - (item.accommodationDeduction || 0));
        const payslipNet = Number(item.importedNetPayable || 0) > 0
          ? Number(item.importedNetPayable)
          : Math.max(0, item.grossEarnings - companyDeds);

        const empCharge = charges?.find((c) => c.employeeId === (emp?.id ?? item.employeeId) && (!run || c.runId === run.id));
        const empEntries = recoveryEntries?.filter((e) => e.employeeId === (emp?.id ?? item.employeeId) && (!run || e.runId === run.id || (run?.payPeriod && e.recoveryDate?.startsWith(run.payPeriod)))) || [];
        const datedSum = (type: string) => empEntries.filter((e) => e.recoveryType === type && e.recoveryType !== "returnAmount").reduce((s, e) => s + Number(e.amount || 0), 0);
        const rRent = datedSum("rent") > 0 ? datedSum("rent") : Number(empCharge?.rent || 0);
        const fMess = datedSum("food") > 0 ? datedSum("food") : Number(empCharge?.food || 0);
        const gShare = datedSum("gasShare") > 0 ? datedSum("gasShare") : Number(empCharge?.gasShare || 0);
        const pRation = (datedSum("provisionShare") > 0 ? datedSum("provisionShare") : Number(empCharge?.provisionShare || 0)) +
          (datedSum("rationShare") > 0 ? datedSum("rationShare") : Number(empCharge?.rationShare || 0));
        const bTrans = datedSum("bus") > 0 ? datedSum("bus") : Number(empCharge?.bus || 0);
        const tTicket = datedSum("ticket") > 0 ? datedSum("ticket") : Number(empCharge?.ticket || 0);
        const sAdv = datedSum("advance") > 0 ? datedSum("advance") : Number(empCharge?.advance || 0);
        const oRec = datedSum("medical") + datedSum("idCard") + datedSum("shoe") + datedSum("aadhaarUpdate") + datedSum("bankAccountCharge") + datedSum("tshirt") + datedSum("oldPending") + datedSum("other") +
          Number(empCharge?.medical || 0) + Number(empCharge?.idCard || 0) + Number(empCharge?.shoe || 0) + Number(empCharge?.aadhaarUpdate || 0) + Number(empCharge?.bankAccountCharge || 0) + Number(empCharge?.tshirt || 0) + Number(empCharge?.oldPending || 0);
        const totInternal = Number(item.accommodationDeduction || 0) > 0
          ? Number(item.accommodationDeduction)
          : (rRent + fMess + gShare + pRation + bTrans + tTicket + sAdv + oRec);
        const finNet = Number(item.netPayable !== undefined ? item.netPayable : Math.max(0, payslipNet - totInternal));
        const unrecDeficit = Number(item.unrecoveredAmount) || (payslipNet < totInternal ? Math.round((totInternal - payslipNet) * 100) / 100 : 0);

        return [
          index + 1,
          item.employeeCode,
          item.employeeName,
          item.salaryBasis === "daily" || emp?.salaryBasis === "daily" ? "Daily" : "Monthly",
          item.fixedWorkingDays,
          item.presentDays,
          item.nfhDays,
          item.compOffDays,
          item.onDutyDays,
          item.sundayDays,
          item.plDays,
          item.clDays,
          item.payableDays,
          dayRate,
          wages,
          item.basic,
          item.da,
          item.hra,
          item.foodAllowance,
          item.nightAllowance,
          item.overtimeHours,
          item.overtimeWages,
          item.attendanceBonus,
          item.arrears,
          item.holidayWages,
          item.sundayEarnings ?? 0,
          item.leaveWages ?? 0,
          item.roomAllowance ?? 0,
          item.productionIncentive,
          item.medicalAllowance,
          item.grossEarnings,
          item.pfDeduction,
          item.esiDeduction,
          item.professionalTax,
          item.lwf,
          item.canteen,
          item.snacks,
          item.tent,
          item.advance,
          item.otherDeduction,
          item.tds,
          item.medicalInsurance,
          companyDeds,
          payslipNet,
          rRent,
          fMess,
          gShare,
          pRation,
          bTrans,
          tTicket,
          sAdv,
          oRec,
          totInternal,
          finNet,
          unrecDeficit,
        ];
      }),
    ];
    if (format === "xlsx") {
      downloadXlsx(`payroll-register-${run.payPeriod}.xlsx`, rows, "Payroll Register");
    } else {
      downloadCsv("payroll-register-" + run.payPeriod + ".csv", rows);
    }
  }
  return (
    <div className="section-stack">
      <section
        className={`run-command ${run.status === "approved" ? "command-approved" : run.issueCount ? "command-attention" : "command-ready"}`}
      >
        <div className="command-icon">
          {run.status === "approved" ? (
            <Icon name="check" />
          ) : (
            <Icon name={run.issueCount ? "alert" : "calculator"} />
          )}
        </div>
        <div>
          <span className="eyebrow">
            Run {run.id} ·{" "}
            {run.processingMode === "salary_import"
              ? "Imported salary source"
              : "Application attendance source"}
          </span>
          <h2>
            {run.status === "approved"
              ? "Payroll approved"
              : !items.length
                ? "Add employees to start payroll"
                : run.issueCount
                  ? `${run.issueCount} employee records need review`
                  : run.grossEarnings <= 0
                    ? "Add attendance or salary amounts"
                    : "Payroll passed all validation checks"}
          </h2>
          <p>
            {run.status === "approved"
              ? `Approved by ${run.approvedBy ?? "Payroll approver"}. Payment exports are unlocked.`
              : !items.length
                ? "Add or import employees, then record their attendance and salary."
                : run.issueCount
                  ? "Update employee bank or statutory details, then recheck the run."
                  : run.grossEarnings <= 0
                    ? "Record attendance or open an employee salary row to enter earnings."
                    : run.processingMode === "salary_import"
                      ? "Imported salary-slip headers are authoritative; review recoveries and approve."
                      : "Review the attendance-based calculations, then approve the final salary run."}
          </p>
        </div>
        <div className="command-actions">
          {canManage ? (
            <>
              {onCreateMonth ? (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isActing}
                  onClick={onCreateMonth}
                  title="Create a new monthly calculation period"
                >
                  <Icon name="calendar" size={17} />
                  + Create payroll month
                </button>
              ) : null}
              {run.status !== "approved" ? (
                <>
                  <button
                    className="secondary-button"
                    disabled={isActing}
                    onClick={() =>
                      onAction(
                        "recalculate",
                        run.processingMode === "salary_import"
                          ? "Imported salary totals recalculated"
                          : "Attendance and payroll totals recalculated",
                      )
                    }
                  >
                    {isActing ? (
                      <span className="button-spinner" />
                    ) : (
                      <Icon name="refresh" size={17} />
                    )}
                    {run.processingMode === "salary_import"
                      ? "Refresh totals"
                      : "Recalculate attendance"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isActing}
                    onClick={() =>
                      onAction(
                        "set-run-processing-mode",
                        `Switched to ${run.processingMode === "salary_import" ? "Application Attendance" : "Salary Import"} mode`,
                        {
                          processingMode:
                            run.processingMode === "salary_import"
                              ? "attendance"
                              : "salary_import",
                        },
                      )
                    }
                    title="Switch payroll processing source mode"
                  >
                    <Icon name="settings" size={17} />
                    {run.processingMode === "salary_import"
                      ? "Switch to Attendance Mode"
                      : "Switch to Salary Import"}
                  </button>
                  <button
                    className="danger-button"
                    disabled={isActing || paymentProtected}
                    title={
                      paymentProtected
                        ? "Downloaded bank batches protect this payroll from deletion"
                        : undefined
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete the ${monthLabel(run.payPeriod)} payroll run? Salary calculations and accommodation recoveries will be removed, but attendance history will remain.`,
                        )
                      )
                        void onAction(
                          "delete-payroll-run",
                          "Payroll run deleted; attendance history preserved",
                        );
                    }}
                  >
                    Delete run
                  </button>
                </>
              ) : null}
              {!items.length ? (
                canManageEmployees ? (
                  <button className="primary-button" onClick={onEmployees}>
                    + Add employees
                  </button>
                ) : (
                  <span className="access-mode-note">
                    HR must add employees
                  </span>
                )
              ) : run.issueCount ? (
                <>
                  <button
                    className="secondary-button"
                    disabled={isActing}
                    onClick={() =>
                      onAction("resolve-issues", "Employee records checked")
                    }
                  >
                    Recheck
                  </button>
                  {canManageEmployees ? (
                    <button className="primary-button" onClick={onEmployees}>
                      Edit employee records
                    </button>
                  ) : null}
                </>
              ) : run.status !== "approved" ? (
                canApprove ? (
                  <button
                    className="primary-button"
                    disabled={isActing || run.grossEarnings <= 0}
                    onClick={() =>
                      onAction(
                        "approve",
                        "Payroll approved and payment outputs unlocked",
                      )
                    }
                  >
                    <Icon name="check" size={17} />
                    Approve payroll
                  </button>
                ) : (
                  <span className="access-mode-note">
                    <Icon name="alert" size={15} />
                    Awaiting an authorised approver
                  </span>
                )
              ) : (
                <button
                  className="secondary-button"
                  disabled={isActing}
                  onClick={() =>
                    onAction(
                      "reopen",
                      missingEmployeeCount
                        ? `${missingEmployeeCount} missed employee${missingEmployeeCount === 1 ? "" : "s"} added to payroll; downloaded salary records remain locked`
                        : "Payroll reopened for corrections",
                    )
                  }
                >
                  <Icon name="refresh" size={17} />
                  {missingEmployeeCount
                    ? `Add ${missingEmployeeCount} missed employee${missingEmployeeCount === 1 ? "" : "s"} & reopen`
                    : "Reopen payroll"}
                </button>
              )}
            </>
          ) : (
            <span className="access-mode-note">
              <Icon name="eye" size={15} />
              View-only payroll access
            </span>
          )}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Search employee"
              placeholder="Search employee, ID or department"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="filter-tabs">
            <button
              className={filter === "all" ? "filter-active" : ""}
              onClick={() => setFilter("all")}
            >
              All <span>{items.length}</span>
            </button>
            <button
              className={filter === "ready" ? "filter-active" : ""}
              onClick={() => setFilter("ready")}
            >
              Ready{" "}
              <span>
                {
                  items.filter((item) => item.validationStatus === "ready")
                    .length
                }
              </span>
            </button>
            <button
              className={filter === "review" ? "filter-active" : ""}
              onClick={() => setFilter("review")}
            >
              Review{" "}
              <span>
                {
                  items.filter((item) => item.validationStatus !== "ready")
                    .length
                }
              </span>
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {canManage && onImport ? (
              <button
                type="button"
                className="primary-button"
                onClick={onImport}
                disabled={run.status === "approved" || isActing}
                title={
                  run.status === "approved"
                    ? "Reopen payroll to import updated salary registers"
                    : "Upload 44-column Salary Register or Attendance Excel"
                }
              >
                <Icon name="upload" size={16} />
                Bulk upload payroll / Excel
              </button>
            ) : null}
            {canManage ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportPayroll("xlsx")}
                  title="Download 44-column payroll Excel with safe numbers"
                >
                  <Icon name="download" size={16} />
                  Download 44-column payroll Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportPayroll("csv")}
                  title="Download 44-column payroll CSV"
                >
                  <Icon name="download" size={16} />
                  Payroll CSV
                </button>
              </>
            ) : null}
          </div>
        </div>
        {items.some((it) => (it.grossEarnings || 0) - (it.totalDeductions || 0) + (it.returnAmount || 0) < -0.009) ? (
          <div style={{ margin: "10px 16px", padding: "10px 14px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", color: "#92400e", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <Icon name="alert" size={18} />
            <span>
              <strong>Negative Balance Carryover:</strong> {items.filter((it) => (it.grossEarnings || 0) - (it.totalDeductions || 0) + (it.returnAmount || 0) < -0.009).length} employee(s) have unrecovered deductions totaling ₹{items.filter((it) => (it.grossEarnings || 0) - (it.totalDeductions || 0) + (it.returnAmount || 0) < -0.009).reduce((sum, it) => sum + Math.abs((it.grossEarnings || 0) - (it.totalDeductions || 0) + (it.returnAmount || 0)), 0).toFixed(2)}. Their take-home net is capped at ₹0.00, and the unrecovered deficit will automatically carry over to next month&apos;s deductions upon approval.
            </span>
          </div>
        ) : null}
        <div className="table-scroll">
          <table className="data-table payroll-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Payable / OT</th>
                <th>Company Gross</th>
                <th>Company Deductions</th>
                <th>Payslip Net</th>
                <th>Internal Deductions</th>
                <th>Final Net Payable</th>
                <th>Validation</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginatedVisible.map((item) => {
                const companyDeds = Number(item.importedTotalDeductions || 0) > 0
                  ? Number(item.importedTotalDeductions)
                  : Math.max(0, item.totalDeductions - (item.accommodationDeduction || 0));
                const payslipNet = Number(item.importedNetPayable || 0) > 0
                  ? Number(item.importedNetPayable)
                  : Math.max(0, item.grossEarnings - companyDeds);

                const empCharge = charges?.find(
                  (c) => c.employeeId === item.employeeId && (!run || c.runId === run.id),
                );
                const empEntries = recoveryEntries?.filter(
                  (e) => e.employeeId === item.employeeId && (!run || e.runId === run.id),
                ) || [];
                const datedSum = (type: string) =>
                  empEntries.filter((e) => e.recoveryType === type && e.recoveryType !== "returnAmount").reduce((s, e) => s + Number(e.amount || 0), 0);

                const rRent = datedSum("rent") > 0 ? datedSum("rent") : Number(empCharge?.rent || 0);
                const fMess = datedSum("food") > 0 ? datedSum("food") : Number(empCharge?.food || 0);
                const gShare = datedSum("gasShare") > 0 ? datedSum("gasShare") : Number(empCharge?.gasShare || 0);
                const pRation = (datedSum("provisionShare") > 0 ? datedSum("provisionShare") : Number(empCharge?.provisionShare || 0)) +
                  (datedSum("rationShare") > 0 ? datedSum("rationShare") : Number(empCharge?.rationShare || 0));
                const bTrans = datedSum("bus") > 0 ? datedSum("bus") : Number(empCharge?.bus || 0);
                const tTicket = datedSum("ticket") > 0 ? datedSum("ticket") : Number(empCharge?.ticket || 0);
                const sAdv = datedSum("advance") > 0 ? datedSum("advance") : Number(empCharge?.advance || 0);

                const breakdownItems: string[] = [];
                if (rRent > 0) breakdownItems.push(`Rent ₹${rRent}`);
                if (gShare > 0) breakdownItems.push(`Gas ₹${gShare}`);
                if (fMess > 0) breakdownItems.push(`Food ₹${fMess}`);
                if (pRation > 0) breakdownItems.push(`Ration ₹${pRation}`);
                if (tTicket > 0) breakdownItems.push(`Ticket ₹${tTicket}`);
                if (sAdv > 0) breakdownItems.push(`Advance ₹${sAdv}`);
                if (bTrans > 0) breakdownItems.push(`Bus ₹${bTrans}`);

                const breakdownLabel = breakdownItems.length > 0
                  ? breakdownItems.join(" · ")
                  : (item.accommodationDeduction > 0 ? "Internal recovery" : "No deduction");

                return (
                  <tr key={item.id}>
                    <td>
                      <EmployeeCell
                        name={item.employeeName}
                        code={item.employeeCode}
                        detail={item.department}
                      />
                    </td>
                    <td>
                      <strong>{item.payableDays} days</strong>
                      <small>{item.overtimeHours} OT hrs</small>
                    </td>
                    <td>{money(item.grossEarnings)}</td>
                    <td>{money(companyDeds)}</td>
                    <td>
                      <strong>{money(payslipNet)}</strong>
                    </td>
                    <td>
                      {money(item.accommodationDeduction)}
                      <small title={breakdownLabel}>{breakdownLabel}</small>
                    </td>
                    <td className="net-cell">
                      {money(item.netPayable)}
                      {((item.grossEarnings || 0) - (item.totalDeductions || 0) + (item.returnAmount || 0) < -0.009) ? (
                        <span style={{ display: "block", fontSize: "11px", color: "#d97706", fontWeight: "normal" }}>
                          ⚠️ ₹{Math.abs((item.grossEarnings || 0) - (item.totalDeductions || 0) + (item.returnAmount || 0)).toFixed(2)} carried forward
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <StatusPill
                        status={
                          item.validationStatus === "ready"
                            ? (item.paymentMode === "cash" || !item.bankAccountMasked || !item.ifscMasked ? "Cash ready" : "Ready")
                            : "Review"
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="row-action"
                        aria-label={`Review ${item.employeeName}`}
                        onClick={() => onSelect(item)}
                      >
                        <Icon name="chevron" size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>{visible.length} employees</strong>
                </td>
                <td>
                  {money(
                    visible.reduce((sum, item) => sum + item.grossEarnings, 0),
                  )}
                </td>
                <td>
                  {money(
                    visible.reduce(
                      (sum, item) =>
                        sum +
                        (Number(item.importedTotalDeductions || 0) > 0
                          ? Number(item.importedTotalDeductions)
                          : item.totalDeductions - (item.accommodationDeduction || 0)),
                      0,
                    ),
                  )}
                </td>
                <td>
                  <strong>
                    {money(
                      visible.reduce(
                        (sum, item) => {
                          const cDeds = Number(item.importedTotalDeductions || 0) > 0
                            ? Number(item.importedTotalDeductions)
                            : Math.max(0, item.totalDeductions - (item.accommodationDeduction || 0));
                          return (
                            sum +
                            (Number(item.importedNetPayable || 0) > 0
                              ? Number(item.importedNetPayable)
                              : Math.max(0, item.grossEarnings - cDeds))
                          );
                        },
                        0,
                      ),
                    )}
                  </strong>
                </td>
                <td>
                  {money(
                    visible.reduce((sum, item) => sum + (item.accommodationDeduction || 0), 0),
                  )}
                </td>
                <td>
                  {money(
                    visible.reduce((sum, item) => sum + item.netPayable, 0),
                  )}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          totalItems={visible.length}
          pageSize={20}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

function AttendanceView({
  period,
  periodStart,
  periodEnd,
  items,
  employees,
  attendance,
  canManage,
  onEdit,
  onImport,
  locked,
}: {
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  items: PayrollItem[];
  employees: Employee[];
  attendance: AttendanceEntry[];
  canManage: boolean;
  onEdit: (employee: Employee, date: string, entry?: AttendanceEntry) => void;
  onImport: () => void;
  locked: boolean;
}) {
  const [page, setPage] = useState(1);
  const [selectedDayBreakdown, setSelectedDayBreakdown] = useState<string | null>(null);

  const dates = useMemo(() => {
    const range = payrollPeriodRange(period, periodStart, periodEnd);
    return Array.from({ length: range.days }, (_, index) => {
      const date = new Date(`${range.start}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    });
  }, [period, periodStart, periodEnd]);

  const entryMap = useMemo(() => {
    return new Map(
      attendance.map((entry) => [
        `${entry.employeeId}:${entry.attendanceDate}`,
        entry,
      ]),
    );
  }, [attendance]);

  const itemByEmployeeId = useMemo(() => {
    return new Map(items.map((row) => [row.employeeId, row]));
  }, [items]);

  const followups = useMemo(() => {
    return items
      .filter((item) => item.absentDays >= 2 || item.leaveDays >= 2)
      .sort((a, b) => {
        const totalA = (a.absentDays || 0) + (a.leaveDays || 0);
        const totalB = (b.absentDays || 0) + (b.leaveDays || 0);
        if (totalB !== totalA) {
          return totalB - totalA;
        }
        if ((b.absentDays || 0) !== (a.absentDays || 0)) {
          return (b.absentDays || 0) - (a.absentDays || 0);
        }
        return a.employeeName.localeCompare(b.employeeName);
      });
  }, [items]);

  const liveAttendanceByEmpId = useMemo(() => {
    const map = new Map<string, { present: number; absent: number; leave: number; hp: number; ot: number }>();
    for (const emp of employees) {
      let present = 0, absent = 0, leave = 0, hp = 0, ot = 0;
      for (const d of dates) {
        const entry = entryMap.get(`${emp.id}:${d}`);
        if (!entry) continue;
        if (entry.statusCode === "P" || entry.statusCode === "HP" || entry.statusCode === "CO") {
          present += 1;
        } else if (entry.statusCode === "HD") {
          present += 0.5;
        } else if (entry.statusCode === "A") {
          absent += 1;
        } else if (entry.statusCode === "L") {
          leave += 1;
        }
        if (entry.statusCode === "HP") hp += 1;
        if (entry.overtimeHours) ot += entry.overtimeHours;
      }
      map.set(emp.id, { present, absent, leave, hp, ot });
    }
    return map;
  }, [employees, dates, entryMap]);

  const kpiTotals = useMemo(() => {
    const itemsPresentSum = items.reduce((s, it) => s + (it.presentDays || 0), 0);
    const itemsAbsentSum = items.reduce((s, it) => s + (it.absentDays || 0), 0);
    const itemsLeaveSum = items.reduce((s, it) => s + (it.leaveDays || 0), 0);
    const itemsHpSum = items.reduce((s, it) => s + (it.holidayPresentDays || 0), 0);
    const itemsOtSum = items.reduce((s, it) => s + (it.overtimeHours || 0), 0);

    let livePresentSum = 0, liveAbsentSum = 0, liveLeaveSum = 0, liveHpSum = 0, liveOtSum = 0;
    for (const stats of liveAttendanceByEmpId.values()) {
      livePresentSum += stats.present;
      liveAbsentSum += stats.absent;
      liveLeaveSum += stats.leave;
      liveHpSum += stats.hp;
      liveOtSum += stats.ot;
    }

    return {
      present: itemsPresentSum > 0 ? itemsPresentSum : livePresentSum,
      absent: itemsAbsentSum > 0 ? itemsAbsentSum : liveAbsentSum,
      leave: itemsLeaveSum > 0 ? itemsLeaveSum : liveLeaveSum,
      hp: itemsHpSum > 0 ? itemsHpSum : liveHpSum,
      ot: itemsOtSum > 0 ? itemsOtSum : liveOtSum,
    };
  }, [items, liveAttendanceByEmpId]);

  const paginatedEmployees = useMemo(() => {
    return employees.slice((page - 1) * 20, page * 20);
  }, [employees, page]);

  const dayBreakdownMap = useMemo(() => {
    const map = new Map<string, { presentCount: number; absentCount: number; offCount: number }>();
    for (const date of dates) {
      map.set(date, { presentCount: 0, absentCount: 0, offCount: 0 });
    }
    for (const employee of employees) {
      for (const date of dates) {
        const entry = entryMap.get(`${employee.id}:${date}`);
        const code = entry?.statusCode ?? "A";
        const b = map.get(date);
        if (!b) continue;
        if (code === "P" || code === "HP" || code === "CO") {
          b.presentCount += 1;
        } else if (code === "HD") {
          b.presentCount += 0.5;
          b.absentCount += 0.5;
        } else if (code === "A" || code === "L") {
          b.absentCount += 1;
        } else if (code === "WO" || code === "H") {
          b.offCount += 1;
        } else {
          b.absentCount += 1;
        }
      }
    }
    return map;
  }, [dates, employees, entryMap]);

  const getDayBreakdown = useCallback((date: string) => {
    return dayBreakdownMap.get(date) ?? {
      presentCount: 0,
      absentCount: 0,
      offCount: 0,
    };
  }, [dayBreakdownMap]);

  function exportAttendance(format: "xlsx" | "csv" = "xlsx") {
    const rows = [
      [
        "Emp ID",
        "Name",
        "Department",
        "Default shift",
        ...dates.flatMap((date) => [
          `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} Att`,
          `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} OT`,
        ]),
        "Total Present",
        "Total Absent",
        "Total Week Off",
        "Total Holiday",
        "Total OT Hours",
      ],
      ...employees.map((employee) => {
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalWeekOff = 0;
        let totalHoliday = 0;
        let totalOt = 0;

        const dayValues = dates.flatMap((date) => {
          const entry = entryMap.get(`${employee.id}:${date}`);
          if (!entry) return ["", ""];
          const code = entry.statusCode;
          const ot = Number(entry.overtimeHours) || 0;
          if (ot > 0) totalOt += ot;

          if (code === "P" || code === "HP" || code === "CO") {
            totalPresent += 1;
          } else if (code === "HD") {
            totalPresent += 0.5;
            totalAbsent += 0.5;
          } else if (code === "A" || code === "L") {
            totalAbsent += 1;
          } else if (code === "WO") {
            totalWeekOff += 1;
          } else if (code === "H") {
            totalHoliday += 1;
          } else {
            totalAbsent += 1;
          }

          return [code, ot > 0 ? ot : 0];
        });

        return [
          employee.employeeCode,
          employee.name,
          employee.department,
          employee.defaultShift,
          ...dayValues,
          totalPresent,
          totalAbsent,
          totalWeekOff,
          totalHoliday,
          totalOt > 0 ? totalOt : 0,
        ];
      }),
    ];
    if (format === "xlsx") {
      downloadXlsx(`attendance-${period}.xlsx`, rows, "Attendance Register");
    } else {
      downloadCsv(`attendance-${period}.csv`, rows);
    }
  }

  function downloadAttendanceTemplate(format: "xlsx" | "csv" = "xlsx") {
    const dayHeaders = dates.flatMap((date) => [
      `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} Att`,
      `${new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} OT`,
    ]);
    const templateRows = employees.length > 0
      ? employees.map((employee) => [
        employee.employeeCode,
        employee.name,
        employee.department,
        employee.defaultShift || "General",
        ...dates.flatMap(() => ["", ""]),
        "", // Total Present
        "", // Total Absent
        "", // Total Week Off
        "", // Total Holiday
        "", // Total OT Hours
      ])
      : Array.from({ length: 5 }, () => [
        "",
        "",
        "",
        "",
        ...dates.flatMap(() => ["", ""]),
        "",
        "",
        "",
        "",
        "",
      ]);

    const rows = [
      [
        "Emp ID",
        "Name",
        "Department",
        "Default shift",
        ...dayHeaders,
        "Total Present",
        "Total Absent",
        "Total Week Off",
        "Total Holiday",
        "Total OT Hours",
      ],
      ...templateRows,
    ];

    if (format === "xlsx") {
      downloadXlsx(`attendance-template-${period}.xlsx`, rows, "Attendance Template");
    } else {
      downloadCsv(`attendance-template-${period}.csv`, rows);
    }
  }
  return (
    <div className="section-stack">
      <section className="rule-callout">
        <span>
          <Icon name="calendar" />
        </span>
        <div>
          <strong>
            {locked
              ? "This attendance register is read only."
              : "Click any date to enter attendance, shift, and overtime."}
          </strong>
          <p>
            Shifts can change every day and week offs may occur on any weekday.
            Import the original Attendance Input workbook to fill the whole
            month.
          </p>
        </div>
      </section>
      <section className="kpi-grid attendance-kpis">
        <MetricCard
          label="Present days"
          value={String(kpiTotals.present)}
          note="Includes holiday present & comp off"
          tone="green"
          icon="check"
        />
        <MetricCard
          label="Absent days"
          value={String(kpiTotals.absent)}
          note={`${followups.length} follow-up cases`}
          tone="red"
          icon="alert"
        />
        <MetricCard
          label="Leave days"
          value={String(kpiTotals.leave)}
          note="Continuous streak tracked"
          tone="violet"
          icon="calendar"
        />
        <MetricCard
          label="Holiday work"
          value={String(kpiTotals.hp)}
          note="Feeds holiday wages"
          tone="amber"
          icon="calculator"
        />
        <MetricCard
          label="OT hours"
          value={String(kpiTotals.ot)}
          note="Feeds overtime wages"
          tone="blue"
          icon="calculator"
        />
      </section>
      <section className="panel table-panel">
        <div className="panel-heading attendance-heading">
          <div>
            <span className="eyebrow">{monthLabel(period)} daily roster</span>
            <h2>Attendance + shift matrix</h2>
          </div>
          <div className="attendance-toolbar">
            {canManage ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => downloadAttendanceTemplate("xlsx")}
                  title="Download clean Excel template with employee list and day columns"
                >
                  <Icon name="file" size={15} />
                  Export Excel Template
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportAttendance("xlsx")}
                  title="Download complete attendance in Excel (.xlsx) format"
                >
                  <Icon name="download" size={15} />
                  Export Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportAttendance("csv")}
                  title="Download attendance in CSV format"
                >
                  <Icon name="download" size={15} />
                  Export CSV
                </button>
                <button
                  className="primary-button"
                  onClick={onImport}
                  disabled={locked}
                >
                  Import attendance
                </button>
              </>
            ) : (
              <span className="access-mode-note">
                <Icon name="eye" size={15} />
                View only
              </span>
            )}
          </div>
        </div>
        <div className="status-legend attendance-legend">
          {Object.entries(statusMeta).map(([code, meta]) => (
            <span key={code}>
              <i className={meta.className}>{code}</i>
              {meta.label}
            </span>
          ))}
        </div>
        <div className="table-scroll">
          <table className="data-table attendance-table">
            <thead>
              <tr>
                <th className="sticky-col" rowSpan={2} style={{ verticalAlign: "middle" }}>Employee</th>
                {dates.map((date) => (
                  <th
                    key={date}
                    colSpan={2}
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #cbd5e1",
                      padding: "4px 6px",
                      background: "#f8fafc",
                    }}
                  >
                    <strong>
                      {new Date(`${date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short" },
                      )}
                    </strong>
                    <small style={{ display: "block", fontSize: "10px", color: "#64748b" }}>
                      {new Date(`${date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { weekday: "short" },
                      )}
                    </small>
                  </th>
                ))}
                <th rowSpan={2} style={{ verticalAlign: "middle", textAlign: "center" }}>Monthly summary</th>
              </tr>
              <tr>
                {dates.map((date) => (
                  <Fragment key={`${date}-sub`}>
                    <th
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "3px 4px",
                        textAlign: "center",
                        background: "#f1f5f9",
                        color: "#475569",
                        minWidth: "34px",
                        borderRight: "1px solid #e2e8f0",
                      }}
                      title="Attendance Status"
                    >
                      Att
                    </th>
                    <th
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "3px 4px",
                        textAlign: "center",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        minWidth: "28px",
                        borderRight: "1px solid #cbd5e1",
                      }}
                      title="Overtime Hours"
                    >
                      OT
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.map((employee) => {
                const item = itemByEmployeeId.get(employee.id);
                const isResigned =
                  employee.status !== "active" || Boolean(employee.dateOfLeaving);
                const live = liveAttendanceByEmpId.get(employee.id) ?? { present: 0, absent: 0, leave: 0, hp: 0, ot: 0 };
                const effectivePresent = item && item.presentDays > 0 ? item.presentDays : live.present;
                const effectiveAbsent = item && item.absentDays > 0 ? item.absentDays : live.absent;
                const effectiveLeave = item && item.leaveDays > 0 ? item.leaveDays : live.leave;
                return (
                  <tr key={employee.id}>
                    <td className="sticky-col">
                      <EmployeeCell
                        name={employee.name}
                        code={employee.employeeCode}
                        detail={
                          isResigned
                            ? `${employee.department} · Resigned`
                            : employee.department
                        }
                      />
                    </td>
                    {dates.map((date) => {
                      const entry = entryMap.get(`${employee.id}:${date}`);
                      return (
                        <Fragment key={date}>
                          <td style={{ padding: "4px 2px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                            <button
                              className="attendance-edit"
                              disabled={locked}
                              title={`${employee.name} · ${date}`}
                              onClick={() => onEdit(employee, date, entry)}
                              style={{ width: "100%", minWidth: "32px", padding: "3px 2px" }}
                            >
                              {entry ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <b
                                    className={
                                      statusMeta[entry.statusCode]?.className ??
                                      ""
                                    }
                                  >
                                    {entry.statusCode}
                                  </b>
                                  <span style={{ fontSize: "8.5px", color: "#64748b", lineHeight: 1, marginTop: "2px" }}>
                                    {entry.shiftCode.replace(" Shift", "")}
                                  </span>
                                </div>
                              ) : (
                                <span className="missing-mark">+</span>
                              )}
                            </button>
                          </td>
                          <td
                            style={{
                              padding: "4px 2px",
                              textAlign: "center",
                              background: entry?.overtimeHours ? "#eff6ff" : undefined,
                              borderRight: "1px solid #e2e8f0",
                            }}
                          >
                            <button
                              className="attendance-edit"
                              disabled={locked}
                              title={`${employee.name} · ${date} OT: ${entry?.overtimeHours || 0}h`}
                              onClick={() => onEdit(employee, date, entry)}
                              style={{ width: "100%", minWidth: "28px", padding: "3px 2px" }}
                            >
                              {entry?.overtimeHours ? (
                                <strong style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 800 }}>
                                  {entry.overtimeHours}
                                </strong>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>-</span>
                              )}
                            </button>
                          </td>
                        </Fragment>
                      );
                    })}
                    <td>
                      <div className="attendance-summary">
                        <strong>
                          {effectivePresent} P
                        </strong>
                        <span>
                          {effectiveAbsent} A · {effectiveLeave} L
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                <td className="sticky-col" style={{ background: "#f8fafc !important", padding: "8px 10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <strong style={{ fontSize: "11px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <BarChart3 size={13} /> Daily Summary
                    </strong>
                    <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 500 }}>Click date to view lists</span>
                  </div>
                </td>
                {dates.map((date) => {
                  const dayData = getDayBreakdown(date);
                  return (
                    <td key={date} colSpan={2} style={{ padding: "4px 2px", textAlign: "center", borderRight: "1px solid #cbd5e1" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDayBreakdown(date)}
                        title={`Click to view Present (${dayData.presentCount}) & Absent (${dayData.absentCount}) for ${formatDisplayDate(date)}`}
                        style={{
                          width: "100%",
                          minWidth: "48px",
                          padding: "4px 2px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: dayData.presentCount > 0 ? "#ecfdf5" : "#f8fafc",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "1px",
                        }}
                      >
                        <span style={{ fontSize: "10px", fontWeight: 800, color: "#166534" }}>
                          {dayData.presentCount} P
                        </span>
                        <span style={{ fontSize: "8.5px", fontWeight: 700, color: dayData.absentCount > 0 ? "#dc2626" : "#64748b" }}>
                          {dayData.absentCount} A
                        </span>
                      </button>
                    </td>
                  );
                })}
                <td style={{ padding: "8px 10px", textAlign: "left" }}>
                  <strong style={{ fontSize: "11px", color: "#0f172a" }}>{employees.length} Total</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          totalItems={employees.length}
          pageSize={20}
          onPageChange={setPage}
        />
        {!employees.length ? (
          <EmptyState
            icon="users"
            title="No employees yet"
            detail="Add employees or import the Attendance Input workbook to begin."
          />
        ) : null}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">HR follow-up</span>
              <h2>Continuous absent / leave</h2>
            </div>
          </div>
          {followups.length ? (
            <div className="compact-list">
              {followups.map((item) => {
                const emp = employees.find(
                  (e) => e.id === item.employeeId || e.employeeCode === item.employeeCode,
                );
                const mobile = emp?.mobileNumber || emp?.emergencyContactNumber;
                return (
                  <div key={item.id}>
                    <EmployeeCell
                      name={item.employeeName}
                      code={item.employeeCode}
                      detail={item.department}
                      phone={mobile}
                    />
                    {mobile ? (
                      <a
                        href={`tel:${mobile}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 9px",
                          borderRadius: "6px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          fontSize: "11px",
                          fontWeight: 700,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                        title={`Call ${item.employeeName}: ${mobile}`}
                      >
                        <Phone size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 3 }} />
                        {mobile}
                      </a>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", whiteSpace: "nowrap" }}>
                        No mobile
                      </span>
                    )}
                    <span>
                      <b>{item.absentDays} A</b>
                      <b>{item.leaveDays} L</b>
                    </span>
                    <StatusPill
                      status={item.absentDays >= 3 ? "High" : "Follow-up"}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="check"
              title="No follow-ups"
              detail="No continuous absent or leave streaks exceed the threshold."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">High attendance</span>
              <h2>Maximum working days</h2>
            </div>
          </div>
          <div className="rank-list">
            {[...items]
              .sort((a, b) => b.presentDays - a.presentDays)
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.id}>
                  <span>{index + 1}</span>
                  <EmployeeCell
                    name={item.employeeName}
                    code={item.employeeCode}
                    detail={item.department}
                  />
                  <strong>
                    {item.presentDays + item.holidayPresentDays}
                    <small>worked</small>
                  </strong>
                </div>
              ))}
          </div>
        </section>
      </div>

      {selectedDayBreakdown ? (
        <DayAttendanceBreakdownModal
          date={selectedDayBreakdown}
          employees={employees}
          entryMap={entryMap}
          statusMeta={statusMeta}
          onClose={() => setSelectedDayBreakdown(null)}
          onEdit={onEdit}
          locked={locked}
        />
      ) : null}
    </div>
  );
}

function DayAttendanceBreakdownModal({
  date,
  employees,
  entryMap,
  statusMeta,
  onClose,
  onEdit,
  locked,
}: {
  date: string;
  employees: Employee[];
  entryMap: Map<string, AttendanceEntry>;
  statusMeta: Record<string, { label: string; className: string }>;
  onClose: () => void;
  onEdit?: (employee: Employee, date: string, entry?: AttendanceEntry) => void;
  locked?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"present" | "absent" | "all">("present");
  const [search, setSearch] = useState("");

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { presentList, absentList, offList } = useMemo(() => {
    const present: Array<{ employee: Employee; entry?: AttendanceEntry }> = [];
    const absent: Array<{ employee: Employee; entry?: AttendanceEntry }> = [];
    const off: Array<{ employee: Employee; entry?: AttendanceEntry }> = [];

    for (const employee of employees) {
      const entry = entryMap.get(`${employee.id}:${date}`);
      const code = entry?.statusCode ?? "A";
      if (code === "P" || code === "HP" || code === "CO") {
        present.push({ employee, entry });
      } else if (code === "HD") {
        present.push({ employee, entry });
        absent.push({ employee, entry });
      } else if (code === "A" || code === "L") {
        absent.push({ employee, entry });
      } else if (code === "WO" || code === "H") {
        off.push({ employee, entry });
      } else {
        absent.push({ employee, entry });
      }
    }
    return { presentList: present, absentList: absent, offList: off };
  }, [employees, entryMap, date]);

  const activeList = useMemo(() => {
    const list = activeTab === "present" ? presentList : activeTab === "absent" ? absentList : [...presentList, ...absentList.filter(a => !presentList.some(p => p.employee.id === a.employee.id)), ...offList];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ employee }) =>
      employee.name.toLowerCase().includes(q) ||
      (employee.employeeCode || "").toLowerCase().includes(q) ||
      (employee.department || "").toLowerCase().includes(q)
    );
  }, [activeTab, presentList, absentList, offList, search]);

  const handleExport = (format: "xlsx" | "csv" = "xlsx") => {
    const rows = [
      ["Employee Code", "Employee Name", "Department", "Attendance Status", "Shift", "In Time", "Out Time", "Overtime Hours"],
      ...activeList.map(({ employee, entry }) => [
        employee.employeeCode,
        employee.name,
        employee.department || "",
        entry ? `${entry.statusCode} - ${statusMeta[entry.statusCode]?.label || entry.statusCode}` : "Absent",
        entry?.shiftCode || employee.defaultShift || "",
        entry?.punchIn || "",
        entry?.punchOut || "",
        entry?.overtimeHours || 0,
      ]),
    ];
    if (format === "xlsx") {
      downloadXlsx(`attendance-breakdown-${date}-${activeTab}.xlsx`, rows, "Attendance Breakdown");
    } else {
      downloadCsv(`attendance-breakdown-${date}-${activeTab}.csv`, rows);
    }
  };

  return (
    <div className="modal-layer action-modal-layer">
      <button type="button" className="modal-scrim" onClick={onClose} aria-label="Close modal" />
      <div
        className="action-modal action-modal-wide"
        style={{
          maxWidth: "920px",
          width: "min(920px, calc(100vw - 32px))",
          maxHeight: "min(90vh, 850px)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 75px rgba(8, 21, 37, 0.45)",
          background: "#ffffff",
          zIndex: 101,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="action-modal-header"
          style={{
            padding: "16px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#059669" }}>
              Daily Attendance Breakdown
            </span>
            <h2 style={{ margin: "2px 0 0", fontSize: "19px", fontWeight: 800, color: "#0f172a" }}>
              {formattedDate}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            title="Close"
            style={{
              border: "1px solid #cbd5e1",
              background: "#f1f5f9",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="action-modal-body" style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
          {/* KPI Counter summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            <div
              onClick={() => setActiveTab("present")}
              style={{
                background: activeTab === "present" ? "#d1fae5" : "#ecfdf5",
                border: activeTab === "present" ? "2px solid #059669" : "1px solid #a7f3d0",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Check size={13} /> Present Employees
              </span>
              <strong style={{ display: "block", fontSize: "22px", fontWeight: 800, color: "#047857", marginTop: "2px" }}>{presentList.length}</strong>
            </div>
            <div
              onClick={() => setActiveTab("absent")}
              style={{
                background: activeTab === "absent" ? "#fee2e2" : "#fef2f2",
                border: activeTab === "absent" ? "2px solid #dc2626" : "1px solid #fecaca",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#991b1b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <X size={13} /> Absent Employees
              </span>
              <strong style={{ display: "block", fontSize: "22px", fontWeight: 800, color: "#b91c1c", marginTop: "2px" }}>{absentList.length}</strong>
            </div>
            <div
              onClick={() => setActiveTab("all")}
              style={{
                background: activeTab === "all" ? "#e2e8f0" : "#f8fafc",
                border: activeTab === "all" ? "2px solid #475569" : "1px solid #e2e8f0",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CalendarOff size={13} /> Week Off / Holiday
              </span>
              <strong style={{ display: "block", fontSize: "22px", fontWeight: 800, color: "#334155", marginTop: "2px" }}>{offList.length}</strong>
            </div>
          </div>

          {/* Category Tabs & Search & Export */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("present")}
                style={{
                  padding: "7px 15px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  border: "none",
                  background: activeTab === "present" ? "#047857" : "#f1f5f9",
                  color: activeTab === "present" ? "#ffffff" : "#334155",
                  boxShadow: activeTab === "present" ? "0 2px 6px rgba(4, 120, 87, 0.25)" : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={13} /> Present ({presentList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("absent")}
                style={{
                  padding: "7px 15px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  border: "none",
                  background: activeTab === "absent" ? "#b91c1c" : "#f1f5f9",
                  color: activeTab === "absent" ? "#ffffff" : "#334155",
                  boxShadow: activeTab === "absent" ? "0 2px 6px rgba(185, 28, 28, 0.25)" : "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <X size={13} /> Absent ({absentList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                style={{
                  padding: "7px 15px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  border: "none",
                  background: activeTab === "all" ? "#1e293b" : "#f1f5f9",
                  color: activeTab === "all" ? "#ffffff" : "#334155",
                  boxShadow: activeTab === "all" ? "0 2px 6px rgba(30, 41, 59, 0.25)" : "none",
                }}
              >
                All Roster ({employees.length})
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="search"
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", minWidth: "220px" }}
              />
              <button
                type="button"
                onClick={() => handleExport("xlsx")}
                className="secondary-button"
                style={{ padding: "7px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Download breakdown in Excel format"
              >
                <Download size={13} /> Export Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="secondary-button"
                style={{ padding: "7px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Download breakdown in CSV format"
              >
                <Download size={13} /> CSV
              </button>
            </div>
          </div>

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", flex: "1 1 auto", border: "1px solid #e2e8f0", borderRadius: "10px", maxHeight: "380px" }}>
            <table className="data-table" style={{ width: "100%", fontSize: "12px", textAlign: "left", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 2 }}>
                <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "9px 12px" }}>#</th>
                  <th style={{ padding: "9px 12px" }}>Emp Code</th>
                  <th style={{ padding: "9px 12px" }}>Employee Name</th>
                  <th style={{ padding: "9px 12px" }}>Department</th>
                  <th style={{ padding: "9px 12px" }}>Status</th>
                  <th style={{ padding: "9px 12px" }}>Shift / Time</th>
                  {!locked && onEdit && <th style={{ padding: "9px 12px" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                      No employees found matching this category or search filter.
                    </td>
                  </tr>
                ) : (
                  activeList.map(({ employee, entry }, idx) => {
                    const code = entry?.statusCode ?? "A";
                    const meta = statusMeta[code] ?? { label: "Absent", className: "status-absent" };
                    return (
                      <tr key={employee.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "9px 12px", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>{employee.employeeCode}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0f172a" }}>{employee.name}</td>
                        <td style={{ padding: "9px 12px", color: "#475569" }}>{employee.department || "General"}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span className={meta.className} style={{ display: "inline-block", padding: "3px 9px", borderRadius: "6px", fontWeight: 800, fontSize: "11px" }}>
                            {code} — {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", color: "#64748b", fontSize: "11px" }}>
                          {entry?.shiftCode || employee.defaultShift || "General"}
                          {entry?.punchIn && ` (${entry.punchIn} - ${entry.punchOut || ""})`}
                          {entry?.overtimeHours ? ` · +${entry.overtimeHours}h OT` : ""}
                        </td>
                        {!locked && onEdit && (
                          <td style={{ padding: "9px 12px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEdit(employee, date, entry);
                              }}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "#1e293b",
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="action-modal-footer"
          style={{
            padding: "12px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Showing <strong>{activeList.length}</strong> of <strong>{employees.length}</strong> total employees
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            style={{ padding: "7px 18px", fontSize: "12px", fontWeight: 700 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function getEmployeeReferralInfo(
  employee: Employee,
  appUsers: AppUserProfile[] = [],
  allEmployees: Employee[] = [],
) {
  let refName = "";
  let refCode = "";
  let refId = "";
  let refPhone = "";

  try {
    const data = JSON.parse(employee.applicationJson || "{}");
    if (data && typeof data === "object") {
      refName =
        data["Reference 1 - Name"] ||
        data["Referred by"] ||
        data["Referred By"] ||
        data["Reference 2 - Name"] ||
        "";
      refCode = data["Reference 1 - Employee Code"] || "";
      refId = data["Reference 1 - Employee ID"] || "";
      refPhone =
        data["Reference 1 - Phone No"] || data["Reference 2 - Phone No"] || "";
    }
  } catch { }

  // Match with appUsers (Internal HR / Admins, excluding external vendors)
  const matchedUser = appUsers.find(
    (u) =>
      u.role !== "vendor" &&
      !u.department?.toLowerCase().startsWith("vendor") &&
      !u.department?.toLowerCase().includes("vendor:") &&
      ((refId && u.id === refId) ||
        (refCode &&
          u.employeeCode &&
          u.employeeCode.toLowerCase() === refCode.toLowerCase()) ||
        (refName &&
          u.fullName &&
          u.fullName.toLowerCase() === refName.toLowerCase())),
  );

  // Match with direct/all employees if not found in appUsers
  const matchedEmployee =
    !matchedUser && allEmployees.length
      ? allEmployees.find(
        (e) =>
          (refId && e.id === refId) ||
          (refCode &&
            e.employeeCode &&
            e.employeeCode.toLowerCase() === refCode.toLowerCase()) ||
          (refName &&
            e.name &&
            e.name.toLowerCase() === refName.toLowerCase()),
      )
      : undefined;

  const displayName = matchedUser?.fullName || matchedEmployee?.name || refName;
  const displayCode =
    matchedUser?.employeeCode || matchedEmployee?.employeeCode || refCode;
  const displayRole = matchedUser
    ? readableField(matchedUser.role)
    : matchedEmployee?.employmentType === "direct"
      ? "Direct Staff"
      : matchedEmployee
        ? "Employee"
        : refName
          ? "Referrer"
          : null;

  return {
    hasReferral: Boolean(displayName),
    name: displayName,
    code: displayCode,
    role: displayRole,
    phone:
      refPhone ||
      matchedUser?.mobileNumber ||
      matchedEmployee?.mobileNumber ||
      "",
  };
}

function EmployeesView({
  loadApplicationDocuments,
  applicationDocuments = [],
  onInvite,
  employees,
  vendors,
  units,
  appUsers = [],
  canManage,
  isSuperAdmin = false,
  onReviewDocument,
  onReviewAllDocuments,
  onReuploadDocument,
  onAdd,
  onEdit,
  onImport,
  onLeft,
  onReactivate,
  onWorkflow,
  onDelete,
}: {
  loadApplicationDocuments: ApplicationRequest;
  applicationDocuments?: ApplicationDocumentSummary[];
  onInvite: (employee?: Employee) => void;
  employees: Employee[];
  vendors: Vendor[];
  units: ClientUnit[];
  appUsers?: AppUserProfile[];
  canManage: boolean;
  isSuperAdmin?: boolean;
  onReviewDocument?: (employeeId: string, category: string, decision: "approve" | "reject", rejectionReason?: string) => Promise<ApplicationDocument[]>;
  onReviewAllDocuments?: (employeeId: string, decision: "approve" | "reject", rejectionReason?: string) => Promise<ApplicationDocument[]>;
  onReuploadDocument?: (employeeId: string, category: string, filename: string, dataUrl: string) => Promise<ApplicationDocument[]>;
  onAdd: () => void;
  onEdit: (employee: Employee) => void;
  onImport: () => void;
  onLeft: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  onWorkflow: (employee: Employee) => void;
  onDelete: (employeeIds: string[]) => Promise<boolean | void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cardFilter, setCardFilter] = useState<
    "all" | "active" | "ready" | "statutory_pending" | "bank_pending" | "aadhaar_pending" | "passbook_pending" | "room_allocated"
  >("all");
  const [cardEmployee, setCardEmployee] = useState<Employee | null>(null);
  const [applicationEmployee, setApplicationEmployee] = useState<Employee | "blank" | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeePage, setEmployeePage] = useState(1);
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active",
  );
  const ready = activeEmployees.filter(
    (employee) => employee.complianceStatus === "ready",
  ).length;

  const aadhaarPendingCount = activeEmployees.filter((employee) => {
    const docs = applicationDocuments.filter((d) => d.employeeId === employee.id);
    const hasFront = docs.some((d) => d.category === "Aadhar Front side");
    const hasBack = docs.some((d) => d.category === "Aadhar Back side");
    return !hasFront || !hasBack;
  }).length;

  const passbookPendingCount = activeEmployees.filter((employee) => {
    const docs = applicationDocuments.filter((d) => d.employeeId === employee.id);
    return !docs.some((d) => d.category === "Bank Proofs");
  }).length;

  useEffect(() => {
    setEmployeePage(1);
  }, [query, statusFilter, cardFilter]);
  const visible = employees.filter((employee) => {
    const ref = getEmployeeReferralInfo(employee, appUsers, employees);
    const matchesQuery = `${employee.employeeCode} ${employee.name} ${employee.department} ${ref.name} ${ref.code}`
      .toLowerCase()
      .includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (cardFilter === "ready") {
      return employee.status === "active" && employee.complianceStatus === "ready";
    }
    if (cardFilter === "statutory_pending") {
      const isPfPending =
        employee.pfApplicable === 1 &&
        (!employee.uanMasked ||
          !employee.uanMasked.trim() ||
          employee.uanMasked.trim().toUpperCase() === "NIL");
      const isEsiPending =
        employee.esiApplicable === 1 &&
        (!employee.esiMasked ||
          !employee.esiMasked.trim() ||
          employee.esiMasked.trim().toUpperCase() === "NIL");
      return employee.status === "active" && (isPfPending || isEsiPending);
    }
    if (cardFilter === "bank_pending") {
      return (
        employee.status === "active" &&
        (!employee.bankAccountMasked || !employee.ifscMasked)
      );
    }
    if (cardFilter === "aadhaar_pending") {
      const docs = applicationDocuments.filter((d) => d.employeeId === employee.id);
      const hasFront = docs.some((d) => d.category === "Aadhar Front side");
      const hasBack = docs.some((d) => d.category === "Aadhar Back side");
      return employee.status === "active" && (!hasFront || !hasBack);
    }
    if (cardFilter === "passbook_pending") {
      const docs = applicationDocuments.filter((d) => d.employeeId === employee.id);
      return employee.status === "active" && !docs.some((d) => d.category === "Bank Proofs");
    }
    if (cardFilter === "room_allocated") {
      return employee.status === "active" && Boolean(employee.roomId);
    }
    if (cardFilter === "active") {
      return employee.status === "active";
    }

    return statusFilter === "all" || employee.status === statusFilter;
  });

  type EmployeeSortKey =
    | "employee"
    | "type"
    | "salary"
    | "compliance"
    | "workflow"
    | "referredBy"
    | "status";
  const [sortKey, setSortKey] = useState<EmployeeSortKey>("employee");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  function toggleSort(key: EmployeeSortKey) {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  const sortedVisible = [...visible].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "employee") {
      cmp =
        (a.name || "").localeCompare(b.name || "") ||
        (a.employeeCode || "").localeCompare(b.employeeCode || "");
    } else if (sortKey === "type") {
      cmp = (a.dateOfJoining || "").localeCompare(b.dateOfJoining || "");
    } else if (sortKey === "salary") {
      cmp = (a.salaryAmount || 0) - (b.salaryAmount || 0);
    } else if (sortKey === "compliance") {
      cmp = (a.complianceStatus || "").localeCompare(b.complianceStatus || "");
    } else if (sortKey === "workflow") {
      cmp = (a.processingStage || "").localeCompare(b.processingStage || "");
    } else if (sortKey === "referredBy") {
      const refA = getEmployeeReferralInfo(a, appUsers, employees).name || "";
      const refB = getEmployeeReferralInfo(b, appUsers, employees).name || "";
      cmp = refA.localeCompare(refB);
    } else if (sortKey === "status") {
      cmp = (a.status || "").localeCompare(b.status || "");
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const paginatedVisible = sortedVisible.slice(
    (employeePage - 1) * 20,
    employeePage * 20,
  );

  // Left & Relieved Employees
  const leftEmployees = employees.filter(
    (e) => e.status === "inactive" || Boolean(e.dateOfLeaving),
  );
  const visibleLeftEmployees = leftEmployees.filter((employee) => {
    return `${employee.employeeCode} ${employee.name} ${employee.department}`
      .toLowerCase()
      .includes(query.toLowerCase());
  });

  type LeftSortKey =
    | "employee"
    | "unit"
    | "joined"
    | "left"
    | "tenure"
    | "salary"
    | "compliance";
  const [leftSortKey, setLeftSortKey] = useState<LeftSortKey>("left");
  const [leftSortOrder, setLeftSortOrder] = useState<"asc" | "desc">("desc");
  const [leftEmployeePage, setLeftEmployeePage] = useState(1);

  function toggleLeftSort(key: LeftSortKey) {
    if (leftSortKey === key) {
      setLeftSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setLeftSortKey(key);
      setLeftSortOrder("asc");
    }
  }

  function getTenureDays(joining: string, leaving?: string | null) {
    if (!joining) return 0;
    const start = new Date(`${joining}T00:00:00Z`).getTime();
    const end = leaving
      ? new Date(`${leaving}T00:00:00Z`).getTime()
      : Date.now();
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  }

  function getTenureLabel(joining: string, leaving?: string | null) {
    if (!joining) return "—";
    const totalDays = getTenureDays(joining, leaving);
    const months = Math.floor(totalDays / 30.4);
    if (months < 1) return `${totalDays} days`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (years === 0) return `${months} mos (${totalDays}d)`;
    return `${years} yr ${remMonths} mo (${totalDays}d)`;
  }

  const sortedLeftEmployees = [...visibleLeftEmployees].sort((a, b) => {
    let cmp = 0;
    if (leftSortKey === "employee") {
      cmp =
        (a.name || "").localeCompare(b.name || "") ||
        (a.employeeCode || "").localeCompare(b.employeeCode || "");
    } else if (leftSortKey === "unit") {
      const uA = units.find((u) => u.id === a.clientUnitId)?.unitName || "";
      const uB = units.find((u) => u.id === b.clientUnitId)?.unitName || "";
      cmp = uA.localeCompare(uB);
    } else if (leftSortKey === "joined") {
      cmp = (a.dateOfJoining || "").localeCompare(b.dateOfJoining || "");
    } else if (leftSortKey === "left") {
      cmp = (a.dateOfLeaving || "").localeCompare(b.dateOfLeaving || "");
    } else if (leftSortKey === "tenure") {
      cmp =
        getTenureDays(a.dateOfJoining, a.dateOfLeaving) -
        getTenureDays(b.dateOfJoining, b.dateOfLeaving);
    } else if (leftSortKey === "salary") {
      cmp = (a.salaryAmount || 0) - (b.salaryAmount || 0);
    } else if (leftSortKey === "compliance") {
      cmp = (a.complianceStatus || "").localeCompare(b.complianceStatus || "");
    }
    return leftSortOrder === "asc" ? cmp : -cmp;
  });

  const paginatedLeftEmployees = sortedLeftEmployees.slice(
    (leftEmployeePage - 1) * 20,
    leftEmployeePage * 20,
  );

  function exportLeftEmployees(format: "xlsx" | "csv" = "xlsx") {
    const rows = [
      [
        "Emp ID",
        "Name",
        "Department",
        "Client / Unit",
        "Date of Joining",
        "Date of Leaving",
        "Tenure Days",
        "Tenure",
        "Salary Amount",
        "Salary Basis",
        "UAN",
        "ESI",
        "Bank Account",
        "IFSC",
        "Status",
      ],
      ...sortedLeftEmployees.map((emp) => {
        const u = units.find((unit) => unit.id === emp.clientUnitId);
        return [
          emp.employeeCode,
          emp.name,
          emp.department,
          u ? `${u.clientName} · ${u.unitName}` : "",
          formatDisplayDate(emp.dateOfJoining),
          formatDisplayDate(emp.dateOfLeaving) ?? "",
          getTenureDays(emp.dateOfJoining, emp.dateOfLeaving),
          getTenureLabel(emp.dateOfJoining, emp.dateOfLeaving),
          emp.salaryAmount,
          emp.salaryBasis,
          emp.uanMasked ?? "",
          emp.esiMasked ?? "",
          emp.bankAccountMasked ?? "",
          emp.ifscMasked ?? "",
          emp.status,
        ];
      }),
    ];
    if (format === "xlsx") {
      downloadXlsx("left-employees-archive.xlsx", rows, "Left Employees");
    } else {
      downloadCsv("left-employees-archive.csv", rows);
    }
  }

  const isAllSelected =
    visible.length > 0 && visible.every((e) => selectedEmployeeIds.includes(e.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedEmployeeIds((prev) =>
        prev.filter((id) => !visible.some((e) => e.id === id)),
      );
    } else {
      setSelectedEmployeeIds((prev) => [
        ...new Set([...prev, ...visible.map((e) => e.id)]),
      ]);
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function exportEmployees(format: "csv" | "xlsx" = "csv") {
    const rows = [
      [
        "Emp ID",
        "Name",
        "Department",
        "Date of Joining",
        "Referred By",
        "Referrer Code",
        "UAN",
        "ESI",
        "Bank Account",
        "IFSC",
        "Bank Name",
        "Accommodation Type",
        "Room",
        "Payment Mode",
        "Salary Amount",
        "Salary Basis",
        "Default Shift",
        "Readiness",
        "Status",
      ],
      ...visible.map((employee) => {
        const ref = getEmployeeReferralInfo(employee, appUsers, employees);
        return [
          employee.employeeCode,
          employee.name,
          employee.department,
          employee.dateOfJoining,
          ref.name || "Direct / None",
          ref.code || "",
          employee.uanMasked ?? "",
          employee.esiMasked ?? "",
          employee.bankAccountMasked ?? "",
          employee.ifscMasked ?? "",
          employee.bankName ?? "",
          employee.accommodationType,
          employee.roomNumber ?? "",
          employee.paymentMode,
          employee.salaryAmount,
          employee.salaryBasis,
          employee.defaultShift,
          employee.complianceStatus,
          employee.status,
        ];
      }),
    ];
    if (format === "xlsx") {
      downloadXlsx("employee-master.xlsx", rows, "Employee Master");
    } else {
      downloadCsv("employee-master.csv", rows);
    }
  }
  function downloadEmployeeImportTemplate() {
    downloadXlsx(
      "employee-master-import-template.xlsx",
      [[...EMPLOYEE_IMPORT_HEADERS]],
      "Employee Master",
    );
  }
  return (
    <div className="section-stack">
      <section className="kpi-grid attendance-kpis">
        <MetricCard
          label="Active employees"
          value={String(activeEmployees.length)}
          note={`${employees.length - activeEmployees.length} left / inactive records`}
          tone="blue"
          icon="users"
          onClick={() => {
            setCardFilter((prev) => (prev === "active" ? "all" : "active"));
            setStatusFilter("active");
          }}
          active={cardFilter === "active"}
        />
        <MetricCard
          label="Payroll ready"
          value={String(ready)}
          note={`${Math.round((ready / Math.max(activeEmployees.length, 1)) * 100)}% complete`}
          tone="green"
          icon="check"
          onClick={() => {
            setCardFilter((prev) => (prev === "ready" ? "all" : "ready"));
            setStatusFilter("active");
          }}
          active={cardFilter === "ready"}
        />
        <MetricCard
          label="Aadhaar doc pending"
          value={String(aadhaarPendingCount)}
          note="Front or Back image missing"
          tone="amber"
          icon="alert"
          onClick={() => {
            setCardFilter((prev) =>
              prev === "aadhaar_pending" ? "all" : "aadhaar_pending",
            );
            setStatusFilter("active");
          }}
          active={cardFilter === "aadhaar_pending"}
        />
        <MetricCard
          label="Bank passbook pending"
          value={String(passbookPendingCount)}
          note="Passbook / Cheque proof missing"
          tone="amber"
          icon="alert"
          onClick={() => {
            setCardFilter((prev) =>
              prev === "passbook_pending" ? "all" : "passbook_pending",
            );
            setStatusFilter("active");
          }}
          active={cardFilter === "passbook_pending"}
        />
        <MetricCard
          label="Statutory pending"
          value={String(
            activeEmployees.filter((employee) => {
              const isPfPending =
                employee.pfApplicable === 1 &&
                (!employee.uanMasked ||
                  !employee.uanMasked.trim() ||
                  employee.uanMasked.trim().toUpperCase() === "NIL");
              const isEsiPending =
                employee.esiApplicable === 1 &&
                (!employee.esiMasked ||
                  !employee.esiMasked.trim() ||
                  employee.esiMasked.trim().toUpperCase() === "NIL");
              return isPfPending || isEsiPending;
            }).length,
          )}
          note="Applicable UAN or ESI missing"
          tone="red"
          icon="alert"
          onClick={() => {
            setCardFilter((prev) =>
              prev === "statutory_pending" ? "all" : "statutory_pending",
            );
            setStatusFilter("active");
          }}
          active={cardFilter === "statutory_pending"}
        />
        <MetricCard
          label="Bank pending"
          value={String(
            activeEmployees.filter(
              (employee) => !employee.bankAccountMasked || !employee.ifscMasked,
            ).length,
          )}
          note="Account number or IFSC missing"
          tone="amber"
          icon="bank"
          onClick={() => {
            setCardFilter((prev) =>
              prev === "bank_pending" ? "all" : "bank_pending",
            );
            setStatusFilter("active");
          }}
          active={cardFilter === "bank_pending"}
        />
        <MetricCard
          label="Room allocated"
          value={String(
            activeEmployees.filter((employee) => employee.roomId).length,
          )}
          note="Employees assigned to rooms"
          tone="violet"
          icon="home"
          onClick={() => {
            setCardFilter((prev) =>
              prev === "room_allocated" ? "all" : "room_allocated",
            );
            setStatusFilter("active");
          }}
          active={cardFilter === "room_allocated"}
        />
      </section>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={17} />
            <input
              aria-label="Search employee master"
              placeholder="Search employee master"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="filter-tabs">
            <button
              className={statusFilter === "all" && cardFilter === "all" ? "filter-active" : ""}
              onClick={() => {
                setStatusFilter("all");
                setCardFilter("all");
              }}
            >
              All
            </button>
            <button
              className={statusFilter === "active" && cardFilter === "active" ? "filter-active" : ""}
              onClick={() => {
                setStatusFilter("active");
                setCardFilter("active");
              }}
            >
              Active
            </button>
            <button
              className={statusFilter === "inactive" ? "filter-active" : ""}
              onClick={() => {
                setStatusFilter("inactive");
                setCardFilter("all");
              }}
            >
              Left
            </button>
          </div>
          {canManage ? (
            <>
              {isSuperAdmin && selectedEmployeeIds.length > 0 ? (
                <button
                  className="danger-button"
                  onClick={async () => {
                    const selectedNames = employees
                      .filter((e) => selectedEmployeeIds.includes(e.id))
                      .map((e) => `${e.name} (${e.employeeCode})`);
                    if (
                      window.confirm(
                        `Permanently delete ${selectedEmployeeIds.length} selected employee(s)?\n\n${selectedNames.slice(0, 10).join("\n")}${selectedNames.length > 10 ? `\n...and ${selectedNames.length - 10} more` : ""}\n\nThis will completely remove their employee profile, attendance, and payroll records from Supabase.`,
                      )
                    ) {
                      await onDelete(selectedEmployeeIds);
                      setSelectedEmployeeIds([]);
                    }
                  }}
                >
                  <Icon name="trash" size={15} />
                  Delete selected ({selectedEmployeeIds.length})
                </button>
              ) : null}
              <button className="secondary-button" onClick={() => exportEmployees("xlsx")}>
                Export Excel (.xlsx)
              </button>
              <button className="secondary-button" onClick={() => exportEmployees("csv")}>
                Export CSV
              </button>
              <button className="secondary-button" onClick={onImport}>
                Import Excel
              </button>
              <button
                className="secondary-button"
                onClick={downloadEmployeeImportTemplate}
              >
                Employee Excel format
              </button>
              <button className="primary-button" onClick={onAdd}>
                + Add employee
              </button>
              <button className="secondary-button" onClick={onAdd}>Create company application</button>
              <button className="primary-button" onClick={() => onInvite()}>Invite onboarding</button>
            </>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {isSuperAdmin && canManage ? (
                  <th style={{ width: "36px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible employees"
                    />
                  </th>
                ) : null}
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("employee")}
                  title="Sort by Employee Name / Code"
                >
                  Employee{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "employee" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "employee" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("type")}
                  title="Sort by Type / Joining Date"
                >
                  Type / dates{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "type" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "type" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("salary")}
                  title="Sort by Salary"
                >
                  Salary{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "salary" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "salary" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th>Compliance</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("workflow")}
                  title="Sort by Workflow Stage"
                >
                  Workflow{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "workflow" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "workflow" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("referredBy")}
                  title="Sort by Referred By"
                >
                  Referred by{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "referredBy" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "referredBy" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleSort("status")}
                  title="Sort by Status"
                >
                  Status{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: sortKey === "status" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {sortKey === "status" ? (sortOrder === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisible.map((employee) => (
                <tr key={employee.id}>
                  {isSuperAdmin && canManage ? (
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => toggleSelectOne(employee.id)}
                        aria-label={`Select ${employee.name}`}
                      />
                    </td>
                  ) : null}
                  <td>
                    <EmployeeCell
                      name={employee.name}
                      code={employee.employeeCode}
                      detail={employee.department}
                    />
                  </td>
                  <td>
                    <strong>
                      {employee.employmentType === "direct"
                        ? "Direct Joy employee"
                        : "Client employee"}
                    </strong>
                    <small>
                      Joined {formatDisplayDate(employee.dateOfJoining)}
                      {employee.dateOfLeaving
                        ? ` · Left ${formatDisplayDate(employee.dateOfLeaving)}`
                        : ""}
                    </small>
                  </td>
                  <td>
                    {money(employee.salaryAmount)}
                    <small>
                      {employee.salaryBasis} · {employee.defaultShift}
                    </small>
                  </td>
                  <td>
                    <FieldState
                      value={getStatutoryDisplayStatus(employee)}
                    />
                    <small>
                      {employee.bankAccountMasked && employee.ifscMasked
                        ? "Bank ready"
                        : "Cash ready"}
                    </small>
                  </td>
                  <td>
                    <StatusPill
                      status={readableField(employee.processingStage)}
                    />
                    {canManage && employee.processingStage !== "approved" ? (
                      <button
                        className="record-action"
                        onClick={() => onWorkflow(employee)}
                      >
                        Finalize next stage
                      </button>
                    ) : null}
                  </td>
                  <td>
                    {(() => {
                      const ref = getEmployeeReferralInfo(employee, appUsers, employees);
                      if (!ref.hasReferral) {
                        return (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                            — Direct / None
                          </span>
                        );
                      }
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "13px", color: "#0f172a" }}>
                              {ref.name}
                            </strong>
                            {ref.code ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                }}
                              >
                                {ref.code}
                              </span>
                            ) : null}
                          </div>
                          {ref.role ? (
                            <small style={{ color: "#64748b", fontSize: "11px" }}>
                              {ref.role}
                            </small>
                          ) : null}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <StatusPill
                      status={employee.status === "active" ? "Active" : "Left"}
                    />
                  </td>
                  <td>
                    <div className="record-actions">
                      <button
                        className="record-action"
                        onClick={() => setCardEmployee(employee)}
                      >
                        ID card + QR
                      </button>
                      <button className="record-action" onClick={() => setApplicationEmployee(employee)}>Application / PDF</button>{canManage ? <button className="record-action" onClick={() => onInvite(employee)}>Invite onboarding</button> : null}
                      <button
                        className="record-action"
                        onClick={() => onEdit(employee)}
                      >
                        Edit
                      </button>
                      {canManage ? (
                        <>
                          {employee.status === "active" ? (
                            <button
                              className="record-action"
                              onClick={() => onLeft(employee)}
                            >
                              Put left date
                            </button>
                          ) : (
                            <button
                              className="record-action"
                              onClick={() => onReactivate(employee)}
                            >
                              Reactivate
                            </button>
                          )}
                          {isSuperAdmin ? (
                            <button
                              className="record-action record-delete"
                              title="Permanently delete employee"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Permanently delete ${employee.name} (${employee.employeeCode})?\n\nThis will completely remove their employee profile, attendance, and payroll records from Supabase.`,
                                  )
                                ) {
                                  await onDelete([employee.id]);
                                  setSelectedEmployeeIds((prev) =>
                                    prev.filter((id) => id !== employee.id),
                                  );
                                }
                              }}
                            >
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={employeePage}
          totalItems={visible.length}
          pageSize={20}
          onPageChange={setEmployeePage}
        />
      </section>

      {/* Dedicated Left & Relieved Employees Section Below */}
      <section className="panel table-panel" style={{ marginTop: "24px" }}>
        <div
          className="panel-heading"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span className="eyebrow" style={{ color: "#e11d48" }}>
              Relieved & Inactive Workforce
            </span>
            <h2 style={{ margin: "2px 0 0" }}>
              Left Employees Archive ({visibleLeftEmployees.length})
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="muted-label">
              {leftEmployees.length} total left records
            </span>
            {canManage && visibleLeftEmployees.length > 0 && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportLeftEmployees("xlsx")}
                  style={{ fontSize: "12px", padding: "4px 10px", minHeight: "30px" }}
                >
                  Export Left Employees Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportLeftEmployees("csv")}
                  style={{ fontSize: "12px", padding: "4px 10px", minHeight: "30px" }}
                >
                  Export Left Employees CSV
                </button>
              </>
            )}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("employee")}
                  title="Sort by Employee Name / Code"
                >
                  Employee{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "employee" ? "#2563eb" : "#94a3b8",
                    }}
                  >
                    {leftSortKey === "employee"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("unit")}
                  title="Sort by Employer Unit"
                >
                  Employer / Unit{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "unit" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {leftSortKey === "unit"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("joined")}
                  title="Sort by Date of Joining"
                >
                  Joined Date{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "joined" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {leftSortKey === "joined"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("left")}
                  title="Sort by Date of Leaving"
                >
                  Left Date{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "left" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {leftSortKey === "left"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("tenure")}
                  title="Sort by Service Duration"
                >
                  Tenure / Service{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "tenure" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {leftSortKey === "tenure"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                  onClick={() => toggleLeftSort("salary")}
                  title="Sort by Last Drawn Salary"
                >
                  Last Salary{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      color: leftSortKey === "salary" ? "#2563eb" : "#94a3b8",
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {leftSortKey === "salary"
                      ? leftSortOrder === "asc"
                        ? <ArrowUp size={11} />
                        : <ArrowDown size={11} />
                      : <ArrowUpDown size={11} />}
                  </span>
                </th>
                <th>Compliance / Docs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeftEmployees.map((employee) => {
                const u = units.find(
                  (unit) => unit.id === employee.clientUnitId,
                );
                const tenure = getTenureLabel(
                  employee.dateOfJoining,
                  employee.dateOfLeaving,
                );
                return (
                  <tr key={employee.id}>
                    <td>
                      <EmployeeCell
                        name={employee.name}
                        code={employee.employeeCode}
                        detail={employee.department}
                      />
                    </td>
                    <td>
                      <strong>{u?.clientName || "—"}</strong>
                      <small>{u?.unitName || "Unassigned"}</small>
                    </td>
                    <td>
                      <span>{formatDisplayDate(employee.dateOfJoining)}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: "#ffe4e6",
                          color: "#be123c",
                          fontWeight: 700,
                          fontSize: "12px",
                          padding: "2px 7px",
                          borderRadius: "5px",
                        }}
                      >
                        {formatDisplayDate(employee.dateOfLeaving) || "Relieved"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          fontWeight: 600,
                          fontSize: "12px",
                          padding: "2px 7px",
                          borderRadius: "5px",
                        }}
                      >
                        {tenure}
                      </span>
                    </td>
                    <td>
                      {money(employee.salaryAmount)}
                      <small>{employee.salaryBasis}</small>
                    </td>
                    <td>
                      <FieldState
                        value={getStatutoryDisplayStatus(employee)}
                      />
                      <small>
                        {employee.bankAccountMasked && employee.ifscMasked
                          ? "Bank ready"
                          : "Cash"}
                      </small>
                    </td>
                    <td>
                      <div className="record-actions">
                        {canManage && (
                          <button
                            type="button"
                            className="record-action"
                            onClick={() => onReactivate(employee)}
                            style={{ fontWeight: 700, color: "#15803d" }}
                            title="Reactivate / Re-hire this employee"
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          type="button"
                          className="record-action"
                          onClick={() => onEdit(employee)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="record-action"
                          onClick={() => setCardEmployee(employee)}
                        >
                          ID card + QR
                        </button>
                        <button
                          type="button"
                          className="record-action"
                          onClick={() => setApplicationEmployee(employee)}
                        >
                          Application / PDF
                        </button>
                        {canManage && isSuperAdmin && (
                          <button
                            type="button"
                            className="record-action record-delete"
                            title="Permanently delete employee"
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Permanently delete left employee ${employee.name} (${employee.employeeCode})?\n\nThis will completely remove their employee profile, attendance, and payroll records from Supabase.`,
                                )
                              ) {
                                await onDelete([employee.id]);
                              }
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleLeftEmployees.length === 0 && (
          <div
            className="enhancement-empty"
            style={{ textAlign: "center", padding: "24px" }}
          >
            No left employees found matching the search query.
          </div>
        )}
        <TablePagination
          currentPage={leftEmployeePage}
          totalItems={visibleLeftEmployees.length}
          pageSize={20}
          onPageChange={setLeftEmployeePage}
        />
      </section>
      {cardEmployee ? (
        <EmployeeIdCard
          employee={cardEmployee}
          vendor={vendors.find((vendor) => vendor.id === cardEmployee.vendorId)}
          unit={units.find((unit) => unit.id === cardEmployee.clientUnitId)}
          onClose={() => setCardEmployee(null)}
        />
      ) : null}
      <button className="secondary-button" onClick={() => setApplicationEmployee("blank")}>Blank application / PDF</button>
      {applicationEmployee && (
        <EmployeeApplicationPreview
          loadDocuments={loadApplicationDocuments}
          employee={applicationEmployee === "blank" ? undefined : applicationEmployee}
          vendor={applicationEmployee === "blank" ? vendors[0] : vendors.find(v => v.id === applicationEmployee.vendorId)}
          onClose={() => setApplicationEmployee(null)}
          isSuperAdmin={isSuperAdmin}
          onReviewDocument={async (category, decision, reason) => {
            if (applicationEmployee && applicationEmployee !== "blank" && onReviewDocument) {
              return await onReviewDocument(applicationEmployee.id, category, decision, reason);
            }
          }}
          onReviewAllDocuments={async (decision, reason) => {
            if (applicationEmployee && applicationEmployee !== "blank" && onReviewAllDocuments) {
              return await onReviewAllDocuments(applicationEmployee.id, decision, reason);
            }
          }}
          onReuploadDocument={async (category, filename, dataUrl) => {
            if (applicationEmployee && applicationEmployee !== "blank" && onReuploadDocument) {
              return await onReuploadDocument(applicationEmployee.id, category, filename, dataUrl);
            }
          }}
        />
      )}
    </div>
  );
}

function EmployeeIdCard({
  employee,
  vendor,
  unit,
  onClose,
}: {
  employee: Employee;
  vendor?: Vendor;
  unit?: ClientUnit;
  onClose: () => void;
}) {
  return (
    <EnhancedEmployeeIdCard
      employee={employee}
      vendor={vendor}
      unit={unit}
      onClose={onClose}
    />
  );
}

function AccommodationView({
  types,
  items,
  employees,
  charges,
  units,
  vendors,
  canManage,
  onAdd,
  onEdit,
  locked,
}: {
  types: AccommodationType[];
  items: PayrollItem[];
  employees: Employee[];
  charges: AccommodationCharge[];
  units?: ClientUnit[];
  vendors?: Vendor[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (employee: Employee, charge: AccommodationCharge) => void;
  locked: boolean;
}) {
  const [clientFilter, setClientFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const roomTypes = types.map(({ name: type }) => ({
    type,
    people: employees.filter((employee) => employee.accommodationType === type),
    items: items.filter((item) => item.accommodationType === type),
  }));
  const rooms = Array.from(
    new Set(charges.map((charge) => charge.roomNumber).filter(Boolean)),
  ) as string[];

  const availableUnits = useMemo(() => {
    if (units && units.length > 0) {
      return units
        .filter((u) => u.status === "active")
        .map((u) => ({
          id: u.id,
          label: u.clientName && u.unitName ? `${u.clientName} · ${u.unitName}` : u.clientName || u.unitName || u.id,
        }));
    }
    const unitIds = new Set(employees.map((e) => e.clientUnitId).filter(Boolean));
    return Array.from(unitIds).map((id) => ({
      id,
      label: id,
    }));
  }, [units, employees]);

  const filteredCharges = useMemo(() => {
    return charges.filter((charge) => {
      const employee = employees.find((row) => row.id === charge.employeeId);

      // Client-wise filter (Arjuna naturals, Dynamic, Repose, etc.)
      if (clientFilter !== "all" && employee?.clientUnitId !== clientFilter) {
        return false;
      }

      // Room-wise filter
      if (roomFilter !== "all" && charge.roomNumber !== roomFilter) {
        return false;
      }

      // Search query (name, code, department, room)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = employee?.name?.toLowerCase().includes(q);
        const matchCode = employee?.employeeCode?.toLowerCase().includes(q);
        const matchDept = employee?.department?.toLowerCase().includes(q);
        const matchRoom = charge.roomNumber?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [charges, employees, clientFilter, roomFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [clientFilter, roomFilter, searchQuery]);

  const paginatedCharges = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCharges.slice(start, start + pageSize);
  }, [filteredCharges, page, pageSize]);

  function exportAccommodation(format: "xlsx" | "csv" = "xlsx") {
    const listToExport = filteredCharges.length ? filteredCharges : charges;
    const rows = [
      [
        "Emp ID",
        "Employee",
        "Accommodation Type",
        "Room",
        "ID Card",
        "Rent",
        "Bus",
        "Medical",
        "Ticket",
        "Shoe",
        "Advance",
        "Food",
        "Aadhaar Update",
        "Bank Account Charge",
        "T-Shirt",
        "Old Pending",
        "Gas Share",
        "Ration Share",
        "Provision Share",
        "Return Amount",
        "Final Net Pay",
      ],
      ...listToExport.map((charge) => {
        const employee = employees.find((row) => row.id === charge.employeeId);
        const item = items.find((row) => row.employeeId === charge.employeeId);
        return [
          employee?.employeeCode ?? "",
          employee?.name ?? "",
          employee?.accommodationType ?? "",
          charge.roomNumber ?? "",
          charge.idCard,
          charge.rent,
          charge.bus,
          charge.medical,
          charge.ticket,
          charge.shoe,
          charge.advance,
          charge.food,
          charge.aadhaarUpdate,
          charge.bankAccountCharge,
          charge.tshirt,
          charge.oldPending,
          charge.gasShare,
          charge.rationShare,
          charge.provisionShare,
          charge.returnAmount,
          item?.netPayable ?? 0,
        ];
      }),
    ];
    if (format === "xlsx") {
      downloadXlsx(
        "accommodation-deduction-register.xlsx",
        rows,
        "Accommodation Deductions",
      );
    } else {
      downloadCsv("accommodation-deduction-register.csv", rows);
    }
  }
  return (
    <div className="section-stack">
      <section className="accommodation-type-grid">
        {roomTypes.map((group) => (
          <article className="accommodation-card" key={group.type}>
            <span className="accommodation-icon">
              <Icon name={group.type === "Tamil" ? "users" : "home"} />
            </span>
            <div>
              <span>{group.type}</span>
              <strong>{group.people.length} employees</strong>
              <small>
                {money(
                  group.items.reduce(
                    (sum, item) => sum + item.accommodationDeduction,
                    0,
                  ),
                )}{" "}
                deductions
              </small>
            </div>
          </article>
        ))}
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Employee recoveries</span>
            <h2>Accommodation deduction register</h2>
          </div>
          <div className="attendance-toolbar">
            {canManage ? (
              <>
                <button
                  className="secondary-button"
                  onClick={() => exportAccommodation("xlsx")}
                >
                  <Icon name="download" size={16} />
                  Room-wise Excel (.xlsx)
                </button>
                <button
                  className="secondary-button"
                  onClick={() => exportAccommodation("csv")}
                >
                  <Icon name="download" size={16} />
                  Room-wise CSV
                </button>
              </>
            ) : (
              <span className="access-mode-note">
                <Icon name="eye" size={15} />
                View only
              </span>
            )}
            {canManage ? (
              <button
                className="primary-button"
                onClick={onAdd}
                disabled={locked || !employees.length}
              >
                + Add recovery
              </button>
            ) : null}
          </div>
        </div>
        <div className="table-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flex: "1 1 auto" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600" }}>
              <span>Client:</span>
              <select
                aria-label="Filter by client location"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="all">All Clients ({availableUnits.length})</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600" }}>
              <span>Room:</span>
              <select
                aria-label="Filter by room"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <option value="all">All Rooms ({rooms.length})</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    Room {r}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="search"
              placeholder="Search employee / code / room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: "220px" }}
            />
            {clientFilter !== "all" || roomFilter !== "all" || searchQuery ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setClientFilter("all");
                  setRoomFilter("all");
                  setSearchQuery("");
                }}
                style={{ padding: "4px 10px", fontSize: "11px", minHeight: "34px" }}
              >
                Reset filters
              </button>
            ) : null}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "auto" }}>
            Showing <strong>{filteredCharges.length}</strong> of <strong>{charges.length}</strong> entries
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type / room</th>
                <th>Rent</th>
                <th>Bus</th>
                <th>Food</th>
                <th>Advance</th>
                <th>Gas share</th>
                <th>Ration share</th>
                <th>Provision share</th>
                <th>Other / old</th>
                <th>Total recovery</th>
                <th>Final pay</th>
                {canManage ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {paginatedCharges.map((charge) => {
                const employee = employees.find(
                  (row) => row.id === charge.employeeId,
                );
                const item = items.find(
                  (row) => row.employeeId === charge.employeeId,
                );
                const other =
                  charge.idCard +
                  charge.medical +
                  charge.ticket +
                  charge.shoe +
                  charge.aadhaarUpdate +
                  charge.bankAccountCharge +
                  charge.tshirt +
                  charge.oldPending;
                const total =
                  charge.rent +
                  charge.bus +
                  charge.food +
                  charge.advance +
                  charge.gasShare +
                  charge.rationShare +
                  charge.provisionShare +
                  other -
                  charge.returnAmount;
                return (
                  <tr key={charge.id}>
                    <td>
                      <EmployeeCell
                        name={employee?.name ?? "Employee"}
                        code={employee?.employeeCode ?? "—"}
                        detail={employee?.department ?? ""}
                      />
                    </td>
                    <td>
                      <strong>{employee?.accommodationType}</strong>
                      <small>{charge.roomNumber}</small>
                    </td>
                    <td>{money(charge.rent)}</td>
                    <td>{money(charge.bus)}</td>
                    <td>{money(charge.food)}</td>
                    <td>{money(charge.advance)}</td>
                    <td>{money(charge.gasShare)}</td>
                    <td>{money(charge.rationShare)}</td>
                    <td>{money(charge.provisionShare)}</td>
                    <td>{money(other)}</td>
                    <td>{money(total)}</td>
                    <td className="net-cell">{money(item?.netPayable ?? 0)}</td>
                    {canManage ? (
                      <td>
                        {employee ? (
                          <button
                            className="text-button"
                            disabled={locked}
                            onClick={() => onEdit(employee, charge)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          totalItems={filteredCharges.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
        {!filteredCharges.length ? (
          <EmptyState
            icon="home"
            title="No matching recoveries found"
            detail="Try adjusting your client, room, or search filters."
          />
        ) : null}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Room control</span>
            <h2>Room-wise summary</h2>
          </div>
        </div>
        <div className="room-grid">
          {rooms.map((room) => {
            const roomCharges = charges.filter(
              (charge) => charge.roomNumber === room,
            );
            const roomEmployees = roomCharges
              .map((charge) =>
                employees.find((employee) => employee.id === charge.employeeId),
              )
              .filter(Boolean) as Employee[];
            const recovery = roomCharges.reduce(
              (sum, charge) =>
                sum +
                charge.rent +
                charge.bus +
                charge.food +
                charge.advance +
                charge.gasShare +
                charge.rationShare +
                charge.provisionShare +
                charge.oldPending,
              0,
            );
            return (
              <article key={room}>
                <div>
                  <span className="room-key">{room}</span>
                  <StatusPill status="Active" />
                </div>
                <strong>{roomEmployees.length} residents</strong>
                <p>
                  {roomEmployees.map((employee) => employee.name).join(" · ")}
                </p>
                <footer>
                  <span>Monthly recovery</span>
                  <b>{money(recovery)}</b>
                </footer>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PaymentsView({
  run,
  items,
  employees,
  vendor,
  unit,
  paymentExportBatches,
  paymentExportBatchItems,
  canExport,
  onAction,
  onPayslip,
  onBulkPayslips,
}: {
  run: PayrollRun;
  items: PayrollItem[];
  employees: Employee[];
  vendor: Vendor;
  unit: ClientUnit;
  paymentExportBatches: PaymentExportBatch[];
  paymentExportBatchItems: PaymentExportBatchItem[];
  canExport: boolean;
  onAction: (
    action: string,
    successMessage: string,
    details?: Record<string, unknown>,
  ) => Promise<boolean>;
  onPayslip: (item: PayrollItem) => void;
  onBulkPayslips: () => void;
}) {
  // Bank files contain only employees with an actual positive payment. A
  // zero-pay salary row remains in payroll reports but must never become a
  // beneficiary row or consume the duplicate-payment reservation.
  const bankItems = items.filter(
    (item) => item.paymentMode !== "cash" && item.netPayable > 0,
  );
  const nonPayableBankItemCount = items.filter(
    (item) => item.paymentMode !== "cash" && item.netPayable <= 0,
  ).length;
  const cashItems = items.filter(
    (item) => (item.paymentMode === "cash" || !item.bankAccountMasked || !item.ifscMasked) && item.netPayable > 0,
  );
  const payableItems = items.filter((item) => item.netPayable > 0);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [selectedBankFormat, setSelectedBankFormat] =
    useState<BankExportFormat>("indian_bank_xlsx");
  const [paymentSelectionBusy, setPaymentSelectionBusy] = useState(false);
  const [paymentActionMessage, setPaymentActionMessage] = useState("");
  const [paymentAccommodationFilter, setPaymentAccommodationFilter] = useState("");
  const bankItemKey = bankItems.map((item) => item.id).join("|");
  const paymentBatchStateKey = paymentExportBatches
    .map((batch) => `${batch.id}:${batch.status}:${batch.updatedAt}`)
    .join("|");
  // JOY_ONE_CLICK_BANK_EXPORT_V1: paymentSelectionLocked is intentionally
  // absent from the UI. The API reserves the exact employee IDs and records
  // the download when a bank-format button is clicked.
  const legacyLockedBatch =
    paymentExportBatches.find((batch) => batch.status === "locked") ?? null;
  const downloadedPaymentItemIds = new Set(
    paymentExportBatches
      .filter((batch) => batch.status === "downloaded")
      .flatMap((batch) =>
        paymentExportBatchItems
          .filter((item) => item.batchId === batch.id)
          .map((item) => item.payrollItemId),
      ),
  );
  const lockedPaymentItemIds = new Set(
    paymentExportBatches
      .filter((batch) => batch.status === "locked")
      .flatMap((batch) =>
        paymentExportBatchItems
          .filter((item) => item.batchId === batch.id)
          .map((item) => item.payrollItemId),
      ),
  );
  const availableBankItems = bankItems.filter(
    (item) =>
      !downloadedPaymentItemIds.has(item.id) &&
      !lockedPaymentItemIds.has(item.id),
  );
  const availablePayableItems = payableItems.filter(
    (item) =>
      !downloadedPaymentItemIds.has(item.id) &&
      !lockedPaymentItemIds.has(item.id),
  );
  // Downloaded employees stay visible for audit, but are no longer selectable.
  // Only the employees not present in a persistent downloaded/locked batch can
  // be included in the next fund-limited payment file.
  const downloadedBankItems = bankItems.filter((item) =>
    downloadedPaymentItemIds.has(item.id),
  );
  const paymentBatchById = new Map(
    paymentExportBatches.map((batch) => [batch.id, batch]),
  );
  const paymentBatchByPayrollItemId = new Map(
    paymentExportBatchItems.flatMap((item) => {
      const batch = paymentBatchById.get(item.batchId);
      return batch ? [[item.payrollItemId, batch] as const] : [];
    }),
  );
  const paymentAccommodationTypes = [...new Set(
    bankItems.map((item) => item.accommodationType).filter(Boolean),
  )].sort();
  useEffect(() => {
    const legacyIds = legacyLockedBatch
      ? paymentExportBatchItems
        .filter(
          (item) =>
            item.batchId === legacyLockedBatch.id &&
            bankItems.some((bankItem) => bankItem.id === item.payrollItemId),
        )
        .map((item) => item.payrollItemId)
      : [];
    setSelectedPaymentIds((current) =>
      legacyIds.length
        ? legacyIds
        : current.filter(
          (id) =>
            payableItems.some((payItem) => payItem.id === id) &&
            !downloadedPaymentItemIds.has(id) &&
            !lockedPaymentItemIds.has(id),
        ),
    );
    setPaymentSelectionBusy(false);
    setPaymentActionMessage("");
  }, [run.id, bankItemKey, paymentBatchStateKey]);
  function selectPaymentIds(ids: string[]) {
    if (legacyLockedBatch || paymentSelectionBusy) return;
    setPaymentActionMessage("");
    setSelectedPaymentIds(
      [...new Set(ids)].filter(
        (id) =>
          !downloadedPaymentItemIds.has(id) &&
          !lockedPaymentItemIds.has(id) &&
          availableFormatBankItems.some((item) => item.id === id),
      ),
    );
  }
  function chooseBankFormat(format: BankExportFormat) {
    if (paymentSelectionBusy || format === selectedBankFormat) return;
    setSelectedBankFormat(format);
    setSelectedPaymentIds([]);
    setPaymentAccommodationFilter("");
    setPaymentActionMessage(
      `${bankFormatLabel(format)} selected. Tick the employees to include in this payment batch.`,
    );
  }
  const availableFormatBankItems = (
    selectedBankFormat === "cash_excel" ? availablePayableItems : availableBankItems
  ).filter((item) =>
    isEligibleForBankFormat(selectedBankFormat, item),
  );
  const selectedBankItems = items.filter((item) => selectedPaymentIds.includes(item.id));
  const remainingFormatBankItems = availableFormatBankItems.filter(
    (item) => !selectedPaymentIds.includes(item.id),
  );
  const bankValidationIssues = selectedBankFormat === "cash_excel"
    ? []
    : selectedBankItems.filter((item) => !item.bankAccountMasked || !item.ifscMasked);
  // JOY_FUND_LIMITED_BANK_BATCH_V4: the bank-format selector and download
  // action stay clickable, but a file is created only for explicitly ticked
  // employees. Downloaded rows are persistently disabled employee by employee.
  const bankDownloadBlockReason =
    run.status !== "approved"
      ? `Payroll is ${run.status}. Approve it in Payroll Run before downloading a bank format.`
      : !canExport
        ? "Full access to Payments & Payslips is required to download bank formats."
        : !selectedBankItems.length
          ? `Select at least one available employee for ${bankFormatLabel(selectedBankFormat)}.`
          : bankValidationIssues.length
            ? `${bankValidationIssues.length} selected employee(s) need an account number and IFSC.`
            : "";
  const paymentSelectionStatus = legacyLockedBatch
    ? "Prepared batch ready"
    : bankDownloadBlockReason
      ? availableFormatBankItems.length
        ? "Individual selection required"
        : "No available employee for this format"
      : "Ready to download selected batch";
  const salaryDescription = vendor.legalName.toUpperCase() + " SALARY " + monthLabel(run.payPeriod).toUpperCase();
  const bankItemsTotal = (rows: PayrollItem[]) =>
    rows.reduce((sum, item) => sum + item.netPayable, 0);
  function resolveBankExport(
    format: BankExportFormat,
    isEligible: (item: PayrollItem) => boolean = () => true,
  ) {
    setPaymentActionMessage("");
    if (run.status !== "approved") {
      const msg = `Payroll for ${monthLabel(run.payPeriod)} is in "${run.status}" status.\n\nPlease approve the payroll run in the "Payroll Run" section first to unlock bank and cash downloads.`;
      setPaymentActionMessage(msg);
      window.alert(msg);
      return null;
    }
    if (!canExport) {
      const msg = "Full access to Payments & Payslips is required to download bank formats.";
      setPaymentActionMessage(msg);
      window.alert(msg);
      return null;
    }
    // Legacy flow: No employee is selected automatically, so you can match the payment batch to the available bank balance.
    // Updated flow (ab97e11): When none are explicitly ticked, target all availableFormatBankItems for convenience.
    let targetItems = selectedBankItems;
    if (!targetItems.length) {
      targetItems = availableFormatBankItems;
    }
    if (!targetItems.length) {
      const msg = `No available employees found for ${bankFormatLabel(format)}. All employees may have already been downloaded or lack bank details.`;
      setPaymentActionMessage(msg);
      window.alert(msg);
      return null;
    }
    if (format !== selectedBankFormat && selectedBankItems.length > 0) {
      const msg = `The employee selection belongs to ${bankFormatLabel(selectedBankFormat)}. Switch to ${bankFormatLabel(format)} first.`;
      setPaymentActionMessage(msg);
      window.alert(msg);
      return null;
    }
    const freshItems = targetItems.filter(isEligible);
    if (freshItems.length !== targetItems.length) {
      const msg = `One or more selected employees are not eligible for ${bankFormatLabel(format)}. Clear the selection and choose the employees shown as Available.`;
      setPaymentActionMessage(msg);
      window.alert(msg);
      return null;
    }
    if (format !== "cash_excel") {
      const invalidItems = freshItems.filter(
        (item) => !item.bankAccountMasked || !item.ifscMasked,
      );
      if (invalidItems.length) {
        const msg = `${invalidItems.length} employee(s) need an account number and IFSC before download.`;
        setPaymentActionMessage(msg);
        window.alert(msg);
        return null;
      }
    }
    return { items: freshItems };
  }
  async function markPaymentBatchDownloaded(
    format: string,
    exportItems: PayrollItem[],
  ) {
    if (
      !exportItems.length ||
      run.status !== "approved" ||
      !canExport ||
      paymentSelectionBusy
    )
      return false;
    setPaymentSelectionBusy(true);
    const saved = await onAction(
      "download-payment-batch",
      "Bank upload downloaded; selected employees protected from duplicate processing",
      legacyLockedBatch
        ? { batchId: legacyLockedBatch.id, exportFormat: format }
        : {
          itemIds: exportItems.map((item) => item.id),
          exportFormat: format,
        },
    );
    if (saved) {
      const exported = new Set(exportItems.map((item) => item.id));
      setSelectedPaymentIds((current) =>
        current.filter((id) => !exported.has(id)),
      );
    }
    setPaymentSelectionBusy(false);
    return saved;
  }
  async function exportRows(mode: "bank" | "cash", format: "xlsx" | "csv" = "xlsx") {
    const exportFormatKey = format === "xlsx" ? "bank_xlsx" : "bank_csv";
    const prepared = mode === "bank" ? resolveBankExport(exportFormatKey) : null;
    if (mode === "bank" && !prepared) return;
    if (
      mode === "bank" &&
      prepared &&
      !(await markPaymentBatchDownloaded(exportFormatKey, prepared.items))
    ) return;
    const rows = mode === "bank" ? prepared!.items : cashItems;
    const header =
      mode === "bank"
        ? [
          "SNO_REF_NO",
          "CUSTOMER_NAME",
          "ACCOUNT_NO",
          "AMOUNT",
          "DESCRIPTION",
          "IFSC_CODE",
          "BANK_NAME",
        ]
        : ["SL_NO", "EMP_ID", "EMPLOYEE_NAME", "AMOUNT", "PAYMENT_MODE"];
    const values = rows.map((item, index) =>
      mode === "bank"
        ? [
          index + 1,
          item.employeeName,
          item.bankAccountMasked ?? "",
          item.netPayable,
          `${monthLabel(run.payPeriod)} Salary`,
          item.ifscMasked ?? "",
          employees.find((employee) => employee.id === item.employeeId)
            ?.bankName ?? "",
        ]
        : [
          index + 1,
          item.employeeCode,
          item.employeeName,
          item.netPayable,
          "Cash",
        ],
    );
    if (format === "xlsx") {
      downloadXlsx(
        `${mode}-payment-${run.payPeriod}.xlsx`,
        [header, ...values],
        `${mode.toUpperCase()} Payment`,
      );
    } else {
      downloadCsv(`${mode}-payment-${run.payPeriod}.csv`, [header, ...values]);
    }
  }
  async function exportCashExcel() {
    const prepared = resolveBankExport("cash_excel");
    if (!prepared) return;
    const exportItems = prepared.items;
    if (
      !(await markPaymentBatchDownloaded("cash_excel", exportItems))
    ) return;
    const rows = exportItems.map((item, index) => {
      const employee = employees.find((row) => row.id === item.employeeId);
      return [
        index + 1,
        item.employeeCode,
        item.employeeName,
        item.department || employee?.department || unit.clientName || "",
        item.netPayable,
        "Cash",
        monthLabel(run.payPeriod),
        employee?.mobileNumber ?? "",
        employee?.accommodationType ?? "",
        employee?.roomNumber ?? "",
        "",
      ];
    });
    downloadXlsx(`cash-payment-disbursement-${run.payPeriod}.xlsx`, [
      [
        "SL_NO",
        "EMPLOYEE_CODE",
        "EMPLOYEE_NAME",
        "DEPARTMENT",
        "NET_PAYABLE_AMOUNT",
        "PAYMENT_MODE",
        "SALARY_MONTH",
        "MOBILE_NUMBER",
        "ACCOMMODATION_TYPE",
        "ROOM_NUMBER",
        "RECEIVER_SIGNATURE",
      ],
      ...rows,
    ]);
  }
  async function exportIndianBank() {
    const prepared = resolveBankExport("indian_bank_xlsx");
    if (!prepared) return;
    const exportItems = prepared.items;
    if (
      !(await markPaymentBatchDownloaded("indian_bank_xlsx", exportItems))
    ) return;
    const rows = exportItems.map((item, index) => {
      const employee = employees.find((row) => row.id === item.employeeId);
      return [
        index + 1,
        item.employeeName,
        employee?.bankBranch ?? unit.location,
        item.bankAccountMasked ?? "",
        item.netPayable,
        salaryDescription,
        item.ifscMasked ?? "",
        employee?.bankName ?? "",
        "",
      ];
    });
    downloadXlsx(`indian-bank-bulk-${run.payPeriod}.xlsx`, [
      [
        "SNO_REF_NO",
        "CUSTOMER_NAME",
        "CITY",
        "ACCOUNT_NO",
        "AMOUNT",
        "DESCRIPTION",
        "IFSC_CODE",
        "BANK_NAME",
        "BENEFICIARY_EMAIL_ID",
      ],
      ...rows,
    ]);
  }
  async function exportCubAnyBank() {
    const prepared = resolveBankExport(
      "cub_any_bank_txt",
      (item) => !isCubBeneficiary(item),
    );
    if (!prepared) return;
    const exportItems = prepared.items;
    if (
      !(await markPaymentBatchDownloaded("cub_any_bank_txt", exportItems))
    ) return;
    const rows = exportItems.map(
      (item) =>
        `NEFT~${item.ifscMasked ?? ""}~${item.netPayable.toFixed(2)}~10~${item.bankAccountMasked ?? ""}~${item.employeeName}~0~${salaryDescription}`,
    );
    downloadText(`cub-any-bank-${run.payPeriod}.txt`, rows.join("\r\n"));
  }
  async function exportCubToCub() {
    const prepared = resolveBankExport(
      "cub_to_cub_txt",
      isCubBeneficiary,
    );
    if (!prepared) return;
    const exportItems = prepared.items;
    if (
      !(await markPaymentBatchDownloaded("cub_to_cub_txt", exportItems))
    ) return;
    const rows = exportItems.map(
      (item) =>
        `${item.bankAccountMasked ?? ""}~${item.netPayable.toFixed(2)}~${salaryDescription}`,
    );
    downloadText(`cub-to-cub-${run.payPeriod}.txt`, rows.join("\r\n"));
  }
  async function downloadSelectedBankFormat() {
    if (selectedBankFormat === "cash_excel") return exportCashExcel();
    if (selectedBankFormat === "indian_bank_xlsx") return exportIndianBank();
    if (selectedBankFormat === "cub_any_bank_txt") return exportCubAnyBank();
    if (selectedBankFormat === "cub_to_cub_txt") return exportCubToCub();
    if (selectedBankFormat === "bank_xlsx") return exportRows("bank", "xlsx");
    return exportRows("bank", "csv");
  }
  const [batchPage, setBatchPage] = useState(1);
  const [readyListPage, setReadyListPage] = useState(1);
  useEffect(() => {
    setBatchPage(1);
  }, [selectedBankFormat, paymentAccommodationFilter]);

  const displayBatchItems = selectedBankFormat === "cash_excel" ? payableItems : bankItems;
  const paginatedBatchItems = displayBatchItems.slice((batchPage - 1) * 20, batchPage * 20);
  const paginatedReadyItems = items.slice((readyListPage - 1) * 20, readyListPage * 20);
  return (
    <div className="section-stack">
      <section className="panel panel-heading">
        <div>
          <span className="eyebrow">Payslip download centre</span>
          <h2>Bulk payslips — two slips per A4 page</h2>
          <p>
            Logo source: Group Companies &amp; Clients → Edit group company →
            Company logo for payslips.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={onBulkPayslips}
          disabled={!items.length}
        >
          <Icon name="download" size={16} />
          Download bulk payslips PDF
        </button>
      </section>
      {run.status !== "approved" ? (
        <section className="locked-banner" style={{ margin: "0 0 16px 0" }}>
          <span>
            <Icon name="alert" />
          </span>
          <div>
            <strong>Payment outputs are locked until payroll approval.</strong>
            <p>
              Payroll for {monthLabel(run.payPeriod)} is currently in &ldquo;{run.status}&rdquo; status.
              Go to <strong>Payroll Run</strong> to review and approve the run to unlock bank and cash downloads.
            </p>
          </div>
        </section>
      ) : null}
      <section className="payment-summary-grid">
        <article>
          <span>
            <Icon name="bank" />
          </span>
          <div>
            <small>Bank transfer</small>
            <strong>{money(run.bankPayable)}</strong>
            <p>{bankItems.length} employees · final payable after recoveries</p>
          </div>
          <button
            onClick={() => void downloadSelectedBankFormat()}
            disabled={paymentSelectionBusy}
            title={`Download the individually selected employees as ${bankFormatLabel(selectedBankFormat)}`}
          >
            <Icon name="download" size={16} />
            {canExport ? `Download ${bankFormatLabel(selectedBankFormat)}` : "View only"}
          </button>
        </article>
        <article>
          <span className="cash-icon">₹</span>
          <div>
            <small>Cash payment (Bank pending)</small>
            <strong>{money(run.cashPayable)}</strong>
            <p>{cashItems.length} employees · cash disbursement</p>
          </div>
          <button
            type="button"
            className={selectedBankFormat === "cash_excel" ? "primary-button" : ""}
            disabled={paymentSelectionBusy || !cashItems.length}
            onClick={() => {
              if (selectedBankFormat !== "cash_excel") {
                chooseBankFormat("cash_excel");
              }
              void exportCashExcel();
            }}
            title="Download Cash Payment Excel disbursement format"
          >
            <Icon name="download" size={16} />
            {canExport ? "Cash Excel batch" : "View only"}
          </button>
        </article>
        <article>
          <span>
            <Icon name="file" />
          </span>
          <div>
            <small>Half-A4 payslips</small>
            <strong>{items.length}</strong>
            <p>Two employee slips per A4 page</p>
          </div>
          <div className="record-actions">
            <button
              onClick={() => items[0] && onPayslip(items[0])}
              disabled={!items.length}
            >
              Preview
            </button>
            <button onClick={onBulkPayslips} disabled={!items.length}>
              Bulk PDF
            </button>
          </div>
        </article>
      </section>
      <section className="panel table-panel payment-batch-selector">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Payment processing batch</span>
            <h2>Select employees for this bank upload batch</h2>
            <p>Choose the bank format, then tick only the employees affordable with the available fund. Only the downloaded employees will be disabled.</p>
          </div>
          <div className="record-actions payment-selection-controls">
            {(["indian_bank_xlsx", "bank_xlsx", "cub_any_bank_txt", "cub_to_cub_txt", "bank_csv", "cash_excel"] as BankExportFormat[]).map((format) => (
              <button
                key={format}
                className={selectedBankFormat === format ? "primary-button" : "secondary-button"}
                type="button"
                aria-pressed={selectedBankFormat === format}
                disabled={paymentSelectionBusy}
                onClick={() => chooseBankFormat(format)}
              >
                {bankFormatLabel(format)}
              </button>
            ))}
            <select
              aria-label="Select employees by accommodation type"
              value={paymentAccommodationFilter}
              disabled={Boolean(legacyLockedBatch) || paymentSelectionBusy}
              onChange={(event) => {
                const value = event.target.value;
                setPaymentAccommodationFilter(value);
                selectPaymentIds(
                  value
                    ? availableFormatBankItems.filter((item) => item.accommodationType === value).map((item) => item.id)
                    : [],
                );
              }}
            >
              <option value="">Accommodation-wise selection</option>
              {paymentAccommodationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <button className="secondary-button" type="button" disabled={Boolean(legacyLockedBatch) || paymentSelectionBusy} onClick={() => { setPaymentAccommodationFilter(""); selectPaymentIds(availableFormatBankItems.map((item) => item.id)); }}>Select all for format</button>
            <button className="secondary-button" type="button" disabled={Boolean(legacyLockedBatch) || paymentSelectionBusy} onClick={() => { setPaymentAccommodationFilter(""); selectPaymentIds([]); }}>Clear selection</button>
            {legacyLockedBatch ? (
              <span className="locked-banner-inline">Prepared selection ready to download</span>
            ) : null}
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Pay</th><th>Payment status</th><th>Employee</th><th>Account holder</th><th>Account</th><th>IFSC</th><th>Bank / Branch</th><th>Amount</th></tr></thead>
            <tbody>
              {paginatedBatchItems.map((item) => {
                const employee = employees.find((row) => row.id === item.employeeId);
                const paymentBatch = paymentBatchByPayrollItemId.get(item.id);
                const formatEligible = isEligibleForBankFormat(selectedBankFormat, item);
                const isDownloaded = downloadedPaymentItemIds.has(item.id);
                const isLocked = lockedPaymentItemIds.has(item.id);
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" disabled={Boolean(legacyLockedBatch) || paymentSelectionBusy || isDownloaded || isLocked || !formatEligible} checked={selectedPaymentIds.includes(item.id)} onChange={(event) => selectPaymentIds(event.target.checked ? [...selectedPaymentIds, item.id] : selectedPaymentIds.filter((id) => id !== item.id))} /></td>
                    <td><strong>{isDownloaded ? "Downloaded" : isLocked ? "Prepared" : formatEligible ? "Available" : "Not applicable"}</strong><small>{paymentBatch?.exportFormat ? bankFormatLabel(paymentBatch.exportFormat) : !formatEligible ? `Not for ${bankFormatLabel(selectedBankFormat)}` : "Select for next batch"}</small></td>
                    <td><strong>{item.employeeCode}</strong><small>{item.employeeName}</small></td>
                    <td>{item.employeeName}</td>
                    <td>{item.bankAccountMasked ?? (selectedBankFormat === "cash_excel" || !item.bankAccountMasked ? "Cash / No bank" : "Pending")}</td>
                    <td>{item.ifscMasked ?? (selectedBankFormat === "cash_excel" || !item.ifscMasked ? "Cash" : "Pending")}</td>
                    <td><strong>{employee?.bankName ? employee.bankName : (item.paymentMode === "cash" || !item.bankAccountMasked ? "Cash payout" : "—")}</strong><small>{employee?.bankBranch ?? (item.paymentMode === "cash" || !item.bankAccountMasked ? "Cash disbursement" : "Branch pending")}</small></td>
                    <td><strong>{money(item.netPayable)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={batchPage}
          totalItems={displayBatchItems.length}
          pageSize={20}
          onPageChange={setBatchPage}
        />
        <div className="form-note"><strong>{selectedBankItems.length} employees selected · {paymentSelectionStatus}</strong><span>Selected batch total: {money(bankItemsTotal(selectedBankItems))}</span><span>Left for a later {bankFormatLabel(selectedBankFormat)} batch: {remainingFormatBankItems.length} employee(s) · {money(bankItemsTotal(remainingFormatBankItems))}</span><span>Already downloaded: {downloadedBankItems.length} employee(s) · {money(bankItemsTotal(downloadedBankItems))}</span><span>{bankDownloadBlockReason || "The file will contain only the individually selected employees."}</span>{nonPayableBankItemCount ? <span>{nonPayableBankItemCount} zero-pay employee(s) omitted from bank files.</span> : null}</div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Bank bulk-upload formats</span>
            <h2>Downloads matching supplied bank templates</h2>
          </div>
          <span className="muted-label">{bankFormatLabel(selectedBankFormat)} · {selectedBankItems.length} selected · {availableFormatBankItems.length} available</span>
        </div>
        {!bankItems.length ? <p className="form-note"><strong>No calculated bank rows are available.</strong> Open Payroll Run and recalculate/refresh totals. Bank files are enabled automatically once salary rows exist and your Payments permission is Full access.</p> : null}
        {bankDownloadBlockReason ? <p className="form-note"><strong>Download check:</strong> {bankDownloadBlockReason}</p> : <p className="form-note"><strong>Selected batch ready.</strong> Confirm the employee count and selected amount, then download. Those employees will be disabled after the server records the file.</p>}
        {paymentActionMessage ? <p className="form-note"><strong>Download information:</strong> {paymentActionMessage}</p> : null}
        <div className="record-actions">
          <button
            className="primary-button"
            onClick={() => void downloadSelectedBankFormat()}
            title={`Download selected employees as ${bankFormatLabel(selectedBankFormat)}`}
            disabled={paymentSelectionBusy}
          >
            Download selected batch · {bankFormatLabel(selectedBankFormat)}
          </button>
        </div>
      </section>
      <section className="panel payroll-bank-flow">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Easy payroll and bank-payment guide</span>
            <h2>How wages become the bank upload file</h2>
          </div>
        </div>
        <ol>
          <li><strong>1. Attendance or client file</strong><span>Use approved attendance, or import the client salary register.</span></li>
          <li><strong>2. Earnings</strong><span>Basic, DA, HRA, OT and other selected earnings are calculated or imported.</span></li>
          <li><strong>3. Statutory deductions</strong><span>EPF, ESI, PT and LWF rules are applied according to employee settings.</span></li>
          <li><strong>4. Recoveries</strong><span>Room rent, Gas, Ration, Provision, advance and other finalized deductions are subtracted.</span></li>
          <li><strong>5. Final payable</strong><span>Gross earnings − statutory deductions − recoveries + returns.</span></li>
          <li><strong>6. Bank validation</strong><span>Confirm employee account number, IFSC, bank name and payable amount.</span></li>
          <li><strong>7. Download</strong><span>Select Indian Bank Excel, CUB Any Bank TXT or CUB-to-CUB TXT and upload it in the bank portal.</span></li>
        </ol>
        {run.status !== "approved" ? <p className="form-note"><strong>Draft warning:</strong> bank outputs remain unavailable until payroll approval.</p> : null}
      </section>
      {run.status !== "approved" ? (
        <section className="locked-banner">
          <span>
            <Icon name="alert" />
          </span>
          <div>
            <strong>Payment outputs are locked until payroll approval.</strong>
            <p>
              Resolve all validation issues, recalculate and approve the payroll
              run first.
            </p>
          </div>
        </section>
      ) : (
        <section className="success-banner">
          <span>
            <Icon name="check" />
          </span>
          <div>
            <strong>Payroll is approved for disbursement.</strong>
            <p>Choose the bank format, select only the employees covered by the available fund, review the batch total, then download. Only downloaded employees are locked; the balance remains available for a later batch.</p>
          </div>
        </section>
      )}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Bank validation</span>
            <h2>Payment-ready employee list</h2>
          </div>
          <span className="muted-label">Masked in demo</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Employee</th>
                <th>Account</th>
                <th>IFSC</th>
                <th>Mode</th>
                <th>Net payable</th>
                <th>Readiness</th>
                <th>Payslip</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReadyItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{(readyListPage - 1) * 20 + index + 1}</td>
                  <td>
                    <EmployeeCell
                      name={item.employeeName}
                      code={item.employeeCode}
                      detail={item.department}
                    />
                  </td>
                  <td>
                    {item.bankAccountMasked ?? (
                      <span className="pending-text">Pending</span>
                    )}
                  </td>
                  <td>
                    {item.ifscMasked ?? (
                      <span className="pending-text">Pending</span>
                    )}
                  </td>
                  <td>
                    <span className="mode-pill">
                      {item.paymentMode === "bank" ? "Bank" : "Cash"}
                    </span>
                  </td>
                  <td className="net-cell">{money(item.netPayable)}</td>
                  <td>
                    <StatusPill
                      status={
                        item.validationStatus === "ready"
                          ? (item.paymentMode === "cash" || !item.bankAccountMasked || !item.ifscMasked ? "Cash ready" : "Ready")
                          : "Review"
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="payslip-button"
                      onClick={() => onPayslip(item)}
                    >
                      <Icon name="eye" size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={readyListPage}
          totalItems={items.length}
          pageSize={20}
          onPageChange={setReadyListPage}
        />
      </section>
    </div>
  );
}

function VendorsView({
  vendors,
  units,
  activeVendorId,
  canManage,
  onSelect,
  onAddVendor,
  onEditVendor,
  onAddUnit,
  onEditUnit,
  onVendorStatus,
  onDeleteVendor,
  onUnitStatus,
  onDeleteUnit,
}: {
  vendors: Vendor[];
  units: ClientUnit[];
  activeVendorId: string;
  canManage: boolean;
  onSelect: (vendorId: string, unitId: string) => void;
  onAddVendor: () => void;
  onEditVendor: (vendor: Vendor) => void;
  onAddUnit: () => void;
  onEditUnit: (unit: ClientUnit) => void;
  onVendorStatus: (vendor: Vendor) => void;
  onDeleteVendor: (vendor: Vendor) => void;
  onUnitStatus: (unit: ClientUnit) => void;
  onDeleteUnit: (unit: ClientUnit) => void;
}) {
  return (
    <div className="section-stack">
      <section className="vendor-actions">
        <div>
          <strong>
            {vendors.filter((vendor) => vendor.status === "active").length}{" "}
            active group companies
          </strong>
          <span>
            Joy group companies are maintained separately from their client
            factories and employer units.
          </span>
        </div>
        {canManage ? (
          <button className="primary-button" onClick={onAddVendor}>
            + Add group company
          </button>
        ) : (
          <span className="access-mode-note">
            <Icon name="eye" size={15} />
            View only
          </span>
        )}
      </section>
      <section className="vendor-grid">
        {vendors.map((vendor) => {
          const vendorUnits = units.filter(
            (unit) => unit.vendorId === vendor.id,
          );
          return (
            <article
              className={
                vendor.id === activeVendorId
                  ? "vendor-card vendor-selected"
                  : "vendor-card"
              }
              key={vendor.id}
            >
              <header>
                {vendor.logoDataUrl ? (
                  <img
                    className="vendor-logo vendor-logo-image"
                    src={vendor.logoDataUrl}
                    alt={`${vendor.name} logo`}
                  />
                ) : (
                  <button
                    className="vendor-logo vendor-logo-upload"
                    onClick={() => onEditVendor(vendor)}
                    title="Upload company logo"
                  >
                    + Logo
                  </button>
                )}
                <StatusPill
                  status={vendor.status === "active" ? "Active" : "Inactive"}
                />
              </header>
              <h2>{vendor.legalName}</h2>
              <p>
                {vendorUnits.length} client units ·{" "}
                {vendorUnits.reduce((sum, unit) => sum + unit.employeeCount, 0)}{" "}
                active employees
              </p>
              {vendor.remarks ? (
                <p className="record-remarks">{vendor.remarks}</p>
              ) : null}
              <dl>
                <div>
                  <dt>EPF code</dt>
                  <dd>{vendor.epfCode ?? "Not added"}</dd>
                </div>
                <div>
                  <dt>ESI code</dt>
                  <dd>{vendor.esiCode ?? "Not added"}</dd>
                </div>
                <div>
                  <dt>GSTIN</dt>
                  <dd>{vendor.gstin ?? "Not added"}</dd>
                </div>
              </dl>
              <div className="client-card-footer">
                <button
                  className="secondary-button"
                  disabled={vendor.status !== "active"}
                  onClick={() =>
                    onSelect(
                      vendor.id,
                      vendorUnits.find((unit) => unit.status === "active")
                        ?.id ?? "",
                    )
                  }
                >
                  Open group company <Icon name="arrow" size={16} />
                </button>
                {canManage ? (
                  <RecordActions
                    status={vendor.status}
                    onEdit={() => onEditVendor(vendor)}
                    onToggle={() => onVendorStatus(vendor)}
                    onDelete={() => onDeleteVendor(vendor)}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Operational structure</span>
            <h2>Clients and employer units</h2>
          </div>
          {canManage ? (
            <button
              className="primary-button"
              onClick={onAddUnit}
              disabled={!vendors.some((vendor) => vendor.status === "active")}
            >
              + Add client unit
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Group company</th>
                <th>Client name</th>
                <th>Employer unit</th>
                <th>Location / remarks</th>
                <th>Active employees</th>
                <th>Status</th>
                <th>Open</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const canOpen =
                  unit.status === "active" &&
                  vendors.find((vendor) => vendor.id === unit.vendorId)
                    ?.status === "active";
                return (
                  <tr key={unit.id}>
                    <td>
                      {
                        vendors.find((vendor) => vendor.id === unit.vendorId)
                          ?.code
                      }
                    </td>
                    <td>
                      <strong>{unit.clientName}</strong>
                    </td>
                    <td>{unit.unitName}</td>
                    <td>
                      <strong>{unit.location}</strong>
                      {unit.remarks ? <small>{unit.remarks}</small> : null}
                    </td>
                    <td>{unit.employeeCount}</td>
                    <td>
                      <StatusPill
                        status={
                          unit.status === "active" ? "Active" : "Inactive"
                        }
                      />
                    </td>
                    <td>
                      {canOpen ? (
                        <button
                          className="record-action"
                          onClick={() => onSelect(unit.vendorId, unit.id)}
                        >
                          Open
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    {canManage ? (
                      <td>
                        <RecordActions
                          status={unit.status}
                          onEdit={() => onEditUnit(unit)}
                          onToggle={() => onUnitStatus(unit)}
                          onDelete={() => onDeleteUnit(unit)}
                        />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!units.length ? (
          <EmptyState
            icon="building"
            title="No client units yet"
            detail="Add a group company first, then create its client and employer units."
          />
        ) : null}
      </section>
    </div>
  );
}

function UsersAccessView({
  users,
  vendors,
  units,
  currentUser,
  canManage,
  onAdd,
  onAddVendor,
  onEdit,
  onStatus,
  onDelete,
}: {
  users: AppUserProfile[];
  vendors: Vendor[];
  units: ClientUnit[];
  currentUser: AppUserProfile;
  canManage: boolean;
  onAdd: () => void;
  onAddVendor?: () => void;
  onEdit: (profile: AppUserProfile) => void;
  onStatus: (profile: AppUserProfile) => void;
  onDelete: (profile: AppUserProfile) => void;
}) {
  const roleCounts = (Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({
    role,
    count: users.filter((profile) => {
      const isVendor = profile.role === "vendor" || Boolean(profile.department?.startsWith("Vendor:"));
      if (role === "vendor") return isVendor && profile.status === "active";
      if (isVendor) return false;
      return profile.role === role && profile.status === "active";
    }).length,
  }));
  const formatLogin = (value: string | null) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      : "Not signed in yet";
  return (
    <div className="section-stack">
      <section className="access-intro">
        <div>
          <span className="eyebrow">
            Identity-based and organisation-scoped control
          </span>
          <h2>Assign Payroll Team clients, HR Team employer units &amp; Store Vendors</h2>
          <p>
            Payroll users access assigned clients. HR users access assigned employer units.
            Vendor store accounts only access the Vendor Counter Desk with no payroll visibility.
          </p>
        </div>
        {canManage ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="secondary-button"
              style={{
                backgroundColor: "#0284c7",
                borderColor: "#0284c7",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
                fontSize: "13px",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => onAddVendor ? onAddVendor() : onAdd()}
            >
              <span>🏪</span> + Add Store / Vendor Login
            </button>
            <button className="primary-button" onClick={onAdd}>
              + Add internal user
            </button>
          </div>
        ) : (
          <span className="access-mode-note">
            <Icon name="eye" size={15} />
            View only
          </span>
        )}
      </section>
      <section className="role-summary-grid">
        {roleCounts.map(({ role, count }) => (
          <article key={role} className={`role-summary role-${role}`}>
            <span>{initials(ROLE_LABELS[role])}</span>
            <div>
              <small>{ROLE_LABELS[role]}</small>
              <strong>{count}</strong>
              <p>active {count === 1 ? "user" : "users"}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="access-security-note">
        <Icon name="alert" size={19} />
        <div>
          <strong>Temporary-password access protects every new user.</strong>
          <p>
            The Super Admin creates the login and temporary password here. At
            the first successful sign-in, the user must immediately set a
            private password before accessing the application.
          </p>
        </div>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Company users</span>
            <h2>User profiles & permission coverage</h2>
          </div>
          <span className="muted-label">
            {users.filter((profile) => profile.status === "active").length}{" "}
            active ·{" "}
            {users.filter((profile) => profile.status !== "active").length}{" "}
            inactive
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table access-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Assigned client / employer units</th>
                <th>Module access</th>
                <th>Final approval</th>
                <th>Last sign-in</th>
                <th>Status</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((profile) => {
                const managed = ACCESS_MODULES.filter(
                  (module) => profile.permissions[module.id] === "manage",
                ).length;
                const viewed = ACCESS_MODULES.filter(
                  (module) => profile.permissions[module.id] === "view",
                ).length;
                const isCurrent = profile.email === currentUser.email;
                const isVendor = profile.role === "vendor" || Boolean(profile.department?.startsWith("Vendor:"));
                const scopeLabels =
                  profile.role === "super_admin"
                    ? ["All clients and employer units"]
                    : isVendor
                      ? ["🏪 Vendor Counter Desk (Aadhaar & grocery bills)"]
                      : profile.role === "payroll_team"
                        ? profile.clientScope
                          .map((id) => vendors.find((vendor) => vendor.id === id)?.name)
                          .filter((name): name is string => Boolean(name))
                        : profile.unitScope
                          .map((id) => {
                            const unit = units.find((candidate) => candidate.id === id);
                            return unit ? `${unit.clientName} · ${unit.unitName}` : null;
                          })
                          .filter((label): label is string => Boolean(label));
                return (
                  <tr key={profile.id}>
                    <td>
                      <EmployeeCell
                        name={profile.fullName ?? profile.email.split("@")[0]}
                        code={profile.email}
                        detail={isCurrent ? "You" : ""}
                      />
                    </td>
                    <td>
                      <span className={`role-pill role-pill-${isVendor ? "vendor" : profile.role}`}>
                        {isVendor ? "Vendor / Storekeeper" : ROLE_LABELS[profile.role]}
                      </span>
                    </td>
                    <td>
                      <div className="scope-label-list">
                        {scopeLabels.length ? (
                          scopeLabels.map((label) => (
                            <span key={label}>{label}</span>
                          ))
                        ) : (
                          <span className="field-pending">
                            No scope assigned
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="permission-counts">
                        <b>{managed} full</b>
                        <span>{viewed} view</span>
                        <small>
                          {ACCESS_MODULES.length - managed - viewed} hidden
                        </small>
                      </div>
                    </td>
                    <td>
                      {profile.canApprovePayroll ? (
                        <span className="field-ready">
                          <Icon name="check" size={14} />
                          Authorised
                        </span>
                      ) : (
                        <span className="field-pending">Not authorised</span>
                      )}
                    </td>
                    <td>
                      <span className="last-login">
                        {formatLogin(profile.lastLoginAt)}
                      </span>
                    </td>
                    <td>
                      <StatusPill
                        status={
                          profile.status === "active" ? "Active" : "Inactive"
                        }
                      />
                    </td>
                    {canManage ? (
                      <td>
                        <div className="record-actions">
                          <button
                            className="record-action"
                            onClick={() => onEdit(profile)}
                          >
                            Edit
                          </button>
                          {!isCurrent ? (
                            <button
                              className="record-action"
                              onClick={() => onStatus(profile)}
                            >
                              {profile.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          ) : null}
                          {!isCurrent ? (
                            <button
                              className="record-action record-delete"
                              onClick={() => onDelete(profile)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!users.length ? (
          <EmptyState
            icon="users"
            title="No user profiles"
            detail="Add the first Super Admin, Payroll Team, or HR Team profile."
          />
        ) : null}
      </section>
    </div>
  );
}

function MasterDataView({
  client,
  types,
  rooms,
  employees,
  shifts,
  remarks,
  canManage,
  onAddType,
  onEditType,
  onTypeStatus,
  onDeleteType,
  onAddShift,
  onEditShift,
  onShiftStatus,
  onDeleteShift,
  onAddRemark,
  onEditRemark,
  onRemarkStatus,
  onDeleteRemark,
}: {
  client: Vendor;
  types: AccommodationType[];
  rooms: AccommodationRoom[];
  employees: Employee[];
  shifts: ShiftDefinition[];
  remarks: PayrollRemark[];
  canManage: boolean;
  onAddType: () => void;
  onEditType: (type: AccommodationType) => void;
  onTypeStatus: (type: AccommodationType) => void;
  onDeleteType: (type: AccommodationType) => void;
  onAddShift: () => void;
  onEditShift: (shift: ShiftDefinition) => void;
  onShiftStatus: (shift: ShiftDefinition) => void;
  onDeleteShift: (shift: ShiftDefinition) => void;
  onAddRemark: () => void;
  onEditRemark: (remark: PayrollRemark) => void;
  onRemarkStatus: (remark: PayrollRemark) => void;
  onDeleteRemark: (remark: PayrollRemark) => void;
}) {
  return (
    <div className="section-stack">
      <section className="rule-callout">
        <span>
          <Icon name="settings" />
        </span>
        <div>
          <strong>
            {canManage ? "Manage" : "Review"} accommodation, shifts, and remarks
            for {client.name}.
          </strong>
          <p>
            Only active accommodation types, shifts, and remarks are available
            in operational forms. Existing payroll history is preserved.
          </p>
        </div>
        {!canManage ? (
          <span className="access-mode-note">
            <Icon name="eye" size={15} />
            View only
          </span>
        ) : null}
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Accommodation master</span>
            <h2>Accommodation types & room categories</h2>
          </div>
          {canManage ? (
            <button className="primary-button" onClick={onAddType}>
              + Add accommodation type
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Accommodation type</th>
                <th>Rooms</th>
                <th>Active employees</th>
                <th>Remarks</th>
                <th>Status</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id}>
                  <td>
                    <strong>{type.name}</strong>
                  </td>
                  <td>
                    {
                      rooms.filter(
                        (room) => room.accommodationTypeId === type.id,
                      ).length
                    }
                  </td>
                  <td>
                    {
                      employees.filter(
                        (employee) =>
                          employee.vendorId === client.id &&
                          employee.accommodationType === type.name &&
                          employee.status === "active",
                      ).length
                    }
                  </td>
                  <td>{type.remarks ?? "—"}</td>
                  <td>
                    <StatusPill
                      status={type.status === "active" ? "Active" : "Inactive"}
                    />
                  </td>
                  {canManage ? (
                    <td>
                      <RecordActions
                        status={type.status}
                        onEdit={() => onEditType(type)}
                        onToggle={() => onTypeStatus(type)}
                        onDelete={() => onDeleteType(type)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!types.length ? (
          <EmptyState
            icon="home"
            title="No accommodation types"
            detail="Add Tamil, Outside Room, Joy Room, or another custom accommodation type."
          />
        ) : null}
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Shift master</span>
            <h2>Shift details & working hours</h2>
          </div>
          {canManage ? (
            <button className="primary-button" onClick={onAddShift}>
              + Add shift
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shift name</th>
                <th>Start time</th>
                <th>End time</th>
                <th>Remarks</th>
                <th>Status</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td>
                    <strong>{shift.name}</strong>
                  </td>
                  <td>{formatShiftTime(shift.startTime)}</td>
                  <td>
                    {formatShiftTime(shift.endTime)}
                    {shift.endTime <= shift.startTime ? (
                      <small>Next day</small>
                    ) : null}
                  </td>
                  <td>{shift.remarks ?? "—"}</td>
                  <td>
                    <StatusPill
                      status={shift.status === "active" ? "Active" : "Inactive"}
                    />
                  </td>
                  {canManage ? (
                    <td>
                      <RecordActions
                        status={shift.status}
                        onEdit={() => onEditShift(shift)}
                        onToggle={() => onShiftStatus(shift)}
                        onDelete={() => onDeleteShift(shift)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shifts.length ? (
          <EmptyState
            icon="calendar"
            title="No shifts added"
            detail="Create the first working shift for this client."
          />
        ) : null}
      </section>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Remarks master</span>
            <h2>Reusable notes & other remarks</h2>
          </div>
          {canManage ? (
            <button className="primary-button" onClick={onAddRemark}>
              + Add remark
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Remark title</th>
                <th>Category</th>
                <th>Details</th>
                <th>Status</th>
                {canManage ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {remarks.map((remark) => (
                <tr key={remark.id}>
                  <td>
                    <strong>{remark.title}</strong>
                  </td>
                  <td>
                    <span className="mode-pill">
                      {readableField(remark.category)}
                    </span>
                  </td>
                  <td>{remark.notes ?? "—"}</td>
                  <td>
                    <StatusPill
                      status={
                        remark.status === "active" ? "Active" : "Inactive"
                      }
                    />
                  </td>
                  {canManage ? (
                    <td>
                      <RecordActions
                        status={remark.status}
                        onEdit={() => onEditRemark(remark)}
                        onToggle={() => onRemarkStatus(remark)}
                        onDelete={() => onDeleteRemark(remark)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!remarks.length ? (
          <EmptyState
            icon="file"
            title="No remarks added"
            detail="Create attendance, employee, salary, employer, shift, or general remarks."
          />
        ) : null}
      </section>
    </div>
  );
}

function formatShiftTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function SettingsView({
  vendor,
  rules,
  canManage,
  isActing,
  onSave,
}: {
  vendor: Vendor;
  rules: PayrollRule | null;
  canManage: boolean;
  isActing: boolean;
  onSave: (rules: Record<string, unknown>) => Promise<boolean>;
}) {
  const earnings = [
    "Basic",
    "DA",
    "HRA",
    "Conveyance allowance",
    "Food allowance",
    "Night allowance",
    "OT wages",
    "Attendance bonus",
    "Arrears",
    "Holiday wages",
    "Sunday earnings",
    "Leave wages",
    "Room allowance",
    "Production incentive",
    "Medical allowance",
  ];
  const deductions = [
    "PF",
    "ESI",
    "Professional Tax",
    "LWF",
    "Canteen",
    "Snacks",
    "Rent / accommodation",
    "Advance",
    "Others",
    "TDS",
    "Medical insurance",
  ];
  const [form, setForm] = useState({
    ...defaultPayrollRules,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    ...rules,
  });
  function update(field: string, value: string | number | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  return (
    <div className="section-stack">
      <section className="rule-callout">
        <span>
          <Icon name="settings" />
        </span>
        <div>
          <strong>
            Salary and statutory rules are saved separately for {vendor.name}.
          </strong>
          <p>
            Enter only approved PF, ESI, tax, overtime and attendance settings.
            A zero statutory rate means that component is not automatically
            calculated.
          </p>
        </div>
      </section>
      <form
        className="panel rules-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canManage) void onSave(form);
        }}
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Entity-specific controls</span>
            <h2>Calculation rules</h2>
          </div>
          {canManage ? (
            <button
              className="primary-button"
              type="submit"
              disabled={isActing}
            >
              {isActing ? "Saving…" : "Save payroll rules"}
            </button>
          ) : (
            <span className="access-mode-note">
              <Icon name="eye" size={15} />
              View only
            </span>
          )}
        </div>
        <fieldset
          className="form-grid rules-grid rules-fieldset"
          disabled={!canManage}
        >
          <label>
            <span>Standard working days</span>
            <input
              type="number"
              min="1"
              max="31"
              value={form.standardWorkingDays}
              onChange={(event) =>
                update("standardWorkingDays", Number(event.target.value))
              }
              required
            />
          </label>
          <label>
            <span>PF employee rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.pfRate}
              onChange={(event) => update("pfRate", Number(event.target.value))}
            />
          </label>
          <label>
            <span>ESI employee rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.esiRate}
              onChange={(event) =>
                update("esiRate", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Professional tax (₹)</span>
            <input
              type="number"
              min="0"
              value={form.professionalTax}
              onChange={(event) =>
                update("professionalTax", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Labour welfare fund (₹)</span>
            <input
              type="number"
              min="0"
              value={form.lwf}
              onChange={(event) => update("lwf", Number(event.target.value))}
            />
          </label>
          <label>
            <span>Overtime hourly rate (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.overtimeHourlyRate}
              onChange={(event) =>
                update("overtimeHourlyRate", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>Effective from</span>
            <input
              type="date"
              value={form.effectiveFrom}
              onChange={(event) => update("effectiveFrom", event.target.value)}
              required
            />
          </label>
          <div className="rule-toggles">
            <label>
              <input
                type="checkbox"
                checked={Boolean(form.paidLeave)}
                onChange={(event) =>
                  update("paidLeave", event.target.checked ? 1 : 0)
                }
              />
              Approved leave is payable
            </label>
            <label>
              <input
                type="checkbox"
                checked={Boolean(form.paidWeekOff)}
                onChange={(event) =>
                  update("paidWeekOff", event.target.checked ? 1 : 0)
                }
              />
              Week offs / holidays are payable
            </label>
          </div>
        </fieldset>
      </form>
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Excel salary register</span>
              <h2>Earning components</h2>
            </div>
            <span className="muted-label">Edit inside each salary record</span>
          </div>
          <div className="tag-cloud">
            {earnings.map((item) => (
              <span key={item}>
                {item}
                <i>Enabled</i>
              </span>
            ))}
          </div>
          <div className="formula-box">
            <span>Gross earnings</span>
            <code>
              Basic → Medical Allowance (OT hours excluded; OT wages included)
            </code>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Excel salary register</span>
              <h2>Deduction components</h2>
            </div>
            <span className="muted-label">Edit inside each salary record</span>
          </div>
          <div className="tag-cloud">
            {deductions.map((item) => (
              <span key={item}>
                {item}
                <i>Enabled</i>
              </span>
            ))}
          </div>
          <div className="formula-box">
            <span>Net payable</span>
            <code>
              Gross − statutory − other − accommodation + return amount
            </code>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Attendance controls</span>
            <h2>Status code mapping</h2>
          </div>
          <span className="muted-label">
            Matches the original attendance workbook
          </span>
        </div>
        <div className="status-code-grid">
          {Object.entries(statusMeta).map(([code, meta]) => (
            <article key={code}>
              <b className={meta.className}>{code}</b>
              <div>
                <strong>{meta.label}</strong>
                <span>
                  {code === "P"
                    ? "Counts as present and payable"
                    : code === "A"
                      ? "Counts as absent and follow-up"
                      : code === "L"
                        ? "Approved leave; paid according to saved rules"
                        : code === "WO"
                          ? "Any rostered weekday off"
                          : code === "H"
                            ? "Company holiday"
                            : "Worked on WO/holiday; counts as present"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Approval governance</span>
            <h2>Recommended maker-checker workflow</h2>
          </div>
        </div>
        <div className="approval-grid">
          <article>
            <span>1</span>
            <div>
              <strong>HR Operations</strong>
              <p>Attendance, shift, week off, OT and employee master.</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <strong>Payroll Maker</strong>
              <p>
                Earnings, deductions, accommodation and exception resolution.
              </p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <strong>Accounts Checker</strong>
              <p>Totals, statutory mapping, bank readiness and variance.</p>
            </div>
          </article>
          <article>
            <span>4</span>
            <div>
              <strong>Authorised Approver</strong>
              <p>Final lock, payment export and audit trail.</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function PayrollDetail({
  item,
  onClose,
  onPayslip,
  onEdit,
  locked,
}: {
  item: PayrollItem;
  onClose: () => void;
  onPayslip: () => void;
  onEdit: () => void;
  locked: boolean;
}) {
  const earnings = [
    ["Basic", item.basic],
    ["DA", item.da],
    ["HRA", item.hra],
    ["Conveyance", item.conveyance],
    ["Food allowance", item.foodAllowance],
    ["Night allowance", item.nightAllowance],
    ["OT wages", item.overtimeWages],
    ["Attendance bonus", item.attendanceBonus],
    ["Arrears", item.arrears],
    ["Holiday wages", item.holidayWages],
    ["Sunday earnings", item.sundayEarnings ?? 0],
    ["Leave wages", item.leaveWages ?? 0],
    ["Room allowance", item.roomAllowance ?? 0],
    ["Production incentive", item.productionIncentive],
    ["Medical allowance", item.medicalAllowance],
  ] as Array<[string, number]>;
  const deductions = [
    ["PF", item.pfDeduction],
    ["ESI", item.esiDeduction],
    ["Professional Tax", item.professionalTax],
    ["LWF", item.lwf],
    ["Canteen", item.canteen],
    ["Snacks", item.snacks],
    ["Rent", item.tent],
    ["Advance", item.advance],
    ["Others", item.otherDeduction],
    ["TDS", item.tds],
    ["Medical insurance", item.medicalInsurance],
    ["Accommodation", item.accommodationDeduction],
  ] as Array<[string, number]>;
  return (
    <div className="drawer-layer">
      <button
        className="drawer-scrim"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="detail-drawer">
        <header>
          <div>
            <span className="eyebrow">Employee calculation</span>
            <h2>{item.employeeName}</h2>
            <p>
              {item.employeeCode} · {item.department}
            </p>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-status">
          <StatusPill
            status={item.validationStatus === "ready" ? "Ready" : "Review"}
          />
          {item.validationMessage ? (
            <span>
              <Icon name="alert" size={15} />
              {item.validationMessage}
            </span>
          ) : (
            <span>
              <Icon name="check" size={15} />
              All validation checks passed
            </span>
          )}
        </div>
        <section>
          <h3>Attendance inputs</h3>
          <div className="detail-metrics">
            <div>
              <span>Present</span>
              <strong>{item.presentDays}</strong>
            </div>
            <div>
              <span>Absent</span>
              <strong>{item.absentDays}</strong>
            </div>
            <div>
              <span>Leave</span>
              <strong>{item.leaveDays}</strong>
            </div>
            <div>
              <span>WO / H</span>
              <strong>{item.weekOffDays}</strong>
            </div>
            <div>
              <span>HP</span>
              <strong>{item.holidayPresentDays}</strong>
            </div>
            <div>
              <span>OT hours</span>
              <strong>{item.overtimeHours}</strong>
            </div>
          </div>
        </section>
        <section>
          <h3>Earnings</h3>
          <div className="calculation-list">
            {earnings.map(([label, value]) =>
              value ? (
                <div key={label}>
                  <span>{label}</span>
                  <b>{money(value)}</b>
                </div>
              ) : null,
            )}
            <div className="calculation-total">
              <span>Gross earnings</span>
              <b>{money(item.grossEarnings)}</b>
            </div>
          </div>
        </section>
        <section>
          <h3>Company Salary Deductions</h3>
          <div className="calculation-list">
            {deductions
              .filter(([label]) => label !== "Accommodation")
              .map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <span>{label}</span>
                    <b>{money(value)}</b>
                  </div>
                ) : null,
              )}
            <div className="calculation-total">
              <span>Total company deductions</span>
              <b>{money(item.totalDeductions - item.accommodationDeduction)}</b>
            </div>
            <div className="calculation-total" style={{ borderTop: "1px dashed var(--border)", paddingTop: "4px" }}>
              <span>Payslip Net Salary (Company Take-Home)</span>
              <b>{money(item.importedNetPayable || Math.max(0, item.grossEarnings - (item.totalDeductions - item.accommodationDeduction)))}</b>
            </div>
          </div>
        </section>
        {item.accommodationDeduction > 0 ? (
          <section>
            <h3>Internal Hostel Deductions</h3>
            <div className="calculation-list">
              <div>
                <span>Hostel / Staff recoveries</span>
                <b style={{ color: "var(--danger)" }}>- {money(item.accommodationDeduction)}</b>
              </div>
            </div>
          </section>
        ) : null}
        <div className="net-summary">
          <span>Final net payable (Disbursement)</span>
          <strong>{money(item.netPayable)}</strong>
          <small>
            {item.paymentMode === "bank" ? "Bank transfer" : "Cash payment"} ·{" "}
            {item.accommodationType}
          </small>
        </div>
        <footer>
          {!locked ? (
            <button className="secondary-button" onClick={onEdit}>
              Edit salary
            </button>
          ) : (
            <button className="secondary-button" onClick={onClose}>
              Close
            </button>
          )}
          <button className="primary-button" onClick={onPayslip}>
            <Icon name="file" size={16} />
            View payslip
          </button>
        </footer>
      </aside>
    </div>
  );
}

function PayslipSheet({
  item,
  employee,
  vendor,
  unit,
  run,
  period,
}: {
  item: PayrollItem;
  employee?: Employee;
  vendor: Vendor;
  unit: ClientUnit;
  run: PayrollRun | null;
  period: string;
}) {
  // JOY_PAYSLIP_UPLOADED_HEADERS_NONZERO_V1_APPLIED
  const uploadedEarningFieldOrder = [
    "basic", "holidayWages", "da", "hra", "conveyance", "foodAllowance", "nightAllowance",
    "overtimeWages", "attendanceBonus", "arrears",
    "sundayEarnings", "leaveWages", "roomAllowance",
    "productionIncentive", "medicalAllowance",
  ];
  const uploadedDeductionFieldOrder = [
    "pfDeduction", "esiDeduction", "professionalTax", "lwf", "canteen",
    "snacks", "tent", "advance", "otherDeduction", "tds", "medicalInsurance",
  ];
  const sourceEarningFields = run?.processingMode === "salary_import"
    ? uploadedEarningFieldOrder
    : configuredFields(unit.payslipEarningsJson, earningFields);
  const sourceDeductionFields = run?.processingMode === "salary_import"
    ? uploadedDeductionFieldOrder
    : configuredFields(unit.payslipDeductionsJson, deductionFields);

  const range = run
    ? payrollPeriodRange(run.payPeriod, run.periodStart, run.periodEnd)
    : null;
  const employerTitle =
    vendor.name === "Joy Manpower Service" || vendor.id === "vendor-jms" || /joy.*man.*power/i.test(unit.payslipTitle ?? "")
      ? "Joy Manpower Service"
      : (unit.payslipTitle ?? vendor.legalName ?? unit.clientName);

  const calendarDays = item.fixedWorkingDays || unit.attendanceWorkingDays || 26;
  const isDailyBasis = item.salaryBasis === "daily" || employee?.salaryBasis === "daily";
  const dailyRate = (isDailyBasis && employee?.salaryAmount && Number(employee.salaryAmount) > 0)
    ? Number(employee.salaryAmount)
    : (item.payableDays > 0
      ? Math.round(((item.basic + (item.arrears || 0) + (item.da || 0)) / item.payableDays) * 100) / 100
      : (item.fixedWorkingDays > 0
        ? Math.round(((item.basic + (item.arrears || 0) + (item.da || 0)) / item.fixedWorkingDays) * 100) / 100
        : (employee?.salaryAmount ? Math.round((employee.salaryAmount / calendarDays) * 100) / 100 : 0)));
  const otHourlyRate = (item.overtimeHours > 0 && item.overtimeWages > 0)
    ? Math.round((item.overtimeWages / item.overtimeHours) * 100) / 100
    : (dailyRate > 0 ? Math.round((dailyRate / 8) * 100) / 100 : 0);

  const nfhDaysCount = Number(item.nfhDays || 0) || (item.payableDays > item.presentDays ? Math.max(0, Math.round((item.payableDays - item.presentDays) * 10) / 10) : 0);
  const rawNfhWages = Number(item.holidayWages || 0);
  const nfhWagesAmount = rawNfhWages > 0 ? rawNfhWages : (nfhDaysCount > 0 ? Math.round(nfhDaysCount * (dailyRate || ((item.basic + (item.da || 0)) / Math.max(1, item.payableDays)))) : 0);

  const isWageGapArrears = item.arrears > 0 && dailyRate > 0 && (
    Math.abs((item.basic + item.arrears) - (dailyRate * (item.payableDays || item.presentDays || 1))) <= 5 ||
    (item.payableDays > 0 && Math.abs(((item.basic + item.arrears) / item.payableDays) - dailyRate) <= 0.5)
  );
  const totalBaseWages = isWageGapArrears ? (item.basic + item.arrears) : item.basic;
  const wagesAmount = rawNfhWages > 0 ? totalBaseWages : Math.max(0, totalBaseWages - nfhWagesAmount);

  const earnings: Array<{ field: string; label: string; units: string; value: number }> = [];
  if (wagesAmount > 0 || item.basic > 0) {
    earnings.push({
      field: "basic",
      label: "Wages",
      units: nfhDaysCount > 0 && item.presentDays ? `${item.presentDays} Days` : (item.payableDays ? `${item.payableDays} Days` : "—"),
      value: wagesAmount,
    });
  }
  if (nfhDaysCount > 0 && nfhWagesAmount > 0) {
    earnings.push({
      field: "holidayWages",
      label: "NFH Wages",
      units: `${nfhDaysCount} Day${nfhDaysCount > 1 ? "s" : ""}`,
      value: nfhWagesAmount,
    });
  }
  sourceEarningFields.forEach((field) => {
    if (field === "basic" || field === "holidayWages") return;
    if (field === "arrears" && isWageGapArrears) return;
    const value = Number(item[field as keyof PayrollItem] ?? 0);
    if (value === 0) return;
    let units = "—";
    if (field === "overtimeWages") {
      units = item.overtimeHours ? `${item.overtimeHours} Hrs` : "—";
    } else if (field === "leaveWages") {
      const days = item.leaveDays || (Number(item.clDays || 0) + Number(item.plDays || 0) + Number(item.slDays || 0) + Number(item.compOffDays || 0));
      units = days ? `${days} Days` : "—";
    } else if (field === "sundayEarnings") {
      units = item.weekOffDays ? `${item.weekOffDays} Days` : "—";
    } else if (["da", "hra", "conveyance", "foodAllowance"].includes(field)) {
      units = item.payableDays ? `${item.payableDays} Days` : "—";
    }
    earnings.push({
      field,
      label: readableField(field),
      units,
      value,
    });
  });

  const payslipHiddenRecoveryFields = new Set([
    "accommodationDeduction",
    "gasShare",
    "rationShare",
    "provisionShare",
  ]);

  const deductions = sourceDeductionFields
    .filter((field) => !payslipHiddenRecoveryFields.has(field))
    .map((field) => {
      const value = Number(item[field as keyof PayrollItem] ?? 0);
      let displayLabel = readableField(field);
      let rateTag = "Statutory";
      if (field === "pfDeduction") {
        displayLabel = "PF (12%)";
        rateTag = "12%";
      } else if (field === "esiDeduction") {
        displayLabel = "ESI (0.75%)";
        rateTag = "0.75%";
      } else if (field === "tent") {
        displayLabel = "Rent Deduction";
        rateTag = "Recovery";
      } else if (field === "advance") {
        displayLabel = "Token / Advance";
        rateTag = "Recovery";
      } else if (field === "canteen") {
        displayLabel = "Canteen";
        rateTag = "Recovery";
      } else if (["snacks", "otherDeduction"].includes(field)) {
        rateTag = "Recovery";
      } else if (field === "tds") {
        rateTag = "Tax";
      }
      return {
        field,
        label: displayLabel,
        rateTag,
        value,
      };
    })
    .filter((d) => d.value !== 0);

  // JOY_HYBRID_PAYSLIP_EXCEL_FIDELITY_V1:
  // Payslips strictly reflect the uploaded Excel sheet without software recovery ledger additions.
  const payslipGrossEarnings = item.importedGrossEarnings && Number(item.importedGrossEarnings) > 0
    ? Number(item.importedGrossEarnings)
    : Number(item.grossEarnings || 0);

  const payslipTotalDeductions = item.importedTotalDeductions && Number(item.importedTotalDeductions) > 0
    ? Number(item.importedTotalDeductions)
    : Math.max(
      0,
      deductions.reduce((sum, d) => sum + d.value, 0),
    );

  const payslipNetPayable = item.importedNetPayable && Number(item.importedNetPayable) > 0
    ? Number(item.importedNetPayable)
    : Math.max(0, payslipGrossEarnings - payslipTotalDeductions);

  const calculatedNet = Math.max(0, Math.round((payslipGrossEarnings - payslipTotalDeductions) * 100) / 100);
  const hasMathDiscrepancy = Boolean(
    (item.importedGrossEarnings || item.grossEarnings) &&
    (item.importedNetPayable || item.netPayable) &&
    Math.abs(payslipNetPayable - calculatedNet) >= 0.5
  );

  const formatAccountNo = (val?: string | null) => {
    if (!val) return "-";
    const raw = String(val).trim();
    if (/^[0-9.]+[eE][+-]?[0-9]+$/.test(raw)) {
      try {
        const num = Number(raw);
        if (Number.isFinite(num)) {
          return BigInt(Math.round(num)).toString();
        }
      } catch { }
    }
    return raw || "-";
  };

  const formatDateJoining = (d?: string | null) => {
    if (!d) return "—";
    const parts = d.slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
  };

  const bankAccountDisplay = formatAccountNo(employee?.bankAccountMasked || item.bankAccountMasked);
  const ifscDisplay = employee?.ifscMasked?.trim() || item.ifscMasked?.trim() || "-";
  const ifscAndBankDisplay = [ifscDisplay !== "-" && ifscDisplay !== "—" ? ifscDisplay : null, employee?.bankName].filter(Boolean).join(" · ") || ifscDisplay;

  const maxTableRows = Math.max(earnings.length, deductions.length, 1);
  const paddedEarnings = [...earnings];
  while (paddedEarnings.length < maxTableRows) {
    paddedEarnings.push({
      field: `empty-earn-${paddedEarnings.length}`,
      label: "",
      units: "",
      value: 0,
      isEmpty: true,
    } as any);
  }
  const paddedDeductions = [...deductions];
  while (paddedDeductions.length < maxTableRows) {
    paddedDeductions.push({
      field: `empty-ded-${paddedDeductions.length}`,
      label: "",
      rateTag: "",
      value: 0,
      isEmpty: true,
    } as any);
  }

  return (
    <article className="payslip-sheet payslip-half-a4">
      <header className="payslip-header-v2">
        <div className="payslip-brand">
          {vendor.logoDataUrl ? (
            <img
              className="payslip-company-logo"
              src={vendor.logoDataUrl}
              alt={`${vendor.name} logo`}
            />
          ) : (
            <div className="payslip-logo">JOY</div>
          )}
          <div className="payslip-header-titles">
            <h2>EMPLOYEE SALARY SLIP</h2>
            <strong className="payslip-period-tag">{monthLabel(period).toUpperCase()}</strong>
          </div>
        </div>
      </header>

      <section className="payslip-company">
        <h3>{employerTitle}</h3>
        <p>
          {(unit.payslipSubtitle && !/^(payslip|pay slip)$/i.test(unit.payslipSubtitle.trim()))
            ? unit.payslipSubtitle
            : (unit.clientName || `Work Location: ${unit.clientName} · ${unit.unitName}`)}
        </p>
        <p>{unit.payslipAddress ?? "No.16, Krishna complex, Avinashi - Coimbatore Rd, Thennampalayam, Arasur, Coimbatore, Tamil Nadu 641407"}</p>
        <span className="payslip-contact-strip">
          {unit.payslipContact ??
            "Contact 7845966580, ESI/PF contact 7845966580, Manager 7845966580, MD 9080776580"}
        </span>
      </section>

      <div className="payslip-meta">
        <div>
          <span>Employee ID</span>
          <strong>{item.employeeCode}</strong>
        </div>
        <div>
          <span>Employee Name</span>
          <strong>{item.employeeName}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{item.department || "General"}</strong>
        </div>
        <div>
          <span>Work Location / Unit</span>
          <strong>
            {unit.clientName} · {unit.unitName}
          </strong>
        </div>
        <div className={nfhDaysCount > 0 ? "" : "payslip-period-col"}>
          <span>Payroll Period</span>
          <strong>
            {range
              ? `${range.start} to ${range.inclusiveEnd}`
              : monthLabel(period)}
          </strong>
        </div>
        {nfhDaysCount > 0 ? (
          <div>
            <span>NFH Days</span>
            <strong>{nfhDaysCount} Day{nfhDaysCount > 1 ? "s" : ""}</strong>
          </div>
        ) : null}
        <div>
          <span>Payable Days</span>
          <strong>{item.payableDays} Days</strong>
        </div>
        <div>
          <span>W Days (Present)</span>
          <strong>{item.presentDays} Days</strong>
        </div>
      </div>

      <div className="payslip-rates-strip" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div>
          <span>Pay Monthly/Daily</span>
          <strong>
            {item.salaryBasis === "daily" || employee?.salaryBasis === "daily" || (dailyRate > 0 && dailyRate < 4000)
              ? "Daily"
              : "Monthly"}
          </strong>
        </div>
        <div>
          <span>Calendar Working Days</span>
          <strong>{calendarDays} Days</strong>
        </div>
        <div>
          <span>Wages / Day Rate</span>
          <strong>{dailyRate > 0 ? money(dailyRate) : "—"}</strong>
        </div>
        <div>
          <span>OT Rate / Hour</span>
          <strong>{otHourlyRate > 0 ? money(otHourlyRate) : "—"}</strong>
        </div>
        <div>
          <span>OT Hours</span>
          <strong>{item.overtimeHours ? `${item.overtimeHours} Hrs` : "0 Hrs"}</strong>
        </div>
      </div>

      {/* Horizontal Statutory & Banking Details Strip */}
      <div className="payslip-bank-strip">
        <div className="payslip-bank-col">
          <span className="payslip-bank-label">UAN / EPF Number</span>
          <strong className="payslip-bank-val">{employee?.uanMasked?.trim() ? employee.uanMasked : "-"}</strong>
        </div>
        <div className="payslip-bank-col">
          <span className="payslip-bank-label">ESI Number</span>
          <strong className="payslip-bank-val">{employee?.esiMasked?.trim() ? employee.esiMasked : "-"}</strong>
        </div>
        <div className="payslip-bank-col">
          <span className="payslip-bank-label">Bank Account Number</span>
          <strong className="payslip-bank-val">{bankAccountDisplay}</strong>
        </div>
        <div className="payslip-bank-col">
          <span className="payslip-bank-label">IFSC Code & Bank Name</span>
          <strong className="payslip-bank-val">{ifscAndBankDisplay}</strong>
        </div>
      </div>

      <div className="payslip-columns payslip-units-table">
        <section>
          <h4>
            <span className="col-comp">Earnings</span>
            <span className="col-units">Units</span>
            <span className="col-amt">Amount</span>
          </h4>
          {paddedEarnings.map((e: any) => (
            <div key={e.field} className={e.isEmpty ? "payslip-empty-row" : ""}>
              <span className="col-comp">{e.label || "\u00A0"}</span>
              <span className="col-units">{e.units || "\u00A0"}</span>
              <b className="col-amt">{e.isEmpty ? "\u00A0" : (e.value ? money(e.value) : "—")}</b>
            </div>
          ))}
          <footer>
            <span className="col-comp">Gross Earnings</span>
            <span className="col-units"></span>
            <b className="col-amt">{money(payslipGrossEarnings)}</b>
          </footer>
        </section>
        <section>
          <h4>
            <span className="col-comp">Deductions</span>
            <span className="col-units">Rate / Type</span>
            <span className="col-amt">Amount</span>
          </h4>
          {paddedDeductions.map((d: any) => (
            <div key={d.field} className={d.isEmpty ? "payslip-empty-row" : ""}>
              <span className="col-comp">{d.label || "\u00A0"}</span>
              <span className="col-units">{d.rateTag || "\u00A0"}</span>
              <b className="col-amt">{d.isEmpty ? "\u00A0" : (d.value ? money(d.value) : "—")}</b>
            </div>
          ))}
          <footer>
            <span className="col-comp">Total Deductions</span>
            <span className="col-units"></span>
            <b className="col-amt">{money(payslipTotalDeductions)}</b>
          </footer>
        </section>
      </div>

      {([item.importedGrossEarnings, item.importedTotalDeductions, item.importedNetPayable].some((value) => value !== null && Number(value) !== 0)) ? (
        <div className={`form-note payslip-import-check ${hasMathDiscrepancy ? "payslip-discrepancy-note" : ""}`}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {hasMathDiscrepancy ? (
              <><AlertTriangle size={14} style={{ color: "#d97706" }} /> Excel Register Check (Difference Detected)</>
            ) : (
              <><CheckCircle2 size={14} style={{ color: "#16a34a" }} /> Excel Register Verified</>
            )}
          </strong>
          <span>Source Gross: {money(item.importedGrossEarnings ?? item.grossEarnings)} · Source Deductions: {money(item.importedTotalDeductions ?? payslipTotalDeductions)} · Source Net: {money(payslipNetPayable)}</span>
          {hasMathDiscrepancy ? (
            <span style={{ display: "block", marginTop: "3px", color: "#b45309", fontSize: "11px" }}>
              Note: Gross − Deductions = {money(calculatedNet)}, while uploaded Excel Net is {money(payslipNetPayable)}. Displaying exact Excel value.
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="payslip-net">
        <div>
          <div>
            <span>Net Take-Home Pay</span>
            <small className="payslip-mode-badge">{item.paymentMode === "bank" ? "Direct Bank Transfer" : "Cash Payment"}</small>
          </div>
          <strong>{money(payslipNetPayable)}</strong>
        </div>
        <p>
          <span>Amount in Words</span>
          <b>{numberToWordsIndian(Math.round(payslipNetPayable))} Rupees Only</b>
        </p>
      </div>

      {payslipGrossEarnings < payslipTotalDeductions ? (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", padding: "6px 12px", borderRadius: "6px" }}>
          <strong>Notice:</strong> Deductions exceed earnings by {money(payslipTotalDeductions - payslipGrossEarnings)}. Unrecovered amount will be adjusted in next month&apos;s salary cycle.
        </div>
      ) : null}

      <footer className="payslip-footnote">
        ***{" "}
        {unit.payslipFooter ??
          "This is a computer-generated payslip and does not require a physical signature."}{" "}
        ***
      </footer>
    </article>
  );
}

function PayslipModal({
  item,
  employee,
  vendor,
  unit,
  run,
  period,
  canExport,
  apiEndpoint,
  accessToken,
  publishableKey,
  onClose,
}: {
  item: PayrollItem;
  employee?: Employee;
  vendor: Vendor;
  unit: ClientUnit;
  run: PayrollRun | null;
  period: string;
  canExport: boolean;
  apiEndpoint: string;
  accessToken?: string;
  publishableKey?: string;
  onClose: () => void;
}) {
  // JOY_SMTP_PAYSLIP_MAILER_V1
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  async function sendSalarySlipEmail() {
    if (emailSending) return;
    setEmailSent(false);
    if (!employee?.emailAddress) {
      setEmailMessage("Add Employee Email ID in Employee Master before sending the salary slip.");
      return;
    }
    if (!run?.id || run.status !== "approved") {
      setEmailMessage("Approve payroll before sending salary slips.");
      return;
    }
    setEmailSending(true);
    setEmailMessage("");
    try {
      const response = await fetch("https://okhntjppzyweeqjrxbdr.supabase.co/functions/v1/salary-slip-mailer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({ itemId: item.id }),
      });
      const payload = await response.json().catch(() => ({})) as { sent?: boolean; recipient?: string; error?: string; message?: string };
      if (!response.ok || !payload.sent) throw new Error(payload.error ?? payload.message ?? `SMTP mailer failed (HTTP ${response.status})`);
      setEmailSent(true);
      setEmailMessage(`Salary slip sent to ${payload.recipient ?? employee.emailAddress}`);
    } catch (error) {
      setEmailMessage(error instanceof Error ? error.message : "Unable to send salary slip email");
    } finally {
      setEmailSending(false);
    }
  }
  return (
    <div className="modal-layer">
      <button
        className="modal-scrim"
        aria-label="Close payslip"
        onClick={onClose}
      />
      <div className="payslip-modal">
        <div className="modal-toolbar">
          <div>
            <strong>Half-A4 salary slip</strong>
            <span>{unit.clientName} · two slips can fit on one A4 sheet</span>
          </div>
          <div>
            {emailMessage ? <span className={emailSent ? "field-ready" : "field-pending"}>{emailMessage}</span> : null}
            <button
              type="button"
              className="primary-button"
              disabled={emailSending}
              title={!employee?.emailAddress ? "Add Employee Email ID in Employee Master" : run?.status !== "approved" ? "Approve payroll before sending salary slips" : "Send salary slip PDF directly by SMTP"}
              onClick={(event) => { event.preventDefault(); event.stopPropagation(); void sendSalarySlipEmail(); }}
            >
              {emailSending ? "Sending…" : emailSent ? "Email sent" : "Send salary slip email"}
            </button>
            {canExport ? (
              <button
                className="secondary-button"
                onClick={() => window.print()}
              >
                <Icon name="download" size={16} />
                Print / Save PDF
              </button>
            ) : null}
            <button className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <PayslipSheet
          item={item}
          employee={employee}
          vendor={vendor}
          unit={unit}
          run={run}
          period={period}
        />
      </div>
    </div>
  );
}

function BulkPayslipModal({
  items,
  employees,
  vendor,
  unit,
  run,
  canEmail,
  accessToken,
  publishableKey,
  onClose,
}: {
  items: PayrollItem[];
  employees: Employee[];
  vendor: Vendor;
  unit: ClientUnit;
  run: PayrollRun;
  canEmail: boolean;
  accessToken?: string;
  publishableKey?: string;
  onClose: () => void;
}) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSummary, setEmailSummary] = useState("");

  function printBulkPayslips() {
    const source = document.querySelector<HTMLElement>(".bulk-payslip-modal .bulk-payslip-pages");
    if (!source) return;
    void printIsolatedElement(source, "payslips");
  }

  async function sendAllSalarySlips() {
    if (emailSending || !canEmail || run.status !== "approved" || !items.length) return;
    setEmailSending(true);
    setEmailSummary("");
    try {
      const response = await fetch("https://okhntjppzyweeqjrxbdr.supabase.co/functions/v1/salary-slip-mailer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({ runId: run.id, sendAll: true }),
      });
      const payload = await response.json().catch(() => ({})) as {
        sentCount?: number;
        skippedCount?: number;
        failedCount?: number;
        total?: number;
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? payload.message ?? `Unable to send salary slips (HTTP ${response.status})`);
      const total = payload.total ?? items.length;
      const sent = payload.sentCount ?? 0;
      const skipped = payload.skippedCount ?? 0;
      const failed = payload.failedCount ?? 0;
      setEmailSummary(`Sent ${sent} of ${total} salary slips${skipped ? ` · ${skipped} missing email` : ""}${failed ? ` · ${failed} failed` : ""}.`);
    } catch (error) {
      setEmailSummary(error instanceof Error ? error.message : "Unable to send salary slips");
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="modal-layer">
      <button className="modal-scrim" onClick={onClose} />
      <div className="payslip-modal bulk-payslip-modal">
        <div className="modal-toolbar">
          <div>
            <strong>Bulk employee salary slips</strong>
            <span>
              {items.length} employees · one employee per A4 salary-slip page
            </span>
          </div>
          <div>
            {emailSummary ? <span className={emailSummary.startsWith("Sent ") ? "field-ready" : "field-pending"}>{emailSummary}</span> : null}
            {canEmail ? (
              <button
                className="primary-button"
                type="button"
                disabled={emailSending || run.status !== "approved" || !items.length}
                title={run.status !== "approved" ? "Approve payroll before sending salary slips" : "Send one salary slip PDF to every employee with an email address"}
                onClick={() => void sendAllSalarySlips()}
              >
                {emailSending ? "Sending to all…" : "Send salary slips to all"}
              </button>
            ) : null}
            <button className="primary-button" type="button" onClick={printBulkPayslips}>
              Print / Save bulk PDF
            </button>
            <button className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="bulk-payslip-pages">
          {items.map((item) => (
            <PayslipSheet
              key={item.id}
              item={item}
              employee={employees.find((employee) => employee.id === item.employeeId)}
              vendor={vendor}
              unit={unit}
              run={run}
              period={run.payPeriod}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileModal({
  profile,
  busy,
  onClose,
  onSave,
  onChangePassword,
}: {
  profile: AppUserProfile;
  busy: boolean;
  onClose: () => void;
  onSave: (details: Record<string, unknown>) => Promise<void>;
  onChangePassword?: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(Object.fromEntries(new FormData(event.currentTarget)));
  }
  async function changePassword() {
    setPasswordMessage("");
    if (password.length < 12) {
      setPasswordMessage("Password must contain at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMessage("The passwords do not match.");
      return;
    }
    if (!onChangePassword) {
      setPasswordMessage(
        "Password change is available on the Supabase production login.",
      );
      return;
    }
    try {
      await onChangePassword(password);
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed successfully.");
    } catch (error) {
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Password could not be changed.",
      );
    }
  }
  return (
    <div className="modal-layer action-modal-layer">
      <button
        className="modal-scrim"
        aria-label="Close profile"
        onClick={onClose}
      />
      <div className="action-modal">
        <header className="action-modal-header">
          <div>
            <span className="eyebrow">My account</span>
            <h2>Profile & password</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="action-modal-body">
          <form
            className="form-grid"
            onSubmit={(event) => void saveProfile(event)}
          >
            <label>
              <span>Employee code</span>
              <input value={profile.employeeCode ?? ""} disabled />
            </label>
            <label>
              <span>Sign-in email</span>
              <input value={profile.email} disabled />
            </label>
            <label>
              <span>Full name *</span>
              <input
                name="fullName"
                defaultValue={profile.fullName ?? ""}
                required
              />
            </label>
            <label>
              <span>Department</span>
              <input
                name="department"
                defaultValue={profile.department ?? ""}
              />
            </label>
            <label>
              <span>Mobile number</span>
              <input
                name="mobileNumber"
                defaultValue={profile.mobileNumber ?? ""}
              />
            </label>
            <button className="primary-button form-span" disabled={busy}>
              Save profile
            </button>
          </form>
          <section className="profile-password-panel">
            <h3>Change password</h3>
            <label>
              <span>New password</span>
              <input
                type="password"
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                minLength={12}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            {passwordMessage ? <p>{passwordMessage}</p> : null}
            <button
              className="secondary-button"
              onClick={() => void changePassword()}
            >
              Change password
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyPayroll({
  unit,
  canCreate,
  canImport,
  canOpenClients,
  onGoToVendors,
  onCreate,
  onImport,
}: {
  unit: ClientUnit | null;
  canCreate: boolean;
  canImport: boolean;
  canOpenClients: boolean;
  onGoToVendors: () => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <section className="panel empty-payroll">
      <span>
        <Icon name="calculator" size={28} />
      </span>
      <h2>
        {unit
          ? "No payroll run for this unit"
          : "No employer unit is available"}
      </h2>
      <p>
        {unit
          ? `${unit.clientName} · ${unit.unitName} is ready. A permitted team member can create a monthly salary run or import an Excel workbook.`
          : "A permitted team member can add the client and its employer or factory unit."}
      </p>
      <div>
        {unit && canCreate ? (
          <button className="primary-button" onClick={onCreate}>
            Create payroll run
          </button>
        ) : null}
        {unit && canImport ? (
          <button className="secondary-button" onClick={onImport}>
            Import Excel
          </button>
        ) : null}
        {canOpenClients ? (
          <button className="secondary-button" onClick={onGoToVendors}>
            Open clients & employers
          </button>
        ) : null}
        {!canCreate && !canImport && !canOpenClients ? (
          <span className="access-mode-note">
            <Icon name="eye" size={15} />
            View-only access
          </span>
        ) : null}
      </div>
    </section>
  );
}

function readableField(value: string) {
  const overrides: Record<string, string> = {
    basic: "Wages",
    holidayWages: "NFH Wages",
    da: "DA",
    hra: "HRA",
    pfDeduction: "PF",
    esiDeduction: "ESI",
    lwf: "LWF",
    tds: "TDS",
    tent: "Rent",
    idCard: "ID card",
    aadhaarUpdate: "Aadhaar update",
    tshirt: "T-shirt",
    ifscMasked: "IFSC",
    uanMasked: "UAN",
    esiMasked: "ESI number",
    sundayEarnings: "Sunday earnings",
    leaveWages: "Leave wages",
    roomAllowance: "Room allowance",
  };
  return (
    overrides[value] ??
    value
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (character) => character.toUpperCase())
  );
}

function followingMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function unitAttendanceCycle(period: string, unit: ClientUnit | null) {
  if (!unit) return calendarPeriod(period);
  const [year, month] = period.split("-").map(Number);
  const date = (targetYear: number, targetMonth: number, day: number) => {
    const maximum = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, maximum)).padStart(2, "0")}`;
  };
  if (unit.attendanceCycleStartDay <= unit.attendanceCycleEndDay)
    return {
      start: date(year, month, unit.attendanceCycleStartDay),
      end: date(year, month, unit.attendanceCycleEndDay),
    };
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return {
    start: date(
      previous.getUTCFullYear(),
      previous.getUTCMonth() + 1,
      unit.attendanceCycleStartDay,
    ),
    end: date(year, month, unit.attendanceCycleEndDay),
  };
}

function configuredFields(
  json: string | null | undefined,
  defaults: readonly string[],
) {
  try {
    const fields = JSON.parse(json ?? "[]");
    return Array.isArray(fields) && fields.length
      ? fields.map(String)
      : [...defaults];
  } catch {
    return [...defaults];
  }
}

function EmployeePhotoPicker({
  photo,
  onChange,
}: {
  photo: string;
  onChange: (dataUrl: string) => void;
}) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    setCameraError("");
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? err.message
          : "Could not access camera. Please check camera permissions or browse a file.",
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 400;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onChange(dataUrl);
    stopCamera();
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="form-span employee-photo-picker-container" style={{ margin: "4px 0" }}>
      <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "13px" }}>
        Employee photo for ID card
      </label>
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            width: "90px",
            height: "110px",
            borderRadius: "8px",
            border: "2px dashed #cbd5e1",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Employee ID preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "11px", padding: "4px" }}>
              <User size={24} style={{ display: "block", margin: "0 auto 2px", color: "#94a3b8" }} />
              No photo
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: "220px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary-button"
              style={{ padding: "6px 14px", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={startCamera}
            >
              <Camera size={14} /> Take Photo with Camera
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpen size={14} /> Browse File
            </button>
            {photo && (
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 10px", fontSize: "12px", color: "#b91c1c", borderColor: "#fca5a5", display: "inline-flex", alignItems: "center", gap: "4px" }}
                onClick={() => onChange("")}
              >
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 1024 * 1024 * 3) {
                window.alert("Choose an image smaller than 3 MB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  const maxDim = 600;
                  let w = img.width;
                  let h = img.height;
                  if (w > maxDim || h > maxDim) {
                    if (w > h) {
                      h = Math.round((h * maxDim) / w);
                      w = maxDim;
                    } else {
                      w = Math.round((w * maxDim) / h);
                      h = maxDim;
                    }
                  }
                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    onChange(canvas.toDataURL("image/jpeg", 0.88));
                  } else {
                    onChange(String(reader.result ?? ""));
                  }
                };
                img.src = String(reader.result ?? "");
              };
              reader.readAsDataURL(file);
              event.target.value = "";
            }}
          />
          <small style={{ color: "#64748b", fontSize: "11.5px" }}>
            {photo
              ? "Photo ready for ID card generation. You can retake or choose another file."
              : "Recommended: Take a front-facing portrait with camera or choose a passport photo."}
          </small>
        </div>
      </div>
      {isCameraOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "20px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              alignItems: "center",
            }}
          >
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "16px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Camera size={18} style={{ color: "#2563eb" }} /> Capture ID Card Photo
              </strong>
              <button
                type="button"
                onClick={stopCamera}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ×
              </button>
            </div>
            {cameraError ? (
              <div style={{ padding: "12px", background: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "13px", width: "100%" }}>
                {cameraError}
              </div>
            ) : (
              <div
                style={{
                  width: "320px",
                  height: "380px",
                  background: "#000",
                  borderRadius: "10px",
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "25px 35px",
                    border: "2px dashed rgba(255,255,255,0.6)",
                    borderRadius: "8px",
                    pointerEvents: "none",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", width: "100%", justifyContent: "flex-end" }}>
              <button type="button" className="secondary-button" onClick={stopCamera}>
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={capturePhoto}
                  style={{ background: "#059669", borderColor: "#047857", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Camera size={14} /> Capture &amp; Use Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type AttendanceMismatch = {
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  oldStatus: string;
  newStatus: string;
  oldOt: number;
  newOt: number;
  changeType: "ot_changed" | "status_changed" | "both_changed";
  description: string;
};

function PayrollActionModal({
  loadApplicationDocuments,
  modal,
  vendors,
  units,
  hostels,
  accommodationTypes,
  rooms,
  employees,
  allEmployees = [],
  appUsers = [],
  shifts,
  remarks,
  unit,
  vendorId,
  currentPeriod,
  currentRun,
  attendance = [],
  busy,
  onClose,
  onAction,
  apiEndpoint = "/api/app-data",
  accessToken,
  publishableKey,
}: {
  loadApplicationDocuments: ApplicationRequest;
  modal: ActiveModal;
  vendors: Vendor[];
  units: ClientUnit[];
  hostels: Hostel[];
  accommodationTypes: AccommodationType[];
  rooms: AccommodationRoom[];
  employees: Employee[];
  allEmployees?: Employee[];
  appUsers?: AppUserProfile[];
  shifts: ShiftDefinition[];
  remarks: PayrollRemark[];
  unit: ClientUnit | null;
  vendorId: string;
  currentPeriod: string;
  currentRun: PayrollRun | null;
  attendance?: AttendanceEntry[];
  busy: boolean;
  onClose: () => void;
  onAction: (
    action: string,
    message: string,
    details?: Record<string, unknown>,
  ) => Promise<boolean>;
  apiEndpoint?: string;
  accessToken?: string;
  publishableKey?: string;
}) {
  const [importPeriod, setImportPeriod] = useState(currentPeriod);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<WorkbookImport | null>(null);
  const [parseError, setParseError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [attendanceMismatches, setAttendanceMismatches] = useState<AttendanceMismatch[]>([]);
  const [showMismatchPopup, setShowMismatchPopup] = useState(false);
  const [mismatchSearch, setMismatchSearch] = useState("");
  const accessProfile = modal.kind === "app-user" ? modal.profile : undefined;
  const initialRole: UserRole = accessProfile?.role === "vendor" || Boolean(accessProfile?.department?.startsWith("Vendor:"))
    ? "vendor"
    : (accessProfile?.role ?? (modal.kind === "app-user" && modal.defaultRole ? modal.defaultRole : "hr_team"));
  const [userRole, setUserRole] = useState<UserRole>(initialRole);
  const [permissionDraft, setPermissionDraft] = useState<PermissionMap>(() => ({
    ...(accessProfile?.permissions ?? DEFAULT_PERMISSIONS[initialRole]),
  }));
  const [approvalDraft, setApprovalDraft] = useState(
    accessProfile?.canApprovePayroll ?? DEFAULT_APPROVAL_ACCESS[initialRole],
  );
  const [clientScopeDraft, setClientScopeDraft] = useState<string[]>(
    (accessProfile?.clientScope ?? []).filter((id) =>
      vendors.some((vendor) => vendor.id === id),
    ),
  );
  const [unitScopeDraft, setUnitScopeDraft] = useState<string[]>(
    (accessProfile?.unitScope ?? []).filter((id) =>
      units.some((unit) => unit.id === id),
    ),
  );
  const [hostelScopeDraft, setHostelScopeDraft] = useState<string[]>(
    (accessProfile?.hostelScope ?? []).filter((id) =>
      hostels.some((hostel) => hostel.id === id),
    ),
  );
  const employee = modal.kind === "employee" ? modal.employee : undefined;
  const leftEmployee =
    modal.kind === "employee-left" ? modal.employee : undefined;
  const client = modal.kind === "vendor" ? modal.vendor : undefined;
  const employerUnit = modal.kind === "unit" ? modal.unit : undefined;
  const selectedShift = modal.kind === "shift" ? modal.shift : undefined;
  const selectedRemark = modal.kind === "remark" ? modal.remark : undefined;
  const selectedType =
    modal.kind === "accommodation-type" ? modal.accommodationType : undefined;
  const [employeeType, setEmployeeType] = useState(
    employee?.accommodationType ??
    accommodationTypes.find(
      (type) => type.name === "Tamil" && type.status === "active",
    )?.name ??
    accommodationTypes.find((type) => type.status === "active")?.name ??
    "Tamil",
  );
  const [employeeRoomId, setEmployeeRoomId] = useState(employee?.roomId ?? "");
  const [employeeHostelId, setEmployeeHostelId] = useState(
    employee?.roomId
      ? (rooms.find((room) => room.id === employee.roomId)?.hostelId ?? "")
      : "",
  );
  const [employeeRoomNumber, setEmployeeRoomNumber] = useState(
    employee?.roomNumber ?? "",
  );
  const initialEmployeeShifts = configuredFields(
    employee?.applicableShiftsJson,
    employee?.defaultShift ? [employee.defaultShift] : ["General"],
  );
  const [employeeShiftPattern, setEmployeeShiftPattern] = useState(
    employee?.shiftPattern === "rotational" ? "rotational" : "regular",
  );
  const [employeeShifts, setEmployeeShifts] = useState<string[]>(
    initialEmployeeShifts,
  );
  const initialRunMonth = currentRun
    ? followingMonth(currentPeriod)
    : currentPeriod;
  const initialRunDates = unitAttendanceCycle(initialRunMonth, unit);
  const [runMonth, setRunMonth] = useState(initialRunMonth);
  const [runStart, setRunStart] = useState(initialRunDates.start);
  const [runEnd, setRunEnd] = useState(initialRunDates.end);
  const [runWorkingDays, setRunWorkingDays] = useState(
    currentRun?.workingDays ?? unit?.attendanceWorkingDays ?? 26,
  );
  const [runProcessingMode, setRunProcessingMode] = useState<
    "attendance" | "salary_import"
  >("attendance");
  const [unitEarnings, setUnitEarnings] = useState<string[]>(
    configuredFields(employerUnit?.payslipEarningsJson, earningFields),
  );
  const [unitDeductions, setUnitDeductions] = useState<string[]>(
    configuredFields(employerUnit?.payslipDeductionsJson, deductionFields),
  );
  const [companyLogo, setCompanyLogo] = useState(client?.logoDataUrl ?? "");
  const [employeePhoto, setEmployeePhoto] = useState(
    employee?.photoDataUrl ?? "",
  );
  const [photoDirty, setPhotoDirty] = useState(false);
  const effectiveApiEndpoint =
    apiEndpoint ||
    (typeof window !== "undefined" &&
      (window as any).JOY_PAYROLL_CONFIG?.apiUrl) ||
    "/api/app-data";

  useEffect(() => {
    let active = true;
    if (employee?.id && !employeePhoto) {
      if (typeof loadApplicationDocuments === "function") {
        loadApplicationDocuments(employee.id)
          .then((res: any) => {
            if (!active) return;
            const docs: ApplicationDocument[] = Array.isArray(res) ? res : res?.documents || [];
            const photo =
              (res && typeof res === "object" && !Array.isArray(res) && res.photoDataUrl) ||
              res?.photoDataUrl ||
              docs.find((d: any) => d.category === "Candidate Photo")?.dataUrl ||
              "";
            if (photo) {
              setEmployeePhoto((prev) => prev || photo);
            }
          })
          .catch(() => { });
      }

      fetch(effectiveApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
        body: JSON.stringify({
          action: "get-employee-photo",
          employeeId: employee.id,
          payload: { employeeId: employee.id },
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.photoDataUrl) {
            setEmployeePhoto((prev) => prev || data.photoDataUrl);
          }
        })
        .catch(() => { });
    }
    return () => {
      active = false;
    };
  }, [employee?.id, effectiveApiEndpoint, accessToken, publishableKey, loadApplicationDocuments]);
  const [employeeApplication, setEmployeeApplication] = useState(() => readApplication(employee?.applicationJson));
  const [applicationUploads, setApplicationUploads] = useState<ApplicationDocument[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [attPunchIn, setAttPunchIn] = useState(modal.kind === "attendance" ? (modal.entry?.punchIn ?? "") : "");
  const [attPunchOut, setAttPunchOut] = useState(modal.kind === "attendance" ? (modal.entry?.punchOut ?? "") : "");
  const [attOtHours, setAttOtHours] = useState(modal.kind === "attendance" ? (modal.entry?.overtimeHours ?? 0) : 0);
  const initialShiftCode = modal.kind === "attendance" ? (modal.entry?.shiftCode ?? modal.employee.defaultShift ?? "General") : "General";
  const [attShiftHours, setAttShiftHours] = useState(modal.kind === "attendance" ? (/12\s*(?:h|hr|hour)/i.test(initialShiftCode) ? 12 : 8) : 8);
  const [attBreakHours, setAttBreakHours] = useState(1);
  const activeAccommodationTypes = accommodationTypes.filter(
    (type) =>
      type.vendorId === vendorId &&
      (type.status === "active" || type.name === employee?.accommodationType),
  );
  const normalizeAccommodationName = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const isJoySharedAccommodation = (value: string) => {
    const name = normalizeAccommodationName(value);
    return name.includes("joy") &&
      (name.includes("hostel") || name.includes("room"));
  };
  const employeeTypeIsJoyShared = isJoySharedAccommodation(employeeType);
  const matchingAccommodationTypeIds = accommodationTypes
    .filter(
      (type) =>
        type.status === "active" &&
        (employeeTypeIsJoyShared
          ? isJoySharedAccommodation(type.name)
          : type.vendorId === vendorId && type.name === employeeType),
    )
    .map((type) => type.id);
  const matchingHostels = hostels.filter((hostel) => {
    if (
      hostel.status !== "active" ||
      !hostel.accommodationTypeId ||
      !matchingAccommodationTypeIds.includes(hostel.accommodationTypeId)
    )
      return false;
    if (!employeeTypeIsJoyShared && hostel.vendorId !== vendorId) return false;
    try {
      const scope = JSON.parse(hostel.clientScopeJson || "[]") as unknown;
      return (
        !unit ||
        !Array.isArray(scope) ||
        scope.length === 0 ||
        scope.includes(unit.id)
      );
    } catch {
      return true;
    }
  });
  const matchingRooms = rooms.filter(
    (room) =>
      room.status === "active" &&
      room.hostelId === employeeHostelId &&
      matchingAccommodationTypeIds.includes(room.accommodationTypeId),
  );
  const shiftOptions = Array.from(
    new Set(
      [
        ...shifts
          .filter((shift) => shift.status === "active")
          .map((shift) => shift.name),
        employee?.defaultShift,
        modal.kind === "attendance" ? modal.entry?.shiftCode : undefined,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const title =
    modal.kind === "vendor"
      ? client
        ? "Edit group company"
        : "Add group company"
      : modal.kind === "unit"
        ? employerUnit
          ? "Edit client unit"
          : "Add client unit"
        : modal.kind === "employee"
          ? employee
            ? "Edit employee"
            : "Add employee"
          : modal.kind === "employee-left"
            ? "Put employee left date"
            : modal.kind === "accommodation-type"
              ? selectedType
                ? "Edit accommodation type"
                : "Add accommodation type"
              : modal.kind === "shift"
                ? selectedShift
                  ? "Edit shift details"
                  : "Add shift"
                : modal.kind === "remark"
                  ? selectedRemark
                    ? "Edit remark"
                    : "Add remark"
                  : modal.kind === "app-user"
                    ? accessProfile
                      ? "Edit user access"
                      : "Add user access"
                    : modal.kind === "run"
                      ? "Create payroll month"
                      : modal.kind === "attendance"
                        ? "Update attendance"
                        : modal.kind === "salary"
                          ? "Edit salary calculation"
                          : modal.kind === "accommodation"
                            ? "Edit accommodation recovery"
                            : modal.kind === "import"
                              ? modal.context === "employees"
                                ? "Import Employee Master"
                                : modal.context === "attendance"
                                  ? "Import Attendance Sheet"
                                  : modal.context === "payroll"
                                    ? "Import Salary / Payroll Sheet"
                                    : "Bulk import payroll data"
                              : "Bulk import payroll data";
  const submitLabel =
    modal.kind === "import"
      ? modal.context === "employees"
        ? "Import into employee master"
        : modal.context === "attendance"
          ? "Import attendance entries"
          : "Import into payroll"
      : modal.kind === "run"
        ? "Create payroll run"
        : modal.kind === "vendor"
          ? client
            ? "Save group company"
            : "Add group company"
          : modal.kind === "unit"
            ? employerUnit
              ? "Save client unit"
              : "Add client unit"
            : modal.kind === "accommodation-type"
              ? selectedType
                ? "Save accommodation type"
                : "Add accommodation type"
              : modal.kind === "shift"
                ? selectedShift
                  ? "Save shift"
                  : "Add shift"
                : modal.kind === "remark"
                  ? selectedRemark
                    ? "Save remark"
                    : "Add remark"
                  : modal.kind === "app-user"
                    ? accessProfile
                      ? "Save user access"
                      : "Add user"
                    : "Save changes";

  async function inspectFile(file: File, period: string) {
    setSelectedFile(file);
    setParsed(null);
    setParseError("");
    setAttendanceMismatches([]);
    setShowMismatchPopup(false);
    setParsing(true);
    try {
      const result = await parsePayrollWorkbook(file, period);
      if (!result.employees.length)
        throw new Error("The workbook does not contain employee rows.");
      setParsed(result);

      if (result.attendance.length > 0 && attendance.length > 0) {
        const empMap = new Map<string, Employee>();
        const pool = allEmployees.length ? allEmployees : employees;
        for (const emp of pool) {
          empMap.set(emp.employeeCode.toUpperCase(), emp);
        }

        const attMap = new Map<string, AttendanceEntry>();
        for (const att of attendance) {
          attMap.set(`${att.employeeId}:${att.attendanceDate}`, att);
        }

        const diffs: AttendanceMismatch[] = [];
        for (const item of result.attendance) {
          const emp = empMap.get(item.employeeCode.toUpperCase());
          if (!emp) continue;
          const existing = attMap.get(`${emp.id}:${item.attendanceDate}`);
          if (!existing) continue;

          const oldStatus = (existing.statusCode || "P").toUpperCase();
          const newStatus = (item.statusCode || "P").toUpperCase();
          const oldOt = Number(existing.overtimeHours) || 0;
          const newOt = Number(item.overtimeHours) || 0;

          if (oldStatus !== newStatus || oldOt !== newOt) {
            let changeType: AttendanceMismatch["changeType"] = "status_changed";
            let desc = "";
            if (oldStatus !== newStatus && oldOt !== newOt) {
              changeType = "both_changed";
              desc = `Status: ${oldStatus} → ${newStatus} | OT: ${oldOt}h → ${newOt}h`;
            } else if (oldStatus !== newStatus) {
              changeType = "status_changed";
              desc = `Status: ${oldStatus} → ${newStatus}`;
            } else {
              changeType = "ot_changed";
              const diffOt = Math.round((newOt - oldOt) * 10) / 10;
              desc = `OT: ${oldOt}h → ${newOt}h (${diffOt > 0 ? `+${diffOt}` : diffOt}h)`;
            }

            diffs.push({
              employeeCode: emp.employeeCode,
              employeeName: emp.name,
              attendanceDate: item.attendanceDate,
              oldStatus,
              newStatus,
              oldOt,
              newOt,
              changeType,
              description: desc,
            });
          }
        }

        if (diffs.length > 0) {
          setAttendanceMismatches(diffs);
          setShowMismatchPopup(true);
        }
      }
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "Unable to read the selected workbook",
      );
    } finally {
      setParsing(false);
    }
  }

  async function handleAcceptAllChanges() {
    if (!parsed) return;
    const importCtx = modal.kind === "import" ? (modal.context ?? (parsed.sourceType === "employee" ? "employees" : parsed.sourceType === "salary" ? "payroll" : "attendance")) : "attendance";
    setShowMismatchPopup(false);
    await onAction(
      "import-workbook",
      `Imported ${parsed.employees.length} employees and ${parsed.attendance.length} attendance marks (updated existing dates)`,
      {
        ...parsed,
        payPeriod: importPeriod,
        overwriteExisting: true,
        importContext: importCtx,
      },
    );
  }

  async function handleImportNewDatesOnly() {
    if (!parsed) return;
    const importCtx = modal.kind === "import" ? (modal.context ?? (parsed.sourceType === "employee" ? "employees" : parsed.sourceType === "salary" ? "payroll" : "attendance")) : "attendance";
    const filteredAttendance = parsed.attendance.filter((entry) => {
      return !attendanceMismatches.some(
        (m) =>
          m.employeeCode.toUpperCase() === entry.employeeCode.toUpperCase() &&
          m.attendanceDate === entry.attendanceDate,
      );
    });
    setShowMismatchPopup(false);
    await onAction(
      "import-workbook",
      `Imported ${parsed.employees.length} employees and ${filteredAttendance.length} new attendance marks (preserved ${attendanceMismatches.length} existing dates)`,
      {
        ...parsed,
        attendance: filteredAttendance,
        payPeriod: importPeriod,
        overwriteExisting,
        importContext: importCtx,
      },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (modal.kind === "vendor")
      await onAction(
        "save-client",
        client ? "Group company details updated" : "Group company created",
        { ...fields, logoDataUrl: companyLogo, id: client?.id },
      );
    else if (modal.kind === "unit")
      await onAction(
        "save-unit",
        employerUnit ? "Employer unit updated" : "Employer unit created",
        {
          ...fields,
          payslipEarnings: unitEarnings,
          payslipDeductions: unitDeductions,
          id: employerUnit?.id,
        },
      );
    else if (modal.kind === "employee") {
      const employmentType = employee?.employmentType || "client";
      if (employeeShiftPattern === "rotational" && employeeShifts.length < 2) {
        window.alert(
          "Select at least 2 applicable shifts for a rotational employee.",
        );
        return;
      }
      const applicable =
        employeeShiftPattern === "regular"
          ? [employeeShifts[0] ?? shiftOptions[0] ?? "General"]
          : employeeShifts;
      const bankAccountMasked = String(fields.bankAccountMasked ?? "").trim();
      const ifscMasked = String(fields.ifscMasked ?? "").trim();
      const bankName = String(fields.bankName ?? "").trim();
      const isBank = Boolean(bankAccountMasked);
      const paymentMode = isBank ? "bank" : "cash";

      const mergedApplication = {
        ...employeeApplication,
        "Full name": String(fields.name || employee?.name || employeeApplication["Full name"] || ""),
        "Applicant Name": String(fields.name || employee?.name || employeeApplication["Applicant Name"] || ""),
        "Mobile number": String(fields.mobileNumber || employee?.mobileNumber || employeeApplication["Mobile number"] || ""),
        "Date of birth": String(fields.dateOfBirth || employee?.dateOfBirth || employeeApplication["Date of birth"] || ""),
        "Gender": String((fields as any).gender || (employee as any)?.gender || employeeApplication["Gender"] || ""),
        "Marital status": String(fields.maritalStatus || employee?.maritalStatus || employeeApplication["Marital status"] || ""),
        "Highest qualification": String(fields.highestQualification || employee?.highestQualification || employeeApplication["Highest qualification"] || ""),
        "Position Applied For": String(fields.department || employee?.department || employeeApplication["Position Applied For"] || ""),
        "Date": String(fields.dateOfJoining || employee?.dateOfJoining || employeeApplication["Date"] || new Date().toISOString().slice(0, 10)),
        "Father - Name": String(fields.fatherName || employee?.fatherName || employeeApplication["Father - Name"] || ""),
        "Spouse - Name": String(fields.spouseName || employee?.spouseName || employeeApplication["Spouse - Name"] || ""),
        "Permanent Address": String(
          fields.permanentAddress !== undefined
            ? fields.permanentAddress
            : (employeeApplication["Permanent Address"] || employeeApplication["Permanent address"] || "")
        ).trim(),
        "PF / UAN Number": fields.uanMasked !== undefined
          ? String(fields.uanMasked).trim()
          : String(employee?.uanMasked || employeeApplication["PF / UAN Number"] || employeeApplication["UAN"] || ""),
        "ESI Number": fields.esiMasked !== undefined
          ? String(fields.esiMasked).trim()
          : String(employee?.esiMasked || employeeApplication["ESI Number"] || employeeApplication["ESI"] || ""),
        "Account Number": isBank ? bankAccountMasked : "",
        "IFSC Code": isBank ? ifscMasked : "",
        "Bank Name": isBank ? bankName : "",
      };
      await onAction(
        "save-employee",
        employee ? "Employee details updated" : "Employee added to payroll",
        {
          employee: {
            ...fields,
            uanMasked: fields.uanMasked !== undefined
              ? (String(fields.uanMasked).trim() || null)
              : (employee?.uanMasked ?? null),
            esiMasked: fields.esiMasked !== undefined
              ? (String(fields.esiMasked).trim() || null)
              : (employee?.esiMasked ?? null),
            addressLine: fields.addressLine !== undefined
              ? (String(fields.addressLine).trim() || null)
              : (employee?.addressLine ?? null),
            bankAccountMasked: isBank ? bankAccountMasked : null,
            ifscMasked: isBank ? ifscMasked : null,
            bankName: isBank ? bankName : null,
            bankBranch: isBank && fields.bankBranch ? String(fields.bankBranch).trim() : null,
            paymentMode,
            photoDataUrl: photoDirty ? (employeePhoto || null) : (employee ? undefined : (employeePhoto || null)),
            applicationJson: JSON.stringify(mergedApplication),
            applicationDocuments: applicationUploads,
            shiftPattern: employeeShiftPattern,
            defaultShift: applicable[0],
            applicableShiftsJson: JSON.stringify(applicable),
            employmentType,
            id: employee?.id,
          },
        },
      );
    } else if (modal.kind === "employee-left")
      await onAction(
        "mark-employee-left",
        `${modal.employee.name} marked as left; history preserved`,
        {
          employeeId: modal.employee.id,
          leftDate: fields.leftDate,
          finalPayrollMonth: fields.finalPayrollMonth,
        },
      );
    else if (modal.kind === "accommodation-type")
      await onAction(
        "save-accommodation-type",
        selectedType
          ? "Accommodation type updated"
          : "Accommodation type added",
        { ...fields, id: selectedType?.id },
      );
    else if (modal.kind === "shift")
      await onAction(
        "save-shift",
        selectedShift ? "Shift details updated" : "Shift added",
        { ...fields, id: selectedShift?.id },
      );
    else if (modal.kind === "remark")
      await onAction(
        "save-remark",
        selectedRemark ? "Remark updated" : "Remark added",
        { ...fields, id: selectedRemark?.id },
      );
    else if (modal.kind === "app-user")
      await onAction(
        "save-app-user",
        accessProfile
          ? userRole === "vendor"
            ? "Store vendor login updated"
            : "Direct employee user updated"
          : userRole === "vendor"
            ? "Store vendor login created"
            : "Direct employee login created",
        {
          id: accessProfile?.id,
          email: fields.email,
          temporaryPassword: fields.temporaryPassword,
          fullName: fields.fullName,
          employeeCode: fields.employeeCode || (userRole === "vendor" ? null : ""),
          department: userRole === "vendor" ? `Vendor: ${String(fields.department || "").replace(/^Vendor:\s*/i, "").trim() || "Groceries & Ration"}` : fields.department,
          dateOfJoining: fields.dateOfJoining || null,
          mobileNumber: fields.mobileNumber,
          role: userRole === "vendor" ? "hr_team" : userRole,
          permissions: permissionDraft,
          canApprovePayroll: approvalDraft,
          approvalManagerEmail: fields.approvalManagerEmail,
          approvalSequence: fields.approvalSequence,
          clientScope: userRole === "vendor"
            ? (vendorId ? [vendorId] : (vendors[0]?.id ? [vendors[0].id] : []))
            : clientScopeDraft,
          unitScope: userRole === "vendor"
            ? (unit?.id ? [unit.id] : (units[0]?.id ? [units[0].id] : []))
            : unitScopeDraft,
          hostelScope: userRole === "vendor" ? [] : hostelScopeDraft,
        },
      );
    else if (modal.kind === "run")
      await onAction("create-run", "Custom monthly payroll run created", {
        payPeriod: fields.payPeriod,
        periodStart: fields.periodStart,
        periodEnd: fields.periodEnd,
        workingDays: fields.workingDays,
        processingMode: runProcessingMode,
      });
    else if (modal.kind === "attendance")
      await onAction(
        "save-attendance",
        "Attendance, shift and payroll updated",
        {
          employeeId: modal.employee.id,
          attendanceDate: modal.date,
          ...fields,
        },
      );
    else if (modal.kind === "salary")
      await onAction(
        "save-payroll-item",
        "Employee earnings and deductions saved",
        { itemId: modal.item.id, fields },
      );
    else if (modal.kind === "accommodation")
      await onAction("save-accommodation", "Accommodation deductions saved", {
        employeeId: String(fields.employeeId),
        fields,
      });
    else if (modal.kind === "import" && parsed) {
      const importCtx = modal.context ?? (parsed.sourceType === "employee" ? "employees" : parsed.sourceType === "salary" ? "payroll" : "attendance");
      await onAction(
        "import-workbook",
        `Imported ${parsed.employees.length} employees and ${parsed.attendance.length} attendance entries`,
        { ...parsed, payPeriod: importPeriod, overwriteExisting, importContext: importCtx },
      );
    }
  }

  const recoveryFields = [
    "rent",
    "bus",
    "food",
    "advance",
    "gasShare",
    "rationShare",
    "provisionShare",
    "idCard",
    "medical",
    "ticket",
    "shoe",
    "aadhaarUpdate",
    "bankAccountCharge",
    "tshirt",
    "oldPending",
    "returnAmount",
  ] as const;
  const toggleScope = (
    setter: (value: string[]) => void,
    current: string[],
    id: string,
    checked: boolean,
  ) =>
    setter(
      checked
        ? [...new Set([...current, id])]
        : current.filter((entry) => entry !== id),
    );

  return (
    <div className="modal-layer action-modal-layer">
      <button
        className="modal-scrim"
        aria-label="Close form"
        onClick={onClose}
      />
      <form
        className={`action-modal ${modal.kind === "salary" || modal.kind === "app-user" ? "action-modal-wide" : ""}`}
        onSubmit={submit}
      >
        <header className="action-modal-header">
          <div>
            <span className="eyebrow">
              {modal.kind === "app-user"
                ? "Identity & module permissions"
                : unit
                  ? `${unit.clientName} · ${unit.unitName}`
                  : "Payroll configuration"}
            </span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="action-modal-body">
          <datalist id="payroll-remark-options">
            {remarks
              .filter((remark) => remark.status === "active")
              .map((remark) => (
                <option
                  key={remark.id}
                  value={
                    remark.notes
                      ? `${remark.title}: ${remark.notes}`
                      : remark.title
                  }
                />
              ))}
          </datalist>
          {modal.kind === "vendor" ? (
            <div className="form-grid">
              <label>
                <span>Group company short code *</span>
                <input
                  name="code"
                  defaultValue={client?.code}
                  placeholder="JMS"
                  maxLength={15}
                  required
                />
              </label>
              <label>
                <span>Group company display name *</span>
                <input
                  name="name"
                  defaultValue={client?.name}
                  placeholder="Joy group company name"
                  required
                />
              </label>
              <label className="form-span">
                <span>Registered legal name</span>
                <input
                  name="legalName"
                  defaultValue={client?.legalName}
                  placeholder="Registered legal company name"
                />
              </label>
              <label className="form-span">
                <span>Company logo for payslips</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 350000) {
                      window.alert("Choose a logo smaller than 350 KB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      setCompanyLogo(String(reader.result ?? ""));
                    reader.readAsDataURL(file);
                  }}
                />
                {companyLogo ? (
                  <small>Logo selected · it will appear on salary slips</small>
                ) : null}
              </label>
              <label>
                <span>EPF establishment code</span>
                <input
                  name="epfCode"
                  defaultValue={client?.epfCode ?? ""}
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>ESI establishment code</span>
                <input
                  name="esiCode"
                  defaultValue={client?.esiCode ?? ""}
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>GSTIN</span>
                <input
                  name="gstin"
                  defaultValue={client?.gstin ?? ""}
                  placeholder="Optional"
                />
              </label>
              <label>
                <span>Other remarks</span>
                <input
                  name="remarks"
                  list="payroll-remark-options"
                  defaultValue={client?.remarks ?? ""}
                  placeholder="Optional group company notes"
                />
              </label>
            </div>
          ) : null}

          {modal.kind === "unit" ? (
            <div className="form-grid">
              <label className="form-span">
                <span>Client *</span>
                <select
                  name="vendorId"
                  defaultValue={employerUnit?.vendorId ?? vendorId}
                  required
                >
                  {vendors
                    .filter(
                      (vendor) =>
                        vendor.status === "active" ||
                        vendor.id === employerUnit?.vendorId,
                    )
                    .map((vendor) => (
                      <option value={vendor.id} key={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Employer company *</span>
                <input
                  name="clientName"
                  defaultValue={employerUnit?.clientName}
                  placeholder="Watertec India"
                  required
                />
              </label>
              <label>
                <span>Factory / unit name *</span>
                <input
                  name="unitName"
                  defaultValue={employerUnit?.unitName}
                  placeholder="Unit I"
                  required
                />
              </label>
              <label>
                <span>Location *</span>
                <input
                  name="location"
                  defaultValue={employerUnit?.location}
                  placeholder="Coimbatore"
                  required
                />
              </label>
              <label>
                <span>Other remarks</span>
                <input
                  name="remarks"
                  list="payroll-remark-options"
                  defaultValue={employerUnit?.remarks ?? ""}
                  placeholder="Optional employer notes"
                />
              </label>
              <div className="form-note form-span">
                <strong>Unit-wise attendance cycle</strong>
                <span>
                  Example: start 26 and end 25 means previous month 26th through
                  current month 25th.
                </span>
              </div>
              <label>
                <span>Cycle start day *</span>
                <input
                  name="attendanceCycleStartDay"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={employerUnit?.attendanceCycleStartDay ?? 1}
                  required
                />
              </label>
              <label>
                <span>Cycle end day *</span>
                <input
                  name="attendanceCycleEndDay"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={employerUnit?.attendanceCycleEndDay ?? 31}
                  required
                />
              </label>
              <label className="form-span">
                <span>Default working days *</span>
                <input
                  name="attendanceWorkingDays"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={employerUnit?.attendanceWorkingDays ?? 26}
                  required
                />
              </label>
              <label>
                <span>OT payment multiplier *</span>
                <input
                  name="overtimeMultiplier"
                  type="number"
                  min="1"
                  max="2"
                  step="0.01"
                  defaultValue={employerUnit?.overtimeMultiplier ?? 1}
                  required
                />
                <small>
                  Manual value allowed: 1, 1.25, 1.5, 2, or any value between 1
                  and 2.
                </small>
              </label>
              <label className="form-span">
                <span>Deduction voucher header</span>
                <input
                  name="voucherHeader"
                  defaultValue={employerUnit?.voucherHeader ?? ""}
                  placeholder="Client company name / customized voucher heading"
                />
              </label>
              <div className="form-note form-span">
                <strong>Employer-customized salary slip</strong>
                <span>
                  These settings can be changed during unit creation or later
                  through Edit employer unit.
                </span>
              </div>
              <label className="form-span">
                <span>Payslip employer heading</span>
                <input
                  name="payslipTitle"
                  defaultValue={employerUnit?.payslipTitle ?? ""}
                  placeholder="Employer legal / display name"
                />
              </label>
              <label className="form-span">
                <span>Payslip subtitle</span>
                <input
                  name="payslipSubtitle"
                  defaultValue={employerUnit?.payslipSubtitle ?? employerUnit?.clientName ?? ""}
                  placeholder="Client company name (e.g. Water Tec India Pvt Ltd)"
                />
              </label>
              <label className="form-span">
                <span>Payslip address</span>
                <textarea
                  name="payslipAddress"
                  defaultValue={employerUnit?.payslipAddress ?? ""}
                  rows={2}
                  placeholder="Employer address shown on the salary slip"
                />
              </label>
              <label className="form-span">
                <span>Payslip contact line</span>
                <input
                  name="payslipContact"
                  defaultValue={employerUnit?.payslipContact ?? ""}
                  placeholder="Website · email · phone"
                />
              </label>
              <label className="form-span">
                <span>Payslip footer</span>
                <input
                  name="payslipFooter"
                  defaultValue={employerUnit?.payslipFooter ?? ""}
                  placeholder="Customized salary slip declaration"
                />
              </label>
              <section className="form-span payslip-field-selector">
                <strong>Payslip earnings to show *</strong>
                <div className="scope-checkbox-grid">
                  {earningFields.map((field) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={unitEarnings.includes(field)}
                        onChange={(event) =>
                          setUnitEarnings(
                            event.target.checked
                              ? [...unitEarnings, field]
                              : unitEarnings.filter((value) => value !== field),
                          )
                        }
                      />
                      <span>{readableField(field)}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="form-span payslip-field-selector">
                <strong>Payslip deductions to show *</strong>
                <div className="scope-checkbox-grid">
                  {deductionFields.map((field) => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={unitDeductions.includes(field)}
                        onChange={(event) =>
                          setUnitDeductions(
                            event.target.checked
                              ? [...unitDeductions, field]
                              : unitDeductions.filter(
                                (value) => value !== field,
                              ),
                          )
                        }
                      />
                      <span>{readableField(field)}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {modal.kind === "employee-left" ? (
            <div className="form-grid">
              <div className="form-note form-span">
                <strong>
                  {leftEmployee?.name} · {leftEmployee?.employeeCode}
                </strong>
                <span>
                  The employee master, attendance, payroll, accommodation, and
                  payment history will remain preserved.
                </span>
              </div>
              <label className="form-span">
                <span>Employee left date *</span>
                <input
                  name="leftDate"
                  type="date"
                  defaultValue={
                    leftEmployee?.dateOfLeaving ??
                    new Date().toISOString().slice(0, 10)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const monthInput = document.querySelector<HTMLInputElement>(
                      'input[name="finalPayrollMonth"]',
                    );
                    if (monthInput && !monthInput.value && val) {
                      monthInput.value = val.slice(0, 7);
                    }
                  }}
                  required
                />
              </label>
              <label className="form-span">
                <span>Include in Payroll, Deductions & Recoveries until month</span>
                <input
                  name="finalPayrollMonth"
                  type="month"
                  defaultValue={
                    leftEmployee?.finalPayrollMonth ??
                    (
                      currentRun?.payPeriod ??
                      (
                        leftEmployee?.dateOfLeaving ??
                        new Date().toISOString().slice(0, 10)
                      ).slice(0, 7)
                    )
                  }
                />
                <small
                  style={{
                    display: "block",
                    color: "var(--muted, #64748b)",
                    marginTop: "6px",
                    fontSize: "0.82rem",
                    lineHeight: "1.4",
                  }}
                >
                  This employee will be included in deductions, room-wise recoveries, and payroll up to this selected month (including previous months they worked). Subsequent months will automatically archive them without requiring manual reactivation. Leave blank if already settled.
                </small>
              </label>
            </div>
          ) : null}

          {modal.kind === "employee" ? (
            <div className="form-grid employee-identity-fields">
              <div className="form-note form-span">
                <strong>ID card identity and emergency details</strong>
                <span>
                  These details appear on the CR80 front/back employee ID card.
                </span>
              </div>
              <label>
                <span>Employee mobile number</span>
                <input
                  name="mobileNumber"
                  defaultValue={employee?.mobileNumber || employeeApplication["Mobile number"] || employeeApplication["Mobile Number"] || ""}
                  inputMode="tel"
                />
              </label>
              <label>
                <span>Employee email ID</span>
                <input
                  name="emailAddress"
                  type="email"
                  defaultValue={employee?.emailAddress || employeeApplication["Email address"] || employeeApplication["Email Address"] || employeeApplication["Email"] || ""}
                  placeholder="employee@example.com"
                />
                <small>Used for direct SMTP salary-slip delivery.</small>
              </label>
              <label>
                <span>Emergency contact number</span>
                <input
                  name="emergencyContactNumber"
                  defaultValue={employee?.emergencyContactNumber || employeeApplication["Emergency Contact"] || employeeApplication["Family - Father - Contact"] || employeeApplication["Family - Spouse - Contact"] || employeeApplication["Contact person phone"] || ""}
                  inputMode="tel"
                />
              </label>
              <label className="form-span">
                <span>Residential address (Present)</span>
                <textarea
                  name="addressLine"
                  defaultValue={employee?.addressLine ?? ""}
                  rows={2}
                  placeholder="Door No, Street, Area, City/Town (Current stay)"
                />
              </label>
              <label className="form-span">
                <span>Permanent address</span>
                <textarea
                  name="permanentAddress"
                  value={employeeApplication["Permanent Address"] || employeeApplication["Permanent address"] || ""}
                  onChange={(e) =>
                    setEmployeeApplication({
                      ...employeeApplication,
                      "Permanent Address": e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Door No, Street, Village/Town, District, State, PIN code (Native / Aadhaar)"
                />
              </label>
              <label>
                <span>District</span>
                <input
                  name="district"
                  defaultValue={employee?.district || employeeApplication["District"] || employeeApplication["Place of Birth"] || ""}
                />
              </label>
              <label>
                <span>State</span>
                <input
                  name="stateName"
                  defaultValue={employee?.stateName || employeeApplication["State"] || "Tamil Nadu"}
                />
              </label>
              <label>
                <span>Pincode</span>
                <input
                  name="pincode"
                  defaultValue={employee?.pincode || employeeApplication["Pincode"] || employeeApplication["Pin code"] || ""}
                  inputMode="numeric"
                  maxLength={6}
                />
              </label>
              <label>
                <span>Blood group</span>
                <select
                  name="bloodGroup"
                  defaultValue={employee?.bloodGroup || employeeApplication["Blood group"] || employeeApplication["Blood Group"] || ""}
                >
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (group) => (
                      <option key={group}>{group}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                <span>Gender</span>
                <select
                  name="gender"
                  defaultValue={employee?.gender || employeeApplication["Gender"] || ""}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
              <label>
                <span>Highest qualification</span>
                <input
                  name="highestQualification"
                  defaultValue={employee?.highestQualification || employeeApplication["Highest qualification"] || ""}
                  placeholder="Example: B.E., Diploma, ITI, 12th"
                />
              </label>
              <label>
                <span>Father name</span>
                <input
                  name="fatherName"
                  defaultValue={employee?.fatherName || employeeApplication["Father - Name"] || employeeApplication["Father Name"] || ""}
                />
              </label>
              <label>
                <span>Marital status</span>
                <select
                  name="maritalStatus"
                  defaultValue={employee?.maritalStatus || employeeApplication["Marital status"] || employeeApplication["Marital Status"] || "Unmarried"}
                >
                  <option>Unmarried</option>
                  <option>Married</option>
                  <option>Widowed</option>
                  <option>Separated</option>
                </select>
              </label>
              <label>
                <span>Spouse name</span>
                <input
                  name="spouseName"
                  defaultValue={employee?.spouseName || employeeApplication["Spouse - Name"] || employeeApplication["Spouse Name"] || ""}
                />
              </label>
            </div>
          ) : null}

          {modal.kind === "employee" ? (
            <section className="employee-shift-selector">
              <div className="form-note">
                <strong>Shift pattern *</strong>
                <span>
                  Select one regular timing, or every rotational shift
                  applicable to this employee.
                </span>
              </div>
              <div className="shift-pattern-options">
                <label>
                  <input
                    type="radio"
                    checked={employeeShiftPattern === "regular"}
                    onChange={() => {
                      setEmployeeShiftPattern("regular");
                      setEmployeeShifts([
                        employeeShifts[0] ?? shiftOptions[0] ?? "General",
                      ]);
                    }}
                  />
                  <span>Regular shift</span>
                </label>
                <label>
                  <input
                    type="radio"
                    checked={employeeShiftPattern === "rotational"}
                    onChange={() => setEmployeeShiftPattern("rotational")}
                  />
                  <span>Rotational shift</span>
                </label>
              </div>
              {employeeShiftPattern === "regular" ? (
                <label>
                  <span>Regular shift timing *</span>
                  <select
                    value={employeeShifts[0] ?? ""}
                    onChange={(event) =>
                      setEmployeeShifts([event.target.value])
                    }
                    required
                  >
                    {shiftOptions.map((shift) => (
                      <option key={shift} value={shift}>
                        {shift}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <fieldset>
                  <legend>Applicable shifts * (minimum 2)</legend>
                  <div className="scope-checkbox-grid">
                    {shiftOptions.map((shift) => (
                      <label key={shift}>
                        <input
                          type="checkbox"
                          checked={employeeShifts.includes(shift)}
                          onChange={(event) =>
                            setEmployeeShifts(
                              event.target.checked
                                ? [...new Set([...employeeShifts, shift])]
                                : employeeShifts.filter(
                                  (value) => value !== shift,
                                ),
                            )
                          }
                        />
                        <span>{shift}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </section>
          ) : null}

          {modal.kind === "employee" ? (
            <div className="form-grid">
              <label>
                <span>Employee code *</span>
                <input
                  name="employeeCode"
                  defaultValue={employee?.employeeCode}
                  placeholder="J1007"
                  required
                />
              </label>
              <label>
                <span>Employee name *</span>
                <input
                  name="name"
                  defaultValue={employee?.name || employeeApplication["Full name"] || employeeApplication["Applicant Name"] || ""}
                  placeholder="Full name"
                  required
                />
              </label>
              <label>
                <span>Department *</span>
                <input
                  name="department"
                  defaultValue={employee?.department || employeeApplication["Position Applied For"] || "Production"}
                  required
                />
              </label>
              <label>
                <span>Date of joining *</span>
                <input
                  name="dateOfJoining"
                  type="date"
                  defaultValue={
                    employee?.dateOfJoining ?? `${currentPeriod}-01`
                  }
                  required
                />
              </label>
              <label>
                <span>Date of birth</span>
                <input
                  name="dateOfBirth"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  defaultValue={formatIsoDate(employee?.dateOfBirth) || formatIsoDate(employeeApplication["Date of birth"]) || ""}
                />
              </label>
              <label>
                <span>Basic salary / daily rate (₹)</span>
                <input
                  name="salaryAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={employee?.salaryAmount ?? 0}
                  required
                />
              </label>
              <label>
                <span>Salary basis</span>
                <select
                  name="salaryBasis"
                  defaultValue={employee?.salaryBasis ?? "monthly"}
                >
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </select>
              </label>
              <label>
                <span>Default shift</span>
                <select
                  name="defaultShift"
                  defaultValue={
                    employee?.defaultShift ??
                    shiftOptions.find((shift) => shift === "General") ??
                    shiftOptions[0]
                  }
                >
                  {shiftOptions.map((shift) => (
                    <option key={shift}>{shift}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Payment mode</span>
                <select
                  name="paymentMode"
                  defaultValue="bank"
                >

                  <option value="bank">Bank transfer</option>
                </select>
              </label>
              <label>
                <span>UAN</span>
                <input
                  name="uanMasked"
                  defaultValue={employee ? (employee.uanMasked ?? "") : (employeeApplication["PF / UAN Number"] || employeeApplication["UAN"] || "")}
                  placeholder="Optional unless PF applies"
                />
              </label>
              <label>
                <span>ESI number</span>
                <input
                  name="esiMasked"
                  defaultValue={employee ? (employee.esiMasked ?? "") : (employeeApplication["ESI Number"] || employeeApplication["ESI"] || "")}
                  placeholder="Optional unless ESI applies"
                />
              </label>
              <label>
                <span>Bank account number</span>
                <input
                  name="bankAccountMasked"
                  defaultValue={employee ? (employee.bankAccountMasked ?? "") : (employeeApplication["Account Number"] || employeeApplication["Bank Account Number"] || "")}
                />
              </label>
              <label>
                <span>IFSC code</span>
                <input
                  name="ifscMasked"
                  defaultValue={employee ? (employee.ifscMasked ?? "") : (employeeApplication["IFSC Code"] || employeeApplication["IFSC"] || "")}
                />
              </label>
              <label>
                <span>Bank name</span>
                <input
                  name="bankName"
                  defaultValue={employee ? (employee.bankName ?? "") : (employeeApplication["Bank Name"] || "")}
                />
              </label>
              <label>
                <span>Bank account branch / City</span>
                <input
                  name="bankBranch"
                  defaultValue={employee?.bankBranch || employeeApplication["Bank Branch"] || employeeApplication["Branch"] || ""}
                  placeholder="Example: Coimbatore Main Branch"
                />
                <small>Used as City in Indian Bank bulk upload.</small>
              </label>
              <label>
                <span>EPF applicable</span>
                <select
                  name="pfApplicable"
                  defaultValue={employee?.pfApplicable === 0 ? "no" : "yes"}
                >
                  <option value="yes">Required</option>
                  <option value="no">Not required</option>
                </select>
              </label>
              <label>
                <span>Customized EPF wage (₹)</span>
                <input
                  name="pfWageAmount"
                  type="number"
                  min="0"
                  max="15000"
                  step="0.01"
                  defaultValue={employee?.pfWageAmount ?? 0}
                />
                <small>Maximum statutory ceiling ₹15,000</small>
              </label>
              <label>
                <span>ESI applicable</span>
                <select
                  name="esiApplicable"
                  defaultValue={employee?.esiApplicable === 0 ? "no" : "yes"}
                >
                  <option value="yes">Required</option>
                  <option value="no">Not required</option>
                </select>
              </label>
              <label>
                <span>Customized ESI wage (₹)</span>
                <input
                  name="esiWageAmount"
                  type="number"
                  min="0"
                  max="21000"
                  step="0.01"
                  defaultValue={employee?.esiWageAmount ?? 0}
                />
                <small>Maximum coverage ceiling ₹21,000</small>
              </label>
              <label>
                <span>Professional Tax</span>
                <select
                  name="ptApplicable"
                  defaultValue={employee?.ptApplicable === 0 ? "no" : "yes"}
                >
                  <option value="yes">Applicable</option>
                  <option value="no">Not required</option>
                </select>
              </label>
              <label>
                <span>Tamil Nadu LWF</span>
                <select
                  name="lwfApplicable"
                  defaultValue={employee?.lwfApplicable === 0 ? "no" : "yes"}
                >
                  <option value="yes">Applicable</option>
                  <option value="no">Not required</option>
                </select>
              </label>
              <label>
                <span>Accommodation type *</span>
                <select
                  name="accommodationType"
                  value={employeeType}
                  onChange={(event) => {
                    setEmployeeType(event.target.value);
                    setEmployeeHostelId("");
                    setEmployeeRoomId("");
                    setEmployeeRoomNumber("");
                  }}
                  required
                >
                  {activeAccommodationTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  {employeeType.toLowerCase().includes("outside")
                    ? "Area"
                    : "Hostel"}
                </span>
                <select
                  value={employeeHostelId}
                  onChange={(event) => {
                    setEmployeeHostelId(event.target.value);
                    setEmployeeRoomId("");
                    setEmployeeRoomNumber("");
                  }}
                  disabled={!matchingHostels.length}
                >
                  <option value="">
                    {matchingHostels.length
                      ? "Select mapped hostel / area"
                      : "No mapped hostel / area available"}
                  </option>
                  {matchingHostels.map((hostel) => (
                    <option key={hostel.id} value={hostel.id}>
                      {hostel.name}
                    </option>
                  ))}
                </select>
                <small>
                  {matchingHostels.length
                    ? "Only hostels mapped to this employer unit are shown."
                    : "Create or map the hostel to this employer unit in Hostel Master."}
                </small>
              </label>
              <label>
                <span>Existing room</span>
                <select
                  name="roomId"
                  value={employeeRoomId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setEmployeeRoomId(id);
                    setEmployeeRoomNumber(
                      matchingRooms.find((room) => room.id === id)
                        ?.roomNumber ?? "",
                    );
                  }}
                  disabled={!employeeHostelId || !matchingRooms.length}
                >
                  <option value="">
                    {!employeeHostelId
                      ? "Select hostel / area first"
                      : matchingRooms.length
                        ? "Select room"
                        : "No active rooms in this hostel / area"}
                  </option>
                  {matchingRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomNumber}
                      {room.capacity ? ` · capacity ${room.capacity}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Room number</span>
                <input
                  name="roomNumber"
                  value={employeeRoomNumber}
                  onChange={(event) => {
                    setEmployeeRoomNumber(event.target.value);
                    setEmployeeRoomId("");
                  }}
                  readOnly={matchingHostels.length > 0}
                  placeholder={
                    matchingHostels.length
                      ? "Filled from the selected hostel room"
                      : "Type a room number for non-hostel accommodation"
                  }
                />
              </label>
              <label>
                <span>Individual monthly rent (₹)</span>
                <input
                  name="roomRentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={employee?.roomRentAmount ?? 0}
                />
              </label>
              <EmployeePhotoPicker
                photo={employeePhoto}
                onChange={(val) => {
                  setEmployeePhoto(val);
                  setPhotoDirty(true);
                }}
              />
              <label>
                <span>Other remarks</span>
                <input
                  name="remarks"
                  list="payroll-remark-options"
                  defaultValue={employee?.remarks ?? ""}
                  placeholder="Optional employee notes"
                />
              </label>
              <div className="form-note form-span">
                <strong>QR employee ID card</strong>
                <span>
                  The ID card and employee QR code are generated automatically
                  immediately after saving. Open Employees → Actions → ID card +
                  QR to print it.
                </span>
              </div>
            </div>
          ) : null}

          {modal.kind === "employee" ? (
            <EmployeeApplicationFields
              employeeId={employee?.id}
              loadDocuments={loadApplicationDocuments}
              uploads={applicationUploads}
              onUploadsChange={setApplicationUploads}
              value={employeeApplication}
              onChange={setEmployeeApplication}
              directStaff={appUsers
                .filter(
                  (u) =>
                    u.role !== "vendor" &&
                    !u.department?.toLowerCase().startsWith("vendor") &&
                    !u.department?.toLowerCase().includes("vendor:")
                )
                .map((u) => ({
                  id: u.id,
                  employeeCode: u.employeeCode || `USR-${u.id.slice(0, 5)}`,
                  name: u.fullName || u.email,
                  department: u.department || "Internal Staff",
                }))}
              allEmployees={allEmployees}
            />
          ) : null}

          {modal.kind === "accommodation-type" ? (
            <div className="form-grid">
              <label className="form-span">
                <span>Accommodation type name *</span>
                <input
                  name="name"
                  defaultValue={selectedType?.name ?? ""}
                  placeholder="Tamil, Outside Room, Joy Room…"
                  required
                />
              </label>
              <label className="form-span">
                <span>Remarks</span>
                <textarea
                  name="remarks"
                  defaultValue={selectedType?.remarks ?? ""}
                  rows={3}
                  placeholder="Optional allocation or recovery guidance"
                />
              </label>
              <div className="form-note form-span">
                Active accommodation types appear in employee and room forms. A
                type with active employee assignments cannot be deactivated or
                removed.
              </div>
            </div>
          ) : null}

          {modal.kind === "shift" ? (
            <div className="form-grid">
              <label className="form-span">
                <span>Client location *</span>
                <select
                  name="clientUnitId"
                  defaultValue={selectedShift?.clientUnitId ?? unit?.id ?? ""}
                  required
                >
                  {units
                    .filter(
                      (entry) =>
                        entry.vendorId === vendorId &&
                        entry.status === "active",
                    )
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.clientName} · {entry.unitName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Shift name *</span>
                <input
                  name="name"
                  defaultValue={selectedShift?.name}
                  required
                />
              </label>
              <label>
                <span>Start time *</span>
                <input
                  name="startTime"
                  type="time"
                  defaultValue={selectedShift?.startTime ?? "09:00"}
                  required
                />
              </label>
              <label>
                <span>End time *</span>
                <input
                  name="endTime"
                  type="time"
                  defaultValue={selectedShift?.endTime ?? "18:00"}
                  required
                />
              </label>
              <label>
                <span>Break minutes</span>
                <input
                  name="breakMinutes"
                  type="number"
                  min="0"
                  defaultValue={selectedShift?.breakMinutes ?? 60}
                />
              </label>
              <label>
                <span>Required work minutes</span>
                <input
                  name="requiredWorkMinutes"
                  type="number"
                  min="1"
                  defaultValue={selectedShift?.requiredWorkMinutes ?? 480}
                />
              </label>
              <label>
                <span>Late grace minutes</span>
                <input
                  name="lateGraceMinutes"
                  type="number"
                  min="0"
                  defaultValue={selectedShift?.lateGraceMinutes ?? 0}
                />
              </label>
              <label>
                <span>Late deduction minutes</span>
                <input
                  name="lateDeductionMinutes"
                  type="number"
                  min="0"
                  defaultValue={selectedShift?.lateDeductionMinutes ?? 0}
                />
              </label>
              <label>
                <span>Early-out grace minutes</span>
                <input
                  name="earlyGraceMinutes"
                  type="number"
                  min="0"
                  defaultValue={selectedShift?.earlyGraceMinutes ?? 0}
                />
              </label>
              <label>
                <span>Early-out deduction minutes</span>
                <input
                  name="earlyDeductionMinutes"
                  type="number"
                  min="0"
                  defaultValue={selectedShift?.earlyDeductionMinutes ?? 0}
                />
              </label>
              <label>
                <span>OT logic</span>
                <select
                  name="otMode"
                  defaultValue={selectedShift?.otMode ?? "approval"}
                >
                  <option value="approval">
                    Based on requirement / approval
                  </option>
                  <option value="fixed">Fixed OT hours</option>
                </select>
              </label>
              <label>
                <span>Fixed OT hours</span>
                <input
                  name="fixedOtHours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  defaultValue={selectedShift?.fixedOtHours ?? 0}
                />
              </label>
              <label className="form-span">
                <span>Shift remarks</span>
                <input
                  name="remarks"
                  defaultValue={selectedShift?.remarks ?? ""}
                />
              </label>
              <div className="form-note form-span">
                Late and early deductions apply only after their grace limits.
                Overnight shifts are supported.
              </div>
            </div>
          ) : null}

          {modal.kind === "remark" ? (
            <div className="form-grid">
              <label>
                <span>Remark title *</span>
                <input
                  name="title"
                  defaultValue={selectedRemark?.title}
                  placeholder="Late arrival, safety issue, follow-up…"
                  required
                />
              </label>
              <label>
                <span>Category *</span>
                <select
                  name="category"
                  defaultValue={selectedRemark?.category ?? "general"}
                >
                  {[
                    "general",
                    "attendance",
                    "employee",
                    "salary",
                    "employer",
                    "shift",
                  ].map((category) => (
                    <option value={category} key={category}>
                      {readableField(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-span">
                <span>Remark details</span>
                <textarea
                  name="notes"
                  defaultValue={selectedRemark?.notes ?? ""}
                  placeholder="Describe when your team should use this remark"
                  rows={4}
                />
              </label>
            </div>
          ) : null}

          {modal.kind === "app-user" ? (
            <div className="user-access-form">
              {!accessProfile ? (
                <label>
                  <span>Temporary password * (minimum 12 characters)</span>
                  <input
                    name="temporaryPassword"
                    type="password"
                    minLength={12}
                    required
                    autoComplete="new-password"
                  />
                </label>
              ) : null}
              {userRole === "hostel_incharge" ? (
                <section className="scope-assignment-panel">
                  <header>
                    <div>
                      <span className="eyebrow">Hostel responsibility</span>
                      <h3>Assign responsible hostels</h3>
                    </div>
                    <small>
                      Attendance and hostel entries are limited to these
                      residents
                    </small>
                  </header>
                  <div className="scope-checkbox-grid">
                    {hostels
                      .filter(
                        (hostel) =>
                          hostel.status === "active" ||
                          hostelScopeDraft.includes(hostel.id),
                      )
                      .map((hostel) => (
                        <label key={hostel.id}>
                          <input
                            type="checkbox"
                            checked={hostelScopeDraft.includes(hostel.id)}
                            onChange={(event) =>
                              toggleScope(
                                setHostelScopeDraft,
                                hostelScopeDraft,
                                hostel.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            <strong>{hostel.name}</strong>
                            <small>
                              {
                                vendors.find(
                                  (vendor) => vendor.id === hostel.vendorId,
                                )?.name
                              }
                            </small>
                          </span>
                        </label>
                      ))}
                  </div>
                </section>
              ) : null}
              <div className="form-grid">
                <div className="form-note form-span" style={userRole === "vendor" ? { background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" } : undefined}>
                  <strong>{userRole === "vendor" ? "🏪 Store / Merchant Login" : "Joy direct employee user"}</strong>
                  <span>
                    {userRole === "vendor"
                      ? "Create credentials for an external merchant, canteen or grocery store. Vendors only have access to the Vendor Counter Desk."
                      : "Create the login and direct employee identity together. Client-factory manpower remains in Employee Master."}
                  </span>
                </div>
                {userRole !== "vendor" ? (
                  <label>
                    <span>Employee code *</span>
                    <input
                      name="employeeCode"
                      defaultValue={accessProfile?.employeeCode ?? ""}
                      required
                    />
                  </label>
                ) : null}
                <label className={userRole === "vendor" ? "form-span" : undefined}>
                  <span>{userRole === "vendor" ? "Store / Vendor name *" : "Employee name *"}</span>
                  <input
                    name="fullName"
                    placeholder={userRole === "vendor" ? "e.g. Sree Murugan Stores" : "e.g. Ramesh Kumar"}
                    defaultValue={accessProfile?.fullName ?? ""}
                    required
                  />
                </label>
                <label>
                  <span>{userRole === "vendor" ? "Store type / category *" : "Department *"}</span>
                  <input
                    name="department"
                    placeholder={userRole === "vendor" ? "e.g. Groceries & Ration" : "e.g. Operations"}
                    defaultValue={accessProfile?.department ? accessProfile.department.replace(/^Vendor:\s*/i, "") : (userRole === "vendor" ? "Groceries & Ration" : "")}
                    required
                  />
                </label>
                {userRole !== "vendor" ? (
                  <label>
                    <span>Date of joining *</span>
                    <input
                      name="dateOfJoining"
                      type="date"
                      defaultValue={accessProfile?.dateOfJoining ?? ""}
                      required
                    />
                  </label>
                ) : null}
                <label>
                  <span>{userRole === "vendor" ? "Store contact mobile *" : "Mobile number"}</span>
                  <input
                    name="mobileNumber"
                    placeholder={userRole === "vendor" ? "e.g. 9876543210" : ""}
                    defaultValue={accessProfile?.mobileNumber ?? ""}
                    required={userRole === "vendor"}
                  />
                </label>
                <label>
                  <span>Sign-in email *</span>
                  <input
                    name="email"
                    type="email"
                    placeholder={userRole === "vendor" ? "e.g. muruganstore@joy.com" : ""}
                    defaultValue={accessProfile?.email ?? ""}
                    required
                  />
                </label>
                <label className="form-span">
                  <span>Role *</span>
                  <select
                    value={userRole}
                    onChange={(event) => {
                      const role = event.target.value as UserRole;
                      setUserRole(role);
                      setPermissionDraft({ ...DEFAULT_PERMISSIONS[role] });
                      setApprovalDraft(DEFAULT_APPROVAL_ACCESS[role]);
                    }}
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <section className="scope-assignment-panel">
                <header>
                  <div>
                    <span className="eyebrow">Organisation access</span>
                    <h3>
                      {userRole === "super_admin"
                        ? "Unrestricted access"
                        : userRole === "vendor"
                          ? "Vendor Store Access"
                          : userRole === "payroll_team"
                            ? "Assign clients"
                            : "Assign employer units"}
                    </h3>
                  </div>
                  <small>
                    {userRole === "super_admin"
                      ? "All current and future clients and units"
                      : userRole === "vendor"
                        ? "Restricted to Store Counter Desk only"
                        : "At least one assignment is required"}
                  </small>
                </header>
                {userRole === "vendor" ? (
                  <div className="form-note" style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" }}>
                    🏪 <strong>Dedicated Store / Vendor Login:</strong> This vendor account will only see and access the <strong>Vendor Counter Desk</strong>. They can verify Joy workers using Aadhaar or mobile numbers, split ration/grocery bills among roommates, and capture receipt photos. All internal payroll, attendance, and salary figures are completely hidden.
                  </div>
                ) : userRole === "super_admin" ? (
                  <div className="form-note">
                    Super Admin can access every client and employer unit.
                  </div>
                ) : userRole === "payroll_team" ? (
                  <div className="scope-checkbox-grid">
                    {vendors
                      .filter(
                        (vendor) =>
                          vendor.status === "active" ||
                          clientScopeDraft.includes(vendor.id),
                      )
                      .map((vendor) => (
                        <label key={vendor.id}>
                          <input
                            type="checkbox"
                            checked={clientScopeDraft.includes(vendor.id)}
                            onChange={(event) =>
                              toggleScope(
                                setClientScopeDraft,
                                clientScopeDraft,
                                vendor.id,
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            <strong>{vendor.name}</strong>
                            <small>{vendor.code}</small>
                          </span>
                        </label>
                      ))}
                  </div>
                ) : (
                  <div className="scope-checkbox-grid">
                    {vendors.map((vendor) => (
                      <div className="scope-client-group" key={vendor.id}>
                        <strong>{vendor.name}</strong>
                        {units
                          .filter(
                            (entry) =>
                              entry.vendorId === vendor.id &&
                              (entry.status === "active" ||
                                unitScopeDraft.includes(entry.id)),
                          )
                          .map((entry) => (
                            <label key={entry.id}>
                              <input
                                type="checkbox"
                                checked={unitScopeDraft.includes(entry.id)}
                                onChange={(event) =>
                                  toggleScope(
                                    setUnitScopeDraft,
                                    unitScopeDraft,
                                    entry.id,
                                    event.target.checked,
                                  )
                                }
                              />
                              <span>
                                <strong>{entry.clientName}</strong>
                                <small>
                                  {entry.unitName} · {entry.location}
                                </small>
                              </span>
                            </label>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <div className="permission-legend">
                <span>
                  <b>No access</b> Hidden and blocked
                </span>
                <span>
                  <b>View only</b> Can review, cannot save
                </span>
                <span>
                  <b>Full access</b> Can create, edit, import, or export
                </span>
              </div>
              <section className="permission-matrix">
                <header>
                  <div>
                    <span className="eyebrow">Custom permissions</span>
                    <h3>Module access</h3>
                  </div>
                  <small>
                    {userRole === "super_admin"
                      ? "Super Admin always has full access"
                      : "Change any role default"}
                  </small>
                </header>
                {ACCESS_MODULES.map((module) => (
                  <label key={module.id}>
                    <div>
                      <strong>{module.label}</strong>
                      <small>{module.description}</small>
                    </div>
                    <select
                      aria-label={`${module.label} permission`}
                      value={permissionDraft[module.id]}
                      disabled={userRole === "super_admin"}
                      onChange={(event) =>
                        setPermissionDraft((current) => ({
                          ...current,
                          [module.id]: event.target
                            .value as PermissionMap[typeof module.id],
                        }))
                      }
                    >
                      <option value="none">No access</option>
                      <option value="view">View only</option>
                      <option value="manage">Full access</option>
                    </select>
                  </label>
                ))}
              </section>
              <section className="scope-assignment-panel approval-hierarchy-panel">
                <header><div><span className="eyebrow">Payroll approval hierarchy</span><h3>Map reporting approver</h3></div><small>Field HR → Payroll HR → HR Manager → Super Admin</small></header>
                {userRole === "super_admin" ? <div className="form-note">Super Admin is the final authority and can approve directly.</div> : (
                  <div className="form-grid">
                    <label><span>Approver / reporting manager</span><select name="approvalManagerEmail" defaultValue={accessProfile?.approvalManagerEmail ?? ""}><option value="">Choose next approver</option>{([] as AppUserProfile[]).filter((user) => user.status === "active" && user.email !== accessProfile?.email).map((user) => (<option key={user.id} value={user.email}>{user.fullName ?? user.email} · {ROLE_LABELS[user.role]}</option>))}</select></label>
                    <label><span>Approval sequence</span><input name="approvalSequence" type="number" min="0" max="999" defaultValue={accessProfile?.approvalSequence ?? (userRole === "field_hr" ? 1 : userRole === "payroll_team" ? 2 : 3)} /></label>
                  </div>
                )}
              </section>
              <label
                className={`approval-authority ${userRole === "super_admin" ? "approval-authority-fixed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={approvalDraft}
                  disabled={userRole === "super_admin"}
                  onChange={(event) => setApprovalDraft(event.target.checked)}
                />
                <span>
                  <strong>Allow final payroll approval</strong>
                  <small>
                    This person can lock an approved salary run and unlock
                    payment exports. Payroll Full access is also required.
                  </small>
                </span>
              </label>
            </div>
          ) : null}

          {modal.kind === "run" ? (
            <div className="form-grid">
              <label className="form-span">
                <span>Payroll processing type *</span>
                <select
                  value={runProcessingMode}
                  onChange={(event) =>
                    setRunProcessingMode(
                      event.target.value as "attendance" | "salary_import",
                    )
                  }
                >
                  <option value="attendance">
                    Attendance available in application (Standard daily attendance & roster)
                  </option>
                  <option value="salary_import">
                    Import salary register headers (Only when importing external computed salary)
                  </option>
                </select>
              </label>
              <label className="form-span">
                <span>Payroll month / label *</span>
                <input
                  name="payPeriod"
                  type="month"
                  value={runMonth}
                  onChange={(event) => {
                    const value = event.target.value;
                    const dates = unitAttendanceCycle(value, unit);
                    setRunMonth(value);
                    setRunStart(dates.start);
                    setRunEnd(dates.end);
                    setRunWorkingDays(unit?.attendanceWorkingDays ?? 26);
                  }}
                  required
                />
              </label>
              <label>
                <span>Calculation period starts *</span>
                <input
                  name="periodStart"
                  type="date"
                  value={runStart}
                  onChange={(event) => setRunStart(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Calculation period ends *</span>
                <input
                  name="periodEnd"
                  type="date"
                  value={runEnd}
                  onChange={(event) => setRunEnd(event.target.value)}
                  required
                />
              </label>
              <label className="form-span">
                <span>Monthly working days *</span>
                <input
                  name="workingDays"
                  type="number"
                  min="1"
                  max="62"
                  value={runWorkingDays}
                  onChange={(event) =>
                    setRunWorkingDays(Number(event.target.value))
                  }
                  required
                />
              </label>
              <div className="form-note form-span">
                Attendance mode calculates salary from saved attendance.
                Salary-import mode keeps imported earning and deduction headers
                as the payroll source.
              </div>
            </div>
          ) : null}

          {modal.kind === "attendance" ? (
            <div className="form-grid">
              <div className="form-note form-span">
                <strong>{modal.employee.name}</strong>
                <span>
                  {modal.employee.employeeCode} ·{" "}
                  {new Date(`${modal.date}T00:00:00`).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </span>
              </div>
              <label>
                <span>Attendance status *</span>
                <select
                  name="statusCode"
                  defaultValue={modal.entry?.statusCode ?? "P"}
                >
                  {Object.entries(statusMeta).map(([code, meta]) => (
                    <option value={code} key={code}>
                      {code} — {meta.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Client-mapped shift *</span>
                <select
                  name="shiftCode"
                  defaultValue={initialShiftCode}
                  onChange={(event) => {
                    const shiftVal = event.target.value;
                    const shiftH = /12\s*(?:h|hr|hour)/i.test(shiftVal) ? 12 : 8;
                    setAttShiftHours(shiftH);
                    if (attPunchIn && attPunchOut) {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      const net = Math.max(0, Math.round((gross - attBreakHours) * 10) / 10);
                      setAttOtHours(Math.max(0, Math.round((net - shiftH) * 10) / 10));
                    }
                  }}
                >
                  {shiftOptions.map((shift) => (
                    <option key={shift}>{shift}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Shift Standard Hours *</span>
                <select
                  value={attShiftHours}
                  onChange={(event) => {
                    const shiftH = Number(event.target.value);
                    setAttShiftHours(shiftH);
                    if (attPunchIn && attPunchOut) {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      const net = Math.max(0, Math.round((gross - attBreakHours) * 10) / 10);
                      setAttOtHours(Math.max(0, Math.round((net - shiftH) * 10) / 10));
                    }
                  }}
                >
                  <option value={8}>8 Hours Shift (Standard)</option>
                  <option value={12}>12 Hours Shift</option>
                </select>
              </label>
              <label>
                <span>Break Duration (Hours)</span>
                <input
                  type="number"
                  min="0"
                  max="6"
                  step="0.5"
                  value={attBreakHours}
                  onChange={(event) => {
                    const breakH = Number(event.target.value) || 0;
                    setAttBreakHours(breakH);
                    if (attPunchIn && attPunchOut) {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      const net = Math.max(0, Math.round((gross - breakH) * 10) / 10);
                      setAttOtHours(Math.max(0, Math.round((net - attShiftHours) * 10) / 10));
                    }
                  }}
                />
              </label>
              <label>
                <span>Punch in</span>
                <input
                  name="punchIn"
                  type="time"
                  value={attPunchIn}
                  onChange={(event) => {
                    const newIn = event.target.value;
                    setAttPunchIn(newIn);
                    if (newIn && attPunchOut) {
                      const [inH, inM] = newIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      const net = Math.max(0, Math.round((gross - attBreakHours) * 10) / 10);
                      setAttOtHours(Math.max(0, Math.round((net - attShiftHours) * 10) / 10));
                    }
                  }}
                />
              </label>
              <label>
                <span>Punch out</span>
                <input
                  name="punchOut"
                  type="time"
                  value={attPunchOut}
                  onChange={(event) => {
                    const newOut = event.target.value;
                    setAttPunchOut(newOut);
                    if (attPunchIn && newOut) {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = newOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      const net = Math.max(0, Math.round((gross - attBreakHours) * 10) / 10);
                      setAttOtHours(Math.max(0, Math.round((net - attShiftHours) * 10) / 10));
                    }
                  }}
                />
              </label>
              {attPunchIn && attPunchOut ? (
                <div
                  className="form-note form-span"
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                  }}
                >
                  <strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} /> Shift OT Breakdown:
                  </strong>
                  <span>
                    Gross: {(() => {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      return Math.round((diff / 60) * 10) / 10;
                    })()}h | Break: {attBreakHours}h | Net Work: {(() => {
                      const [inH, inM] = attPunchIn.split(":").map(Number);
                      const [outH, outM] = attPunchOut.split(":").map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      const gross = Math.round((diff / 60) * 10) / 10;
                      return Math.max(0, Math.round((gross - attBreakHours) * 10) / 10);
                    })()}h | Shift Base: {attShiftHours}h | Approved OT: {attOtHours}h
                  </span>
                </div>
              ) : null}
              <label>
                <span>Approved OT hours</span>
                <input
                  name="overtimeHours"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={attOtHours}
                  onChange={(event) => setAttOtHours(Number(event.target.value) || 0)}
                />
              </label>
              <label>
                <span>Attendance remarks</span>
                <input
                  name="remarks"
                  list="payroll-remark-options"
                  defaultValue={modal.entry?.remarks ?? ""}
                />
              </label>
              <div className="form-note form-span">
                The selected shift applies break time, required work time,
                late/early grace, deduction hours and fixed/approved OT rules
                automatically.
              </div>
            </div>
          ) : null}

          {modal.kind === "salary" ? (
            <div className="salary-form-columns">
              <section className="salary-attendance-inputs">
                <h3>Attendance / payable inputs</h3>
                <div className="form-grid">
                  {[
                    ["fixedWorkingDays", "Fixed W Days"],
                    ["presentDays", "W Days"],
                    ["nfhDays", "NFH"],
                    ["compOffDays", "CO"],
                    ["onDutyDays", "OD"],
                    ["sundayDays", "Sundays"],
                    ["plDays", "PL"],
                    ["clDays", "CL"],
                    ["slDays", "SL"],
                    ["payableDays", "Payable Days"],
                    ["overtimeHours", "OT Hrs"],
                  ].map(([field, label]) => (
                    <label key={field}>
                      <span>{label}</span>
                      <input name={field} type="number" min="0" step="0.5" defaultValue={Number(modal.item[field as keyof PayrollItem] ?? 0)} />
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h3>Earnings</h3>
                <div className="form-grid">
                  {earningFields.map((field) => (
                    <label key={field}>
                      <span>{readableField(field)}</span>
                      <input
                        name={field}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={modal.item[field]}
                      />
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h3>Deductions</h3>
                <div className="form-grid">
                  {deductionFields.map((field) => (
                    <label key={field}>
                      <span>{readableField(field)}</span>
                      <input
                        name={field}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={modal.item[field]}
                      />
                    </label>
                  ))}
                </div>
                <div className="form-note">
                  Room deductions are managed separately under Accommodation.
                </div>
              </section>
            </div>
          ) : null}

          {modal.kind === "accommodation" ? (
            <div className="form-grid">
              <label className="form-span">
                <span>Employee *</span>
                <select
                  name="employeeId"
                  defaultValue={modal.employee?.id ?? employees[0]?.id}
                  required
                >
                  {employees.map((row) => (
                    <option value={row.id} key={row.id}>
                      {row.employeeCode} · {row.name} · {row.accommodationType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-span">
                <span>Room number</span>
                <input
                  name="roomNumber"
                  defaultValue={
                    modal.charge?.roomNumber ?? modal.employee?.roomNumber ?? ""
                  }
                />
              </label>
              {recoveryFields.map((field) => (
                <label key={field}>
                  <span>{readableField(field)} (₹)</span>
                  <input
                    name={field}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={modal.charge?.[field] ?? 0}
                  />
                </label>
              ))}
            </div>
          ) : null}

          {modal.kind === "import" ? (
            <div className="import-form">
              <label>
                <span>Import into payroll month *</span>
                <input
                  type="month"
                  value={importPeriod}
                  onChange={(event) => {
                    const period = event.target.value;
                    setImportPeriod(period);
                    if (selectedFile && period)
                      void inspectFile(selectedFile, period);
                  }}
                  required
                />
              </label>
              <label className="file-drop">
                <input
                  type="file"
                  accept=".xlsx,.csv,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void inspectFile(file, importPeriod);
                  }}
                />
                <Icon name="file" size={25} />
                <strong>
                  {selectedFile?.name ??
                    "Choose Employee Master, Attendance, Salary Register, CSV, or TXT"}
                </strong>
                <span>
                  Supports Excel .xlsx, CSV and tab/pipe/comma-delimited TXT
                  files with employee-master, attendance, or salary-slip
                  headers.
                </span>
              </label>
              {parsing ? (
                <div className="form-note">
                  Reading file and mapping employee records…
                </div>
              ) : null}
              {parseError ? (
                <div className="form-error">{parseError}</div>
              ) : null}
              {parsed ? (
                <div className="import-preview">
                  <span className="eyebrow">
                    File recognized ·{" "}
                    {parsed.sourceType === "salary"
                      ? "Salary import mode"
                      : parsed.sourceType === "employee"
                        ? "Employee master import mode"
                        : "Attendance import mode"}
                  </span>
                  <strong>{parsed.sheetName}</strong>
                  <div>
                    <span>{parsed.employees.length} employees</span>
                    <span>{parsed.attendance.length} attendance marks</span>
                    <span>{parsed.salaryItems.length} salary records</span>
                  </div>
                  <p>
                    Records will be saved to {unit?.clientName} ·{" "}
                    {unit?.unitName} for {monthLabel(importPeriod)}. A payroll
                    run will be created if one does not already exist.
                  </p>
                  {modal.context === "attendance" ? (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--teal, #14b8a6)", fontWeight: 500 }}>
                      🔒 Attendance Mode: Existing employee master data (UAN, ESI, bank account, DOJ, accommodation) is strictly protected and will not be overwritten.
                    </div>
                  ) : modal.context === "payroll" ? (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--teal, #14b8a6)", fontWeight: 500 }}>
                      🔒 Payroll Mode: Only salary items are imported. Statutory compliance and bank details remain untouched.
                    </div>
                  ) : (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--muted, #94a3b8)" }}>
                      📋 Employee Master Mode: Uploading will create or update employee master profiles.
                    </div>
                  )}
                </div>
              ) : null}
              {attendanceMismatches.length > 0 ? (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px 14px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "8px",
                    color: "var(--text-color, #ffffff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <AlertTriangle size={20} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <div>
                      <strong style={{ display: "block", color: "#f59e0b", fontSize: "14px" }}>
                        {attendanceMismatches.length} Previous Date Differences Detected
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>
                        The uploaded file modifies attendance status or OT hours for dates already recorded in the database.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowMismatchPopup(true)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderColor: "#f59e0b",
                      color: "#f59e0b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Search size={13} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} />
                    View Differences
                  </button>
                </div>
              ) : null}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "14px",
                  padding: "10px 14px",
                  background: "var(--surface-subtle, rgba(255,255,255,0.04))",
                  border: "1px solid var(--border, rgba(255,255,255,0.1))",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="overwriteExisting"
                  checked={overwriteExisting}
                  onChange={(event) => setOverwriteExisting(event.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--accent, #6366f1)" }}
                />
                <div>
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    Overwrite / update existing employee details if Emp ID matches
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--muted, #94a3b8)" }}>
                    When enabled, updated UAN, Bank details, ESI, salary, and personal fields from the file will replace existing records.
                  </span>
                </div>
              </label>
            </div>
          ) : null}
        </div>
        <footer className="action-modal-footer">
          {modal.kind === "attendance" && modal.entry ? (
            <button
              className="danger-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete attendance for ${modal.employee.name} on ${modal.date}?`,
                  )
                )
                  void onAction(
                    "delete-attendance",
                    "Attendance and shift entry deleted",
                    {
                      employeeId: modal.employee.id,
                      attendanceDate: modal.date,
                    },
                  );
              }}
            >
              Delete entry
            </button>
          ) : null}
          {modal.kind === "accommodation" && modal.employee && modal.charge ? (
            <button
              className="danger-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Delete accommodation recoveries for ${modal.employee?.name}?`,
                  )
                )
                  void onAction(
                    "delete-accommodation",
                    "Accommodation recoveries deleted",
                    { employeeId: modal.employee?.id },
                  );
              }}
            >
              Delete recovery
            </button>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={busy || parsing || (modal.kind === "import" && !parsed)}
          >
            {busy ? (
              <>
                <span className="button-spinner" />
                Saving…
              </>
            ) : (
              submitLabel
            )}
          </button>
        </footer>
      </form>

      {showMismatchPopup && attendanceMismatches.length > 0 ? (
        <div
          className="modal-layer action-modal-layer"
          style={{ zIndex: 100050 }}
        >
          <div
            className="modal-scrim"
            onClick={() => setShowMismatchPopup(false)}
          />
          <div
            className="action-modal action-modal-wide"
            style={{
              maxWidth: "850px",
              width: "95vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <header className="action-modal-header">
              <div>
                <span className="eyebrow" style={{ color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={14} style={{ color: "#f59e0b" }} /> Conflict &amp; Mismatch Detection
                </span>
                <h2>Review Attendance &amp; OT Differences ({attendanceMismatches.length})</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowMismatchPopup(false)}
              >
                ×
              </button>
            </header>

            <div className="action-modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--muted, #94a3b8)" }}>
                The uploaded spreadsheet contains different attendance codes or overtime hours for dates previously recorded in the database for <strong>{unit?.clientName} · {unit?.unitName}</strong> ({monthLabel(importPeriod)}):
              </p>

              <div style={{ marginBottom: "12px" }}>
                <input
                  type="search"
                  placeholder="Filter by employee name, code, or date..."
                  value={mismatchSearch}
                  onChange={(e) => setMismatchSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, rgba(255,255,255,0.15))",
                    background: "var(--surface-subtle, rgba(255,255,255,0.05))",
                    color: "inherit",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div
                style={{
                  border: "1px solid var(--border, rgba(255,255,255,0.12))",
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-subtle, rgba(255,255,255,0.08))", textAlign: "left", borderBottom: "1px solid var(--border, rgba(255,255,255,0.12))" }}>
                      <th style={{ padding: "8px 12px" }}>Employee</th>
                      <th style={{ padding: "8px 12px" }}>Date</th>
                      <th style={{ padding: "8px 12px" }}>Database (Old)</th>
                      <th style={{ padding: "8px 12px" }}>Excel Sheet (New)</th>
                      <th style={{ padding: "8px 12px" }}>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceMismatches
                      .filter((m) => {
                        if (!mismatchSearch.trim()) return true;
                        const q = mismatchSearch.toLowerCase();
                        return (
                          m.employeeCode.toLowerCase().includes(q) ||
                          m.employeeName.toLowerCase().includes(q) ||
                          m.attendanceDate.toLowerCase().includes(q)
                        );
                      })
                      .map((diff, idx) => {
                        const dateFormatted = new Date(`${diff.attendanceDate}T00:00:00`).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        });
                        return (
                          <tr
                            key={`${diff.employeeCode}-${diff.attendanceDate}-${idx}`}
                            style={{
                              borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
                              background: idx % 2 === 0 ? "transparent" : "var(--surface-subtle, rgba(255,255,255,0.02))",
                            }}
                          >
                            <td style={{ padding: "8px 12px" }}>
                              <strong style={{ display: "block" }}>{diff.employeeName}</strong>
                              <span style={{ fontSize: "11px", color: "var(--muted, #94a3b8)" }}>{diff.employeeCode}</span>
                            </td>
                            <td style={{ padding: "8px 12px", whiteSpace: "nowrap", fontWeight: 600 }}>
                              {dateFormatted}
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(148, 163, 184, 0.15)",
                                  color: "var(--muted, #cbd5e1)",
                                  fontSize: "12px",
                                  fontFamily: "monospace",
                                }}
                              >
                                {diff.oldStatus} {diff.oldOt > 0 ? `| ${diff.oldOt}h OT` : ""}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(99, 102, 241, 0.15)",
                                  color: "#818cf8",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                  fontFamily: "monospace",
                                }}
                              >
                                {diff.newStatus} {diff.newOt > 0 ? `| ${diff.newOt}h OT` : ""}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  background: diff.changeType === "ot_changed"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "rgba(239, 68, 68, 0.15)",
                                  color: diff.changeType === "ot_changed" ? "#fbbf24" : "#f87171",
                                }}
                              >
                                {diff.description}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <footer
              className="action-modal-footer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                padding: "14px 20px",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowMismatchPopup(false)}
              >
                Cancel &amp; Check Excel
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleImportNewDatesOnly()}
                  disabled={busy}
                  style={{ borderColor: "#3b82f6", color: "#60a5fa" }}
                  title="Imports new dates only; preserves previously recorded database entries"
                >
                  <ShieldCheck size={14} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} />
                  Keep Old (Import New Dates Only)
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void handleAcceptAllChanges()}
                  disabled={busy}
                  style={{ background: "#059669", borderColor: "#047857" }}
                  title="Overwrites old dates with the uploaded Excel values"
                >
                  <Check size={14} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} />
                  Accept &amp; Overwrite with Excel
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon name={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function EmployeeCell({
  name,
  code,
  detail,
  phone,
}: {
  name: string;
  code: string;
  detail: string;
  phone?: string | null;
}) {
  return (
    <div className="employee-cell">
      <span>{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        <small>
          {code}
          {detail ? ` · ${detail}` : ""}
          {phone ? ` · Tel: ${phone}` : ""}
        </small>
      </div>
    </div>
  );
}

function getStatutoryDisplayStatus(employee: {
  pfApplicable?: number | null;
  esiApplicable?: number | null;
  uanMasked?: string | null;
  esiMasked?: string | null;
}): string | null {
  const isPf = employee.pfApplicable === 1;
  const isEsi = employee.esiApplicable === 1;
  const hasUan = Boolean(
    employee.uanMasked &&
    employee.uanMasked.trim() &&
    employee.uanMasked.trim().toUpperCase() !== "NIL",
  );
  const hasEsi = Boolean(
    employee.esiMasked &&
    employee.esiMasked.trim() &&
    employee.esiMasked.trim().toUpperCase() !== "NIL",
  );

  if (!isPf && !isEsi) {
    if (hasUan && hasEsi) return "EPF / ESI ready";
    if (hasUan) return "EPF ready";
    if (hasEsi) return "ESI ready";
    return "Not required";
  }
  if (isPf && !isEsi) {
    return hasUan ? "EPF ready" : null;
  }
  if (!isPf && isEsi) {
    return hasEsi ? "ESI ready" : null;
  }
  return hasUan && hasEsi ? "EPF / ESI ready" : null;
}

function FieldState({ value }: { value: string | null }) {
  return value ? (
    <span className="field-ready">
      <Icon name="check" size={14} />
      {value}
    </span>
  ) : (
    <span className="field-pending">
      <Icon name="alert" size={14} />
      Pending
    </span>
  );
}

function RecordActions({
  status,
  onEdit,
  onToggle,
  onDelete,
  onOpen,
}: {
  status: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
}) {
  return (
    <div className="record-actions">
      {onOpen ? (
        <button className="record-action" onClick={onOpen}>
          Open
        </button>
      ) : null}
      <button className="record-action" onClick={onEdit}>
        Edit
      </button>
      <button className="record-action" onClick={onToggle}>
        {status === "active" ? "Deactivate" : "Activate"}
      </button>
      <button className="record-action record-delete" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  return (
    <span className={`status-pill pill-${key}`}>
      <i />
      {status}
    </span>
  );
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '""';
          const str = String(cell);
          // If the cell contains long numbers (10+ digits like UAN: 12, Bank Acc: 10-18, ESI: 10)
          // or starts with 0 and digits (to prevent Excel from stripping leading 0s),
          // format as Excel text formula `="123456789012"` so Excel displays literal digits without scientific notation (1.23E+11).
          if (/^\d{10,}$/.test(str) || (/^0\d+$/.test(str) && str.length > 1)) {
            return `="${str.replaceAll('"', '""')}"`;
          }
          return `"${str.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadXlsx(
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
  sheetName = "Sheet1",
) {
  const xml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const column = (index: number) => {
    let label = "";
    for (let value = index + 1; value; value = Math.floor((value - 1) / 26))
      label = String.fromCharCode(65 + ((value - 1) % 26)) + label;
    return label;
  };
  // Calculate natural, comfortable column widths matching cell contents
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
    let maxLen = 8;
    for (const row of rows) {
      const cell = row[colIdx];
      if (cell !== null && cell !== undefined) {
        maxLen = Math.max(maxLen, String(cell).length);
      }
    }
    return Math.min(Math.max(maxLen + 3, 10), 32);
  });
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((cell, cellIndex) => {
            const ref = `${column(cellIndex)}${rowIndex + 1}`;
            if (cell === null || cell === undefined || cell === "") {
              return `<c r="${ref}"${rowIndex === 0 ? ' s="1"' : ' s="2"'}/>`;
            }
            return typeof cell === "number"
              ? `<c r="${ref}"${rowIndex === 0 ? ' s="1"' : ' s="0"'}><v>${cell}</v></c>`
              : `<c r="${ref}" t="inlineStr"${rowIndex === 0 ? ' s="1"' : ' s="2"'}><is><t>${xml(String(cell))}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const colsXml = colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    ),
    "xl/styles.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="49" formatCode="@"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf fontId="0" fillId="0" borderId="0" xfId="0" numFmtId="49" applyNumberFormat="1"/></cellXfs></styleSheet>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView tabSelected="1" workbookViewId="0" topLeftCell="A1"/></sheetViews><cols>${colsXml}</cols><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  };
  const workbookBytes = new Uint8Array(zipSync(files));
  const url = URL.createObjectURL(
    new Blob([workbookBytes.buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function numberToWordsIndian(value: number): string {
  if (value === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const underHundred = (number: number) =>
    number < 20
      ? ones[number]
      : `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
  const underThousand = (number: number) =>
    number < 100
      ? underHundred(number)
      : `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${underHundred(number % 100)}` : ""}`;
  const groups: Array<[number, string]> = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ];
  let remaining = value;
  const words: string[] = [];
  for (const [size, label] of groups) {
    const count = Math.floor(remaining / size);
    if (count) {
      words.push(`${underThousand(count)} ${label}`);
      remaining %= size;
    }
  }
  if (remaining) words.push(underThousand(remaining));
  return words.join(" ");
}
