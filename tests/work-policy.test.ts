import { test } from "node:test";
import assert from "node:assert/strict";
import { validDraft } from "./fixtures";
import {
  activityKey,
  companyAssessmentIssues,
  contractorIssues,
  selectActivities,
  workRequirements,
} from "../src/lib/work-policy";
import { specialControls, submissionIssues } from "../src/lib/domain";
import {
  applicationInput,
  applicationSections,
} from "../src/features/weekly/application";
import {
  applyWeeklyCommand,
  allIssues,
  gasCurrent,
} from "../src/features/weekly/engine";
import { dayOne, demoPeople, workflowFixture } from "./weekly-fixture";
import { emptyWeeklyState } from "../src/features/weekly/model";

export function highRiskPlan() {
  const d = selectActivities(validDraft(), ["Hot Work", "Working at height"]);
  d.start = "2026-10-29T08:00";
  d.end = "2026-10-30T18:00";
  d.hazards = d.hazards.map((h) => ({
    ...h,
    hazard: "Recorded activity hazard",
    consequence: "Injury to workers",
    affected: "Work team",
    controls: "Apply the selected specialist controls.",
    responsible: "Test Issuer",
  }));
  d.companyRiskAssessment = {
    reference: "PCG-CRA-001",
    assessedBy: "Company assessor",
    assessmentDate: "2026-10-28",
    documentName: "company-ra.pdf",
    completed: true,
    activitiesKey: activityKey(d.activities),
  };
  d.documents = [
    {
      name: "company-ra.pdf",
      type: "Company risk assessment",
      path: "local-demo-metadata",
      expiry: "",
    },
  ];
  d.special = {
    emergencyPlan:
      "Rescue team, emergency contacts and assembly point A confirmed.",
    "Hot Work:Fire watch person": "Fire Watch",
    gasTesting: "not-required",
    gasJustification:
      "No flammable atmosphere identified in the isolated work area.",
  };
  for (const a of d.activities)
    for (const c of specialControls[a] ?? []) d.special[`${a}:${c}`] = "yes";
  return d;
}

test("Hot Work plus height automatically produces both permits, controls, PPE and risk assessments", () => {
  const d = selectActivities(validDraft(), ["Hot Work", "Working at height"]),
    rules = workRequirements(d.activities, d.hazards);
  assert.deepEqual(
    rules.permits.map((p) => p.title),
    ["Hot Work Permit", "Working at Height Permit"],
  );
  assert.ok(rules.formalAssessment);
  assert.ok(d.ppe.includes("Full-body harness"));
  assert.ok(d.ppe.includes("Welding gloves"));
  assert.deepEqual(
    d.hazards.map((h) => h.activity),
    ["Hot Work", "Working at height"],
  );
  assert.equal(
    Object.values(d.special).filter((v) => v === "yes").length,
    0,
    "Requirements must not self-confirm controls",
  );
});

test("changing activities preserves retained assessment entries and removes obsolete generated requirements", () => {
  const first = highRiskPlan();
  const height = first.hazards.find((h) => h.activity === "Working at height")!;
  const next = selectActivities(first, ["Working at height"]);
  assert.equal(next.hazards[0].id, height.id);
  assert.equal(next.hazards[0].hazard, height.hazard);
  assert.deepEqual(
    workRequirements(next.activities).permits.map((p) => p.title),
    ["Working at Height Permit"],
  );
  assert.equal(next.companyRiskAssessment?.completed, false);
  assert.ok(!Object.keys(next.special).some((k) => k.startsWith("Hot Work:")));
});

test("general work uses the normal assessment; high scores and explicitly high-risk activities require company assessment", () => {
  const d = selectActivities(validDraft(), ["General work"]);
  assert.equal(
    workRequirements(d.activities, d.hazards).formalAssessment,
    false,
  );
  assert.deepEqual(companyAssessmentIssues(d, dayOne), []);
  d.hazards[0].likelihood = 5;
  d.hazards[0].severity = 2;
  assert.equal(
    workRequirements(d.activities, d.hazards).formalAssessment,
    true,
  );
  assert.ok(companyAssessmentIssues(d, dayOne).length);
  assert.equal(workRequirements(["High Risk Work"]).formalAssessment, true);
});

