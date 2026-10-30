import { Draft, draftSchema, emptyDraft, activities } from "@/lib/domain";
import { emptyParty, PartyData, PartyRole, WeeklyPermit } from "./model";
import {
  companyAssessmentIssues,
  contractorIssues,
  contractorNames,
  workRequirements,
  activityHazards,
} from "@/lib/work-policy";
const specialistAliases: Record<string, string[]> = {
  isolationPoint: [
    "Mechanical work:Isolation point",
    "Electrical work:Isolation point",
  ],
  lockNumber: ["Mechanical work:Lock number", "Electrical work:Lock number"],
  verifiedBy: ["Mechanical work:Verified by", "Electrical work:Verified by"],
  fireWatch: ["Hot Work:Fire watch person"],
  spaceName: ["Confined Space:Space name / ID"],
  attendant: ["Confined Space:Attendant / safety watch"],
  entrySupervisor: ["Confined Space:Entry supervisor"],
  rescueTeam: ["Confined Space:Rescue team"],
  gasEvidence: ["Confined Space:Approved limits reference"],
};

export function applicationSections(
  draft: Draft,
): Record<PartyRole, PartyData> {
  const r = emptyParty(),
    i = emptyParty(),
    h = emptyParty();
  Object.assign(r, {
    scope: draft.description,
    company:
      contractorNames(draft) || draft.requesterDepartment || draft.department,
    requesterDepartment: draft.requesterDepartment ?? draft.department,
    ...(draft.contractors ? { contractors: draft.contractors } : {}),
    ...(draft.companyRiskAssessment
      ? { companyRiskAssessment: draft.companyRiskAssessment }
      : {}),
    equipment: draft.equipment,
    activities: draft.activities,
    ...(draft.requirementsVersion === 1
      ? { hazards: structuredClone(draft.hazards) }
      : {}),
  });
  const hazard = draft.hazards[0];
  if (hazard)
    Object.assign(r, {
      hazard: hazard.hazard,
      consequence: hazard.consequence,
      riskControls: hazard.controls,
      responsible: hazard.responsible,
      likelihood: hazard.likelihood,
      severity: hazard.severity,
      residualLikelihood: hazard.residualLikelihood,
      residualSeverity: hazard.residualSeverity,
    });
  Object.assign(i, {
    ppe: draft.ppe,
    generalControls: draft.controls,
    special: draft.special,
    emergencyPlan: draft.special.emergencyPlan ?? "",
  });
  i.special = { ...i.special };
  for (const [key, aliases] of Object.entries(specialistAliases)) {
    const values = [
      ...new Set(aliases.map((alias) => draft.special[alias]).filter(Boolean)),
    ];
    if (values.length) i.special[key] = values.join("; ");
  }
  Object.assign(h, {
    teamNames: draft.workers.map((w) => w.name).join("\n"),
    workerCount: draft.workers.length,
    phone: draft.holderPhone || draft.phone,
  });
  // Preparing a plan never records the Holder's personal declarations or any signature.
  return structuredClone({ Requester: r, Issuer: i, Holder: h });
}

export function applicationInput(value: unknown, now = new Date()) {
  const parsed = draftSchema.parse(value);
  const draft: Draft = {
    ...parsed,
    requirementsVersion: 1,
    hazards: activityHazards(parsed.hazards, parsed.activities),
    requesterDepartment: parsed.requesterDepartment || parsed.department,
    contractor: contractorNames(parsed),
    ppe: [
      ...new Set([...parsed.ppe, ...workRequirements(parsed.activities).ppe]),
    ],
  };
  if (!draft.department.trim())
    throw new Error(
      "Enter the work department before creating the shared permit.",
    );
  const issues = [
    ...contractorIssues(draft),
    ...companyAssessmentIssues(draft, now),
  ];
  if (issues.length) throw new Error(issues.join("\n"));
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.start) ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.end)
  )
    throw new Error("Enter the planned start and end in Malaysia time.");
  if (!draft.activities.length)
    throw new Error(
      "Choose at least one work activity before creating the shared permit.",
    );
  if (draft.activities.some((a) => !activities.includes(a)))
    throw new Error("Choose supported work activities from the activity list.");
  if (draft.description.trim().length < 10)
    throw new Error(
      "Describe the work scope before creating the shared permit.",
    );
  return {
    title: draft.title,
    location:
      draft.location === "Other location"
        ? draft.otherLocation
        : draft.location,
    startDay: draft.start.slice(0, 10),
    endDay: draft.end.slice(0, 10),
    application: draft,
  };
}

