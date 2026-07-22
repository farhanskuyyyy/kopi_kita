import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  memberSince: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const StaffRoleSchema = z.enum(["catalog-admin", "fulfillment-staff"]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;

export const StaffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: StaffRoleSchema,
});
export type StaffUser = z.infer<typeof StaffUserSchema>;

export const CustomerAuthResultSchema = z.object({
  user: UserSchema,
  sessionToken: z.string(),
});
export type CustomerAuthResult = z.infer<typeof CustomerAuthResultSchema>;

export const StaffAuthResultSchema = z.object({
  staffUser: StaffUserSchema,
  sessionToken: z.string(),
});
export type StaffAuthResult = z.infer<typeof StaffAuthResultSchema>;
