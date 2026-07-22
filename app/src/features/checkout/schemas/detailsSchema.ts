import { z } from "zod";

const PHONE_RE = /^\+?[0-9]{8,15}$/;
const POSTAL_RE = /^[0-9]{4,10}$/;

export const detailsSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z.string().trim().regex(PHONE_RE, "Enter a valid phone number (8–15 digits)."),
    fulfillmentMethod: z.enum(["pickup", "dine-in", "delivery"]),
    addressLine1: z.string().trim().optional().or(z.literal("")),
    addressLine2: z.string().trim().optional().or(z.literal("")),
    addressCity: z.string().trim().optional().or(z.literal("")),
    addressPostalCode: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "delivery") {
      if (!data.addressLine1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressLine1"], message: "Address line 1 is required." });
      }
      if (!data.addressCity) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressCity"], message: "City is required." });
      }
      if (!data.addressPostalCode || !POSTAL_RE.test(data.addressPostalCode)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressPostalCode"], message: "Enter a valid postal code (4–10 digits)." });
      }
    }
  });

export type DetailsFormValues = z.infer<typeof detailsSchema>;
