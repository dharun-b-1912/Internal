/**
 * Automated script to dispatch the Joy Daily Workforce Report PDF via Meta WhatsApp Cloud API.
 * Usage:
 *   node --import tsx scripts/send-daily-workforce-whatsapp.ts [--date=YYYY-MM-DD] [--phone=919944399088]
 */
import { buildDailyWorkforcePdf, formatReportDate, formatReportFileName } from "../lib/daily-workforce-pdf";
import {
  sendDailyWorkforceReportWhatsApp,
  formatDailyReportWhatsAppText,
} from "../lib/whatsapp";
import { getDb } from "../db";
import { employees, clientUnits, vendors } from "../db/schema";

async function main() {
  const args = process.argv.slice(2);
  let targetDate = new Date().toISOString().slice(0, 10);
  let targetPhone = process.env.WHATSAPP_ADMIN_PHONE || "919944399088";

  for (const arg of args) {
    if (arg.startsWith("--date=")) {
      targetDate = arg.split("=")[1];
    } else if (arg.startsWith("--phone=")) {
      targetPhone = arg.split("=")[1];
    }
  }

  console.log(`[WhatsApp Daily Report] Processing for Date: ${targetDate} to ${targetPhone}...`);

  const db = getDb();
  const allEmps = await db.select().from(employees);
  const allUnits = await db.select().from(clientUnits);
  const allVendors = await db.select().from(vendors);

  const joinedToday = allEmps.filter((e) => e.dateOfJoining === targetDate);
  const leftToday = allEmps.filter(
    (e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving === targetDate,
  );

  console.log(`Found ${joinedToday.length} joined, ${leftToday.length} left.`);

  // 1. Build PDF in memory
  const pdfBytes = await buildDailyWorkforcePdf({
    date: targetDate,
    employees: allEmps as any,
    vendors: allVendors as any,
    units: allUnits as any,
  });

  const fileName = formatReportFileName(targetDate);

  // 2. Prepare company summaries
  const unitMap = new Map(allUnits.map((u) => [u.id, { unitName: u.unitName, clientName: u.clientName }]));
  const groupMap = new Map<string, { clientName: string; unitName: string; jCount: number; lCount: number; net: number }>();

  for (const emp of [...joinedToday, ...leftToday]) {
    const u = unitMap.get(emp.clientUnitId);
    const clientName = u?.clientName || "Direct Client";
    const unitName = u?.unitName || "Main Plant";
    const key = `${clientName}:::${unitName}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { clientName, unitName, jCount: 0, lCount: 0, net: 0 });
    }
  }
  for (const emp of joinedToday) {
    const u = unitMap.get(emp.clientUnitId);
    const key = `${u?.clientName || "Direct Client"}:::${u?.unitName || "Main Plant"}`;
    const g = groupMap.get(key);
    if (g) g.jCount++;
  }
  for (const emp of leftToday) {
    const u = unitMap.get(emp.clientUnitId);
    const key = `${u?.clientName || "Direct Client"}:::${u?.unitName || "Main Plant"}`;
    const g = groupMap.get(key);
    if (g) g.lCount++;
  }
  for (const g of groupMap.values()) {
    g.net = g.jCount - g.lCount;
  }

  const caption = formatDailyReportWhatsAppText({
    dateFormatted: formatReportDate(targetDate),
    totalJoined: joinedToday.length,
    totalLeft: leftToday.length,
    netDelta: joinedToday.length - leftToday.length,
    companySummaries: Array.from(groupMap.values()),
  });

  console.log(`Dispatching to Meta WhatsApp Cloud API...`);
  const result = await sendDailyWorkforceReportWhatsApp({
    toPhone: targetPhone,
    pdfBytes,
    filename: fileName,
    caption,
  });

  if (result.success) {
    console.log(`✅ Success! WhatsApp message sent. Message ID: ${result.messageId}`);
  } else {
    console.error(`❌ Meta WhatsApp delivery failed:`, result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

