/**
 * In-memory fake database for the ecatalog-coffeeshop mock backend.
 *
 * Owned by mock-api-engineer (Stage 5). Stateful within a browser session — mutations
 * from admin handlers are immediately visible to customer-facing handlers (F-035, §3.11,
 * §5 of Frontend-Architecture.md). Product/order/category/etc. mutations are not persisted
 * across a hard reload; that remains an explicit, documented Stage-5 decision (Frontend-
 * Architecture §5). `sessions` is the one exception (QA Defect #1 fix): it mirrors to
 * localStorage so a genuinely-valid session survives a reload/direct-URL-entry instead of
 * looking "expired" just because this module re-initialized from seed state — Frontend-
 * Architecture §5 explicitly leaves that call behind this file's existing read/write
 * functions (`createSession`/`getSession`/`destroySession`).
 *
 * Only `handlers.ts` and `scenarios.ts` should import from this module. Frontend feature
 * code must never import `mocks/db` directly — the HTTP boundary (MSW) is the only
 * coupling point (Frontend-Architecture §4).
 */

import type {
  Category,
  CustomizationGroup,
  CustomizationOption,
  Order,
  OrderStatus,
  PaginationMeta,
  Product,
  ProductDetail,
  Promo,
  Session,
  SessionDomain,
  StoredCustomer,
  StoredProduct,
  StoredStaffUser,
  StoreInfo,
} from "./types";

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

// Seeded below: orders order_1..order_4, customers user_1..user_2 — both use the same
// `prefix_N` numeric pattern genId() generates. Pre-seed those two counters so the first
// runtime-created order/customer doesn't collide with (and get shadowed by) a seed record
// of the same id — e.g. GET /orders/order_1 must resolve to the newly *placed* order, not
// silently fall back to the seeded demo order sharing that id.
const idCounters: Record<string, number> = { order: 4, user: 2 };

export function genId(prefix: string): string {
  idCounters[prefix] = (idCounters[prefix] ?? 0) + 1;
  return `${prefix}_${idCounters[prefix]}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function isoOffsetMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function isoOffsetDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Customization group builders (D4 — additive pricing)
// ---------------------------------------------------------------------------

function opt(id: string, label: string, priceDelta = 0): CustomizationOption {
  return { id, label, priceDelta };
}

function sizeGroup(prefix: string): CustomizationGroup {
  return {
    id: `${prefix}-size`,
    name: "Size",
    type: "single",
    required: true,
    options: [
      opt(`${prefix}-size-s`, "Small", 0),
      opt(`${prefix}-size-m`, "Medium", 5000),
      opt(`${prefix}-size-l`, "Large", 8000),
    ],
  };
}

function milkGroup(prefix: string): CustomizationGroup {
  return {
    id: `${prefix}-milk`,
    name: "Milk",
    type: "single",
    required: true,
    options: [
      opt(`${prefix}-milk-regular`, "Regular Milk", 0),
      opt(`${prefix}-milk-oat`, "Oat Milk", 7000),
      opt(`${prefix}-milk-almond`, "Almond Milk", 7000),
      opt(`${prefix}-milk-skim`, "Skim Milk", 3000),
    ],
  };
}

function shotsGroup(prefix: string): CustomizationGroup {
  return {
    id: `${prefix}-shots`,
    name: "Shots",
    type: "multi",
    required: false,
    options: [opt(`${prefix}-shots-extra`, "Extra Shot", 8000), opt(`${prefix}-shots-decaf`, "Make it Decaf", 0)],
  };
}

function sugarGroup(prefix: string): CustomizationGroup {
  return {
    id: `${prefix}-sugar`,
    name: "Sugar Level",
    type: "single",
    required: false,
    options: [
      opt(`${prefix}-sugar-none`, "No Sugar", 0),
      opt(`${prefix}-sugar-less`, "Less Sugar", 0),
      opt(`${prefix}-sugar-normal`, "Normal Sugar", 0),
      opt(`${prefix}-sugar-extra`, "Extra Sugar", 0),
    ],
  };
}

function img(seed: string): string {
  return `https://picsum.photos/seed/${seed}/640/480`;
}

