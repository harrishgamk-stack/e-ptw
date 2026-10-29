import { test, expect } from "@playwright/test";
import { dayOne, workflowFixture } from "../weekly-fixture";

test("HSE uses the full dashboard and approves the same shared permit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { state, permit } = await workflowFixture({ signed: true });
  await page.clock.install({ time: dayOne });
  await page.addInitScript((state) => {
    if (!localStorage.getItem("pcg-weekly-v2"))
      localStorage.setItem("pcg-weekly-v2", JSON.stringify(state));
    sessionStorage.setItem("pcg-weekly-person", "hse");
  }, state);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Permit to Work Dashboard",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "HSE administration", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile")).toContainText("Test HSE");
  await expect(page.locator(".permit-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".approval-preview")).toContainText(permit.title);
  await expect(
    page.getByRole("link", { name: "Create permit", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/hse-dashboard-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page.goto("/hse/approvals");
  await page.locator(".permit-cell").click();
  await expect(page).toHaveURL(`/work/${permit.id}`);
  await expect(page.locator(".weekly-header")).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: /I reviewed the current work scope/ })
    .check();
  await page
    .getByRole("button", { name: "Sign & activate permit", exact: true })
    .click();
  await expect(page.locator(".weekly-work-heading .weekly-status")).toHaveText(
    "Active",
  );
  await page.goto("/hse");
  await expect(page.locator(".metric-green .metric-value")).toContainText("01");
  await expect(page.locator(".approval-preview")).toContainText(
    "queue is clear",
  );
  await page.goto("/hse/safety");
  await expect(
    page.getByText("Holder signed today", { exact: true }),
  ).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-10-30T01:00:00Z"));
  await page.clock.runFor(30001);
  await expect(
    page.getByText("Holder signature required today", { exact: true }),
  ).toBeVisible();
  for (const section of [
    "permits",
    "active-work",
    "contractors",
    "workers",
    "risks",
    "reports",
    "audit",
    "master-data",
    "settings",
  ]) {
    await page.goto(`/hse/${section}`);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hse");
  await expect(page.locator("#permit-register")).toBeVisible();
  await page.screenshot({
    path: "test-results/hse-dashboard-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "HSE administration", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const role of ["Issuer", "Requester", "Holder"] as const) {
  test(`${role} keeps the simple workspace and cannot open admin screens`, async ({
    page,
  }) => {
    const { state, permit } = await workflowFixture({ active: true });
    await page.clock.install({ time: dayOne });
    await page.addInitScript(
      ({ state, id }) => {
        if (!localStorage.getItem("pcg-weekly-v2"))
          localStorage.setItem("pcg-weekly-v2", JSON.stringify(state));
        sessionStorage.setItem("pcg-weekly-person", id);
      },
      { state, id: role.toLowerCase() },
    );
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "My permit", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveCount(0);
    await expect(page.locator(".weekly-permit-card")).toContainText(
      permit.title,
    );
    for (const route of [
      "/hse",
      "/hse/approvals",
      "/overview",
      "/permits",
      "/settings",
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("heading", { name: "HSE admin workspace", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".sidebar, .permit-table")).toHaveCount(0);
    }
    await page
      .getByRole("link", { name: "Go to My permit", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "My permit", exact: true }),
    ).toBeVisible();
  });
}

test("HSE sign-in opens the dashboard and sign-out removes admin access", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try as HSE", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Permit to Work Dashboard",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign out of weekly workspace", exact: true })
    .click();
  await page.goto("/hse");
  await expect(
    page.getByRole("button", { name: "Try as HSE", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});
