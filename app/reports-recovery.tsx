"use client";
// JOY_FINALIZED_VOUCHER_COMPLETENESS_V1

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Check } from "lucide-react";
import {
  printIsolatedElement,
  type PayrollPrintTarget,
} from "../lib/print-document";
import { formatDisplayDate } from "../lib/date-format";
import { downloadXlsx } from "../lib/export-xlsx";
import { recoveryAllowedDateRange } from "../lib/payroll-operations";
import {
  TablePagination,
  type AccommodationCharge,
  type AppData,
  type ClientUnit,
  type Employee,
  type PayrollItem,
  type PayrollRun,
  type RecoveryEntry,
  type Vendor,
} from "./payroll-app";

type ReportRow = Array<string | number>;

function csvCell(value: string | number) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (/^\d{10,}$/.test(str) || (/^0\d+$/.test(str) && str.length > 1)) {
    return `="${str.replaceAll('"', '""')}"`;
  }
  return `"${str.replaceAll('"', '""')}"`;
}
function save(filename: string, body: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function exportCsv(name: string, rows: ReportRow[]) {
  save(
    `${name}.csv`,
    rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    "text/csv;charset=utf-8",
  );
}
function exportExcel(name: string, rows: ReportRow[]) {
  downloadXlsx(`${name}.xlsx`, rows, "Recovery Report");
}

function printTarget() {
  const target: PayrollPrintTarget = document.querySelector(".bulk-recovery-vouchers")
    ? "bulk-vouchers"
    : document.querySelector(".room-report-modal .advance-voucher")
      ? "voucher"
      : "report";
  const source = target === "bulk-vouchers"
    ? document.querySelector<HTMLElement>(".bulk-recovery-vouchers")
    : target === "voucher"
      ? document.querySelector<HTMLElement>(".advance-voucher-layer .advance-voucher")
      : document.querySelector<HTMLElement>(".room-report-layer .room-report-pages, .report-print-area");
  if (!source) return;
  void printIsolatedElement(source, target);
}

function monthLabel(period?: string | null) {
  if (!period) return "";
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

const recoveryLabels: Record<string, string> = {
  rent: "Common room rent",
  bus: "Transport rent",
  gasShare: "Gas amount",
  rationShare: "Ration amount",
  provisionShare: "Provision amount",
  food: "Food",
  advance: "Salary advance",
  idCard: "ID card",
  medical: "Medical",
  ticket: "Ticket",
  shoe: "Shoe",
  aadhaarUpdate: "Aadhaar update",
  bankAccountCharge: "Bank account charge",
  tshirt: "T-shirt",
  oldPending: "Old pending",
  returnAmount: "Return amount",
};

function voucherBrand(vendor?: Vendor, unit?: ClientUnit) {
  const companyName = vendor?.legalName ?? vendor?.name ?? "JOY GROUPS";
  const address =
    unit?.payslipAddress ??
    "8/40, NO.16, FIRST FLOOR, KRISHNA COMPLEX, AVINASHI MAIN ROAD, THENNAMPALAYM, COIMBATORE - 641407";
  const contact =
    unit?.payslipContact ??
    "CONTACT 7845966580, ESI/EPF CONTACT 7845956580, MANAGER 7825906580, MD 9080776580";
  return {
    companyName,
    clientEmployer: unit
      ? `${unit.clientName}${unit.unitName ? ` · ${unit.unitName}` : ""}`
      : "Client employer",
    address,
    contact,
  };
}

function isEmployeeActiveInPeriod(emp: Employee, period?: string | null) {
  if (emp.status === "active") return true;
  if (!period) return false;
  if (emp.finalPayrollMonth) {
    const leftMonth = emp.dateOfLeaving ? emp.dateOfLeaving.slice(0, 7) : emp.finalPayrollMonth;
    const startMonth = leftMonth < emp.finalPayrollMonth ? leftMonth : emp.finalPayrollMonth;
    return period >= startMonth && period <= emp.finalPayrollMonth;
  }
  if (emp.dateOfLeaving && emp.dateOfLeaving.startsWith(`${period}-`)) return true;
  return false;
}

export function RecoveryCenter({
  run,
  vendorId,
  employees,
  items,
  charges,
  data,
  canManage,
  canApprove,
  isActing,
  onAction,
}: {
  run: PayrollRun | null;
  vendorId: string;
  employees: Employee[];
  items: PayrollItem[];
  charges: AccommodationCharge[];
  data: AppData;
  canManage: boolean;
  canApprove: boolean;
  isActing: boolean;
  onAction: (
    action: string,
    message: string,
    details?: Record<string, unknown>,
  ) => Promise<boolean>;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [selectedRecoveryEmployeeIds, setSelectedRecoveryEmployeeIds] = useState<string[]>([]);
  const [selectedFinalizeEmployeeIds, setSelectedFinalizeEmployeeIds] = useState<string[]>([]);

  // Enhanced multi-criteria search: Name, Employee Code, Mobile #, Room #, UAN / Aadhaar digits
  const filteredRecoveryEmployees = employees.filter((emp) => {
    if (!employeeSearchQuery.trim()) return true;
    const q = employeeSearchQuery.trim().toLowerCase();
    const cleanDigits = q.replace(/[\s-]/g, "");
    if (emp.name.toLowerCase().includes(q) || emp.employeeCode.toLowerCase().includes(q)) return true;
    if (emp.mobileNumber && emp.mobileNumber.replace(/[\s-]/g, "").includes(cleanDigits)) return true;
    if (emp.roomNumber && (emp.roomNumber.toLowerCase().includes(q) || q.includes(emp.roomNumber.toLowerCase()))) return true;
    if (emp.uanMasked && emp.uanMasked.includes(cleanDigits)) return true;
    if (emp.bankAccountMasked && emp.bankAccountMasked.includes(cleanDigits)) return true;
    return false;
  });

  // Roommate auto-detection when a primary candidate is selected
  const primarySelectedEmp = useMemo(() => {
    if (!selectedRecoveryEmployeeIds.length) return null;
    return employees.find((e) => e.id === selectedRecoveryEmployeeIds[0]) ?? null;
  }, [employees, selectedRecoveryEmployeeIds]);

  const detectedRoomNumber = useMemo(() => {
    if (!primarySelectedEmp) return null;
    return (
      primarySelectedEmp.roomNumber ||
      data.accommodationRooms.find((r) => r.id === primarySelectedEmp.roomId)?.roomNumber ||
      null
    );
  }, [data.accommodationRooms, primarySelectedEmp]);

  const detectedRoommates = useMemo(() => {
    if (!primarySelectedEmp || !detectedRoomNumber) return [];
    return employees.filter(
      (e) =>
        e.status === "active" &&
        ((e.roomId && primarySelectedEmp.roomId && e.roomId === primarySelectedEmp.roomId) ||
          (e.roomNumber && e.roomNumber === detectedRoomNumber)),
    );
  }, [detectedRoomNumber, employees, primarySelectedEmp]);

  const [recoveryDate, setRecoveryDate] = useState(
    run?.periodStart ??
    `${run?.payPeriod ?? new Date().toISOString().slice(0, 7)}-01`,
  );
  const allowedRecoveryRange = useMemo(() => {
    if (!run?.payPeriod) return null;
    return recoveryAllowedDateRange(run.payPeriod, run.periodStart, run.periodEnd);
  }, [run?.payPeriod, run?.periodStart, run?.periodEnd]);
  const [recoveryType, setRecoveryType] = useState("advance");
  const [amount, setAmount] = useState(0);
  const [indGas, setIndGas] = useState<number>(0);
  const [indRation, setIndRation] = useState<number>(0);
  const [indProvision, setIndProvision] = useState<number>(0);
  const [indRent, setIndRent] = useState<number>(0);
  const [indBus, setIndBus] = useState<number>(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [splitBillEqually, setSplitBillEqually] = useState(false);
  const [vendorShopName, setVendorShopName] = useState("");
  const [billReceiptImage, setBillReceiptImage] = useState<string | null>(null);
  const [receiptModalImage, setReceiptModalImage] = useState<string | null>(null);

  useEffect(() => {
    if (!employees.some((e) => e.id === employeeId)) {
      setEmployeeId(employees[0]?.id ?? "");
    }
    setSelectedRecoveryEmployeeIds((current) =>
      current.filter((id) => employees.some((e) => e.id === id)),
    );
    setSelectedFinalizeEmployeeIds((current) =>
      current.filter((id) => employees.some((e) => e.id === id)),
    );
  }, [employees]);

  useEffect(() => {
    if (
      [
        "provision",
        "provisionShare",
        "ration",
        "rationShare",
        "gas",
        "gasShare",
        "food",
      ].includes(recoveryType)
    ) {
      setSplitBillEqually(true);
    }
  }, [recoveryType]);
  const [voucherEmployeeId, setVoucherEmployeeId] = useState<string | null>(
    null,
  );
  const [bulkVouchers, setBulkVouchers] = useState(false);
  const [roomPrintRoom, setRoomPrintRoom] = useState("");
  const [recoveryClientFilter, setRecoveryClientFilter] = useState("");
  const [entryClientFilter, setEntryClientFilter] = useState("");
  const [entryRoomFilter, setEntryRoomFilter] = useState("");
  const [roomLedgerFilter, setRoomLedgerFilter] = useState("");
  const [entriesPage, setEntriesPage] = useState(1);
  const [recoveryPage, setRecoveryPage] = useState(1);
  const [roomLedgerPage, setRoomLedgerPage] = useState(1);

  // Super Admin Room Recovery Ledger Editing state
  const [editingRoomExpense, setEditingRoomExpense] = useState<(typeof data.roomExpenses)[number] | null>(null);
  const [editRoomDate, setEditRoomDate] = useState("");
  const [editRoomId, setEditRoomId] = useState("");
  const [editRoomGas, setEditRoomGas] = useState(0);
  const [editRoomRation, setEditRoomRation] = useState(0);
  const [editRoomProvision, setEditRoomProvision] = useState(0);
  const [editRoomRent, setEditRoomRent] = useState(0);
  const [editRoomTransport, setEditRoomTransport] = useState(0);
  const [editRoomMembers, setEditRoomMembers] = useState<string[]>([]);
  const [editRoomInitialOccupants, setEditRoomInitialOccupants] = useState<string[]>([]);
  const [editMemberSearch, setEditMemberSearch] = useState("");
  const [isSavingRoomEdit, setIsSavingRoomEdit] = useState(false);

  // Super Admin Individual Recovery Entry Editing state
  const [editingEntry, setEditingEntry] = useState<RecoveryEntry | null>(null);
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editEntryType, setEditEntryType] = useState("");
  const [editEntryAmount, setEditEntryAmount] = useState(0);
  const [editEntryReference, setEditEntryReference] = useState("");
  const [editEntryNotes, setEditEntryNotes] = useState("");
  const [isSavingEntryEdit, setIsSavingEntryEdit] = useState(false);

  // Super Admin Employee Recovery Summary Editing state
  const [editingEmpRecovery, setEditingEmpRecovery] = useState<{
    employee: Employee;
    charge?: AccommodationCharge;
  } | null>(null);
  const [empRecRent, setEmpRecRent] = useState(0);
  const [empRecBus, setEmpRecBus] = useState(0);
  const [empRecFood, setEmpRecFood] = useState(0);
  const [empRecAdvance, setEmpRecAdvance] = useState(0);
  const [empRecIdCard, setEmpRecIdCard] = useState(0);
  const [empRecMedical, setEmpRecMedical] = useState(0);
  const [empRecTicket, setEmpRecTicket] = useState(0);
  const [empRecShoe, setEmpRecShoe] = useState(0);
  const [empRecAadhaar, setEmpRecAadhaar] = useState(0);
  const [empRecBank, setEmpRecBank] = useState(0);
  const [empRecTshirt, setEmpRecTshirt] = useState(0);
  const [empRecOldPending, setEmpRecOldPending] = useState(0);
  const [empRecReturn, setEmpRecReturn] = useState(0);
  const [isSavingEmpRecovery, setIsSavingEmpRecovery] = useState(false);

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
  }, [recoveryType]);

  // JOY_RECOVERY_SCOPE_MAPPING_V2: the category selector stores the stable
  // concepts "joy" and "outside". Resolve those concepts to the real
  // Operational Master IDs before filtering Hostel/Area and Room masters.
  const normalizeRecoveryAccommodationName = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const isJoyRecoveryAccommodation = (value: string) => {
    const name = normalizeRecoveryAccommodationName(value);
    return name.includes("joy") &&
      (name.includes("hostel") || name.includes("room"));
  };
  const isOutsideRecoveryAccommodation = (value: string) =>
    normalizeRecoveryAccommodationName(value).includes("outside");
  const joySharedRecoveryTypeIds = new Set(
    data.accommodationTypes
      .filter(
        (type) =>
          type.status === "active" &&
          isJoyRecoveryAccommodation(type.name),
      )
      .map((type) => type.id),
  );
  const recoveryVendorRoomIds = new Set(
    data.accommodationRooms
      .filter(
        (room) =>
          room.vendorId === vendorId ||
          joySharedRecoveryTypeIds.has(room.accommodationTypeId),
      )
      .map((room) => room.id),
  );
  const recoveryRoomEntries = data.roomExpenses.filter((expense) =>
    recoveryVendorRoomIds.has(expense.roomId),
  );
  const [roomRecoveryDate, setRoomRecoveryDate] = useState("");
  type RecoveryScope = "" | "joy" | "outside";
  const [roomRecoveryScope, setRoomRecoveryScope] = useState<RecoveryScope>("");
  const [roomRecoveryHostelId, setRoomRecoveryHostelId] = useState("");
  const [roomRecoveryArea, setRoomRecoveryArea] = useState("");
  const [roomRecoveryId, setRoomRecoveryId] = useState("");
  const [roomRecoveryMembers, setRoomRecoveryMembers] = useState<string[]>([]);
  const [roomRecoveryConfirmed, setRoomRecoveryConfirmed] = useState(false);
  const [roomRecoveryGas, setRoomRecoveryGas] = useState(0);
  const [roomRecoveryRation, setRoomRecoveryRation] = useState(0);
  const [roomRecoveryProvision, setRoomRecoveryProvision] = useState(0);
  const [roomRecoveryRoomRent, setRoomRecoveryRoomRent] = useState(0);
  const [roomRecoveryTransport, setRoomRecoveryTransport] = useState(0);
  const [roomMemberPage, setRoomMemberPage] = useState(1);
  const [roomMemberSearch, setRoomMemberSearch] = useState("");
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const recoveryPreviewPeriod =
    run?.payPeriod ??
    [...new Set(recoveryRoomEntries.map((expense) => expense.payPeriod))]
      .sort((left, right) => right.localeCompare(left))[0] ??
    new Date().toISOString().slice(0, 7);
  const roomRecoveryPeriod = roomRecoveryDate
    ? roomRecoveryDate.slice(0, 7)
    : recoveryPreviewPeriod;

  const activeRunIds = useMemo(() => {
    return new Set(
      data.runs
        .filter((r) => r.payPeriod === recoveryPreviewPeriod)
        .map((r) => r.id),
    );
  }, [data.runs, recoveryPreviewPeriod]);

  // JOY_HANDWRITTEN_RECOVERY_FIXES_V1_APPLIED
  const runCharges = run
    ? charges.filter((charge) => charge.runId === run.id)
    : [];
  const entries = useMemo(() => {
    return data.recoveryEntries.filter((entry) => {
      if (run && entry.runId === run.id) return true;
      if (entry.runId && activeRunIds.has(entry.runId)) return true;
      if (entry.recoveryDate && entry.recoveryDate.startsWith(recoveryPreviewPeriod)) return true;
      return false;
    });
  }, [data.recoveryEntries, activeRunIds, run, recoveryPreviewPeriod]);
  const finalizations = run
    ? data.recoveryFinalizations.filter((entry) => entry.runId === run.id)
    : [];

  function getRecoveryRoomNumber(employee: Employee) {
    if (employee.roomId) {
      const room = data.accommodationRooms.find((r) => r.id === employee.roomId);
      if (room?.roomNumber) return room.roomNumber;
    }
    return employee.roomNumber ?? "—";
  }

  const recoveryBaseEmployees = useMemo(() => {
    const companyEmployees = data.employees.filter(
      (e) =>
        isEmployeeActiveInPeriod(e, recoveryPreviewPeriod) &&
        (!vendorId || e.vendorId === vendorId),
    );
    if (companyEmployees.length > 0) return companyEmployees;
    return employees;
  }, [data.employees, vendorId, employees, recoveryPreviewPeriod]);

  const allEmployeeRecoveryRows = recoveryBaseEmployees
    .map((employee) => {
      const charge =
        runCharges.find((entry) => entry.employeeId === employee.id) ??
        charges.find(
          (entry) =>
            entry.employeeId === employee.id &&
            (activeRunIds.has(entry.runId) || entry.runId === run?.id),
        );
      const item =
        items.find((entry) => entry.employeeId === employee.id) ??
        data.payrollItems.find(
          (entry) =>
            entry.employeeId === employee.id &&
            (activeRunIds.has(entry.runId) || entry.runId === run?.id),
        );
      const empDated = entries.filter((entry) => entry.employeeId === employee.id);
      const dated = empDated.length
        ? empDated
        : data.recoveryEntries.filter(
            (entry) =>
              entry.employeeId === employee.id &&
              (activeRunIds.has(entry.runId) ||
                entry.runId === run?.id ||
                entry.recoveryDate?.startsWith(recoveryPreviewPeriod)),
          );
      const datedSum = (type: string) =>
        dated
          .filter((entry) => entry.recoveryType === type)
          .reduce((sum, entry) => sum + entry.amount, 0);

      // In the Recoveries module, all deductions are strictly 100% software-driven:
      // individual entries by dropdown recoveryType + room-allocated/finalized charges.
      const rent = datedSum("rent") > 0 ? datedSum("rent") : (charge?.rent ?? 0);
      const bus = datedSum("bus") > 0 ? datedSum("bus") : (charge?.bus ?? 0);
      const food = datedSum("food") > 0 ? datedSum("food") : (charge?.food ?? 0);
      const advance = datedSum("advance") > 0 ? datedSum("advance") : (charge?.advance ?? 0);
      const idCard = datedSum("idCard") > 0 ? datedSum("idCard") : (charge?.idCard ?? 0);
      const medical = datedSum("medical") > 0 ? datedSum("medical") : (charge?.medical ?? 0);
      const ticket = datedSum("ticket") > 0 ? datedSum("ticket") : (charge?.ticket ?? 0);
      const shoe = datedSum("shoe") > 0 ? datedSum("shoe") : (charge?.shoe ?? 0);
      const aadhaarUpdate = datedSum("aadhaarUpdate") > 0 ? datedSum("aadhaarUpdate") : (charge?.aadhaarUpdate ?? 0);
      const bankAccountCharge = datedSum("bankAccountCharge") > 0 ? datedSum("bankAccountCharge") : (charge?.bankAccountCharge ?? 0);
      const tshirt = datedSum("tshirt") > 0 ? datedSum("tshirt") : (charge?.tshirt ?? 0);
      const oldPending = datedSum("oldPending") > 0 ? datedSum("oldPending") : (charge?.oldPending ?? 0);
      const returnAmount = datedSum("returnAmount") > 0 ? datedSum("returnAmount") : (charge?.returnAmount ?? 0);

      const individual =
        rent +
        bus +
        food +
        advance +
        idCard +
        medical +
        ticket +
        shoe +
        aadhaarUpdate +
        bankAccountCharge +
        tshirt +
        oldPending;
      const finalizedGasShare = charge?.gasShare ?? 0;
      const finalizedRationShare = charge?.rationShare ?? 0;
      const finalizedProvisionShare = charge?.provisionShare ?? 0;
      const targetRoom =
        (employee.roomId
          ? data.accommodationRooms.find((r) => r.id === employee.roomId)
          : null) ??
        (employee.roomNumber
          ? data.accommodationRooms.find(
              (r) =>
                r.roomNumber === employee.roomNumber &&
                (!employee.vendorId || r.vendorId === employee.vendorId),
            )
          : null);
      const targetRoomId = targetRoom?.id ?? employee.roomId;
      const targetRoomNumber = targetRoom?.roomNumber ?? employee.roomNumber;
      const draftRoomLedger =
        targetRoomId && !charge?.roomExpenseId
          ? recoveryRoomEntries.filter(
            (expense) =>
              expense.roomId === targetRoomId &&
              expense.payPeriod === recoveryPreviewPeriod &&
              expense.status === "draft",
          )
          : [];
      const activeRoommates = targetRoomId
        ? data.employees.filter(
          (candidate) =>
            isEmployeeActiveInPeriod(candidate, recoveryPreviewPeriod) &&
            (candidate.roomId === targetRoomId ||
              (targetRoomNumber &&
                candidate.roomNumber === targetRoomNumber &&
                (!candidate.roomId || candidate.roomId === targetRoomId) &&
                (!candidate.vendorId || !targetRoom?.vendorId || candidate.vendorId === targetRoom.vendorId))),
        )
        : [];
      const roomDivisor = Math.max(
        1,
        activeRoommates.length > 0
          ? activeRoommates.length
          : draftRoomLedger[0]?.occupantCount ?? 1,
      );
      const pendingGasShare =
        draftRoomLedger.reduce(
          (sum, expense) => sum + expense.gasAmount,
          0,
        ) / roomDivisor;
      const pendingRationShare =
        draftRoomLedger.reduce(
          (sum, expense) => sum + expense.rationAmount,
          0,
        ) / roomDivisor;
      const pendingProvisionShare =
        draftRoomLedger.reduce(
          (sum, expense) => sum + expense.provisionAmount,
          0,
        ) / roomDivisor;
      const pendingRentShare =
        draftRoomLedger.reduce(
          (sum, expense) => sum + ((expense as any).roomRentAmount ?? 0),
          0,
        ) / roomDivisor;
      const pendingTransportShare =
        draftRoomLedger.reduce(
          (sum, expense) => sum + ((expense as any).transportRentAmount ?? 0),
          0,
        ) / roomDivisor;
      const pendingShared =
        pendingGasShare + pendingRationShare + pendingProvisionShare + pendingRentShare + pendingTransportShare;
      const gasShare = finalizedGasShare + pendingGasShare;
      const rationShare = finalizedRationShare + pendingRationShare;
      const provisionShare =
        finalizedProvisionShare + pendingProvisionShare;
      const shared = gasShare + rationShare + provisionShare;
      const effectiveRent = rent > 0 ? rent : pendingRentShare;
      const effectiveBus = bus > 0 ? bus : pendingTransportShare;
      const individualWithEffective =
        effectiveRent +
        effectiveBus +
        food +
        advance +
        idCard +
        medical +
        ticket +
        shoe +
        aadhaarUpdate +
        bankAccountCharge +
        tshirt +
        oldPending;
      return {
        employee,
        charge,
        rent: effectiveRent,
        bus: effectiveBus,
        food,
        advance,
        idCard,
        medical,
        ticket,
        shoe,
        aadhaarUpdate,
        bankAccountCharge,
        tshirt,
        oldPending,
        returnAmount,
        individual: individualWithEffective,
        shared,
        pendingShared,
        gasShare,
        rationShare,
        provisionShare,
        total: individualWithEffective + shared,
        item,
        dated,
      };
    })
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const emp = data.employees.find((e) => e.id === entry.employeeId);
      if (entryClientFilter && emp?.clientUnitId !== entryClientFilter) return false;
      if (entryRoomFilter && getRecoveryRoomNumber(emp ?? ({} as Employee)) !== entryRoomFilter) return false;
      return true;
    });
  }, [entries, data.employees, entryClientFilter, entryRoomFilter, data.accommodationRooms]);

  const entryFilteredRooms = useMemo(() => {
    const activeRooms = new Set<string>();
    const emps = entryClientFilter
      ? data.employees.filter((e) => e.clientUnitId === entryClientFilter && (!vendorId || e.vendorId === vendorId))
      : data.employees.filter((e) => (!vendorId || e.vendorId === vendorId));

    emps.forEach((e) => {
      const roomNum = getRecoveryRoomNumber(e);
      if (roomNum && roomNum !== "—") activeRooms.add(roomNum);
    });

    if (!entryClientFilter) {
      data.accommodationRooms
        .filter((r) => (!vendorId || r.vendorId === vendorId) && r.status === "active")
        .forEach((r) => {
          if (r.roomNumber && r.roomNumber !== "—") activeRooms.add(r.roomNumber);
        });
    }

    return Array.from(activeRooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data.employees, data.accommodationRooms, entryClientFilter, vendorId]);

  const employeeRows = useMemo(() => {
    return allEmployeeRecoveryRows.filter(({ employee }) => {
      if (recoveryClientFilter && employee.clientUnitId !== recoveryClientFilter) return false;
      if (roomPrintRoom && getRecoveryRoomNumber(employee) !== roomPrintRoom) return false;
      return true;
    });
  }, [allEmployeeRecoveryRows, recoveryClientFilter, roomPrintRoom, data.accommodationRooms]);

  const roomRows = recoveryRoomEntries
    .filter((expense) => expense.payPeriod === recoveryPreviewPeriod)
    .map((expense) => ({
      expense,
      room: data.accommodationRooms.find((room) => room.id === expense.roomId),
    }));

  const filteredRoomRows = useMemo(() => {
    if (!roomLedgerFilter) return roomRows;
    return roomRows.filter(({ room, expense }) => {
      const roomNum = room?.roomNumber ?? expense.roomId;
      return roomNum === roomLedgerFilter;
    });
  }, [roomRows, roomLedgerFilter]);
  const roomPeriodTotals = roomRows.reduce(
    (totals, { expense }) => {
      const rentAmt = (expense as any).roomRentAmount ?? 0;
      const transAmt = (expense as any).transportRentAmount ?? 0;
      const rowSum = expense.gasAmount + expense.rationAmount + expense.provisionAmount + rentAmt + transAmt;
      return {
        gas: totals.gas + expense.gasAmount,
        ration: totals.ration + expense.rationAmount,
        provision: totals.provision + expense.provisionAmount,
        roomRent: totals.roomRent + rentAmt,
        transport: totals.transport + transAmt,
        overall: totals.overall + rowSum,
        finalized: totals.finalized + (expense.status === "finalized" ? rowSum : 0),
        draft: totals.draft + (expense.status === "draft" ? rowSum : 0),
      };
    },
    { gas: 0, ration: 0, provision: 0, roomRent: 0, transport: 0, overall: 0, finalized: 0, draft: 0 },
  );
  const roomRecoveryDateTotals = Object.values(
    roomRows.reduce<
      Record<
        string,
        {
          date: string;
          status: string;
          gas: number;
          ration: number;
          provision: number;
          overall: number;
        }
      >
    >((totals, { expense }) => {
      for (const [date, component, amount] of [
        [expense.gasDate ?? `${expense.payPeriod}-01`, "gas", expense.gasAmount],
        [expense.rationDate ?? `${expense.payPeriod}-01`, "ration", expense.rationAmount],
        [expense.provisionDate ?? `${expense.payPeriod}-01`, "provision", expense.provisionAmount],
      ] as const) {
        if (amount <= 0) continue;
        const key = `${date}|${expense.status}`;
        totals[key] ??= {
          date,
          status: expense.status,
          gas: 0,
          ration: 0,
          provision: 0,
          overall: 0,
        };
        totals[key][component] += amount;
        totals[key].overall += amount;
      }
      return totals;
    }, {}),
  ).sort((left, right) =>
    left.date === right.date
      ? left.status.localeCompare(right.status)
      : left.date.localeCompare(right.date),
  );
  const clientFilteredEmployees = useMemo(() => {
    if (!recoveryClientFilter) {
      return recoveryBaseEmployees;
    }
    return recoveryBaseEmployees.filter((e) => e.clientUnitId === recoveryClientFilter);
  }, [recoveryBaseEmployees, recoveryClientFilter]);

  const roomPrintRooms = useMemo(() => {
    const activeRooms = new Set<string>();

    clientFilteredEmployees.forEach((e) => {
      const roomNum = getRecoveryRoomNumber(e);
      if (roomNum && roomNum !== "—") {
        activeRooms.add(roomNum);
      }
    });

    if (!recoveryClientFilter) {
      data.accommodationRooms
        .filter((r) => (!vendorId || r.vendorId === vendorId) && r.status === "active")
        .forEach((r) => {
          if (r.roomNumber && r.roomNumber !== "—") activeRooms.add(r.roomNumber);
        });
      roomRows
        .filter(({ expense }) => expense.status === "finalized")
        .forEach(({ room }) => {
          const roomNum = room?.roomNumber ?? "—";
          if (roomNum && roomNum !== "—") activeRooms.add(roomNum);
        });
    }

    return Array.from(activeRooms).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [clientFilteredEmployees, recoveryClientFilter, data.accommodationRooms, roomRows, vendorId]);

  function getRoomLabel(roomNum: string) {
    const matchingRooms = data.accommodationRooms.filter(
      (r) =>
        r.roomNumber?.trim().toUpperCase() === roomNum.trim().toUpperCase() &&
        (!vendorId || r.vendorId === vendorId),
    );
    if (matchingRooms.length > 0) {
      const hostelsFound = Array.from(
        new Set(
          matchingRooms
            .map((r) => data.hostels.find((h) => h.id === r.hostelId)?.name)
            .filter(Boolean),
        ),
      );
      if (hostelsFound.length > 0) {
        return `Room ${roomNum} (${hostelsFound.join(", ")})`;
      }
    }
    return `Room ${roomNum}`;
  }

  const healthCheckIssues = useMemo(() => {
    const issues: Array<{ type: "danger" | "warning"; title: string; detail: string }> = [];

    // 1. Duplicate dated entries for same room
    const seenRoomDates = new Map<string, number>();
    recoveryRoomEntries
      .filter((e) => e.payPeriod === recoveryPreviewPeriod)
      .forEach((e) => {
        const d = e.gasDate || e.rationDate || e.provisionDate || "undated";
        const key = `${e.roomId}|${d}`;
        seenRoomDates.set(key, (seenRoomDates.get(key) || 0) + 1);
      });
    seenRoomDates.forEach((count, key) => {
      if (count > 1) {
        const [rId, d] = key.split("|");
        const rName = data.accommodationRooms.find((r) => r.id === rId)?.roomNumber || rId;
        issues.push({
          type: "danger",
          title: `Duplicate Room Expense Entries: Room ${rName}`,
          detail: `${count} entries found on date ${d} for pay period ${recoveryPreviewPeriod}. This can cause double-deductions.`,
        });
      }
    });

    // 2. Room expenses with 0 occupants
    recoveryRoomEntries
      .filter((e) => e.payPeriod === recoveryPreviewPeriod)
      .forEach((e) => {
        const total = (e.gasAmount || 0) + (e.rationAmount || 0) + (e.provisionAmount || 0);
        const r = data.accommodationRooms.find((room) => room.id === e.roomId);
        const rName = r?.roomNumber || e.roomId;
        const liveOccupants = data.employees.filter(
          (emp) =>
            emp.status === "active" &&
            (emp.roomId === e.roomId || (r?.roomNumber && emp.roomNumber === r.roomNumber)),
        );
        if (total > 0 && liveOccupants.length === 0) {
          issues.push({
            type: "danger",
            title: `Zero Occupants with Expense: Room ${rName}`,
            detail: `₹${total.toFixed(2)} recorded in ${recoveryPreviewPeriod}, but 0 active employees are assigned to this room.`,
          });
        }
      });

    // 3. Employees with room text but no room_id or cross-vendor room_id
    const unlinkedEmps = data.employees.filter(
      (e) =>
        e.status === "active" &&
        (!vendorId || e.vendorId === vendorId) &&
        e.roomNumber &&
        (!e.roomId || !data.accommodationRooms.some((r) => r.id === e.roomId)),
    );
    if (unlinkedEmps.length > 0) {
      issues.push({
        type: "warning",
        title: `Unlinked Room Allocations (${unlinkedEmps.length} Employees)`,
        detail: `Employees have room name text, but are not mapped to an active room ID in the master table.`,
      });
    }

    // 4. Split math discrepancies
    roomRows
      .filter(({ expense }) => expense.status === "finalized")
      .forEach(({ expense, room }) => {
        const linkedCharges = data.accommodationCharges.filter(
          (c) => c.roomExpenseId === expense.id,
        );
        if (linkedCharges.length > 0) {
          const sumGas = linkedCharges.reduce((s, c) => s + (c.gasShare || 0), 0);
          if (Math.abs(sumGas - expense.gasAmount) > 5) {
            issues.push({
              type: "danger",
              title: `Split Math Mismatch: Room ${room?.roomNumber || expense.roomId}`,
              detail: `Gas expense was ₹${expense.gasAmount.toFixed(2)}, but total charged to employees was ₹${sumGas.toFixed(2)}.`,
            });
          }
        }
      });

    return issues;
  }, [recoveryRoomEntries, recoveryPreviewPeriod, data.accommodationRooms, data.employees, data.accommodationCharges, roomRows, vendorId]);

  function printRoomRecovery(selectedRooms: string[]) {
    if (!selectedRooms.length) return;

    const optionalRecoveryPrintHeaders = new Set([
      "Rent",
      "Bus",
      "Food",
      "Advance",
      "ID",
      "Medical",
      "Ticket",
      "Shoe",
      "Aadhaar",
      "Bank A/c",
      "T-shirt",
      "Old pending",
      "Gas",
      "Ration",
      "Provision",
    ]);
    const printedAmount = (value: string | number) => {
      const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    document.querySelector(".room-recovery-print-layer")?.remove();
    const layer = document.createElement("div");
    layer.className = "room-recovery-print-layer";

    const monthStr = run?.payPeriod ? monthLabel(run.payPeriod).toUpperCase() : "";
    const cycleStr = run?.periodStart && run?.periodEnd ? `${run.periodStart} to ${run.periodEnd}` : (run?.payPeriod ?? "");
    const periodBadge = monthStr ? `${monthStr} (${cycleStr})` : cycleStr;

    selectedRooms.forEach((roomName) => {
      // Find ALL occupants for this room across the full dataset (not limited by UI table pagination)
      const roomEmployees = allEmployeeRecoveryRows.filter(({ employee }) => {
        if (recoveryClientFilter && employee.clientUnitId !== recoveryClientFilter) return false;
        return getRecoveryRoomNumber(employee) === roomName;
      });

      const finalizedRoomRow = roomRows.find(({ expense, room }) =>
        expense.status === "finalized" && room?.roomNumber === roomName,
      );
      const gas = roomEmployees.length
        ? roomEmployees.reduce((sum, row) => sum + row.gasShare, 0)
        : finalizedRoomRow?.expense.gasAmount ?? 0;
      const ration = roomEmployees.length
        ? roomEmployees.reduce((sum, row) => sum + row.rationShare, 0)
        : finalizedRoomRow?.expense.rationAmount ?? 0;
      const provision = roomEmployees.length
        ? roomEmployees.reduce((sum, row) => sum + row.provisionShare, 0)
        : finalizedRoomRow?.expense.provisionAmount ?? 0;
      const roomTotalRecovery = roomEmployees.reduce((sum, row) => sum + row.total, 0);
      const roomReturnTotal = roomEmployees.reduce(
        (sum, row) => sum + (row.charge?.returnAmount ?? 0),
        0,
      );
      const roomFinalPayableTotal = roomEmployees.reduce((sum, row) => {
        const preRecovery = row.item
          ? (Number(row.item.importedNetPayable || 0) > 0
            ? Number(row.item.importedNetPayable)
            : ((row.item.netPayable ?? 0) +
              (row.item.accommodationDeduction ?? 0) -
              (row.item.returnAmount ?? 0)))
          : Number(row.employee.salaryAmount || 0);
        const rowReturn = row.charge?.returnAmount ?? row.returnAmount ?? 0;
        return sum + Math.max(0, preRecovery - row.total + rowReturn);
      }, 0);
      const roomPreRecoveryTotal = roomEmployees.reduce(
        (sum, row) =>
          sum +
          (Number(row.item?.importedNetPayable || 0) > 0
            ? Number(row.item?.importedNetPayable)
            : ((row.item?.netPayable ?? 0) +
              (row.item?.accommodationDeduction ?? 0) -
              (row.item?.returnAmount ?? 0))),
        0,
      );

      // Skip printing rooms/teams that have zero recoveries (or ₹0 deductions) to avoid wasting A4 sheets
      const hasRecoveries =
        roomTotalRecovery > 0.005 ||
        (gas + ration + provision) > 0.005 ||
        roomEmployees.some((r) => r.total > 0.005);
      if (!hasRecoveries) {
        return;
      }

      const sheet = document.createElement("section");
      sheet.className = "room-recovery-print-sheet";
      const h1 = document.createElement("h1");
      h1.textContent = "FINALIZED ROOM-WISE SALARY RECOVERY STATEMENT";

      const metaHeader = document.createElement("div");
      metaHeader.className = "room-recovery-print-meta";
      metaHeader.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin:3px 0 8px;font-size:13.5px;font-weight:800;color:#0f172a;";
      metaHeader.innerHTML = `<span>Room: ${roomName}</span><span style="background:#eef2f6;padding:3px 8px;border-radius:4px;border:1px solid #cbd5e1;">Salary Period: ${periodBadge}</span>`;

      const summary = document.createElement("div");
      summary.className = "room-recovery-summary";
      const roommates = roomEmployees.length || finalizedRoomRow?.expense.occupantCount || 0;
      summary.innerHTML = `<div><span>Gas</span><strong>₹${gas.toFixed(2)}</strong></div><div><span>Ration</span><strong>₹${ration.toFixed(2)}</strong></div><div><span>Provision</span><strong>₹${provision.toFixed(2)}</strong></div><div><span>Roommates</span><strong>${roommates}</strong></div><div><span>Shared total</span><strong>₹${(gas + ration + provision).toFixed(2)}</strong></div><div><span>Total recovery</span><strong>₹${roomTotalRecovery.toFixed(2)}</strong></div>`;
      sheet.append(h1, metaHeader, summary);

      // Define all possible columns
      const allDeductionCols: { label: string; getValue: (r: typeof roomEmployees[0]) => number }[] = [
        { label: "Rent", getValue: (r) => r.rent },
        { label: "Bus", getValue: (r) => r.bus },
        { label: "Food", getValue: (r) => r.food },
        { label: "Advance", getValue: (r) => r.advance },
        { label: "ID", getValue: (r) => r.idCard },
        { label: "Medical", getValue: (r) => r.medical },
        { label: "Ticket", getValue: (r) => r.ticket },
        { label: "Shoe", getValue: (r) => r.shoe },
        { label: "Aadhaar", getValue: (r) => r.aadhaarUpdate },
        { label: "Bank A/c", getValue: (r) => r.bankAccountCharge },
        { label: "T-shirt", getValue: (r) => r.tshirt },
        { label: "Old pending", getValue: (r) => r.oldPending },
        { label: "Gas", getValue: (r) => r.gasShare },
        { label: "Ration", getValue: (r) => r.rationShare },
        { label: "Provision", getValue: (r) => r.provisionShare },
      ];

      // Filter deduction columns using matchedRows.every check so unused columns with 0 values are omitted
      const matchedRows = roomEmployees;
      const activeDeductionCols = allDeductionCols.filter((col) => {
        if (optionalRecoveryPrintHeaders.has(col.label)) {
          return !matchedRows.every((row) => Math.abs(printedAmount(col.getValue(row))) < 0.005);
        }
        return true;
      });

      const isRemovedHeader = (label: string) =>
        label === "Room" || label === "Voucher" || label === "#" || label === "Employer unit";

      const printableHeaders = [
        "EMPLOYEE / PUNCHING NO.",
        "NET BEFORE RECOVERY",
        ...activeDeductionCols.map((col) => col.label.toUpperCase()),
        "TOTAL RECOVERY",
        "RETURN",
        "FINAL PAYABLE",
      ].filter((label) => !isRemovedHeader(label));

      const table = document.createElement("table");
      table.className = "data-table";

      // Thead
      const thead = table.createTHead();
      const headerRow = thead.insertRow();
      printableHeaders.forEach((label, idx) => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.textAlign = idx === 0 ? "left" : "right";
        headerRow.appendChild(th);
      });

      // Tbody
      const tbody = table.createTBody();
      if (roomEmployees.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = printableHeaders.length;
        cell.style.textAlign = "center";
        cell.style.padding = "16px";
        cell.style.color = "#64748b";
        cell.textContent = `No occupants mapped to Room ${roomName}`;
      } else {
        roomEmployees.forEach((r) => {
          const row = tbody.insertRow();
          const preRecovery = r.item
            ? (Number(r.item.importedNetPayable || 0) > 0
              ? Number(r.item.importedNetPayable)
              : ((r.item.netPayable ?? 0) +
                (r.item.accommodationDeduction ?? 0) -
                (r.item.returnAmount ?? 0)))
            : Number(r.employee.salaryAmount || 0);
          const rowReturn = r.charge?.returnAmount ?? r.returnAmount ?? 0;
          const finalPayable = Math.max(0, preRecovery - r.total + rowReturn);

          const cellEmp = row.insertCell();
          cellEmp.style.textAlign = "left";
          cellEmp.innerHTML = `<strong>${r.employee.name}</strong><br><small style="color:#64748b;font-weight:600;">${r.employee.employeeCode}</small>`;

          const cellPre = row.insertCell();
          cellPre.style.textAlign = "right";
          cellPre.textContent = `₹${preRecovery.toFixed(2)}`;

          activeDeductionCols.forEach((col) => {
            const cell = row.insertCell();
            cell.style.textAlign = "right";
            cell.textContent = `₹${col.getValue(r).toFixed(2)}`;
          });

          const cellTot = row.insertCell();
          cellTot.style.textAlign = "right";
          cellTot.textContent = `₹${r.total.toFixed(2)}`;

          const cellRet = row.insertCell();
          cellRet.style.textAlign = "right";
          cellRet.textContent = `₹${rowReturn.toFixed(2)}`;

          const cellFin = row.insertCell();
          cellFin.style.textAlign = "right";
          cellFin.textContent = `₹${finalPayable.toFixed(2)}`;
        });
      }

      // Tfoot
      const tfoot = table.createTFoot();
      const footRow = tfoot.insertRow();

      const cellFootEmp = footRow.insertCell();
      cellFootEmp.style.textAlign = "left";
      cellFootEmp.style.fontWeight = "800";
      cellFootEmp.textContent = `ROOM ${roomName} TOTAL`;

      const cellFootPre = footRow.insertCell();
      cellFootPre.style.textAlign = "right";
      cellFootPre.style.fontWeight = "800";
      cellFootPre.textContent = `₹${roomPreRecoveryTotal.toFixed(2)}`;

      activeDeductionCols.forEach((col) => {
        const cell = footRow.insertCell();
        cell.style.textAlign = "right";
        cell.style.fontWeight = "800";
        const sum = roomEmployees.reduce((s, r) => s + col.getValue(r), 0);
        cell.textContent = `₹${sum.toFixed(2)}`;
      });

      const cellFootTot = footRow.insertCell();
      cellFootTot.style.textAlign = "right";
      cellFootTot.style.fontWeight = "800";
      cellFootTot.textContent = `₹${roomTotalRecovery.toFixed(2)}`;

      const cellFootRet = footRow.insertCell();
      cellFootRet.style.textAlign = "right";
      cellFootRet.style.fontWeight = "800";
      cellFootRet.textContent = `₹${roomReturnTotal.toFixed(2)}`;

      const cellFootFin = footRow.insertCell();
      cellFootFin.style.textAlign = "right";
      cellFootFin.style.fontWeight = "800";
      cellFootFin.textContent = `₹${roomFinalPayableTotal.toFixed(2)}`;

      sheet.appendChild(table);
      layer.appendChild(sheet);
    });

    if (!layer.children.length) {
      alert("No recoveries found for the selected room(s) to print.");
      return;
    }
    void printIsolatedElement(layer, "room");
  }

  const recoveryAccommodationTypes = data.accommodationTypes.filter((type) => {
    if (type.status !== "active") return false;
    if (roomRecoveryScope === "joy")
      return joySharedRecoveryTypeIds.has(type.id);
    if (roomRecoveryScope === "outside")
      return (
        type.vendorId === vendorId &&
        isOutsideRecoveryAccommodation(type.name)
      );
    return false;
  });
  const recoveryScopeTypeIds = new Set(
    recoveryAccommodationTypes.map((type) => type.id),
  );
  const isOutsideRecoveryType = roomRecoveryScope === "outside";
  const recoveryHostels = data.hostels.filter((hostel) => {
    if (
      hostel.status !== "active" ||
      !hostel.accommodationTypeId ||
      !recoveryScopeTypeIds.has(hostel.accommodationTypeId)
    )
      return false;
    if (roomRecoveryScope === "outside" && hostel.vendorId !== vendorId)
      return false;
    try {
      const scope = JSON.parse(hostel.clientScopeJson || "[]") as unknown;
      return (
        !run?.clientUnitId ||
        !Array.isArray(scope) ||
        scope.length === 0 ||
        scope.includes(run.clientUnitId)
      );
    } catch {
      return true;
    }
  });
  const recoveryRooms = data.accommodationRooms.filter((room) => {
    if (
      room.status !== "active" ||
      !recoveryScopeTypeIds.has(room.accommodationTypeId)
    )
      return false;
    if (roomRecoveryScope === "outside" && room.vendorId !== vendorId)
      return false;
    if (!roomRecoveryHostelId) return false;
    return room.hostelId === roomRecoveryHostelId;
  });
  const selectedRecoveryRoom = data.accommodationRooms.find((room) => room.id === roomRecoveryId);
  const companyActiveEmployees = useMemo(() => {
    return data.employees.filter(
      (emp) =>
        isEmployeeActiveInPeriod(emp, roomRecoveryPeriod) &&
        (emp.vendorId === vendorId || !vendorId),
    );
  }, [data.employees, vendorId, roomRecoveryPeriod]);

  const existingRecoveryRoomMembers = useMemo(() => {
    if (!selectedRecoveryRoom) return [];
    return data.employees.filter(
      (employee) =>
        isEmployeeActiveInPeriod(employee, roomRecoveryPeriod) &&
        (employee.vendorId === vendorId || !vendorId) &&
        (employee.roomId === selectedRecoveryRoom.id ||
          (employee.roomNumber === selectedRecoveryRoom.roomNumber &&
            (!employee.roomId || employee.roomId === selectedRecoveryRoom.id) &&
            (!selectedRecoveryRoom.vendorId || employee.vendorId === selectedRecoveryRoom.vendorId))),
    );
  }, [data.employees, selectedRecoveryRoom, vendorId]);

  const filteredRoomConfirmationEmployees = useMemo(() => {
    const q = roomMemberSearch.trim().toLowerCase();
    const sorted = [...companyActiveEmployees].sort((a, b) => {
      const aSelected = roomRecoveryMembers.includes(a.id) ? 1 : 0;
      const bSelected = roomRecoveryMembers.includes(b.id) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      return a.name.localeCompare(b.name);
    });
    if (!q) return sorted;
    return sorted.filter((emp) => {
      const codeMatch = emp.employeeCode.toLowerCase().includes(q);
      const nameMatch = emp.name.toLowerCase().includes(q);
      const unitName = data.units.find((u) => u.id === emp.clientUnitId)?.unitName?.toLowerCase();
      const unitMatch = unitName ? unitName.includes(q) : false;
      return codeMatch || nameMatch || unitMatch;
    });
  }, [companyActiveEmployees, roomRecoveryMembers, roomMemberSearch, data.units]);

  function chooseRecoveryRoom(roomId: string) {
    setRoomRecoveryId(roomId);
    setRoomRecoveryConfirmed(true);
    setRoomMemberPage(1);
    setRoomMemberSearch("");
    const targetRoom = data.accommodationRooms.find((room) => room.id === roomId);
    const targetRoomNumber = targetRoom?.roomNumber;
    const memberIds = data.employees
      .filter(
        (employee) =>
          isEmployeeActiveInPeriod(employee, roomRecoveryPeriod) &&
          (employee.vendorId === vendorId || !vendorId) &&
          (employee.roomId === roomId ||
            (targetRoomNumber &&
              employee.roomNumber === targetRoomNumber &&
              (!employee.roomId || employee.roomId === roomId) &&
              (!targetRoom?.vendorId || employee.vendorId === targetRoom.vendorId))),
      )
      .map((employee) => employee.id);
    setRoomRecoveryMembers(memberIds);
    const saved = recoveryRoomEntries.find((expense) => expense.roomId === roomId && expense.payPeriod === recoveryPreviewPeriod) ?? data.roomExpenses.find((expense) => expense.roomId === roomId && expense.payPeriod === roomRecoveryPeriod);
    setRoomRecoveryGas(saved?.gasAmount ?? 0);
    setRoomRecoveryRation(saved?.rationAmount ?? 0);
    setRoomRecoveryProvision(saved?.provisionAmount ?? 0);
    setRoomRecoveryRoomRent((saved as any)?.roomRentAmount ?? 0);
    setRoomRecoveryTransport((saved as any)?.transportRentAmount ?? 0);
    if (!roomRecoveryDate && (saved?.gasDate || saved?.rationDate || saved?.provisionDate)) {
      setRoomRecoveryDate(saved.gasDate ?? saved.rationDate ?? saved.provisionDate ?? "");
    }
  }

  async function confirmRecoveryRoomMembers() {
    if (!selectedRecoveryRoom) return;
    const current = new Set(existingRecoveryRoomMembers.map((employee) => employee.id));
    const desired = new Set(roomRecoveryMembers);
    for (const employeeId of desired) {
      if (!current.has(employeeId)) {
        const employee = data.employees.find((row) => row.id === employeeId);
        await onAction("allocate-room", "Employee added to recovery room", {
          roomId: selectedRecoveryRoom.id,
          roomNumber: selectedRecoveryRoom.roomNumber,
          employeeId,
          roomRentAmount: employee?.roomRentAmount ?? 0,
        });
      }
    }
    for (const employeeId of current) {
      if (!desired.has(employeeId)) {
        await onAction("allocate-room", "Employee removed from recovery room", {
          employeeId,
          roomId: null,
          roomNumber: null,
        });
      }
    }
    setRoomRecoveryConfirmed(true);
  }

  async function saveRoomWiseRecovery() {
    if (!roomRecoveryDate || !selectedRecoveryRoom) return;
    const liveOccupants = data.employees.filter(
      (e) =>
        isEmployeeActiveInPeriod(e, roomRecoveryPeriod) &&
        (!vendorId || e.vendorId === vendorId) &&
        (e.roomId === selectedRecoveryRoom.id ||
          (selectedRecoveryRoom.roomNumber && e.roomNumber === selectedRecoveryRoom.roomNumber)),
    );
    const effectiveCount = roomRecoveryMembers.length > 0 ? roomRecoveryMembers.length : liveOccupants.length;
    if (effectiveCount === 0) {
      window.alert(`Cannot save shared recovery: No active employees are currently assigned to Room ${selectedRecoveryRoom.roomNumber}. Allocate at least one employee first.`);
      return;
    }
    const existingDraft = data.roomExpenses.find(
      (expense) =>
        expense.roomId === selectedRecoveryRoom.id &&
        expense.payPeriod === roomRecoveryPeriod &&
        expense.status === "draft" &&
        (expense.gasDate === roomRecoveryDate ||
          expense.rationDate === roomRecoveryDate ||
          expense.provisionDate === roomRecoveryDate),
    );
    await onAction("save-room-expense", "Dated room-wise recovery saved", {
      id: existingDraft?.id,
      roomId: selectedRecoveryRoom.id,
      payPeriod: roomRecoveryPeriod,
      gasAmount: roomRecoveryGas,
      gasDate: roomRecoveryDate,
      gasCylinderCount: 0,
      gasPaymentReference: "Recovery",
      rationAmount: roomRecoveryRation,
      rationDate: roomRecoveryDate,
      rationPaymentReference: "Recovery",
      provisionAmount: roomRecoveryProvision,
      provisionDate: roomRecoveryDate,
      provisionPaymentReference: "Recovery",
      roomRentAmount: roomRecoveryRoomRent,
      transportRentAmount: roomRecoveryTransport,
      occupantCount: effectiveCount,
      notes: "Saved from Recovery page with automatic occupant resolution",
    });
    // Clear the entry form after the append-only ledger write so a second
    // dated recovery cannot accidentally reuse the previous amounts.
    setRoomRecoveryGas(0);
    setRoomRecoveryRation(0);
    setRoomRecoveryProvision(0);
    setRoomRecoveryRoomRent(0);
    setRoomRecoveryTransport(0);
    setRoomRecoveryDate("");
  }

  function openEditRoomExpense(
    expense: (typeof data.roomExpenses)[number],
    room?: (typeof data.accommodationRooms)[number],
  ) {
    setEditingRoomExpense(expense);
    const dateVal =
      expense.gasDate ??
      expense.rationDate ??
      expense.provisionDate ??
      `${expense.payPeriod}-01`;
    setEditRoomDate(dateVal);
    setEditRoomId(expense.roomId);
    setEditRoomGas(expense.gasAmount);
    setEditRoomRation(expense.rationAmount);
    setEditRoomProvision(expense.provisionAmount);
    setEditRoomRent((expense as any).roomRentAmount ?? 0);
    setEditRoomTransport((expense as any).transportRentAmount ?? 0);
    const occupants = data.employees
      .filter(
        (e) =>
          isEmployeeActiveInPeriod(e, expense.payPeriod) &&
          (e.vendorId === vendorId || !vendorId) &&
          (e.roomId
            ? e.roomId === expense.roomId
            : (room?.roomNumber && e.roomNumber === room.roomNumber && (!room?.vendorId || e.vendorId === room.vendorId))),
      )
      .map((e) => e.id);
    setEditRoomMembers(occupants);
    setEditRoomInitialOccupants(occupants);
    setEditMemberSearch("");
  }

  async function saveEditedRoomExpense() {
    if (!editingRoomExpense || !editRoomId || isSavingRoomEdit) return;
    setIsSavingRoomEdit(true);
    try {
      const selectedRoom = data.accommodationRooms.find((r) => r.id === editRoomId);
      const initialSet = new Set(editRoomInitialOccupants);
      const newSet = new Set(editRoomMembers);

      for (const empId of editRoomMembers) {
        if (!initialSet.has(empId)) {
          const emp = data.employees.find((e) => e.id === empId);
          await onAction("allocate-room", "Employee added to room", {
            roomId: editRoomId,
            roomNumber: selectedRoom?.roomNumber ?? null,
            employeeId: empId,
            roomRentAmount: emp?.roomRentAmount ?? 0,
          });
        }
      }

      for (const empId of editRoomInitialOccupants) {
        if (!newSet.has(empId)) {
          await onAction("allocate-room", "Employee removed from room", {
            employeeId: empId,
            roomId: null,
            roomNumber: null,
          });
        }
      }

      const period = editRoomDate ? editRoomDate.slice(0, 7) : editingRoomExpense.payPeriod;
      await onAction("save-room-expense", "Updated dated room recovery saved", {
        id: editingRoomExpense.id,
        roomId: editRoomId,
        payPeriod: period,
        gasAmount: editRoomGas,
        gasDate: editRoomDate,
        gasCylinderCount: editingRoomExpense.gasCylinderCount ?? 0,
        gasPaymentReference: editingRoomExpense.gasPaymentReference ?? "Recovery",
        rationAmount: editRoomRation,
        rationDate: editRoomDate,
        rationPaymentReference: editingRoomExpense.rationPaymentReference ?? "Recovery",
        provisionAmount: editRoomProvision,
        provisionDate: editRoomDate,
        provisionPaymentReference: editingRoomExpense.provisionPaymentReference ?? "Recovery",
        roomRentAmount: editRoomRent,
        transportRentAmount: editRoomTransport,
        occupantCount: editRoomMembers.length,
        notes: editingRoomExpense.notes || "Edited via Super Admin room recovery ledger",
      });

      if (editingRoomExpense.status === "finalized") {
        await onAction("finalize-room-expense", "Room recovery re-finalized and split to employees", {
          expenseId: editingRoomExpense.id,
        });
      }

      setEditingRoomExpense(null);
    } finally {
      setIsSavingRoomEdit(false);
    }
  }

  async function deleteRoomExpense(expense: (typeof data.roomExpenses)[number]) {
    const total =
      expense.gasAmount +
      expense.rationAmount +
      expense.provisionAmount +
      ((expense as any).roomRentAmount ?? 0) +
      ((expense as any).transportRentAmount ?? 0);
    if (
      !window.confirm(
        `Are you sure you want to delete this room recovery entry (₹${total.toFixed(2)})?`
      )
    ) {
      return;
    }
    await onAction("delete-room-expense", "Room recovery entry deleted", {
      expenseId: expense.id,
    });
  }

  function openEditIndividualEntry(entry: RecoveryEntry) {
    setEditingEntry(entry);
    setEditEntryDate(entry.recoveryDate);
    setEditEntryType(entry.recoveryType);
    setEditEntryAmount(entry.amount);
    setEditEntryReference(entry.reference ?? "");
    setEditEntryNotes(entry.notes ?? "");
  }

  async function saveEditedIndividualEntry() {
    if (!editingEntry || isSavingEntryEdit) return;
    setIsSavingEntryEdit(true);
    try {
      await onAction("update-recovery-entry", "Recovery entry updated", {
        recoveryId: editingEntry.id,
        recoveryDate: editEntryDate,
        recoveryType: editEntryType,
        amount: editEntryAmount,
        reference: editEntryReference,
        notes: editEntryNotes,
      });
      setEditingEntry(null);
    } finally {
      setIsSavingEntryEdit(false);
    }
  }

  function openEditEmployeeRecovery(employee: Employee, charge?: AccommodationCharge) {
    setEditingEmpRecovery({ employee, charge });
    setEmpRecRent(charge?.rent ?? 0);
    setEmpRecBus(charge?.bus ?? 0);
    setEmpRecFood(charge?.food ?? 0);
    setEmpRecAdvance(charge?.advance ?? 0);
    setEmpRecIdCard(charge?.idCard ?? 0);
    setEmpRecMedical(charge?.medical ?? 0);
    setEmpRecTicket(charge?.ticket ?? 0);
    setEmpRecShoe(charge?.shoe ?? 0);
    setEmpRecAadhaar(charge?.aadhaarUpdate ?? 0);
    setEmpRecBank(charge?.bankAccountCharge ?? 0);
    setEmpRecTshirt(charge?.tshirt ?? 0);
    setEmpRecOldPending(charge?.oldPending ?? 0);
    setEmpRecReturn(charge?.returnAmount ?? 0);
  }

  async function saveEditedEmployeeRecovery() {
    if (!editingEmpRecovery || isSavingEmpRecovery) return;
    setIsSavingEmpRecovery(true);
    try {
      await onAction("save-accommodation", "Employee accommodation recoveries updated", {
        employeeId: editingEmpRecovery.employee.id,
        fields: {
          rent: empRecRent,
          bus: empRecBus,
          food: empRecFood,
          advance: empRecAdvance,
          idCard: empRecIdCard,
          medical: empRecMedical,
          ticket: empRecTicket,
          shoe: empRecShoe,
          aadhaarUpdate: empRecAadhaar,
          bankAccountCharge: empRecBank,
          tshirt: empRecTshirt,
          oldPending: empRecOldPending,
          returnAmount: empRecReturn,
        },
      });
      setEditingEmpRecovery(null);
    } finally {
      setIsSavingEmpRecovery(false);
    }
  }

  // Build bulk vouchers from the finalization register itself. This guarantees
  // that every finalized employee is included even when normal recovery-table
  // filters would otherwise hide that employee.
  const finalizedVoucherRows = finalizations.flatMap((finalized) => {
    const employee = employees.find((row) => row.id === finalized.employeeId);
    if (!employee) return [];
    return [{
      employee,
      charge: runCharges.find((row) => row.employeeId === employee.id),
      item: items.find((row) => row.employeeId === employee.id),
    }];
  });

  const targetVouchers =
    selectedFinalizeEmployeeIds.length > 0
      ? selectedFinalizeEmployeeIds.flatMap((id) => {
        const employee = employees.find((row) => row.id === id);
        if (!employee) return [];
        return [{
          employee,
          charge: runCharges.find((row) => row.employeeId === employee.id),
          item: items.find((row) => row.employeeId === employee.id),
        }];
      })
      : finalizedVoucherRows.length > 0
        ? finalizedVoucherRows
        : employeeRows
          .filter(
            (row) =>
              row.total > 0 ||
              row.dated.some((datedEntry) => datedEntry.amount > 0),
          )
          .map((row) => ({
            employee: row.employee,
            charge: runCharges.find((c) => c.employeeId === row.employee.id),
            item: items.find((i) => i.employeeId === row.employee.id),
          }));

  if (targetVouchers.length > 0) {
    finalizedVoucherRows.splice(0, finalizedVoucherRows.length, ...targetVouchers);
  }

  const unfinalizedEmployees = employeeRows
    .filter(
      (row) => !finalizations.some((f) => f.employeeId === row.employee.id),
    )
    .map((row) => row.employee);

  const isAllFinalizeSelected =
    unfinalizedEmployees.length > 0 &&
    unfinalizedEmployees.every((emp) =>
      selectedFinalizeEmployeeIds.includes(emp.id),
    );

  function toggleSelectAllFinalize() {
    if (isAllFinalizeSelected) {
      setSelectedFinalizeEmployeeIds([]);
    } else {
      setSelectedFinalizeEmployeeIds(unfinalizedEmployees.map((e) => e.id));
    }
  }

  function toggleSelectFinalize(id: string) {
    setSelectedFinalizeEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function finalizeSelectedRecoveries() {
    if (!run || selectedFinalizeEmployeeIds.length === 0) return;
    const ok = await onAction(
      "finalize-employee-recovery",
      `Finalized recovery and generated voucher(s) for ${selectedFinalizeEmployeeIds.length} candidate(s)`,
      { employeeIds: selectedFinalizeEmployeeIds },
    );
    if (ok) {
      setSelectedFinalizeEmployeeIds([]);
    }
  }

  const isAllRecoverySelected =
    employees.length > 0 &&
    selectedRecoveryEmployeeIds.length === employees.length;

  function toggleSelectAllRecoveryEmployees() {
    if (isAllRecoverySelected) {
      setSelectedRecoveryEmployeeIds([]);
    } else {
      setSelectedRecoveryEmployeeIds(employees.map((e) => e.id));
    }
  }

  function toggleSelectRecoveryEmployee(id: string) {
    setSelectedRecoveryEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function addRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!run) return;
    const targetIds =
      selectedRecoveryEmployeeIds.length > 0
        ? selectedRecoveryEmployeeIds
        : employeeId
          ? [employeeId]
          : [];

    const isRoomPkg = recoveryType === "roomPackage";
    const roomPkgTotal = indGas + indRation + indProvision + indRent + indBus;
    if (targetIds.length === 0) return;
    if (isRoomPkg && roomPkgTotal <= 0) return;
    if (!isRoomPkg && amount <= 0) return;

    const targetCount = targetIds.length;
    let payloadRecoveryData: Record<string, unknown> = {};

    if (isRoomPkg) {
      const packageEntries = [
        { recoveryType: "gasShare", amount: indGas },
        { recoveryType: "rationShare", amount: indRation },
        { recoveryType: "provisionShare", amount: indProvision },
        { recoveryType: "rent", amount: indRent },
        { recoveryType: "bus", amount: indBus },
      ].filter((e) => e.amount > 0);

      payloadRecoveryData = {
        recoveryType: "roomPackage",
        entries: packageEntries,
      };
    } else {
      const perHeadAmount =
        splitBillEqually && targetCount > 1
          ? Math.round((amount / targetCount) * 100) / 100
          : amount;
      payloadRecoveryData = {
        recoveryType,
        amount: perHeadAmount,
      };
    }

    let finalRef = reference.trim();
    if (vendorShopName.trim()) {
      finalRef = finalRef ? `${finalRef} [${vendorShopName.trim()}]` : `[${vendorShopName.trim()}]`;
    }
    if (detectedRoomNumber && targetCount > 1) {
      finalRef = `${finalRef ? finalRef + " · " : ""}Room ${detectedRoomNumber} (Split: 1/${targetCount})`;
    }

    let finalNotes = notes.trim();
    if (billReceiptImage) {
      finalNotes = finalNotes ? `${finalNotes} | Receipt: ${billReceiptImage}` : `Receipt: ${billReceiptImage}`;
    }

    const ok = await onAction(
      "save-recovery-entry",
      targetCount > 1
        ? (isRoomPkg
          ? `Monthly room recoveries added to ${targetCount} candidates (₹${roomPkgTotal.toFixed(2)} each)`
          : `Date-wise recovery added to ${targetCount} candidates (₹${(payloadRecoveryData.amount as number).toFixed(2)} each)`)
        : (isRoomPkg
          ? `Monthly room recoveries added (Total ₹${roomPkgTotal.toFixed(2)})`
          : "Date-wise recovery added"),
      {
        employeeIds: targetIds,
        recoveryDate,
        ...payloadRecoveryData,
        reference: finalRef || null,
        notes: finalNotes || null,
      },
    );
    if (ok) {
      setSelectedRecoveryEmployeeIds([]);
      setAmount(0);
      setIndGas(0);
      setIndRation(0);
      setIndProvision(0);
      setIndRent(0);
      setIndBus(0);
      setReference("");
      setNotes("");
      setVendorShopName("");
      setBillReceiptImage(null);
    }
  }
  return (
    <div className="section-stack">
      <section className="panel table-panel recovery-overview-panel">
        <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span className="eyebrow">Room-wise recovery overview</span>
            <h2>Gas, Ration &amp; Provision totals · {recoveryPreviewPeriod}</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary-button"
              style={{
                backgroundColor: "#0284c7",
                borderColor: "#0284c7",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                window.location.hash = "#vendor_desk";
              }}
            >
              <span>🏪</span> Open Vendor Counter Desk
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{
                backgroundColor: healthCheckIssues.length > 0 ? "#fef2f2" : "#f0fdf4",
                borderColor: healthCheckIssues.length > 0 ? "#f87171" : "#86efac",
                color: healthCheckIssues.length > 0 ? "#991b1b" : "#166534",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
              onClick={() => setShowHealthCheck(true)}
            >
              {healthCheckIssues.length > 0 ? "⚠️" : "🛡️"} Recovery Health Check ({healthCheckIssues.length} {healthCheckIssues.length === 1 ? "issue" : "issues"})
            </button>
            <span className="muted-label">
              {roomRows.length} dated room entr{roomRows.length === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>
        {showHealthCheck && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowHealthCheck(false)}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "640px",
                width: "90%",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                  🛡️ Recovery &amp; Accommodation Health Check
                </h3>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "4px 8px" }}
                  onClick={() => setShowHealthCheck(false)}
                >
                  ✕ Close
                </button>
              </div>
              <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "16px" }}>
                Automated pre-payroll audit for <strong>{recoveryPreviewPeriod}</strong> checking for duplicate expenses, zero-occupant rooms, unlinked allocations, and split math discrepancies.
              </p>
              {healthCheckIssues.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>✅</span>
                  <div>
                    <strong>All Checks Passed!</strong>
                    <div style={{ fontSize: "0.85rem", marginTop: "2px" }}>
                      No duplicate entries, zero-occupant expenses, or split mismatches detected. Ready for salary finalization.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {healthCheckIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        backgroundColor: issue.type === "danger" ? "#fef2f2" : "#fffbeb",
                        border: `1px solid ${issue.type === "danger" ? "#fecaca" : "#fef3c7"}`,
                        color: issue.type === "danger" ? "#991b1b" : "#92400e",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {issue.type === "danger" ? "🚨 " : "⚠️ "} {issue.title}
                      </div>
                      <div style={{ fontSize: "0.85rem", marginTop: "4px", color: issue.type === "danger" ? "#7f1d1d" : "#78350f" }}>
                        {issue.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowHealthCheck(false)}
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="room-recovery-summary room-recovery-period-summary">
          <div><span>Gas overall</span><strong>₹{roomPeriodTotals.gas.toFixed(2)}</strong></div>
          <div><span>Ration overall</span><strong>₹{roomPeriodTotals.ration.toFixed(2)}</strong></div>
          <div><span>Provision overall</span><strong>₹{roomPeriodTotals.provision.toFixed(2)}</strong></div>
          <div><span>Overall room recovery</span><strong>₹{roomPeriodTotals.overall.toFixed(2)}</strong></div>
          <div><span>Finalized</span><strong>₹{roomPeriodTotals.finalized.toFixed(2)}</strong></div>
          <div><span>Draft</span><strong>₹{roomPeriodTotals.draft.toFixed(2)}</strong></div>
        </div>
        {roomRecoveryDateTotals.length ? (
          <div className="table-scroll">
            <table className="data-table room-recovery-date-summary">
              <thead><tr><th>Date</th><th>Status</th><th>Gas</th><th>Ration</th><th>Provision</th><th>Overall</th></tr></thead>
              <tbody>
                {roomRecoveryDateTotals.map((row) => (
                  <tr key={`${row.date}-${row.status}`}>
                    <td><strong>{row.date}</strong></td><td>{row.status}</td>
                    <td>₹{row.gas.toFixed(2)}</td><td>₹{row.ration.toFixed(2)}</td>
                    <td>₹{row.provision.toFixed(2)}</td><td><strong>₹{row.overall.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="form-note">No room-wise Gas, Ration or Provision is recorded for this salary cycle.</p>
        )}
      </section>
      {(canManage || canApprove) ? (
        <form
          className="panel form-grid"
          onSubmit={(event) => void addRecovery(event)}
        >
          <div className="panel-heading form-span">
            <div>
              <span className="eyebrow">Salary-cycle recovery entry</span>
              <h2>Employee-wise recovery by date</h2>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {employees.length > 0 && (canManage || canApprove) ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={toggleSelectAllRecoveryEmployees}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                >
                  {isAllRecoverySelected ? "Deselect all" : `Select all (${employees.length})`}
                </button>
              ) : null}
              <span className="muted-label">
                {selectedRecoveryEmployeeIds.length > 0
                  ? `${selectedRecoveryEmployeeIds.length} of ${employees.length} selected`
                  : "Single or bulk entry"}
              </span>
            </div>
          </div>
          {!run ? (
            <p className="form-note form-span">
              <strong>Create the payroll run to save employee-wise recovery.</strong>{" "}
              The employee selector remains visible so the missing payroll prerequisite is clear.
            </p>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
              Employee *
            </span>
            <input
              type="text"
              placeholder="Search candidate by name, employee code (JOY-...), mobile, room #, or Aadhaar last 4..."
              value={employeeSearchQuery}
              onChange={(event) => setEmployeeSearchQuery(event.target.value)}
              style={{ width: "100%" }}
            />
            <div
              style={{
                maxHeight: "140px",
                overflowY: "auto",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                background: "#ffffff",
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {filteredRecoveryEmployees.length === 0 ? (
                <div style={{ padding: "8px 10px", fontSize: "11px", color: "#64748b" }}>
                  No candidate found matching &quot;{employeeSearchQuery}&quot;
                </div>
              ) : (
                filteredRecoveryEmployees.map((emp) => {
                  const isChecked = selectedRecoveryEmployeeIds.includes(emp.id);
                  const roomText = emp.roomNumber ? ` · Room ${emp.roomNumber}` : "";
                  const mobText = emp.mobileNumber ? ` · 📞 ${emp.mobileNumber}` : "";
                  return (
                    <label
                      key={emp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "5px 8px",
                        borderRadius: "4px",
                        background: isChecked ? "#f0fdf4" : "transparent",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: isChecked ? "600" : "normal",
                        color: isChecked ? "#166534" : "#1e293b",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectRecoveryEmployee(emp.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <span>
                        <strong>{emp.employeeCode}</strong> · {emp.name}
                        <small style={{ color: "#64748b", marginLeft: "4px" }}>
                          {roomText}{mobText}
                        </small>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <label>
            <span>Recovery date *</span>
            <input
              type="date"
              value={recoveryDate}
              onChange={(event) => setRecoveryDate(event.target.value)}
              required
            />
            {allowedRecoveryRange ? (
              <small style={{ color: "#64748b", display: "block", marginTop: "4px", fontSize: "0.8rem" }}>
                Accepted: {allowedRecoveryRange.allowedStart} to {allowedRecoveryRange.allowedEnd} (previous month arrears to current cycle)
              </small>
            ) : null}
          </label>
          {detectedRoomNumber ? (
            <div
              className="form-span"
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#166534", letterSpacing: "0.5px" }}>
                    🏠 Room Auto-Detected
                  </span>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#14532d" }}>
                    Room {detectedRoomNumber} ({detectedRoommates.length} active occupant{detectedRoommates.length > 1 ? "s" : ""})
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {detectedRoommates.length > 1 ? (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: "11px", padding: "4px 8px", background: "#ffffff", borderColor: "#86efac", color: "#166534", fontWeight: "600" }}
                      onClick={() => {
                        setSelectedRecoveryEmployeeIds(detectedRoommates.map((e) => e.id));
                        setSplitBillEqually(true);
                      }}
                    >
                      Select all {detectedRoommates.length} roommates
                    </button>
                  ) : null}
                  {primarySelectedEmp && selectedRecoveryEmployeeIds.length > 1 ? (
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ fontSize: "11px", padding: "4px 8px", background: "#ffffff" }}
                      onClick={() => {
                        setSelectedRecoveryEmployeeIds([primarySelectedEmp.id]);
                        setSplitBillEqually(false);
                      }}
                    >
                      Only {primarySelectedEmp.name}
                    </button>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {detectedRoommates.map((mate) => {
                  const isSelected = selectedRecoveryEmployeeIds.includes(mate.id);
                  return (
                    <span
                      key={mate.id}
                      onClick={() => toggleSelectRecoveryEmployee(mate.id)}
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        background: isSelected ? "#15803d" : "#e2e8f0",
                        color: isSelected ? "#ffffff" : "#475569",
                        fontWeight: isSelected ? "600" : "normal",
                      }}
                    >
                      {isSelected ? "✓ " : "+ "}{mate.name} ({mate.employeeCode})
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div
            className="form-span"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: selectedRecoveryEmployeeIds.length > 0 ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${selectedRecoveryEmployeeIds.length > 0 ? "#bbf7d0" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              color: selectedRecoveryEmployeeIds.length > 0 ? "#166534" : "#64748b",
            }}
          >
            <span>
              {selectedRecoveryEmployeeIds.length === 0
                ? "0 candidates selected (search or choose candidates above)"
                : `${selectedRecoveryEmployeeIds.length} candidate${selectedRecoveryEmployeeIds.length > 1 ? "s" : ""} selected`}
            </span>
            {selectedRecoveryEmployeeIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedRecoveryEmployeeIds([])}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "underline",
                }}
              >
                Clear selection
              </button>
            ) : null}
          </div>
          {selectedRecoveryEmployeeIds.length > 1 ? (
            <div
              className="form-span"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={splitBillEqually}
                  onChange={(e) => setSplitBillEqually(e.target.checked)}
                />
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                  Split total bill amount equally among all {selectedRecoveryEmployeeIds.length} candidates
                </span>
              </label>
              {splitBillEqually && amount > 0 ? (
                <div style={{ fontSize: "11px", color: "#0369a1", fontWeight: "600", background: "#f0f9ff", padding: "4px 8px", borderRadius: "4px" }}>
                  💡 Live Split: Total bill ₹{amount.toFixed(2)} ÷ {selectedRecoveryEmployeeIds.length} candidates = ₹{(amount / selectedRecoveryEmployeeIds.length).toFixed(2)} per candidate
                </div>
              ) : null}
            </div>
          ) : null}
          <label>
            <span>Recovery type *</span>
            <select
              value={recoveryType}
              onChange={(event) => setRecoveryType(event.target.value)}
            >
              <option value="roomPackage">Monthly room recoveries (Gas, Ration, Provision, Rent, Bus)</option>
              {Object.entries(recoveryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {recoveryType === "roomPackage" ? (
            <>
              <label>
                <span>Gas amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indGas || ""}
                  placeholder="0.00"
                  onChange={(e) => setIndGas(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label>
                <span>Ration amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indRation || ""}
                  placeholder="0.00"
                  onChange={(e) => setIndRation(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label>
                <span>Provision amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indProvision || ""}
                  placeholder="0.00"
                  onChange={(e) => setIndProvision(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label>
                <span>Common room rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indRent || ""}
                  placeholder="0.00"
                  onChange={(e) => setIndRent(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label>
                <span>Transport rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={indBus || ""}
                  placeholder="0.00"
                  onChange={(e) => setIndBus(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <div
                className="form-span"
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, color: "#166534" }}>
                  Total monthly room recovery per candidate:
                </span>
                <strong style={{ fontSize: "16px", color: "#15803d" }}>
                  ₹{(indGas + indRation + indProvision + indRent + indBus).toFixed(2)}
                </strong>
              </div>
            </>
          ) : (
            <label>
              <span>
                {splitBillEqually && selectedRecoveryEmployeeIds.length > 1
                  ? `Total Bill Amount (₹) *`
                  : `Amount per candidate (₹) *`}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                required
              />
            </label>
          )}
          <label>
            <span>Store / Vendor / Shop</span>
            <input
              list="superadmin-registered-vendors"
              placeholder="Choose registered vendor or type shop name"
              value={vendorShopName}
              onChange={(event) => setVendorShopName(event.target.value)}
            />
            <datalist id="superadmin-registered-vendors">
              {(data?.appUsers || [])
                .filter((u) => u.role === "vendor" && u.status !== "inactive")
                .map((u) => (
                  <option key={u.id} value={u.fullName || u.email}>
                    {u.department ? `${u.department} · ` : ""}{u.fullName || u.email}
                  </option>
                ))}
            </datalist>
          </label>
          <label>
            <span>Bill / Voucher / Invoice no.</span>
            <input
              placeholder="e.g. BILL-1042 or Cash memo"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </label>
          <label>
            <span>Remarks</span>
            <input
              placeholder="Optional notes or particulars"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="form-span" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
              Bill / Receipt Photo (Optional)
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334155",
                  margin: 0,
                }}
              >
                <span>📸 Take / Upload Receipt Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setBillReceiptImage(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {billReceiptImage ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img
                    src={billReceiptImage}
                    alt="Receipt preview"
                    style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                  />
                  <span style={{ fontSize: "12px", color: "#166534", fontWeight: "600" }}>✓ Receipt attached</span>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
                    onClick={() => setBillReceiptImage(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <button
            className="primary-button form-span"
            type={run && run.status === "approved" ? "button" : "submit"}
            onClick={
              run && run.status === "approved"
                ? () =>
                  void onAction(
                    "reopen-payroll-for-recovery",
                    "Payment batch and payroll reopened. You can now save the recovery.",
                  )
                : undefined
            }
            disabled={
              run && run.status === "approved"
                ? isActing || !canApprove
                : isActing ||
                  !run ||
                  selectedRecoveryEmployeeIds.length === 0 ||
                  (recoveryType === "roomPackage"
                    ? indGas + indRation + indProvision + indRent + indBus <= 0
                    : amount <= 0)
            }
          >
            {run && run.status === "approved"
              ? "Reopen payment batch & payroll"
              : recoveryType === "roomPackage"
                ? (selectedRecoveryEmployeeIds.length > 1
                  ? `Save monthly room recovery for ${selectedRecoveryEmployeeIds.length} candidates`
                  : "Save monthly room recovery")
                : selectedRecoveryEmployeeIds.length > 1
                  ? `Apply dated recovery to ${selectedRecoveryEmployeeIds.length} candidates`
                  : selectedRecoveryEmployeeIds.length === 1
                    ? "Add dated recovery (1 candidate)"
                    : "Select candidate(s) to add recovery"}
          </button>
        </form>
      ) : null}
      {run && run.status === "approved" ? (
        <section className="panel recovery-lock-guidance">
          <span className="eyebrow">Recovery entry locked by payroll approval</span>
          <h2>Reopen the cleared batch and payroll here</h2>
          <p className="muted-label">
            {data.payrollBatches.filter((batch) => batch.runId === run.id && batch.status === "cleared").length
              ? `The button below will reopen ${data.payrollBatches.filter((batch) => batch.runId === run.id && batch.status === "cleared").length} cleared payment batch(es) and the payroll together. Then add the dated recovery.`
              : "Use the button below to reopen payroll, then add the dated recovery. Saving it will automatically recalculate final payable and bank payable."}
          </p>
        </section>
      ) : null}
      {/* Legacy duplicate room-recovery forms are intentionally hidden. The
          canonical date-first room flow below owns these controls. */}
      {/*
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      {(canManage || canApprove) ? (
        <form className="panel form-grid room-recovery-entry" onSubmit={(event) => void saveRoomRecovery(event)}>
          <div className="panel-heading form-span">
            <div><span className="eyebrow">Room-wise shared recovery input</span><h2>Hostel → Room → Gas / Ration / Provision</h2></div>
            <span className="muted-label">Shared total is split equally among active room employees when finalized</span>
          </div>
          <label><span>Hostel *</span><select value={roomRecoveryHostelId} onChange={(event) => { setRoomRecoveryHostelId(event.target.value); setRoomRecoveryRoomId(""); }} required><option value="">Choose hostel</option>{recoveryHostels.map((hostel) => (<option key={hostel.id} value={hostel.id}>{hostel.name}</option>))}</select></label>
          <label><span>Room *</span><select value={roomRecoveryRoomId} onChange={(event) => { const id = event.target.value; setRoomRecoveryRoomId(id); const existing = data.roomExpenses.find((expense) => expense.roomId === id && expense.payPeriod === run.payPeriod); setRoomGas(existing?.gasAmount ?? 0); setRoomRation(existing?.rationAmount ?? 0); setRoomProvision(existing?.provisionAmount ?? 0); }} required><option value="">Choose room</option>{recoveryRooms.map((room) => (<option key={room.id} value={room.id}>{room.roomNumber}</option>))}</select></label>
          <label><span>Gas (₹)</span><input type="number" min="0" step="0.01" value={roomGas} onChange={(event) => setRoomGas(Number(event.target.value))} /></label>
          <label><span>Ration (₹)</span><input type="number" min="0" step="0.01" value={roomRation} onChange={(event) => setRoomRation(Number(event.target.value))} /></label>
          <label><span>Provision (₹)</span><input type="number" min="0" step="0.01" value={roomProvision} onChange={(event) => setRoomProvision(Number(event.target.value))} /></label>
          <div className="form-note"><strong>{roomOccupants.length} roommates</strong><span>{roomOccupants.map((employee) => `${employee.employeeCode} · ${employee.name}`).join(", ") || "Choose a room to view employees"}</span><span>Shared total ₹{(roomGas + roomRation + roomProvision).toFixed(2)} · Per head ₹{((roomGas + roomRation + roomProvision) / Math.max(1, roomOccupants.length)).toFixed(2)}</span></div>
          <div className="record-actions form-span"><button className="secondary-button" type="submit" disabled={isActing || !roomRecoveryRoomId}>Save room recovery</button>{currentRoomExpense?.status === "draft" ? (<button className="primary-button" type="button" disabled={isActing} onClick={() => void onAction("finalize-room-expense", "Room recovery finalized and split to employees", { expenseId: currentRoomExpense.id })}>Finalize & split to roommates</button>) : currentRoomExpense?.status === "finalized" ? (<button className="secondary-button" type="button" disabled={isActing} onClick={() => void onAction("reopen-room-expense", "Room recovery reopened", { expenseId: currentRoomExpense.id })}>Reopen room recovery</button>) : null}</div>
        </form>
      ) : null}
      */}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Applicable employees only</span>
            <h2>Date-wise individual recovery register</h2>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              aria-label="Filter recoveries by client unit"
              value={entryClientFilter}
              onChange={(e) => {
                setEntryClientFilter(e.target.value);
                setEntryRoomFilter("");
                setEntriesPage(1);
              }}
              style={{ fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
            >
              <option value="">All client units</option>
              {data.units
                .filter((u) => (!vendorId || u.vendorId === vendorId) && u.status === "active")
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.clientName} · {u.unitName}</option>
                ))}
            </select>
            <select
              aria-label="Filter recoveries by room"
              value={entryRoomFilter}
              onChange={(e) => {
                setEntryRoomFilter(e.target.value);
                setEntriesPage(1);
              }}
              style={{ fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
            >
              <option value="">All rooms</option>
              {entryFilteredRooms.map((room) => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
            <span className="muted-label">{filteredEntries.length} entries</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Reference / remarks</th>
                <th>Salary before recovery</th>
                <th>Final payable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice((entriesPage - 1) * 20, entriesPage * 20).map((entry) => {
                const employee = data.employees.find(
                  (row) => row.id === entry.employeeId,
                ) ?? employees.find(
                  (row) => row.id === entry.employeeId,
                );
                const item = data.payrollItems.find(
                  (row) =>
                    row.employeeId === entry.employeeId &&
                    (activeRunIds.has(row.runId) || row.runId === run?.id),
                ) ?? items.find(
                  (row) => row.employeeId === entry.employeeId,
                );
                const preRecovery = item
                  ? (Number(item.importedNetPayable || 0) > 0
                    ? Number(item.importedNetPayable)
                    : item.netPayable +
                    item.accommodationDeduction -
                    item.returnAmount)
                  : (Number(employee?.salaryAmount || 0));
                const finalPayable = item?.netPayable ?? Math.max(0, preRecovery - entry.amount);
                return (
                  <tr key={entry.id}>
                    <td>{entry.recoveryDate}</td>
                    <td>
                      <strong>{employee?.name ?? entry.employeeId}</strong>
                      <small>{employee?.employeeCode}</small>
                    </td>
                    <td>
                      {recoveryLabels[entry.recoveryType] ?? entry.recoveryType}
                    </td>
                    <td>
                      <strong>₹{entry.amount.toFixed(2)}</strong>
                    </td>
                    <td>
                      <div>{entry.reference ?? "—"}</div>
                      {(() => {
                        const rawNotes = entry.notes || "";
                        const receiptMatch = rawNotes.match(/Receipt:\s*(data:image\/[^\s|]+)/);
                        const receiptUrl = receiptMatch ? receiptMatch[1] : null;
                        const displayNotes = rawNotes.replace(/\|?\s*Receipt:\s*data:image\/[^\s|]+/g, "").trim();
                        return (
                          <>
                            {displayNotes ? <small style={{ display: "block", color: "#64748b" }}>{displayNotes}</small> : null}
                            {receiptUrl ? (
                              <button
                                type="button"
                                onClick={() => setReceiptModalImage(receiptUrl)}
                                style={{
                                  marginTop: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#1d4ed8",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                <span>📸</span> View Bill Receipt
                              </button>
                            ) : null}
                          </>
                        );
                      })()}
                    </td>
                    <td>₹{preRecovery.toFixed(2)}</td>
                    <td>
                      <strong>₹{finalPayable.toFixed(2)}</strong>
                    </td>
                    <td>
                      <div className="record-actions" style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="record-action"
                          style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                          disabled={isActing}
                          onClick={() => openEditIndividualEntry(entry)}
                        >
                          Edit
                        </button>
                        {canManage ? (
                          <button
                            className="record-action record-delete"
                            disabled={isActing}
                            onClick={() => {
                              if (window.confirm("Delete this recovery entry?"))
                                void onAction(
                                  "delete-recovery-entry",
                                  "Recovery entry deleted",
                                  { recoveryId: entry.id },
                                );
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={entriesPage}
          totalItems={filteredEntries.length}
          pageSize={20}
          onPageChange={setEntriesPage}
        />
        {!filteredEntries.length ? (
          <div className="enhancement-empty">
            No recoveries match the selected filters.
          </div>
        ) : null}
      </section>
      <section className="panel table-panel recovery-final-payable-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              Recovery totals by applicable employee
            </span>
            <h2>Net salary → recoveries → final payable</h2>
          </div>
          <div className="room-print-toolbar recovery-left-room-toolbar" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              aria-label="Filter employee recovery by client unit"
              value={recoveryClientFilter}
              onChange={(event) => {
                setRecoveryClientFilter(event.target.value);
                setRoomPrintRoom("");
                setRecoveryPage(1);
              }}
            >
              <option value="">All client units</option>
              {data.units
                .filter((u) => (!vendorId || u.vendorId === vendorId) && u.status === "active")
                .map((u) => (
                  <option key={u.id} value={u.id}>{u.clientName} · {u.unitName}</option>
                ))}
            </select>
            <select
              aria-label="Filter room or print recovery statement"
              value={roomPrintRoom}
              onChange={(event) => {
                setRoomPrintRoom(event.target.value);
                setRecoveryPage(1);
              }}
            >
              <option value="">All rooms</option>
              {roomPrintRooms.map((room) => (
                <option key={room} value={room}>{getRoomLabel(room)}</option>
              ))}
            </select>
            <button
              type="button"
              className="secondary-button"
              disabled={!roomPrintRoom}
              onClick={() => printRoomRecovery([roomPrintRoom])}
            >
              Selected room · A4 landscape
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!roomPrintRooms.length}
              onClick={() => printRoomRecovery(roomPrintRooms)}
            >
              All rooms · A4 landscape
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{
                color: "#15803d",
                borderColor: "#86efac",
                backgroundColor: "#f0fdf4",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              disabled={employeeRows.length === 0}
              onClick={() => {
                const period = run?.payPeriod ?? new Date().toISOString().slice(0, 7);
                const unitObj = data.units.find((u) => u.id === recoveryClientFilter);
                const scopeName = unitObj
                  ? `${unitObj.clientName}-${unitObj.unitName}`.replace(/[^a-zA-Z0-9_-]/g, "_")
                  : "all-units";
                const roomName = roomPrintRoom ? `room-${roomPrintRoom}` : "all-rooms";
                const filename = `recovery-deductions-${period}-${scopeName}-${roomName}`;

                const headers: ReportRow = [
                  "#",
                  "Employee ID",
                  "Employee Name",
                  "Employer Unit",
                  "Room",
                  "Net Before Recovery",
                  "Rent",
                  "Bus",
                  "Food",
                  "Advance",
                  "ID",
                  "Medical",
                  "Ticket",
                  "Shoe",
                  "Aadhaar",
                  "Bank A/c",
                  "T-shirt",
                  "Old Pending",
                  "Gas",
                  "Ration",
                  "Provision",
                  "Total Recovery",
                  "Return",
                  "Final Payable",
                ];

                let sumNetBefore = 0;
                let sumRent = 0;
                let sumBus = 0;
                let sumFood = 0;
                let sumAdvance = 0;
                let sumId = 0;
                let sumMedical = 0;
                let sumTicket = 0;
                let sumShoe = 0;
                let sumAadhaar = 0;
                let sumBank = 0;
                let sumTshirt = 0;
                let sumOldPending = 0;
                let sumGas = 0;
                let sumRation = 0;
                let sumProvision = 0;
                let sumTotal = 0;
                let sumReturn = 0;
                let sumFinalPayable = 0;

                const rows: ReportRow[] = employeeRows.map((r, index) => {
                  const u = data.units.find((entry) => entry.id === r.employee.clientUnitId);
                  const employerUnit = u ? `${u.clientName} · ${u.unitName}` : "—";
                  const roomNum = getRecoveryRoomNumber(r.employee);
                  const preRecovery = r.item
                    ? (Number(r.item.importedNetPayable || 0) > 0
                      ? Number(r.item.importedNetPayable)
                      : r.item.netPayable + r.item.accommodationDeduction - r.item.returnAmount)
                    : 0;
                  const finalPay = Math.max(0, preRecovery - r.total + r.returnAmount);

                  sumNetBefore += preRecovery;
                  sumRent += r.rent;
                  sumBus += r.bus;
                  sumFood += r.food;
                  sumAdvance += r.advance;
                  sumId += r.idCard;
                  sumMedical += r.medical;
                  sumTicket += r.ticket;
                  sumShoe += r.shoe;
                  sumAadhaar += r.aadhaarUpdate;
                  sumBank += r.bankAccountCharge;
                  sumTshirt += r.tshirt;
                  sumOldPending += r.oldPending;
                  sumGas += r.gasShare;
                  sumRation += r.rationShare;
                  sumProvision += r.provisionShare;
                  sumTotal += r.total;
                  sumReturn += r.returnAmount;
                  sumFinalPayable += finalPay;

                  return [
                    index + 1,
                    r.employee.employeeCode,
                    r.employee.name,
                    employerUnit,
                    roomNum,
                    preRecovery.toFixed(2),
                    r.rent.toFixed(2),
                    r.bus.toFixed(2),
                    r.food.toFixed(2),
                    r.advance.toFixed(2),
                    r.idCard.toFixed(2),
                    r.medical.toFixed(2),
                    r.ticket.toFixed(2),
                    r.shoe.toFixed(2),
                    r.aadhaarUpdate.toFixed(2),
                    r.bankAccountCharge.toFixed(2),
                    r.tshirt.toFixed(2),
                    r.oldPending.toFixed(2),
                    r.gasShare.toFixed(2),
                    r.rationShare.toFixed(2),
                    r.provisionShare.toFixed(2),
                    r.total.toFixed(2),
                    r.returnAmount.toFixed(2),
                    finalPay.toFixed(2),
                  ];
                });

                const totalRow: ReportRow = [
                  "TOTAL",
                  "",
                  "",
                  "",
                  "",
                  sumNetBefore.toFixed(2),
                  sumRent.toFixed(2),
                  sumBus.toFixed(2),
                  sumFood.toFixed(2),
                  sumAdvance.toFixed(2),
                  sumId.toFixed(2),
                  sumMedical.toFixed(2),
                  sumTicket.toFixed(2),
                  sumShoe.toFixed(2),
                  sumAadhaar.toFixed(2),
                  sumBank.toFixed(2),
                  sumTshirt.toFixed(2),
                  sumOldPending.toFixed(2),
                  sumGas.toFixed(2),
                  sumRation.toFixed(2),
                  sumProvision.toFixed(2),
                  sumTotal.toFixed(2),
                  sumReturn.toFixed(2),
                  sumFinalPayable.toFixed(2),
                ];

                exportExcel(filename, [headers, ...rows, totalRow]);
              }}
            >
              Export Excel
            </button>
          </div>
          {run && canApprove && unfinalizedEmployees.length > 0 ? (
            <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={toggleSelectAllFinalize}
              >
                {isAllFinalizeSelected ? "Deselect all" : `Select all (${unfinalizedEmployees.length})`}
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isActing || selectedFinalizeEmployeeIds.length === 0}
                onClick={() => void finalizeSelectedRecoveries()}
              >
                Finalize selected ({selectedFinalizeEmployeeIds.length})
              </button>
            </div>
          ) : null}
          {finalizedVoucherRows.length > 0 ? (
            <button className="primary-button" onClick={() => setBulkVouchers(true)}>
              Bulk deduction vouchers ({finalizedVoucherRows.length}) · Print recovery slip · A4 portrait
            </button>
          ) : null}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    aria-label="Select all unfinalized"
                    checked={isAllFinalizeSelected}
                    disabled={unfinalizedEmployees.length === 0}
                    onChange={toggleSelectAllFinalize}
                  />
                </th>
                <th>#</th><th>Employee</th><th>Employer unit</th><th>Room</th><th>Net before recovery</th><th>Rent</th><th>Bus</th><th>Food</th><th>Advance</th><th>ID</th><th>Medical</th><th>Ticket</th><th>Shoe</th><th>Aadhaar</th><th>Bank A/c</th><th>T-shirt</th><th>Old pending</th><th>Gas</th><th>Ration</th><th>Provision</th><th>Total recovery</th><th>Return</th><th>Final payable</th><th>Voucher</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.slice((recoveryPage - 1) * 20, recoveryPage * 20).map(
                ({ employee, charge, rent, bus, food, advance, idCard, medical, ticket, shoe, aadhaarUpdate, bankAccountCharge, tshirt, oldPending, returnAmount, individual, shared, item, gasShare, rationShare, provisionShare, pendingShared }, index) => {
                  const rowIndex = (recoveryPage - 1) * 20 + index;
                  const isFinalized = finalizations.some(
                    (finalized) => finalized.employeeId === employee.id,
                  );
                  const isSelected = selectedFinalizeEmployeeIds.includes(employee.id);
                  const preRecovery = item
                    ? (Number(item.importedNetPayable || 0) > 0
                      ? Number(item.importedNetPayable)
                      : item.netPayable +
                      item.accommodationDeduction -
                      item.returnAmount)
                    : 0;
                  return (
                    <tr key={employee.id}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isFinalized}
                          aria-label={`Select ${employee.name} for finalization`}
                          onChange={() => toggleSelectFinalize(employee.id)}
                        />
                      </td>
                      <td>{rowIndex + 1}</td>
                      <td><strong>{employee.name}</strong><small>{employee.employeeCode}</small></td>
                      <td>{(() => { const u = data.units.find((entry) => entry.id === employee.clientUnitId); return u ? `${u.clientName} · ${u.unitName}` : "—"; })()}</td>
                      <td>{getRecoveryRoomNumber(employee)}</td><td>₹{preRecovery.toFixed(2)}</td>
                      <td>₹{rent.toFixed(2)}</td><td>₹{bus.toFixed(2)}</td><td>₹{food.toFixed(2)}</td><td>₹{advance.toFixed(2)}</td><td>₹{idCard.toFixed(2)}</td><td>₹{medical.toFixed(2)}</td><td>₹{ticket.toFixed(2)}</td><td>₹{shoe.toFixed(2)}</td><td>₹{aadhaarUpdate.toFixed(2)}</td><td>₹{bankAccountCharge.toFixed(2)}</td><td>₹{tshirt.toFixed(2)}</td><td>₹{oldPending.toFixed(2)}</td><td>₹{gasShare.toFixed(2)}{pendingShared > 0 ? <small>Draft room share</small> : null}</td><td>₹{rationShare.toFixed(2)}</td><td>₹{provisionShare.toFixed(2)}</td><td><strong>₹{(individual + shared).toFixed(2)}</strong></td><td>₹{returnAmount.toFixed(2)}</td><td><strong>₹{Math.max(0, preRecovery - (individual + shared) + returnAmount).toFixed(2)}</strong></td>
                      <td>
                        {isFinalized ? (
                          <div className="record-actions" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {(canManage || canApprove) ? (
                              <button
                                type="button"
                                className="record-action"
                                style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                                disabled={isActing}
                                onClick={() => openEditEmployeeRecovery(employee, charge)}
                                title="Edit employee deductions"
                              >
                                Edit
                              </button>
                            ) : null}
                            <button
                              className="record-action"
                              onClick={() => setVoucherEmployeeId(employee.id)}
                            >
                              Individual deduction voucher
                            </button>
                            {canApprove ? (
                              <button
                                className="record-action"
                                disabled={isActing}
                                onClick={() =>
                                  void onAction(
                                    "reopen-employee-recovery",
                                    "Employee recovery reopened",
                                    { employeeId: employee.id },
                                  )
                                }
                              >
                                Reopen
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="record-actions" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {(canManage || canApprove) ? (
                              <button
                                type="button"
                                className="record-action"
                                style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                                disabled={isActing}
                                onClick={() => openEditEmployeeRecovery(employee, charge)}
                                title="Edit employee deductions"
                              >
                                Edit
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="record-action"
                              disabled
                              title="Available after recovery finalization"
                            >
                              Individual deduction voucher
                            </button>
                            {run && canApprove ? (
                              <button
                                className="primary-button"
                                disabled={isActing}
                                onClick={() =>
                                  void onAction(
                                    "finalize-employee-recovery",
                                    "Recovery finalized and voucher generated",
                                    { employeeId: employee.id },
                                  )
                                }
                              >
                                Finalize recovery
                              </button>
                            ) : (
                              <small>{run ? "Awaiting Super Admin approval" : "Payroll run required before finalization and voucher"}</small>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={recoveryPage}
          totalItems={employeeRows.length}
          pageSize={20}
          onPageChange={setRecoveryPage}
        />
      </section>
      {(canManage || canApprove) ? (
        <section className="panel form-grid room-recovery-entry-panel">
          <div className="panel-heading form-span">
            <div>
              <span className="eyebrow">Add Recovery for Rooms</span>
              <h2>Room-wise recovery</h2>
            </div>
            <span className="muted-label">Select the recovery date first. Remaining room recovery fields will open after the date is selected.</span>
          </div>
          <label className="form-span">
            <span>Recovery date *</span>
            <input
              type="date"
              value={roomRecoveryDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                const prevMonth = roomRecoveryDate ? roomRecoveryDate.slice(0, 7) : "";
                const nextMonth = nextDate ? nextDate.slice(0, 7) : "";
                setRoomRecoveryDate(nextDate);
                if (!nextDate || (prevMonth && nextMonth && prevMonth !== nextMonth)) {
                  chooseRecoveryRoom("");
                }
              }}
              required
            />
          </label>
          <label>
            <span>Accommodation category *</span>
            <select disabled={!roomRecoveryDate} value={roomRecoveryScope} onChange={(event) => {
              setRoomRecoveryScope(event.target.value as "" | "joy" | "outside");
              setRoomRecoveryHostelId("");
              setRoomRecoveryArea("");
              chooseRecoveryRoom("");
            }}>
              <option value="">Select category</option>
              <option value="joy">Joy Room / Joy Hostel</option>
              <option value="outside">Outside Room</option>
            </select>
          </label>
          {roomRecoveryScope ? (
            <label>
              <span>Sub category / {isOutsideRecoveryType ? "Area name" : "Hostel name"} *</span>
              <select value={roomRecoveryHostelId} onChange={(event) => {
                setRoomRecoveryHostelId(event.target.value);
                chooseRecoveryRoom("");
              }}>
                <option value="">Select {isOutsideRecoveryType ? "area" : "hostel"}</option>
                {recoveryHostels.map((hostel) => (
                  <option key={hostel.id} value={hostel.id}>{hostel.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>Room *</span>
            <select value={roomRecoveryId} onChange={(event) => chooseRecoveryRoom(event.target.value)} disabled={!roomRecoveryDate || !roomRecoveryScope || !roomRecoveryHostelId}>
              <option value="">Select room</option>
              {recoveryRooms.map((room) => <option key={room.id} value={room.id}>Room {room.roomNumber}</option>)}
            </select>
          </label>
          {selectedRecoveryRoom ? (
            <div className="form-span panel room-recovery-member-confirmation">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Roommate confirmation</span>
                  <h3>Are these the employees staying in Room {selectedRecoveryRoom.roomNumber}?</h3>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      setRoomRecoveryConfirmed(false);
                      const roomOccupants = data.employees
                        .filter(
                          (e) =>
                            isEmployeeActiveInPeriod(e, roomRecoveryPeriod) &&
                            (e.vendorId === vendorId || !vendorId) &&
                            (e.roomId === selectedRecoveryRoom.id ||
                              e.roomNumber === selectedRecoveryRoom.roomNumber),
                        )
                        .map((e) => e.id);
                      setRoomRecoveryMembers(roomOccupants);
                    }}
                  >
                    Select room occupants
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      setRoomRecoveryConfirmed(false);
                      const activeIds = companyActiveEmployees.map((e) => e.id);
                      setRoomRecoveryMembers((cur) =>
                        cur.length === activeIds.length ? [] : activeIds,
                      );
                    }}
                  >
                    {roomRecoveryMembers.length === companyActiveEmployees.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                  <span className="muted-label">{roomRecoveryMembers.length} selected</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <input
                  type="search"
                  placeholder="Search employee by name or ID..."
                  value={roomMemberSearch}
                  onChange={(event) => {
                    setRoomMemberSearch(event.target.value);
                    setRoomMemberPage(1);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    width: "280px",
                  }}
                />
                <span className="muted-label" style={{ fontSize: "11px" }}>
                  Showing 15 per page (Page {roomMemberPage} of {Math.max(1, Math.ceil(filteredRoomConfirmationEmployees.length / 15))})
                </span>
              </div>
              <div className="room-recovery-member-grid">
                {filteredRoomConfirmationEmployees
                  .slice((roomMemberPage - 1) * 15, roomMemberPage * 15)
                  .map((employee) => {
                    const isOccupant = roomRecoveryMembers.includes(employee.id);
                    const unitName = data.units.find((u) => u.id === employee.clientUnitId)?.unitName;
                    return (
                      <label
                        key={employee.id}
                        className="room-recovery-member-option"
                        style={{
                          background: isOccupant ? "#f0fdf4" : undefined,
                          borderColor: isOccupant ? "#86efac" : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isOccupant}
                          onChange={(event) => {
                            setRoomRecoveryConfirmed(false);
                            setRoomRecoveryMembers((current) =>
                              event.target.checked
                                ? [...new Set([...current, employee.id])]
                                : current.filter((id) => id !== employee.id),
                            );
                          }}
                        />
                        <span>
                          <strong>{employee.employeeCode}</strong> · {employee.name}
                          {unitName ? (
                            <small style={{ marginLeft: "4px", color: "#64748b" }}>
                              ({unitName})
                            </small>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
              </div>
              <TablePagination
                currentPage={roomMemberPage}
                totalItems={filteredRoomConfirmationEmployees.length}
                pageSize={15}
                onPageChange={setRoomMemberPage}
              />
              <button type="button" className="secondary-button" disabled={isActing} onClick={() => void confirmRecoveryRoomMembers()} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "6px" }}>
                {roomRecoveryConfirmed ? (
                  <>
                    <Check size={14} style={{ color: "#16a34a" }} />
                    <span>Roommates confirmed</span>
                  </>
                ) : (
                  <span>Confirm / update room employees</span>
                )}
              </button>
            </div>
          ) : null}
          <label>
            <span>Gas amount (₹)</span>
            <input disabled={!roomRecoveryDate || !selectedRecoveryRoom} type="number" min="0" step="0.01" value={roomRecoveryGas} onChange={(event) => setRoomRecoveryGas(Number(event.target.value))} />
          </label>
          <label>
            <span>Ration amount (₹)</span>
            <input disabled={!roomRecoveryDate || !selectedRecoveryRoom} type="number" min="0" step="0.01" value={roomRecoveryRation} onChange={(event) => setRoomRecoveryRation(Number(event.target.value))} />
          </label>
          <label>
            <span>Provision amount (₹)</span>
            <input disabled={!roomRecoveryDate || !selectedRecoveryRoom} type="number" min="0" step="0.01" value={roomRecoveryProvision} onChange={(event) => setRoomRecoveryProvision(Number(event.target.value))} />
          </label>
          <label>
            <span>Common room rent (₹)</span>
            <input disabled={!roomRecoveryDate || !selectedRecoveryRoom} type="number" min="0" step="0.01" value={roomRecoveryRoomRent} onChange={(event) => setRoomRecoveryRoomRent(Number(event.target.value))} />
          </label>
          <label>
            <span>Transport rent (₹)</span>
            <input disabled={!roomRecoveryDate || !selectedRecoveryRoom} type="number" min="0" step="0.01" value={roomRecoveryTransport} onChange={(event) => setRoomRecoveryTransport(Number(event.target.value))} />
          </label>
          <div className="form-span room-expense-calculation">
            <strong>Total ₹{(roomRecoveryGas + roomRecoveryRation + roomRecoveryProvision + roomRecoveryRoomRent + roomRecoveryTransport).toFixed(2)}</strong>
            <span>÷ {roomRecoveryMembers.length} confirmed roommates</span>
            <strong>Per head ₹{(roomRecoveryMembers.length ? (roomRecoveryGas + roomRecoveryRation + roomRecoveryProvision + roomRecoveryRoomRent + roomRecoveryTransport) / roomRecoveryMembers.length : 0).toFixed(2)}</strong>
          </div>
          <button type="button" className="primary-button form-span" disabled={isActing || !roomRecoveryDate || !roomRecoveryId} onClick={() => void saveRoomWiseRecovery()}>
            Save dated room recovery entry for {roomRecoveryPeriod}
          </button>
        </section>
      ) : null}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Room recovery date-wise ledger</span>
            <h2>Gas, Ration, Provision, Rent &amp; Transport split</h2>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              aria-label="Filter date-wise ledger by room"
              value={roomLedgerFilter}
              onChange={(event) => {
                setRoomLedgerFilter(event.target.value);
                setRoomLedgerPage(1);
              }}
              style={{ fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff" }}
            >
              <option value="">All rooms</option>
              {roomPrintRooms.map((room) => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
            <span className="muted-label">
              Every dated entry is preserved; monthly total ÷ confirmed room occupants
            </span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Month</th>
                <th>Entry date</th>
                <th>Occupants</th>
                <th>Gas</th>
                <th>Ration</th>
                <th>Provision</th>
                <th>Room Rent</th>
                <th>Transport</th>
                <th>Per head</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoomRows.slice((roomLedgerPage - 1) * 20, roomLedgerPage * 20).map(({ expense, room }) => {
                const roomNum = room?.roomNumber ?? expense.roomId;
                const autoOccupants = data.employees.filter(
                  (e) =>
                    isEmployeeActiveInPeriod(e, expense.payPeriod) &&
                    (!vendorId || e.vendorId === vendorId) &&
                    (e.roomId
                      ? e.roomId === expense.roomId
                      : (roomNum && e.roomNumber === roomNum && (!room?.vendorId || e.vendorId === room.vendorId))),
                );
                const effectiveOccupantCount =
                  expense.occupantCount > 0 ? expense.occupantCount : autoOccupants.length;
                const totalExpenseAmount =
                  expense.gasAmount +
                  expense.rationAmount +
                  expense.provisionAmount +
                  ((expense as any).roomRentAmount ?? 0) +
                  ((expense as any).transportRentAmount ?? 0);
                const perHeadAmount =
                  effectiveOccupantCount > 0 ? totalExpenseAmount / effectiveOccupantCount : totalExpenseAmount;

                return (
                  <tr key={expense.id}>
                    <td>
                      <strong>{roomNum}</strong>
                    </td>
                    <td>{expense.payPeriod}</td>
                    <td>{expense.gasDate ?? expense.rationDate ?? expense.provisionDate ?? "—"}</td>
                    <td>{effectiveOccupantCount}</td>
                    <td>₹{expense.gasAmount.toFixed(2)}</td>
                    <td>₹{expense.rationAmount.toFixed(2)}</td>
                    <td>₹{expense.provisionAmount.toFixed(2)}</td>
                    <td>₹{((expense as any).roomRentAmount ?? 0).toFixed(2)}</td>
                    <td>₹{((expense as any).transportRentAmount ?? 0).toFixed(2)}</td>
                    <td>
                      <strong>₹{perHeadAmount.toFixed(2)}</strong>
                    </td>
                  <td>
                    <span className={`status-badge status-${expense.status}`}>
                      {expense.status}
                    </span>
                  </td>
                  <td>
                    <div className="record-actions" style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="record-action"
                        style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                        disabled={isActing}
                        onClick={() => openEditRoomExpense(expense, room)}
                      >
                        Edit
                      </button>
                      {(canManage || canApprove) ? (
                        <button
                          type="button"
                          className="record-action record-delete"
                          disabled={isActing}
                          onClick={() => void deleteRoomExpense(expense)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={roomLedgerPage}
          totalItems={filteredRoomRows.length}
          pageSize={20}
          onPageChange={setRoomLedgerPage}
        />
      </section>
      {voucherEmployeeId ? (
        <AdvanceVoucher
          employeeId={voucherEmployeeId}
          employee={employees.find(
            (employee) => employee.id === voucherEmployeeId,
          )}
          item={items.find((item) => item.employeeId === voucherEmployeeId)}
          charge={runCharges.find(
            (charge) => charge.employeeId === voucherEmployeeId,
          )}
          entries={entries.filter(
            (entry) => entry.employeeId === voucherEmployeeId,
          )}
          unit={data.units.find(
            (unit) =>
              unit.id ===
              employees.find((employee) => employee.id === voucherEmployeeId)
                ?.clientUnitId,
          )}
          vendor={data.vendors.find(
            (vendor) =>
              vendor.id ===
              employees.find((employee) => employee.id === voucherEmployeeId)
                ?.vendorId,
          )}
          run={run}
          onClose={() => setVoucherEmployeeId(null)}
        />
      ) : null}
      {bulkVouchers ? (
        <BulkRecoveryVouchers
          rows={finalizedVoucherRows}
          entries={entries}
          units={data.units}
          vendors={data.vendors}
          run={run}
          onClose={() => setBulkVouchers(false)}
        />
      ) : null}

      {/* MODAL 1: Edit Room Expense & Re-split */}
      {editingRoomExpense ? (
        <div className="modal-layer">
          <button
            type="button"
            className="modal-scrim"
            onClick={() => !isSavingRoomEdit && setEditingRoomExpense(null)}
            aria-label="Close modal"
          />
          <div
            className="panel"
            style={{
              position: "relative",
              zIndex: 10,
              maxWidth: "760px",
              width: "92vw",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "16px",
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#2563eb" }}>Recovery Ledger Editor</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 700 }}>
                  Edit Room Recovery &amp; Re-split
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Update date, room, expense amounts, and add/remove roommates. The expense re-splits automatically.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                style={{ fontSize: "20px", width: "32px", height: "32px", cursor: "pointer" }}
                onClick={() => !isSavingRoomEdit && setEditingRoomExpense(null)}
              >
                ×
              </button>
            </div>

            {/* Main Form Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Entry date *</span>
                <input
                  type="date"
                  value={editRoomDate}
                  onChange={(e) => setEditRoomDate(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Room *</span>
                <select
                  value={editRoomId}
                  onChange={(e) => {
                    const newRoomId = e.target.value;
                    setEditRoomId(newRoomId);
                    const selRoom = data.accommodationRooms.find((r) => r.id === newRoomId);
                    const occupants = data.employees
                      .filter(
                        (emp) =>
                          isEmployeeActiveInPeriod(emp, editingRoomExpense?.payPeriod ?? roomRecoveryPeriod) &&
                          (emp.vendorId === vendorId || !vendorId) &&
                          (emp.roomId === newRoomId || (selRoom?.roomNumber && emp.roomNumber === selRoom.roomNumber)),
                      )
                      .map((emp) => emp.id);
                    setEditRoomMembers(occupants);
                  }}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">Select room</option>
                  {data.accommodationRooms
                    .filter((r) => r.status === "active" && (!vendorId || r.vendorId === vendorId))
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {/* Amount inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Gas amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRoomGas}
                  onChange={(e) => setEditRoomGas(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Ration amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRoomRation}
                  onChange={(e) => setEditRoomRation(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Provision amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRoomProvision}
                  onChange={(e) => setEditRoomProvision(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Room rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRoomRent}
                  onChange={(e) => setEditRoomRent(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Transport rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editRoomTransport}
                  onChange={(e) => setEditRoomTransport(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
            </div>

            {/* Live Per-Head Split Banner */}
            {(() => {
              const totalAmount = editRoomGas + editRoomRation + editRoomProvision + editRoomRent + editRoomTransport;
              const memberCount = editRoomMembers.length;
              const perHeadTotal = memberCount > 0 ? totalAmount / memberCount : 0;
              const perHeadGas = memberCount > 0 ? editRoomGas / memberCount : 0;
              const perHeadRation = memberCount > 0 ? editRoomRation / memberCount : 0;
              const perHeadProvision = memberCount > 0 ? editRoomProvision / memberCount : 0;
              return (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#166534", fontWeight: 700 }}>
                        Live Re-split preview
                      </span>
                      <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#14532d" }}>
                        Total ₹{totalAmount.toFixed(2)} ÷ {memberCount} roommate{memberCount === 1 ? "" : "s"} = <span style={{ color: "#15803d" }}>₹{perHeadTotal.toFixed(2)} per head</span>
                      </div>
                    </div>
                    {memberCount === 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <AlertTriangle size={14} />
                        <span>Select at least 1 roommate to split the expense</span>
                      </span>
                    ) : null}
                  </div>
                  {memberCount > 0 && totalAmount > 0 ? (
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#166534", paddingTop: "4px", borderTop: "1px dashed #bbf7d0" }}>
                      <span>Gas share: <strong>₹{perHeadGas.toFixed(2)}</strong>/head</span>
                      <span>Ration share: <strong>₹{perHeadRation.toFixed(2)}</strong>/head</span>
                      <span>Provision share: <strong>₹{perHeadProvision.toFixed(2)}</strong>/head</span>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Roommate Checklist with Search */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                    Roommates ({editRoomMembers.length} selected)
                  </h3>
                  <small style={{ color: "#64748b" }}>
                    Check to add or uncheck to remove. The per-head split recalculates instantly.
                  </small>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      const selRoom = data.accommodationRooms.find((r) => r.id === editRoomId);
                      const occupants = data.employees
                        .filter(
                          (emp) =>
                            isEmployeeActiveInPeriod(emp, editingRoomExpense?.payPeriod ?? roomRecoveryPeriod) &&
                            (emp.vendorId === vendorId || !vendorId) &&
                            (emp.roomId === editRoomId || (selRoom?.roomNumber && emp.roomNumber === selRoom.roomNumber)),
                        )
                        .map((emp) => emp.id);
                      setEditRoomMembers(occupants);
                    }}
                  >
                    Reset to room occupants
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                    onClick={() => {
                      const allActive = companyActiveEmployees.map((e) => e.id);
                      setEditRoomMembers((cur) => cur.length === allActive.length ? [] : allActive);
                    }}
                  >
                    {editRoomMembers.length === companyActiveEmployees.length ? "Deselect all" : "Select all active"}
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search employee by name or code to add..."
                value={editMemberSearch}
                onChange={(e) => setEditMemberSearch(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "12px", background: "#ffffff" }}
              />

              <div
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "8px",
                  padding: "4px",
                }}
              >
                {companyActiveEmployees
                  .filter((emp) => {
                    if (!editMemberSearch.trim()) return true;
                    const q = editMemberSearch.toLowerCase();
                    return emp.name.toLowerCase().includes(q) || emp.employeeCode.toLowerCase().includes(q);
                  })
                  .sort((a, b) => {
                    const aSel = editRoomMembers.includes(a.id) ? 1 : 0;
                    const bSel = editRoomMembers.includes(b.id) ? 1 : 0;
                    if (aSel !== bSel) return bSel - aSel;
                    return a.name.localeCompare(b.name);
                  })
                  .map((emp) => {
                    const isSelected = editRoomMembers.includes(emp.id);
                    const unitName = data.units.find((u) => u.id === emp.clientUnitId)?.unitName;
                    return (
                      <label
                        key={emp.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: `1px solid ${isSelected ? "#86efac" : "#e2e8f0"}`,
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setEditRoomMembers((cur) =>
                              e.target.checked
                                ? [...new Set([...cur, emp.id])]
                                : cur.filter((id) => id !== emp.id),
                            );
                          }}
                        />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <strong>{emp.employeeCode}</strong> · {emp.name}
                          {unitName ? <small style={{ color: "#64748b", marginLeft: "4px" }}>({unitName})</small> : null}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <button
                type="button"
                className="secondary-button"
                disabled={isSavingRoomEdit}
                onClick={() => setEditingRoomExpense(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isSavingRoomEdit || !editRoomId || !editRoomDate || editRoomMembers.length === 0}
                onClick={() => void saveEditedRoomExpense()}
              >
                {isSavingRoomEdit ? "Saving & Re-splitting…" : "Save Changes & Re-split"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 2: Edit Individual Recovery Entry */}
      {editingEntry ? (
        <div className="modal-layer">
          <button
            type="button"
            className="modal-scrim"
            onClick={() => !isSavingEntryEdit && setEditingEntry(null)}
            aria-label="Close modal"
          />
          <div
            className="panel"
            style={{
              position: "relative",
              zIndex: 10,
              maxWidth: "540px",
              width: "92vw",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "16px",
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#2563eb" }}>Recovery Register Editor</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 700 }}>
                  Edit Individual Recovery Entry
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Update the recovery date, deduction type, amount, or remarks.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                style={{ fontSize: "20px", width: "32px", height: "32px", cursor: "pointer" }}
                onClick={() => !isSavingEntryEdit && setEditingEntry(null)}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Recovery date *</span>
                <input
                  type="date"
                  value={editEntryDate}
                  onChange={(e) => setEditEntryDate(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Deduction type *</span>
                <select
                  value={editEntryType}
                  onChange={(e) => setEditEntryType(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  {Object.entries(recoveryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Amount (₹) *</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editEntryAmount}
                  onChange={(e) => setEditEntryAmount(Math.max(0, Number(e.target.value) || 0))}
                  required
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
                {editEntryAmount === 0 ? (
                  <small style={{ color: "#d97706", fontSize: "11px" }}>
                    Setting amount to ₹0 will remove this entry and recalculate employee net pay.
                  </small>
                ) : null}
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Reference</span>
                <input
                  type="text"
                  value={editEntryReference}
                  onChange={(e) => setEditEntryReference(e.target.value)}
                  placeholder="e.g. Receipt #, Token #"
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Notes / Remarks</span>
                <textarea
                  value={editEntryNotes}
                  onChange={(e) => setEditEntryNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes"
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", resize: "vertical" }}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <button
                type="button"
                className="secondary-button"
                disabled={isSavingEntryEdit}
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={isSavingEntryEdit || !editEntryDate || editEntryAmount < 0}
                onClick={() => void saveEditedIndividualEntry()}
              >
                {isSavingEntryEdit ? "Saving…" : editEntryAmount === 0 ? "Zero Out & Recalculate" : "Save Recovery"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL 3: Edit Employee Recoveries */}
      {editingEmpRecovery ? (
        <div className="modal-layer">
          <button
            type="button"
            className="modal-scrim"
            onClick={() => !isSavingEmpRecovery && setEditingEmpRecovery(null)}
            aria-label="Close modal"
          />
          <div
            className="panel"
            style={{
              position: "relative",
              zIndex: 10,
              maxWidth: "760px",
              width: "92vw",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "16px",
              }}
            >
              <div>
                <span className="eyebrow" style={{ color: "#2563eb" }}>Employee Recovery Editor</span>
                <h2 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 700 }}>
                  Edit Recoveries: {editingEmpRecovery.employee.name}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Employee code: <strong>{editingEmpRecovery.employee.employeeCode}</strong> · Room: {getRecoveryRoomNumber(editingEmpRecovery.employee)}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                style={{ fontSize: "20px", width: "32px", height: "32px", cursor: "pointer" }}
                onClick={() => !isSavingEmpRecovery && setEditingEmpRecovery(null)}
              >
                ×
              </button>
            </div>

            {/* Deduction Input Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Rent (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecRent}
                  onChange={(e) => setEmpRecRent(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Bus (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecBus}
                  onChange={(e) => setEmpRecBus(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Food (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecFood}
                  onChange={(e) => setEmpRecFood(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Advance (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecAdvance}
                  onChange={(e) => setEmpRecAdvance(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>ID Card (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecIdCard}
                  onChange={(e) => setEmpRecIdCard(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Medical (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecMedical}
                  onChange={(e) => setEmpRecMedical(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Ticket (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecTicket}
                  onChange={(e) => setEmpRecTicket(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Shoe (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecShoe}
                  onChange={(e) => setEmpRecShoe(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Aadhaar update (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecAadhaar}
                  onChange={(e) => setEmpRecAadhaar(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Bank A/c charge (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecBank}
                  onChange={(e) => setEmpRecBank(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>T-Shirt (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecTshirt}
                  onChange={(e) => setEmpRecTshirt(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Old pending (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecOldPending}
                  onChange={(e) => setEmpRecOldPending(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>Return amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={empRecReturn}
                  onChange={(e) => setEmpRecReturn(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </label>
            </div>

            {/* Total summary */}
            {(() => {
              const totalIndividual =
                empRecRent +
                empRecBus +
                empRecFood +
                empRecAdvance +
                empRecIdCard +
                empRecMedical +
                empRecTicket +
                empRecShoe +
                empRecAadhaar +
                empRecBank +
                empRecTshirt +
                empRecOldPending;
              return (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Total Individual Deductions</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                      ₹{totalIndividual.toFixed(2)}
                    </div>
                  </div>
                  {empRecReturn > 0 ? (
                    <div>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>Return Amount (Credit)</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#16a34a" }}>
                        +₹{empRecReturn.toFixed(2)}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <button
                type="button"
                className="secondary-button"
                style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                disabled={isSavingEmpRecovery}
                onClick={async () => {
                  if (window.confirm("Clear all individual recoveries for this employee?")) {
                    setIsSavingEmpRecovery(true);
                    try {
                      await onAction("delete-accommodation", "All recoveries cleared for employee", {
                        employeeId: editingEmpRecovery.employee.id,
                      });
                      setEditingEmpRecovery(null);
                    } finally {
                      setIsSavingEmpRecovery(false);
                    }
                  }
                }}
              >
                Clear all recoveries
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isSavingEmpRecovery}
                  onClick={() => setEditingEmpRecovery(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={isSavingEmpRecovery}
                  onClick={() => void saveEditedEmployeeRecovery()}
                >
                  {isSavingEmpRecovery ? "Saving…" : "Save Recoveries"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {receiptModalImage ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
          onClick={() => setReceiptModalImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "88vh",
              background: "#ffffff",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🧾</span>
                <strong style={{ fontSize: "14px", color: "#1e293b" }}>Attached Bill / Receipt Photo</strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "4px 10px", fontSize: "12px", fontWeight: "bold" }}
                onClick={() => setReceiptModalImage(null)}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", overflow: "auto", maxHeight: "75vh" }}>
              <img
                src={receiptModalImage}
                alt="Receipt full view"
                style={{
                  maxWidth: "100%",
                  maxHeight: "72vh",
                  objectFit: "contain",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildVoucherLines(
  entries: RecoveryEntry[],
  charge?: AccommodationCharge,
): Array<[string, number]> {
  const linesMap = new Map<string, number>();
  for (const row of entries.filter(
    (entry) => entry.recoveryType !== "returnAmount",
  )) {
    const label = recoveryLabels[row.recoveryType] ?? row.recoveryType;
    linesMap.set(
      label,
      (linesMap.get(label) ?? 0) + Number(row.amount || 0),
    );
  }
  if (charge) {
    const aliasGroups: Record<string, string[]> = {
      rent: ["Common room rent", "Room rent"],
      bus: ["Transport rent", "Bus"],
      food: ["Food"],
      advance: ["Salary advance", "Advance"],
      idCard: ["ID card"],
      medical: ["Medical"],
      ticket: ["Ticket"],
      shoe: ["Shoe"],
      aadhaarUpdate: ["Aadhaar update"],
      bankAccountCharge: ["Bank account charge"],
      tshirt: ["T-shirt"],
      oldPending: ["Old pending"],
    };

    for (const [field, defaultLabel] of [
      ["rent", "Common room rent"],
      ["bus", "Transport rent"],
      ["food", "Food"],
      ["advance", "Salary advance"],
      ["idCard", "ID card"],
      ["medical", "Medical"],
      ["ticket", "Ticket"],
      ["shoe", "Shoe"],
      ["aadhaarUpdate", "Aadhaar update"],
      ["bankAccountCharge", "Bank account charge"],
      ["tshirt", "T-shirt"],
      ["oldPending", "Old pending"],
    ] as const) {
      const value = Number(charge[field] || 0);
      const aliases = aliasGroups[field] ?? [defaultLabel];
      const existingVal = aliases.reduce((s, name) => s + (linesMap.get(name) || 0), 0);
      if (value > existingVal) {
        linesMap.set(defaultLabel, value);
      }
    }
    if (charge.gasShare) {
      const gasVal = Number(charge.gasShare);
      if (gasVal > (linesMap.get("Gas amount") || 0)) {
        linesMap.set("Gas amount", gasVal);
      }
    }
    if (charge.rationShare) {
      const rationVal = Number(charge.rationShare);
      if (rationVal > (linesMap.get("Ration amount") || 0)) {
        linesMap.set("Ration amount", rationVal);
      }
    }
    if (charge.provisionShare) {
      const provVal = Number(charge.provisionShare);
      if (provVal > (linesMap.get("Provision amount") || 0)) {
        linesMap.set("Provision amount", provVal);
      }
    }
  }
  return Array.from(linesMap.entries()).filter(([, value]) => value > 0);
}

function AdvanceVoucher({
  employeeId,
  employee,
  item,
  charge,
  entries,
  unit,
  vendor,
  run,
  onClose,
}: {
  employeeId: string;
  employee?: Employee;
  item?: PayrollItem;
  charge?: AccommodationCharge;
  entries: RecoveryEntry[];
  unit?: ClientUnit;
  vendor?: Vendor;
  run: PayrollRun | null;
  onClose: () => void;
}) {
  const voucherNo = `DRV-${(run?.payPeriod ?? new Date().toISOString().slice(0, 7)).replace("-", "")}-${employee?.employeeCode ?? employeeId.slice(-6)}`;
  const brand = voucherBrand(vendor, unit);
  const lines = buildVoucherLines(entries, charge);
  const voucherTotal = lines.reduce((sum, [, value]) => sum + value, 0);
  const gross = Number(item?.importedGrossEarnings || item?.grossEarnings || 0);
  const salaryDeds = Number(
    item?.importedTotalDeductions ||
    (item ? item.totalDeductions - (item.accommodationDeduction || 0) : 0),
  );
  const netSalary =
    Number(item?.importedNetPayable || 0) > 0
      ? Number(item?.importedNetPayable)
      : (gross > 0
        ? Math.max(0, gross - salaryDeds)
        : Number(employee?.salaryAmount || 0));
  const preRecovery =
    netSalary > 0
      ? netSalary
      : Number(
        (item?.netPayable ?? 0) +
        (item?.accommodationDeduction ?? 0) -
        (item?.returnAmount ?? 0),
      );
  const rawFinalPayable = Math.round(
    (preRecovery > 0 ? preRecovery - voucherTotal : Number(item?.netPayable ?? 0)) * 100,
  ) / 100;
  const finalPayable = Math.max(0, rawFinalPayable);
  const carriedForward = rawFinalPayable < 0 ? Math.abs(rawFinalPayable) : 0;

  return (
    <div className="modal-layer advance-voucher-layer">
      <button className="modal-scrim" onClick={onClose} />
      <div className="room-report-modal">
        <div className="modal-toolbar">
          <strong>Final recovery voucher</strong>
          <div>
            <button className="secondary-button" onClick={() => printTarget()}>
              Print recovery slip · A4 portrait
            </button>
            <button className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <article className="advance-voucher">
          <header className="voucher-brand-header">
            {vendor?.logoDataUrl ? (
              <img src={vendor.logoDataUrl} alt={`${brand.companyName} logo`} />
            ) : null}
            <div>
              <h2>{brand.companyName}</h2>
              <h3>{brand.clientEmployer}</h3>
              <p>{brand.address}</p>
              <p>{brand.contact}</p>
            </div>
          </header>
          <h3>FINAL SALARY RECOVERY ACKNOWLEDGEMENT</h3>
          <dl>
            <div>
              <dt>Voucher number</dt>
              <dd>{voucherNo}</dd>
            </div>
            <div>
              <dt>Salary cycle</dt>
              <dd>
                {run?.periodStart} to {run?.periodEnd}
              </dd>
            </div>
            <div>
              <dt>Employee</dt>
              <dd>{employee?.name ?? employeeId}</dd>
            </div>
            <div>
              <dt>Employee ID</dt>
              <dd>{employee?.employeeCode ?? "—"}</dd>
            </div>
            <div>
              <dt>Net before recovery</dt>
              <dd>₹{preRecovery.toFixed(2)}</dd>
            </div>
          </dl>
          <table className="data-table">
            <thead>
              <tr>
                <th>Deduction type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(([label, value], index) => (
                <tr key={`${label}-${index}`}>
                  <td>{label}</td>
                  <td>₹{value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total recovery</th>
                <th>₹{voucherTotal.toFixed(2)}</th>
              </tr>
              <tr style={{ background: "#f1f5f9", fontWeight: "bold" }}>
                <th><strong>FINAL PAYABLE</strong></th>
                <th><strong>₹{finalPayable.toFixed(2)}</strong></th>
              </tr>
              {carriedForward > 0 ? (
                <tr style={{ background: "#fef3c7", color: "#b45309", fontWeight: "bold" }}>
                  <th><strong>BALANCE CARRIED FORWARD</strong></th>
                  <th><strong>₹{carriedForward.toFixed(2)}</strong></th>
                </tr>
              ) : null}
            </tfoot>
          </table>
          <p>
            I acknowledge the above finalized salary deductions and final
            payable amount of <strong>₹{finalPayable.toFixed(2)}</strong>
            {carriedForward > 0 ? ` (with an unrecovered deficit of ₹${carriedForward.toFixed(2)} carrying forward to next month's salary)` : ""} is correct.
          </p>
          <footer>
            <span>Employee signature</span>
            <span>Authorized signature</span>
          </footer>
        </article>
      </div>
    </div>
  );
}

function BulkRecoveryVouchers({
  rows,
  entries,
  units,
  vendors,
  run,
  onClose,
}: {
  rows: Array<{
    employee: Employee;
    charge?: AccommodationCharge;
    item?: PayrollItem;
  }>;
  entries: RecoveryEntry[];
  units: ClientUnit[];
  vendors: Vendor[];
  run: PayrollRun | null;
  onClose: () => void;
}) {
  return (
    <div className="modal-layer advance-voucher-layer">
      <button className="modal-scrim" onClick={onClose} />
      <div className="room-report-modal">
        <div className="modal-toolbar">
          <div>
            <strong>Bulk finalized recovery vouchers</strong>
            <span>
              {rows.length} employees · individual and room-wise shares included
            </span>
          </div>
          <div>
            <button className="primary-button" onClick={() => printTarget()}>
              Print / Save bulk PDF
            </button>
            <button className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="bulk-recovery-vouchers">
          {rows.map(({ employee, charge, item }) => {
            const unit = units.find((row) => row.id === employee.clientUnitId);
            const vendor = vendors.find((row) => row.id === employee.vendorId);
            const brand = voucherBrand(vendor, unit);
            const voucherNo = `DRV-${(run?.payPeriod ?? "").replace("-", "")}-${employee.employeeCode}`;
            const lines = buildVoucherLines(
              entries.filter((entry) => entry.employeeId === employee.id),
              charge,
            );
            const voucherTotal = lines.reduce((sum, [, value]) => sum + value, 0);
            const gross = Number(item?.importedGrossEarnings || item?.grossEarnings || 0);
            const salaryDeds = Number(
              item?.importedTotalDeductions ||
              (item ? item.totalDeductions - (item.accommodationDeduction || 0) : 0),
            );
            const netSalary =
              Number(item?.importedNetPayable || 0) > 0
                ? Number(item?.importedNetPayable)
                : (gross > 0
                  ? Math.max(0, gross - salaryDeds)
                  : Number(employee.salaryAmount || 0));
            const preRecovery =
              netSalary > 0
                ? netSalary
                : Number(
                  (item?.netPayable ?? 0) +
                  (item?.accommodationDeduction ?? 0) -
                  (item?.returnAmount ?? 0),
                );
            const rawFinalPayable = Math.round(
              (preRecovery > 0 ? preRecovery - voucherTotal : Number(item?.netPayable ?? 0)) * 100,
            ) / 100;
            const finalPayable = Math.max(0, rawFinalPayable);
            const carriedForward = rawFinalPayable < 0 ? Math.abs(rawFinalPayable) : 0;

            return (
              <article className="advance-voucher" key={employee.id}>
                <header className="voucher-brand-header">
                  {vendor?.logoDataUrl ? (
                    <img src={vendor.logoDataUrl} alt={`${brand.companyName} logo`} />
                  ) : null}
                  <div>
                    <h2>{brand.companyName}</h2>
                    <h3>{brand.clientEmployer}</h3>
                    <p>{brand.address}</p>
                    <p>{brand.contact}</p>
                  </div>
                </header>
                <h3>FINAL SALARY RECOVERY ACKNOWLEDGEMENT</h3>
                <dl>
                  <div>
                    <dt>Voucher number</dt>
                    <dd>{voucherNo}</dd>
                  </div>
                  <div>
                    <dt>Salary cycle</dt>
                    <dd>
                      {run?.periodStart} to {run?.periodEnd}
                    </dd>
                  </div>
                  <div>
                    <dt>Employee</dt>
                    <dd>{employee.name}</dd>
                  </div>
                  <div>
                    <dt>Employee ID</dt>
                    <dd>{employee.employeeCode}</dd>
                  </div>
                  <div>
                    <dt>Net before recovery</dt>
                    <dd>₹{preRecovery.toFixed(2)}</dd>
                  </div>
                </dl>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deduction type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(([label, value], index) => (
                      <tr key={`${label}-${index}`}>
                        <td>{label}</td>
                        <td>₹{value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Total recovery</th>
                      <th>₹{voucherTotal.toFixed(2)}</th>
                    </tr>
                    <tr style={{ background: "#f1f5f9", fontWeight: "bold" }}>
                      <th><strong>FINAL PAYABLE</strong></th>
                      <th><strong>₹{finalPayable.toFixed(2)}</strong></th>
                    </tr>
                    {carriedForward > 0 ? (
                      <tr style={{ background: "#fef3c7", color: "#b45309", fontWeight: "bold" }}>
                        <th><strong>BALANCE CARRIED FORWARD</strong></th>
                        <th><strong>₹{carriedForward.toFixed(2)}</strong></th>
                      </tr>
                    ) : null}
                  </tfoot>
                </table>
                <p>
                  I acknowledge the above finalized salary deductions and final
                  payable amount of <strong>₹{finalPayable.toFixed(2)}</strong>
                  {carriedForward > 0 ? ` (with an unrecovered deficit of ₹${carriedForward.toFixed(2)} carrying forward to next month's salary)` : ""} is correct.
                </p>
                <footer>
                  <span>Employee signature</span>
                  <span>Authorized signature</span>
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function resolveItemizedInternalDeductions(
  employeeId: string,
  employee: Employee | undefined,
  charge: AccommodationCharge | undefined,
  recoveryEntries: RecoveryEntry[],
  roomExpenses: AppData["roomExpenses"],
  appliedAccommodationDeduction: number,
) {
  const empDated = recoveryEntries.filter(
    (entry) => entry.employeeId === employeeId && entry.recoveryType !== "returnAmount",
  );

  const datedSum = (...types: string[]) =>
    empDated
      .filter((entry) => types.includes(entry.recoveryType))
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  // 1. Room rent (hostel accommodation)
  let roomRent =
    datedSum("rent", "commonRoomRent", "roomRent") > 0
      ? datedSum("rent", "commonRoomRent", "roomRent")
      : Number(charge?.rent || 0);
  if (roomRent === 0 && employee?.roomId) {
    const expense = roomExpenses.find((e) => e.roomId === employee.roomId);
    if (expense) {
      const occCount = expense.occupantCount > 0 ? expense.occupantCount : 1;
      roomRent = Number((expense as any).roomRentAmount || 0) / occCount;
    }
  }

  // 2. Food / Mess
  const foodMess = datedSum("food") > 0 ? datedSum("food") : Number(charge?.food || 0);

  // 3. Gas Share
  let gasShare =
    datedSum("gasShare", "gas") > 0
      ? datedSum("gasShare", "gas")
      : Number(charge?.gasShare || 0);
  if (gasShare === 0 && employee?.roomId) {
    const expense = roomExpenses.find((e) => e.roomId === employee.roomId);
    if (expense) {
      const occCount = expense.occupantCount > 0 ? expense.occupantCount : 1;
      gasShare = Number(expense.gasAmount || 0) / occCount;
    }
  }

  // 4. Provisions / Ration
  let rationShare =
    datedSum("rationShare", "ration") > 0
      ? datedSum("rationShare", "ration")
      : Number(charge?.rationShare || 0);
  let provisionShare =
    datedSum("provisionShare", "provision") > 0
      ? datedSum("provisionShare", "provision")
      : Number(charge?.provisionShare || 0);
  if (rationShare === 0 && employee?.roomId) {
    const expense = roomExpenses.find((e) => e.roomId === employee.roomId);
    if (expense) {
      const occCount = expense.occupantCount > 0 ? expense.occupantCount : 1;
      rationShare = Number(expense.rationAmount || 0) / occCount;
    }
  }
  if (provisionShare === 0 && employee?.roomId) {
    const expense = roomExpenses.find((e) => e.roomId === employee.roomId);
    if (expense) {
      const occCount = expense.occupantCount > 0 ? expense.occupantCount : 1;
      provisionShare = Number(expense.provisionAmount || 0) / occCount;
    }
  }
  const provisionsRation = rationShare + provisionShare;

  // 5. Bus / Transport
  let busTransport =
    datedSum("bus", "transportRent") > 0
      ? datedSum("bus", "transportRent")
      : Number(charge?.bus || 0);
  if (busTransport === 0 && employee?.roomId) {
    const expense = roomExpenses.find((e) => e.roomId === employee.roomId);
    if (expense) {
      const occCount = expense.occupantCount > 0 ? expense.occupantCount : 1;
      busTransport = Number((expense as any).transportRentAmount || 0) / occCount;
    }
  }

  // 6. Ticket (Bus/Train travel ticket)
  const ticket = datedSum("ticket") > 0 ? datedSum("ticket") : Number(charge?.ticket || 0);

  // 7. Salary advance (internal Joy staff advance)
  const salaryAdvance = datedSum("advance") > 0 ? datedSum("advance") : Number(charge?.advance || 0);

  // 8. Other internal recoveries (Medical, ID card, Shoe, Aadhaar, Bank A/c, T-Shirt, Old Pending, etc.)
  const medical = datedSum("medical") > 0 ? datedSum("medical") : Number(charge?.medical || 0);
  const idCard = datedSum("idCard") > 0 ? datedSum("idCard") : Number(charge?.idCard || 0);
  const shoe = datedSum("shoe") > 0 ? datedSum("shoe") : Number(charge?.shoe || 0);
  const aadhaar = datedSum("aadhaarUpdate") > 0 ? datedSum("aadhaarUpdate") : Number(charge?.aadhaarUpdate || 0);
  const bankAcc = datedSum("bankAccountCharge") > 0 ? datedSum("bankAccountCharge") : Number(charge?.bankAccountCharge || 0);
  const tshirt = datedSum("tshirt") > 0 ? datedSum("tshirt") : Number(charge?.tshirt || 0);
  const oldPending = datedSum("oldPending") > 0 ? datedSum("oldPending") : Number(charge?.oldPending || 0);
  const otherDated = datedSum("other") > 0 ? datedSum("other") : 0;
  let otherRecoveries = medical + idCard + shoe + aadhaar + bankAcc + tshirt + oldPending + otherDated;

  // Reconcile with recorded item.accommodationDeduction
  const sumItemized = roomRent + foodMess + gasShare + provisionsRation + busTransport + ticket + salaryAdvance + otherRecoveries;
  if (appliedAccommodationDeduction > 0 && Math.abs(appliedAccommodationDeduction - sumItemized) >= 0.01) {
    otherRecoveries += (appliedAccommodationDeduction - sumItemized);
  }
  const totalInternalDeductions = appliedAccommodationDeduction > 0 ? appliedAccommodationDeduction : sumItemized;

  return {
    roomRent: Math.round(roomRent * 100) / 100,
    foodMess: Math.round(foodMess * 100) / 100,
    gasShare: Math.round(gasShare * 100) / 100,
    provisionsRation: Math.round(provisionsRation * 100) / 100,
    busTransport: Math.round(busTransport * 100) / 100,
    ticket: Math.round(ticket * 100) / 100,
    salaryAdvance: Math.round(salaryAdvance * 100) / 100,
    otherRecoveries: Math.round(otherRecoveries * 100) / 100,
    totalInternalDeductions: Math.round(totalInternalDeductions * 100) / 100,
  };
}

export function ReportsCenter({
  data,
  run,
  items,
  vendorId,
  unitId,
}: {
  data: AppData;
  run: PayrollRun | null;
  items: PayrollItem[];
  vendorId: string;
  unitId: string;
}) {
  const [report, setReport] = useState("payroll");
  const [scope, setScope] = useState<"overall" | "selected">("overall");
  const [unitFilter, setUnitFilter] = useState<string>("");
  const [reportPage, setReportPage] = useState(1);
  useEffect(() => {
    setReportPage(1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const mainCol = document.querySelector(".main-column, .content, main");
      if (mainCol) {
        mainCol.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [report, scope, unitFilter]);

  const effectiveUnitId = unitFilter || (scope === "selected" ? unitId : "");

  const reports = useMemo<
    Record<string, { label: string; rows: ReportRow[] }>
  >(() => {
    const employees = data.employees.filter(
      (employee) =>
        (!vendorId || employee.vendorId === vendorId) &&
        (!effectiveUnitId || employee.clientUnitId === effectiveUnitId),
    );
    const employeeIds = new Set(employees.map((employee) => employee.id));
    const attendance = data.attendance.filter((entry) =>
      employeeIds.has(entry.employeeId),
    );
    const roomExpenses = data.roomExpenses
      .filter((expense) => !run || expense.payPeriod === run.payPeriod)
      .filter((expense) => {
        if (!effectiveUnitId) return true;
        const rm = data.accommodationRooms.find((room) => room.id === expense.roomId);
        const rNum = rm?.roomNumber ?? expense.roomId;
        return data.employees.some(
          (e) =>
            e.status === "active" &&
            (!vendorId || e.vendorId === vendorId) &&
            e.clientUnitId === effectiveUnitId &&
            (e.roomId
              ? e.roomId === expense.roomId
              : (rNum && e.roomNumber === rNum && (!rm?.vendorId || e.vendorId === rm.vendorId))),
        );
      });
    return {
      payroll: {
        label: "Payroll register",
        rows: [
          [
            "Employee ID",
            "Employee Name",
            "Department",
            "Payable Days",
            "OT Hours",
            "Company Gross",
            "Company PF",
            "Company ESI",
            "Company Canteen",
            "Other Company Deductions",
            "Total Company Deductions",
            "Payslip Net Salary",
            "Room Rent",
            "Food / Mess",
            "Gas Share",
            "Provisions / Ration",
            "Bus / Transport",
            "Ticket",
            "Salary Advance",
            "Other Recoveries",
            "Total Internal Deductions",
            "Final Net Payable",
            "Payment Mode",
            "Bank Account",
            "IFSC",
            "Bank Name",
            "Status",
          ],
          ...items.map((item) => {
            const employee = data.employees.find((e) => e.id === item.employeeId || e.employeeCode === item.employeeCode);
            const companyGross = Number(item.importedGrossEarnings || item.grossEarnings || 0);
            const pf = Number(item.pfDeduction || 0);
            const esi = Number(item.esiDeduction || 0);
            const canteen = Number(item.canteen || 0);
            const otherCompanyDeductions = Number(item.snacks || 0) +
              Number(item.professionalTax || 0) +
              Number(item.lwf || 0) +
              Number(item.tent || 0) +
              Number(item.advance || 0) +
              Number(item.otherDeduction || 0) +
              Number(item.tds || 0) +
              Number(item.medicalInsurance || 0);
            const totalCompanyDeductions = Number(item.importedTotalDeductions || 0) > 0
              ? Number(item.importedTotalDeductions)
              : (pf + esi + canteen + otherCompanyDeductions);
            const payslipNet = Number(item.importedNetPayable || 0) > 0
              ? Number(item.importedNetPayable)
              : Math.max(0, companyGross - totalCompanyDeductions);

            const charge = data.accommodationCharges.find(
              (c) => c.employeeId === (employee?.id ?? item.employeeId) && (!run || c.runId === run.id),
            );
            const runEntries = data.recoveryEntries.filter(
              (e) => (!run || e.runId === run.id || (run?.payPeriod && e.recoveryDate?.startsWith(run.payPeriod))),
            );
            const internal = resolveItemizedInternalDeductions(
              employee?.id ?? item.employeeId,
              employee,
              charge,
              runEntries,
              roomExpenses,
              Number(item.accommodationDeduction || 0),
            );

            const finalNetPayable = Number(item.netPayable) || Math.max(0, payslipNet - internal.totalInternalDeductions);

            return [
              item.employeeCode,
              item.employeeName,
              item.department,
              item.payableDays,
              item.overtimeHours,
              companyGross.toFixed(2),
              pf.toFixed(2),
              esi.toFixed(2),
              canteen.toFixed(2),
              otherCompanyDeductions.toFixed(2),
              totalCompanyDeductions.toFixed(2),
              payslipNet.toFixed(2),
              internal.roomRent.toFixed(2),
              internal.foodMess.toFixed(2),
              internal.gasShare.toFixed(2),
              internal.provisionsRation.toFixed(2),
              internal.busTransport.toFixed(2),
              internal.ticket.toFixed(2),
              internal.salaryAdvance.toFixed(2),
              internal.otherRecoveries.toFixed(2),
              internal.totalInternalDeductions.toFixed(2),
              finalNetPayable.toFixed(2),
              employee?.paymentMode || "Bank",
              employee?.bankAccountMasked || "",
              employee?.ifscMasked || "",
              employee?.bankName || "",
              item.validationStatus,
            ];
          }),
        ],
      },
      // JOY_EMPLOYEE_MASTER_FULL_REPORT_V1: Excel/CSV/print use every employee-master input field.
      employees: {
        label: "Employee master",
        rows: [
          [
            "Group of Company", "Client Name", "Employer Unit", "Client Location",
            "Employee ID", "Employee Name", "Department", "Employment Type",
            "Date of Joining", "Date of Leaving", "Mobile Number", "Email ID", "Emergency Contact Number",
            "Father Name", "Spouse Name", "Marital Status", "Highest Qualification", "Blood Group", "Gender",
            "Address", "District", "State", "Pincode",
            "UAN / EPF", "ESI Number", "Bank Account", "IFSC", "Bank Name",
            "Accommodation Type", "Room Number", "Room Rent Amount",
            "PF Applicable", "PF Wage Amount", "ESI Applicable", "ESI Wage Amount",
            "PT Applicable", "LWF Applicable", "Payment Mode", "Salary Amount", "Salary Basis",
            "Default Shift", "Shift Pattern", "Applicable Shifts", "Remarks",
            "Compliance Status", "Processing Stage", "Finalized By", "Finalized At", "Status"
          ],
          ...employees.map((employee) => {
            const vendor = data.vendors.find((row) => row.id === employee.vendorId);
            const unit = data.units.find((row) => row.id === employee.clientUnitId);
            return [
              vendor?.legalName ?? vendor?.name ?? "",
              unit?.clientName ?? "", unit?.unitName ?? "", unit?.location ?? "",
              employee.employeeCode, employee.name, employee.department, employee.employmentType,
              formatDisplayDate(employee.dateOfJoining), formatDisplayDate(employee.dateOfLeaving) ?? "", employee.mobileNumber ?? "", employee.emailAddress ?? "", employee.emergencyContactNumber ?? "",
              employee.fatherName ?? "", employee.spouseName ?? "", employee.maritalStatus ?? "", employee.highestQualification ?? "", employee.bloodGroup ?? "", employee.gender ?? "",
              employee.addressLine ?? "", employee.district ?? "", employee.stateName ?? "", employee.pincode ?? "",
              employee.uanMasked ?? "", employee.esiMasked ?? "", employee.bankAccountMasked ?? "", employee.ifscMasked ?? "", employee.bankName ?? "",
              employee.accommodationType, employee.roomNumber ?? "", employee.roomRentAmount,
              employee.pfApplicable ? "Yes" : "No", employee.pfWageAmount, employee.esiApplicable ? "Yes" : "No", employee.esiWageAmount,
              employee.ptApplicable ? "Yes" : "No", employee.lwfApplicable ? "Yes" : "No", employee.paymentMode, employee.salaryAmount, employee.salaryBasis,
              employee.defaultShift, employee.shiftPattern, employee.applicableShiftsJson, employee.remarks ?? "",
              employee.complianceStatus, employee.processingStage, employee.finalizedBy ?? "", employee.finalizedAt ?? "", employee.status
            ];
          }),
        ],
      },
      attendance: {
        label: "Attendance register",
        rows: [
          [
            "Employee ID",
            "Date",
            "Status",
            "Shift",
            "Punch in",
            "Punch out",
            "OT hours",
          ],
          ...attendance.map((entry) => [
            employees.find((employee) => employee.id === entry.employeeId)
              ?.employeeCode ?? entry.employeeId,
            entry.attendanceDate,
            entry.statusCode,
            entry.shiftCode,
            entry.punchIn ?? "",
            entry.punchOut ?? "",
            entry.overtimeHours,
          ]),
        ],
      },
      overtime: {
        label: "Client OT hours and payment report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "OT hours",
            "OT multiplier",
            "Paid OT hours",
            "OT wages",
          ],
          ...items.map((item) => {
            const employee = employees.find(
              (row) => row.id === item.employeeId,
            );
            const unit = data.units.find(
              (row) => row.id === employee?.clientUnitId,
            );
            const multiplier = unit?.overtimeMultiplier ?? 1;
            return [
              item.employeeCode,
              item.employeeName,
              item.overtimeHours,
              multiplier,
              item.overtimeHours * multiplier,
              item.overtimeWages,
            ];
          }),
        ],
      },
      salaryComponents: {
        label: "Complete earnings and deductions report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Basic",
            "DA",
            "HRA",
            "Conveyance",
            "Food allowance",
            "Night allowance",
            "OT wages",
            "Bonus",
            "Arrears",
            "PF",
            "ESI",
            "PT",
            "LWF",
            "Canteen",
            "Advance",
            "Other",
            "Total Company Deductions",
            "Payslip Net Salary",
            "Room Rent",
            "Food / Mess",
            "Gas Share",
            "Provisions / Ration",
            "Bus / Transport",
            "Ticket",
            "Salary Advance",
            "Other Recoveries",
            "Total Internal Deductions",
            "Gross",
            "Final Net Payable",
          ],
          ...items.map((item) => {
            const employee = data.employees.find((e) => e.id === item.employeeId || e.employeeCode === item.employeeCode);
            const companyGross = Number(item.importedGrossEarnings || item.grossEarnings || 0);
            const totalCompanyDeductions = Number(item.importedTotalDeductions || 0) > 0
              ? Number(item.importedTotalDeductions)
              : (Number(item.pfDeduction || 0) + Number(item.esiDeduction || 0) + Number(item.professionalTax || 0) + Number(item.lwf || 0) + Number(item.canteen || 0) + Number(item.snacks || 0) + Number(item.advance || 0) + Number(item.otherDeduction || 0));
            const payslipNet = Number(item.importedNetPayable || 0) > 0
              ? Number(item.importedNetPayable)
              : Math.max(0, companyGross - totalCompanyDeductions);

            const charge = data.accommodationCharges.find(
              (c) => c.employeeId === (employee?.id ?? item.employeeId) && (!run || c.runId === run.id),
            );
            const runEntries = data.recoveryEntries.filter(
              (e) => (!run || e.runId === run.id || (run?.payPeriod && e.recoveryDate?.startsWith(run.payPeriod))),
            );
            const internal = resolveItemizedInternalDeductions(
              employee?.id ?? item.employeeId,
              employee,
              charge,
              runEntries,
              roomExpenses,
              Number(item.accommodationDeduction || 0),
            );

            const finalNetPayable = Number(item.netPayable) || Math.max(0, payslipNet - internal.totalInternalDeductions);

            return [
              item.employeeCode,
              item.employeeName,
              item.basic,
              item.da,
              item.hra,
              item.conveyance,
              item.foodAllowance,
              item.nightAllowance,
              item.overtimeWages,
              item.attendanceBonus,
              item.arrears,
              item.pfDeduction,
              item.esiDeduction,
              item.professionalTax,
              item.lwf,
              item.canteen,
              item.advance,
              item.otherDeduction,
              totalCompanyDeductions.toFixed(2),
              payslipNet.toFixed(2),
              internal.roomRent.toFixed(2),
              internal.foodMess.toFixed(2),
              internal.gasShare.toFixed(2),
              internal.provisionsRation.toFixed(2),
              internal.busTransport.toFixed(2),
              internal.ticket.toFixed(2),
              internal.salaryAdvance.toFixed(2),
              internal.otherRecoveries.toFixed(2),
              internal.totalInternalDeductions.toFixed(2),
              companyGross.toFixed(2),
              finalNetPayable.toFixed(2),
            ];
          }),
        ],
      },
      joiningLeaving: {
        label: "Joining and left employee report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Client",
            "Employer unit",
            "Joining date",
            "Left date",
            "Status",
          ],
          ...employees.map((employee) => {
            const unit = data.units.find(
              (row) => row.id === employee.clientUnitId,
            );
            return [
              employee.employeeCode,
              employee.name,
              unit?.clientName ?? "",
              unit?.unitName ?? "",
              formatDisplayDate(employee.dateOfJoining),
              formatDisplayDate(employee.dateOfLeaving) ?? "",
              employee.status,
            ];
          }),
        ],
      },
      leftEmployees: {
        label: "Left employees register & work history (month-wise breakdown)",
        rows: [
          [
            "Group Company",
            "Client Name",
            "Employer Unit",
            "Employee ID",
            "Employee Name",
            "Department",
            "Date of Joining",
            "Date of Leaving",
            "Total Worked Days",
            "Month-wise Worked Days Breakdown",
            "Status / Reason",
          ],
          ...employees
            .filter((employee) => employee.status === "left" || Boolean(employee.dateOfLeaving))
            .map((employee) => {
              const vendor = data.vendors.find((row) => row.id === employee.vendorId);
              const unit = data.units.find((row) => row.id === employee.clientUnitId);
              const employeeItems = data.payrollItems.filter((i) => i.employeeId === employee.id);
              const employeeAttendance = data.attendance.filter((a) => a.employeeId === employee.id && ["P", "HP", "HD"].includes(a.statusCode));

              const monthMap = new Map<string, number>();
              for (const a of employeeAttendance) {
                const ym = a.attendanceDate.slice(0, 7);
                monthMap.set(ym, (monthMap.get(ym) || 0) + (a.statusCode === "HD" ? 0.5 : 1));
              }
              for (const pi of employeeItems) {
                const pRun = data.runs.find((r) => r.id === pi.runId);
                if (pRun?.payPeriod && !monthMap.has(pRun.payPeriod) && pi.payableDays > 0) {
                  monthMap.set(pRun.payPeriod, pi.payableDays);
                }
              }

              const totalDays = Array.from(monthMap.values()).reduce((a, b) => a + b, 0);
              const breakdownStr = Array.from(monthMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([m, days]) => `${m}: ${days}d`)
                .join(" | ");

              return [
                vendor?.legalName ?? vendor?.name ?? "",
                unit?.clientName ?? "",
                unit?.unitName ?? "",
                employee.employeeCode,
                employee.name,
                employee.department,
                formatDisplayDate(employee.dateOfJoining),
                formatDisplayDate(employee.dateOfLeaving) ?? "Left",
                totalDays || 0,
                breakdownStr || "No attendance record",
                employee.remarks ?? "Resigned / Left",
              ];
            }),
        ],
      },
      accommodationAllocation: {
        label: "Accommodation and room allocation report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Accommodation type",
            "Hostel",
            "Room",
            "Client",
            "Employer unit",
          ],
          ...employees.map((employee) => {
            const room = data.accommodationRooms.find(
              (row) => row.id === employee.roomId,
            );
            const hostel = data.hostels.find(
              (row) => row.id === room?.hostelId,
            );
            const unit = data.units.find(
              (row) => row.id === employee.clientUnitId,
            );
            return [
              employee.employeeCode,
              employee.name,
              employee.accommodationType,
              hostel?.name ?? "Outside room",
              employee.roomNumber ?? "",
              unit?.clientName ?? "",
              unit?.unitName ?? "",
            ];
          }),
        ],
      },
      bankPending: {
        label: "Bank account pending report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Joining date",
            "Client",
            "Employer unit",
            "Status",
          ],
          ...employees
            .filter(
              (employee) => !employee.bankAccountMasked || !employee.ifscMasked,
            )
            .map((employee) => {
              const unit = data.units.find(
                (row) => row.id === employee.clientUnitId,
              );
              return [
                employee.employeeCode,
                employee.name,
                formatDisplayDate(employee.dateOfJoining),
                unit?.clientName ?? "",
                unit?.unitName ?? "",
                "Pending",
              ];
            }),
        ],
      },
      epfPending: {
        label: "EPF / UAN pending report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Joining date",
            "Client",
            "Employer unit",
            "Status",
          ],
          ...employees
            .filter((employee) => !employee.uanMasked)
            .map((employee) => {
              const unit = data.units.find(
                (row) => row.id === employee.clientUnitId,
              );
              return [
                employee.employeeCode,
                employee.name,
                formatDisplayDate(employee.dateOfJoining),
                unit?.clientName ?? "",
                unit?.unitName ?? "",
                "Pending",
              ];
            }),
        ],
      },
      esiPending: {
        label: "ESI pending report",
        rows: [
          [
            "Employee ID",
            "Employee",
            "Joining date",
            "Client",
            "Employer unit",
            "Status",
          ],
          ...employees
            .filter((employee) => !employee.esiMasked)
            .map((employee) => {
              const unit = data.units.find(
                (row) => row.id === employee.clientUnitId,
              );
              return [
                employee.employeeCode,
                employee.name,
                formatDisplayDate(employee.dateOfJoining),
                unit?.clientName ?? "",
                unit?.unitName ?? "",
                "Pending",
              ];
            }),
        ],
      },
      compliance: {
        label: "Compliance pending",
        rows: [
          ["Employee ID", "Employee", "Bank", "EPF/UAN", "ESI"],
          ...employees.map((employee) => [
            employee.employeeCode,
            employee.name,
            employee.bankAccountMasked && employee.ifscMasked
              ? "Ready"
              : "Pending",
            employee.uanMasked ? "Ready" : "Pending",
            employee.esiMasked ? "Ready" : "Pending",
          ]),
        ],
      },
      recoveries: {
        label: "Room recovery register",
        rows: (() => {
          const header: ReportRow = [
            "Month",
            "Client / Unit",
            "Employee ID",
            "Occupant Name",
            "Room",
            "Room Rent",
            "Gas",
            "Ration",
            "Provision",
            "Transport",
            "Advance",
            "Medical",
            "Ticket",
            "ID Card",
            "Shoe",
            "Aadhaar",
            "Bank A/c",
            "T-Shirt",
            "Old Pending",
            "Total Deductions",
            "Status",
          ];

          const processedEmployeeIds = new Set<string>();
          const defaultPeriod =
            run?.payPeriod ?? (roomExpenses[0]?.payPeriod || new Date().toISOString().slice(0, 7));
          const rows: ReportRow[] = [];

          for (const expense of roomExpenses) {
            const rm = data.accommodationRooms.find((room) => room.id === expense.roomId);
            const rNum = rm?.roomNumber ?? expense.roomId;
            const autoOcc = data.employees.filter(
              (e) =>
                e.status === "active" &&
                (!vendorId || e.vendorId === vendorId) &&
                (!effectiveUnitId || e.clientUnitId === effectiveUnitId) &&
                (e.roomId
                  ? e.roomId === expense.roomId
                  : (rNum && e.roomNumber === rNum && (!rm?.vendorId || e.vendorId === rm.vendorId))),
            );

            const effOcc = autoOcc.length > 0 ? autoOcc.length : (expense.occupantCount > 0 ? expense.occupantCount : 1);
            const roomRentPerHead = ((expense as any).roomRentAmount ?? 0) / effOcc;
            const gasPerHead = (expense.gasAmount ?? 0) / effOcc;
            const rationPerHead = (expense.rationAmount ?? 0) / effOcc;
            const provisionPerHead = (expense.provisionAmount ?? 0) / effOcc;
            const transportPerHead = ((expense as any).transportRentAmount ?? 0) / effOcc;

            if (autoOcc.length === 0) {
              const totRoom =
                ((expense as any).roomRentAmount ?? 0) +
                expense.gasAmount +
                expense.rationAmount +
                expense.provisionAmount +
                ((expense as any).transportRentAmount ?? 0);

              rows.push([
                expense.payPeriod,
                "—",
                "—",
                "— (No active occupants)",
                rNum,
                (((expense as any).roomRentAmount ?? 0) as number).toFixed(2),
                expense.gasAmount.toFixed(2),
                expense.rationAmount.toFixed(2),
                expense.provisionAmount.toFixed(2),
                (((expense as any).transportRentAmount ?? 0) as number).toFixed(2),
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                "0.00",
                totRoom.toFixed(2),
                expense.status,
              ]);
            } else {
              for (const emp of autoOcc) {
                processedEmployeeIds.add(emp.id);

                const u = data.units.find((unit) => unit.id === emp.clientUnitId);
                const unitName = u ? `${u.clientName} · ${u.unitName}` : "—";

                const charge = data.accommodationCharges.find(
                  (c) => c.employeeId === emp.id && (!run || c.runId === run.id),
                );

                const empDated = data.recoveryEntries.filter(
                  (entry) =>
                    entry.employeeId === emp.id &&
                    (!run || entry.runId === run.id || entry.recoveryDate?.startsWith(expense.payPeriod)),
                );

                const datedSum = (type: string) =>
                  empDated
                    .filter((entry) => entry.recoveryType === type)
                    .reduce((sum, entry) => sum + entry.amount, 0);

                const indRent = datedSum("rent");
                const indBus = datedSum("bus");
                const indFood = datedSum("food");

                const advance = datedSum("advance") > 0 ? datedSum("advance") : (charge?.advance ?? 0);
                const medical = datedSum("medical") > 0 ? datedSum("medical") : (charge?.medical ?? 0);
                const ticket = datedSum("ticket") > 0 ? datedSum("ticket") : (charge?.ticket ?? 0);
                const idCard = datedSum("idCard") > 0 ? datedSum("idCard") : (charge?.idCard ?? 0);
                const shoe = datedSum("shoe") > 0 ? datedSum("shoe") : (charge?.shoe ?? 0);
                const aadhaar = datedSum("aadhaarUpdate") > 0 ? datedSum("aadhaarUpdate") : (charge?.aadhaarUpdate ?? 0);
                const bank = datedSum("bankAccountCharge") > 0 ? datedSum("bankAccountCharge") : (charge?.bankAccountCharge ?? 0);
                const tshirt = datedSum("tshirt") > 0 ? datedSum("tshirt") : (charge?.tshirt ?? 0);
                const oldPending = datedSum("oldPending") > 0 ? datedSum("oldPending") : (charge?.oldPending ?? 0);

                const effectiveGas =
                  expense.status === "finalized" && (charge?.gasShare ?? 0) > 0
                    ? (charge?.gasShare ?? 0)
                    : gasPerHead;
                const effectiveRation =
                  expense.status === "finalized" && (charge?.rationShare ?? 0) > 0
                    ? (charge?.rationShare ?? 0)
                    : rationPerHead;
                const effectiveProvision =
                  expense.status === "finalized" && (charge?.provisionShare ?? 0) > 0
                    ? (charge?.provisionShare ?? 0)
                    : provisionPerHead;
                const effectiveRent = roomRentPerHead + indRent;
                const effectiveTransport = transportPerHead + indBus;
                const effectiveFoodInd = indFood;

                const total =
                  effectiveRent +
                  effectiveGas +
                  effectiveRation +
                  effectiveProvision +
                  effectiveTransport +
                  effectiveFoodInd +
                  advance +
                  medical +
                  ticket +
                  idCard +
                  shoe +
                  aadhaar +
                  bank +
                  tshirt +
                  oldPending;

                rows.push([
                  expense.payPeriod,
                  unitName,
                  emp.employeeCode,
                  emp.name,
                  rNum,
                  effectiveRent.toFixed(2),
                  effectiveGas.toFixed(2),
                  effectiveRation.toFixed(2),
                  (effectiveProvision + effectiveFoodInd).toFixed(2),
                  effectiveTransport.toFixed(2),
                  advance.toFixed(2),
                  medical.toFixed(2),
                  ticket.toFixed(2),
                  idCard.toFixed(2),
                  shoe.toFixed(2),
                  aadhaar.toFixed(2),
                  bank.toFixed(2),
                  tshirt.toFixed(2),
                  oldPending.toFixed(2),
                  total.toFixed(2),
                  expense.status,
                ]);
              }
            }
          }

          // Also include employees with non-zero deductions or assigned rooms who were not in roomExpenses
          const extraEmployees = employees.filter((emp) => !processedEmployeeIds.has(emp.id));
          for (const emp of extraEmployees) {
            const charge = data.accommodationCharges.find(
              (c) => c.employeeId === emp.id && (!run || c.runId === run.id),
            );
            const empDated = data.recoveryEntries.filter(
              (entry) =>
                entry.employeeId === emp.id &&
                (!run || entry.runId === run.id || entry.recoveryDate?.startsWith(defaultPeriod)),
            );
            const datedSum = (type: string) =>
              empDated
                .filter((entry) => entry.recoveryType === type)
                .reduce((sum, entry) => sum + entry.amount, 0);

            const advance = datedSum("advance") > 0 ? datedSum("advance") : (charge?.advance ?? 0);
            const medical = datedSum("medical") > 0 ? datedSum("medical") : (charge?.medical ?? 0);
            const ticket = datedSum("ticket") > 0 ? datedSum("ticket") : (charge?.ticket ?? 0);
            const idCard = datedSum("idCard") > 0 ? datedSum("idCard") : (charge?.idCard ?? 0);
            const shoe = datedSum("shoe") > 0 ? datedSum("shoe") : (charge?.shoe ?? 0);
            const aadhaar = datedSum("aadhaarUpdate") > 0 ? datedSum("aadhaarUpdate") : (charge?.aadhaarUpdate ?? 0);
            const bank = datedSum("bankAccountCharge") > 0 ? datedSum("bankAccountCharge") : (charge?.bankAccountCharge ?? 0);
            const tshirt = datedSum("tshirt") > 0 ? datedSum("tshirt") : (charge?.tshirt ?? 0);
            const oldPending = datedSum("oldPending") > 0 ? datedSum("oldPending") : (charge?.oldPending ?? 0);
            const rent = datedSum("rent") > 0 ? datedSum("rent") : (charge?.rent ?? 0);
            const bus = datedSum("bus") > 0 ? datedSum("bus") : (charge?.bus ?? 0);
            const food = datedSum("food") > 0 ? datedSum("food") : (charge?.food ?? 0);

            const total =
              advance +
              medical +
              ticket +
              idCard +
              shoe +
              aadhaar +
              bank +
              tshirt +
              oldPending +
              rent +
              bus +
              food;

            if (total > 0 || emp.roomId || emp.roomNumber) {
              const u = data.units.find((unit) => unit.id === emp.clientUnitId);
              const unitName = u ? `${u.clientName} · ${u.unitName}` : "—";
              const r = data.accommodationRooms.find((room) => room.id === emp.roomId);
              const rNum = r?.roomNumber ?? emp.roomNumber ?? "—";

              rows.push([
                defaultPeriod,
                unitName,
                emp.employeeCode,
                emp.name,
                rNum,
                rent.toFixed(2),
                "0.00",
                "0.00",
                food.toFixed(2),
                bus.toFixed(2),
                advance.toFixed(2),
                medical.toFixed(2),
                ticket.toFixed(2),
                idCard.toFixed(2),
                shoe.toFixed(2),
                aadhaar.toFixed(2),
                bank.toFixed(2),
                tshirt.toFixed(2),
                oldPending.toFixed(2),
                total.toFixed(2),
                "draft",
              ]);
            }
          }

          return [header, ...rows];
        })(),
      },
      datedRecoveries: {
        label: "Date-wise employee recovery report",
        rows: [
          [
            "Date",
            "Employee ID",
            "Employee",
            "Recovery type",
            "Amount",
            "Reference",
            "Remarks",
            "Entered by",
          ],
          ...data.recoveryEntries
            .filter((entry) => !run || entry.runId === run.id)
            .map((entry) => {
              const employee = employees.find(
                (row) => row.id === entry.employeeId,
              );
              return [
                formatDisplayDate(entry.recoveryDate),
                employee?.employeeCode ?? entry.employeeId,
                employee?.name ?? "",
                recoveryLabels[entry.recoveryType] ?? entry.recoveryType,
                entry.amount,
                entry.reference ?? "",
                entry.notes ?? "",
                entry.createdBy ?? "",
              ];
            }),
        ],
      },
      hostel: {
        label: "Hostel activity & expense report",
        rows: [
          [
            "Hostel",
            "Date",
            "Activity",
            "Reading / Quantity",
            "Amount",
            "Status",
          ],
          ...data.hostelUtilityReadings.map((entry) => [
            data.hostels.find((hostel) => hostel.id === entry.hostelId)?.name ??
            entry.hostelId,
            formatDisplayDate(entry.readingDate),
            entry.activityName ?? entry.utilityType,
            entry.readingValue || entry.tankerQuantity,
            entry.amount,
            entry.status,
          ]),
        ],
      },
      vehicles: {
        label: "Vehicle movement & expense report",
        rows: [
          [
            "Vehicle",
            "Date",
            "Type",
            "From",
            "To",
            "Start KM",
            "End KM",
            "Litres",
            "Amount",
            "Next due",
          ],
          ...data.vehicleRecords.map((entry) => [
            data.vehicles.find((vehicle) => vehicle.id === entry.vehicleId)
              ?.registrationNumber ?? entry.vehicleId,
            formatDisplayDate(entry.recordDate),
            entry.recordType,
            entry.tripFrom ?? "",
            entry.tripTo ?? "",
            entry.startKm ?? "",
            entry.endKm ?? "",
            entry.litres,
            entry.amount,
            formatDisplayDate(entry.nextDueDate) ?? "",
          ]),
        ],
      },
    };
  }, [data, items, run, scope, unitId, vendorId, effectiveUnitId]);
  const selected = reports[report];
  const name = `${report}-report-${run?.payPeriod ?? new Date().toISOString().slice(0, 10)}`;
  const reportDataRows = selected.rows.slice(1);
  const paginatedReportRows = reportDataRows.slice((reportPage - 1) * 20, reportPage * 20);
  return (
    <div className="section-stack">
      <section className="panel report-command">
        <div>
          <span className="eyebrow">Download centre</span>
          <h2>Overall & selected-unit reports</h2>
          <p>
            Choose an overall company report or limit it to the currently
            selected group company and client unit.
          </p>
        </div>
        <label>
          <span>Report scope</span>
          <select
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as "overall" | "selected")
            }
          >
            <option value="overall">
              Overall — all group companies and clients
            </option>
            <option value="selected">
              Current selected company / client unit
            </option>
          </select>
        </label>
        <label>
          <span>Client unit</span>
          <select
            value={unitFilter}
            onChange={(event) => {
              setUnitFilter(event.target.value);
              setReportPage(1);
            }}
          >
            <option value="">All client units</option>
            {data.units
              .filter(
                (u) =>
                  (!vendorId || u.vendorId === vendorId) &&
                  u.status === "active",
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.clientName} · {u.unitName}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>Report type</span>
          <select
            value={report}
            onChange={(event) => setReport(event.target.value)}
          >
            {Object.entries(reports).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <div className="record-actions">
          <button
            className="secondary-button"
            onClick={() => exportExcel(name, selected.rows)}
          >
            Excel
          </button>
          <button
            className="secondary-button"
            onClick={() => exportCsv(name, selected.rows)}
          >
            CSV
          </button>
          <button className="primary-button" onClick={() => printTarget()}>
            Print / PDF
          </button>
        </div>
      </section>
      <section className="panel table-panel report-print-area">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              {scope === "overall" ? "Overall report" : "Selected unit report"}
            </span>
            <h2>{selected.label}</h2>
          </div>
          <span className="muted-label">
            {Math.max(0, selected.rows.length - 1)} records
          </span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {selected.rows[0]?.map((cell, index) => (
                  <th key={index}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedReportRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={reportPage}
          totalItems={reportDataRows.length}
          pageSize={20}
          onPageChange={setReportPage}
        />
      </section>
    </div>
  );
}