// ---------------------------------------------------------------------------
// Seed builders
// ---------------------------------------------------------------------------

interface CategorySeed {
  id: string;
  name: string;
  slug: string;
}

const CATEGORY_SEEDS: CategorySeed[] = [
  { id: "cat_espresso", name: "Espresso", slug: "espresso" },
  { id: "cat_brewed", name: "Brewed Coffee", slug: "brewed-coffee" },
  { id: "cat_non_coffee", name: "Non-Coffee", slug: "non-coffee" },
  { id: "cat_tea", name: "Tea", slug: "tea" },
  { id: "cat_pastries", name: "Pastries", slug: "pastries" },
  { id: "cat_breakfast", name: "Breakfast", slug: "breakfast" },
  { id: "cat_merchandise", name: "Merchandise", slug: "merchandise" },
];

function buildInitialCategories(): Category[] {
  // productCount is derived live (see categoryProductCount) — seeded as 0 here and
  // never trusted as a cached value.
  return CATEGORY_SEEDS.map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: 0 }));
}

interface ProductSeed {
  id: string;
  name: string;
  categorySlug: string;
  basePrice: number;
  description: string;
  tags: string[];
  available: boolean;
  isDeleted: boolean;
  popularity: number;
  customizationGroups: CustomizationGroup[];
}

function drinkGroups(prefix: string, opts: { milk?: boolean; sugar?: boolean } = {}): CustomizationGroup[] {
  const groups = [sizeGroup(prefix)];
  if (opts.milk) groups.push(milkGroup(prefix));
  groups.push(shotsGroup(prefix));
  if (opts.sugar !== false) groups.push(sugarGroup(prefix));
  return groups;
}

