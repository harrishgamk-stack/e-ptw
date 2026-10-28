import { test, expect } from "@playwright/test";
import { validDraft } from "../fixtures";
test("desktop dashboard, search, navigation and CSV export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Permit to Work Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByText("Pilot workspace", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Search permit register").fill("Conveyor");
  await expect(page.locator(".permit-table tbody tr")).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe(
    "pcg-permits.csv",
  );
  await page.locator(".permit-cell").click();
  await expect(
    page.getByRole("heading", { name: "PTW-2026-000124" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Suspend permit", exact: true })
    .click();
  await page.getByLabel("Reason category").selectOption("Control failure");
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("Barricade removed. Stop work pending correction.");
  await page.getByRole("button", { name: "Confirm & record" }).click();
  await expect(page.getByText("WORK MUST STOP", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open verification" }).click();
  await expect(
    page.getByRole("heading", { name: "PERMIT SUSPENDED" }),
  ).toBeVisible();
  await expect(
    page.getByText("WORK MUST NOT CONTINUE", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "PERMIT SUSPENDED" }),
  ).toBeVisible();
  assertNoErrors(errors);
});
test("wizard draft persistence and incomplete submission guard", async ({
  page,
}) => {
  await page.goto("/permits/new");
  await page.getByLabel("Work title").fill("Pilot inspection draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Last saved \d/)).toBeVisible();
  await page.getByRole("button", { name: "8 Review & Submit" }).click();
  await page
    .getByRole("button", { name: "Submit permit", exact: true })
    .click();
  await expect(page.locator(".error-message[role=alert]")).toContainText(
    "Complete the work title",
  );
  await page.goto("/permits");
  await page
    .getByLabel("Search permit register")
    .fill("Pilot inspection draft");
  await expect(
    page.getByText("Pilot inspection draft", { exact: true }),
  ).toBeVisible();
  await page.locator(".permit-cell").click();
  await page.getByRole("link", { name: "Continue editing" }).click();
  await expect(page.getByLabel("Work title")).toHaveValue(
    "Pilot inspection draft",
  );
});
test("mobile dashboard and wizard stay within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: "Permit to Work Dashboard" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Create", exact: true }).click();
  await expect(page.getByLabel("What work is planned?")).toBeVisible();
  await page.screenshot({
    path: "test-results/wizard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByText("More tools", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Contractors", exact: true }),
  ).toBeVisible();
});
test("every navigation destination renders without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/approvals",
    "/active-work",
    "/safety",
    "/contractors",
    "/workers",
    "/risks",
    "/reports",
    "/audit",
    "/master-data",
    "/settings",
    "/login",
    "/verify/invalid-token",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
  assertNoErrors(errors);
});
function assertNoErrors(errors: string[]) {
  expect(errors).toEqual([]);
}
test("complete demo lifecycle from submission through closure preserves history", async ({
  page,
}) => {
  const draft = validDraft();
  await page.addInitScript(
    (d) => localStorage.setItem("pcg-wizard", JSON.stringify(d)),
    draft,
  );
  await page.goto("/permits/new");
  await expect(page.getByLabel("Work title")).toHaveValue(draft.title);
  await page.getByRole("button", { name: "8 Review & Submit" }).click();
  await page
    .getByRole("button", { name: "Submit permit", exact: true })
    .click();
  await expect(page).toHaveURL(/\/permits\/[a-f0-9-]+$/);
  await expect(
    page.getByRole("button", { name: "Start safety review" }),
  ).toBeVisible();
  for (const action of ["Start safety review", "Send for approval"]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("textbox")
      .fill("Safety information reviewed for local pilot.");
    await page.getByRole("button", { name: "Confirm & record" }).click();
  }
  await page.getByRole("link", { name: "Open approval review" }).click();
  await expect(
    page.getByRole("button", { name: "Approve current step" }),
  ).toBeDisabled();
  await page
    .getByLabel(
      "I have opened and reviewed the critical safety information, work scope and supporting evidence.",
    )
    .check();
  await page.getByRole("button", { name: "Approve current step" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("Controls reviewed. Approval recorded for pilot demonstration.");
  await page.getByRole("button", { name: "Confirm & record" }).click();
  await expect(
    page.getByRole("button", { name: "Issue permit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Issue permit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("All configured demo approvals reviewed.");
  await page.getByRole("button", { name: "Confirm & record" }).click();
  await expect(
    page.getByRole("button", { name: "Acknowledge & activate" }),
  ).toBeVisible();
  for (const action of [
    "Acknowledge & activate",
    "Request closure",
    "Complete closure",
  ]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("textbox")
      .fill(
        "Required site checks and authenticated acknowledgements simulated in local pilot.",
      );
    for (const input of await page
      .getByRole("dialog")
      .getByRole("checkbox")
      .all())
      await input.check();
    await page.getByRole("button", { name: "Confirm & record" }).click();
  }
  await expect(
    page.getByText(
      "This permit is read-only. Historical records are retained.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open verification" }).click();
  await expect(
    page.getByRole("heading", { name: "PERMIT CLOSED" }),
  ).toBeVisible();
  await expect(
    page.getByText("WORK MUST NOT CONTINUE", { exact: true }),
  ).toBeVisible();
});
test("resumption requires corrective action and every confirmation", async ({
  page,
}) => {
  await page.goto("/permits/demo-121");
  await page.getByRole("button", { name: "Authorize resumption" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox")
    .fill("Weather clear; work area re-inspected by safety supervisor.");
  await page.getByRole("button", { name: "Confirm & record" }).click();
  await expect(
    page.getByRole("dialog").locator(".error-message"),
  ).toContainText("Complete every required confirmation");
  for (const input of await page
    .getByRole("dialog")
    .getByRole("checkbox")
    .all())
    await input.check();
  await page.getByRole("button", { name: "Confirm & record" }).click();
  await expect(
    page.getByRole("button", { name: "Suspend permit", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open verification" }).click();
  await expect(
    page.getByRole("heading", { name: "VALID PERMIT" }),
  ).toBeVisible();
});
