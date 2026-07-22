import { httpClient } from "@/lib/api/httpClient";
import {
  CustomerAuthResultSchema,
  StaffAuthResultSchema,
  UserSchema,
  StaffUserSchema,
  type CustomerAuthResult,
  type StaffAuthResult,
  type User,
  type StaffUser,
} from "../schemas/auth.schemas";
import { z } from "zod";

export async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<CustomerAuthResult> {
  const data = await httpClient.post<unknown>("/auth/customer/register", input);
  return CustomerAuthResultSchema.parse(data);
}

export async function loginCustomer(input: { email: string; password: string; rememberMe?: boolean }): Promise<CustomerAuthResult> {
  const data = await httpClient.post<unknown>("/auth/customer/login", input);
  return CustomerAuthResultSchema.parse(data);
}

export async function loginStaff(input: { username: string; password: string }): Promise<StaffAuthResult> {
  const data = await httpClient.post<unknown>("/auth/staff/login", input);
  return StaffAuthResultSchema.parse(data);
}

export async function getCurrentSession(
  domain: "customer" | "staff",
): Promise<{ domain: "customer" | "staff"; user?: User; staffUser?: StaffUser }> {
  const data = await httpClient.get<unknown>("/auth/me", { query: { domain }, domain });
  return z
    .object({ domain: z.enum(["customer", "staff"]), user: UserSchema.optional(), staffUser: StaffUserSchema.optional() })
    .parse(data);
}

export async function logout(domain: "customer" | "staff"): Promise<void> {
  await httpClient.post<{ loggedOut: boolean }>("/auth/logout", { domain }, { domain });
}