function buildProductSeeds(): ProductSeed[] {
  return [
    // ---- Espresso ----
    { id: "prod_espresso_singolo", name: "Espresso Singolo", categorySlug: "espresso", basePrice: 18000, description: "A single, concentrated shot of espresso pulled from our house blend.", tags: ["bestseller"], available: true, isDeleted: false, popularity: 70, customizationGroups: drinkGroups("espresso-singolo", { milk: false }) },
    { id: "prod_espresso_doppio", name: "Espresso Doppio", categorySlug: "espresso", basePrice: 22000, description: "Double shot of espresso for a bolder, richer kick.", tags: [], available: true, isDeleted: false, popularity: 60, customizationGroups: drinkGroups("espresso-doppio", { milk: false }) },
    { id: "prod_americano", name: "Americano", categorySlug: "espresso", basePrice: 25000, description: "Espresso shots topped with hot water for a smooth, full-bodied cup.", tags: ["featured"], available: true, isDeleted: false, popularity: 85, customizationGroups: drinkGroups("americano", { milk: false }) },
    { id: "prod_cappuccino", name: "Cappuccino", categorySlug: "espresso", basePrice: 32000, description: "Equal parts espresso, steamed milk, and velvety foam.", tags: ["featured", "bestseller"], available: true, isDeleted: false, popularity: 95, customizationGroups: drinkGroups("cappuccino", { milk: true }) },
    { id: "prod_latte", name: "Caffe Latte", categorySlug: "espresso", basePrice: 33000, description: "Espresso with generously steamed milk and a light layer of foam.", tags: ["featured", "bestseller"], available: true, isDeleted: false, popularity: 98, customizationGroups: drinkGroups("latte", { milk: true }) },
    { id: "prod_flat_white", name: "Flat White", categorySlug: "espresso", basePrice: 34000, description: "Ristretto shots with silky micro-foamed milk, Melbourne-style.", tags: [], available: true, isDeleted: false, popularity: 55, customizationGroups: drinkGroups("flat-white", { milk: true }) },
    { id: "prod_mocha", name: "Cafe Mocha", categorySlug: "espresso", basePrice: 36000, description: "Espresso, steamed milk, and rich chocolate sauce, finished with whipped cream.", tags: ["new"], available: true, isDeleted: false, popularity: 72, customizationGroups: drinkGroups("mocha", { milk: true }) },

    // ---- Brewed Coffee ----
    { id: "prod_house_drip", name: "House Blend Drip", categorySlug: "brewed-coffee", basePrice: 20000, description: "Our signature medium-roast blend, brewed fresh throughout the day.", tags: ["featured"], available: true, isDeleted: false, popularity: 80, customizationGroups: drinkGroups("house-drip", { milk: false }) },
    { id: "prod_pour_over", name: "Single-Origin Pour Over", categorySlug: "brewed-coffee", basePrice: 28000, description: "Hand-poured, rotating single-origin beans highlighting bright, distinct notes.", tags: ["new"], available: true, isDeleted: false, popularity: 50, customizationGroups: drinkGroups("pour-over", { milk: false }) },
    { id: "prod_cold_brew", name: "Cold Brew", categorySlug: "brewed-coffee", basePrice: 30000, description: "Steeped 18 hours for a smooth, low-acidity, naturally sweet cup.", tags: ["bestseller"], available: true, isDeleted: false, popularity: 88, customizationGroups: drinkGroups("cold-brew", { milk: false }) },
    { id: "prod_nitro_cold_brew", name: "Nitro Cold Brew", categorySlug: "brewed-coffee", basePrice: 34000, description: "Cold brew infused with nitrogen for a cascading, creamy pour.", tags: [], available: false, isDeleted: false, popularity: 65, customizationGroups: drinkGroups("nitro-cold-brew", { milk: false }) },
    { id: "prod_french_press", name: "French Press (Serves 2)", categorySlug: "brewed-coffee", basePrice: 45000, description: "Full-immersion brew served table-side, great for sharing.", tags: [], available: true, isDeleted: false, popularity: 40, customizationGroups: [] },

    // ---- Non-Coffee ----
    { id: "prod_matcha_latte", name: "Matcha Latte", categorySlug: "non-coffee", basePrice: 34000, description: "Ceremonial-grade matcha whisked with steamed milk.", tags: ["featured"], available: true, isDeleted: false, popularity: 78, customizationGroups: drinkGroups("matcha-latte", { milk: true }) },
    { id: "prod_chocolate_milk", name: "Chocolate Milk", categorySlug: "non-coffee", basePrice: 30000, description: "Rich Belgian chocolate blended with steamed milk.", tags: [], available: true, isDeleted: false, popularity: 60, customizationGroups: drinkGroups("chocolate-milk", { milk: true }) },
    { id: "prod_caramel_steamer", name: "Caramel Steamer", categorySlug: "non-coffee", basePrice: 28000, description: "A caffeine-free steamed milk drink swirled with caramel.", tags: [], available: true, isDeleted: false, popularity: 35, customizationGroups: drinkGroups("caramel-steamer", { milk: true }) },
    { id: "prod_vanilla_frappe", name: "Vanilla Bean Frappe", categorySlug: "non-coffee", basePrice: 36000, description: "Blended iced vanilla bean drink topped with whipped cream.", tags: ["new"], available: true, isDeleted: false, popularity: 66, customizationGroups: drinkGroups("vanilla-frappe", { milk: true }) },
    { id: "prod_turmeric_latte", name: "Golden Turmeric Latte", categorySlug: "non-coffee", basePrice: 32000, description: "Turmeric, ginger, and warming spices with steamed milk.", tags: [], available: false, isDeleted: false, popularity: 30, customizationGroups: drinkGroups("turmeric-latte", { milk: true }) },
    // Soft-deleted seasonal item — demonstrates D2 (still resolvable from historical orders, hidden from catalog).
    { id: "prod_pumpkin_latte", name: "Seasonal Pumpkin Latte", categorySlug: "non-coffee", basePrice: 35000, description: "A limited-time autumn favorite — pumpkin spice with steamed milk.", tags: ["seasonal"], available: false, isDeleted: true, popularity: 20, customizationGroups: drinkGroups("pumpkin-latte", { milk: true }) },

    // ---- Tea ----
    { id: "prod_english_breakfast", name: "English Breakfast Tea", categorySlug: "tea", basePrice: 22000, description: "A robust, malty black tea blend.", tags: [], available: true, isDeleted: false, popularity: 45, customizationGroups: drinkGroups("english-breakfast", { milk: false }) },
    { id: "prod_jasmine_green", name: "Jasmine Green Tea", categorySlug: "tea", basePrice: 22000, description: "Green tea scented with jasmine blossoms.", tags: [], available: true, isDeleted: false, popularity: 42, customizationGroups: drinkGroups("jasmine-green", { milk: false }) },
    { id: "prod_chamomile", name: "Chamomile Tea", categorySlug: "tea", basePrice: 22000, description: "Caffeine-free, calming chamomile blossom infusion.", tags: [], available: true, isDeleted: false, popularity: 25, customizationGroups: drinkGroups("chamomile", { milk: false }) },
    { id: "prod_thai_milk_tea", name: "Thai Milk Tea", categorySlug: "tea", basePrice: 30000, description: "Bold Thai black tea sweetened and blended with milk.", tags: ["featured", "new"], available: true, isDeleted: false, popularity: 74, customizationGroups: drinkGroups("thai-milk-tea", { milk: true }) },

    // ---- Pastries ----
    { id: "prod_butter_croissant", name: "Butter Croissant", categorySlug: "pastries", basePrice: 25000, description: "Flaky, all-butter French croissant baked fresh daily.", tags: ["bestseller"], available: true, isDeleted: false, popularity: 90, customizationGroups: [] },
    { id: "prod_chocolate_croissant", name: "Chocolate Croissant", categorySlug: "pastries", basePrice: 28000, description: "Buttery croissant filled with dark chocolate batons.", tags: ["featured"], available: true, isDeleted: false, popularity: 82, customizationGroups: [] },
    { id: "prod_blueberry_muffin", name: "Blueberry Muffin", categorySlug: "pastries", basePrice: 24000, description: "Moist muffin loaded with whole blueberries.", tags: [], available: true, isDeleted: false, popularity: 55, customizationGroups: [] },
    { id: "prod_banana_bread", name: "Banana Walnut Bread (Slice)", categorySlug: "pastries", basePrice: 22000, description: "Homestyle banana bread studded with toasted walnuts.", tags: [], available: true, isDeleted: false, popularity: 38, customizationGroups: [] },
    { id: "prod_cheese_danish", name: "Cheese Danish", categorySlug: "pastries", basePrice: 26000, description: "Flaky danish pastry filled with sweet cream cheese.", tags: [], available: false, isDeleted: false, popularity: 30, customizationGroups: [] },

    // ---- Breakfast ----
    { id: "prod_avocado_toast", name: "Avocado Toast", categorySlug: "breakfast", basePrice: 42000, description: "Smashed avocado, chili flakes, and lemon on toasted sourdough.", tags: ["featured"], available: true, isDeleted: false, popularity: 68, customizationGroups: [] },
    { id: "prod_egg_sandwich", name: "Egg & Cheese Sandwich", categorySlug: "breakfast", basePrice: 38000, description: "Fluffy scrambled egg and melted cheddar on a toasted brioche bun.", tags: [], available: true, isDeleted: false, popularity: 58, customizationGroups: [] },
    { id: "prod_overnight_oats", name: "Overnight Oats Cup", categorySlug: "breakfast", basePrice: 35000, description: "Oats soaked overnight with chia, honey, and seasonal fruit.", tags: ["new"], available: true, isDeleted: false, popularity: 33, customizationGroups: [] },

    // ---- Merchandise ----
    { id: "prod_ceramic_mug", name: "Coffeeshop Ceramic Mug", categorySlug: "merchandise", basePrice: 85000, description: "12oz house-branded ceramic mug.", tags: [], available: true, isDeleted: false, popularity: 20, customizationGroups: [] },
    { id: "prod_steel_tumbler", name: "Stainless Steel Tumbler", categorySlug: "merchandise", basePrice: 150000, description: "Double-walled insulated tumbler, keeps drinks hot or cold for hours.", tags: ["featured"], available: true, isDeleted: false, popularity: 42, customizationGroups: [] },
    { id: "prod_beans_bag", name: "House Blend Beans (250g)", categorySlug: "merchandise", basePrice: 95000, description: "Take our signature house blend home — whole bean or ground.", tags: [], available: true, isDeleted: false, popularity: 36, customizationGroups: [] },
    { id: "prod_tote_bag", name: "Coffeeshop Tote Bag", categorySlug: "merchandise", basePrice: 65000, description: "Durable canvas tote bag with the shop's logo.", tags: [], available: true, isDeleted: false, popularity: 15, customizationGroups: [] },
  ];
}

