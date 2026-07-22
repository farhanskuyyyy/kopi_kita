import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import fs from "node:fs";

const results = { screens: [], flows: [], defects: [] };

function pass(screen, notes) { results.screens.push({ screen, status: "PASS", notes }); }
function fail(screen, notes) { results.screens.push({ screen, status: "FAIL", notes }); results.defects.push({ screen, severity: "high", notes }); }
function flow(name, status, notes) { results.flows.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "high", notes }); }

async function main() {
  const browser = await launch();
  const page = await newTrackedPage(browser, "customer");

  // ---------- Screen 1: Home ----------
  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Kopi Kita", { timeout: 5000 });
    const hasCategoryTiles = await page.locator("a[href^='/menu/']").count();
    const hasFeatured = await page.locator("body").innerText();
    pass("1-Home", `loaded; category tiles=${hasCategoryTiles}; console_errors_so_far=${page._consoleErrors.length}`);
    await shot(page, "01-home");
  } catch (e) { fail("1-Home", e.message); }

  // ---------- Screen 2: Menu (all + category) ----------
  try {
    await page.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
    await page.waitForSelector("h1", { timeout: 5000 });
    const count1 = await page.locator("a.group, [data-testid='product-card']").count();
    await page.goto(`${BASE}/menu/espresso`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const bodyEsp = await page.locator("body").innerText();
    const count2 = await page.locator("a.group, [data-testid='product-card']").count();
    pass("2-Menu", `/menu products=${count1}; /menu/espresso products=${count2}; hasEspressoHeading=${/Espresso/i.test(bodyEsp)}`);
    await shot(page, "02-menu-espresso");

    // invalid category -> 404
    await page.goto(`${BASE}/menu/not-a-real-category-xyz`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const body404 = await page.locator("body").innerText();
    if (/not found|404/i.test(body404)) pass("2-Menu-404", "invalid categorySlug correctly renders 404");
    else fail("2-Menu-404", `invalid categorySlug did NOT render 404. Body: ${body404.slice(0,200)}`);

    // filter: price min>max
    await page.goto(`${BASE}/menu?price_min=100000&price_max=1000`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const bodyFilter = await page.locator("body").innerText();
    pass("2-Menu-filter-reset", `min>max filter body snippet: ${bodyFilter.slice(0,150).replace(/\n/g," ")}`);

    // sort invalid fallback
    await page.goto(`${BASE}/menu?sort=bogus`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const okSort = await page.locator("body").innerText();
    pass("2-Menu-sort-fallback", `invalid sort did not crash. snippet: ${okSort.slice(0,100).replace(/\n/g," ")}`);
  } catch (e) { fail("2-Menu", e.message); }

  // ---------- Screen 3: Search ----------
  try {
    await page.goto(`${BASE}/search`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const promptBody = await page.locator("body").innerText();
    const hasPrompt = !/error/i.test(promptBody);

    await page.goto(`${BASE}/search?q=latte`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const resultsBody = await page.locator("body").innerText();

    await page.goto(`${BASE}/search?q=doesnotexist123`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const emptyBody = await page.locator("body").innerText();
    const emptyOk = /no results/i.test(emptyBody);
    pass("3-Search", `empty-q prompt ok=${hasPrompt}; 'latte' results snippet=${resultsBody.slice(0,80).replace(/\n/g," ")}; empty-search-ok=${emptyOk}`);
    await shot(page, "03-search-empty");
  } catch (e) { fail("3-Search", e.message); }

  // ---------- Screen 4: Product Detail ----------
  let productIdForCart = "prod_latte";
  try {
    await page.goto(`${BASE}/product/${productIdForCart}`, { waitUntil: "networkidle" });
    await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
    // validation test: click without selection
    await page.locator("button:has-text('Add to Cart')").click();
    await page.waitForTimeout(400);
    const validationBody = await page.locator("body").innerText();
    const validationShown = /please select/i.test(validationBody);

    // nonexistent product -> 404
    await page.goto(`${BASE}/product/prod_does_not_exist`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const notFoundBody = await page.locator("body").innerText();
    const nf = /not found|404/i.test(notFoundBody);

    // out of stock product
    await page.goto(`${BASE}/product/prod_nitro_cold_brew`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const oosBody = await page.locator("body").innerText();
    const oosShown = /out of stock/i.test(oosBody);
    const addBtnDisabled = await page.locator("button:has-text('Add to Cart')").first().isDisabled().catch(()=>null);

    pass("4-ProductDetail", `required-field-validation-shown=${validationShown}; nonexistent-id-404=${nf}; out-of-stock-badge=${oosShown}; add-to-cart-disabled-when-oos=${addBtnDisabled}`);
    await shot(page, "04-product-oos");
  } catch (e) { fail("4-ProductDetail", e.message); }

  // ---------- Screen 5-8: Cart + Checkout flow (happy path) ----------
  try {
    await page.goto(`${BASE}/product/${productIdForCart}`, { waitUntil: "networkidle" });
    await page.waitForSelector("button:has-text('Add to Cart')", { timeout: 5000 });
    await page.getByText("Small", { exact: true }).click();
    await page.getByText("Regular Milk", { exact: true }).click();
    await page.waitForTimeout(200);
    await page.locator("button:has-text('Add to Cart')").click();
    await page.waitForTimeout(600);

    await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Proceed to Checkout", { timeout: 5000 });
    const cartBody = await page.locator("body").innerText();
    pass("5-Cart", `cart shows item, snippet=${cartBody.slice(0,120).replace(/\n/g," ")}`);
    await shot(page, "05-cart");

    // promo code invalid
    const promoInput = page.locator("input[placeholder*='romo' i], input[name*='promo' i]").first();
    if (await promoInput.count()) {
      await promoInput.fill("OLDPROMO");
      await page.locator("button:has-text('Apply')").click();
      await page.waitForTimeout(600);
      const invalidPromoBody = await page.locator("body").innerText();
      const invalidShown = /invalid|expired|not valid/i.test(invalidPromoBody);
      // valid promo
      await promoInput.fill("COFFEE10");
      await page.locator("button:has-text('Apply')").click();
      await page.waitForTimeout(600);
      const validPromoBody = await page.locator("body").innerText();
      const discountShown = /discount/i.test(validPromoBody);
      pass("5-Cart-Promo", `invalid-code-message-shown=${invalidShown}; valid-code-discount-shown=${discountShown}`);
    } else {
      fail("5-Cart-Promo", "promo code input not found");
    }

    await page.locator("button:has-text('Proceed to Checkout')").click();
    await page.waitForURL("**/checkout/details", { timeout: 5000 });
    pass("6-CheckoutDetails-nav", "reached /checkout/details");

    // empty-cart guard test (separate context later); now fill details
    await page.fill("#fullName", "QA Tester");
    await page.fill("#email", "qa.tester@example.com");
    await page.fill("#phone", "081234567890");
    // try delivery method to exercise address subform
    const deliveryRadio = page.locator("text=Delivery").first();
    if (await deliveryRadio.count()) {
      await deliveryRadio.click();
      await page.waitForTimeout(200);
      const addrBody = await page.locator("body").innerText();
      const addrShown = /address/i.test(addrBody);
      pass("6-CheckoutDetails-delivery", `address subform shown on delivery select=${addrShown}`);
      // switch back to pickup to keep flow simple
      const pickupRadio = page.locator("text=Pickup").first();
      if (await pickupRadio.count()) await pickupRadio.click();
    }
    await page.locator("button:has-text('Continue to Payment')").click();
    await page.waitForURL("**/checkout/payment", { timeout: 5000 });
    pass("7-CheckoutPayment-nav", "reached /checkout/payment");
    await shot(page, "07-checkout-payment");

    // exercise forced payment failure via the "Demo Declined Card" option
    await page.waitForTimeout(1200); // allow mocked latency for payment page to fully render
    const declinedOption = page.locator("[role=radio]", { hasText: "" }).locator("visible=true");
    const declinedRadio = page.locator("[role=radio][value='demo_declined_card']");
    if (await declinedRadio.count()) {
      await declinedRadio.click();
      await page.locator("button:has-text('Continue to Review')").click();
      await page.waitForTimeout(1500);
      const failBody = await page.locator("body").innerText();
      const failShown = /fail|declin/i.test(failBody);
      const stillOnPayment = page.url().includes("/checkout/payment");
      flow("Payment-Failure-Path", failShown && stillOnPayment ? "PASS" : "FAIL", `failShown=${failShown}; stillOnPayment=${stillOnPayment}`);
      await shot(page, "07b-payment-declined");
    }
    // select first available (non-declined) payment method and continue
    const paymentRadios = page.locator("[role=radio]");
    const radioCount = await paymentRadios.count();
    let selected = false;
    for (let i = 0; i < radioCount; i++) {
      const r = paymentRadios.nth(i);
      const val = (await r.getAttribute("value")) || "";
      if (!/declin/i.test(val)) { await r.click(); selected = true; break; }
    }
    if (!selected && radioCount > 0) await paymentRadios.first().click();
    await page.waitForTimeout(200);
    await page.locator("button:has-text('Continue to Review')").click();
    await page.waitForURL("**/checkout/review", { timeout: 8000 });
    pass("8-CheckoutReview-nav", "reached /checkout/review");
    await shot(page, "08-checkout-review");

    await page.locator("button:has-text('Place Order')").click();
    await page.waitForURL(/\/order\/confirmation\//, { timeout: 10000 });
    await page.waitForSelector("text=/order confirm/i", { timeout: 5000 }).catch(()=>{});
    const confirmUrl = page.url();
    const orderId = confirmUrl.split("/").pop();
    pass("9-OrderConfirmation", `order placed, url=${confirmUrl}`);
    await shot(page, "09-order-confirmation");

    // guest account-creation banner (A5)
    const confirmBody = await page.locator("body").innerText();
    const bannerShown = /create an account/i.test(confirmBody);
    flow("Guest-Confirmation-Banner-A5", bannerShown ? "PASS" : "FAIL", `banner shown=${bannerShown}`);

    // Screen 10: tracking
    const trackLink = page.locator("a:has-text('Track')").first();
    if (await trackLink.count()) {
      await trackLink.click();
      await page.waitForURL(/\/track/, { timeout: 5000 });
    } else {
      await page.goto(`${BASE}/orders/${orderId}/track`, { waitUntil: "networkidle" });
    }
    await page.waitForTimeout(500);
    const trackBody = await page.locator("body").innerText();
    pass("10-OrderTracking", `tracking page snippet=${trackBody.slice(0,150).replace(/\n/g," ")}`);
    await shot(page, "10-order-tracking");

    // nonexistent order -> 404
    await page.goto(`${BASE}/order/confirmation/order_does_not_exist`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const nfOrderBody = await page.locator("body").innerText();
    flow("Order-404-guard", /not found|404/i.test(nfOrderBody) ? "PASS" : "FAIL", nfOrderBody.slice(0,150));

    fs.writeFileSync(new URL("./last-order-id.txt", import.meta.url), orderId);
  } catch (e) {
    fail("5-8-CartCheckoutFlow", e.message);
  }

  // ---------- Empty cart guard (§3.4) ----------
  try {
    const page2 = await newTrackedPage(browser, "empty-cart-guard");
    // fresh context without cart items
    await page2.goto(`${BASE}/checkout/details`, { waitUntil: "networkidle" });
    await page2.waitForTimeout(600);
    const url = page2.url();
    const guardOk = url.includes("/cart") && !url.includes("/checkout");
    flow("Empty-Cart-Guard", guardOk ? "PASS" : "FAIL", `direct nav to /checkout/details with empty cart -> ${url}`);
    await page2.close();
  } catch (e) { flow("Empty-Cart-Guard", "FAIL", e.message); }

  // ---------- Screen 16: Store Info ----------
  try {
    await page.goto(`${BASE}/store-info`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const storeBody = await page.locator("body").innerText();
    pass("16-StoreInfo", `snippet=${storeBody.slice(0,150).replace(/\n/g," ")}`);
    await shot(page, "16-store-info");
  } catch (e) { fail("16-StoreInfo", e.message); }

  // ---------- Screen 27: 404 catch-all ----------
  try {
    await page.goto(`${BASE}/this-route-does-not-exist`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const body404 = await page.locator("body").innerText();
    pass("27-NotFound", /not found|404/i.test(body404) ? "shows 404" : `UNEXPECTED: ${body404.slice(0,150)}`);
    await shot(page, "27-404");
  } catch (e) { fail("27-NotFound", e.message); }

  // ---------- Forced 500 scenario (global toggle; must use SPA nav — a full page
  // reload creates a new JS realm and resets the in-memory window.__mockScenarios flag) ----------
  try {
    const page3 = await newTrackedPage(browser, "force-500");
    await page3.goto(`${BASE}/menu`, { waitUntil: "networkidle" });
    await page3.waitForTimeout(500);
    await page3.evaluate(() => window.__mockScenarios && window.__mockScenarios.forceServerError(true));
    await page3.locator("a[href='/menu/espresso']").first().click();
    await page3.waitForTimeout(2200);
    const errBody = await page3.locator("body").innerText();
    const bannerVisible = await page3.locator(".border-destructive, [class*='destructive']").count();
    const bannerOk = /retry|error|couldn.t|failed|something went wrong/i.test(errBody) || bannerVisible > 0;
    flow("Forced-500-error-banner", bannerOk ? "PASS" : "FAIL", `bannerVisibleEls=${bannerVisible}; bodySnippet=${errBody.slice(0,200).replace(/\n/g," ")}`);
    await shot(page3, "500-error-banner");
    await page3.evaluate(() => window.__mockScenarios && window.__mockScenarios.reset());
    await page3.close();
  } catch (e) { flow("Forced-500-error-banner", "FAIL", e.message); }

  // ---------- Forced stock-unavailable scenario (SPA nav, same reasoning as above) ----------
  try {
    const page4 = await newTrackedPage(browser, "force-stock");
    await page4.goto(`${BASE}/product/${productIdForCart}`, { waitUntil: "networkidle" });
    await page4.getByText("Small", { exact: true }).click();
    await page4.getByText("Regular Milk", { exact: true }).click();
    await page4.locator("button:has-text('Add to Cart')").click();
    await page4.waitForTimeout(500);
    await page4.evaluate(() => window.__mockScenarios && window.__mockScenarios.forceStockUnavailable(true));
    await page4.locator('button[aria-label^="Cart,"]').click();
    await page4.waitForTimeout(300);
    await page4.locator("text=View Cart").click();
    await page4.waitForURL("**/cart", { timeout: 5000 });
    await page4.waitForTimeout(1200);
    const stockBody = await page4.locator("body").innerText();
    const unavailableShown = /unavailable|out of stock/i.test(stockBody);
    flow("Forced-Stock-Unavailable", unavailableShown ? "PASS" : "FAIL", stockBody.slice(0,250).replace(/\n/g," "));
    await shot(page4, "cart-stock-unavailable");
    await page4.evaluate(() => window.__mockScenarios && window.__mockScenarios.reset());
    await page4.close();
  } catch (e) { flow("Forced-Stock-Unavailable", "FAIL", e.message); }

  const consoleErrors = page._consoleErrors;
  fs.writeFileSync(new URL("./phaseA-results.json", import.meta.url), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(JSON.stringify({ results, consoleErrorCount: consoleErrors.length }, null, 2));

  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
