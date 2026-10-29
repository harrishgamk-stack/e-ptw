import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyWeeklyCommand,
  allIssues,
  gasCurrent,
} from "../src/features/weekly/engine";
import {
  emptyWeeklyState,
  effectiveWeeklyStatus,
  hasTodaySignature,
  hasSignatureForDay,
  localDay,
} from "../src/features/weekly/model";
import {
  dayOne,
  demoPeople,
  filledSection,
  workflowFixture,
} from "./weekly-fixture";
test("only Issuer and Requester can create permits; validity is at most seven calendar days", async () => {
  const state = { ...emptyWeeklyState(), people: demoPeople };
  const input = {
    title: "Warehouse inspection",
    location: "Warehouse A",
    startDay: "2026-10-29",
    endDay: "2026-11-04",
  };
  for (const actor of ["holder", "hse"])
    await assert.rejects(
      applyWeeklyCommand(state, actor, { type: "CREATE", input }, dayOne),
      /Only an Issuer or Requester/,
    );
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      { type: "CREATE", input: { ...input, endDay: "2026-11-05" } },
      dayOne,
    ),
    /seven calendar days/,
  );
  assert.equal(
    (
      await applyWeeklyCommand(
        state,
        "requester",
        { type: "CREATE", input },
        dayOne,
      )
    ).permit.members.Requester,
    "requester",
  );
});
test("QR joining is bound to a role and does not let another Issuer claim an occupied slot", async () => {
  const { state, permit } = await workflowFixture();
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "outsider",
      { type: "JOIN", token: permit.token },
      dayOne,
    ),
    /already has a Issuer/,
  );
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "outsider",
      {
        type: "SAVE",
        permitId: permit.id,
        role: "Issuer",
        expectedRevision: 1,
        data: filledSection("Issuer"),
      },
      dayOne,
    ),
    /not joined/,
  );
});
test("different sections can be saved concurrently from their own revisions, while stale same-section saves are rejected", async () => {
  const { state, permit } = await workflowFixture();
  const requester = structuredClone(permit.sections.Requester.data);
  requester.scope += " Additional inspection area.";
  const issuer = structuredClone(permit.sections.Issuer.data);
  issuer.emergencyPlan += " Emergency phone verified.";
  const a = await applyWeeklyCommand(
    state,
    "requester",
    {
      type: "SAVE",
      permitId: permit.id,
      role: "Requester",
      expectedRevision: 1,
      data: requester,
    },
    dayOne,
  );
  const b = await applyWeeklyCommand(
    a.state,
    "issuer",
    {
      type: "SAVE",
      permitId: permit.id,
      role: "Issuer",
      expectedRevision: 1,
      data: issuer,
    },
    dayOne,
  );
  assert.equal(b.permit.sections.Requester.data.scope, requester.scope);
  assert.equal(
    b.permit.sections.Issuer.data.emergencyPlan,
    issuer.emergencyPlan,
  );
  await assert.rejects(
    applyWeeklyCommand(
      b.state,
      "issuer",
      {
        type: "SAVE",
        permitId: permit.id,
        role: "Issuer",
        expectedRevision: 1,
        data: issuer,
      },
      dayOne,
    ),
    /Someone updated your section/,
  );
  const illegal = {
    ...issuer,
    scope: "Issuer attempts to alter requester work scope",
  };
  await assert.rejects(
    applyWeeklyCommand(
      b.state,
      "issuer",
      {
        type: "SAVE",
        permitId: permit.id,
        role: "Issuer",
        expectedRevision: 2,
        data: illegal,
      },
      dayOne,
    ),
    /another role/,
  );
});
test("all sections must be complete and extreme risks resolved before any initial signature", async () => {
  const { state, permit } = await workflowFixture();
  state.permits[0].sections.Holder.data.competent = false;
  assert.ok(allIssues(state.permits[0]).length);
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      {
        type: "SIGN",
        permitId: permit.id,
        expectedRevision: permit.revision,
        confirmed: true,
      },
      dayOne,
    ),
    /competencies/,
  );
  state.permits[0].sections.Holder.data.competent = true;
  state.permits[0].sections.Requester.data.residualLikelihood = 5;
  state.permits[0].sections.Requester.data.residualSeverity = 5;
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      {
        type: "SIGN",
        permitId: permit.id,
        expectedRevision: permit.revision,
        confirmed: true,
      },
      dayOne,
    ),
    /Extreme/,
  );
});
test("the three initial signatures route to HSE; neither party signatures nor daily sign-in can activate the permit", async () => {
  const { state, permit } = await workflowFixture({ signed: true });
  assert.equal(permit.status, "HSE_REVIEW");
  assert.equal(permit.approval, null);
  assert.equal(permit.signatureHistory.length, 3);
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      {
        type: "APPROVE",
        permitId: permit.id,
        expectedRevision: permit.revision,
        confirmed: true,
        notes: "",
      },
      dayOne,
    ),
    /Only HSE/,
  );
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "holder",
      { type: "DAILY", permitId: permit.id, confirmed: true, note: "" },
      dayOne,
    ),
    /not currently active/,
  );
  const tampered = structuredClone(state);
  tampered.permits[0].signatures.Holder!.contentHash = "altered";
  await assert.rejects(
    applyWeeklyCommand(
      tampered,
      "hse",
      {
        type: "APPROVE",
        permitId: permit.id,
        expectedRevision: permit.revision,
        confirmed: true,
        notes: "",
      },
      dayOne,
    ),
    /no longer matches/,
  );
});
test("HSE approval activates once, initial Holder signature covers day one, and the next day needs only a new Holder signature", async () => {
  const { state, permit } = await workflowFixture({ active: true });
  assert.equal(permit.status, "ACTIVE");
  assert.equal(hasTodaySignature(permit, dayOne), true);
  assert.equal(permit.attendance[0].kind, "INITIAL");
  const tomorrow = new Date("2026-10-30T01:00:00Z");
  assert.equal(hasTodaySignature(permit, tomorrow), false);
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "issuer",
      { type: "DAILY", permitId: permit.id, confirmed: true, note: "" },
      tomorrow,
    ),
    /Only this permit/,
  );
  const result = await applyWeeklyCommand(
    state,
    "holder",
    {
      type: "DAILY",
      permitId: permit.id,
      confirmed: true,
      note: "Same scope and conditions.",
    },
    tomorrow,
  );
  assert.equal(hasTodaySignature(result.permit, tomorrow), true);
  assert.equal(result.permit.attendance.length, 2);
  assert.deepEqual(result.permit.approvalHistory, permit.approvalHistory);
  assert.equal(result.permit.signatureHistory.length, 3);
  const duplicate = await applyWeeklyCommand(
    result.state,
    "holder",
    { type: "DAILY", permitId: permit.id, confirmed: true, note: "Double tap" },
    tomorrow,
  );
  assert.equal(duplicate.permit.attendance.length, 2);
  assert.equal(duplicate.state.audit.length, result.state.audit.length);
});
test("scope changes invalidate current signatures without deleting signature or approval history", async () => {
  const first = await workflowFixture();
  const signed = await applyWeeklyCommand(
    first.state,
    "issuer",
    {
      type: "SIGN",
      permitId: first.permit.id,
      expectedRevision: first.permit.revision,
      confirmed: true,
    },
    dayOne,
  );
  const data = structuredClone(signed.permit.sections.Requester.data);
  data.scope += " New work area.";
  const changed = await applyWeeklyCommand(
    signed.state,
    "requester",
    {
      type: "SAVE",
      permitId: signed.permit.id,
      role: "Requester",
      expectedRevision: 1,
      data,
    },
    dayOne,
  );
  assert.equal(Object.keys(changed.permit.signatures).length, 0);
  assert.equal(changed.permit.signatureHistory.length, 1);
  assert.equal(
    changed.permit.signedVersions[0].snapshot.sections.Requester.scope,
    signed.permit.sections.Requester.data.scope,
  );
  assert.notEqual(
    changed.permit.signedVersions[0].snapshot.sections.Requester.scope,
    changed.permit.sections.Requester.data.scope,
  );
  const active = await workflowFixture({ active: true });
  await assert.rejects(
    applyWeeklyCommand(
      active.state,
      "requester",
      {
        type: "SAVE",
        permitId: active.permit.id,
        role: "Requester",
        expectedRevision: 1,
        data,
      },
      dayOne,
    ),
    /Approved work cannot be edited/,
  );
  const returned = await applyWeeklyCommand(
    active.state,
    "hse",
    {
      type: "RETURN",
      permitId: active.permit.id,
      reason: "Scope changed and needs a fresh assessment.",
    },
    dayOne,
  );
  assert.equal(returned.permit.status, "COLLECTING");
  assert.equal(returned.permit.approval, null);
  assert.equal(returned.permit.signatureHistory.length, 3);
  assert.equal(returned.permit.approvalHistory.length, 1);
  assert.deepEqual(
    returned.permit.signedVersions,
    active.permit.signedVersions,
  );
});
test("suspension and expiry block daily work, and resumption preserves earlier evidence but requires a fresh sign-in", async () => {
  const { state, permit } = await workflowFixture({ active: true });
  const stopped = await applyWeeklyCommand(
    state,
    "holder",
    {
      type: "SUSPEND",
      permitId: permit.id,
      reason: "Unsafe condition at the work area.",
    },
    dayOne,
  );
  await assert.rejects(
    applyWeeklyCommand(
      stopped.state,
      "holder",
      { type: "DAILY", permitId: permit.id, confirmed: true, note: "" },
      dayOne,
    ),
    /not currently active/,
  );
  await assert.rejects(
    applyWeeklyCommand(
      stopped.state,
      "issuer",
      {
        type: "RESUME",
        permitId: permit.id,
        reason: "Controls restored.",
        inspected: true,
      },
      dayOne,
    ),
    /HSE/,
  );
  const resumed = await applyWeeklyCommand(
    stopped.state,
    "hse",
    {
      type: "RESUME",
      permitId: permit.id,
      reason: "Controls restored and area re-inspected.",
      inspected: true,
    },
    new Date(dayOne.getTime() + 60000),
  );
  assert.deepEqual(resumed.permit.attendance, permit.attendance);
  const nextDay = new Date("2026-10-30T01:00:00Z");
  const stopNextDay = await applyWeeklyCommand(
    state,
    "holder",
    {
      type: "SUSPEND",
      permitId: permit.id,
      reason: "Control needs re-inspection.",
    },
    nextDay,
  );
  const resumeNextDay = await applyWeeklyCommand(
    stopNextDay.state,
    "hse",
    {
      type: "RESUME",
      permitId: permit.id,
      reason: "Controls restored and independently re-inspected.",
      inspected: true,
    },
    new Date(nextDay.getTime() + 60000),
  );
  assert.equal(
    hasSignatureForDay(resumeNextDay.permit, "2026-10-29"),
    true,
    "Resumption must not hide earlier days in the attendance calendar",
  );
  assert.equal(hasTodaySignature(resumeNextDay.permit, nextDay), false);
  assert.equal(
    hasTodaySignature(resumed.permit, new Date(dayOne.getTime() + 60000)),
    false,
  );
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "holder",
      { type: "DAILY", permitId: permit.id, confirmed: true, note: "" },
      new Date("2026-11-05T01:00:00Z"),
    ),
    /expired or closed/,
  );
  assert.equal(
    effectiveWeeklyStatus(permit, new Date("2026-11-05T01:00:00Z")),
    "EXPIRED",
  );
});
test("confined-space daily entry requires a recent passing gas check and a failed check stops active work", async () => {
  const { state, permit } = await workflowFixture({
    active: true,
    confined: true,
  });
  assert.equal(gasCurrent(permit, dayOne), true);
  const tomorrow = new Date("2026-10-30T01:00:00Z");
  await assert.rejects(
    applyWeeklyCommand(
      state,
      "holder",
      { type: "DAILY", permitId: permit.id, confirmed: true, note: "" },
      tomorrow,
    ),
    /gas check is stale/,
  );
  const failed = await applyWeeklyCommand(
    state,
    "hse",
    {
      type: "MONITOR",
      permitId: permit.id,
      kind: "GAS",
      result: "FAIL",
      notes: "Required atmospheric parameter outside approved limits.",
    },
    dayOne,
  );
  assert.equal(failed.permit.status, "SUSPENDED");
  assert.equal(gasCurrent(failed.permit, dayOne), false);
});
test("daily records use Malaysia dates rather than UTC dates", () => {
  assert.equal(localDay(new Date("2026-10-29T15:59:59Z")), "2026-10-29");
  assert.equal(localDay(new Date("2026-10-29T16:00:00Z")), "2026-10-30");
});