function buildInitialProducts(): StoredProduct[] {
  const categoryBySlug = new Map(CATEGORY_SEEDS.map((c) => [c.slug, c] as const));
  return buildProductSeeds().map((seed) => {
    const category = categoryBySlug.get(seed.categorySlug);
    if (!category) throw new Error(`Seed error: unknown category slug ${seed.categorySlug}`);
    return {
      id: seed.id,
      name: seed.name,
      categoryId: category.id,
      basePrice: seed.basePrice,
      image: img(seed.id),
      images: [img(`${seed.id}-1`), img(`${seed.id}-2`)],
      tags: seed.tags,
      available: seed.available,
      isDeleted: seed.isDeleted,
      description: seed.description,
      customizationGroups: seed.customizationGroups,
      lastUpdatedAt: null,
      popularity: seed.popularity,
    };
  });
}

function buildInitialStaffUsers(): StoredStaffUser[] {
  return [
    { id: "staff_1", name: "Dewi Kusuma", role: "catalog-admin", username: "admin.catalog", password: "Admin123!" },
    { id: "staff_2", name: "Budi Santoso", role: "fulfillment-staff", username: "staff.fulfillment", password: "Staff123!" },
  ];
}

function buildInitialCustomers(): StoredCustomer[] {
  return [
    { id: "user_1", name: "Sari Amelia", email: "sari@example.com", phone: "+6281234567890", memberSince: isoOffsetDays(-120), password: "Passw0rd!" },
    { id: "user_2", name: "Andi Saputra", email: "andi@example.com", phone: "+6281298765432", memberSince: isoOffsetDays(-45), password: "Passw0rd!" },
  ];
}

