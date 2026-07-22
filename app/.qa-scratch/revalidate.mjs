import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import { injectAxe, getViolations } from "axe-playwright";
import fs from "node:fs";

const results = { sessionReload: [], invalidToken: [], a11y: [], regression: [], defects: [] };
function sr(name, status, notes) { results.sessionReload.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "critical", notes }); }
function reg(name, status, notes) { results.regression.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "high", notes }); }

async function customerLogin(page, email = "sari@example.com") {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "Passw0rd!");
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/account", { timeout: 6000 });
  await page.waitForTimeout(400);
}
async function staffLogin(page, username, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/admin", { timeout: 6000 });
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await launch();

  // ===== BLOCKER #1 re-test: reload/bookmark authenticated routes must persist session =====

  // --- Customer: reload /account, /account/orders, /account/favorites ---
  {
    const page = await newTrackedPage(browser, "cust-reload");
    await customerLogin(page);
    for (const route of ["/account", "/account/orders", "/account/favorites"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800); // beyond the old hydration-race window
      const url = page.url();
      const body = await page.locator("body").innerText();
      const survived = url.includes(route) && !url.includes("/login") && !/session expired/i.test(body);
      sr(`Customer-Reload ${route}`, survived ? "PASS" : "FAIL", `url=${url}; falseExpiry=${/session expired/i.test(body)}`);
    }
    await shot(page, "reval-customer-account-reload");
    await page.close();
  }

  // --- Catalog Admin: reload /admin, /admin/products, /admin/products/new ---
  {
    const page = await newTrackedPage(browser, "catadmin-reload");
    await staffLogin(page, "admin.catalog", "Admin123!");
    for (const route of ["/admin", "/admin/products", "/admin/products/new"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800);
      const url = page.url();
      const body = await page.locator("body").innerText();
      const survived = url.includes(route) && !url.includes("/admin/login") && !/session expired/i.test(body);
      sr(`CatalogAdmin-Reload ${route}`, survived ? "PASS" : "FAIL", `url=${url}; falseExpiry=${/session expired/i.test(body)}`);
    }
    await shot(page, "reval-catadmin-reload");
    await page.close();
  }

  // --- Fulfillment Staff: reload /admin, /admin/orders, /admin/orders/order_1 ---
  {
    const page = await newTrackedPage(browser, "staff-reload");
    await staffLogin(page, "staff.fulfillment", "Staff123!");
    for (const route of ["/admin", "/admin/orders", "/admin/orders/order_1"]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1800);
      const url = page.url();
      const body = await page.locator("body").innerText();
      const survived = url.includes(route.replace("/order_1","")) && !url.includes("/admin/login") && !/session expired/i.test(body);
      sr(`FulfillmentStaff-Reload ${route}`, survived ? "PASS" : "FAIL", `url=${url}; falseExpiry=${/session expired/i.test(body)}`);
    }
    await shot(page, "reval-staff-reload");
    await page.close();
  }

  // ===== Control: a genuinely INVALID token must still redirect to login =====
  {
    const page = await newTrackedPage(browser, "invalid-token");
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    // plant a bogus persisted customer session
    await page.evaluate(() => {
      localStorage.setItem("coffeeshop.customer-session", JSON.stringify({
        state: { token: "totally_invalid_token_xyz", user: { id: "user_x", name: "Fake", email: "fake@x.com", phone: "+62800", memberSince: "2026-01-01T00:00:00.000Z" }, hasHydrated: false },
        version: 0,
      }));
    });
    await page.goto(`${BASE}/account/orders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const redirectedToLogin = url.includes("/login");
    results.invalidToken.push({ name: "Invalid-Token-Still-Redirects", status: redirectedToLogin ? "PASS" : "FAIL", notes: `url=${url}; sessionExpiredMsg=${/session expired/i.test(body)}` });
    if (!redirectedToLogin) results.defects.push({ screen: "Invalid-Token-Still-Redirects", severity: "high", notes: `invalid token did NOT redirect; url=${url}` });
    // staff invalid token control
    await page.evaluate(() => {
      localStorage.setItem("coffeeshop.staff-session", JSON.stringify({
        state: { token: "bad_staff_token", staffUser: { id: "s_x", name: "Fake", role: "catalog-admin" }, hasHydrated: false },
        version: 0,
      }));
    });
    await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const url2 = page.url();
    const redirected2 = url2.includes("/admin/login");
    results.invalidToken.push({ name: "Invalid-Staff-Token-Still-Redirects", status: redirected2 ? "PASS" : "FAIL", notes: `url=${url2}` });
    if (!redirected2) results.defects.push({ screen: "Invalid-Staff-Token-Still-Redirects", severity: "high", notes: `invalid staff token did NOT redirect; url=${url2}` });
    await page.close();
  }

  // ===== BLOCKER #5 re-test: axe-core button-name on the named screens =====
  const A11Y_SCREENS = [
    { name: "Menu", path: "/menu", auth: null },
    { name: "Search", path: "/search?q=latte", auth: null },
    { name: "AdminProductList", path: "/admin/products", auth: "catalog" },
    { name: "AdminOrderList", path: "/admin/orders", auth: "staff" },
    { name: "OrderHistory", path: "/account/orders", auth: "customer" },
  ];
  for (const s of A11Y_SCREENS) {
    const page = await newTrackedPage(browser, `a11y-${s.name}`);
    await page.setViewportSize({ width: 1440, height: 900 });
    if (s.auth === "customer") await customerLogin(page);
    else if (s.auth === "catalog") await staffLogin(page, "admin.catalog", "Admin123!");
    else if (s.auth === "staff") await staffLogin(page, "staff.fulfillment", "Staff123!");
    await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await injectAxe(page);
    const violations = await getViolations(page, undefined, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
    const critical = violations.filter((v) => v.impact === "critical");
    const buttonName = violations.filter((v) => v.id === "button-name");
    const summary = violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length})`).join(", ") || "none";
    results.a11y.push({ page: s.name, critical: critical.length, buttonName: buttonName.length, all: summary });
    if (critical.length > 0) results.defects.push({ screen: `a11y:${s.name}`, severity: "high", notes: `${critical.length} critical: ${critical.map(v=>v.id).join(",")}` });
    await page.close();
  }

  // ===== Regression: one full customer purchase, one admin product CRUD, category delete-guard =====
  {
    const page = await newTrackedPage(browser, "regression-purchase");
    try {
      await page.goto(`${BASE}/product/prod_latte`, { waitUntil: "networkidle" });
      await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
      await page.getByText("Small", { exact: true }).click();
      await page.getByText("Regular Milk", { exact: true }).click();
      await page.locator("button:has-text('Add to Cart')").click();
      await page.waitForTimeout(500);
      await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
      await page.locator("button:has-text('Proceed to Checkout')").click();
      await page.waitForURL("**/checkout/details");
      await page.fill("#fullName", "Regression Tester");
      await page.fill("#email", "reg@example.com");
      await page.fill("#phone", "081234567890");
      await page.locator("button:has-text('Continue to Payment')").click();
      await page.waitForURL("**/checkout/payment");
      await page.waitForTimeout(1000);
      await page.locator("[role=radio][value='demo_credit_card']").click();
      await page.locator("button:has-text('Continue to Review')").click();
      await page.waitForURL("**/checkout/review", { timeout: 8000 });
      await page.locator("button:has-text('Place Order')").click();
      await page.waitForURL(/\/order\/confirmation\//, { timeout: 10000 });
      reg("Regression-FullPurchase", "PASS", `order placed at ${page.url()}`);
    } catch (e) { reg("Regression-FullPurchase", "FAIL", e.message); }
    await page.close();
  }

  {
    const page = await newTrackedPage(browser, "regression-admin");
    try {
      await staffLogin(page, "admin.catalog", "Admin123!");
      // product create
      await page.locator("a[href='/admin/products']").first().click();
      await page.waitForURL("**/admin/products");
      await page.waitForTimeout(600);
      const name = `Reg Product ${Date.now()}`;
      await page.locator("a[href='/admin/products/new']").first().click();
      await page.waitForURL("**/admin/products/new");
      await page.waitForTimeout(500);
      await page.fill("#name", name);
      await page.locator("[role=combobox]").first().click();
      await page.waitForTimeout(300);
      await page.locator("[role=option]").first().click();
      await page.fill("#price", "25000");
      await page.fill("#description", "regression product");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/admin/products", { timeout: 6000 });
      await page.waitForTimeout(600);
      const created = (await page.locator("body").innerText()).includes(name);
      reg("Regression-AdminProductCreate", created ? "PASS" : "FAIL", `created '${name}'=${created}`);

      // soft-delete it (edit page)
      const row = page.locator("tr", { hasText: name });
      await row.locator("a:has-text('Edit'), button:has-text('Edit')").first().click();
      await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 5000 });
      await page.waitForTimeout(600);
      await page.fill("#price", "26000");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/admin/products", { timeout: 6000 });
      await page.waitForTimeout(500);
      const edited = /26\.000/.test(await page.locator("body").innerText());
      reg("Regression-AdminProductEdit", edited ? "PASS" : "FAIL", `price updated=${edited}`);

      // category delete-guard: now button should be DISABLED for non-empty category
      await page.locator("a[href='/admin/categories']").first().click();
      await page.waitForURL("**/admin/categories");
      await page.waitForTimeout(600);
      const espressoDel = page.locator("tr", { hasText: "Espresso" }).locator("button:has-text('Delete')").first();
      const disabled = await espressoDel.isDisabled();
      reg("Regression-CategoryDeleteGuard-Disabled", disabled ? "PASS" : "FAIL", `Espresso delete button disabled=${disabled} (fix #3 expects true)`);
      // even if not disabled, verify the guard still blocks deletion functionally
      if (!disabled) {
        await espressoDel.click();
        await page.waitForSelector("[role=dialog]", { state: "visible", timeout: 3000 }).catch(()=>{});
        const confirm = page.locator("[role=dialog] button:has-text('Delete')").first();
        if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(900); }
        const stillThere = (await page.locator("body").innerText()).includes("Espresso");
        reg("Regression-CategoryDeleteGuard-Blocks", stillThere ? "PASS" : "FAIL", `Espresso still present after attempted delete=${stillThere}`);
      } else {
        reg("Regression-CategoryDeleteGuard-Blocks", "PASS", "delete proactively disabled, deletion impossible");
      }
      await shot(page, "reval-category-guard");
    } catch (e) { reg("Regression-AdminCRUD", "FAIL", e.message); }
    await page.close();
  }

  // ===== Regression: logout now lands on / =====
  {
    const page = await newTrackedPage(browser, "regression-logout");
    try {
      await customerLogin(page);
      await page.locator("button:has-text('Log out'), button:has-text('Logout')").first().click();
      await page.waitForTimeout(1200);
      const url = page.url();
      reg("Regression-Logout-Lands-Home", (url === `${BASE}/` || url === BASE) ? "PASS" : "FAIL", `landed on ${url}`);
    } catch (e) { reg("Regression-Logout-Lands-Home", "FAIL", e.message); }
    await page.close();
  }

  // ===== Regression: access-gating still airtight (spot check) =====
  {
    const page = await newTrackedPage(browser, "regression-gating");
    await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    reg("Regression-Unauth-Admin-Gate", page.url().includes("/admin/login") ? "PASS" : "FAIL", `url=${page.url()}`);
    // wrong-role
    await staffLogin(page, "staff.fulfillment", "Staff123!");
    await page.evaluate(() => { window.history.pushState({}, "", "/admin/products"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await page.waitForTimeout(700);
    reg("Regression-WrongRole-Gate", page.url().endsWith("/admin") ? "PASS" : "FAIL", `url=${page.url()}`);
    await page.close();
  }

  fs.writeFileSync(new URL("./revalidate-results.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
