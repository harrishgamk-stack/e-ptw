import { test } from "node:test";
import assert from "node:assert/strict";
import { validDraft } from "./fixtures";
import { activityKey } from "../src/lib/work-policy";
import { dayOne, demoPeople } from "./weekly-fixture";
import { applicationInput } from "../src/features/weekly/application";
import {
  applyWeeklyCommand,
  contentOf,
  allIssues,
  WeeklyCommand,
} from "../src/features/weekly/engine";
import { emptyWeeklyState, WeeklyPermit } from "../src/features/weekly/model";

function plan() {
  const d = validDraft();
  d.start = "2026-10-29T08:00";
  d.end = "2026-11-04T18:00";
  d.special.emergencyPlan =
    "Site rescue team, emergency contacts and assembly point A verified.";
  d.documents = [
    {
      name: "method-statement.pdf",
      type: "Method statement",
      path: "local-demo-metadata",
      expiry: "",
    },
  ];
  d.hazards.push({
    ...d.hazards[0],
    id: "second-risk",
    hazard: "Moving equipment",
  });
  return d;
}
async function fixture() {
  let state = { ...emptyWeeklyState(), people: structuredClone(demoPeople) };
  let permit: WeeklyPermit;
  async function run(actor: string, cmd: WeeklyCommand) {
    const result = await applyWeeklyCommand(state, actor, cmd, dayOne);
    state = result.state;
    permit = result.permit;
    return permit;
  }
  await run("issuer", { type: "CREATE", input: applicationInput(plan()) });
  return { run, current: () => permit!, state: () => state };
}

test("the detailed application retains all fields, seeds role sections, and never signs or activates work", async () => {
  const f = await fixture(),
    p = f.current();
  assert.equal(p.start, "2026-10-29T08:00:00+08:00");
  assert.equal(p.end, "2026-11-04T18:00:00+08:00");
  assert.equal(p.application?.hazards.length, 2);
  assert.equal(p.application?.documents[0].name, "method-statement.pdf");
  assert.deepEqual(
    p.sections.Requester.data.activities,
    p.application?.activities,
  );
  assert.deepEqual(p.sections.Issuer.data.ppe, p.application?.ppe);
  assert.equal(p.sections.Holder.data.teamNames, "Test Worker");
  assert.equal(p.sections.Holder.data.understood, false);
  assert.deepEqual(p.members, { Issuer: "issuer" });
  assert.deepEqual(p.signatures, {});
  assert.equal(p.approval, null);
  assert.equal(p.status, "COLLECTING");
  assert.equal(contentOf(p).application?.hazards.length, 2);
});

test("detailed creation enforces activities, Malaysia times and seven calendar days", async () => {
  assert.throws(
    () => applicationInput({ ...plan(), activities: [] }),
    /work activity/,
  );
  assert.throws(
    () => applicationInput({ ...plan(), start: "2026-10-29T29:00" }),
    /Malaysia time/,
  );
  const state = { ...emptyWeeklyState(), people: demoPeople };
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      {
        type: "CREATE",
        input: applicationInput({
          ...plan(),
          start: "2026-10-29T23:00",
          end: "2026-11-05T01:00",
        }),
      },
      dayOne,
    ),
    /seven calendar/,
  );
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "holder",
      { type: "CREATE", input: applicationInput(plan()) },
      dayOne,
    ),
    /Only an Issuer/,
  );
});

test("role edits update the detailed plan without losing additional hazards or document records", async () => {
  const f = await fixture();
  await f.run("requester", { type: "JOIN", token: f.current().token });
  const p = f.current();
  const data = structuredClone(p.sections.Requester.data);
  data.scope = "Revised inspection scope within the approved work area.";
  data.hazard = "Updated slip hazard";
  await f.run("requester", {
    type: "SAVE",
    permitId: p.id,
    role: "Requester",
    expectedRevision: 0,
    data,
  });
  assert.equal(f.current().application?.description, data.scope);
  assert.equal(f.current().application?.hazards[0].hazard, data.hazard);
  assert.equal(f.current().application?.hazards[1].hazard, "Moving equipment");
  assert.equal(f.current().application?.documents.length, 1);
});

