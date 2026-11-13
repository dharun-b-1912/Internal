import { strToU8, zipSync } from "fflate";

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

  // Determine dynamic comfortable column widths matching content
  const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const colWidths = Array.from({ length: maxCols }, (_, colIdx) => {
    let maxLen = 8;
    for (const row of rows) {
      const cell = row[colIdx];
      if (cell !== null && cell !== undefined) {
        maxLen = Math.max(maxLen, String(cell).length);
      }
    }
    // Add comfortable padding of 3, bounded between 10 and 32 characters
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