function buildInitialPromos(): Promo[] {
  return [
    { code: "COFFEE10", type: "percent", value: 10, active: true },
    { code: "FLAT15K", type: "fixed", value: 15000, active: true },
    { code: "OLDPROMO", type: "percent", value: 20, active: false },
  ];
}

function buildOrderLine(product: StoredProduct, quantity: number, unitPrice?: number): {
  productId: string;
  name: string;
  customizationSummary: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
} {
  const price = unitPrice ?? product.basePrice;
  return {
    productId: product.id,
    name: product.name,
    customizationSummary: null,
    unitPrice: price,
    quantity,
    lineTotal: price * quantity,
  };
}

function buildInitialOrders(products: StoredProduct[], customers: StoredCustomer[]): Order[] {
  const byId = new Map(products.map((p) => [p.id, p] as const));
  const cappuccino = byId.get("prod_cappuccino")!;
  const croissant = byId.get("prod_butter_croissant")!;
  const latte = byId.get("prod_latte")!;
  const muffin = byId.get("prod_blueberry_muffin")!;
  const americano = byId.get("prod_americano")!;
  const pumpkinLatte = byId.get("prod_pumpkin_latte")!; // soft-deleted, still resolvable in history

  const order1Lines = [buildOrderLine(cappuccino, 2, 40000), buildOrderLine(croissant, 1)];
  const order1Subtotal = order1Lines.reduce((s, l) => s + l.lineTotal, 0);
  const order1Tax = Math.round(order1Subtotal * 0.1);

  const order2Lines = [buildOrderLine(latte, 1, 33000), buildOrderLine(muffin, 2)];
  const order2Subtotal = order2Lines.reduce((s, l) => s + l.lineTotal, 0);
  const order2Tax = Math.round(order2Subtotal * 0.1);
  const order2Discount = Math.round(order2Subtotal * 0.1); // matches seeded promoCode COFFEE10 (10%)

  const order3Lines = [buildOrderLine(americano, 3, 25000)];
  const order3Subtotal = order3Lines.reduce((s, l) => s + l.lineTotal, 0);
  const order3Tax = Math.round(order3Subtotal * 0.1);

  const order4Lines = [buildOrderLine(pumpkinLatte, 1, 35000), buildOrderLine(croissant, 2)];
  const order4Subtotal = order4Lines.reduce((s, l) => s + l.lineTotal, 0);
  const order4Tax = Math.round(order4Subtotal * 0.1);

  return [
    {
      id: "order_1",
      status: "received",
      createdAt: isoOffsetMinutes(-6),
      estimatedReadyAt: isoOffsetMinutes(9),
      lastStatusChangeAt: isoOffsetMinutes(-6),
      autoProgressionStopped: false,
      fulfillmentMethod: "pickup",
      address: null,
      paymentMethod: "demo_cash_on_pickup",
      lines: order1Lines,
      subtotal: order1Subtotal,
      tax: order1Tax,
      discount: 0,
      total: order1Subtotal + order1Tax,
      customer: { name: "Guest Customer", email: "guest1@example.com", phone: "+6281111111111", isGuest: true, accountId: null },
    },
    {
      id: "order_2",
      status: "preparing",
      createdAt: isoOffsetMinutes(-15),
      estimatedReadyAt: isoOffsetMinutes(2),
      lastStatusChangeAt: isoOffsetMinutes(-4),
      autoProgressionStopped: false,
      fulfillmentMethod: "dine-in",
      address: null,
      paymentMethod: "demo_credit_card",
      lines: order2Lines,
      subtotal: order2Subtotal,
      tax: order2Tax,
      discount: order2Discount,
      total: order2Subtotal + order2Tax - order2Discount,
      customer: { name: customers[0].name, email: customers[0].email, phone: customers[0].phone, isGuest: false, accountId: customers[0].id },
      promoCode: "COFFEE10",
    },
    {
      id: "order_3",
      status: "ready",
      createdAt: isoOffsetMinutes(-30),
      estimatedReadyAt: isoOffsetMinutes(-2),
      lastStatusChangeAt: isoOffsetMinutes(-3),
      autoProgressionStopped: true, // staff overrode — timer permanently stopped (A2)
      fulfillmentMethod: "delivery",
      address: { line1: "Jl. Melati No. 12", line2: null, city: "Bandung", postalCode: "40115" },
      paymentMethod: "demo_e_wallet",
      lines: order3Lines,
      subtotal: order3Subtotal,
      tax: order3Tax,
      discount: 0,
      total: order3Subtotal + order3Tax,
      customer: { name: "Guest Customer", email: "guest2@example.com", phone: "+6282222222222", isGuest: true, accountId: null },
    },
    {
      id: "order_4",
      status: "completed",
      createdAt: isoOffsetDays(-3),
      estimatedReadyAt: isoOffsetDays(-3),
      lastStatusChangeAt: isoOffsetDays(-3),
      autoProgressionStopped: true,
      fulfillmentMethod: "pickup",
      address: null,
      paymentMethod: "demo_credit_card",
      lines: order4Lines,
      subtotal: order4Subtotal,
      tax: order4Tax,
      discount: 0,
      total: order4Subtotal + order4Tax,
      customer: { name: customers[1].name, email: customers[1].email, phone: customers[1].phone, isGuest: false, accountId: customers[1].id },
    },
  ];
}

