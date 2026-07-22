import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({width:375,height:812});
await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const nav = page.locator("nav").first();
const info = await page.evaluate(() => {
  const el = document.querySelector('nav');
  if (!el) return null;
  return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowX: getComputedStyle(el).overflowX };
});
console.log(info);
// also check the CategoryShortcuts container specifically
const catNav = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a[href^="/menu/"]'));
  return links.map(a => ({text: a.textContent, visible: a.getBoundingClientRect() }));
});
console.log(JSON.stringify(catNav, null, 2));
await browser.close();
