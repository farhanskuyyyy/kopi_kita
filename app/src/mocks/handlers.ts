/**
 * MSW v2 request handlers implementing every endpoint in API-Contract.yaml (40 total) over
 * the in-memory store in `db.ts`. This is the ONLY module (besides `browser.ts`) that a
 * Stage-6 bootstrap file should import from `mocks/` — feature code must go through the
 * adapter/httpClient chain (Frontend-Architecture §4), never straight to MSW internals.
 *
 * Response envelope, error codes, and status codes follow API-Contract.yaml exactly.
 * Cross-referenced rules: D1–D8 and A1–A12 (Frontend-Specification.md §1–2), §3 cross-
 * cutting rules, §3.11 order-status state machine.
 */

import { http, HttpResponse } from "msw";
import {
  applyStaffStatusChange,
  categoryDTO,
  computeUnitPrice,
  createSession,
  customizationSummary,
  db,
  destroySession,
  extractBearerToken,
  findCategoryById,
  findCategoryBySlug,
  findProductById,
  genId,
  getSession,
  manualAdvanceStatus,
  paginate,
  startAutoProgression,
  toProductDTO,
  toProductDetailDTO,
} from "./db";
import {
  applyLatency,
  shouldForceNetworkError,
  shouldForcePaymentFailed,
  shouldForceServerError,
  shouldForceStockUnavailable,
} from "./scenarios";
import type {
  CartLineInput,
  CartLineValidated,
  CustomizationGroup,
  FieldError,
  Meta,
  Order,
  OrderCreateRequest,
  OrderLine,
  OrderStatus,
  OrderSummary,
  StoredCustomer,
  StoredProduct,
  StoredStaffUser,
  StaffRole,
  UnavailableItem,
} from "./types";

const BASE = "/api/v1";

// ---------------------------------------------------------------------------
// Envelope helpers
// ---------------------------------------------------------------------------

function buildMeta(extra?: Partial<Meta>): Meta {
  return {
    requestId: genId("req"),
    timestamp: new Date().toISOString(),
    durationMs: Math.floor(Math.random() * 20) + 1,
    ...extra,
  };
}

function ok<T>(data: T, status = 200, metaExtra?: Partial<Meta>): Response {
  return HttpResponse.json({ success: true, data, error: null, meta: buildMeta(metaExtra) }, { status });
}

function fail(status: number, code: string, message: string, details: unknown = null, fieldErrors: FieldError[] | null = null): Response {
  return HttpResponse.json(
    { success: false, data: null, error: { code, message, details, fieldErrors }, meta: buildMeta() },
    { status },
  );
}

