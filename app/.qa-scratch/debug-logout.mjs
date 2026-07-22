import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(700);
console.log("body before logout click:", (await page.locator("body").innerText()).slice(0,150));
const btn = page.locator("button:has-text('Log out')");
console.log("Log out button count:", await btn.count());
await btn.first().click();
await page.waitForTimeout(1000);
console.log("URL after logout:", page.url());
await browser.close();
