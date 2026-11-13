import { PDFDocument, StandardFonts, rgb, type PDFPage, type RGB } from "pdf-lib";

export interface WorkforcePdfEmployee {
  id: string;
  vendorId: string;
  clientUnitId: string;
  employeeCode: string;
  name: string;
  department?: string;
  dateOfJoining: string;
  dateOfLeaving?: string | null;
  mobileNumber?: string | null;
  highestQualification?: string | null;
  accommodationType?: string;
  roomNumber?: string | null;
  remarks?: string | null;
  status: string;
}

export interface WorkforcePdfVendor {
  id: string;
  name: string;
  legalName?: string;
}

export interface WorkforcePdfUnit {
  id: string;
  vendorId: string;
  clientName: string;
  unitName: string;
  location?: string;
}

export interface DailyWorkforcePdfOptions {
  date: string; // YYYY-MM-DD
  employees: WorkforcePdfEmployee[];
  vendors: WorkforcePdfVendor[];
  units: WorkforcePdfUnit[];
  companyFilter?: string; // "all" or specific company/unit key
  companyTitle?: string;
  generatedBy?: string;
}

export function formatReportDate(iso: string): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d).padStart(2, "0")}-${months[m - 1]}-${y}`;
}

export function formatReportFileName(iso: string, companyTag?: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const tag = companyTag && companyTag !== "all" ? `_${companyTag.replaceAll(/[^a-zA-Z0-9]+/g, "_")}` : "";
  if (!y || !m || !d) return `Joy_Daily_Workforce_Report_${iso}${tag}.pdf`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayStr = String(d).padStart(2, "0");
  const monthStr = months[m - 1];
  return `Joy_Daily_Workforce_Report_${dayStr}_${monthStr}_${y}${tag}.pdf`;
}

function calculateTenure(joinedDateStr?: string | null, leftDateStr?: string | null): string {
  if (!joinedDateStr || !leftDateStr) return "-";
  const start = new Date(joinedDateStr);
  const end = new Date(leftDateStr);
  const diffTime = end.getTime() - start.getTime();
  if (isNaN(diffTime) || diffTime < 0) return "-";
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `${months}m ${remDays}d` : `${months} month${months === 1 ? "" : "s"}`;
}

export async function buildDailyWorkforcePdf({
  date,
  employees,
  vendors,
  units,
  companyFilter = "all",
  companyTitle = "JOY CORPORATE SOLUTIONS",
  generatedBy = "Joy Payroll HRMS",
}: DailyWorkforcePdfOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28 pt
  const bottomMargin = 45;

  // Professional Palette
  const navyDark = rgb(0.06, 0.18, 0.35); // #0f2e59
  const navyLight = rgb(0.12, 0.28, 0.50);
  const textDark = rgb(0.12, 0.15, 0.18);
  const textMuted = rgb(0.45, 0.50, 0.56);
  const lineBorder = rgb(0.85, 0.88, 0.92);
  const tableHeaderBg = rgb(0.93, 0.95, 0.98);
  const zebraBg = rgb(0.98, 0.99, 1.0);
  const white = rgb(1, 1, 1);

  const greenDark = rgb(0.08, 0.55, 0.32);
  const greenBg = rgb(0.92, 0.98, 0.94);
  const redDark = rgb(0.82, 0.20, 0.20);
  const redBg = rgb(0.99, 0.93, 0.93);
  const blueBg = rgb(0.93, 0.96, 1.0);

  const vendorMap = new Map<string, string>();
  for (const v of vendors) {
    vendorMap.set(v.id, v.name || v.legalName || "Client");
  }

  const unitMap = new Map<string, { unitName: string; clientName: string }>();
  for (const u of units) {
    unitMap.set(u.id, {
      unitName: u.unitName || "General Unit",
      clientName: u.clientName || vendorMap.get(u.vendorId) || "Direct Client",
    });
  }

  // Filter joinings and exits strictly for target date and optional company filter
  let joinedToday = employees.filter((e) => e.dateOfJoining === date);
  let leftToday = employees.filter(
    (e) => (e.status === "left" || Boolean(e.dateOfLeaving)) && e.dateOfLeaving === date,
  );

  if (companyFilter && companyFilter !== "all") {
    joinedToday = joinedToday.filter((e) => {
      const u = unitMap.get(e.clientUnitId);
      const cName = u?.clientName || "Direct Client";
      return cName === companyFilter || `${cName} · ${u?.unitName}` === companyFilter;
    });
    leftToday = leftToday.filter((e) => {
      const u = unitMap.get(e.clientUnitId);
      const cName = u?.clientName || "Direct Client";
      return cName === companyFilter || `${cName} · ${u?.unitName}` === companyFilter;
    });
  }

  // Group by CLIENT COMPANY & UNIT
  type ClientSummary = {
    key: string;
    clientName: string;
    unitName: string;
    jCount: number;
    lCount: number;
    net: number;
  };

  const clientGroupMap = new Map<string, ClientSummary>();

  for (const emp of [...joinedToday, ...leftToday]) {
    const unit = unitMap.get(emp.clientUnitId);
    const clientName = unit?.clientName || vendorMap.get(emp.vendorId) || "General Client";
    const unitName = unit?.unitName || "Main Plant";
    const groupKey = `${clientName}:::${unitName}`;

    if (!clientGroupMap.has(groupKey)) {
      clientGroupMap.set(groupKey, {
        key: groupKey,
        clientName,
        unitName,
        jCount: 0,
        lCount: 0,
        net: 0,
      });
    }
  }

  for (const emp of joinedToday) {
    const unit = unitMap.get(emp.clientUnitId);
    const clientName = unit?.clientName || vendorMap.get(emp.vendorId) || "General Client";
    const unitName = unit?.unitName || "Main Plant";
    const groupKey = `${clientName}:::${unitName}`;
    const grp = clientGroupMap.get(groupKey);
    if (grp) grp.jCount++;
  }

  for (const emp of leftToday) {
    const unit = unitMap.get(emp.clientUnitId);
    const clientName = unit?.clientName || vendorMap.get(emp.vendorId) || "General Client";
    const unitName = unit?.unitName || "Main Plant";
    const groupKey = `${clientName}:::${unitName}`;
    const grp = clientGroupMap.get(groupKey);
    if (grp) grp.lCount++;
  }

  for (const grp of clientGroupMap.values()) {
    grp.net = grp.jCount - grp.lCount;
  }

  const clientSummaries = Array.from(clientGroupMap.values()).sort(
    (a, b) => a.clientName.localeCompare(b.clientName) || a.unitName.localeCompare(b.unitName),
  );

  let pages: PDFPage[] = [];
  let currentPage!: PDFPage;
  let y = pageHeight - margin;

  function addNewPage() {
    currentPage = pdf.addPage([pageWidth, pageHeight]);
    pages.push(currentPage);
    y = pageHeight - margin;
    return currentPage;
  }

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < bottomMargin) {
      addNewPage();
      drawPageHeaderCompact();
    }
  }

  function drawPageHeaderCompact() {
    currentPage.drawRectangle({
      x: margin,
      y: y - 2,
      width: contentWidth,
      height: 1,
      color: lineBorder,
    });
    currentPage.drawText(`${companyTitle} · Daily Workforce Report · ${formatReportDate(date)}`, {
      x: margin,
      y: y - 12,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    y -= 26;
  }

  // --- Start Page 1 ---
  addNewPage();

  // 1. Top Header Masthead
  const mastheadHeight = 54;
  currentPage.drawRectangle({
    x: margin,
    y: y - mastheadHeight,
    width: contentWidth,
    height: mastheadHeight,
    color: navyDark,
  });

  currentPage.drawText(companyTitle.toUpperCase(), {
    x: margin + 14,
    y: y - 22,
    size: 13,
    font: fontBold,
    color: white,
  });

  const subHeaderTitle = companyFilter && companyFilter !== "all"
    ? `DAILY WORKFORCE REPORT — ${companyFilter.toUpperCase()}`
    : "DAILY WORKFORCE MOVEMENT REPORT (COMPANY-WISE JOININGS & EXITS)";

  currentPage.drawText(subHeaderTitle, {
    x: margin + 14,
    y: y - 38,
    size: 8,
    font: fontBold,
    color: rgb(0.8, 0.9, 1.0),
  });

  const formattedDate = formatReportDate(date);
  const dateStr = `Date: ${formattedDate}`;
  const dateStrWidth = fontBold.widthOfTextAtSize(dateStr, 9.5);
  currentPage.drawText(dateStr, {
    x: margin + contentWidth - dateStrWidth - 14,
    y: y - 22,
    size: 9.5,
    font: fontBold,
    color: white,
  });

  const genStr = `Generated: ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}`;
  const genStrWidth = fontRegular.widthOfTextAtSize(genStr, 8);
  currentPage.drawText(genStr, {
    x: margin + contentWidth - genStrWidth - 14,
    y: y - 38,
    size: 8,
    font: fontRegular,
    color: rgb(0.82, 0.88, 0.94),
  });

  y -= mastheadHeight + 14;

  // 2. Executive KPI Cards (Joined, Left, Net Delta)
  const cardWidth = (contentWidth - 16) / 3;
  const cardHeight = 46;

  // Joined Card
  currentPage.drawRectangle({
    x: margin,
    y: y - cardHeight,
    width: cardWidth,
    height: cardHeight,
    color: greenBg,
    borderColor: greenDark,
    borderWidth: 1,
  });
  currentPage.drawText("TOTAL JOINED TODAY", {
    x: margin + 10,
    y: y - 15,
    size: 7.5,
    font: fontBold,
    color: greenDark,
  });
  currentPage.drawText(String(joinedToday.length), {
    x: margin + 10,
    y: y - 38,
    size: 18,
    font: fontBold,
    color: greenDark,
  });
  currentPage.drawText("New joiners onboarded", {
    x: margin + 46,
    y: y - 35,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  // Left Card
  const leftCardX = margin + cardWidth + 8;
  currentPage.drawRectangle({
    x: leftCardX,
    y: y - cardHeight,
    width: cardWidth,
    height: cardHeight,
    color: redBg,
    borderColor: redDark,
    borderWidth: 1,
  });
  currentPage.drawText("TOTAL LEFT TODAY", {
    x: leftCardX + 10,
    y: y - 15,
    size: 7.5,
    font: fontBold,
    color: redDark,
  });
  currentPage.drawText(String(leftToday.length), {
    x: leftCardX + 10,
    y: y - 38,
    size: 18,
    font: fontBold,
    color: redDark,
  });
  currentPage.drawText("Employees relieved / left", {
    x: leftCardX + 46,
    y: y - 35,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  // Net Delta Card
  const netCardX = margin + (cardWidth + 8) * 2;
  const netDelta = joinedToday.length - leftToday.length;
  const netColor = netDelta >= 0 ? greenDark : redDark;
  currentPage.drawRectangle({
    x: netCardX,
    y: y - cardHeight,
    width: cardWidth,
    height: cardHeight,
    color: blueBg,
    borderColor: navyLight,
    borderWidth: 1,
  });
  currentPage.drawText("NET HEADCOUNT DELTA", {
    x: netCardX + 10,
    y: y - 15,
    size: 7.5,
    font: fontBold,
    color: navyDark,
  });
  const netSign = netDelta > 0 ? `+${netDelta}` : String(netDelta);
  currentPage.drawText(netSign, {
    x: netCardX + 10,
    y: y - 38,
    size: 18,
    font: fontBold,
    color: netColor,
  });
  currentPage.drawText("Daily net workforce change", {
    x: netCardX + 50,
    y: y - 35,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  y -= cardHeight + 18;

  // --- Helpers ---
  function drawSectionTitle(title: string, color: RGB) {
    ensureSpace(42);
    currentPage.drawText(title, {
      x: margin,
      y: y - 10,
      size: 9.5,
      font: fontBold,
      color,
    });
    y -= 18;
  }

  function drawEmptyNotice(message: string) {
    ensureSpace(24);
    currentPage.drawRectangle({
      x: margin,
      y: y - 22,
      width: contentWidth,
      height: 22,
      color: white,
      borderColor: lineBorder,
      borderWidth: 0.5,
    });
    currentPage.drawText(message, {
      x: margin + 10,
      y: y - 15,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
    y -= 22;
  }

  function drawCompanyBanner(companyName: string, unitName: string, count: number, type: "joined" | "left") {
    ensureSpace(28);
    const isJoined = type === "joined";
    const bannerH = 18;
    currentPage.drawRectangle({
      x: margin,
      y: y - bannerH,
      width: contentWidth,
      height: bannerH,
      color: isJoined ? rgb(0.92, 0.97, 0.94) : rgb(0.99, 0.94, 0.94),
      borderColor: isJoined ? greenDark : redDark,
      borderWidth: 0.75,
    });

    const badge = `${companyName} · ${unitName}`;
    currentPage.drawText(badge, {
      x: margin + 8,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: isJoined ? greenDark : redDark,
    });

    const countStr = `${count} ${count === 1 ? (isJoined ? "Joinee" : "Exit") : (isJoined ? "Joinees" : "Exits")}`;
    const cWidth = fontBold.widthOfTextAtSize(countStr, 8);
    currentPage.drawText(countStr, {
      x: margin + contentWidth - cWidth - 8,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: isJoined ? greenDark : redDark,
    });

    y -= bannerH;
  }

  // 3. Section 1: Client Company Movement Summary Table
  drawSectionTitle("1. CLIENT COMPANY-WISE WORKFORCE MOVEMENT SUMMARY", navyDark);

  const colWidthsSummary = [160, 115, 82, 82, 84];
  const summaryHeaders = ["Client Company Name", "Employer Unit / Plant", "Joined", "Left", "Net Change"];

  ensureSpace(20);
  currentPage.drawRectangle({
    x: margin,
    y: y - 19,
    width: contentWidth,
    height: 19,
    color: tableHeaderBg,
    borderColor: lineBorder,
    borderWidth: 1,
  });

  let curX = margin;
  summaryHeaders.forEach((h, i) => {
    currentPage.drawText(h, {
      x: curX + 6,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: navyDark,
    });
    curX += colWidthsSummary[i];
  });
  y -= 19;

  if (clientSummaries.length === 0) {
    drawEmptyNotice("No joinings or exits recorded on this date across any client company.");
  } else {
    clientSummaries.forEach((row, idx) => {
      ensureSpace(19);
      const rowBg = idx % 2 === 1 ? zebraBg : white;
      currentPage.drawRectangle({
        x: margin,
        y: y - 19,
        width: contentWidth,
        height: 19,
        color: rowBg,
        borderColor: lineBorder,
        borderWidth: 0.5,
      });

      let cX = margin;
      const cName = row.clientName.length > 25 ? `${row.clientName.slice(0, 23)}...` : row.clientName;
      currentPage.drawText(cName, {
        x: cX + 6,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: textDark,
      });
      cX += colWidthsSummary[0];

      const uName = row.unitName.length > 18 ? `${row.unitName.slice(0, 16)}...` : row.unitName;
      currentPage.drawText(uName, {
        x: cX + 6,
        y: y - 13,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      cX += colWidthsSummary[1];

      currentPage.drawText(String(row.jCount), {
        x: cX + 6,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: row.jCount > 0 ? greenDark : textDark,
      });
      cX += colWidthsSummary[2];

      currentPage.drawText(String(row.lCount), {
        x: cX + 6,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: row.lCount > 0 ? redDark : textDark,
      });
      cX += colWidthsSummary[3];

      const netLabel = row.net > 0 ? `+${row.net}` : String(row.net);
      currentPage.drawText(netLabel, {
        x: cX + 6,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: row.net > 0 ? greenDark : row.net < 0 ? redDark : textDark,
      });

      y -= 19;
    });

    // Summary Total Row
    ensureSpace(20);
    currentPage.drawRectangle({
      x: margin,
      y: y - 19,
      width: contentWidth,
      height: 19,
      color: tableHeaderBg,
      borderColor: lineBorder,
      borderWidth: 1,
    });
    let tX = margin;
    currentPage.drawText("TOTAL", {
      x: tX + 6,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: navyDark,
    });
    tX += colWidthsSummary[0] + colWidthsSummary[1];
    currentPage.drawText(String(joinedToday.length), {
      x: tX + 6,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: greenDark,
    });
    tX += colWidthsSummary[2];
    currentPage.drawText(String(leftToday.length), {
      x: tX + 6,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: redDark,
    });
    tX += colWidthsSummary[3];
    currentPage.drawText(netSign, {
      x: tX + 6,
      y: y - 13,
      size: 8,
      font: fontBold,
      color: netColor,
    });
    y -= 19;
  }

  y -= 10;

  // 4. Section 2: Detailed Register - Joinings (GROUPED STRICTLY COMPANY-WISE)
  drawSectionTitle(`2. DETAILED REGISTER: TODAY'S JOININGS (${joinedToday.length} EMPLOYEES)`, greenDark);

  if (joinedToday.length === 0) {
    drawEmptyNotice("No new employees joined on this date.");
  } else {
    // Group joined employees by company/unit
    const joinedGroups = new Map<string, { clientName: string; unitName: string; list: WorkforcePdfEmployee[] }>();
    for (const emp of joinedToday) {
      const u = unitMap.get(emp.clientUnitId);
      const clientName = u?.clientName || "Direct Client";
      const unitName = u?.unitName || "Main Plant";
      const key = `${clientName}:::${unitName}`;
      if (!joinedGroups.has(key)) {
        joinedGroups.set(key, { clientName, unitName, list: [] });
      }
      joinedGroups.get(key)!.list.push(emp);
    }

    const jColWidths = [24, 75, 140, 110, 88, 86];
    const jHeaders = ["#", "Emp Code", "Employee Name", "Department / Role", "Mobile", "Hostel / Room"];

    let globalJoinedIdx = 0;
    for (const group of joinedGroups.values()) {
      // 1. Draw Company Group Header
      drawCompanyBanner(group.clientName, group.unitName, group.list.length, "joined");

      // 2. Draw Table Header
      ensureSpace(19);
      currentPage.drawRectangle({
        x: margin,
        y: y - 18,
        width: contentWidth,
        height: 18,
        color: tableHeaderBg,
        borderColor: lineBorder,
        borderWidth: 0.5,
      });

      let jX = margin;
      jHeaders.forEach((h, i) => {
        currentPage.drawText(h, {
          x: jX + 5,
          y: y - 12,
          size: 7.5,
          font: fontBold,
          color: navyDark,
        });
        jX += jColWidths[i];
      });
      y -= 18;

      // 3. Draw Employees for this Company
      group.list.forEach((emp, subIdx) => {
        globalJoinedIdx++;
        ensureSpace(18);
        const rowBg = subIdx % 2 === 1 ? zebraBg : white;
        currentPage.drawRectangle({
          x: margin,
          y: y - 18,
          width: contentWidth,
          height: 18,
          color: rowBg,
          borderColor: lineBorder,
          borderWidth: 0.5,
        });

        let cX = margin;
        // #
        currentPage.drawText(String(globalJoinedIdx), { x: cX + 5, y: y - 12, size: 7.5, font: fontRegular, color: textMuted });
        cX += jColWidths[0];

        // Emp Code
        currentPage.drawText(emp.employeeCode || "-", { x: cX + 5, y: y - 12, size: 7.5, font: fontBold, color: navyDark });
        cX += jColWidths[1];

        // Employee Name
        const cleanName = (emp.name || "-").slice(0, 26);
        currentPage.drawText(cleanName, { x: cX + 5, y: y - 12, size: 7.5, font: fontBold, color: textDark });
        cX += jColWidths[2];

        // Department / Role
        const deptStr = (emp.department || "-").slice(0, 20);
        currentPage.drawText(deptStr, { x: cX + 5, y: y - 12, size: 7, font: fontRegular, color: textDark });
        cX += jColWidths[3];

        // Mobile
        currentPage.drawText(emp.mobileNumber || "-", { x: cX + 5, y: y - 12, size: 7, font: fontRegular, color: textMuted });
        cX += jColWidths[4];

        // Hostel / Room
        const hostelDesc = emp.accommodationType === "day_scholar"
          ? "Day Scholar"
          : emp.roomNumber
            ? `Room ${emp.roomNumber}`
            : emp.accommodationType || "-";
        currentPage.drawText(hostelDesc.slice(0, 16), { x: cX + 5, y: y - 12, size: 7, font: fontRegular, color: greenDark });

        y -= 18;
      });

      y -= 8; // Small gap between company groups
    }
  }

  y -= 8;

  // 5. Section 3: Detailed Register - Exits / Left (GROUPED STRICTLY COMPANY-WISE)
  drawSectionTitle(`3. DETAILED REGISTER: TODAY'S EXITS / LEFT (${leftToday.length} EMPLOYEES)`, redDark);

  if (leftToday.length === 0) {
    drawEmptyNotice("No employees marked left or relieved on this date.");
  } else {
    // Group left employees by company/unit
    const leftGroups = new Map<string, { clientName: string; unitName: string; list: WorkforcePdfEmployee[] }>();
    for (const emp of leftToday) {
      const u = unitMap.get(emp.clientUnitId);
      const clientName = u?.clientName || "Direct Client";
      const unitName = u?.unitName || "Main Plant";
      const key = `${clientName}:::${unitName}`;
      if (!leftGroups.has(key)) {
        leftGroups.set(key, { clientName, unitName, list: [] });
      }
      leftGroups.get(key)!.list.push(emp);
    }

    const lColWidths = [24, 80, 160, 85, 87, 87];
    const lHeaders = ["#", "Emp Code", "Employee Name", "Date of Joining", "Tenure Worked", "Date of Leaving"];

    let globalLeftIdx = 0;
    for (const group of leftGroups.values()) {
      // 1. Draw Company Group Header
      drawCompanyBanner(group.clientName, group.unitName, group.list.length, "left");

      // 2. Draw Table Header
      ensureSpace(19);
      currentPage.drawRectangle({
        x: margin,
        y: y - 18,
        width: contentWidth,
        height: 18,
        color: tableHeaderBg,
        borderColor: lineBorder,
        borderWidth: 0.5,
      });

      let lX = margin;
      lHeaders.forEach((h, i) => {
        currentPage.drawText(h, {
          x: lX + 5,
          y: y - 12,
          size: 7.5,
          font: fontBold,
          color: navyDark,
        });
        lX += lColWidths[i];
      });
      y -= 18;

      // 3. Draw Employees for this Company
      group.list.forEach((emp, subIdx) => {
        globalLeftIdx++;
        ensureSpace(18);
        const rowBg = subIdx % 2 === 1 ? zebraBg : white;
        currentPage.drawRectangle({
          x: margin,
          y: y - 18,
          width: contentWidth,
          height: 18,
          color: rowBg,
          borderColor: lineBorder,
          borderWidth: 0.5,
        });

        let cX = margin;
        // #
        currentPage.drawText(String(globalLeftIdx), { x: cX + 5, y: y - 12, size: 7.5, font: fontRegular, color: textMuted });
        cX += lColWidths[0];

        // Emp Code
        currentPage.drawText(emp.employeeCode || "-", { x: cX + 5, y: y - 12, size: 7.5, font: fontBold, color: redDark });
        cX += lColWidths[1];

        // Name
        const cleanName = (emp.name || "-").slice(0, 30);
        currentPage.drawText(cleanName, { x: cX + 5, y: y - 12, size: 7.5, font: fontBold, color: textDark });
        cX += lColWidths[2];

        // Joined Date
        const joinDate = formatReportDate(emp.dateOfJoining);
        currentPage.drawText(joinDate, { x: cX + 5, y: y - 12, size: 7, font: fontRegular, color: textDark });
        cX += lColWidths[3];

        // Tenure
        const tenure = calculateTenure(emp.dateOfJoining, emp.dateOfLeaving);
        currentPage.drawText(tenure, { x: cX + 5, y: y - 12, size: 7.5, font: fontRegular, color: textDark });
        cX += lColWidths[4];

        // Leaving Date
        const leaveDate = formatReportDate(emp.dateOfLeaving || date);
        currentPage.drawText(leaveDate, { x: cX + 5, y: y - 12, size: 7, font: fontRegular, color: textMuted });

        y -= 18;
      });

      y -= 8;
    }
  }

  // Draw Page Footers
  const totalPages = pages.length;
  pages.forEach((p, pIdx) => {
    p.drawRectangle({
      x: margin,
      y: bottomMargin - 4,
      width: contentWidth,
      height: 0.5,
      color: lineBorder,
    });

    p.drawText(`Joy Corporate Solutions · Confidential Internal HRMS Report · Generated via ${generatedBy}`, {
      x: margin,
      y: bottomMargin - 15,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });

    const pageStr = `Page ${pIdx + 1} of ${totalPages}`;
    const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 7);
    p.drawText(pageStr, {
      x: margin + contentWidth - pageStrWidth,
      y: bottomMargin - 15,
      size: 7,
      font: fontBold,
      color: textMuted,
    });
  });

  return pdf.save();
}