/** Wraps every handler with: forced-network-error check, latency, forced-500 check. */
async function withCommonBehavior(request: Request, fn: () => Promise<Response> | Response): Promise<Response> {
  if (shouldForceNetworkError(request)) {
    return HttpResponse.error();
  }
  await applyLatency(request);
  if (shouldForceServerError(request)) {
    return fail(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
  return fn();
}

// ---------------------------------------------------------------------------
// Validation helpers (§3.10)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;
const POSTAL_RE = /^[0-9]{4,10}$/;
const PAYMENT_METHODS = ["demo_credit_card", "demo_cash_on_pickup", "demo_e_wallet", "demo_declined_card"];
const FULFILLMENT_METHODS = ["pickup", "dine-in", "delivery"];
const ORDER_STATUSES: OrderStatus[] = ["received", "preparing", "ready", "completed"];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function getAuthedCustomer(request: Request): StoredCustomer | null {
  const session = getSession(extractBearerToken(request));
  if (!session || session.domain !== "customer") return null;
  return db.customers.find((c) => c.id === session.ownerId) ?? null;
}

function getAuthedStaff(request: Request): StoredStaffUser | null {
  const session = getSession(extractBearerToken(request));
  if (!session || session.domain !== "staff") return null;
  return db.staffUsers.find((s) => s.id === session.ownerId) ?? null;
}

function requireCustomer(request: Request): { customer: StoredCustomer } | { error: Response } {
  const customer = getAuthedCustomer(request);
  if (!customer) return { error: fail(401, "SESSION_EXPIRED", "Session expired, please log in again.") };
  return { customer };
}

function requireStaffAuth(request: Request): { staff: StoredStaffUser } | { error: Response } {
  const staff = getAuthedStaff(request);
  if (!staff) return { error: fail(401, "SESSION_EXPIRED", "Session expired, please log in again.") };
  return { staff };
}

function requireStaffRole(request: Request, role: StaffRole): { staff: StoredStaffUser } | { error: Response } {
  const authed = requireStaffAuth(request);
  if ("error" in authed) return authed;
  if (authed.staff.role !== role) return { error: fail(403, "FORBIDDEN_ROLE", "You do not have access to this section.") };
  return authed;
}

function sanitizeCustomer(customer: StoredCustomer) {
  const { password: _password, ...user } = customer;
  return user;
}

function sanitizeStaff(staff: StoredStaffUser) {
  const { username: _u, password: _p, ...staffUser } = staff;
  return staffUser;
}

// ---------------------------------------------------------------------------
// Shared line/order builders
// ---------------------------------------------------------------------------

function validateCartLine(
  line: CartLineInput,
  forceUnavailable: boolean,
): CartLineValidated {
  if (!line?.productId || !Number.isInteger(line.quantity) || line.quantity < 1) {
    return {
      productId: line?.productId ?? "unknown",
      name: "Unknown item",
      customizationSummary: null,
      unitPrice: 0,
      quantity: line?.quantity ?? 0,
      lineTotal: 0,
      available: false,
      unavailableReason: "Invalid line item.",
    };
  }
  const product = findProductById(line.productId);
  if (!product || product.isDeleted) {
    return {
      productId: line.productId,
      name: product?.name ?? "Unknown item",
      customizationSummary: null,
      unitPrice: 0,
      quantity: line.quantity,
      lineTotal: 0,
      available: false,
      unavailableReason: "This item is no longer available.",
    };
  }
  const unitPrice = computeUnitPrice(product, line.selectedOptionIds);
  const available = product.available && !forceUnavailable;
  return {
    productId: product.id,
    name: product.name,
    customizationSummary: customizationSummary(product, line.selectedOptionIds),
    unitPrice,
    quantity: line.quantity,
    lineTotal: unitPrice * line.quantity,
    available,
    unavailableReason: available ? null : "This item is currently out of stock.",
  };
}

function orderToSummary(order: Order, includeCustomerName: boolean): OrderSummary {
  const base: OrderSummary = {
    id: order.id,
    placedAt: order.createdAt,
    status: order.status,
    total: order.total,
    itemCount: order.lines.reduce((sum, l) => sum + l.quantity, 0),
    fulfillmentMethod: order.fulfillmentMethod,
  };
  if (includeCustomerName) base.customerName = order.customer.name;
  return base;
}

function resolvePromoDiscount(code: string | null | undefined, subtotal: number): number {
  if (!code) return 0;
  const promo = db.promos.find((p) => p.code.toLowerCase() === code.toLowerCase() && p.active);
  if (!promo) return 0;
  return promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // ===== AUTH =================================================================
  http.post(`${BASE}/auth/customer/register`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as Partial<{
        name: string;
        email: string;
        password: string;
        confirmPassword: string;
      }> | null;
      const fieldErrors: FieldError[] = [];
      if (!body?.name?.trim()) fieldErrors.push({ field: "name", message: "Name is required." });
      if (!body?.email || !EMAIL_RE.test(body.email)) fieldErrors.push({ field: "email", message: "Enter a valid email address." });
      if (!body?.password || body.password.length < 8) fieldErrors.push({ field: "password", message: "Password must be at least 8 characters." });
      if (body?.password !== body?.confirmPassword) fieldErrors.push({ field: "confirmPassword", message: "Passwords do not match." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const existing = db.customers.find((c) => c.email.toLowerCase() === body!.email!.toLowerCase());
      if (existing) {
        return fail(409, "EMAIL_EXISTS", "An account with this email already exists.", null, [
          { field: "email", message: "An account with this email already exists." },
        ]);
      }
      const customer: StoredCustomer = {
        id: genId("user"),
        name: body!.name!.trim(),
        email: body!.email!,
        phone: null,
        memberSince: new Date().toISOString(),
        password: body!.password!,
      };
      db.customers.push(customer);
      const sessionToken = createSession("customer", customer.id);
      return ok({ user: sanitizeCustomer(customer), sessionToken }, 201);
    }),
  ),

  http.post(`${BASE}/auth/customer/login`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as Partial<{ email: string; password: string }> | null;
      const fieldErrors: FieldError[] = [];
      if (!body?.email || !EMAIL_RE.test(body.email)) fieldErrors.push({ field: "email", message: "Enter a valid email address." });
      if (!body?.password) fieldErrors.push({ field: "password", message: "Password is required." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const customer = db.customers.find((c) => c.email.toLowerCase() === body!.email!.toLowerCase());
      if (!customer || customer.password !== body!.password) {
        return fail(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
      }
      const sessionToken = createSession("customer", customer.id);
      return ok({ user: sanitizeCustomer(customer), sessionToken });
    }),
  ),

  http.post(`${BASE}/auth/staff/login`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as Partial<{ username: string; password: string }> | null;
      const fieldErrors: FieldError[] = [];
      if (!body?.username?.trim()) fieldErrors.push({ field: "username", message: "Username is required." });
      if (!body?.password) fieldErrors.push({ field: "password", message: "Password is required." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const staff = db.staffUsers.find((s) => s.username.toLowerCase() === body!.username!.trim().toLowerCase());
      if (!staff || staff.password !== body!.password) {
        return fail(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
      }
      const sessionToken = createSession("staff", staff.id);
      return ok({ staffUser: sanitizeStaff(staff), sessionToken });
    }),
  ),

  http.get(`${BASE}/auth/me`, ({ request }) =>
    withCommonBehavior(request, () => {
      const url = new URL(request.url);
      const domain = url.searchParams.get("domain");
      if (domain === "customer") {
        const customer = getAuthedCustomer(request);
        if (!customer) return fail(401, "SESSION_EXPIRED", "Session expired, please log in again.");
        return ok({ domain: "customer", user: sanitizeCustomer(customer) });
      }
      if (domain === "staff") {
        const staff = getAuthedStaff(request);
        if (!staff) return fail(401, "SESSION_EXPIRED", "Session expired, please log in again.");
        return ok({ domain: "staff", staffUser: sanitizeStaff(staff) });
      }
      return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
        { field: "domain", message: 'domain must be "customer" or "staff".' },
      ]);
    }),
  ),

  http.post(`${BASE}/auth/logout`, ({ request }) =>
    withCommonBehavior(request, () => {
      destroySession(extractBearerToken(request));
      return ok({ loggedOut: true });
    }),
  ),

  // ===== CATALOG (public) ======================================================
  http.get(`${BASE}/categories`, ({ request }) =>
    withCommonBehavior(request, () => ok({ items: db.categories.map(categoryDTO) })),
  ),

  http.get(`${BASE}/categories/:categorySlug`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const category = findCategoryBySlug(String(params.categorySlug));
      if (!category) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(categoryDTO(category));
    }),
  ),

  http.get(`${BASE}/products`, ({ request }) =>
    withCommonBehavior(request, () => {
      const url = new URL(request.url);
      const categorySlug = url.searchParams.get("category");
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      let priceMin = url.searchParams.get("price_min") !== null ? Number(url.searchParams.get("price_min")) : undefined;
      let priceMax = url.searchParams.get("price_max") !== null ? Number(url.searchParams.get("price_max")) : undefined;
      const tags = url.searchParams.getAll("tags");
      const availability = url.searchParams.get("availability") ?? "all";
      const sortParam = url.searchParams.get("sort");
      const sort = sortParam && ["price_asc", "price_desc", "popularity"].includes(sortParam) ? sortParam : "popularity";
      const page = Number(url.searchParams.get("page") ?? "1") || 1;
      const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "20") || 20);

      let filterNotice: string | undefined;
      if (priceMin !== undefined && priceMax !== undefined && !Number.isNaN(priceMin) && !Number.isNaN(priceMax) && priceMin > priceMax) {
        filterNotice = "Price filter was invalid (min greater than max) and has been reset.";
        priceMin = undefined;
        priceMax = undefined;
      }

      let products: StoredProduct[] = db.products.filter((p) => !p.isDeleted);
      if (categorySlug) {
        const category = findCategoryBySlug(categorySlug);
        products = category ? products.filter((p) => p.categoryId === category.id) : [];
      }
      if (q) products = products.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      if (priceMin !== undefined && !Number.isNaN(priceMin)) products = products.filter((p) => p.basePrice >= priceMin!);
      if (priceMax !== undefined && !Number.isNaN(priceMax)) products = products.filter((p) => p.basePrice <= priceMax!);
      if (tags.length) products = products.filter((p) => tags.some((t) => p.tags.includes(t)));
      if (availability === "in_stock_only") products = products.filter((p) => p.available);

      const sorted = [...products].sort((a, b) => {
        if (sort === "price_asc") return a.basePrice - b.basePrice;
        if (sort === "price_desc") return b.basePrice - a.basePrice;
        return b.popularity - a.popularity;
      });

      const { items, pagination } = paginate(sorted.map(toProductDTO), page, limit);
      return ok({ items, pagination }, 200, filterNotice ? { filterNotice } : undefined);
    }),
  ),

  http.get(`${BASE}/products/:productId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const product = findProductById(String(params.productId));
      if (!product || product.isDeleted) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(toProductDetailDTO(product));
    }),
  ),

  // ===== CART ==================================================================
  http.post(`${BASE}/cart/validate`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as { lines?: CartLineInput[] } | null;
      if (!body || !Array.isArray(body.lines)) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
          { field: "lines", message: "lines is required." },
        ]);
      }
      const forceUnavailable = shouldForceStockUnavailable(request);
      const lines = body.lines.map((line) => validateCartLine(line, forceUnavailable));
      const allAvailable = lines.every((l) => l.available);
      const subtotal = lines.filter((l) => l.available).reduce((sum, l) => sum + l.lineTotal, 0);
      return ok({ lines, allAvailable, subtotal });
    }),
  ),

  http.post(`${BASE}/promo/validate`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as { code?: string; subtotal?: number } | null;
      if (!body || typeof body.code !== "string" || !body.code.trim() || typeof body.subtotal !== "number" || body.subtotal < 0) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
          { field: !body?.code ? "code" : "subtotal", message: "This field is required." },
        ]);
      }
      const promo = db.promos.find((p) => p.code.toLowerCase() === body.code!.trim().toLowerCase() && p.active);
      if (!promo) {
        return ok({
          valid: false,
          code: body.code,
          type: null,
          value: null,
          discountAmount: 0,
          message: "This promo code is not valid or has expired.",
        });
      }
      const discountAmount = promo.type === "percent" ? Math.round((body.subtotal * promo.value) / 100) : Math.min(promo.value, body.subtotal);
      return ok({ valid: true, code: promo.code, type: promo.type, value: promo.value, discountAmount, message: null });
    }),
  ),

  // ===== CHECKOUT / ORDERS =====================================================
  http.post(`${BASE}/checkout/payment/validate`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as { paymentMethod?: string } | null;
      if (!body || !PAYMENT_METHODS.includes(body.paymentMethod ?? "")) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
          { field: "paymentMethod", message: "Select a valid payment method." },
        ]);
      }
      if (body.paymentMethod === "demo_declined_card" || shouldForcePaymentFailed(request)) {
        return fail(402, "PAYMENT_FAILED", "Demo payment declined — no real charge occurred. Please try another method.");
      }
      return ok({ valid: true });
    }),
  ),

  http.post(`${BASE}/orders`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const body = (await request.json().catch(() => null)) as OrderCreateRequest | null;
      const fieldErrors: FieldError[] = [];
      const d = body?.details;
      if (!d) {
        fieldErrors.push({ field: "details", message: "Checkout details are required." });
      } else {
        if (!d.fullName?.trim()) fieldErrors.push({ field: "details.fullName", message: "Full name is required." });
        if (!d.email || !EMAIL_RE.test(d.email)) fieldErrors.push({ field: "details.email", message: "Enter a valid email address." });
        if (!d.phone || !PHONE_RE.test(d.phone)) fieldErrors.push({ field: "details.phone", message: "Enter a valid phone number." });
        if (!FULFILLMENT_METHODS.includes(d.fulfillmentMethod)) {
          fieldErrors.push({ field: "details.fulfillmentMethod", message: "Select a fulfillment method." });
        } else if (d.fulfillmentMethod === "delivery") {
          if (!d.address?.line1?.trim()) fieldErrors.push({ field: "details.address.line1", message: "Address line 1 is required." });
          if (!d.address?.city?.trim()) fieldErrors.push({ field: "details.address.city", message: "City is required." });
          if (!d.address?.postalCode || !POSTAL_RE.test(d.address.postalCode)) {
            fieldErrors.push({ field: "details.address.postalCode", message: "Enter a valid postal code." });
          }
        }
      }
      if (!body?.paymentMethod || !PAYMENT_METHODS.includes(body.paymentMethod)) {
        fieldErrors.push({ field: "paymentMethod", message: "Select a valid payment method." });
      }
      if (!body?.lines?.length) fieldErrors.push({ field: "lines", message: "Your cart is empty." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const forceUnavailable = shouldForceStockUnavailable(request);
      const unavailableLines: UnavailableItem[] = [];
      const orderLines: OrderLine[] = [];
      for (const line of body!.lines) {
        const product = findProductById(line.productId);
        if (!product || product.isDeleted || !product.available || forceUnavailable) {
          unavailableLines.push({ productId: line.productId, name: product?.name ?? line.productId });
          continue;
        }
        const unitPrice = computeUnitPrice(product, line.selectedOptionIds);
        orderLines.push({
          productId: product.id,
          name: product.name,
          customizationSummary: customizationSummary(product, line.selectedOptionIds),
          unitPrice,
          quantity: line.quantity,
          lineTotal: unitPrice * line.quantity,
        });
      }
      if (unavailableLines.length) {
        return fail(409, "STOCK_UNAVAILABLE", "Some items in your cart are no longer available.", { unavailableLines });
      }
      // Defensive guard: forced/edge scenario must never silently create a "charged" order,
      // even though normal declined-card handling happens earlier at /checkout/payment/validate.
      if (body!.paymentMethod === "demo_declined_card" || shouldForcePaymentFailed(request)) {
        return fail(402, "PAYMENT_FAILED", "Demo payment declined — no real charge occurred. Please try another method.");
      }

      const subtotal = orderLines.reduce((sum, l) => sum + l.lineTotal, 0);
      const tax = Math.round(subtotal * 0.1);
      const discount = resolvePromoDiscount(body!.promoCode, subtotal);
      const total = Math.max(0, subtotal + tax - discount);
      const authedCustomer = getAuthedCustomer(request);
      const details = body!.details;

      const order: Order = {
        id: genId("order"),
        status: "received",
        createdAt: new Date().toISOString(),
        estimatedReadyAt: new Date(Date.now() + (details.fulfillmentMethod === "delivery" ? 40 : 15) * 60_000).toISOString(),
        lastStatusChangeAt: new Date().toISOString(),
        autoProgressionStopped: false,
        fulfillmentMethod: details.fulfillmentMethod,
        address: details.fulfillmentMethod === "delivery" ? details.address ?? null : null,
        paymentMethod: body!.paymentMethod,
        lines: orderLines,
        subtotal,
        tax,
        discount,
        total,
        customer: authedCustomer
          ? { name: details.fullName, email: details.email, phone: details.phone, isGuest: false, accountId: authedCustomer.id }
          : { name: details.fullName, email: details.email, phone: details.phone, isGuest: true, accountId: null },
        promoCode: body!.promoCode ?? null,
      };
      db.orders.push(order);
      startAutoProgression(order.id);
      return ok(order, 201);
    }),
  ),

  http.get(`${BASE}/orders/:orderId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const order = db.orders.find((o) => o.id === params.orderId);
      if (!order) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(order);
    }),
  ),

  // ===== ACCOUNT ===============================================================
  http.get(`${BASE}/account/profile`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      return ok(sanitizeCustomer(check.customer));
    }),
  ),

  http.put(`${BASE}/account/profile`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const body = (await request.json().catch(() => null)) as Partial<{ name: string; phone: string }> | null;
      const fieldErrors: FieldError[] = [];
      if (body?.name !== undefined && !body.name.trim()) fieldErrors.push({ field: "name", message: "Name cannot be empty." });
      if (body?.phone !== undefined && !PHONE_RE.test(body.phone)) fieldErrors.push({ field: "phone", message: "Enter a valid phone number." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);
      if (body?.name) check.customer.name = body.name.trim();
      if (body?.phone) check.customer.phone = body.phone;
      return ok(sanitizeCustomer(check.customer));
    }),
  ),

  http.get(`${BASE}/account/orders`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const url = new URL(request.url);
      const status = url.searchParams.get("status") ?? "all";
      const page = Number(url.searchParams.get("page") ?? "1") || 1;
      const limit = Number(url.searchParams.get("limit") ?? "20") || 20;

      let orders = db.orders.filter((o) => o.customer.accountId === check.customer.id);
      if (status === "active") orders = orders.filter((o) => o.status !== "completed");
      else if (status === "completed") orders = orders.filter((o) => o.status === "completed");
      orders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const { items, pagination } = paginate(
        orders.map((o) => orderToSummary(o, false)),
        page,
        limit,
      );
      return ok({ items, pagination });
    }),
  ),

  http.post(`${BASE}/account/orders/:orderId/reorder`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const order = db.orders.find((o) => o.id === params.orderId && o.customer.accountId === check.customer.id);
      if (!order) return fail(404, "NOT_FOUND", "The requested resource was not found.");

      const forceUnavailable = shouldForceStockUnavailable(request);
      const addedLines: CartLineValidated[] = [];
      const unavailableItems: UnavailableItem[] = [];
      for (const line of order.lines) {
        const product = findProductById(line.productId);
        if (!product || product.isDeleted || !product.available || forceUnavailable) {
          unavailableItems.push({ productId: line.productId, name: line.name });
          continue;
        }
        // Reorder adds a fresh cart line at the product's current price/customization
        // groups — it intentionally does NOT replay the historical frozen unitPrice,
        // since this is a new selection, not a re-display of the past order (D4 only
        // freezes price on the *original* line at add-to-cart time).
        addedLines.push({
          productId: product.id,
          name: product.name,
          customizationSummary: line.customizationSummary,
          unitPrice: product.basePrice,
          quantity: line.quantity,
          lineTotal: product.basePrice * line.quantity,
          available: true,
          unavailableReason: null,
        });
      }
      return ok({ addedLines, unavailableItems });
    }),
  ),

  http.get(`${BASE}/account/favorites`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const ids = db.favorites.get(check.customer.id) ?? new Set<string>();
      const items = [...ids]
        .map((id) => findProductById(id))
        .filter((p): p is StoredProduct => !!p)
        .map(toProductDTO);
      return ok({ items });
    }),
  ),

  http.post(`${BASE}/account/favorites`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const body = (await request.json().catch(() => null)) as { productId?: string } | null;
      if (!body?.productId) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
          { field: "productId", message: "productId is required." },
        ]);
      }
      const product = findProductById(body.productId);
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      if (!db.favorites.has(check.customer.id)) db.favorites.set(check.customer.id, new Set());
      db.favorites.get(check.customer.id)!.add(product.id);
      return ok(toProductDTO(product), 201);
    }),
  ),

  http.delete(`${BASE}/account/favorites/:productId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireCustomer(request);
      if ("error" in check) return check.error;
      const productId = String(params.productId);
      const product = findProductById(productId);
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      db.favorites.get(check.customer.id)?.delete(productId);
      return ok({ removed: true });
    }),
  ),

  // ===== STORE INFO ============================================================
  http.get(`${BASE}/store-info`, ({ request }) => withCommonBehavior(request, () => ok(db.storeInfo))),

  // ===== ADMIN DASHBOARD ========================================================
  http.get(`${BASE}/admin/dashboard/counts/products`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffAuth(request);
      if ("error" in check) return check.error;
      return ok({ count: db.products.filter((p) => !p.isDeleted).length });
    }),
  ),

  http.get(`${BASE}/admin/dashboard/counts/categories`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffAuth(request);
      if ("error" in check) return check.error;
      return ok({ count: db.categories.length });
    }),
  ),

  http.get(`${BASE}/admin/dashboard/counts/orders`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffAuth(request);
      if ("error" in check) return check.error;
      return ok({ count: db.orders.filter((o) => o.status !== "completed").length });
    }),
  ),

  // ===== ADMIN CATALOG — Products ==============================================
  http.get(`${BASE}/admin/products`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const url = new URL(request.url);
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const category = url.searchParams.get("category") ?? "";
      const availability = url.searchParams.get("availability") ?? "all";
      const includeDeleted = url.searchParams.get("includeDeleted") === "true";
      const page = Number(url.searchParams.get("page") ?? "1") || 1;
      const limit = Number(url.searchParams.get("limit") ?? "20") || 20;

      let products = db.products.filter((p) => includeDeleted || !p.isDeleted);
      if (search) products = products.filter((p) => p.name.toLowerCase().includes(search));
      if (category) {
        products = products.filter((p) => {
          const cat = findCategoryById(p.categoryId);
          return cat?.slug === category || p.categoryId === category;
        });
      }
      if (availability === "in_stock") products = products.filter((p) => p.available);
      else if (availability === "out_of_stock") products = products.filter((p) => !p.available);

      const { items, pagination } = paginate(products.map(toProductDTO), page, limit);
      return ok({ items, pagination });
    }),
  ),

  http.post(`${BASE}/admin/products`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const body = (await request.json().catch(() => null)) as Partial<{
        name: string;
        categoryId: string;
        price: number;
        description: string;
        image: string | null;
        available: boolean;
        customizationGroups: CustomizationGroup[];
      }> | null;
      const fieldErrors: FieldError[] = [];
      if (!body?.name?.trim()) fieldErrors.push({ field: "name", message: "Name is required." });
      if (!body?.categoryId) fieldErrors.push({ field: "categoryId", message: "Category is required." });
      if (typeof body?.price !== "number" || body.price <= 0) fieldErrors.push({ field: "price", message: "Price must be greater than 0." });
      if (!body?.description?.trim()) fieldErrors.push({ field: "description", message: "Description is required." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const category = findCategoryById(body!.categoryId!);
      if (!category) return fail(404, "NOT_FOUND", "The selected category no longer exists.");

      const stored: StoredProduct = {
        id: genId("prod"),
        name: body!.name!.trim(),
        categoryId: category.id,
        basePrice: body!.price!,
        image: body!.image ?? null,
        images: body!.image ? [body!.image] : [],
        tags: [],
        available: body!.available ?? true,
        isDeleted: false,
        description: body!.description!.trim(),
        customizationGroups: body!.customizationGroups ?? [],
        lastUpdatedAt: new Date().toISOString(),
        popularity: 0,
      };
      db.products.push(stored);
      return ok(toProductDetailDTO(stored), 201);
    }),
  ),

  http.get(`${BASE}/admin/products/:productId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const product = findProductById(String(params.productId));
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(toProductDetailDTO(product));
    }),
  ),

  http.put(`${BASE}/admin/products/:productId`, ({ request, params }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const product = findProductById(String(params.productId));
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      if (product.isDeleted) return fail(409, "PRODUCT_DELETED", "This product was deleted.");

      const body = (await request.json().catch(() => null)) as Partial<{
        name: string;
        categoryId: string;
        price: number;
        description: string;
        image: string | null;
        available: boolean;
        customizationGroups: CustomizationGroup[];
      }> | null;
      const fieldErrors: FieldError[] = [];
      if (!body?.name?.trim()) fieldErrors.push({ field: "name", message: "Name is required." });
      if (!body?.categoryId) fieldErrors.push({ field: "categoryId", message: "Category is required." });
      if (typeof body?.price !== "number" || body.price <= 0) fieldErrors.push({ field: "price", message: "Price must be greater than 0." });
      if (!body?.description?.trim()) fieldErrors.push({ field: "description", message: "Description is required." });
      if (fieldErrors.length) return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, fieldErrors);

      const category = findCategoryById(body!.categoryId!);
      if (!category) return fail(404, "NOT_FOUND", "Referenced category no longer exists.");

      product.name = body!.name!.trim();
      product.categoryId = category.id;
      product.basePrice = body!.price!;
      product.description = body!.description!.trim();
      if (body!.image !== undefined) {
        product.image = body!.image;
        product.images = body!.image ? [body!.image] : product.images;
      }
      if (body!.available !== undefined) product.available = body!.available;
      if (body!.customizationGroups !== undefined) product.customizationGroups = body!.customizationGroups;
      product.lastUpdatedAt = new Date().toISOString();
      return ok(toProductDetailDTO(product));
    }),
  ),

  http.delete(`${BASE}/admin/products/:productId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const product = findProductById(String(params.productId));
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      product.isDeleted = true; // soft delete (D2) — remains referenceable from historical orders
      product.lastUpdatedAt = new Date().toISOString();
      return ok(toProductDetailDTO(product));
    }),
  ),

  http.post(`${BASE}/admin/products/:productId/restore`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const product = findProductById(String(params.productId));
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      product.isDeleted = false;
      product.lastUpdatedAt = new Date().toISOString();
      return ok(toProductDetailDTO(product));
    }),
  ),

  http.patch(`${BASE}/admin/products/:productId/availability`, ({ request, params }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const product = findProductById(String(params.productId));
      if (!product) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      const body = (await request.json().catch(() => null)) as { available?: boolean } | null;
      if (typeof body?.available !== "boolean") {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [
          { field: "available", message: "available must be a boolean." },
        ]);
      }
      product.available = body.available;
      product.lastUpdatedAt = new Date().toISOString();
      return ok(toProductDetailDTO(product));
    }),
  ),

  // ===== ADMIN CATALOG — Categories =============================================
  http.get(`${BASE}/admin/categories`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const url = new URL(request.url);
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      let categories = db.categories;
      if (search) categories = categories.filter((c) => c.name.toLowerCase().includes(search));
      return ok({ items: categories.map(categoryDTO) });
    }),
  ),

  http.post(`${BASE}/admin/categories`, ({ request }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const body = (await request.json().catch(() => null)) as { name?: string } | null;
      if (!body?.name?.trim()) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [{ field: "name", message: "Name is required." }]);
      }
      const name = body.name.trim();
      const conflict = db.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (conflict) {
        return fail(409, "CATEGORY_NAME_EXISTS", `A category named '${name}' already exists.`, null, [
          { field: "name", message: `A category named '${name}' already exists.` },
        ]);
      }
      const category = { id: genId("cat"), name, slug: slugify(name), productCount: 0 };
      db.categories.push(category);
      return ok(categoryDTO(category), 201);
    }),
  ),

  http.get(`${BASE}/admin/categories/:categoryId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const category = findCategoryById(String(params.categoryId));
      if (!category) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(categoryDTO(category));
    }),
  ),

  http.put(`${BASE}/admin/categories/:categoryId`, ({ request, params }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const category = findCategoryById(String(params.categoryId));
      if (!category) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      const body = (await request.json().catch(() => null)) as { name?: string } | null;
      if (!body?.name?.trim()) {
        return fail(422, "VALIDATION_ERROR", "One or more fields are invalid.", null, [{ field: "name", message: "Name is required." }]);
      }
      const name = body.name.trim();
      const conflict = db.categories.find((c) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase());
      if (conflict) {
        return fail(409, "CATEGORY_NAME_EXISTS", `A category named '${name}' already exists.`, null, [
          { field: "name", message: `A category named '${name}' already exists.` },
        ]);
      }
      category.name = name; // slug intentionally kept stable — renames propagate via categoryName lookups
      return ok(categoryDTO(category));
    }),
  ),

  http.delete(`${BASE}/admin/categories/:categoryId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "catalog-admin");
      if ("error" in check) return check.error;
      const category = findCategoryById(String(params.categoryId));
      if (!category) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      const assignedProductCount = db.products.filter((p) => p.categoryId === category.id && !p.isDeleted).length;
      if (assignedProductCount > 0) {
        return fail(
          409,
          "CATEGORY_HAS_PRODUCTS",
          `This category has ${assignedProductCount} assigned products and cannot be deleted.`,
          { assignedProductCount, categoryId: category.id },
        );
      }
      db.categories = db.categories.filter((c) => c.id !== category.id);
      return ok({ deleted: true });
    }),
  ),

  // ===== ADMIN FULFILLMENT — Orders ============================================
  http.get(`${BASE}/admin/orders`, ({ request }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "fulfillment-staff");
      if ("error" in check) return check.error;
      const url = new URL(request.url);
      const status = url.searchParams.get("status") ?? "all";
      const sort = url.searchParams.get("sort") ?? "newest";
      const page = Number(url.searchParams.get("page") ?? "1") || 1;
      const limit = Number(url.searchParams.get("limit") ?? "20") || 20;

      let orders = db.orders;
      if (status !== "all" && ORDER_STATUSES.includes(status as OrderStatus)) {
        orders = orders.filter((o) => o.status === status);
      }
      orders = [...orders].sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort === "oldest" ? diff : -diff;
      });

      const { items, pagination } = paginate(
        orders.map((o) => orderToSummary(o, true)),
        page,
        limit,
      );
      return ok({ items, pagination });
    }),
  ),

  http.get(`${BASE}/admin/orders/:orderId`, ({ request, params }) =>
    withCommonBehavior(request, () => {
      const check = requireStaffRole(request, "fulfillment-staff");
      if ("error" in check) return check.error;
      const order = db.orders.find((o) => o.id === params.orderId);
      if (!order) return fail(404, "NOT_FOUND", "The requested resource was not found.");
      return ok(order);
    }),
  ),

  http.patch(`${BASE}/admin/orders/:orderId/status`, ({ request, params }) =>
    withCommonBehavior(request, async () => {
      const check = requireStaffRole(request, "fulfillment-staff");
      if ("error" in check) return check.error;
      const order = db.orders.find((o) => o.id === params.orderId);
      if (!order) return fail(404, "NOT_FOUND", "The requested resource was not found.");

      const body = (await request.json().catch(() => null)) as { action?: string; targetStatus?: string } | null;
      if (body?.action !== "advance" && body?.action !== "override") {
        return fail(422, "VALIDATION_ERROR", "Invalid transition.", null, [{ field: "action", message: '"action" must be "advance" or "override".' }]);
      }

      if (body.action === "advance") {
        const next = manualAdvanceStatus(order.status);
        if (!next) {
          return fail(422, "VALIDATION_ERROR", "Invalid transition — order is already completed.");
        }
        applyStaffStatusChange(order, next);
        return ok(order);
      }

      // override
      if (!body.targetStatus || !ORDER_STATUSES.includes(body.targetStatus as OrderStatus)) {
        return fail(422, "VALIDATION_ERROR", "Invalid transition.", null, [
          { field: "targetStatus", message: "targetStatus is required and must be a valid status for override." },
        ]);
      }
      applyStaffStatusChange(order, body.targetStatus as OrderStatus);
      return ok(order);
    }),
  ),
];

// Sanity check surfaced in dev tooling / tests: keep in sync with API-Contract.yaml's 40 endpoints.
export const MOCKED_ENDPOINT_COUNT = handlers.length;
