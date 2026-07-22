import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.getByText("Small", { exact: true }).click();
await page.getByText("Regular Milk", { exact: true }).click();
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(500);
await page.evaluate(() => window.__mockScenarios.forceStockUnavailable(true));
// SPA nav to cart via header cart badge -> View Cart link, to avoid full reload
await page.locator('button[aria-label^="Cart,"]').click();
await page.waitForTimeout(300);
await page.locator("text=View Cart").click();
await page.waitForURL("**/cart");
await page.waitForTimeout(1200);
console.log(await page.locator("body").innerText());
await page.screenshot({path:".qa-scratch/stock-unavail.png", fullPage:true});
await browser.close();
