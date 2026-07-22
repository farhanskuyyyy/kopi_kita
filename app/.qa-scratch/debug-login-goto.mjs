import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { const t = msg.text(); if (/\[MSW\]/.test(t)) console.log("[MSW]", t); });

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(500);
console.log("=== now goto /login again (full nav) while authenticated ===");
await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("URL:", page.url());
console.log(await page.locator("body").innerText());
await browser.close();
