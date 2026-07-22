import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(500);
console.log("--- body after clicking Add to Cart WITHOUT selecting required options ---");
console.log(await page.locator("body").innerText());
await page.screenshot({ path: ".qa-scratch/validation-check.png", fullPage: true });
await browser.close();
