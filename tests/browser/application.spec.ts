import { test, expect } from "@playwright/test";
import { dayOne } from "../weekly-fixture";
import type { WeeklyState } from "../../src/features/weekly/model";

test("Create permit restores the full eight-step application, saves its draft and carries all details into the shared QR", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: dayOne });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Try as Issuer", exact: true })
    .click();
  await page.getByRole("link", { name: "Create permit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create a new permit", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".wizard-step")).toHaveCount(8);
  await page
    .getByLabel("Work title")
    .fill("Service workshop exhaust equipment");
  await expect(page.getByLabel("Work order / reference")).toHaveCount(0);
  await page.getByLabel("Department").selectOption("Mixing");
  await page.getByLabel("Work location").selectOption("Warehouse A");
  await page.getByLabel("Machinery / equipment").fill("Exhaust fan EF-12");
  await page
    .getByLabel("Description of work")
    .fill(
      "Service the exhaust fan and repair its guard within the approved work area.",
    );
  await page
    .getByLabel("Purpose of work")
    .fill("Restore reliable workshop ventilation.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Work title")).toHaveValue(
    "Service workshop exhaust equipment",
  );
  await page
    .getByRole("button", { name: "2 People & Contractor", exact: true })
    .click();
  await expect(page.getByLabel("Employee ID", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page.getByLabel("Requester name").fill("Demo Requester");
  await page.getByLabel("Permit holder").fill("Demo Holder");
  await page.getByLabel("Requester Department").fill("Extrusion");
  await page.getByLabel("Number of contractors").selectOption("3");
  await expect(page.locator(".contractor-card")).toHaveCount(3);
  await page.getByLabel("Number of contractors").selectOption("2");
  for (let i = 0; i < 2; i++) {
    const card = page.locator(".contractor-card").nth(i);
    await card
      .getByLabel("Contractor Name")
      .fill(i === 0 ? "PCG Mechanical" : "PCG Access");
    await card
      .getByLabel("Phone Number")
      .fill(i === 0 ? "0123456789" : "0123456790");
    await card.getByLabel("Safety Induction completed").check();
    await card.getByLabel("Safety Induction acknowledged").check();
  }
  await page.getByLabel("Holder phone").fill("0123456789");
  await page.getByRole("button", { name: "Add worker", exact: true }).click();
  await page.getByLabel("Full name").fill("Demo Worker");
  await page.getByLabel("Employee / ID / passport").fill("DEMO-001");
  await page.getByLabel("Trade / role").fill("Technician");
  await page
    .getByRole("button", { name: "3 Work Activities", exact: true })
    .click();
  await page.getByRole("button", { name: "Hot Work", exact: true }).click();
  await page
    .getByRole("button", { name: "Working at height", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/detailed-create-activities-desktop.png",
    fullPage: true,
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "8 Review & Submit", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /I confirm that the information provided/ })
    .check();
  await page
    .getByRole("button", { name: "Create & get QR", exact: true })
    .click();
  await expect(page.locator(".error-message[role=alert]")).toContainText(
    "formal company risk assessment",
  );
  await page
    .locator(".wizard-steps")
    .getByRole("button", { name: /Risk Assessment/ })
    .click();
  let riskIndex = 0;
  await expect(page.locator(".risk-card")).toHaveCount(2);
  await page
    .getByLabel("Company risk assessment reference")
    .fill("PCG-CRA-001");
  await page.getByLabel("Assessed by").fill("Company assessor");
  await page.getByLabel("Assessment date").fill("2026-10-28");
  await page.getByLabel("Company risk assessment document").setInputFiles({
    name: "company-ra.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nDemo assessment record"),
  });
  await page
    .getByRole("checkbox", {
      name: /The formal company risk assessment is completed/,
    })
    .check();
  for (const [hazard, consequence] of [
    ["Hot surfaces", "Burn injury"],
    ["Falling tools", "Impact injury"],
  ]) {
    const row = page.locator(".risk-card").nth(riskIndex++);
    await row.getByRole("textbox", { name: /^Hazard\b/ }).fill(hazard);
    await row.getByLabel("Potential consequence").fill(consequence);
    await row.getByLabel("Who may be affected").fill("Work team");
    await row
      .getByLabel("Controls / additional measures")
      .fill("Maintain barricades and apply the required protective equipment.");
    await row.getByLabel("Responsible person").fill("Demo Issuer");
  }
  await page
    .getByRole("button", { name: "5 Safety Requirements", exact: true })
    .click();
  await expect(
    page.getByLabel("Full-body harness", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Welding gloves", { exact: true }),
  ).toBeChecked();
  for (const box of await page
    .locator(".generated-control-group input[type=checkbox]")
    .all())
    await box.check();
  await page.getByLabel("Hot Work gas testing").selectOption("not-required");
  await page
    .getByLabel("Gas testing not required — justification")
    .fill("No flammable atmosphere identified in the isolated work area.");
  await page
    .getByLabel("Emergency / rescue arrangements")
    .fill(
      "Site rescue team, emergency contacts and assembly point A confirmed.",
    );
  await page
    .getByRole("button", { name: "6 Special Permits", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hot Work controls", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Working at height controls",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".wizard-content input[type=checkbox]"),
  ).toHaveCount(0);
  await page.getByLabel("Fire watch person").fill("Demo Fire Watch");
  await page.getByRole("button", { name: "7 Documents", exact: true }).click();
  await page.getByLabel("Upload documents").setInputFiles({
    name: "method-statement.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nDemo metadata only"),
  });
  await expect(
    page.getByText("method-statement.pdf", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "8 Review & Submit", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /I confirm that the information provided/ })
    .check();
  await page
    .getByRole("button", { name: "Create & get QR", exact: true })
    .click();
  await expect(page).toHaveURL(/\/work\//);
  const stored: WeeklyState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pcg-weekly-v2")!),
  );
  const permit = stored.permits[0];
  expect(permit.application?.hazards).toHaveLength(2);
  expect(
    permit.application?.documents.some(
      (d) => d.name === "method-statement.pdf",
    ),
  ).toBe(true);
  expect(permit.application?.contractors).toHaveLength(2);
  expect(permit.application?.requesterDepartment).toBe("Extrusion");
  expect(permit.sections.Requester.data.activities).toEqual([
    "Hot Work",
    "Working at height",
  ]);
  expect(permit.sections.Issuer.data.special.fireWatch).toBe("Demo Fire Watch");
  expect(permit.sections.Holder.data.teamNames).toBe("Demo Worker");
  expect(permit.sections.Holder.data.understood).toBe(false);
  expect(permit.signatures).toEqual({});
  expect(permit.approval).toBeNull();
  await page.locator(".weekly-full-summary > summary").click();
  await expect(
    page.getByRole("heading", {
      name: "All recorded hazards (2)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".weekly-application-details")).toContainText(
    "method-statement.pdf",
  );
  await page
    .getByRole("link", { name: "Edit detailed permit form", exact: true })
    .click();
  await expect(page.getByLabel("Work title")).toHaveValue(permit.title);
  await page
    .getByLabel("Purpose of work")
    .fill("Updated planned ventilation maintenance.");
  await page
    .getByRole("button", { name: "8 Review & Submit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save updated work plan", exact: true })
    .click();
  await expect(page).toHaveURL(`/work/${permit.id}`);
  const updated: WeeklyState = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pcg-weekly-v2")!),
  );
  expect(updated.permits[0].token).toBe(permit.token);
  expect(updated.permits[0].application?.purpose).toBe(
    "Updated planned ventilation maintenance.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("link", { name: "Edit detailed permit form", exact: true })
    .click();
  await expect(page.getByLabel("Work title")).toBeVisible();
  await page.screenshot({
    path: "test-results/detailed-create-mobile.png",
    fullPage: true,
    caret: "initial",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
