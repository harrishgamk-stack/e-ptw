import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "../src/lib/csv";
import {
  draftSchema,
  effectiveStatus,
  emptyDraft,
  riskLevel,
  submissionIssues,
  transitions,
} from "../src/lib/domain";
test("incomplete worker and hazard entries can be saved as drafts but cannot be submitted", () => {
  const draft = structuredClone(emptyDraft);
  draft.workers = [
    {
      id: "new",
      name: "",
      company: "",
      trade: "",
      identity: "",
      phone: "",
      competency: "",
      expiry: "",
      inducted: false,
      acknowledged: false,
    },
  ];
  draft.hazards = [
    {
      id: "new",
      hazard: "",
      consequence: "",
      affected: "",
      controls: "",
      responsible: "",
      likelihood: 1,
      severity: 1,
      residualLikelihood: 1,
      residualSeverity: 1,
    },
  ];
  assert.equal(draftSchema.safeParse(draft).success, true);
  assert.ok(submissionIssues(draft).some((i) => i.includes("workers")));
  assert.ok(submissionIssues(draft).some((i) => i.includes("risk assessment")));
});
test("terminal and suspended states cannot skip approvals", () => {
  assert.equal(transitions.DRAFT?.ACTIVE, undefined);
  assert.equal(transitions.CLOSED, undefined);
  assert.equal(transitions.SUSPENDED?.ACTIVE, "permit.resume");
  assert.equal(transitions.ACTIVE?.APPROVED, undefined);
});
test("expired permits never present as active, issued or suspended", () => {
  for (const status of ["ACTIVE", "ISSUED", "SUSPENDED"] as const)
    assert.equal(
      effectiveStatus(
        { status, end: "2026-01-01T00:00:00Z" },
        new Date("2026-10-28T00:00:00Z"),
      ),
      "EXPIRED",
    );
  assert.equal(
    effectiveStatus({ status: "CLOSED", end: "2026-01-01T00:00:00Z" }),
    "CLOSED",
  );
});
test("risk matrix covers every boundary", () => {
  assert.deepEqual([1, 4, 5, 9, 10, 16, 17, 25].map(riskLevel), [
    "Low",
    "Low",
    "Medium",
    "Medium",
    "High",
    "High",
    "Extreme",
    "Extreme",
  ]);
});
test("CSV exports cannot turn permit text into executable spreadsheet formulas", () => {
  assert.equal(
    csvCell('=HYPERLINK("https://example.com")'),
    '"\'=HYPERLINK(""https://example.com"")"',
  );
  assert.equal(csvCell("Warehouse A, Bay 2"), '"Warehouse A, Bay 2"');
  assert.equal(csvCell("@SUM(1,2)"), '"\'@SUM(1,2)"');
});
test("empty and unsafe drafts are blocked", () => {
  assert.ok(submissionIssues(emptyDraft).length > 7);
  const draft = structuredClone(emptyDraft);
  draft.hazards = [
    {
      id: "1",
      hazard: "Fire",
      consequence: "Burn",
      affected: "Workers",
      controls: "Fire watch",
      responsible: "HSE",
      likelihood: 5,
      severity: 5,
      residualLikelihood: 5,
      residualSeverity: 5,
    },
  ];
  draft.activities = ["Confined Space"];
  draft.special.gasResult = "FAIL";
  assert.ok(submissionIssues(draft).some((i) => i.includes("extreme")));
  assert.ok(submissionIssues(draft).some((i) => i.includes("atmospheric")));
});
