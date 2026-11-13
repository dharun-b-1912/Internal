"use client";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { ChevronRight, Flame, ShoppingBag, ShoppingCart, Edit2, Trash2 } from "lucide-react";
import { downloadXlsx } from "../lib/export-xlsx";
import type {
  AccommodationRoom,
  AccommodationType,
  ClientUnit,
  Employee,
  Hostel,
  HostelUtilityReading,
  RoomExpense,
} from "./payroll-app";
type Action = (
  action: string,
  message: string,
  details?: Record<string, unknown>,
) => Promise<boolean>;
type EntryType = "eb" | "water" | "payment" | "housekeeping" | "other";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
function csv(filename: string, rows: Array<Array<string | number>>) {
  const body = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function HostelMaster({
  vendorId,
  units,
  types,
  hostels,
  rooms,
  employees,
  readings,
  expenses,
  payPeriod,
  canManage,
  isSuperAdmin = false,
  canApprove,
  isActing,
  onAction,
}: {
  vendorId: string;
  units: ClientUnit[];
  types: AccommodationType[];
  hostels: Hostel[];
  rooms: AccommodationRoom[];
  employees: Employee[];
  readings: HostelUtilityReading[];
  expenses: RoomExpense[];
  payPeriod: string;
  canManage: boolean;
  isSuperAdmin?: boolean;
  canApprove: boolean;
  isActing: boolean;
  onAction: Action;
}) {
  const activeTypes = types.filter(
    (t) =>
      t.vendorId === vendorId &&
      t.status === "active" &&
      !t.name.toLowerCase().includes("local/local"),
  );
  const [typeId, setTypeId] = useState(activeTypes[0]?.id ?? "");
  const typeHostels = hostels.filter(
    (h) => h.vendorId === vendorId && h.accommodationTypeId === typeId,
  );
  const [hostelId, setHostelId] = useState("");
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const selected = typeHostels.find((h) => h.id === hostelId) ?? typeHostels[0];
  const selectedTypeName = activeTypes.find((t) => t.id === typeId)?.name ?? "";
  const isOutsideRoom = selectedTypeName.toLowerCase().includes("outside");
  const placeLabel = isOutsideRoom ? "Local area" : "Hostel";
  const [entryType, setEntryType] = useState<EntryType>("eb");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState<"hostel" | "overall">("hostel");
  const [report, setReport] = useState<"readings" | "expenses">("readings");
  const [editingExpense, setEditingExpense] = useState<RoomExpense | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editGasAmount, setEditGasAmount] = useState(0);
  const [editGasCylinders, setEditGasCylinders] = useState(0);
  const [editRationAmount, setEditRationAmount] = useState(0);
  const [editProvisionAmount, setEditProvisionAmount] = useState(0);
  const [editReference, setEditReference] = useState("");

  function startEditExpense(e: RoomExpense) {
    setEditingExpense(e);
    setEditDate(e.gasDate || e.rationDate || e.provisionDate || new Date().toISOString().slice(0, 10));
    setEditGasAmount(e.gasAmount || 0);
    setEditGasCylinders(e.gasCylinderCount || 0);
    setEditRationAmount(e.rationAmount || 0);
    setEditProvisionAmount(e.provisionAmount || 0);
    setEditReference(
      e.gasPaymentReference ||
      e.rationPaymentReference ||
      e.provisionPaymentReference ||
      ""
    );
  }

  async function handleSaveEditExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingExpense) return;
    const ok = await onAction(
      "save-room-expense",
      "Dated room recovery updated",
      {
        id: editingExpense.id,
        roomId: editingExpense.roomId,
        payPeriod: editingExpense.payPeriod,
        gasDate: editGasAmount > 0 ? editDate : null,
        gasAmount: editGasAmount,
        gasCylinderCount: editGasCylinders,
        gasPaymentReference: editReference,
        rationDate: editRationAmount > 0 ? editDate : null,
        rationAmount: editRationAmount,
        rationPaymentReference: editReference,
        provisionDate: editProvisionAmount > 0 ? editDate : null,
        provisionAmount: editProvisionAmount,
        provisionPaymentReference: editReference,
      },
    );
    if (ok) {
      setEditingExpense(null);
    }
  }

  async function handleDeleteExpense(e: RoomExpense, label: string) {
    const dateLabel = e.gasDate || e.rationDate || e.provisionDate || "undated";
    const amount = e.gasAmount || e.rationAmount || e.provisionAmount || 0;
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${label} recovery entry of ₹${amount.toLocaleString("en-IN")} on ${dateLabel}?`,
    );
    if (!confirmed) return;
    await onAction("delete-room-expense", "Dated room recovery entry deleted", {
      expenseId: e.id,
    });
  }

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
  }, [typeId, hostelId, entryType, report, scope]);
  const eligibleRooms = rooms.filter(
    (r) => r.vendorId === vendorId && r.accommodationTypeId === typeId,
  ),
    hostelRooms = eligibleRooms.filter((r) => r.hostelId === selected?.id),
    periodExpenses = expenses.filter(
      (e) =>
        e.payPeriod === payPeriod && hostelRooms.some((r) => r.id === e.roomId),
    );
  const totals = periodExpenses.reduce(
    (s, e) => ({
      gas: s.gas + e.gasAmount,
      ration: s.ration + e.rationAmount,
      provision: s.provision + e.provisionAmount,
    }),
    { gas: 0, ration: 0, provision: 0 },
  );
  const scoped = readings
    .filter((r) =>
      scope === "overall"
        ? hostels.some((h) => h.id === r.hostelId && h.vendorId === vendorId)
        : r.hostelId === selected?.id,
    )
    .sort((a, b) => b.readingDate.localeCompare(a.readingDate));
  const reportRows = scoped.filter((r) =>
    report === "readings"
      ? ["eb", "water"].includes(r.utilityType)
      : !["eb", "water"].includes(r.utilityType),
  );
  const mappedUnitIds: string[] = selected
    ? (() => {
      try {
        const parsed = JSON.parse(selected.clientScopeJson || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })()
    : [];
  async function createHostel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (
      await onAction("save-hostel", `${placeLabel} created`, {
        vendorId,
        accommodationTypeId: typeId,
        name: f.get("name"),
        address: f.get("address"),
        inchargeName: f.get("inchargeName"),
        ebMeterNumber: f.get("ebMeterNumber"),
        clientScope: f.getAll("clientScope"),
        remarks: f.get("remarks"),
      })
    )
      e.currentTarget.reset();
  }
  async function createRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    if (
      await onAction(
        "save-room",
        `Room created under ${placeLabel.toLowerCase()}`,
        {
          vendorId,
          accommodationTypeId: typeId,
          hostelId: selected.id,
          roomNumber: f.get("roomNumber"),
          capacity: f.get("capacity"),
          address: selected.address,
          remarks: f.get("remarks"),
        },
      )
    )
      e.currentTarget.reset();
  }
  async function updateHostel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    await onAction("save-hostel", `${placeLabel} updated`, {
      id: selected.id,
      vendorId,
      accommodationTypeId: typeId,
      name: f.get("name"),
      address: f.get("address"),
      inchargeName: f.get("inchargeName"),
      ebMeterNumber: f.get("ebMeterNumber"),
      clientScope: f.getAll("clientScope"),
      remarks: f.get("remarks"),
    });
  }
  async function saveEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget),
      activityName =
        entryType === "payment"
          ? f.get("paymentType")
          : entryType === "housekeeping"
            ? "Housekeeping / cleaning"
            : f.get("activityName");
    if (
      await onAction("save-hostel-utility", "Hostel update saved", {
        hostelId: selected.id,
        utilityType: entryType,
        readingDate: date,
        readingValue: f.get("readingValue") ?? 0,
        tankerQuantity: f.get("quantity") ?? 0,
        amount: f.get("amount") ?? 0,
        activityName,
        remarks: f.get("remarks"),
      })
    )
      e.currentTarget.reset();
  }
  function exportReport(format: "xlsx" | "csv" = "xlsx") {
    const rows = [
      [
        "Date",
        "Hostel",
        "Entry",
        "Activity",
        "Reading / quantity",
        "Consumption",
        "Paid amount",
        "Status",
      ],
      ...reportRows.map((r) => [
        r.readingDate,
        hostels.find((h) => h.id === r.hostelId)?.name ?? "",
        r.utilityType,
        r.activityName ?? "",
        r.utilityType === "eb"
          ? r.readingValue
          : r.utilityType === "water"
            ? `${r.tankerQuantity} L`
            : "",
        r.consumption,
        r.amount,
        r.status,
      ]),
    ];
    if (format === "xlsx") {
      downloadXlsx(`hostel-${scope}-${report}-${payPeriod}.xlsx`, rows, "Hostel Report");
    } else {
      csv(`hostel-${scope}-${report}-${payPeriod}.csv`, rows);
    }
  }
  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Step 1 · Accommodation type</span>
            <h2>Select the accommodation category first</h2>
          </div>
        </div>
        <div className="accommodation-type-grid">
          {activeTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`accommodation-card accommodation-filter-card ${typeId === t.id ? "accommodation-filter-selected" : ""}`}
              onClick={() => {
                setTypeId(t.id);
                setHostelId("");
              }}
            >
              <span className="accommodation-icon">{t.name[0]}</span>
              <div>
                <span>{t.name}</span>
                <strong>
                  {hostels.filter((h) => h.accommodationTypeId === t.id).length}{" "}
                  {t.name.toLowerCase().includes("outside")
                    ? "areas"
                    : "hostels"}
                </strong>
                <small>
                  {rooms.filter((r) => r.accommodationTypeId === t.id).length}{" "}
                  rooms
                </small>
              </div>
            </button>
          ))}
        </div>
      </section>
      {typeId ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Step 2 · {placeLabel} master</span>
              <h2>
                Stored {isOutsideRoom ? "local areas" : "hostels"} under{" "}
                {activeTypes.find((t) => t.id === typeId)?.name}
              </h2>
            </div>
            <label>
              <span>{placeLabel} dropdown *</span>
              <select
                value={selected?.id ?? ""}
                onChange={(e) => setHostelId(e.target.value)}
              >
                <option value="">
                  Choose stored {placeLabel.toLowerCase()}
                </option>
                {typeHostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {canManage ? (
            <form className="form-grid" onSubmit={createHostel}>
              <label>
                <span>New {placeLabel.toLowerCase()} name *</span>
                <input name="name" required />
              </label>
              <label>
                <span>Address / location</span>
                <input name="address" />
              </label>
              <label>
                <span>
                  {isOutsideRoom ? "Area contact / owner" : "Hostel in-charge"}
                </span>
                <input name="inchargeName" />
              </label>
              <label>
                <span>EB meter number</span>
                <input name="ebMeterNumber" />
              </label>
              <section className="form-span payslip-field-selector">
                <strong>
                  Map this {placeLabel.toLowerCase()} to client employer units *
                </strong>
                <div className="scope-checkbox-grid">
                  {units.map((unit) => (
                    <label key={unit.id}>
                      <input
                        type="checkbox"
                        name="clientScope"
                        value={unit.id}
                      />
                      <span>
                        {unit.clientName} · {unit.unitName}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <label className="form-span">
                <span>Remarks</span>
                <input name="remarks" />
              </label>
              <button className="primary-button form-span" disabled={isActing}>
                Create {placeLabel.toLowerCase()}
              </button>
            </form>
          ) : null}
          {selected ? (
            <div className="hostel-selected-record">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">View / edit selected {placeLabel.toLowerCase()}</span>
                  <h2>{selected.name}</h2>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    className="record-action record-delete"
                    disabled={isActing}
                    onClick={() => {
                      if (window.confirm(`Delete ${selected.name}? This is allowed only when it has no rooms or history.`))
                        void onAction("delete-hostel", `${placeLabel} deleted`, { id: selected.id });
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <form className="form-grid" onSubmit={updateHostel}>
                <label><span>Name *</span><input name="name" defaultValue={selected.name} required disabled={!canManage} /></label>
                <label><span>Address / location</span><input name="address" defaultValue={selected.address ?? ""} disabled={!canManage} /></label>
                <label><span>{isOutsideRoom ? "Area contact / owner" : "Hostel in-charge"}</span><input name="inchargeName" defaultValue={selected.inchargeName ?? ""} disabled={!canManage} /></label>
                <label><span>EB meter number</span><input name="ebMeterNumber" defaultValue={selected.ebMeterNumber ?? ""} disabled={!canManage} /></label>
                <section className="form-span payslip-field-selector">
                  <strong>Mapped client employer units</strong>
                  <div className="scope-checkbox-grid">
                    {units.map((unit) => (
                      <label key={unit.id}>
                        <input type="checkbox" name="clientScope" value={unit.id} defaultChecked={mappedUnitIds.includes(unit.id)} disabled={!canManage} />
                        <span>{unit.clientName} · {unit.unitName}</span>
                      </label>
                    ))}
                  </div>
                </section>
                <label className="form-span"><span>Remarks</span><input name="remarks" defaultValue={selected.remarks ?? ""} disabled={!canManage} /></label>
                {canManage ? <button className="primary-button form-span" disabled={isActing}>Save changes and client mapping</button> : null}
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
      {selected ? (
        <>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">
                  Step 3 · Room creation and mapping
                </span>
                <h2>{selected.name} rooms</h2>
              </div>
              <span className="muted-label">
                {hostelRooms.length} mapped rooms
              </span>
            </div>
            {canManage ? (
              <form className="form-grid" onSubmit={createRoom}>
                <label>
                  <span>Selected {placeLabel.toLowerCase()}</span>
                  <input value={selected.name} readOnly />
                </label>
                <label>
                  <span>Room number *</span>
                  <input name="roomNumber" required />
                </label>
                <label>
                  <span>Capacity</span>
                  <input
                    name="capacity"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </label>
                <label>
                  <span>Remarks</span>
                  <input name="remarks" />
                </label>
                <button
                  className="primary-button form-span"
                  disabled={isActing}
                >
                  Create and map room
                </button>
              </form>
            ) : null}
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Capacity</th>
                    <th>Residents</th>
                    <th>Stored {placeLabel.toLowerCase()} mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleRooms.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.roomNumber}</strong>
                      </td>
                      <td>{r.capacity || "Unlimited"}</td>
                      <td>
                        {
                          employees.filter(
                            (e) => e.roomId === r.id && e.status === "active",
                          ).length
                        }
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            value={r.hostelId ?? ""}
                            onChange={(e) =>
                              e.target.value &&
                              void onAction(
                                "assign-room-hostel",
                                "Room mapped",
                                { roomId: r.id, hostelId: e.target.value },
                              )
                            }
                          >
                            <option value="">Not mapped</option>
                            {typeHostels.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          (typeHostels.find((h) => h.id === r.hostelId)?.name ??
                            "Not mapped")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Hostel daily operations</span>
                <h2>{selected.name}: readings, payments and activities</h2>
              </div>
              <span className="muted-label">
                Readings and expenses are separate
              </span>
            </div>
            {canManage ? (
              <form className="form-grid" onSubmit={saveEntry}>
                <label>
                  <span>Update type *</span>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as EntryType)}
                  >
                    <option value="eb">Daily EB meter reading</option>
                    <option value="water">Water ordered / quantity</option>
                    <option value="payment">Payment update</option>
                    <option value="housekeeping">
                      Housekeeping / cleaning
                    </option>
                    <option value="other">Other activity</option>
                  </select>
                </label>
                <label>
                  <span>Date *</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
                {entryType === "eb" ? (
                  <label>
                    <span>Current EB reading *</span>
                    <input
                      name="readingValue"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                ) : null}
                {entryType === "water" ? (
                  <label>
                    <span>Water quantity (litres) *</span>
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                ) : null}
                {entryType === "payment" ? (
                  <label>
                    <span>Payment for *</span>
                    <select name="paymentType">
                      <option>Water order payment</option>
                      <option>EB bill payment</option>
                    </select>
                  </label>
                ) : null}
                {entryType === "other" ? (
                  <label>
                    <span>Other activity name *</span>
                    <input name="activityName" required />
                  </label>
                ) : null}
                {!["eb", "water"].includes(entryType) ? (
                  <label>
                    <span>Paid amount (₹) *</span>
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                ) : null}
                <label className="form-span">
                  <span>Remarks / supplier / bill reference</span>
                  <input name="remarks" />
                </label>
                <button
                  className="primary-button form-span"
                  disabled={isActing}
                >
                  Save hostel update
                </button>
              </form>
            ) : null}
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Hostel reports</span>
                <h2>Daily readings and expense reports</h2>
              </div>
              <div className="record-actions">
                <select
                  value={report}
                  onChange={(e) =>
                    setReport(e.target.value as "readings" | "expenses")
                  }
                >
                  <option value="readings">Daily EB & water</option>
                  <option value="expenses">Expenses & activities</option>
                </select>
                <select
                  value={scope}
                  onChange={(e) =>
                    setScope(e.target.value as "hostel" | "overall")
                  }
                >
                  <option value="hostel">Selected hostel</option>
                  <option value="overall">Overall hostels</option>
                </select>
                <button
                  type="button"
                  className="record-action"
                  onClick={() => exportReport("xlsx")}
                  title="Download report in Excel (.xlsx) format"
                >
                  Download Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="record-action"
                  onClick={() => exportReport("csv")}
                  title="Download report in CSV format"
                >
                  Download CSV
                </button>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hostel</th>
                    <th>Entry / activity</th>
                    <th>Reading / quantity</th>
                    <th>Consumption</th>
                    <th>Paid amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.readingDate}</td>
                      <td>{hostels.find((h) => h.id === r.hostelId)?.name}</td>
                      <td>
                        {r.activityName ??
                          (r.utilityType === "eb"
                            ? "EB reading"
                            : "Water order")}
                      </td>
                      <td>
                        {r.utilityType === "eb"
                          ? r.readingValue
                          : r.utilityType === "water"
                            ? `${r.tankerQuantity} L`
                            : "—"}
                      </td>
                      <td>{r.utilityType === "eb" ? r.consumption : "—"}</td>
                      <td>
                        {!["eb", "water"].includes(r.utilityType)
                          ? money(r.amount)
                          : "—"}
                      </td>
                      <td>{r.status}</td>
                      <td>
                        {r.status === "draft" && canApprove ? (
                          <button
                            className="record-action"
                            disabled={isActing}
                            onClick={() =>
                              void onAction(
                                "approve-hostel-utility",
                                "Hostel update approved",
                                { id: r.id },
                              )
                            }
                          >
                            Approve
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Room deductions · {payPeriod}</span>
                <h2>{selected.name}: cumulative Gas, Ration and Provision</h2>
              </div>
              <strong>
                {money(totals.gas + totals.ration + totals.provision)}
              </strong>
            </div>
            <div className="payment-summary-grid">
              <article>
                <div>
                  <small>Gas cylinders</small>
                  <strong>{money(totals.gas)}</strong>
                </div>
              </article>
              <article>
                <div>
                  <small>Ration</small>
                  <strong>{money(totals.ration)}</strong>
                </div>
              </article>
              <article>
                <div>
                  <small>Provision</small>
                  <strong>{money(totals.provision)}</strong>
                </div>
              </article>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Gas</th>
                    <th>Ration</th>
                    <th>Provision</th>
                    <th>Roommates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hostelRooms.map((room) => {
                    const roomEntries = periodExpenses.filter(
                      (e) => e.roomId === room.id,
                    );
                    const totalGas = roomEntries.reduce(
                      (sum, e) => sum + (e.gasAmount || 0),
                      0,
                    );
                    const totalRation = roomEntries.reduce(
                      (sum, e) => sum + (e.rationAmount || 0),
                      0,
                    );
                    const totalProvision = roomEntries.reduce(
                      (sum, e) => sum + (e.provisionAmount || 0),
                      0,
                    );
                    const isExpanded = expandedRoomId === room.id;
                    const status = roomEntries.some((e) => e.status === "finalized")
                      ? "finalized"
                      : roomEntries.some((e) => e.status === "draft")
                        ? "draft"
                        : "Not entered";

                    const gasEntries = roomEntries.filter(
                      (e) => (e.gasAmount || 0) > 0 || Boolean(e.gasDate),
                    );
                    const rationEntries = roomEntries.filter(
                      (e) => (e.rationAmount || 0) > 0 || Boolean(e.rationDate),
                    );
                    const provisionEntries = roomEntries.filter(
                      (e) => (e.provisionAmount || 0) > 0 || Boolean(e.provisionDate),
                    );

                    return (
                      <Fragment key={room.id}>
                        <tr
                          style={{
                            cursor: "pointer",
                            background: isExpanded ? "rgba(37, 99, 235, 0.04)" : undefined,
                          }}
                          onClick={() =>
                            setExpandedRoomId(isExpanded ? null : room.id)
                          }
                          title="Click to view/hide date-wise breakdown"
                        >
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <ChevronRight
                                size={14}
                                style={{
                                  color: isExpanded ? "#2563eb" : "#94a3b8",
                                  transition: "transform 0.15s ease",
                                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                  flexShrink: 0,
                                }}
                              />
                              <strong>{room.roomNumber}</strong>
                              {roomEntries.length > 0 ? (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    background: isExpanded ? "#dbeafe" : "#f1f5f9",
                                    color: isExpanded ? "#1d4ed8" : "#64748b",
                                    fontWeight: "600",
                                  }}
                                >
                                  {roomEntries.length} {roomEntries.length === 1 ? "entry" : "entries"}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td style={{ fontWeight: totalGas > 0 ? "600" : "normal" }}>
                            {totalGas > 0 ? money(totalGas) : "—"}
                          </td>
                          <td style={{ fontWeight: totalRation > 0 ? "600" : "normal" }}>
                            {totalRation > 0 ? money(totalRation) : "—"}
                          </td>
                          <td style={{ fontWeight: totalProvision > 0 ? "600" : "normal" }}>
                            {totalProvision > 0 ? money(totalProvision) : "—"}
                          </td>
                          <td>
                            {roomEntries[0]?.occupantCount ||
                              employees.filter(
                                (e) =>
                                  e.roomId === room.id && e.status === "active",
                              ).length}
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                textTransform: "capitalize",
                                background:
                                  status === "finalized"
                                    ? "#dcfce7"
                                    : status === "draft"
                                      ? "#fef3c7"
                                      : "#f1f5f9",
                                color:
                                  status === "finalized"
                                    ? "#166534"
                                    : status === "draft"
                                      ? "#92400e"
                                      : "#64748b",
                              }}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr
                            key={`${room.id}-breakdown`}
                            className="room-breakdown-row"
                            style={{ background: "#f8fafc" }}
                          >
                            <td colSpan={6} style={{ padding: "12px 16px" }}>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                  gap: "12px",
                                }}
                              >
                                {/* Gas Breakdown Card */}
                                <div
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "8px",
                                      borderBottom: "1px solid #f1f5f9",
                                      paddingBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        color: "#0f172a",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                      }}
                                    >
                                      <Flame size={14} style={{ color: "#ea580c" }} /> Gas Cylinders
                                    </span>
                                    <strong
                                      style={{
                                        fontSize: "12px",
                                        color: totalGas > 0 ? "#0f172a" : "#94a3b8",
                                      }}
                                    >
                                      {money(totalGas)}
                                    </strong>
                                  </div>
                                  {gasEntries.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                      }}
                                    >
                                      {gasEntries.map((e, idx) => (
                                        <div
                                          key={e.id || idx}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontSize: "11px",
                                            padding: "4px 0",
                                            borderBottom:
                                              idx < gasEntries.length - 1
                                                ? "1px dashed #f1f5f9"
                                                : "none",
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#334155",
                                              }}
                                            >
                                              {e.gasDate || "Undated"}
                                            </span>
                                            {e.gasCylinderCount ? (
                                              <span
                                                style={{
                                                  color: "#64748b",
                                                  marginLeft: "4px",
                                                }}
                                              >
                                                ({e.gasCylinderCount} cyl)
                                              </span>
                                            ) : null}
                                            {e.gasPaymentReference ? (
                                              <div
                                                style={{
                                                  fontSize: "10px",
                                                  color: "#94a3b8",
                                                }}
                                              >
                                                Ref: {e.gasPaymentReference}
                                              </div>
                                            ) : null}
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#0f172a",
                                              }}
                                            >
                                              {money(e.gasAmount || 0)}
                                            </span>
                                            {isSuperAdmin ? (
                                              <div style={{ display: "inline-flex", gap: "4px" }}>
                                                <button
                                                  type="button"
                                                  title="Edit Gas Entry"
                                                  onClick={() => startEditExpense(e)}
                                                  style={{
                                                    background: "#f1f5f9",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#334155",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                  }}
                                                >
                                                  <Edit2 size={10} /> Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  title="Delete Gas Entry"
                                                  disabled={isActing}
                                                  onClick={() => void handleDeleteExpense(e, "Gas")}
                                                  style={{
                                                    background: "#fee2e2",
                                                    border: "1px solid #fca5a5",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#991b1b",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#94a3b8",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      No gas entries
                                    </div>
                                  )}
                                </div>

                                {/* Ration Breakdown Card */}
                                <div
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "8px",
                                      borderBottom: "1px solid #f1f5f9",
                                      paddingBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        color: "#0f172a",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                      }}
                                    >
                                      <ShoppingBag size={14} style={{ color: "#16a34a" }} /> Ration
                                    </span>
                                    <strong
                                      style={{
                                        fontSize: "12px",
                                        color: totalRation > 0 ? "#0f172a" : "#94a3b8",
                                      }}
                                    >
                                      {money(totalRation)}
                                    </strong>
                                  </div>
                                  {rationEntries.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                      }}
                                    >
                                      {rationEntries.map((e, idx) => (
                                        <div
                                          key={e.id || idx}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontSize: "11px",
                                            padding: "4px 0",
                                            borderBottom:
                                              idx < rationEntries.length - 1
                                                ? "1px dashed #f1f5f9"
                                                : "none",
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#334155",
                                              }}
                                            >
                                              {e.rationDate || "Undated"}
                                            </span>
                                            {e.rationPaymentReference ? (
                                              <div
                                                style={{
                                                  fontSize: "10px",
                                                  color: "#94a3b8",
                                                }}
                                              >
                                                Ref: {e.rationPaymentReference}
                                              </div>
                                            ) : null}
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#0f172a",
                                              }}
                                            >
                                              {money(e.rationAmount || 0)}
                                            </span>
                                            {isSuperAdmin ? (
                                              <div style={{ display: "inline-flex", gap: "4px" }}>
                                                <button
                                                  type="button"
                                                  title="Edit Ration Entry"
                                                  onClick={() => startEditExpense(e)}
                                                  style={{
                                                    background: "#f1f5f9",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#334155",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                  }}
                                                >
                                                  <Edit2 size={10} /> Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  title="Delete Ration Entry"
                                                  disabled={isActing}
                                                  onClick={() => void handleDeleteExpense(e, "Ration")}
                                                  style={{
                                                    background: "#fee2e2",
                                                    border: "1px solid #fca5a5",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#991b1b",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#94a3b8",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      No ration entries
                                    </div>
                                  )}
                                </div>

                                {/* Provision Breakdown Card */}
                                <div
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "8px",
                                      borderBottom: "1px solid #f1f5f9",
                                      paddingBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: "700",
                                        color: "#0f172a",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                      }}
                                    >
                                      <ShoppingCart size={14} style={{ color: "#2563eb" }} /> Provision
                                    </span>
                                    <strong
                                      style={{
                                        fontSize: "12px",
                                        color: totalProvision > 0 ? "#0f172a" : "#94a3b8",
                                      }}
                                    >
                                      {money(totalProvision)}
                                    </strong>
                                  </div>
                                  {provisionEntries.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                      }}
                                    >
                                      {provisionEntries.map((e, idx) => (
                                        <div
                                          key={e.id || idx}
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            fontSize: "11px",
                                            padding: "4px 0",
                                            borderBottom:
                                              idx < provisionEntries.length - 1
                                                ? "1px dashed #f1f5f9"
                                                : "none",
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#334155",
                                              }}
                                            >
                                              {e.provisionDate || "Undated"}
                                            </span>
                                            {e.provisionPaymentReference ? (
                                              <div
                                                style={{
                                                  fontSize: "10px",
                                                  color: "#94a3b8",
                                                }}
                                              >
                                                Ref: {e.provisionPaymentReference}
                                              </div>
                                            ) : null}
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span
                                              style={{
                                                fontWeight: "600",
                                                color: "#0f172a",
                                              }}
                                            >
                                              {money(e.provisionAmount || 0)}
                                            </span>
                                            {isSuperAdmin ? (
                                              <div style={{ display: "inline-flex", gap: "4px" }}>
                                                <button
                                                  type="button"
                                                  title="Edit Provision Entry"
                                                  onClick={() => startEditExpense(e)}
                                                  style={{
                                                    background: "#f1f5f9",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#334155",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                  }}
                                                >
                                                  <Edit2 size={10} /> Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  title="Delete Provision Entry"
                                                  disabled={isActing}
                                                  onClick={() => void handleDeleteExpense(e, "Provision")}
                                                  style={{
                                                    background: "#fee2e2",
                                                    border: "1px solid #fca5a5",
                                                    borderRadius: "4px",
                                                    padding: "2px 6px",
                                                    fontSize: "10px",
                                                    cursor: "pointer",
                                                    color: "#991b1b",
                                                    fontWeight: "600",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#94a3b8",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      No provision entries
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {/* Edit Dated Room Recovery Modal */}
      {editingExpense ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingExpense(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
              width: "100%",
              maxWidth: "480px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Edit2 size={16} style={{ color: "#2563eb" }} /> Edit Dated Room Recovery
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Overwrites existing recovery entry in-place without adding duplicate entries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Entry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                      Gas Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editGasAmount || ""}
                      placeholder="0"
                      onChange={(e) => setEditGasAmount(parseFloat(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                      Gas Cylinders (Qty)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editGasCylinders || ""}
                      placeholder="0"
                      onChange={(e) => setEditGasCylinders(parseInt(e.target.value, 10) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                      Ration Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editRationAmount || ""}
                      placeholder="0"
                      onChange={(e) => setEditRationAmount(parseFloat(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                      Provision Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editProvisionAmount || ""}
                      placeholder="0"
                      onChange={(e) => setEditProvisionAmount(parseFloat(e.target.value) || 0)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Bill Ref / Remarks
                  </label>
                  <input
                    type="text"
                    value={editReference}
                    placeholder="e.g. Bill #1234, Cash voucher"
                    onChange={(e) => setEditReference(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActing}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  {isActing ? "Saving..." : "Save & Overwrite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
