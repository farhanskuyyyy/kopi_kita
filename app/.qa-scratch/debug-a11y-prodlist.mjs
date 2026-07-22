import { chromium } from "playwright";
import { injectAxe, getViolations } from "axe-playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({width:1440,height:900});
await page.goto("http://localhost:4173/admin/login", { waitUntil: "networkidle" });
await page.fill("#username", "admin.catalog");
await page.fill("#password", "Admin123!");
await page.locator("button[type=submit]").click();
await page.waitForURL("**/admin", { timeout: 6000 });
await page.locator("a[href='/admin/products']").first().click();
await page.waitForURL("**/admin/products");
await page.waitForTimeout(1200);
await injectAxe(page);
const violations = await getViolations(page, undefined, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa"] } });
for (const v of violations) {
  if (v.id === "button-name") {
    console.log(v.impact, v.id, "nodes:", v.nodes.length);
    console.log("First node HTML:", v.nodes[0].html);
    console.log("target:", JSON.stringify(v.nodes[0].target));
  }
}
await browser.close();
