import { httpClient } from "@/lib/api/httpClient";
import {
  ProductDetailSchema,
  ProductListResultSchema,
  CustomizationGroupSchema,
  type ProductDetail,
  type ProductListResult,
  type CustomizationGroup,
} from "@/features/catalog/schemas/catalog.schemas";

export interface AdminListProductsParams {
  search?: string;
  category?: string;
  availability?: "in_stock" | "out_of_stock" | "all";
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductFormPayload {
  name: string;
  categoryId: string;
  price: number;
  description: string;
  image?: string | null;
  available?: boolean;
  customizationGroups?: CustomizationGroup[];
}

export async function adminListProducts(params: AdminListProductsParams = {}): Promise<ProductListResult> {
  const data = await httpClient.get<unknown>("/admin/products", { query: { ...params }, domain: "staff" });
  return ProductListResultSchema.parse(data);
}

export async function adminGetProduct(productId: string): Promise<ProductDetail> {
  const data = await httpClient.get<unknown>(`/admin/products/${encodeURIComponent(productId)}`, { domain: "staff" });
  return ProductDetailSchema.parse(data);
}

export async function adminCreateProduct(payload: ProductFormPayload): Promise<ProductDetail> {
  const data = await httpClient.post<unknown>("/admin/products", payload, { domain: "staff" });
  return ProductDetailSchema.parse(data);
}

export async function adminUpdateProduct(productId: string, payload: ProductFormPayload): Promise<ProductDetail> {
  const data = await httpClient.put<unknown>(`/admin/products/${encodeURIComponent(productId)}`, payload, { domain: "staff" });
  return ProductDetailSchema.parse(data);
}

export async function adminDeleteProduct(productId: string): Promise<ProductDetail> {
  const data = await httpClient.delete<unknown>(`/admin/products/${encodeURIComponent(productId)}`, { domain: "staff" });
  return ProductDetailSchema.parse(data);
}

export async function adminRestoreProduct(productId: string): Promise<ProductDetail> {
  const data = await httpClient.post<unknown>(`/admin/products/${encodeURIComponent(productId)}/restore`, undefined, {
    domain: "staff",
  });
  return ProductDetailSchema.parse(data);
}

export async function adminToggleAvailability(productId: string, available: boolean): Promise<ProductDetail> {
  const data = await httpClient.patch<unknown>(
    `/admin/products/${encodeURIComponent(productId)}/availability`,
    { available },
    { domain: "staff" },
  );
  return ProductDetailSchema.parse(data);
}

export { CustomizationGroupSchema };
