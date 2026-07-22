import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type()==='error') console.log('[console.error]', msg.text()); });

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(500);

const ls1 = await page.evaluate(() => localStorage.getItem("coffeeshop.customer-session"));
console.log("localStorage right after login (before any reload):", ls1);

// SPA nav (click) to Order History link instead of goto
const ordersLink = page.locator("a[href='/account/orders']").first();
if (await ordersLink.count()) {
  await ordersLink.click();
  await page.waitForURL("**/account/orders");
} else {
  console.log("no direct link found, trying nav via account page text");
}
await page.waitForTimeout(1000);
console.log("URL after SPA nav to orders:", page.url());
console.log("--- order history body via SPA nav (no reload) ---");
console.log(await page.locator("body").innerText());

await browser.close();
