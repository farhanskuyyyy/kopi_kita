import { httpClient } from "@/lib/api/httpClient";
import {
  CategorySchema,
  ProductDetailSchema,
  ProductListResultSchema,
  type Category,
  type ProductDetail,
  type ProductListResult,
} from "../schemas/catalog.schemas";
import { z } from "zod";

export interface ListProductsParams {
  category?: string;
  q?: string;
  price_min?: number;
  price_max?: number;
  tags?: string[];
  availability?: "in_stock_only" | "all";
  sort?: "price_asc" | "price_desc" | "popularity";
  page?: number;
  limit?: number;
}

export async function listCategories(): Promise<Category[]> {
  const data = await httpClient.get<{ items: unknown[] }>("/categories");
  return z.array(CategorySchema).parse(data.items);
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const data = await httpClient.get<unknown>(`/categories/${encodeURIComponent(slug)}`);
  return CategorySchema.parse(data);
}

export async function listProducts(params: ListProductsParams = {}): Promise<ProductListResult> {
  const data = await httpClient.get<unknown>("/products", { query: { ...params } });
  return ProductListResultSchema.parse(data);
}

export async function getProduct(productId: string): Promise<ProductDetail> {
  const data = await httpClient.get<unknown>(`/products/${encodeURIComponent(productId)}`);
  return ProductDetailSchema.parse(data);
}
