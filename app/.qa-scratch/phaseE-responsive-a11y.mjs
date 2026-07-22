import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import { injectAxe, getViolations } from "axe-playwright";
import fs from "node:fs";

const results = { responsive: [], a11y: [], defects: [] };
function resp(name, status, notes) { results.responsive.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "moderate", notes }); }
function a11y(page_name, critical, serious, details) {
  results.a11y.push({ page: page_name, critical, serious, details });
  if (critical > 0) results.defects.push({ screen: `a11y:${page_name}`, severity: "high", notes: `${critical} critical axe violations` });
}

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
};

const KEY_SCREENS = [
  { name: "Home", path: "/" },
  { name: "Menu", path: "/menu" },
  { name: "ProductDetail", path: "/product/prod_latte" },
  { name: "Cart", path: "/cart" },
  { name: "Login", path: "/login" },
  { name: "AdminLogin", path: "/admin/login" },
];

async function main() {
  const browser = await launch();

  // ---------- Responsiveness: mobile + desktop viewport, check no horizontal overflow ----------
  for (const screen of KEY_SCREENS) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const page = await newTrackedPage(browser, `${screen.name}-${vpName}`);
      try {
        await page.setViewportSize(vp);
        await page.goto(`${BASE}${screen.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          return { docWidth, winWidth, hasOverflow: docWidth > winWidth + 2 };
        });
        resp(
          `${screen.name}-${vpName}`,
          overflow.hasOverflow ? "FAIL" : "PASS",
          `viewport=${vp.width}x${vp.height}; docScrollWidth=${overflow.docWidth}; hasHorizontalOverflow=${overflow.hasOverflow}`
        );
        await shot(page, `resp-${screen.name}-${vpName}`);
      } catch (e) {
        resp(`${screen.name}-${vpName}`, "FAIL", e.message);
      }
      await page.close();
    }
  }

  // ---------- Accessibility: axe-core scan on key screens (desktop viewport) ----------
  for (const screen of KEY_SCREENS) {
    const page = await newTrackedPage(browser, `a11y-${screen.name}`);
    try {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE}${screen.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await injectAxe(page);
      const violations = await getViolations(page, undefined, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
      const critical = violations.filter((v) => v.impact === "critical").length;
      const serious = violations.filter((v) => v.impact === "serious").length;
      const summary = violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length} nodes)`).join(", ");
      a11y(screen.name, critical, serious, summary || "none");
    } catch (e) {
      a11y(screen.name, -1, -1, `SCAN ERROR: ${e.message}`);
    }
    await page.close();
  }

  fs.writeFileSync(new URL("./phaseE-results.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
