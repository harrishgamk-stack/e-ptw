import { safetyControls, specialControls } from "../src/lib/domain";
import {
  applyWeeklyCommand,
  WeeklyCommand,
} from "../src/features/weekly/engine";
import {
  emptyParty,
  emptyWeeklyState,
  PartyRole,
  Person,
  WeeklyPermit,
  WeeklyState,
} from "../src/features/weekly/model";
export const dayOne = new Date("2026-10-29T01:00:00Z");
export const demoPeople: Person[] = [
  {
    id: "requester",
    name: "Test Requester",
    icHash: "requester-hash",
    icLast4: "0001",
    role: "Requester",
  },
  {
    id: "issuer",
    name: "Test Issuer",
    icHash: "issuer-hash",
    icLast4: "0002",
    role: "Issuer",
  },
  {
    id: "holder",
    name: "Test Holder",
    icHash: "holder-hash",
    icLast4: "0003",
    role: "Holder",
  },
  {
    id: "hse",
    name: "Test HSE",
    icHash: "hse-hash",
    icLast4: "0004",
    role: "HSE",
  },
  {
    id: "outsider",
    name: "Other Issuer",
    icHash: "other-hash",
    icLast4: "0005",
    role: "Issuer",
  },
];
export function filledSection(role: PartyRole, confined = false) {
  const data = emptyParty();
  if (role === "Requester")
    Object.assign(data, {
      scope: "Inspect and service the warehouse ventilation equipment.",
      company: "PCG Maintenance",
      activities: [confined ? "Confined Space" : "General work"],
      hazard: "Slips and trips",
      consequence: "Minor injury",
      riskControls: "Demarcate the area and remove trip hazards.",
      responsible: "Site supervisor",
    });
  if (role === "Requester") {
    data.requesterDepartment = "Maintenance";
    data.contractors = [];
    data.hazards = [
      {
        id: "risk-primary",
        activity: data.activities[0],
        hazard: data.hazard,
        consequence: data.consequence,
        affected: "Work team",
        controls: data.riskControls,
        responsible: data.responsible,
        likelihood: data.likelihood,
        severity: data.severity,
        residualLikelihood: data.residualLikelihood,
        residualSeverity: data.residualSeverity,
      },
    ];
    if (confined)
      data.companyRiskAssessment = {
        reference: "PCG-CRA-001",
        assessedBy: "Company assessor",
        assessmentDate: "2026-10-28",
        documentName: "company-ra.pdf",
        completed: true,
        activitiesKey: "Confined Space",
      };
  }
  if (role === "Issuer") {
    Object.assign(data, {
      ppe: ["Safety shoes", "Safety helmet"],
      generalControls: [...safetyControls],
      emergencyPlan:
        "Use assembly point A and contact the site emergency team.",
    });
    if (confined) {
      for (const c of specialControls["Confined Space"])
        data.special[`Confined Space:${c}`] = "yes";
      Object.assign(data.special, {
        isolationPoint: "Point A",
        lockNumber: "L-001",
        verifiedBy: "Authorized verifier",
        spaceName: "Vessel A",
        attendant: "Attendant A",
        entrySupervisor: "Supervisor A",
        rescueTeam: "Site rescue team",
        gasEvidence: "Evidence report GT-001 with approved site limits.",
      });
    }
  }
  if (role === "Holder")
    Object.assign(data, {
      teamNames: "Test Holder, Test Worker",
      workerCount: 2,
      phone: "0123456789",
      toolbox: true,
      competent: true,
      understood: true,
    });
  return data;
}
export async function workflowFixture(
  options: { signed?: boolean; active?: boolean; confined?: boolean } = {},
) {
  let state: WeeklyState = {
    ...emptyWeeklyState(),
    people: structuredClone(demoPeople),
  };
  let permit: WeeklyPermit;
  async function run(actor: string, cmd: WeeklyCommand, now = dayOne) {
    const result = await applyWeeklyCommand(state, actor, cmd, now);
    state = result.state;
    permit = result.permit;
    return result;
  }
  await run("issuer", {
    type: "CREATE",
    input: {
      title: "Warehouse ventilation maintenance",
      location: "Warehouse A",
      startDay: "2026-10-29",
      endDay: "2026-11-04",
    },
  });
  await run("requester", { type: "JOIN", token: permit!.token });
  await run("holder", { type: "JOIN", token: permit!.token });
  for (const role of ["Requester", "Issuer", "Holder"] as PartyRole[])
    await run(role.toLowerCase(), {
      type: "SAVE",
      permitId: permit!.id,
      role,
      expectedRevision: 0,
      data: filledSection(role, options.confined),
    });
  if (options.signed || options.active)
    for (const role of ["Requester", "Issuer", "Holder"] as PartyRole[])
      await run(role.toLowerCase(), {
        type: "SIGN",
        permitId: permit!.id,
        expectedRevision: permit!.revision,
        confirmed: true,
      });
  if (options.active) {
    if (options.confined)
      await run("hse", {
        type: "MONITOR",
        permitId: permit!.id,
        kind: "GAS",
        result: "PASS",
        notes:
          "Instrument GT-001 in calibration. All required parameters within approved limits.",
      });
    await run("hse", {
      type: "APPROVE",
      permitId: permit!.id,
      expectedRevision: permit!.revision,
      confirmed: true,
      notes: "Initial safety review complete.",
    });
  }
  return { state, permit: permit! };
}
