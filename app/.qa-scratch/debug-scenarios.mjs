import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
const has = await page.evaluate(() => typeof window.__mockScenarios);
console.log("typeof window.__mockScenarios:", has);
if (has !== "undefined") {
  const keys = await page.evaluate(() => Object.keys(window.__mockScenarios));
  console.log("keys:", keys);
}
await browser.close();
