/**
 * IDR currency formatting — Frontend-Architecture.md §7 / spec §3.5 (A9).
 * `Rp 45.000` — Intl.NumberFormat('id-ID'), 0 fraction digits. Used everywhere a
 * price/subtotal/tax/discount/total renders; never format currency inline elsewhere.
 */
const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  return formatter.format(amount).replace(/\s+/g, " ").replace("Rp", "Rp ").replace(/\s+/g, " ").trim();
}
