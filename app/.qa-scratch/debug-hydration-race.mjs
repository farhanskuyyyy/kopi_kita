import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

// slow down network slightly won't matter; instead let's log fetch calls with timestamps
await page.route("**/api/v1/**", async (route) => {
  console.log(`[fetch] ${Date.now()} ${route.request().method()} ${route.request().url()} auth=${route.request().headers()['authorization'] || 'NONE'}`);
  await route.continue();
});

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(500);

console.log("=== NOW RELOADING at", Date.now(), "===");
await page.goto("http://localhost:4173/account", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("URL after reload+wait:", page.url());

await browser.close();
