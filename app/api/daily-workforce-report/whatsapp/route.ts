import { NextResponse } from "next/server";
import {
  sendDailyWorkforceReportWhatsApp,
  formatDailyReportWhatsAppText,
  type WhatsAppConfig,
} from "../../../../lib/whatsapp";
import { buildDailyWorkforcePdf, formatReportDate, formatReportFileName } from "../../../../lib/daily-workforce-pdf";
import { getDb } from "../../../../db";
import { employees, clientUnits, vendors } from "../../../../db/schema";
import { eq, or } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      toPhone,
      companyFilter = "all",
      pdfBase64,
      token,
      phoneId,
      summaryData,
    } = body;

    if (!toPhone) {
      return NextResponse.json(
        { success: false, error: "Recipient WhatsApp phone number is required" },
        { status: 400 },
      );
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const config: Partial<WhatsAppConfig> = {};
    if (token) config.accessToken = token;
    if (phoneId) config.phoneNumberId = phoneId;

    let pdfBuffer: Uint8Array;
    let fileName = formatReportFileName(targetDate, companyFilter);
    let captionText = "";

    if (pdfBase64) {
      // PDF generated and passed from UI
      pdfBuffer = Buffer.from(pdfBase64, "base64");

      if (summaryData) {
        captionText = formatDailyReportWhatsAppText({
          dateFormatted: formatReportDate(targetDate),
          totalJoined: summaryData.totalJoined || 0,
          totalLeft: summaryData.totalLeft || 0,
          netDelta: summaryData.netDelta || 0,
          companySummaries: summaryData.companySummaries || [],
        });
      } else {
        captionText = `📊 *JOY CORPORATE SOLUTIONS - DAILY WORKFORCE REPORT*\n📅 *Date:* ${formatReportDate(targetDate)}\n\n📎 Official company-wise report attached.`;
      }
    } else {
      // Generate directly on server (e.g. for scheduled cron calls)
      const db = getDb();
      const allEmps = await db.select().from(employees);
      const allUnits = await db.select().from(clientUnits);
      const allVendors = await db.select().from(vendors);

      pdfBuffer = await buildDailyWorkforcePdf({
        date: targetDate,
        employees: allEmps as any,
        vendors: allVendors as any,
        units: allUnits as any,
        companyFilter,
      });

      const joinedCount = allEmps.filter((e) => e.dateOfJoining === targetDate).length;
      const leftCount = allEmps.filter(
        (e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving === targetDate,
      ).length;

      captionText = `📊 *JOY CORPORATE SOLUTIONS - DAILY WORKFORCE REPORT*\n📅 *Date:* ${formatReportDate(targetDate)}\n\n• *Joined Today:* ${joinedCount}\n• *Left Today:* ${leftCount}\n• *Net Delta:* ${joinedCount - leftCount >= 0 ? "+" : ""}${joinedCount - leftCount}\n\n📎 Full company-wise PDF report attached.`;
    }

    // Dispatch via Meta WhatsApp
    const result = await sendDailyWorkforceReportWhatsApp({
      toPhone,
      pdfBytes: pdfBuffer,
      filename: fileName,
      caption: captionText,
      config,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        fileName,
        toPhone,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || "Meta WhatsApp Cloud API failed to deliver document.",
      },
      { status: 502 },
    );
  } catch (err: any) {
    console.error("Daily report WhatsApp send error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error dispatching WhatsApp report",
      },
      { status: 500 },
    );
  }
}