test("specialist fields stay consistent between both forms and every hazard is included in signing checks", async () => {
  const d = plan();
  d.activities = ["Hot Work"];
  d.hazards[0].activity = "Hot Work";
  d.hazards[1].activity = undefined;
  d.companyRiskAssessment = {
    reference: "CRA-HOT-001",
    assessedBy: "Company assessor",
    assessmentDate: "2026-10-28",
    documentName: "company-ra.pdf",
    completed: true,
    activitiesKey: activityKey(d.activities),
  };
  d.documents.push({
    name: "company-ra.pdf",
    type: "Company risk assessment",
    path: "local-demo-metadata",
    expiry: "",
  });
  d.special["Hot Work:Fire watch person"] = "Original Fire Watch";
  d.hazards[1].residualLikelihood = 5;
  d.hazards[1].residualSeverity = 5;
  const created = await applyWeeklyCommand(
    { ...emptyWeeklyState(), people: demoPeople },
    "issuer",
    { type: "CREATE", input: applicationInput(d) },
    dayOne,
  );
  assert.equal(
    created.permit.sections.Issuer.data.special.fireWatch,
    "Original Fire Watch",
  );
  assert.ok(
    allIssues(created.permit).some((issue) => issue.includes("hazard 2")),
  );
  const updated = await applyWeeklyCommand(
    created.state,
    "issuer",
    {
      type: "SAVE",
      permitId: created.permit.id,
      role: "Issuer",
      expectedRevision: 0,
      data: {
        ...created.permit.sections.Issuer.data,
        special: {
          ...created.permit.sections.Issuer.data.special,
          fireWatch: "Replacement Fire Watch",
        },
      },
    },
    dayOne,
  );
  assert.equal(
    updated.permit.application?.special["Hot Work:Fire watch person"],
    "Replacement Fire Watch",
  );
});

test("detailed edits preserve the QR and signed history, reject stale or unauthorized changes, and cannot edit active work", async () => {
  const f = await fixture();
  for (const actor of ["requester", "holder"])
    await f.run(actor, { type: "JOIN", token: f.current().token });
  let p = f.current();
  await f.run("holder", {
    type: "SAVE",
    permitId: p.id,
    role: "Holder",
    expectedRevision: 0,
    data: {
      ...p.sections.Holder.data,
      toolbox: true,
      competent: true,
      understood: true,
    },
  });
  for (const actor of ["requester", "issuer", "holder"])
    await f.run(actor, {
      type: "SIGN",
      permitId: p.id,
      expectedRevision: f.current().revision,
      confirmed: true,
    });
  p = f.current();
  assert.equal(p.status, "HSE_REVIEW");
  const snapshot = structuredClone(p.signedVersions[0]),
    token = p.token;
  await assert.rejects(
    f.run("requester", {
      type: "UPDATE_APPLICATION",
      permitId: p.id,
      expectedRevision: p.revision,
      application: plan(),
    }),
    /Only the permit creator/,
  );
  await assert.rejects(
    f.run("issuer", {
      type: "UPDATE_APPLICATION",
      permitId: p.id,
      expectedRevision: p.revision - 1,
      application: plan(),
    }),
    /changed in another tab/,
  );
  await f.run("issuer", {
    type: "UPDATE_APPLICATION",
    permitId: p.id,
    expectedRevision: p.revision,
    application: { ...plan(), purpose: "Updated work purpose." },
  });
  assert.equal(f.current().token, token);
  assert.deepEqual(f.current().signatures, {});
  assert.equal(f.current().signatureHistory.length, 3);
  assert.deepEqual(f.current().signedVersions[0], snapshot);
  await f.run("holder", {
    type: "SAVE",
    permitId: p.id,
    role: "Holder",
    expectedRevision: f.current().sections.Holder.revision,
    data: {
      ...f.current().sections.Holder.data,
      toolbox: true,
      competent: true,
      understood: true,
    },
  });
  for (const actor of ["requester", "issuer", "holder"])
    await f.run(actor, {
      type: "SIGN",
      permitId: p.id,
      expectedRevision: f.current().revision,
      confirmed: true,
    });
  await f.run("hse", {
    type: "APPROVE",
    permitId: p.id,
    expectedRevision: f.current().revision,
    confirmed: true,
    notes: "Work plan reviewed.",
  });
  await assert.rejects(
    f.run("issuer", {
      type: "UPDATE_APPLICATION",
      permitId: p.id,
      expectedRevision: f.current().revision,
      application: plan(),
    }),
    /return the permit/,
  );
});
