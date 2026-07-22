import { httpClient } from "@/lib/api/httpClient";
import { CategorySchema, type Category } from "@/features/catalog/schemas/catalog.schemas";
import { z } from "zod";

export async function adminListCategories(params: { search?: string } = {}): Promise<Category[]> {
  const data = await httpClient.get<{ items: unknown[] }>("/admin/categories", { query: params, domain: "staff" });
  return z.array(CategorySchema).parse(data.items);
}

export async function adminGetCategory(categoryId: string): Promise<Category> {
  const data = await httpClient.get<unknown>(`/admin/categories/${encodeURIComponent(categoryId)}`, { domain: "staff" });
  return CategorySchema.parse(data);
}

export async function adminCreateCategory(name: string): Promise<Category> {
  const data = await httpClient.post<unknown>("/admin/categories", { name }, { domain: "staff" });
  return CategorySchema.parse(data);
}

export async function adminUpdateCategory(categoryId: string, name: string): Promise<Category> {
  const data = await httpClient.put<unknown>(`/admin/categories/${encodeURIComponent(categoryId)}`, { name }, { domain: "staff" });
  return CategorySchema.parse(data);
}

export async function adminDeleteCategory(categoryId: string): Promise<{ deleted: boolean }> {
  return httpClient.delete<{ deleted: boolean }>(`/admin/categories/${encodeURIComponent(categoryId)}`, { domain: "staff" });
}
