import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
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
await page.waitForTimeout(1200);
const radios = page.locator("[role=radio]");
const n = await radios.count();
console.log("role=radio count:", n);
for (let i=0;i<n;i++){
  console.log(i, "value=", await radios.nth(i).getAttribute("value"), "text=", await radios.nth(i).textContent());
}
await browser.close();
