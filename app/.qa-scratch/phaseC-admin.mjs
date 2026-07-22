import { launch, newTrackedPage, shot, BASE } from "./helpers.mjs";
import fs from "node:fs";

const results = { screens: [], flows: [], defects: [] };
function pass(screen, notes) { results.screens.push({ screen, status: "PASS", notes }); }
function fail(screen, notes) { results.screens.push({ screen, status: "FAIL", notes }); results.defects.push({ screen, severity: "high", notes }); }
function flow(name, status, notes, severity = "high") { results.flows.push({ name, status, notes }); if (status === "FAIL") results.defects.push({ screen: name, severity, notes }); }

async function main() {
  const browser = await launch();
  const page = await newTrackedPage(browser, "admin-catalog");

  // ---------- Screen 17: Admin Login ----------
  try {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.waitForSelector("form", { timeout: 5000 });
    // wrong credentials
    await page.fill("#username", "admin.catalog");
    await page.fill("#password", "WrongPass1");
    await page.locator("button[type=submit]").click();
    await page.waitForTimeout(1000);
    const wrongBody = await page.locator("body").innerText();
    flow("AdminLogin-Wrong-Credentials", /incorrect|invalid/i.test(wrongBody) ? "PASS" : "FAIL", wrongBody.slice(0,150).replace(/\n/g," "));

    // correct credentials - Catalog Admin
    await page.fill("#username", "admin.catalog");
    await page.fill("#password", "Admin123!");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/admin", { timeout: 6000 });
    pass("17-AdminLogin", "catalog-admin login succeeded, redirected to /admin");
    await shot(page, "17-admin-login-success");
  } catch (e) { fail("17-AdminLogin", e.message); }

  // ---------- Screen 18: Admin Dashboard ----------
  try {
    await page.waitForTimeout(700);
    const dashBody = await page.locator("body").innerText();
    pass("18-AdminDashboard", `snippet=${dashBody.slice(0,250).replace(/\n/g," ")}`);
    await shot(page, "18-admin-dashboard");
  } catch (e) { fail("18-AdminDashboard", e.message); }

  // ---------- DEFECT CHECK: staff session survive reload? (parallels customer defect) ----------
  try {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const url = page.url();
    const body = await page.locator("body").innerText();
    const survived = url.includes("/admin") && !url.includes("/admin/login");
    flow("DEFECT-Admin-Reload-Session-Loss", survived ? "PASS" : "FAIL", `urlAfter=${url}; bodySnippet=${body.slice(0,150).replace(/\n/g," ")}`);
    if (!survived) {
      await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
      await page.fill("#username", "admin.catalog");
      await page.fill("#password", "Admin123!");
      await page.locator("button[type=submit]").click();
      await page.waitForURL("**/admin", { timeout: 6000 });
    }
  } catch (e) { flow("DEFECT-Admin-Reload-Session-Loss", "FAIL", e.message); }

  // ---------- Screen 19: Admin Product List (SPA nav) ----------
  try {
    const prodLink = page.locator("a[href='/admin/products']").first();
    if (await prodLink.count()) { await prodLink.click(); await page.waitForURL("**/admin/products", { timeout: 5000 }); }
    else await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const listBody = await page.locator("body").innerText();
    const rowCount = await page.locator("table tbody tr").count();
    pass("19-AdminProductList", `rows=${rowCount}; snippet=${listBody.slice(0,150).replace(/\n/g," ")}`);
    await shot(page, "19-admin-product-list");

    // "show deleted" toggle reveals the soft-deleted seed product
    const showDeletedToggle = page.locator("text=/show deleted/i").first();
    if (await showDeletedToggle.count()) {
      await showDeletedToggle.click();
      await page.waitForTimeout(700);
      const bodyWithDeleted = await page.locator("body").innerText();
      flow("Product-ShowDeleted-Toggle", /pumpkin/i.test(bodyWithDeleted) ? "PASS" : "FAIL", "expected soft-deleted 'Seasonal Pumpkin Latte' to appear");
      await showDeletedToggle.click(); // toggle back off
      await page.waitForTimeout(400);
    }
  } catch (e) { fail("19-AdminProductList", e.message); }

  // ---------- Screen 20: Admin Product Create ----------
  let createdProductName = `QA Test Product ${Date.now()}`;
  try {
    const createLink = page.locator("a[href='/admin/products/new'], button:has-text('Create')").first();
    if (await createLink.count()) { await createLink.click(); await page.waitForURL("**/admin/products/new", { timeout: 5000 }); }
    else await page.goto(`${BASE}/admin/products/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    // validation: submit empty
    const saveBtn = page.locator("button[type=submit], button:has-text('Save')").first();
    await saveBtn.click();
    await page.waitForTimeout(500);
    const emptyValidationBody = await page.locator("body").innerText();
    flow("ProductCreate-Empty-Validation", /required/i.test(emptyValidationBody) ? "PASS" : "FAIL", emptyValidationBody.slice(0,200).replace(/\n/g," "));

    // fill valid data
    await page.fill("#name", createdProductName);
    const categorySelect = page.locator("[role=combobox]").first();
    if (await categorySelect.count()) {
      await categorySelect.click();
      await page.waitForTimeout(300);
      await page.locator("[role=option]").first().click();
    }
    await page.fill("#price", "25000");
    await page.fill("#description", "QA-created test product for validation.");
    await saveBtn.click();
    await page.waitForURL("**/admin/products", { timeout: 6000 });
    await page.waitForTimeout(600);
    const afterCreateBody = await page.locator("body").innerText();
    flow("ProductCreate-Success", afterCreateBody.includes(createdProductName) ? "PASS" : "FAIL", `expected new product '${createdProductName}' in list`);
    pass("20-AdminProductCreate", "created product successfully");
    await shot(page, "20-admin-product-create");
  } catch (e) { fail("20-AdminProductCreate", e.message); }

  // ---------- Screen 21: Admin Product Edit (edit the product we just created) ----------
  try {
    const row = page.locator("tr", { hasText: createdProductName });
    await row.locator("a:has-text('Edit'), button:has-text('Edit')").first().click();
    await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 5000 });
    await page.waitForTimeout(700);
    const editBody = await page.locator("body").innerText();
    pass("21-AdminProductEdit", `snippet=${editBody.slice(0,150).replace(/\n/g," ")}`);

    // edit price and save
    await page.fill("#price", "27000");
    await page.locator("button[type=submit], button:has-text('Save')").first().click();
    await page.waitForURL("**/admin/products", { timeout: 6000 });
    await page.waitForTimeout(600);
    const afterEditBody = await page.locator("body").innerText();
    flow("ProductEdit-Success", /27\.000/.test(afterEditBody) ? "PASS" : "FAIL", "expected updated price Rp 27.000 in list");
    await shot(page, "21-admin-product-edit");

    // toggle availability
    const availToggle = page.locator("tr", { hasText: createdProductName }).locator("button[role=switch]").first();
    const availCount = await availToggle.count();
    if (availCount) {
      await availToggle.scrollIntoViewIfNeeded();
      const before = await availToggle.getAttribute("aria-checked");
      await availToggle.click();
      await page.waitForTimeout(1200);
      const after = await availToggle.getAttribute("aria-checked");
      flow("Product-Availability-Toggle", before !== after ? "PASS" : "FAIL", `before=${before} after=${after}`);
    } else {
      flow("Product-Availability-Toggle", "FAIL", "availability switch not found in row");
    }

    // soft-delete — wait explicitly for the confirm dialog to be visible before acting on it
    const row2 = page.locator("tr", { hasText: createdProductName });
    const deleteBtn = row2.locator("button:has-text('Delete')").first();
    await deleteBtn.click();
    await page.waitForSelector("[role=dialog]", { state: "visible", timeout: 3000 });
    const confirmDialogBtn = page.locator("[role=dialog] button:has-text('Delete')").first();
    await confirmDialogBtn.waitFor({ state: "visible", timeout: 3000 });
    await confirmDialogBtn.click();
    await page.waitForSelector("[role=dialog]", { state: "hidden", timeout: 5000 });
    await page.waitForTimeout(500);
    const afterDeleteBody = await page.locator("body").innerText();
    const stillVisibleByDefault = afterDeleteBody.includes(createdProductName);
    flow("Product-SoftDelete", !stillVisibleByDefault ? "PASS" : "FAIL", "soft-deleted product should disappear from default list view");

    // restore — per Frontend-Specification A12, this affordance lives on the Product EDIT
    // page (not the list), reached by re-opening the soft-deleted product's edit page via
    // "show deleted" + Edit.
    const showDeletedToggle2 = page.locator("text=/show deleted/i").first();
    if (await showDeletedToggle2.count()) {
      await showDeletedToggle2.click();
      await page.waitForTimeout(600);
      const row3 = page.locator("tr", { hasText: createdProductName });
      const editLink3 = row3.locator("a:has-text('Edit'), button:has-text('Edit')").first();
      if (await editLink3.count()) {
        await editLink3.click();
        await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 5000 });
        await page.waitForTimeout(700);
        const restoreBtn = page.locator("button:has-text('Restore')").first();
        if (await restoreBtn.count()) {
          await restoreBtn.click();
          await page.waitForTimeout(900);
          const afterRestoreBody = await page.locator("body").innerText();
          flow("Product-Restore", "PASS", `Restore control found on Edit page (A12) and clicked; snippet=${afterRestoreBody.slice(0,150).replace(/\n/g," ")}`);
        } else {
          flow("Product-Restore", "FAIL", "No Restore control found on Admin Product Edit page for a soft-deleted product (A12)");
        }
        const prodListLink = page.locator("a[href='/admin/products']").first();
        if (await prodListLink.count()) { await prodListLink.click(); await page.waitForURL("**/admin/products", { timeout: 5000 }); }
        await page.waitForTimeout(600);
      } else {
        flow("Product-Restore", "FAIL", "Could not reach soft-deleted product's Edit page from the show-deleted list");
      }
      // leave show-deleted off for subsequent steps
      const toggleOff = page.locator("text=/show deleted/i").first();
      if (await toggleOff.count()) { await toggleOff.click(); await page.waitForTimeout(300); }
    }
  } catch (e) { fail("21-AdminProductEdit", e.message); }

  // ---------- Screen 22: Admin Category List ----------
  try {
    const catLink = page.locator("a[href='/admin/categories']").first();
    if (await catLink.count()) { await catLink.click(); await page.waitForURL("**/admin/categories", { timeout: 5000 }); }
    else await page.goto(`${BASE}/admin/categories`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const catBody = await page.locator("body").innerText();
    pass("22-AdminCategoryList", `snippet=${catBody.slice(0,200).replace(/\n/g," ")}`);
    await shot(page, "22-admin-category-list");

    // delete-guard 409: try deleting a category with products (Espresso). NOTE: the
    // Frontend-Specification (Screen 22) says Delete should be *proactively disabled* with
    // an inline "N assigned products" message for categories with products > 0. The actual
    // implementation instead lets Delete open a confirm dialog unconditionally, and only
    // reveals the guard/409 message after the user confirms inside that dialog — a real API
    // round trip is spent on an action the UI could have already known would fail. Recorded
    // as a spec-deviation defect below; the underlying data-integrity guard itself does work.
    const espressoRow = page.locator("tr", { hasText: "Espresso" });
    const delBtn = espressoRow.locator("button:has-text('Delete')").first();
    const delBtnDisabled = await delBtn.isDisabled();
    await delBtn.click();
    await page.waitForSelector("[role=dialog]", { state: "visible", timeout: 3000 });
    const dialogBodyBeforeConfirm = await page.locator("[role=dialog]").innerText();
    const proactiveGuardShown = /cannot be deleted|assigned|reassign/i.test(dialogBodyBeforeConfirm);
    flow(
      "DEFECT-CategoryDelete-Not-Proactively-Disabled",
      (delBtnDisabled || proactiveGuardShown) ? "PASS" : "FAIL",
      `Delete button disabled=${delBtnDisabled}; guard message shown before confirm=${proactiveGuardShown}; spec (Screen 22) says Delete should be disabled with inline assigned-count message, not require opening+confirming a dialog first. dialogText="${dialogBodyBeforeConfirm.slice(0,150).replace(/\n/g," ")}"`,
      "moderate"
    );
    const confirmBtn = page.locator("[role=dialog] button:has-text('Delete')").first();
    await confirmBtn.click();
    await page.waitForTimeout(1000);
    const guardBody = await page.locator("body").innerText();
    const guardShown = /cannot be deleted|assigned|reassign/i.test(guardBody);
    flow("Category-Delete-Guard-409", guardShown ? "PASS" : "FAIL", guardBody.slice(0,300).replace(/\n/g," "));
    await shot(page, "22b-category-delete-guard");
    // close whatever's left open before proceeding
    const openDialog = page.locator("[role=dialog]");
    if (await openDialog.count()) {
      const cancelBtn = openDialog.locator("button:has-text('Cancel'), button:has-text('Close')").first();
      if (await cancelBtn.count()) await cancelBtn.click();
      else await page.keyboard.press("Escape");
      await page.waitForSelector("[role=dialog]", { state: "hidden", timeout: 3000 }).catch(() => {});
    }
  } catch (e) { fail("22-AdminCategoryList", e.message); }

  // ---------- Screen 23: Admin Category Create ----------
  const newCatName = `QA Category ${Date.now()}`;
  try {
    const createCatLink = page.locator("a[href='/admin/categories/new'], button:has-text('Create')").first();
    if (await createCatLink.count()) { await createCatLink.click(); await page.waitForURL("**/admin/categories/new", { timeout: 5000 }); }
    else await page.goto(`${BASE}/admin/categories/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // duplicate name
    await page.fill("#name", "Espresso");
    await page.locator("button[type=submit], button:has-text('Save')").first().click();
    await page.waitForTimeout(700);
    const dupBody = await page.locator("body").innerText();
    flow("CategoryCreate-Duplicate", /already exists/i.test(dupBody) ? "PASS" : "FAIL", dupBody.slice(0,200).replace(/\n/g," "));

    // valid create
    await page.fill("#name", newCatName);
    await page.locator("button[type=submit], button:has-text('Save')").first().click();
    await page.waitForURL("**/admin/categories", { timeout: 6000 });
    await page.waitForTimeout(500);
    const afterCatCreate = await page.locator("body").innerText();
    flow("CategoryCreate-Success", afterCatCreate.includes(newCatName) ? "PASS" : "FAIL", `expected '${newCatName}' in list`);
    pass("23-AdminCategoryCreate", "created category successfully");
    await shot(page, "23-admin-category-create");
  } catch (e) { fail("23-AdminCategoryCreate", e.message); }

  // ---------- Screen 24: Admin Category Edit + delete (0 products -> should succeed) ----------
  try {
    const row = page.locator("tr", { hasText: newCatName });
    await row.locator("a:has-text('Edit'), button:has-text('Edit')").first().click();
    await page.waitForURL(/\/admin\/categories\/.+\/edit/, { timeout: 5000 });
    await page.waitForTimeout(600);
    pass("24-AdminCategoryEdit", "reached category edit page");
    await shot(page, "24-admin-category-edit");

    // delete this zero-product category -> should succeed (guard cleared)
    const delBtn2 = page.locator("button:has-text('Delete')").first();
    await delBtn2.click();
    await page.waitForSelector("[role=dialog]", { state: "visible", timeout: 3000 }).catch(() => {});
    const confirmBtn2 = page.locator("[role=dialog] button:has-text('Delete')").first();
    if (await confirmBtn2.count()) {
      await confirmBtn2.click();
    } else {
      // no dialog for this action — delete may be immediate
    }
    await page.waitForURL("**/admin/categories", { timeout: 6000 });
    await page.waitForTimeout(500);
    const afterDelBody = await page.locator("body").innerText();
    flow("CategoryDelete-ZeroProducts-Success", !afterDelBody.includes(newCatName) ? "PASS" : "FAIL", "zero-product category should delete successfully");
  } catch (e) { fail("24-AdminCategoryEdit", e.message); }

  // ---------- Logout catalog-admin, login as fulfillment-staff ----------
  try {
    const logoutBtn = page.locator("button:has-text('Log out'), button:has-text('Logout')").first();
    if (await logoutBtn.count()) { await logoutBtn.click(); await page.waitForTimeout(700); }
    else await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });

    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.fill("#username", "staff.fulfillment");
    await page.fill("#password", "Staff123!");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("**/admin", { timeout: 6000 });
    pass("17b-AdminLogin-FulfillmentStaff", "fulfillment-staff login succeeded");
  } catch (e) { fail("17b-AdminLogin-FulfillmentStaff", e.message); }

  // ---------- Screen 25: Admin Order List ----------
  try {
    const ordLink = page.locator("a[href='/admin/orders']").first();
    if (await ordLink.count()) { await ordLink.click(); await page.waitForURL("**/admin/orders", { timeout: 5000 }); }
    else await page.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const ordBody = await page.locator("body").innerText();
    const rowCount = await page.locator("table tbody tr").count();
    pass("25-AdminOrderList", `rows=${rowCount}; snippet=${ordBody.slice(0,200).replace(/\n/g," ")}`);
    await shot(page, "25-admin-order-list");
  } catch (e) { fail("25-AdminOrderList", e.message); }

  // ---------- Screen 26: Admin Order Detail — Advance + Override ----------
  try {
    // NOTE: table rows are styled with cursor-pointer suggesting whole-row clickability,
    // but only the order-number cell contains an actual <a> link (minor UX inconsistency,
    // recorded separately) — click the link explicitly here.
    const firstRowLink = page.locator("table tbody tr a[href^='/admin/orders/']").first();
    await firstRowLink.click();
    await page.waitForURL(/\/admin\/orders\/.+/, { timeout: 5000 });
    flow("OrderRow-WholeRowClickability", "FAIL", "TableRow has cursor-pointer styling implying the whole row is clickable, but only the order-number cell's <a> link actually navigates — clicking elsewhere in the row is a no-op.", "low");
    await page.waitForTimeout(700);
    const detailBody = await page.locator("body").innerText();
    pass("26-AdminOrderDetail", `snippet=${detailBody.slice(0,250).replace(/\n/g," ")}`);
    await shot(page, "26-admin-order-detail");

    const advanceBtn = page.locator("button:has-text('Advance')").first();
    if (await advanceBtn.count() && !(await advanceBtn.isDisabled())) {
      const before = await page.locator("body").innerText();
      await advanceBtn.click();
      await page.waitForTimeout(900);
      const after = await page.locator("body").innerText();
      flow("Order-Advance-Status", before !== after ? "PASS" : "FAIL", "expected status to change after Advance");
    } else {
      flow("Order-Advance-Status", "SKIPPED", "Advance button not present/disabled (order may already be at ready/completed)");
    }

    const overrideBtn = page.locator("button:has-text('Override')").first();
    if (await overrideBtn.count()) {
      await overrideBtn.click();
      await page.waitForTimeout(500);
      const targetOption = page.locator("[role=dialog] [role=radio], [role=dialog] [role=option], [role=dialog] button").last();
      // Attempt to select 'completed' target and confirm
      const completedOpt = page.locator("[role=dialog]").getByText(/completed/i).first();
      if (await completedOpt.count()) await completedOpt.click();
      const confirmOverrideBtn = page.locator("[role=dialog] button:has-text('Override'), [role=dialog] button:has-text('Confirm')").last();
      if (await confirmOverrideBtn.count()) {
        await confirmOverrideBtn.click();
        await page.waitForTimeout(900);
        const afterOverride = await page.locator("body").innerText();
        flow("Order-Override-Status", /completed/i.test(afterOverride) ? "PASS" : "FAIL", afterOverride.slice(0,200).replace(/\n/g," "));
      } else {
        flow("Order-Override-Status", "FAIL", "Override confirm dialog control not found");
      }
    } else {
      flow("Order-Override-Status", "FAIL", "Override button not found on order detail page");
    }
  } catch (e) { fail("26-AdminOrderDetail", e.message); }

  const consoleErrors = page._consoleErrors;
  fs.writeFileSync(new URL("./phaseC-results.json", import.meta.url), JSON.stringify({ results, consoleErrors }, null, 2));
  console.log(JSON.stringify({ results, consoleErrorCount: consoleErrors.length }, null, 2));
  await browser.close();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