/** Keep the detailed application and the role editors on the same current revision. */
export function syncApplication(p: WeeklyPermit, role: PartyRole) {
  const a = p.application;
  if (!a) return;
  const d = p.sections[role].data;
  if (role === "Requester") {
    if (d.hazards) a.hazards = structuredClone(d.hazards);
    Object.assign(a, {
      description: d.scope,
      contractor: d.contractors
        ? d.contractors
            .map((c) => c.name.trim())
            .filter(Boolean)
            .join("; ")
        : d.company,
      ...(d.requesterDepartment !== undefined
        ? { requesterDepartment: d.requesterDepartment }
        : {}),
      ...(d.contractors ? { contractors: structuredClone(d.contractors) } : {}),
      ...(d.companyRiskAssessment
        ? { companyRiskAssessment: structuredClone(d.companyRiskAssessment) }
        : {}),
      equipment: d.equipment,
      activities: [...d.activities],
    });
    const assessment = d.companyRiskAssessment;
    if (assessment?.documentName) {
      const existing = a.documents.find(
        (doc) => doc.name === assessment.documentName,
      );
      if (existing) existing.type = "Company risk assessment";
      else
        a.documents.push({
          name: assessment.documentName,
          type: "Company risk assessment",
          path: "local-demo-metadata",
          expiry: "",
        });
    }
    const hazard = a.hazards[0] ?? {
      id: crypto.randomUUID(),
      affected: "Work team",
    };
    a.hazards[0] = {
      ...hazard,
      activity: d.activities[0],
      hazard: d.hazard,
      consequence: d.consequence,
      controls: d.riskControls,
      responsible: d.responsible,
      likelihood: d.likelihood,
      severity: d.severity,
      residualLikelihood: d.residualLikelihood,
      residualSeverity: d.residualSeverity,
    };
  }
  if (role === "Requester")
    a.hazards = activityHazards(a.hazards, d.activities);
  if (role === "Issuer") {
    const previous = applicationSections(a).Issuer.special;
    const special: Record<string, string> = {
      ...d.special,
      emergencyPlan: d.emergencyPlan,
    };
    for (const [key, aliases] of Object.entries(specialistAliases))
      if (d.special[key] !== previous[key])
        for (const alias of aliases)
          if (alias in a.special) special[alias] = d.special[key] ?? "";
    Object.assign(a, {
      ppe: [...d.ppe],
      controls: [...d.generalControls],
      special,
    });
  }
  if (role === "Holder") {
    a.holderPhone = d.phone;
    const names = d.teamNames
      .split(/[,\n]/)
      .map((name) => name.trim())
      .filter(Boolean);
    a.workers = names.map((name) => ({
      ...(a.workers.find((w) => w.name === name) ?? {
        id: crypto.randomUUID(),
        company: p.sections.Requester.data.company,
        trade: "",
        identity: "",
        phone: "",
        competency: "",
        expiry: "",
        inducted: false,
        acknowledged: false,
      }),
      name,
    }));
  }
}

export function newApplication(
  name: string,
  role: PartyRole,
  startDay: string,
  endDay: string,
): Draft {
  return {
    ...structuredClone(emptyDraft),
    requester: role === "Requester" ? name : "",
    start: `${startDay}T08:00`,
    end: `${endDay}T18:00`,
  };
}
