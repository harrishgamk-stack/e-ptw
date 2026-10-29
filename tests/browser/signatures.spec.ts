import { test, expect, type Page } from "@playwright/test";
import { hseSession } from "./hse-session";
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  await hseSession(page);
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

test("HSE retains access to earlier pilot tools with full admin navigation", async ({
  page,
}) => {
  await page.goto("/legacy-home");
  await expect(
    page.getByRole("heading", { name: "Your permits. One simple place." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create a permit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review & sign", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contractors", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/simple-home-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await expect(
    page.getByRole("link", { name: "Contractors", exact: true }),
  ).toBeVisible();
});

test("quick creation produces a draft without bypassing safety submission", async ({
  page,
}) => {
  await page.goto("/legacy-new-permit");
  await page.getByLabel("What work is planned?").fill("Inspect warehouse fan");
  await page.getByLabel("Work location").fill("Warehouse A");
  await page.getByLabel("Permit holder").fill("Ahmad Firdaus");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: /DEMO-/ })).toBeVisible();
  await expect(page.locator(".detail-header .badge")).toContainText("Draft");
  await expect(
    page.getByRole("link", { name: "Continue editing" }),
  ).toBeVisible();
});

test("typed signing creates a persistent checkable record without changing permit status", async ({
  page,
}) => {
  await page.goto("/sign?permit=demo-124");
  await page.getByLabel(/^Your full name/).fill("Ahmad Firdaus");
  await page.getByLabel("Type your full name to sign").fill("Wrong Person");
  await page
    .getByRole("button", { name: "Sign acknowledgement", exact: true })
    .click();
  await expect(page.locator(".error-message[role=alert]")).toContainText(
    "review the permit summary",
  );
  await page.getByText("Review permit summary", { exact: true }).click();
  await page.locator(".sign-declaration input").check();
  await page
    .getByRole("button", { name: "Sign acknowledgement", exact: true })
    .click();
  await expect(page.locator(".error-message[role=alert]")).toContainText(
    "Type your full name exactly",
  );
  await page.getByLabel("Type your full name to sign").fill("Ahmad Firdaus");
  await page.screenshot({
    path: "test-results/sign-form-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "Sign acknowledgement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acknowledgement recorded" }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved record matches", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("The permit is unchanged since this acknowledgement."),
  ).toBeVisible();
  await expect(page.locator(".receipt-current-status .badge")).toContainText(
    "Active",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Acknowledgement recorded" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/signature-receipt-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("link", { name: "Back to Sign & Verify" }).click();
  await page.getByLabel("Acknowledgement reference or link").fill(
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("pcg-pilot-v1")!);
      return `ACK-${data.signatures[0].token.slice(0, 8)}`;
    }),
  );
  await page.getByRole("button", { name: "Check record" }).click();
  await expect(
    page.getByRole("heading", { name: "Acknowledgement recorded" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("pcg-pilot-v1")!);
    data.permits.find((p: { id: string }) => p.id === "demo-124").location =
      "Updated work area";
    localStorage.setItem("pcg-pilot-v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(
    page.getByText("Permit changed since signing", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("pcg-pilot-v1")!);
    data.signatures[0].payload.signerName = "Altered Name";
    localStorage.setItem("pcg-pilot-v1", JSON.stringify(data));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Record mismatch" }),
  ).toBeVisible();
});

test("mobile signing and the simple home fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/legacy-home");
  await expect(
    page.getByRole("heading", { name: "Your permits. One simple place." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/simple-home-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  await page.goto("/sign?permit=demo-124");
  await expect(page.getByLabel(/^Your full name/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/sign-form-mobile.png",
    fullPage: true,
    caret: "initial",
  });
});
