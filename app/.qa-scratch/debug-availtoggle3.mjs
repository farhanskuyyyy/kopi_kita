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

const createdProductName = `QA Debug Product B ${Date.now()}`;
await page.locator("a[href='/admin/products/new']").first().click();
await page.waitForURL("**/admin/products/new");
await page.waitForTimeout(600);
await page.fill("#name", createdProductName);
await page.locator("[role=combobox]").first().click();
await page.waitForTimeout(300);
await page.locator("[role=option]").first().click();
await page.fill("#price", "25000");
await page.fill("#description", "debug product b");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin/products", { timeout: 6000 });
await page.waitForTimeout(600);

// EDIT price (mirrors phaseC sequence)
const row = page.locator("tr", { hasText: createdProductName });
await row.locator("a:has-text('Edit'), button:has-text('Edit')").first().click();
await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 5000 });
await page.waitForTimeout(700);
await page.fill("#price", "27000");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin/products", { timeout: 6000 });
await page.waitForTimeout(600);

// NOW toggle availability, exactly like phaseC does
const availToggle = page.locator("tr", { hasText: createdProductName }).locator("button[role=switch]").first();
console.log("count:", await availToggle.count());
const before = await availToggle.getAttribute("aria-checked");
console.log("before:", before);
await availToggle.click();
await page.waitForTimeout(600);
const after = await availToggle.getAttribute("aria-checked");
console.log("after (600ms):", after);
await page.waitForTimeout(1000);
const after2 = await availToggle.getAttribute("aria-checked");
console.log("after (1600ms total):", after2);
await browser.close();
