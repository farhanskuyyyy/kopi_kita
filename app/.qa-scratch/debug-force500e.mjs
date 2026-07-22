import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/menu", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.evaluate(() => window.__mockScenarios.forceServerError(true));
// SPA nav via clicking a category chip in the same page (no full reload)
const espressoLink = page.locator("a[href='/menu/espresso']").first();
await espressoLink.click();
await page.waitForTimeout(1200);
console.log("URL:", page.url());
console.log(await page.locator("body").innerText());
await browser.close();
