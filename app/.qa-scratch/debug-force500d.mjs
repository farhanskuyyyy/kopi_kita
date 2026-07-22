import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:4173/menu", { waitUntil: "networkidle" });
const result = await page.evaluate(async () => {
  const res = await fetch("/api/v1/products", { headers: { "x-mock-scenario": "force-500" } });
  return { status: res.status, body: await res.text() };
});
console.log("direct fetch with header:", JSON.stringify(result).slice(0,300));

const result2 = await page.evaluate(async () => {
  const res = await fetch("/api/v1/products?_scenario=force-500");
  return { status: res.status, body: await res.text() };
});
console.log("direct fetch with query param:", JSON.stringify(result2).slice(0,300));

const result3 = await page.evaluate(async () => {
  window.__mockScenarios.forceServerError(true);
  const res = await fetch("/api/v1/products");
  return { status: res.status, body: await res.text() };
});
console.log("direct fetch with global flag set:", JSON.stringify(result3).slice(0,300));

await browser.close();
