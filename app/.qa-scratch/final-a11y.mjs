import { chromium } from "playwright";
import { injectAxe, getViolations } from "axe-playwright";
const BASE = "http://localhost:4173";
const browser = await chromium.launch();
const out = {};

async function scan(page, name) {
  await injectAxe(page);
  const v = await getViolations(page, undefined, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa"] } });
  const critical = v.filter(x=>x.impact==="critical");
  const buttonName = v.filter(x=>x.id==="button-name");
  out[name] = { critical: critical.length, buttonName: buttonName.length, criticalIds: critical.map(x=>`${x.id}(${x.nodes.length})`), all: v.map(x=>`${x.impact}:${x.id}(${x.nodes.length})`) };
}

// --- Admin Product List (catalog-admin) ---
let page = await browser.newPage();
await page.setViewportSize({width:1440,height:900});
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.fill("#username","admin.catalog"); await page.fill("#password","Admin123!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin",{timeout:6000});
await page.locator("a[href='/admin/products']").first().click();
await page.waitForURL("**/admin/products");
await page.waitForTimeout(1500);
await scan(page, "AdminProductList");

// operability + accessible-name via role query (Playwright resolves accessible name from aria-label)
const namedSwitches = page.getByRole("switch", { name: /toggle availability for/i });
const namedCount = await namedSwitches.count();
const totalSwitches = await page.locator("[role=switch]").count();
const firstName = await page.locator("[role=switch]").first().getAttribute("aria-label");
const sw = namedSwitches.first();
const before = await sw.getAttribute("aria-checked");
await sw.click();
await page.waitForTimeout(900);
const after = await sw.getAttribute("aria-checked");
out.SwitchOperability = { totalSwitches, namedSwitchesMatchingPattern: namedCount, firstAriaLabel: firstName, checkedBefore: before, checkedAfter: after, toggled: before!==after };
await page.close();

// --- Menu (public) ---
page = await browser.newPage();
await page.setViewportSize({width:1440,height:900});
await page.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await scan(page, "Menu");
await page.close();

// --- Order History (customer) ---
page = await browser.newPage();
await page.setViewportSize({width:1440,height:900});
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email","sari@example.com"); await page.fill("#password","Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account",{timeout:6000});
await page.locator("a[href='/account/orders']").first().click();
await page.waitForURL("**/account/orders");
await page.waitForTimeout(1200);
await scan(page, "OrderHistory");
await page.close();

console.log(JSON.stringify(out, null, 2));
await browser.close();
