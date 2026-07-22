import { z } from "zod";

export const StoreHoursSchema = z.object({
  day: z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]),
  openTime: z.string(),
  closeTime: z.string(),
});
export type StoreHours = z.infer<typeof StoreHoursSchema>;

export const StoreInfoSchema = z.object({
  hours: z.array(StoreHoursSchema),
  address: z.string(),
  phone: z.string(),
  mapPlaceholderUrl: z.string().nullable().optional(),
});
export type StoreInfo = z.infer<typeof StoreInfoSchema>;
