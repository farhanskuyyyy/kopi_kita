import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(700);
await page.locator("button:has-text('Log out')").first().click();
await page.waitForTimeout(1200);
console.log("URL after logout:", page.url());
console.log(await page.locator("body").innerText());
await browser.close();
