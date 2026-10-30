import type { Draft } from "./domain";
import { z } from "zod";
export function activityKey(activities: string[]) {
  return [...activities].sort().join("|");
}
export function activityHazards(
  hazards: Draft["hazards"],
  activities: string[],
): Draft["hazards"] {
  const result = hazards
    .filter((h) => !h.activity || activities.includes(h.activity))
    .map((h) => ({ ...h }));
  for (const activity of activities)
    if (!result.some((h) => h.activity === activity)) {
      const existing = result.find((h) => !h.activity);
      if (existing) existing.activity = activity;
      else
        result.push({
          id: crypto.randomUUID(),
          activity,
          hazard: "",
          consequence: "",
          affected: "",
          controls: "",
          responsible: "",
          likelihood: 3,
          severity: 3,
          residualLikelihood: 2,
          residualSeverity: 2,
        });
    }
  return result;
}
export function activityAssessmentIssues(
  d: Pick<Draft, "activities" | "hazards">,
) {
  return d.activities
    .filter((a) => !d.hazards.some((h) => h.activity === a))
    .map((a) => `Complete the generated risk assessment for ${a}.`);
}
export function prepareDraftForForm(draft: Draft): Draft {
  return {
    ...draft,
    requirementsVersion: 1,
    requesterDepartment: draft.requesterDepartment || draft.department,
    contractors:
      draft.contractors ??
      (draft.contractor.trim()
        ? [
            {
              id: crypto.randomUUID(),
              name: draft.contractor,
              phone: "",
              safetyInduction: false,
              acknowledged: false,
            },
          ]
        : []),
    hazards: activityHazards(draft.hazards, draft.activities),
    ppe: [
      ...new Set([...draft.ppe, ...workRequirements(draft.activities).ppe]),
    ],
  };
}

