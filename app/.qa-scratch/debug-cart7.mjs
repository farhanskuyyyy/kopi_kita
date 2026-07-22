import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(1000);

const badgeLabel = await page.locator('button[aria-label^="Cart,"]').getAttribute("aria-label");
console.log("Mini-cart badge aria-label after add:", badgeLabel);

// go to /cart within SPA (click link, not full nav)
await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("Cart page body (after SPA-less goto, which IS a full nav in Playwright):");
console.log((await page.locator("body").innerText()).slice(0, 500));
const badgeLabel2 = await page.locator('button[aria-label^="Cart,"]').getAttribute("aria-label");
console.log("Mini-cart badge aria-label on /cart page:", badgeLabel2);

await browser.close();
