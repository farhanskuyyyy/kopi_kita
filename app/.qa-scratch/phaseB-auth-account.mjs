import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import fs from "node:fs";

const results = { screens: [], flows: [], defects: [] };
function pass(screen, notes) { results.screens.push({ screen, status: "PASS", notes }); }
function fail(screen, notes) { results.screens.push({ screen, status: "FAIL", notes }); results.defects.push({ screen, severity: "high", notes }); }
function flow(name, status, notes) { results.flows.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity: "high", notes }); }

async function main() {
  const browser = await launch();
  const page = await newTrackedPage(browser, "auth");

  // ---------- Screen 11: Login ----------
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.waitForSelector("form", { timeout: 5000 });
    // wrong credentials
    await page.fill("#email", "sari@example.com");
    await page.fill("#password", "WrongPassword1");
    await page.locator("button[type=submit]").click();
    await page.waitForTimeout(1000);
    const wrongBody = await page.locator("body").innerText();
    const wrongShown = /incorrect|invalid/i.test(wrongBody);
    flow("Login-Wrong-Credentials", wrongShown ? "PASS" : "FAIL", wrongBody.slice(0,200).replace(/\n/g," "));

    // correct credentials
    await page.fill("#email", "sari@example.com");
    await page.fill("#password", "Passw0rd!");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/account", { timeout: 6000 });
    pass("11-Login", "login succeeded, redirected to /account");
    await shot(page, "11-login-success");
  } catch (e) { fail("11-Login", e.message); }

  // ---------- Screen 13: Account Home ----------
  try {
    await page.waitForTimeout(500);
    const accBody = await page.locator("body").innerText();
    pass("13-AccountHome", `snippet=${accBody.slice(0,200).replace(/\n/g," ")}`);
    await shot(page, "13-account-home");

    // already-authenticated -> /login redirects to /account. This is a full navigation by
    // nature (testing direct-URL entry), so allow generous settle time for the
    // zustand-persist rehydration race (see DEFECT test below) before asserting.
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const redirected = page.url().includes("/account") && !page.url().includes("/login");
    flow("Login-AlreadyAuthed-Redirect", redirected ? "PASS" : "FAIL", `url=${page.url()}`);
    if (!redirected) {
      // re-login to keep the rest of the suite unblocked
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      await page.fill("#email", "sari@example.com");
      await page.fill("#password", "Passw0rd!");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/account", { timeout: 6000 });
    }
  } catch (e) { fail("13-AccountHome", e.message); }

  // ---------- DEFECT CHECK: does a reload of an authenticated /account* page survive,
  // as the persisted-session design (customerSessionStore.ts comment) intends? ----------
  try {
    await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const tokenBefore = await page.evaluate(() => {
      const raw = localStorage.getItem("coffeeshop.customer-session");
      return raw ? JSON.parse(raw).state.token : null;
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const urlAfter = page.url();
    const tokenAfter = await page.evaluate(() => {
      const raw = localStorage.getItem("coffeeshop.customer-session");
      return raw ? JSON.parse(raw).state.token : null;
    });
    const bodyAfter = await page.locator("body").innerText();
    const survived = urlAfter.includes("/account") && !urlAfter.includes("/login") && tokenAfter !== null;
    flow(
      "DEFECT-Account-Reload-Session-Loss",
      survived ? "PASS" : "FAIL",
      `tokenBefore=${tokenBefore ? "present" : "null"}; urlAfter=${urlAfter}; tokenAfter=${tokenAfter ? "present" : "null"}; bodySnippet=${bodyAfter.slice(0,150).replace(/\n/g," ")}`
    );
    await shot(page, "13b-reload-session-loss");
    // re-login to continue the rest of the flow
    if (!survived) {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      await page.fill("#email", "sari@example.com");
      await page.fill("#password", "Passw0rd!");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/account", { timeout: 6000 });
    }
  } catch (e) { flow("DEFECT-Account-Reload-Session-Loss", "FAIL", e.message); }

  // ---------- Screen 14: Order History + reorder (SPA nav via header, since goto reload
  // trips the defect above) ----------
  try {
    const ordersLink = page.locator("a[href='/account/orders']").first();
    if (await ordersLink.count()) {
      await ordersLink.click();
      await page.waitForURL("**/account/orders", { timeout: 5000 });
    } else {
      await page.goto(`${BASE}/account/orders`, { waitUntil: "networkidle" });
    }
    await page.waitForTimeout(700);
    const histBody = await page.locator("body").innerText();
    pass("14-OrderHistory", `snippet=${histBody.slice(0,250).replace(/\n/g," ")}`);
    await shot(page, "14-order-history");

    const reorderBtn = page.locator("button:has-text('Reorder')").first();
    if (await reorderBtn.count()) {
      await reorderBtn.click();
      await page.waitForTimeout(1200);
      const afterReorderUrl = page.url();
      const reorderBody = await page.locator("body").innerText();
      flow("Reorder-Flow", afterReorderUrl.includes("/cart") ? "PASS" : "FAIL", `redirected to ${afterReorderUrl}; snippet=${reorderBody.slice(0,200).replace(/\n/g," ")}`);
      await shot(page, "14b-reorder-result");
    } else {
      flow("Reorder-Flow", "FAIL", "No Reorder button found on Order History page");
    }
  } catch (e) { fail("14-OrderHistory", e.message); }

  // ---------- Screen 15: Favorites (SPA nav) ----------
  try {
    const favLink = page.locator("a[href='/account/favorites']").first();
    if (await favLink.count()) {
      await favLink.click();
      await page.waitForURL("**/account/favorites", { timeout: 5000 });
    } else {
      await page.goto(`${BASE}/account/favorites`, { waitUntil: "networkidle" });
    }
    await page.waitForTimeout(700);
    const favBody = await page.locator("body").innerText();
    const favOk = page.url().includes("/account/favorites") && !/session expired/i.test(favBody);
    if (favOk) pass("15-Favorites", `snippet=${favBody.slice(0,250).replace(/\n/g," ")}`);
    else fail("15-Favorites", `url=${page.url()}; snippet=${favBody.slice(0,250).replace(/\n/g," ")}`);
    await shot(page, "15-favorites");

    // remove a favorite if present
    const removeBtn = page.locator("button:has-text('Remove')").first();
    if (await removeBtn.count()) {
      const beforeCount = await page.locator("button:has-text('Remove')").count();
      await removeBtn.click();
      await page.waitForTimeout(800);
      const afterCount = await page.locator("button:has-text('Remove')").count();
      flow("Favorites-Remove", afterCount < beforeCount ? "PASS" : "FAIL", `before=${beforeCount} after=${afterCount}`);
    }
  } catch (e) { fail("15-Favorites", e.message); }

  // ---------- Logout ----------
  try {
    const accountIconLink = page.locator("a[href='/account']").first();
    if (await accountIconLink.count()) {
      await accountIconLink.click();
      await page.waitForURL("**/account", { timeout: 5000 });
    } else {
      await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    }
    await page.waitForTimeout(500);
    const logoutBtn = page.locator("button:has-text('Logout'), button:has-text('Log out')").first();
    await logoutBtn.click();
    await page.waitForTimeout(800);
    const url = page.url();
    flow("Logout", url === `${BASE}/` || url === BASE ? "PASS" : "FAIL", `redirected to ${url}`);
  } catch (e) { flow("Logout", "FAIL", e.message); }

  // ---------- /account gating when logged out ----------
  try {
    await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const url = page.url();
    flow("Account-Route-Gating-LoggedOut", url.includes("/login") ? "PASS" : "FAIL", `url=${url}`);
  } catch (e) { flow("Account-Route-Gating-LoggedOut", "FAIL", e.message); }

  // ---------- Empty favorites (andi@example.com has none seeded) ----------
  try {
    const page2 = await newTrackedPage(browser, "andi");
    await page2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page2.fill("#email", "andi@example.com");
    await page2.fill("#password", "Passw0rd!");
    await page2.locator("button[type=submit]").click();
    await page2.waitForURL("**/account", { timeout: 6000 });
    const favLink2 = page2.locator("a[href='/account/favorites']").first();
    if (await favLink2.count()) {
      await favLink2.click();
      await page2.waitForURL("**/account/favorites", { timeout: 5000 });
    } else {
      await page2.goto(`${BASE}/account/favorites`, { waitUntil: "networkidle" });
    }
    await page2.waitForTimeout(700);
    const emptyFavBody = await page2.locator("body").innerText();
    flow("Empty-Favorites-State", /no favorites/i.test(emptyFavBody) ? "PASS" : "FAIL", emptyFavBody.slice(0,200).replace(/\n/g," "));
    await shot(page2, "15b-empty-favorites");
    await page2.close();
  } catch (e) { flow("Empty-Favorites-State", "FAIL", e.message); }

  // ---------- Screen 12: Register ----------
  try {
    const page3 = await newTrackedPage(browser, "register");
    await page3.goto(`${BASE}/register`, { waitUntil: "networkidle" });
    await page3.waitForSelector("form", { timeout: 5000 });
    // duplicate email
    await page3.fill("#name", "Test Dup");
    await page3.fill("#email", "sari@example.com");
    await page3.fill("#password", "Passw0rd!");
    const confirmField = page3.locator("#confirmPassword, #passwordConfirm, [name='confirmPassword']").first();
    if (await confirmField.count()) await confirmField.fill("Passw0rd!");
    await page3.locator("button[type=submit]").click();
    await page3.waitForTimeout(1000);
    const dupBody = await page3.locator("body").innerText();
    flow("Register-Duplicate-Email", /already exists/i.test(dupBody) ? "PASS" : "FAIL", dupBody.slice(0,200).replace(/\n/g," "));

    // password mismatch
    await page3.fill("#email", "newuser_qa@example.com");
    await page3.fill("#password", "Passw0rd!");
    if (await confirmField.count()) await confirmField.fill("Different1!");
    await page3.locator("button[type=submit]").click();
    await page3.waitForTimeout(800);
    const mismatchBody = await page3.locator("body").innerText();
    flow("Register-Password-Mismatch", /match/i.test(mismatchBody) ? "PASS" : "FAIL", mismatchBody.slice(0,200).replace(/\n/g," "));

    // successful registration
    await page3.fill("#email", `qa_new_${Date.now()}@example.com`);
    await page3.fill("#password", "Passw0rd!");
    if (await confirmField.count()) await confirmField.fill("Passw0rd!");
    await page3.locator("button[type=submit]").click();
    await page3.waitForURL("**/account", { timeout: 6000 });
    pass("12-Register", "registration succeeded, redirected to /account");
    await shot(page3, "12-register-success");
    await page3.close();
  } catch (e) { fail("12-Register", e.message); }

  const consoleErrors = page._consoleErrors;
  fs.writeFileSync(new URL("./phaseB-results.json", import.meta.url), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(JSON.stringify({ results, consoleErrorCount: consoleErrors.length }, null, 2));
  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
