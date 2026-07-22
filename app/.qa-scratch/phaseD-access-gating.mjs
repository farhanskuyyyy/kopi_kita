import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import fs from "node:fs";

const results = { gating: [], defects: [] };
function gate(name, status, notes) { results.gating.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "critical", notes }); }

async function main() {
  const browser = await launch();

  // ---------- Unauthenticated hits to every /admin/* route must redirect to /admin/login ----------
  const adminRoutes = [
    "/admin",
    "/admin/products",
    "/admin/products/new",
    "/admin/products/prod_latte/edit",
    "/admin/categories",
    "/admin/categories/new",
    "/admin/categories/cat_espresso/edit",
    "/admin/orders",
    "/admin/orders/order_1",
  ];
  for (const route of adminRoutes) {
    const page = await newTrackedPage(browser, `unauth-${route}`);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const url = page.url();
      const redirected = url.includes("/admin/login");
      gate(`Unauth-Redirect ${route}`, redirected ? "PASS" : "FAIL", `landed on ${url}`);
    } catch (e) {
      gate(`Unauth-Redirect ${route}`, "FAIL", e.message);
    }
    await page.close();
  }

  // ---------- Wrong-role blocking: fulfillment-staff hitting catalog-admin-only routes ----------
  {
    const page = await newTrackedPage(browser, "staff-wrong-role");
    try {
      await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
      await page.fill("#username", "staff.fulfillment");
      await page.fill("#password", "Staff123!");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/admin", { timeout: 6000 });
      await page.waitForTimeout(500);

      for (const route of ["/admin/products", "/admin/products/new", "/admin/categories"]) {
        // SPA-internal navigation via history API to avoid tripping the reload-session-loss
        // defect (documented separately) — we want to isolate ROLE gating here, not that bug.
        await page.evaluate((r) => {
          window.history.pushState({}, "", r);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, route);
        await page.waitForTimeout(600);
        const url = page.url();
        const blocked = url === `${BASE}/admin` || url.endsWith("/admin");
        gate(`FulfillmentStaff-Blocked-From ${route}`, blocked ? "PASS" : "FAIL", `landed on ${url}`);
      }
      await shot(page, "gating-fulfillment-blocked");
    } catch (e) {
      gate("FulfillmentStaff-Blocked-From-CatalogRoutes", "FAIL", e.message);
    }
    await page.close();
  }

  // ---------- Wrong-role blocking: catalog-admin hitting fulfillment-staff-only routes ----------
  {
    const page = await newTrackedPage(browser, "admin-wrong-role");
    try {
      await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
      await page.fill("#username", "admin.catalog");
      await page.fill("#password", "Admin123!");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/admin", { timeout: 6000 });
      await page.waitForTimeout(500);

      for (const route of ["/admin/orders", "/admin/orders/order_1"]) {
        await page.evaluate((r) => {
          window.history.pushState({}, "", r);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, route);
        await page.waitForTimeout(600);
        const url = page.url();
        const blocked = url === `${BASE}/admin` || url.endsWith("/admin");
        gate(`CatalogAdmin-Blocked-From ${route}`, blocked ? "PASS" : "FAIL", `landed on ${url}`);
      }
      await shot(page, "gating-catalogadmin-blocked");
    } catch (e) {
      gate("CatalogAdmin-Blocked-From-OrderRoutes", "FAIL", e.message);
    }
    await page.close();
  }

  // ---------- Customer /account* gating (unauthenticated) ----------
  for (const route of ["/account", "/account/orders", "/account/favorites"]) {
    const page = await newTrackedPage(browser, `unauth-customer-${route}`);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const url = page.url();
      const redirected = url.includes("/login") && url.includes(`returnTo=${encodeURIComponent(route)}`);
      gate(`Unauth-Customer-Redirect ${route}`, redirected ? "PASS" : "FAIL", `landed on ${url}`);
    } catch (e) {
      gate(`Unauth-Customer-Redirect ${route}`, "FAIL", e.message);
    }
    await page.close();
  }

  fs.writeFileSync(new URL("./phaseD-results.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
