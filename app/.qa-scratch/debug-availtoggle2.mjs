import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/admin/login", { waitUntil: "networkidle" });
await page.fill("#username", "admin.catalog");
await page.fill("#password", "Admin123!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin", { timeout: 6000 });
await page.locator("a[href='/admin/products']").first().click();
await page.waitForURL("**/admin/products");
await page.waitForTimeout(700);

const createdProductName = `QA Debug Product ${Date.now()}`;
await page.locator("a[href='/admin/products/new']").first().click();
await page.waitForURL("**/admin/products/new");
await page.waitForTimeout(600);
await page.fill("#name", createdProductName);
await page.locator("[role=combobox]").first().click();
await page.waitForTimeout(300);
await page.locator("[role=option]").first().click();
await page.fill("#price", "25000");
await page.fill("#description", "debug product");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin/products", { timeout: 6000 });
await page.waitForTimeout(700);

const row = page.locator("tr", { hasText: createdProductName });
console.log("row count:", await row.count());
const rowHtml = await row.innerHTML();
console.log("row html:", rowHtml.slice(0, 1500));
const sw = row.locator("button[role=switch]");
console.log("switch count:", await sw.count());
if (await sw.count()) {
  console.log("before:", await sw.first().getAttribute("aria-checked"));
  await sw.first().click();
  await page.waitForTimeout(800);
  console.log("after:", await sw.first().getAttribute("aria-checked"));
}
await browser.close();
