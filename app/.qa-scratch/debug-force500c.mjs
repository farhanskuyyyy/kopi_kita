import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("**/api/**", async (route) => {
  const headers = { ...route.request().headers(), "x-mock-scenario": "force-500" };
  await route.continue({ headers });
});
await page.goto("http://localhost:4173/menu", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
console.log(await page.locator("body").innerText());
await browser.close();