function buildStoreInfo(): StoreInfo {
  return {
    hours: [
      { day: "Mon", openTime: "07:00", closeTime: "21:00" },
      { day: "Tue", openTime: "07:00", closeTime: "21:00" },
      { day: "Wed", openTime: "07:00", closeTime: "21:00" },
      { day: "Thu", openTime: "07:00", closeTime: "21:00" },
      { day: "Fri", openTime: "07:00", closeTime: "22:00" },
      { day: "Sat", openTime: "08:00", closeTime: "22:00" },
      { day: "Sun", openTime: "08:00", closeTime: "20:00" },
    ],
    address: "Jl. Braga No. 45, Bandung, Jawa Barat 40111",
    phone: "+62221234567",
    mapPlaceholderUrl: "https://picsum.photos/seed/store-map/640/360",
  };
}

// ---------------------------------------------------------------------------
// Mutable state
// ---------------------------------------------------------------------------

interface DbState {
  categories: Category[];
  products: StoredProduct[];
  customers: StoredCustomer[];
  staffUsers: StoredStaffUser[];
  orders: Order[];
  favorites: Map<string, Set<string>>; // userId -> productId set
  promos: Promo[];
  sessions: Map<string, Session>; // token -> session
  storeInfo: StoreInfo;
}

/**
 * QA Defect #1: sessions specifically are mirrored to localStorage, per the Stage-5
 * latitude Frontend-Architecture §5 grants ("whether that store also mirrors to
 * localStorage for durability across a hard reload is a Stage 5 implementation decision
 * ... stay behind mocks/data/db.ts's existing read/write functions"). Everything else in
 * `db` (products/orders/etc.) intentionally stays in-memory-only — this is scoped to the
 * one piece of state whose loss on reload was surfacing as a false "session expired"
 * logout for a genuinely still-logged-in user. `createSession`/`getSession`/
 * `destroySession` remain the only read/write surface handlers use; this never leaks into
 * their calling contract.
 */