export const departments = [
  "Mixing",
  "Blowing",
  "Extrusion",
  "Engineering",
  "Maintenance",
  "Facilities",
  "Operations",
  "HSE",
];
export const specialControls: Record<string, string[]> = {
  "Mechanical work": [
    "Isolation required",
    "Zero-energy verification completed",
    "Release authorization",
  ],
  "Electrical work": [
    "Isolation required",
    "Zero-energy verification completed",
    "Release authorization",
  ],
  "Hot Work": [
    "Fire extinguisher available",
    "Fire watch assigned",
    "Combustible materials removed or covered",
    "Flammables removed",
    "Fire blanket available",
    "Gas cylinders secured",
    "Ventilation adequate",
    "Welding / cutting PPE available",
    "Work area barricaded",
    "Gas testing applicability assessed",
    "Production Manager permission approved",
  ],
  "Working at height": [
    "Full-body harness inspected",
    "Anchorage / lifeline approved",
    "Scaffold / platform approved",
    "Ladder / scaffold inspection completed",
    "Drop zone barricaded",
    "Rescue arrangements confirmed",
    "Competent person verified",
  ],
  "Confined Space": [
    "Energy sources isolated",
    "LOTO verified",
    "Ventilation adequate",
    "Rescue team confirmed",
    "Communication tested",
    "Low-voltage lighting",
    "Suitable electrical equipment",
    "Entry supervisor verified",
  ],
  "Hoisting / lifting": [
    "Lifting plan approved",
    "Certified operator",
    "Rigger verified",
    "Signalman verified",
    "Equipment certificate valid",
    "Barricaded area",
    "Weather acceptable",
    "Pre-lift inspection",
  ],
  "Environmental impact": [
    "SDS attached",
    "Storage arrangements confirmed",
    "Waste disposal arranged",
    "Spill protection",
    "Drain protection",
    "Dust control",
    "Noise control",
    "Odour control",
    "Air emission control",
  ],
};
const titles: Record<string, string> = {
  "Mechanical work": "Mechanical Isolation Permit",
  "Electrical work": "Electrical Isolation Permit",
  "Hot Work": "Hot Work Permit",
  "Working at height": "Working at Height Permit",
  "Confined Space": "Confined Space Entry Permit",
  "Hoisting / lifting": "Lifting Permit",
  "Environmental impact": "Environmental Controls Permit",
};
export function subPermitReference(parent: string, activity: string) {
  const codes: Record<string, string> = {
    "Hot Work": "HW",
    "Working at height": "WAH",
    "Mechanical work": "MI",
    "Electrical work": "EI",
    "Confined Space": "CS",
    "Hoisting / lifting": "LFT",
    "Environmental impact": "ENV",
  };
  return `${parent}/${codes[activity] ?? activity.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}
const ppe: Record<string, string[]> = {
  "Hot Work": [
    "Safety shoes",
    "Safety helmet",
    "Face shield",
    "Welding gloves",
    "Heat-resistant clothing",
  ],
  "Working at height": [
    "Safety shoes",
    "Safety helmet",
    "Full-body harness",
    "Fall protection",
  ],
  "Confined Space": ["Safety shoes", "Safety helmet"],
  "Electrical work": ["Safety shoes", "Safety helmet", "Safety glasses"],
};
const highRisk = new Set([
  "High Risk Work",
  "Mechanical work",
  "Electrical work",
  "ATEX area",
  "Working at height",
  "Hoisting / lifting",
  "Asbestos",
  "CO exposure",
  "Excavation",
  "Digging / boring",
  "Hazardous substances",
  "Hot Work",
  "Confined Space",
  "Safety override / bridging",
]);
export function workRequirements(
  activities: string[],
  hazards: Draft["hazards"] = [],
) {
  const formalAssessment =
    activities.some((a) => highRisk.has(a)) ||
    hazards.some((h) => h.likelihood * h.severity >= 10);
  return {
    formalAssessment,
    ppe: [
      ...new Set([
        "Safety shoes",
        "Safety helmet",
        ...activities.flatMap((a) => ppe[a] ?? []),
      ]),
    ],
    permits: activities
      .filter((a) => specialControls[a])
      .map((activity) => ({
        activity,
        title: titles[activity],
        controls: specialControls[activity],
      })),
    route: `${formalAssessment ? "Formal company risk assessment → " : "General risk assessment → "}Requester + Issuer + Holder sign → HSE review and activation`,
  };
}
export function selectActivities(draft: Draft, selected: string[]): Draft {
  const oldRequired = workRequirements(draft.activities).ppe;
  const required = workRequirements(selected).ppe;
  const hazards = activityHazards(draft.hazards, selected);
  const special = Object.fromEntries(
    Object.entries(draft.special).filter(
      ([key]) =>
        !draft.activities.some(
          (a) => !selected.includes(a) && key.startsWith(`${a}:`),
        ),
    ),
  );
  return {
    ...draft,
    requirementsVersion: 1,
    activities: selected,
    ppe: [
      ...new Set([
        ...draft.ppe.filter((p) => !oldRequired.includes(p)),
        ...required,
      ]),
    ],
    hazards,
    special,
    ...(draft.companyRiskAssessment
      ? {
          companyRiskAssessment: {
            ...draft.companyRiskAssessment,
            completed: false,
          },
        }
      : {}),
  };
}
export function contractorNames(d: Pick<Draft, "contractors" | "contractor">) {
  return d.contractors
    ? d.contractors
        .map((c) => c.name.trim())
        .filter(Boolean)
        .join("; ")
    : d.contractor;
}
export function contractorIssues(d: Pick<Draft, "contractors">) {
  return (d.contractors ?? []).flatMap((c, index) => [
    ...(c.name.trim().length < 2
      ? [`Enter Contractor ${index + 1}'s name.`]
      : []),
    ...(!/^[+\d][\d\s()-]{5,24}$/.test(c.phone.trim())
      ? [`Enter Contractor ${index + 1}'s phone number.`]
      : []),
    ...(!c.safetyInduction || !c.acknowledged
      ? [
          `Contractor ${index + 1}: complete Safety Induction and acknowledgement.`,
        ]
      : []),
  ]);
}
export function companyAssessmentIssues(
  d: Pick<
    Draft,
    "activities" | "hazards" | "companyRiskAssessment" | "documents"
  >,
  now = new Date(),
) {
  if (!workRequirements(d.activities, d.hazards).formalAssessment) return [];
  const r = d.companyRiskAssessment;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const issues: string[] = [];
  if (
    !r ||
    r.reference.trim().length < 3 ||
    r.assessedBy.trim().length < 2 ||
    !z.iso.date().safeParse(r.assessmentDate).success ||
    r.assessmentDate > day ||
    !r.completed ||
    r.activitiesKey !== activityKey(d.activities)
  )
    issues.push(
      "High-risk work requires a completed formal company risk assessment, reference, assessor and assessment date covering the current activities before submission.",
    );
  if (
    !r?.documentName ||
    !d.documents.some(
      (doc) =>
        doc.name === r.documentName &&
        ["Company risk assessment", "Risk assessment"].includes(doc.type),
    )
  )
    issues.push(
      "Register the formal company risk assessment document before submitting high-risk work.",
    );
  return issues;
}
