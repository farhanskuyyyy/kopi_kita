import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(1500);
const ls = await page.evaluate(() => JSON.stringify(localStorage));
console.log("localStorage after add (SPA, no reload):", ls);

// Now reload same page and recheck
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
const ls2 = await page.evaluate(() => JSON.stringify(localStorage));
console.log("localStorage after reload:", ls2);
const bodyText = await page.locator("body").innerText();
console.log("Header cart text after reload:", bodyText.match(/Cart[^\n]*/g));

await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const cartBody = await page.locator("body").innerText();
console.log("---CART PAGE BODY---");
console.log(cartBody.slice(0, 1500));

await browser.close();