test("high-risk submission cannot bypass the formal company assessment, its current scope or document record", () => {
  const d = highRiskPlan();
  assert.deepEqual(companyAssessmentIssues(d, dayOne), []);
  assert.throws(
    () => applicationInput({ ...d, companyRiskAssessment: undefined }, dayOne),
    /formal company risk assessment/i,
  );
  assert.throws(
    () => applicationInput({ ...d, documents: [] }, dayOne),
    /assessment document/,
  );
  assert.ok(
    companyAssessmentIssues(
      {
        ...d,
        companyRiskAssessment: {
          ...d.companyRiskAssessment!,
          activitiesKey: "Hot Work",
        },
      },
      dayOne,
    ).length,
  );
  assert.ok(
    companyAssessmentIssues(
      {
        ...d,
        companyRiskAssessment: {
          ...d.companyRiskAssessment!,
          assessmentDate: "2026-10-30",
        },
      },
      dayOne,
    ).length,
  );
});

test("multiple contractors retain separate contacts and require Safety Induction and acknowledgement", () => {
  const d = validDraft();
  d.start = "2026-10-29T08:00";
  d.end = "2026-10-30T18:00";
  d.contractors = [1, 2, 3].map((i) => ({
    id: `c-${i}`,
    name: `Contractor ${i}`,
    phone: `012345678${i}`,
    safetyInduction: true,
    acknowledged: true,
  }));
  const input = applicationInput(d, dayOne);
  assert.equal(input.application.contractors?.length, 3);
  assert.equal(
    applicationSections(input.application).Requester.company,
    "Contractor 1; Contractor 2; Contractor 3",
  );
  d.contractors[1].acknowledged = false;
  assert.match(contractorIssues(d).join(" "), /Contractor 2/);
  assert.throws(() => applicationInput(d, dayOne), /Safety Induction/);
  d.contractors = [];
  assert.deepEqual(contractorIssues(d), []);
});

test("required controls and assessment coverage are enforced at submission and initial signing", async () => {
  const d = highRiskPlan();
  assert.deepEqual(submissionIssues(d), []);
  d.special["Working at height:Drop zone barricaded"] = "no";
  assert.ok(submissionIssues(d).some((issue) => issue.includes("Drop zone")));
  const result = await applyWeeklyCommand(
    { ...emptyWeeklyState(), people: demoPeople },
    "issuer",
    { type: "CREATE", input: applicationInput(d, dayOne) },
    dayOne,
  );
  assert.ok(
    allIssues(result.permit, dayOne).some((issue) =>
      issue.includes("Drop zone"),
    ),
  );
  result.permit.application!.hazards =
    result.permit.application!.hazards.filter(
      (h) => h.activity !== "Working at height",
    );
  assert.ok(
    allIssues(result.permit, dayOne).some((issue) =>
      issue.includes("generated risk assessment for Working at height"),
    ),
  );
});

test("applicable Hot Work gas testing needs a current recorded passing test", async () => {
  const d = highRiskPlan();
  d.special.gasTesting = "required";
  const { permit } = await applyWeeklyCommand(
    { ...emptyWeeklyState(), people: demoPeople },
    "issuer",
    { type: "CREATE", input: applicationInput(d, dayOne) },
    dayOne,
  );
  assert.equal(gasCurrent(permit, dayOne), false);
  permit.monitoring.push({
    id: "gas-test",
    personId: "issuer",
    name: "Test Issuer",
    at: dayOne.toISOString(),
    kind: "GAS",
    result: "PASS",
    notes: "Instrument and readings recorded against approved limits.",
  });
  assert.equal(gasCurrent(permit, dayOne), true);
  assert.equal(
    gasCurrent(permit, new Date(dayOne.getTime() + 31 * 60000)),
    false,
  );
});

test("creating through the older command format cannot bypass the high-risk assessment gate", async () => {
  const f = await workflowFixture({ confined: true });
  const data = structuredClone(f.permit.sections.Requester.data);
  delete data.companyRiskAssessment;
  const saved = await applyWeeklyCommand(
    f.state,
    "requester",
    {
      type: "SAVE",
      permitId: f.permit.id,
      role: "Requester",
      expectedRevision: f.permit.sections.Requester.revision,
      data,
    },
    dayOne,
  );
  await assert.rejects(
    applyWeeklyCommand(
      saved.state,
      "issuer",
      {
        type: "SIGN",
        permitId: f.permit.id,
        expectedRevision: saved.permit.revision,
        confirmed: true,
      },
      dayOne,
    ),
    /formal company risk assessment/,
  );
});
