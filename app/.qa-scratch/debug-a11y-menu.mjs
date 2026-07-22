import { chromium } from "playwright";
import { injectAxe, getViolations } from "axe-playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({width:1440,height:900});
await page.goto("http://localhost:4173/menu", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await injectAxe(page);
const violations = await getViolations(page, undefined, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa"] } });
for (const v of violations) {
  console.log(v.impact, v.id, v.help);
  for (const n of v.nodes) {
    console.log("  HTML:", n.html);
    console.log("  target:", JSON.stringify(n.target));
    console.log("  failureSummary:", n.failureSummary);
  }
}
await browser.close();
