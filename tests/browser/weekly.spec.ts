import { test, expect, type Page } from "@playwright/test";
import { safetyControls } from "../../src/lib/domain";
import { dayOne, workflowFixture } from "../weekly-fixture";
import type { WeeklyState } from "../../src/features/weekly/model";

async function clock(page: Page) {
  await page.clock.install({ time: dayOne });
}
async function signIn(
  page: Page,
  role: "Issuer" | "Requester" | "Holder" | "HSE",
  url = "/",
) {
  await clock(page);
  await page.goto(url);
  await page
    .getByRole("button", { name: `Try as ${role}`, exact: true })
    .click();
}
async function data(page: Page): Promise<WeeklyState> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("pcg-weekly-v2")!),
  );
}
test("four separate tabs collaborate, HSE activates once, and the Holder signs the next day through the same QR", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page, "Issuer");
  await page.getByRole("link", { name: "Create permit", exact: true }).click();
  await page.getByLabel("Work title").fill("Weekly warehouse ventilation work");
  await page.getByLabel("Department").selectOption("Mixing");
  await page.getByLabel("Work location").selectOption("Warehouse A");
  await page
    .getByLabel("Description of work")
    .fill(
      "Inspect and service the ventilation equipment within the approved work area.",
    );
  await page
    .getByRole("button", { name: "3 Work Activities", exact: true })
    .click();
  await page.getByRole("button", { name: "General work", exact: true }).click();
  await page
    .getByRole("button", { name: "8 Review & Submit", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /I confirm that the information provided/ })
    .check();
  await page.getByRole("button", { name: "Create & get QR" }).click();
  await expect(page).toHaveURL(/\/work\//);
  let shared = await data(page);
  const p = shared.permits[0],
    qr = `/join/${p.token}`;
  const requester = await context.newPage();
  await signIn(requester, "Requester", qr);
  await requester
    .getByRole("button", { name: "Join as Requester", exact: true })
    .click();
  const holder = await context.newPage();
  await signIn(holder, "Holder", qr);
  await holder
    .getByRole("button", { name: "Join as Holder", exact: true })
    .click();
  for (const tab of [requester, holder])
    tab.on("pageerror", (e) => errors.push(e.message));
  const req = requester.locator(".weekly-section-form"),
    iss = page.locator(".weekly-section-form"),
    hol = holder.locator(".weekly-section-form");
  await Promise.all([
    req.getByLabel("Requester Department").fill("Mixing"),
    iss
      .getByLabel("Emergency / rescue arrangements")
      .fill(
        "Emergency contacts verified. Assembly point A and site rescue team available.",
      ),
    hol.getByLabel("Team / worker names").fill("Demo Holder, Demo Worker"),
  ]);
  await req
    .getByLabel("Work scope")
    .fill(
      "Inspect and service the ventilation equipment within the approved work area.",
    );
  await req.getByLabel("General work", { exact: true }).check();
  await req.getByText("Risk assessment", { exact: true }).click();
  await req.getByRole("textbox", { name: /^Hazard\b/ }).fill("Slips and trips");
  await req.getByLabel("Potential consequence").fill("Minor injury to workers");
  await req.getByLabel("Who may be affected").fill("Work team");
  await req
    .getByLabel("Controls / additional measures")
    .fill("Demarcate the work area and remove trip hazards.");
  await req.getByLabel("Responsible person").fill("Demo Issuer");
  await expect(iss.getByLabel("Safety shoes", { exact: true })).toBeChecked();
  await expect(iss.getByLabel("Safety helmet", { exact: true })).toBeChecked();
  for (const control of safetyControls)
    await iss.getByLabel(control, { exact: true }).check();
  await hol.getByLabel("Number of workers").fill("2");
  await hol.getByLabel("Contact phone").fill("0123456789");
  for (const box of await hol.locator(".weekly-check-list input").all())
    await box.check();
  await Promise.all([
    req.getByRole("button", { name: "Save my section" }).click(),
    iss.getByRole("button", { name: "Save my section" }).click(),
    hol.getByRole("button", { name: "Save my section" }).click(),
  ]);
  for (const tab of [page, requester, holder])
    await expect(
      tab.getByText("Your section is saved.", { exact: false }),
    ).toBeVisible();
  shared = await data(page);
  expect(shared.permits[0].sections.Requester.data.company).toBe("Mixing");
  expect(shared.permits[0].sections.Holder.data.workerCount).toBe(2);
  expect(shared.permits[0].sections.Issuer.data.generalControls).toHaveLength(
    safetyControls.length,
  );
  await page.screenshot({
    path: "test-results/weekly-shared-issuer-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  for (const [tab, role] of [
    [requester, "Requester"],
    [page, "Issuer"],
    [holder, "Holder"],
  ] as const) {
    await tab.locator(".weekly-full-summary > summary").click();
    await tab
      .getByRole("checkbox", { name: /I reviewed the complete shared permit/ })
      .check();
    await tab
      .getByRole("button", { name: `Sign as ${role}`, exact: true })
      .click();
  }
  await expect(
    holder.locator(".weekly-work-heading .weekly-status"),
  ).toHaveText("With HSE");
  expect((await data(page)).permits[0].approval).toBeNull();
  const hse = await context.newPage();
  await signIn(hse, "HSE", qr);
  hse.on("pageerror", (e) => errors.push(e.message));
  await hse
    .getByRole("link", { name: "Review & monitor permit", exact: true })
    .click();
  await hse
    .getByRole("checkbox", { name: /I reviewed the current work scope/ })
    .check();
  await hse
    .getByRole("button", { name: "Sign & activate permit", exact: true })
    .click();
  await expect(hse.locator(".weekly-work-heading .weekly-status")).toHaveText(
    "Active",
  );
  await expect(
    holder.getByRole("heading", { name: "You’re signed in for today." }),
  ).toBeVisible();
  const approved = (await data(hse)).permits[0].approval!.id;
  await hse.screenshot({
    path: "test-results/weekly-hse-active-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  const tomorrow = new Date("2026-10-30T01:00:00Z");
  for (const tab of [page, requester, holder, hse]) {
    await tab.clock.setFixedTime(tomorrow);
    await tab.clock.runFor(30001);
  }
  await holder.goto(qr);
  await holder
    .getByRole("link", { name: "Open permit & sign for today" })
    .click();
  await expect(
    holder.getByRole("heading", { name: "Sign for today’s work." }),
  ).toBeVisible();
  await holder
    .getByRole("checkbox", { name: /I am present for work today/ })
    .check();
  await holder
    .getByRole("button", { name: "Sign for today", exact: true })
    .click();
  await expect(
    holder.getByRole("heading", { name: "You’re signed in for today." }),
  ).toBeVisible();
  const after = (await data(holder)).permits[0];
  expect(after.approval!.id).toBe(approved);
  expect(after.approvalHistory).toHaveLength(1);
  expect(after.signatureHistory).toHaveLength(3);
  expect(after.attendance.map((a) => a.day)).toEqual([
    "2026-10-29",
    "2026-10-30",
  ]);
  await holder.setViewportSize({ width: 390, height: 844 });
  await holder.getByRole("button", { name: "Show QR", exact: true }).click();
  await expect(
    holder.getByRole("dialog", { name: "Shared permit QR" }),
  ).toBeVisible();
  await holder.getByRole("button", { name: "Close permit QR" }).click();
  await holder.screenshot({
    path: "test-results/weekly-holder-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(
    await holder.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await holder.clock.setFixedTime(new Date("2026-10-31T01:00:00Z"));
  await holder.clock.runFor(30001);
  await expect(
    holder.getByRole("checkbox", { name: /I am present for work today/ }),
  ).not.toBeChecked();
  await expect(
    holder.getByRole("button", { name: "Sign for today", exact: true }),
  ).toBeDisabled();
  await holder.clock.setFixedTime(tomorrow);
  await holder.clock.runFor(30001);
  await holder.reload();
  await expect(
    holder.getByRole("heading", { name: "You’re signed in for today." }),
  ).toBeVisible();
  await holder
    .getByRole("button", { name: "Sign out of weekly workspace" })
    .click();
  await holder.getByLabel("Full name").fill("Demo Holder");
  await holder.getByLabel("IC number").fill("000000-00-0003");
  await holder.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    holder.getByRole("heading", { name: "You’re signed in for today." }),
  ).toBeVisible();
  expect(
    await holder.evaluate(() => localStorage.getItem("pcg-weekly-v2")),
  ).not.toContain("000000000003");
  expect(errors).toEqual([]);
});

test("suspended QR blocks work and a permit in another browser is explicitly unavailable", async ({
  page,
  browser,
}) => {
  const fixture = await workflowFixture({ active: true });
  fixture.permit.status = "SUSPENDED";
  fixture.permit.suspensionReason = "Unsafe condition at the work area.";
  fixture.state.permits[0] = fixture.permit;
  await clock(page);
  await page.goto("/");
  await page.evaluate(
    ({ state }) => {
      localStorage.setItem("pcg-weekly-v2", JSON.stringify(state));
      sessionStorage.setItem("pcg-weekly-person", "holder");
    },
    { state: fixture.state },
  );
  await page.goto(`/join/${fixture.permit.token}`);
  await expect(
    page.getByText("WORK MUST NOT CONTINUE", { exact: true }),
  ).toBeVisible();
  const separate = await browser.newContext();
  try {
    const other = await separate.newPage();
    await other.goto(`http://localhost:3000/join/${fixture.permit.token}`);
    await expect(
      other.getByRole("heading", {
        name: "Permit not available in this browser",
      }),
    ).toBeVisible();
  } finally {
    await separate.close();
  }
});

test("the everyday landing page is a simple name and IC screen on mobile", async ({
  page,
}) => {
  await clock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Find your permit" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("IC number")).toBeVisible();
  await page.screenshot({
    path: "test-results/weekly-login-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
