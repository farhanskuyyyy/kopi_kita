import { chromium } from "playwright";
import fs from "node:fs";

export const BASE = "http://localhost:4173";
export const SHOT_DIR = new URL("./shots/", import.meta.url).pathname;
fs.mkdirSync(SHOT_DIR, { recursive: true });

export async function newTrackedPage(browser, label) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Filter out MSW's own informational "error"-level groupings if any (MSW uses log/group, not error)
      consoleErrors.push({ url: page.url(), text });
    }
  });
  page.on("pageerror", (e) => {
    consoleErrors.push({ url: page.url(), text: `pageerror: ${e.message}` });
  });
  page._consoleErrors = consoleErrors;
  return page;
}

export function newResult() {
  return { screens: [], flows: [], defects: [], gating: [], responsive: [], a11y: [] };
}

export async function record(result, category, entry) {
  result[category].push(entry);
}

export async function shot(page, name) {
  const path = `${SHOT_DIR}${name}.png`;
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  return path;
}

export function launch() {
  return chromium.launch();
}
