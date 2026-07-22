import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/menu", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.evaluate(() => window.__mockScenarios.forceServerError(true));
// trigger a refetch by reloading filters via URL query change (SPA nav, pushState) - use client-side navigation
await page.goto("http://localhost:4173/menu?price_min=0", { waitUntil: "networkidle" }); // still full nav though since goto always full nav in playwright? Actually goto to same origin does trigger full reload.
await page.waitForTimeout(1000);
console.log(await page.locator("body").innerText());
await browser.close();
