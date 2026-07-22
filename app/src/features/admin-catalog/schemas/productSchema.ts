import { z } from "zod";

export const optionSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Option label is required."),
  priceDelta: z.coerce.number().min(0, "Price delta must be 0 or more."),
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Group name is required."),
  type: z.enum(["single", "multi"]),
  required: z.boolean(),
  options: z.array(optionSchema).min(1, "Add at least one option."),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  categoryId: z.string().min(1, "Category is required."),
  price: z.coerce.number().gt(0, "Price must be greater than 0."),
  description: z.string().trim().min(1, "Description is required."),
  available: z.boolean(),
  customizationGroups: z.array(groupSchema),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;
