import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(1500);
console.log("Before reload, cart badge:", (await page.locator("body").innerText()).match(/Cart[^\n]*/g));

const nav = await page.evaluate(() => window.location.href);
console.log("location before reload:", nav);

const [resp] = await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle" }),
  page.reload(),
]);
console.log("Reload response status:", resp && resp.status());
await page.waitForTimeout(1000);
console.log("After reload, location:", await page.evaluate(() => window.location.href));
console.log("After reload, cart badge:", (await page.locator("body").innerText()).match(/Cart[^\n]*/g));
const ls = await page.evaluate(() => ({ len: localStorage.length, keys: Object.keys(localStorage) }));
console.log("localStorage after reload:", ls);

await browser.close();
