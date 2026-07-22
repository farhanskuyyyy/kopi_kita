import type { CustomizationGroup } from "@/features/catalog/schemas/catalog.schemas";

/**
 * D4 owning mechanism (Frontend-Architecture §3): unit price = base + Σ(selected option
 * deltas), computed at add-to-cart time and frozen on the cart line — never recomputed
 * later, so historical order lines keep the price they were added at.
 */
export function computeUnitPrice(basePrice: number, groups: CustomizationGroup[], selectedOptionIds: string[]): number {
  let total = basePrice;
  for (const group of groups) {
    for (const option of group.options) {
      if (selectedOptionIds.includes(option.id)) {
        total += option.priceDelta;
      }
    }
  }
  return total;
}

export function summarizeSelection(groups: CustomizationGroup[], selectedOptionIds: string[]): string | null {
  const labels: string[] = [];
  for (const group of groups) {
    for (const option of group.options) {
      if (selectedOptionIds.includes(option.id)) {
        labels.push(group.type === "multi" ? `+${option.label}` : option.label);
      }
    }
  }
  return labels.length > 0 ? labels.join(", ") : null;
}
