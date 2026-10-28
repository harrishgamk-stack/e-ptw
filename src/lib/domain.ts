import { z } from "zod";
export const statuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUIRED",
  "PENDING_APPROVAL",
  "APPROVED",
  "ISSUED",
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "COMPLETION_REQUESTED",
  "CLOSED",
  "CANCELLED",
] as const;
export type Status = (typeof statuses)[number];
export const transitions: Partial<
  Record<Status, Partial<Record<Status, string>>>
> = {
  DRAFT: { SUBMITTED: "permit.submit", CANCELLED: "permit.cancel" },
  CHANGES_REQUIRED: { SUBMITTED: "permit.submit" },
  SUBMITTED: { UNDER_REVIEW: "permit.review" },
  UNDER_REVIEW: {
    CHANGES_REQUIRED: "permit.review",
    PENDING_APPROVAL: "permit.review",
    CANCELLED: "permit.review",
  },
  PENDING_APPROVAL: {
    APPROVED: "permit.approve",
    CHANGES_REQUIRED: "permit.approve",
    CANCELLED: "permit.approve",
  },
  APPROVED: { ISSUED: "permit.issue" },
  ISSUED: { ACTIVE: "permit.activate" },
  ACTIVE: {
    SUSPENDED: "permit.suspend",
    COMPLETION_REQUESTED: "permit.close",
    EXPIRED: "permit.expire",
  },
  SUSPENDED: { ACTIVE: "permit.resume", CANCELLED: "permit.cancel" },
  COMPLETION_REQUESTED: { CLOSED: "permit.close" },
};
export const activities = [
  "Mechanical work",
  "Electrical work",
  "Electrical tools",
  "ATEX area",
  "Drilling / sawing",
  "Working at height",
  "Hoisting / lifting",
  "Asbestos",
  "Lone working",
  "Safety override / bridging",
  "CO exposure",
  "Detector isolation",
  "Excavation",
  "Digging / boring",
  "Hazardous substances",
  "Environmental impact",
  "Hot Work",
  "Confined Space",
  "Other",
];
export const ppeOptions = [
  "Safety shoes",
  "Safety helmet",
  "Safety cap",
  "Safety glasses",
  "Gloves",
  "Ear protection",
  "Face shield",
  "Heat-resistant clothing",
  "Respiratory protection",
  "Gas / vapour / dust filter",
  "Fall protection",
  "Other PPE",
];
export const safetyControls = [
  "Site rules read and understood",
  "Work area demarcated",
  "Safety barrier / cordon installed",
  "Warning signage installed",
  "Access restricted",
  "Housekeeping acceptable",
  "Lighting adequate",
  "Emergency access maintained",
  "Area fenced",
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
    "Combustibles removed",
    "Flammables removed",
    "Area cleaned",
    "Fire extinguisher available",
    "Fire blanket available",
    "Gas cylinders secured",
    "Ventilation adequate",
    "Fire watch assigned",
    "Production Manager permission approved",
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
  "Working at height": [
    "Harness inspected",
    "Lifeline installed",
    "Anchor point approved",
    "Scaffold tagged",
    "Barricade below",
    "Rescue plan available",
    "Competent person verified",
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
export const hazardSchema = z.object({
  id: z.string(),
  hazard: z.string().min(3),
  consequence: z.string().min(3),
  affected: z.string().min(2),
  controls: z.string().min(3),
  likelihood: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(5),
  residualLikelihood: z.number().int().min(1).max(5),
  residualSeverity: z.number().int().min(1).max(5),
  responsible: z.string().min(2),
});
export const workerSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  company: z.string().min(2),
  trade: z.string().min(2),
  identity: z.string().min(2),
  phone: z.string(),
  competency: z.string(),
  expiry: z.string(),
  inducted: z.boolean(),
  acknowledged: z.boolean(),
});
export const draftSchema = z.object({
  title: z.string(),
  department: z.string(),
  location: z.string(),
  otherLocation: z.string(),
  equipment: z.string(),
  area: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string(),
  purpose: z.string(),
  reference: z.string(),
  shutdown: z.boolean(),
  impact: z.string(),
  emergency: z.boolean(),
  notes: z.string(),
  requester: z.string(),
  requesterId: z.string(),
  phone: z.string(),
  email: z.string(),
  holder: z.string(),
  holderPhone: z.string(),
  contractor: z.string(),
  contractorApproved: z.boolean(),
  documentationComplete: z.boolean(),
  certificateAvailable: z.boolean(),
  sheComplete: z.boolean(),
  workers: z.array(
    workerSchema.extend({
      name: z.string(),
      company: z.string(),
      trade: z.string(),
      identity: z.string(),
    }),
  ),
  activities: z.array(z.string()),
  ppe: z.array(z.string()),
  controls: z.array(z.string()),
  hazards: z.array(
    hazardSchema.extend({
      hazard: z.string(),
      consequence: z.string(),
      affected: z.string(),
      controls: z.string(),
      responsible: z.string(),
    }),
  ),
  toolbox: z.string(),
  special: z.record(z.string(), z.string()),
  documents: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      path: z.string(),
      expiry: z.string(),
    }),
  ),
  confirmed: z.boolean(),
});
export type Draft = z.infer<typeof draftSchema>;
export type Hazard = z.infer<typeof hazardSchema>;
export type Permit = {
  id: string;
  number: string;
  title: string;
  location: string;
  department: string;
  contractor: string;
  holder: string;
  type: string;
  status: Status;
  risk: "Low" | "Medium" | "High" | "Extreme";
  start: string;
  end: string;
  workers: number;
  token: string;
  draft?: Draft;
  created_at?: string;
  workActive?: boolean;
  originalEnd?: string;
};
export type AuditEvent = {
  id: string;
  permitId: string;
  action: string;
  actor: string;
  at: string;
  reason: string;
};
export const emptyDraft: Draft = {
  title: "",
  department: "",
  location: "",
  otherLocation: "",
  equipment: "",
  area: "",
  start: "",
  end: "",
  description: "",
  purpose: "",
  reference: "",
  shutdown: false,
  impact: "None",
  emergency: false,
  notes: "",
  requester: "",
  requesterId: "",
  phone: "",
  email: "",
  holder: "",
  holderPhone: "",
  contractor: "",
  contractorApproved: false,
  documentationComplete: false,
  certificateAvailable: false,
  sheComplete: false,
  workers: [],
  activities: [],
  ppe: [],
  controls: [],
  hazards: [],
  toolbox: "Once before work",
  special: {},
  documents: [],
  confirmed: false,
};
export function riskLevel(score: number): Permit["risk"] {
  return score >= 17
    ? "Extreme"
    : score >= 10
      ? "High"
      : score >= 5
        ? "Medium"
        : "Low";
}
export function effectiveStatus(
  permit: Pick<Permit, "status" | "end">,
  now = new Date(),
): Status {
  return ["ACTIVE", "ISSUED", "SUSPENDED"].includes(permit.status) &&
    new Date(permit.end) <= now
    ? "EXPIRED"
    : permit.status;
}
export function submissionIssues(d: Draft): string[] {
  const issues: string[] = [];
  if (
    !d.title.trim() ||
    !d.description.trim() ||
    !d.purpose.trim() ||
    !d.department ||
    !d.location
  )
    issues.push(
      "Complete the work title, description, purpose, department and location.",
    );
  if (d.location === "Other location" && !d.otherLocation.trim())
    issues.push("Justify the other location.");
  if (!d.start || !d.end || new Date(d.end) <= new Date(d.start))
    issues.push("Provide a valid work period with end after start.");
  if (
    !d.requester ||
    !d.holder ||
    !d.contractor ||
    !d.phone ||
    !z.email().safeParse(d.email).success
  )
    issues.push(
      "Complete requester contact, permit holder and contractor details.",
    );
  if (
    !d.contractorApproved ||
    !d.documentationComplete ||
    !d.certificateAvailable ||
    !d.sheComplete
  )
    issues.push(
      "Contractor approval, documentation, certificate and SHE/PT/RA must be verified.",
    );
  if (
    !d.workers.length ||
    d.workers.some(
      (w) =>
        !workerSchema.safeParse(w).success ||
        !w.inducted ||
        !w.expiry ||
        new Date(w.expiry) < new Date(d.end),
    )
  )
    issues.push(
      "Add inducted workers with complete details and certificates valid through the work period.",
    );
  if (!d.activities.length || !d.ppe.length)
    issues.push("Select work activities and required PPE.");
  if (
    !d.hazards.length ||
    d.hazards.some((h) => !hazardSchema.safeParse(h).success)
  )
    issues.push(
      "Complete at least one risk assessment including controls and responsible person.",
    );
  if (d.hazards.some((h) => h.residualLikelihood * h.residualSeverity >= 17))
    issues.push(
      "Unresolved extreme residual risk blocks submission. HSE review is required.",
    );
  if (!safetyControls.every((c) => d.controls.includes(c)))
    issues.push("Complete all general safety controls.");
  for (const a of d.activities)
    for (const c of specialControls[a] ?? [])
      if (d.special[`${a}:${c}`] !== "yes")
        issues.push(`${a}: ${c} must be verified.`);
  if (
    d.activities.includes("Confined Space") &&
    d.special["gasResult"] !== "PASS"
  )
    issues.push(
      "A passing atmospheric test is required for confined space work.",
    );
  if (!d.confirmed) issues.push("Confirm the declaration before submission.");
  return issues;
}
