/**
 * Local TypeScript types mirroring API-Contract.yaml (OpenAPI 3.1.0) component schemas.
 * Owned by mocks/ — Stage 6 (Frontend Dev) should prefer typing against its own
 * Zod-inferred adapter types; these exist so the mock layer is self-contained and
 * does not require a codegen step against the contract.
 *
 * Money: integer IDR, no decimals (contract §info).
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface Meta {
  requestId: string;
  timestamp: string;
  durationMs: number;
  /** Extra, non-contract-required field: echoed when /products resets an invalid price range. */
  filterNotice?: string;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta: Meta;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorObject {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: FieldError[] | null;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: ErrorObject;
  meta: Meta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CountData {
  count: number;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export type CustomizationGroupType = "single" | "multi";

export interface CustomizationOption {
  id: string;
  label: string;
  priceDelta: number;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  type: CustomizationGroupType;
  required: boolean;
  options: CustomizationOption[];
}

/** Internal storage shape — superset of the public Product/ProductDetail DTOs. */
export interface StoredProduct {
  id: string;
  name: string;
  categoryId: string;
  basePrice: number;
  image: string | null;
  images: string[];
  tags: string[];
  available: boolean;
  isDeleted: boolean;
  description: string;
  customizationGroups: CustomizationGroup[];
  lastUpdatedAt: string | null;
  /** Internal-only ranking used for sort=popularity; never serialized. */
  popularity: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  basePrice: number;
  image: string | null;
  tags: string[];
  available: boolean;
  isDeleted: boolean;
}

export interface ProductDetail extends Product {
  description: string;
  images: string[];
  customizationGroups: CustomizationGroup[];
  lastUpdatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export interface CartLineInput {
  productId: string;
  quantity: number;
  selectedOptionIds?: string[];
}

export interface CartLineValidated {
  productId: string;
  name: string;
  customizationSummary: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: boolean;
  unavailableReason: string | null;
}

export type PromoType = "percent" | "fixed";

export interface Promo {
  code: string;
  type: PromoType;
  value: number;
  active: boolean;
}

export interface PromoValidateResult {
  valid: boolean;
  code: string;
  type: PromoType | null;
  value: number | null;
  discountAmount: number;
  message: string | null;
}

// ---------------------------------------------------------------------------
// Checkout / Orders
// ---------------------------------------------------------------------------

export type FulfillmentMethod = "pickup" | "dine-in" | "delivery";

export type PaymentMethod =
  | "demo_credit_card"
  | "demo_cash_on_pickup"
  | "demo_e_wallet"
  | "demo_declined_card";

export interface Address {
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
}

export interface CheckoutDetails {
  fullName: string;
  email: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: Address | null;
}

export interface OrderCreateRequest {
  details: CheckoutDetails;
  paymentMethod: PaymentMethod;
  promoCode?: string | null;
  lines: CartLineInput[];
}

export interface OrderLine {
  productId: string;
  name: string;
  customizationSummary: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export type OrderStatus = "received" | "preparing" | "ready" | "completed";

export interface OrderCustomer {
  name: string;
  email: string | null;
  phone: string | null;
  isGuest: boolean;
  accountId: string | null;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  estimatedReadyAt: string | null;
  lastStatusChangeAt: string | null;
  autoProgressionStopped: boolean;
  fulfillmentMethod: FulfillmentMethod;
  address: Address | null;
  paymentMethod: PaymentMethod;
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customer: OrderCustomer;
  promoCode?: string | null;
}

export interface OrderSummary {
  id: string;
  placedAt: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  fulfillmentMethod: FulfillmentMethod;
  customerName?: string;
}

export type OrderStatusAction = "advance" | "override";

export interface OrderStatusUpdateRequest {
  action: OrderStatusAction;
  targetStatus?: OrderStatus | null;
}

export interface UnavailableItem {
  productId: string;
  name: string;
}

export interface ReorderResult {
  addedLines: CartLineValidated[];
  unavailableItems: UnavailableItem[];
}

// ---------------------------------------------------------------------------
// Auth / Account
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  memberSince: string;
}

/** Internal storage — includes the mock plain-text password (demo only, never returned). */
export interface StoredCustomer extends User {
  password: string;
}

export type StaffRole = "catalog-admin" | "fulfillment-staff";

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
}

export interface StoredStaffUser extends StaffUser {
  username: string;
  password: string;
}

export type SessionDomain = "customer" | "staff";

export interface Session {
  token: string;
  domain: SessionDomain;
  /** userId for customer domain, staffId for staff domain */
  ownerId: string;
}

// ---------------------------------------------------------------------------
// Store Info
// ---------------------------------------------------------------------------

export interface StoreHours {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  openTime: string;
  closeTime: string;
}

export interface StoreInfo {
  hours: StoreHours[];
  address: string;
  phone: string;
  mapPlaceholderUrl: string | null;
}
