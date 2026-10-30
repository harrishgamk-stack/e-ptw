import { z } from "zod";
import { Draft, draftSchema } from "@/lib/domain";

export const partyRoles = ["Requester", "Issuer", "Holder"] as const;
export type PartyRole = (typeof partyRoles)[number];
export type Role = PartyRole | "HSE";
export type Person = {
  id: string;
  name: string;
  icHash: string;
  icLast4: string;
  role: Role;
};
export const partySchema = z.object({
  scope: z.string().max(5000),
  company: z.string().max(200),
  equipment: z.string().max(500),
  activities: z.array(z.string()).max(25),
  hazard: z.string().max(2000),
  consequence: z.string().max(2000),
  riskControls: z.string().max(3000),
  responsible: z.string().max(200),
  likelihood: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(5),
  residualLikelihood: z.number().int().min(1).max(5),
  residualSeverity: z.number().int().min(1).max(5),
  ppe: z.array(z.string()).max(30),
  generalControls: z.array(z.string()).max(30),
  emergencyPlan: z.string().max(3000),
  special: z.record(z.string(), z.string().max(2000)),
  teamNames: z.string().max(4000),
  workerCount: z.number().int().min(0).max(1000),
  phone: z.string().max(50),
  toolbox: z.boolean(),
  competent: z.boolean(),
  understood: z.boolean(),
});
export type PartyData = z.infer<typeof partySchema>;
export type WorkContent = {
  id: string;
  number: string;
  title: string;
  location: string;
  start: string;
  end: string;
  revision: number;
  members: Partial<Record<PartyRole, string>>;
  sections: Record<PartyRole, PartyData>;
  application?: Draft;
};
export type SignedVersion = {
  revision: number;
  contentHash: string;
  recordedAt: string;
  snapshot: WorkContent;
};
export const emptyParty = (): PartyData => ({
  scope: "",
  company: "",
  equipment: "",
  activities: [],
  hazard: "",
  consequence: "",
  riskControls: "",
  responsible: "",
  likelihood: 3,
  severity: 3,
  residualLikelihood: 2,
  residualSeverity: 2,
  ppe: [],
  generalControls: [],
  emergencyPlan: "",
  special: {},
  teamNames: "",
  workerCount: 0,
  phone: "",
  toolbox: false,
  competent: false,
  understood: false,
});
export type Section = {
  data: PartyData;
  revision: number;
  savedAt: string | null;
  savedBy: string | null;
};
export type PartySignature = {
  id: string;
  role: PartyRole;
  personId: string;
  name: string;
  signedAt: string;
  revision: number;
  contentHash: string;
};
export type Approval = {
  id: string;
  personId: string;
  name: string;
  signedAt: string;
  revision: number;
  contentHash: string;
  notes: string;
};
export type Attendance = {
  id: string;
  day: string;
  personId: string;
  name: string;
  signedAt: string;
  revision: number;
  kind: "INITIAL" | "DAILY";
  note: string;
};
export type Monitoring = {
  id: string;
  personId: string;
  name: string;
  at: string;
  kind: "INSPECTION" | "GAS";
  result: "PASS" | "FAIL";
  notes: string;
};
export type WeeklyPermit = {
  id: string;
  number: string;
  token: string;
  title: string;
  location: string;
  start: string;
  end: string;
  createdAt: string;
  createdBy: string;
  status: "COLLECTING" | "HSE_REVIEW" | "ACTIVE" | "SUSPENDED" | "CLOSED";
  revision: number;
  members: Partial<Record<PartyRole, string>>;
  sections: Record<PartyRole, Section>;
  signatures: Partial<Record<PartyRole, PartySignature>>;
  signatureHistory: PartySignature[];
  signedVersions: SignedVersion[];
  approval: Approval | null;
  approvalHistory: Approval[];
  attendance: Attendance[];
  attendanceAfter: string | null;
  monitoring: Monitoring[];
  suspensionReason: string | null;
  application?: Draft;
};
export type WeeklyAudit = {
  id: string;
  permitId: string;
  actorId: string;
  name: string;
  role: Role;
  action: string;
  at: string;
  reason: string;
};
export type WeeklyState = {
  schema: 2;
  people: Person[];
  permits: WeeklyPermit[];
  audit: WeeklyAudit[];
};
export const emptyWeeklyState = (): WeeklyState => ({
  schema: 2,
  people: [],
  permits: [],
  audit: [],
});
export const createSchema = z.object({
  title: z.string().trim().min(5, "Describe the planned work.").max(200),
  location: z.string().trim().min(2, "Enter the work location.").max(200),
  startDay: z.iso.date(),
  endDay: z.iso.date(),
  application: draftSchema.optional(),
});
export function localDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)!.value)
    .join("-");
}
export function addDays(day: string, days: number) {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function effectiveWeeklyStatus(
  p: WeeklyPermit,
  now = new Date(),
): string {
  if (p.status === "CLOSED") return "CLOSED";
  if (new Date(p.end) <= now) return "EXPIRED";
  if (p.status === "ACTIVE" && new Date(p.start) > now) return "SCHEDULED";
  return p.status;
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
export const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const timeLabel = (value: string) =>
  new Date(value).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export function hasSignatureForDay(p: WeeklyPermit, day: string) {
  return p.attendance.some(
    (a) =>
      a.day === day &&
      a.revision === p.revision &&
      a.personId === p.members.Holder &&
      (!p.attendanceAfter ||
        day < localDay(new Date(p.attendanceAfter)) ||
        a.signedAt >= p.attendanceAfter),
  );
}
export function hasTodaySignature(p: WeeklyPermit, now = new Date()) {
  return hasSignatureForDay(p, localDay(now));
}
export const dailyStatement =
  "I am present for work today. The approved scope and conditions are unchanged, the required controls remain in place, and I will stop work if conditions change.";
