import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
await page.waitForTimeout(500);

console.log("localStorage before reload:", await page.evaluate(() => localStorage.getItem("coffeeshop.customer-session")));

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);

console.log("URL after reload:", page.url());
console.log("localStorage after reload:", await page.evaluate(() => localStorage.getItem("coffeeshop.customer-session")));
console.log("--- body after reload ---");
console.log(await page.locator("body").innerText());

await browser.close();
