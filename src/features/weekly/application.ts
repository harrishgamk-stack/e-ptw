import { Draft, draftSchema, emptyDraft } from "@/lib/domain";
import { emptyParty, PartyData, PartyRole, WeeklyPermit } from "./model";
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
    company: draft.contractor || draft.department,
    equipment: draft.equipment,
    activities: draft.activities,
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

export function applicationInput(value: unknown) {
  const draft = draftSchema.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.start) ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.end)
  )
    throw new Error("Enter the planned start and end in Malaysia time.");
  if (!draft.activities.length)
    throw new Error(
      "Choose at least one work activity before creating the shared permit.",
    );
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
    Object.assign(a, {
      description: d.scope,
      contractor: d.company,
      equipment: d.equipment,
      activities: [...d.activities],
    });
    const hazard = a.hazards[0] ?? {
      id: crypto.randomUUID(),
      affected: "Work team",
    };
    a.hazards[0] = {
      ...hazard,
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
