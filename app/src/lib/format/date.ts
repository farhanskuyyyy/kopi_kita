/**
 * Locale id-ID date/time formatting — spec §3.5. Dates: `DD MMM YYYY`. Timestamps:
 * `DD MMM YYYY HH:mm` (24-hour). Every order/date/timestamp render goes through here.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDate(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";
  return `${formatDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
