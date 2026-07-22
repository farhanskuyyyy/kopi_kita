import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });

// select required radios: Small (size), Regular Milk (milk)
await page.getByText("Small", { exact: true }).click();
await page.getByText("Regular Milk", { exact: true }).click();
await page.waitForTimeout(300);

await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(1000);

const badgeLabel = await page.locator('button[aria-label^="Cart,"]').getAttribute("aria-label");
console.log("Mini-cart badge aria-label after add (with selections):", badgeLabel);

const ls = await page.evaluate(() => ({ len: localStorage.length, keys: Object.keys(localStorage), cart: localStorage.getItem("coffeeshop.cart") }));
console.log("localStorage:", JSON.stringify(ls));

// full nav to cart
await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("--- cart page body ---");
console.log((await page.locator("body").innerText()).slice(0, 800));

await browser.close();
