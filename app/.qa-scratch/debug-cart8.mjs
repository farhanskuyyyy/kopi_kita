import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type()==='error') console.log('[console.error]', msg.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
console.log("--- full body text of product page ---");
console.log(await page.locator("body").innerText());
await page.screenshot({ path: ".qa-scratch/product-before-click.png", fullPage: true });
await browser.close();
