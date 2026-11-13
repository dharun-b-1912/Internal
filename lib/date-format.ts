/**
 * Standard date formatting utility for Joy Payroll frontend.
 * Enforces DD-MM-YYYY across all user-facing views, tables, and documents.
 */

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—" || dateStr === "-") return "—";
  const str = String(dateStr).trim();
  if (!str) return "—";
  
  // Handle DD/MM/YYYY format -> convert to DD-MM-YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split("/");
    return `${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[2]}`;
  }
  
  // Match ISO format YYYY-MM-DD -> convert to DD-MM-YYYY
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}-${m}-${y}`;
  }

  // Handle DD-MM-YYYY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  }

  return str;
}

export function formatDisplayDateTime(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return formatDisplayDate(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return formatDisplayDate(isoStr);
  }
}

export function formatIsoDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === "—" || dateStr === "-") return "";
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}
