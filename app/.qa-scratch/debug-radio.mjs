import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/checkout/payment", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const radios = page.locator("[role=radio]");
const n = await radios.count();
console.log("role=radio count:", n);
for (let i=0;i<n;i++){
  console.log(i, await radios.nth(i).getAttribute("value"), await radios.nth(i).textContent());
}
await browser.close();