const SESSIONS_STORAGE_KEY = "coffeeshop.mock-sessions";

function loadPersistedSessions(): Map<string, Session> {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Session[];
    return new Map(parsed.map((s) => [s.token, s] as const));
  } catch {
    return new Map();
  }
}

function persistSessions(sessions: Map<string, Session>): void {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(Array.from(sessions.values())));
  } catch {
    // best-effort only — a quota/serialization failure here shouldn't break the mock API.
  }
}

function buildInitialState(): DbState {
  const products = buildInitialProducts();
  const customers = buildInitialCustomers();
  return {
    categories: buildInitialCategories(),
    products,
    customers,
    staffUsers: buildInitialStaffUsers(),
    orders: buildInitialOrders(products, customers),
    favorites: new Map([["user_1", new Set(["prod_latte", "prod_butter_croissant"])]]),
    promos: buildInitialPromos(),
    sessions: loadPersistedSessions(),
    storeInfo: buildStoreInfo(),
  };
}

export let db: DbState = buildInitialState();

/** Full reset — used by scenarios.ts / a "reset demo data" affordance. Clears timers too. */
export function resetDb(): void {
  for (const timer of orderTimers.values()) clearInterval(timer);
  orderTimers.clear();
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
  db = buildInitialState();
  for (const order of db.orders) {
    if (order.status !== "completed" && order.status !== "ready" && !order.autoProgressionStopped) {
      startAutoProgression(order.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function findCategoryBySlug(slug: string): Category | undefined {
  return db.categories.find((c) => c.slug === slug);
}

export function findCategoryById(id: string): Category | undefined {
  return db.categories.find((c) => c.id === id);
}

/** Live count of non-deleted products assigned to a category (never cached). */
export function categoryProductCount(categoryId: string): number {
  return db.products.filter((p) => p.categoryId === categoryId && !p.isDeleted).length;
}

export function categoryDTO(category: Category): Category {
  return { ...category, productCount: categoryProductCount(category.id) };
}

export function findProductById(id: string): StoredProduct | undefined {
  return db.products.find((p) => p.id === id);
}

export function toProductDTO(p: StoredProduct): Product {
  const category = findCategoryById(p.categoryId);
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: category?.name ?? "Unknown",
    basePrice: p.basePrice,
    image: p.image,
    tags: p.tags,
    available: p.available,
    isDeleted: p.isDeleted,
  };
}

export function toProductDetailDTO(p: StoredProduct): ProductDetail {
  return {
    ...toProductDTO(p),
    description: p.description,
    images: p.images,
    customizationGroups: p.customizationGroups,
    lastUpdatedAt: p.lastUpdatedAt,
  };
}

export function paginate<T>(items: T[], page: number, limit: number): { items: T[]; pagination: PaginationMeta } {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page: safePage, limit, totalItems, totalPages },
  };
}

/** Sum of selected customization option deltas for a product (D4). Unknown option ids are ignored. */
export function computeUnitPrice(product: StoredProduct, selectedOptionIds: string[] = []): number {
  let total = product.basePrice;
  for (const group of product.customizationGroups) {
    for (const option of group.options) {
      if (selectedOptionIds.includes(option.id)) total += option.priceDelta;
    }
  }
  return total;
}

export function customizationSummary(product: StoredProduct, selectedOptionIds: string[] = []): string | null {
  if (!selectedOptionIds.length) return null;
  const labels: string[] = [];
  for (const group of product.customizationGroups) {
    for (const option of group.options) {
      if (selectedOptionIds.includes(option.id)) {
        labels.push(option.priceDelta > 0 ? `+${option.label}` : option.label);
      }
    }
  }
  return labels.length ? labels.join(", ") : null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function createSession(domain: SessionDomain, ownerId: string): string {
  const token = `${domain === "customer" ? "csess" : "ssess"}_${genId("token")}_${Math.random().toString(36).slice(2, 10)}`;
  db.sessions.set(token, { token, domain, ownerId });
  persistSessions(db.sessions);
  return token;
}

export function getSession(token: string | null): Session | undefined {
  if (!token) return undefined;
  return db.sessions.get(token);
}

export function destroySession(token: string | null): void {
  if (!token) return;
  db.sessions.delete(token);
  persistSessions(db.sessions);
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : header.trim() || null;
}

// ---------------------------------------------------------------------------
// Order auto-progression (D3, A2, A3, §3.11)
// ---------------------------------------------------------------------------

const AUTO_PROGRESSION_INTERVAL_MS = 15_000;
const orderTimers = new Map<string, ReturnType<typeof setInterval>>();

const FORWARD_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "ready",
  ready: null, // A3 — auto-progression never reaches "completed" unattended
  completed: null,
};

export function startAutoProgression(orderId: string): void {
  stopAutoProgression(orderId);
  const timer = setInterval(() => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order || order.autoProgressionStopped) {
      stopAutoProgression(orderId);
      return;
    }
    const next = FORWARD_STATUS[order.status];
    if (!next) {
      stopAutoProgression(orderId);
      return;
    }
    order.status = next;
    order.lastStatusChangeAt = isoNow();
    if (next === "ready") stopAutoProgression(orderId);
  }, AUTO_PROGRESSION_INTERVAL_MS);
  orderTimers.set(orderId, timer);
}

export function stopAutoProgression(orderId: string): void {
  const timer = orderTimers.get(orderId);
  if (timer) {
    clearInterval(timer);
    orderTimers.delete(orderId);
  }
}

/** Staff-driven change (advance or override) always permanently stops the auto-timer (A2). */
export function applyStaffStatusChange(order: Order, targetStatus: OrderStatus): void {
  order.status = targetStatus;
  order.lastStatusChangeAt = isoNow();
  order.autoProgressionStopped = true;
  stopAutoProgression(order.id);
}

/**
 * One-step-forward map for staff-driven "Advance" (F-043) — unlike auto-progression this
 * DOES allow ready -> completed, since reaching "completed" always requires an explicit
 * staff action (A3).
 */
const MANUAL_FORWARD_STATUS: Record<OrderStatus, OrderStatus | null> = {
  received: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
};

export function manualAdvanceStatus(current: OrderStatus): OrderStatus | null {
  return MANUAL_FORWARD_STATUS[current];
}

// Kick off auto-progression for the seeded orders that are still eligible.
for (const order of db.orders) {
  if (order.status !== "completed" && order.status !== "ready" && !order.autoProgressionStopped) {
    startAutoProgression(order.id);
  }
}
