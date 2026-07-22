import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(1500);

const directCheck = await page.evaluate(() => {
  const out = {};
  out.lsLength = localStorage.length;
  out.lsKeys = Object.keys(localStorage);
  out.cartKey = localStorage.getItem("coffeeshop.cart");
  out.ssKeys = Object.keys(sessionStorage);
  return out;
});
console.log("Direct check:", JSON.stringify(directCheck, null, 2));

await browser.close();
