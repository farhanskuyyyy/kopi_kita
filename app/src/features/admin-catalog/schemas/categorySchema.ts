import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
