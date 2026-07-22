import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type()==='error') console.log('[console.error]', msg.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto("http://localhost:4173/login", { waitUntil: "networkidle" });
await page.fill("#email", "sari@example.com");
await page.fill("#password", "Passw0rd!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/account", { timeout: 6000 });
console.log("logged in, at", page.url());

await page.goto("http://localhost:4173/account/orders", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log("--- order history body ---");
console.log(await page.locator("body").innerText());
await page.screenshot({path:".qa-scratch/order-history-debug.png", fullPage:true});

// check localStorage for session token
const ls = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k=>[k, localStorage.getItem(k)])));
console.log("localStorage:", JSON.stringify(ls, null, 2).slice(0,1500));

await browser.close();
