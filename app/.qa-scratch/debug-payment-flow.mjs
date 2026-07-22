import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => { if (msg.type()==='error') console.log('[console.error]', msg.text()); });

await page.goto("http://localhost:4173/product/prod_latte", { waitUntil: "networkidle" });
await page.getByText("Small", { exact: true }).click();
await page.getByText("Regular Milk", { exact: true }).click();
await page.locator("button:has-text('Add to Cart')").click();
await page.waitForTimeout(400);
await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
await page.locator("button:has-text('Proceed to Checkout')").click();
await page.waitForURL("**/checkout/details");
await page.fill("#fullName", "QA Tester");
await page.fill("#email", "qa@example.com");
await page.fill("#phone", "081234567890");
await page.locator("button:has-text('Continue to Payment')").click();
await page.waitForURL("**/checkout/payment");
console.log("--- payment page body ---");
console.log(await page.locator("body").innerText());
const radios = page.locator("input[type=radio]");
const n = await radios.count();
console.log("radio count:", n);
for (let i=0;i<n;i++){
  console.log(i, await radios.nth(i).getAttribute("value"), await radios.nth(i).getAttribute("id"));
}
await browser.close();
