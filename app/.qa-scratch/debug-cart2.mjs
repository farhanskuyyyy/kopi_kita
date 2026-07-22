import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.getByRole("link", { name: /browse menu/i }).click();
await page.waitForURL("**/menu");
await page.locator("a.group").first().click();
await page.waitForURL(/\/product\//);
console.log("Product URL:", page.url());
const btn = page.locator("button:has-text('Add to Cart')");
console.log("Add to cart button count:", await btn.count());
console.log("disabled?", await btn.first().isDisabled());
await btn.first().click();
await page.waitForTimeout(1000);
// check header cart badge
const bodyText = await page.locator("body").innerText();
console.log("---after add, body has 'cart'---");
console.log(bodyText.match(/Cart[^\n]*/g));
// Now navigate to cart WITHOUT full reload (use click on cart link if present) vs goto
await page.screenshot({ path: ".qa-scratch/product-after-add.png", fullPage: true });

// check localStorage
const ls = await page.evaluate(() => JSON.stringify(localStorage));
console.log("localStorage:", ls);

await browser.close();
