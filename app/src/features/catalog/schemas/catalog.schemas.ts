import { z } from "zod";

/**
 * Zod schemas the catalog adapter parses mock responses through (Frontend-Architecture §4).
 * Other features import the *inferred types* here, never mocks/types.ts directly.
 */

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  productCount: z.number().optional().default(0),
});
export type Category = z.infer<typeof CategorySchema>;

export const CustomizationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceDelta: z.number(),
});
export type CustomizationOption = z.infer<typeof CustomizationOptionSchema>;

export const CustomizationGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["single", "multi"]),
  required: z.boolean(),
  options: z.array(CustomizationOptionSchema),
});
export type CustomizationGroup = z.infer<typeof CustomizationGroupSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  basePrice: z.number(),
  image: z.string().nullable(),
  tags: z.array(z.string()),
  available: z.boolean(),
  isDeleted: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductDetailSchema = ProductSchema.extend({
  description: z.string(),
  images: z.array(z.string()),
  customizationGroups: z.array(CustomizationGroupSchema).default([]),
  lastUpdatedAt: z.string().nullable(),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const ProductListResultSchema = z.object({
  items: z.array(ProductSchema),
  pagination: PaginationMetaSchema.optional(),
});
export type ProductListResult = z.infer<typeof ProductListResultSchema>;
