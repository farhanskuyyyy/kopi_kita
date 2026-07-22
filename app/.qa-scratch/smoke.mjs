import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

async function step(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
  }
}

await step("load home", async () => {
  await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Kopi Kita", { timeout: 5000 });
});

await step("navigate to menu", async () => {
  await page.getByRole("link", { name: /browse menu/i }).click();
  await page.waitForURL("**/menu");
  await page.waitForSelector("h1:has-text('All Products')", { timeout: 5000 });
});

await step("open product detail", async () => {
  await page.locator("a.group").first().click();
  await page.waitForURL(/\/product\//);
  await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
});

await step("add to cart", async () => {
  await page.locator("button:has-text('Add to Cart')").click();
  await page.waitForTimeout(500);
});

await step("go to cart", async () => {
  await page.goto("http://localhost:4173/cart", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Proceed to Checkout", { timeout: 5000 });
});

await step("proceed to checkout details", async () => {
  await page.locator("button:has-text('Proceed to Checkout')").click();
  await page.waitForURL("**/checkout/details");
  await page.fill("#fullName", "Test User");
  await page.fill("#email", "test@example.com");
  await page.fill("#phone", "081234567890");
  await page.locator("button:has-text('Continue to Payment')").click();
  await page.waitForURL("**/checkout/payment");
});

await step("checkout payment", async () => {
  await page.locator("button:has-text('Continue to Review')").click();
  await page.waitForURL("**/checkout/review", { timeout: 5000 });
});

await step("place order", async () => {
  await page.locator("button:has-text('Place Order')").click();
  await page.waitForURL(/\/order\/confirmation\//, { timeout: 8000 });
  await page.waitForSelector("text=Order Confirmed!", { timeout: 5000 });
});

await step("admin login", async () => {
  await page.goto("http://localhost:4173/admin/login", { waitUntil: "networkidle" });
  await page.fill("#username", "admin.catalog");
  await page.fill("#password", "Admin123!");
  await page.locator("button:has-text('Log in')").click();
  await page.waitForURL("**/admin", { timeout: 5000 });
  await page.waitForSelector("text=Dashboard", { timeout: 5000 });
});

await step("admin category delete guard", async () => {
  await page.goto("http://localhost:4173/admin/categories", { waitUntil: "networkidle" });
  await page.waitForSelector("table");
  await page.locator("tr", { hasText: "Espresso" }).locator("button:has-text('Delete')").click();
  await page.waitForSelector("text=cannot be deleted", { timeout: 5000 });
});

console.log("--- console/page errors seen during run ---");
console.log(errors.slice(0, 30).join("\n") || "(none)");

await browser.close();
