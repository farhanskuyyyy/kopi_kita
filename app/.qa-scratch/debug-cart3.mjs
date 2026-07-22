import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const buttons = await page.locator("button").allInnerTexts();
console.log("Buttons on product page:", JSON.stringify(buttons, null, 2));
await browser.close();
