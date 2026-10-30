import { canonicalJson, digest } from "@/lib/acknowledgement";
import {
  Draft,
  activities,
  hazardSchema,
  safetyControls,
  specialControls,
} from "@/lib/domain";
import {
  applicationInput,
  applicationSections,
  syncApplication,
} from "./application";
import {
  companyAssessmentIssues,
  contractorIssues,
  workRequirements,
  activityAssessmentIssues,
  activityHazards,
} from "@/lib/work-policy";
import {
  Approval,
  Attendance,
  createSchema,
  effectiveWeeklyStatus,
  emptyParty,
  hasTodaySignature,
  localDay,
  Monitoring,
  partyRoles,
  partySchema,
  PartyData,
  PartyRole,
  PartySignature,
  Person,
  WeeklyPermit,
  WeeklyState,
  WorkContent,
} from "./model";

export const roleFields: Record<PartyRole, (keyof PartyData)[]> = {
  Requester: [
    "requesterDepartment",
    "contractors",
    "companyRiskAssessment",
    "hazards",
    "scope",
    "company",
    "equipment",
    "activities",
    "hazard",
    "consequence",
    "riskControls",
    "responsible",
    "likelihood",
    "severity",
    "residualLikelihood",
    "residualSeverity",
  ],
  Issuer: ["ppe", "generalControls", "emergencyPlan", "special"],
  Holder: [
    "teamNames",
    "workerCount",
    "phone",
    "toolbox",
    "competent",
    "understood",
  ],
};
export function contentOf(p: WeeklyPermit): WorkContent {
  return {
    ...(p.requirementsVersion
      ? { requirementsVersion: p.requirementsVersion }
      : {}),
    id: p.id,
    number: p.number,
    title: p.title,
    location: p.location,
    start: p.start,
    end: p.end,
    revision: p.revision,
    members: p.members,
    sections: Object.fromEntries(
      partyRoles.map((r) => [r, p.sections[r].data]),
    ) as Record<PartyRole, PartyData>,
    ...(p.application ? { application: structuredClone(p.application) } : {}),
  };
}
const currentPolicy = (p: WeeklyPermit) =>
  p.requirementsVersion === 1 || p.application?.requirementsVersion === 1;
function assessmentPlan(p: WeeklyPermit) {
  const r = p.sections.Requester.data,
    assessment =
      r.companyRiskAssessment ?? p.application?.companyRiskAssessment;
  return {
    activities: r.activities,
    hazards: p.application?.hazards ?? r.hazards ?? [],
    companyRiskAssessment: assessment,
    documents:
      p.application?.documents ??
      (assessment?.documentName
        ? [
            {
              name: assessment.documentName,
              type: "Company risk assessment",
              path: "local-demo-metadata",
              expiry: "",
            },
          ]
        : []),
  };
}
function archiveSignedWork(p: WeeklyPermit, hash: string, at: string) {
  p.signedVersions ??= [];
  const existing = p.signedVersions.find((v) => v.revision === p.revision);
  if (existing && existing.contentHash !== hash)
    throw new Error(
      "A previously signed revision changed. Return the permit for a fresh review.",
    );
  if (!existing)
    p.signedVersions.push({
      revision: p.revision,
      contentHash: hash,
      recordedAt: at,
      snapshot: structuredClone(contentOf(p)),
    });
}
export function sectionIssues(
  p: WeeklyPermit,
  role: PartyRole,
  now = new Date(),
): string[] {
  const d = p.sections[role].data,
    issues: string[] = [];
  if (!p.members[role]) issues.push(`${role} has not joined.`);
  if (role === "Requester") {
    if (currentPolicy(p)) {
      if (!d.requesterDepartment?.trim())
        issues.push("Enter the Requester department.");
      issues.push(...contractorIssues({ contractors: d.contractors }));
      issues.push(...companyAssessmentIssues(assessmentPlan(p), now));
    }
    if (d.scope.trim().length < 10 || !d.company.trim())
      issues.push("Add the work scope and company.");
    if (!d.activities.length) issues.push("Choose at least one work activity.");
    if (
      [d.hazard, d.consequence, d.riskControls, d.responsible].some(
        (v) => v.trim().length < 3,
      )
    )
      issues.push(
        "Complete the hazard, consequence, controls and responsible person.",
      );
    if (d.residualLikelihood * d.residualSeverity >= 17)
      issues.push("Extreme residual risk must be resolved before signing.");
  }
  if (role === "Issuer") {
    if (
      currentPolicy(p) &&
      !workRequirements(p.sections.Requester.data.activities).ppe.every(
        (required) => d.ppe.includes(required),
      )
    )
      issues.push(
        "Include every item of PPE required by the selected activities.",
      );
    if (
      !d.ppe.length ||
      !safetyControls.every((c) => d.generalControls.includes(c))
    )
      issues.push("Confirm the PPE and every general site control.");
    if (d.emergencyPlan.trim().length < 10)
      issues.push("Record the emergency and rescue arrangements.");
    for (const activity of p.sections.Requester.data.activities)
      for (const control of specialControls[activity] ?? [])
        if (d.special[`${activity}:${control}`] !== "yes")
          issues.push(`${activity}: ${control} is incomplete.`);
    if (
      p.sections.Requester.data.activities.some((a) =>
        ["Mechanical work", "Electrical work", "Confined Space"].includes(a),
      ) &&
      ["isolationPoint", "lockNumber", "verifiedBy"].some(
        (k) => !d.special[k]?.trim(),
      )
    )
      issues.push("Record the isolation point, lock number and verifier.");
    if (
      p.sections.Requester.data.activities.includes("Hot Work") &&
      !d.special.fireWatch?.trim()
    )
      issues.push("Name the fire watch.");
    if (
      currentPolicy(p) &&
      p.sections.Requester.data.activities.includes("Hot Work") &&
      !["required", "not-required"].includes(d.special.gasTesting ?? "")
    )
      issues.push("Record whether Hot Work gas testing is required.");
    if (
      currentPolicy(p) &&
      p.sections.Requester.data.activities.includes("Hot Work") &&
      d.special.gasTesting === "not-required" &&
      (d.special.gasJustification ?? "").trim().length < 10
    )
      issues.push(
        "Record the justification for gas testing not being required.",
      );
    if (
      p.sections.Requester.data.activities.includes("Confined Space") &&
      [
        "spaceName",
        "attendant",
        "entrySupervisor",
        "rescueTeam",
        "gasEvidence",
      ].some((k) => !d.special[k]?.trim())
    )
      issues.push("Complete confined-space supervision and gas-test evidence.");
  }
  if (role === "Holder") {
    if (!d.teamNames.trim() || d.workerCount < 1 || !d.phone.trim())
      issues.push("Add the team names, worker count and contact number.");
    if (!d.toolbox || !d.competent || !d.understood)
      issues.push(
        "Confirm the toolbox briefing, competencies and permit conditions.",
      );
  }
  return issues;
}
export function allIssues(p: WeeklyPermit, now = new Date()) {
  const issues = partyRoles.flatMap((role) =>
    sectionIssues(p, role, now).map((message) => `${role}: ${message}`),
  );
  if (!currentPolicy(p))
    issues.unshift(
      "Update and save the permit details to apply the current activity requirements before signing.",
    );
  if (currentPolicy(p))
    issues.push(...activityAssessmentIssues(assessmentPlan(p)));
  const detailedHazards = currentPolicy(p)
    ? assessmentPlan(p).hazards
    : p.application?.hazards.slice(1);
  detailedHazards?.forEach((h, index) => {
    const number = index + (currentPolicy(p) ? 1 : 2);
    if (!hazardSchema.safeParse(h).success)
      issues.push(`Complete hazard ${number} in the detailed permit form.`);
    if (h.residualLikelihood * h.residualSeverity >= 17)
      issues.push(
        `Resolve the extreme residual risk for hazard ${number} before signing.`,
      );
  });
  return issues;
}
export function currentSignatures(p: WeeklyPermit) {
  return partyRoles.every(
    (r) =>
      p.signatures[r]?.revision === p.revision &&
      p.signatures[r]?.personId === p.members[r],
  );
}
export function gasCurrent(p: WeeklyPermit, now: Date) {
  if (
    !p.sections.Requester.data.activities.includes("Confined Space") &&
    !(
      p.sections.Requester.data.activities.includes("Hot Work") &&
      p.sections.Issuer.data.special.gasTesting === "required"
    )
  )
    return true;
  const latest = p.monitoring
    .filter((m) => m.kind === "GAS")
    .reverse()
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  return Boolean(
    latest &&
    latest.result === "PASS" &&
    new Date(latest.at) <= now &&
    now.getTime() - new Date(latest.at).getTime() <= 30 * 60000,
  );
}
type Command =
  | { type: "CREATE"; input: unknown }
  | {
      type: "UPDATE_APPLICATION";
      permitId: string;
      expectedRevision: number;
      application: Draft;
    }
  | { type: "JOIN"; token: string }
  | {
      type: "SAVE";
      permitId: string;
      role: PartyRole;
      expectedRevision: number;
      data: PartyData;
    }
  | {
      type: "SIGN";
      permitId: string;
      expectedRevision: number;
      confirmed: boolean;
    }
  | {
      type: "APPROVE";
      permitId: string;
      expectedRevision: number;
      confirmed: boolean;
      notes: string;
    }
  | { type: "DAILY"; permitId: string; confirmed: boolean; note: string }
  | { type: "SUSPEND"; permitId: string; reason: string }
  | { type: "RESUME"; permitId: string; reason: string; inspected: boolean }
  | { type: "RETURN"; permitId: string; reason: string }
  | {
      type: "MONITOR";
      permitId: string;
      kind: Monitoring["kind"];
      result: Monitoring["result"];
      notes: string;
    };
export type WeeklyCommand = Command;

/** Pure workflow, also used by the serialized local demo adapter and tests. */
export async function applyWeeklyCommand(
  source: WeeklyState,
  personId: string,
  command: Command,
  now = new Date(),
): Promise<{ state: WeeklyState; permit: WeeklyPermit }> {
  const state = structuredClone(source),
    actor = state.people.find((p) => p.id === personId);
  if (!actor) throw new Error("Sign in again to continue.");
  const at = now.toISOString();
  function audit(p: WeeklyPermit, action: string, reason: string) {
    state.audit.unshift({
      id: crypto.randomUUID(),
      permitId: p.id,
      actorId: actor!.id,
      name: actor!.name,
      role: actor!.role,
      action,
      at,
      reason,
    });
  }
  if (command.type === "CREATE") {
    if (!["Issuer", "Requester"].includes(actor.role))
      throw new Error("Only an Issuer or Requester can create a permit.");
    const input = createSchema.parse(command.input);
    if (input.application) {
      const full = applicationInput(input.application, now);
      if (
        full.title.trim() !== input.title ||
        full.location.trim() !== input.location ||
        full.startDay !== input.startDay ||
        full.endDay !== input.endDay
      )
        throw new Error(
          "The work details must match the detailed application.",
        );
      input.application = full.application;
    }
    const start = input.application
        ? `${input.application.start}:00+08:00`
        : `${input.startDay}T00:00:00+08:00`,
      end = input.application
        ? `${input.application.end}:00+08:00`
        : `${input.endDay}T23:59:59.999+08:00`;
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration >= 7 * 86400000 ||
      new Date(input.endDay).getTime() - new Date(input.startDay).getTime() >
        6 * 86400000 ||
      new Date(end) <= now
    )
      throw new Error(
        "Choose a current or future period of up to seven calendar days.",
      );
    const p: WeeklyPermit = {
      requirementsVersion: 1,
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      number: `PTW-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: input.title,
      location: input.location,
      start,
      end,
      createdAt: at,
      createdBy: actor.id,
      status: "COLLECTING",
      revision: 1,
      members: { [actor.role]: actor.id },
      sections: {
        Requester: {
          data: emptyParty(),
          revision: 0,
          savedAt: null,
          savedBy: null,
        },
        Issuer: {
          data: emptyParty(),
          revision: 0,
          savedAt: null,
          savedBy: null,
        },
        Holder: {
          data: emptyParty(),
          revision: 0,
          savedAt: null,
          savedBy: null,
        },
      },
      signatures: {},
      signatureHistory: [],
      signedVersions: [],
      approval: null,
      approvalHistory: [],
      attendance: [],
      attendanceAfter: null,
      monitoring: [],
      suspensionReason: null,
      ...(input.application
        ? { application: structuredClone(input.application) }
        : {}),
    };
    if (p.application) {
      const sections = applicationSections(p.application);
      for (const role of partyRoles) p.sections[role].data = sections[role];
    }
    state.permits.unshift(p);
    audit(p, "PERMIT_CREATED", "Shared permit opened for the three parties.");
    return { state, permit: p };
  }
  const p =
    command.type === "JOIN"
      ? state.permits.find((p) => p.token === command.token)
      : state.permits.find((p) => p.id === command.permitId);
  if (!p)
    throw new Error(
      "This permit is not stored in this browser. Shared phone access needs connected storage.",
    );
  const status = effectiveWeeklyStatus(p, now),
    member = partyRoles.some((r) => p.members[r] === actor.id),
    isHse = actor.role === "HSE";
  if (command.type === "JOIN") {
    if (isHse) return { state, permit: p };
    const role = actor.role as PartyRole;
    if (p.members[role] === actor.id) return { state, permit: p };
    if (status !== "COLLECTING")
      throw new Error(
        "Participants are locked after initial signing. Ask HSE to return the permit for changes.",
      );
    if (p.members[role]) throw new Error(`This permit already has a ${role}.`);
    if (member)
      throw new Error(
        "One person cannot fill multiple signing roles on the same permit.",
      );
    p.members[role] = actor.id;
    p.revision++;
    p.signatures = {};
    audit(
      p,
      "PARTICIPANT_JOINED",
      `${actor.name} joined as ${role}. Earlier signatures, if any, require renewal.`,
    );
    return { state, permit: p };
  }
  if (!member && !isHse)
    throw new Error("You have not joined this permit. Open its QR link first.");
  if (["EXPIRED", "CLOSED"].includes(status))
    throw new Error(
      "This permit is expired or closed. Work and signing are blocked.",
    );
  if (["SIGN", "APPROVE"].includes(command.type) && !currentPolicy(p))
    throw new Error(
      "Update and save the permit details to apply the current activity requirements before signing or HSE approval.",
    );
  if (command.type === "UPDATE_APPLICATION") {
    if (
      p.createdBy !== actor.id ||
      !["Requester", "Issuer"].includes(actor.role)
    )
      throw new Error(
        "Only the permit creator can edit the detailed work plan.",
      );
    if (!["COLLECTING", "HSE_REVIEW"].includes(status))
      throw new Error(
        "Ask HSE to return the permit before changing the detailed work plan.",
      );
    if (p.revision !== command.expectedRevision)
      throw new Error(
        "The permit changed in another tab. Reopen the detailed form before saving.",
      );
    const input = applicationInput(command.application, now);
    // Reuse creation validation without granting another signing role or changing the shared QR.
    const validated = (
      await applyWeeklyCommand(source, actor.id, { type: "CREATE", input }, now)
    ).permit;
    p.title = validated.title;
    p.location = validated.location;
    p.start = validated.start;
    p.end = validated.end;
    p.application = validated.application;
    p.requirementsVersion = 1;
    for (const role of partyRoles) {
      p.sections[role].data = validated.sections[role].data;
      p.sections[role].revision++;
      p.sections[role].savedAt = at;
      p.sections[role].savedBy = null;
    }
    p.revision++;
    p.status = "COLLECTING";
    p.signatures = {};
    p.approval = null;
    audit(
      p,
      "APPLICATION_UPDATED",
      "Detailed work plan updated. All parties must review and sign the new revision.",
    );
    return { state, permit: p };
  }
  if (command.type === "SAVE") {
    if (!["COLLECTING", "HSE_REVIEW"].includes(status))
      throw new Error(
        "Approved work cannot be edited. Ask HSE to return it for changes.",
      );
    if (actor.role !== command.role || p.members[command.role] !== actor.id)
      throw new Error("You can only edit your own assigned section.");
    const section = p.sections[command.role];
    if (section.revision !== command.expectedRevision)
      throw new Error(
        "Someone updated your section. Reload the latest values before saving.",
      );
    const data = partySchema.parse(command.data);
    const upgradingPolicy = !currentPolicy(p);
    p.requirementsVersion = 1;
    if (
      command.role === "Requester" &&
      data.hazards &&
      canonicalJson(data.hazards) !== canonicalJson(section.data.hazards)
    ) {
      const h = data.hazards[0];
      Object.assign(data, {
        hazard: h?.hazard ?? "",
        consequence: h?.consequence ?? "",
        riskControls: h?.controls ?? "",
        responsible: h?.responsible ?? "",
        likelihood: h?.likelihood ?? 3,
        severity: h?.severity ?? 3,
        residualLikelihood: h?.residualLikelihood ?? 2,
        residualSeverity: h?.residualSeverity ?? 2,
      });
    }
    if (command.role === "Requester") {
      const first = data.hazards?.[0] ?? {
        id: crypto.randomUUID(),
        affected: "Work team",
        activity: undefined,
      };
      data.hazards = activityHazards(
        [
          {
            ...first,
            activity:
              first.activity && data.activities.includes(first.activity)
                ? first.activity
                : data.activities[0],
            hazard: data.hazard,
            consequence: data.consequence,
            controls: data.riskControls,
            responsible: data.responsible,
            likelihood: data.likelihood,
            severity: data.severity,
            residualLikelihood: data.residualLikelihood,
            residualSeverity: data.residualSeverity,
          },
          ...(data.hazards?.slice(1) ?? []),
        ],
        data.activities,
      );
    }
    if (
      command.role === "Requester" &&
      data.activities.some((a) => !activities.includes(a))
    )
      throw new Error(
        "Choose supported work activities from the activity list.",
      );
    if (command.role === "Requester" && currentPolicy(p))
      data.company =
        data.contractors
          ?.map((c) => c.name.trim())
          .filter(Boolean)
          .join("; ") ||
        data.requesterDepartment ||
        data.company;
    if (command.role === "Issuer" && currentPolicy(p))
      data.ppe = [
        ...new Set([
          ...data.ppe,
          ...workRequirements(p.sections.Requester.data.activities).ppe,
        ]),
      ];
    for (const key of Object.keys(data) as (keyof PartyData)[])
      if (
        !roleFields[command.role].includes(key) &&
        canonicalJson(data[key]) !== canonicalJson(section.data[key])
      )
        throw new Error("Fields belonging to another role cannot be edited.");
    if (canonicalJson(section.data) === canonicalJson(data) && !upgradingPolicy)
      return { state, permit: p };
    section.data = data;
    syncApplication(p, command.role);
    if (command.role === "Requester" && p.application)
      data.hazards = structuredClone(p.application.hazards);
    section.revision++;
    section.savedAt = at;
    section.savedBy = actor.id;
    p.revision++;
    p.status = "COLLECTING";
    p.signatures = {};
    p.approval = null;
    audit(
      p,
      "SECTION_SAVED",
      `${command.role} section saved. Previous signatures remain in history and must be renewed for this revision.`,
    );
  }
  if (command.type === "SIGN") {
    if (
      status !== "COLLECTING" ||
      isHse ||
      p.members[actor.role as PartyRole] !== actor.id
    )
      throw new Error(
        "Only the assigned three parties can sign before HSE review.",
      );
    if (command.expectedRevision !== p.revision)
      throw new Error(
        "The permit changed. Review the latest information before signing.",
      );
    if (!command.confirmed)
      throw new Error(
        "Review the full permit and confirm the signing declaration.",
      );
    const issues = allIssues(p, now);
    if (issues.length) throw new Error(issues[0]);
    const role = actor.role as PartyRole;
    if (p.signatures[role]?.revision === p.revision)
      return { state, permit: p };
    const hash = await digest(contentOf(p));
    archiveSignedWork(p, hash, at);
    const signature: PartySignature = {
      id: crypto.randomUUID(),
      role,
      personId: actor.id,
      name: actor.name,
      signedAt: at,
      revision: p.revision,
      contentHash: hash,
    };
    p.signatures[role] = signature;
    p.signatureHistory.push(signature);
    audit(p, "PARTY_SIGNED", `${role} signed revision ${p.revision}.`);
    if (currentSignatures(p)) {
      p.status = "HSE_REVIEW";
      audit(
        p,
        "SENT_TO_HSE",
        "Requester, Issuer and Holder have signed the same revision.",
      );
    }
  }
  if (command.type === "APPROVE") {
    if (!isHse || status !== "HSE_REVIEW")
      throw new Error("Only HSE can activate a fully signed permit.");
    if (command.expectedRevision !== p.revision || !currentSignatures(p))
      throw new Error(
        "All three signatures must match the current permit revision.",
      );
    if (!command.confirmed)
      throw new Error(
        "Review the three sections, signatures and safety controls before signing.",
      );
    const issues = allIssues(p, now);
    if (issues.length) throw new Error(issues[0]);
    if (!gasCurrent(p, now))
      throw new Error(
        "A passing gas check from the last 30 minutes is required.",
      );
    const hash = await digest(contentOf(p));
    if (partyRoles.some((r) => p.signatures[r]!.contentHash !== hash))
      throw new Error("Signed content no longer matches the permit.");
    const approval: Approval = {
      id: crypto.randomUUID(),
      personId: actor.id,
      name: actor.name,
      signedAt: at,
      revision: p.revision,
      contentHash: hash,
      notes: command.notes.trim(),
    };
    archiveSignedWork(p, hash, at);
    p.approval = approval;
    p.approvalHistory.push(approval);
    p.status = "ACTIVE";
    audit(
      p,
      "HSE_APPROVED",
      "HSE signed the initial approval. Daily Holder sign-in is required; daily reapproval is not.",
    );
    const holder = p.signatures.Holder!;
    if (
      localDay(new Date(holder.signedAt)) === localDay(now) &&
      new Date(holder.signedAt) >= new Date(p.start) &&
      now >= new Date(p.start)
    ) {
      p.attendance.push({
        id: crypto.randomUUID(),
        day: localDay(now),
        personId: holder.personId,
        name: holder.name,
        signedAt: holder.signedAt,
        revision: p.revision,
        kind: "INITIAL",
        note: "Initial Holder signature covers this day; work was authorized only after HSE approval.",
      });
      audit(
        p,
        "FIRST_DAY_SIGN_IN_RECORDED",
        "The initial Holder signature covers today.",
      );
    }
  }
  if (command.type === "DAILY") {
    if (actor.role !== "Holder" || p.members.Holder !== actor.id)
      throw new Error(
        "Only this permit’s assigned Holder can sign for the day.",
      );
    if (
      status !== "ACTIVE" ||
      p.approval?.revision !== p.revision ||
      !currentSignatures(p)
    )
      throw new Error("This permit is not currently active and approved.");
    if (!command.confirmed)
      throw new Error(
        "Confirm that the approved conditions and controls are unchanged.",
      );
    if (!gasCurrent(p, now))
      throw new Error(
        "The gas check is stale or failed. HSE must record a current passing check before entry.",
      );
    if (hasTodaySignature(p, now)) return { state, permit: p };
    const attendance: Attendance = {
      id: crypto.randomUUID(),
      day: localDay(now),
      personId: actor.id,
      name: actor.name,
      signedAt: at,
      revision: p.revision,
      kind: "DAILY",
      note: command.note.trim(),
    };
    p.attendance.push(attendance);
    audit(
      p,
      "DAILY_HOLDER_SIGNED",
      `Holder signed for ${localDay(now)} (Asia/Kuala_Lumpur).`,
    );
  }
  if (command.type === "SUSPEND") {
    if (
      !["ACTIVE", "SCHEDULED"].includes(status) ||
      command.reason.trim().length < 5
    )
      throw new Error(
        "An active permit and a clear stop-work reason are required.",
      );
    p.status = "SUSPENDED";
    p.suspensionReason = command.reason.trim();
    audit(p, "WORK_SUSPENDED", p.suspensionReason);
  }
  if (command.type === "RESUME") {
    if (
      !isHse ||
      status !== "SUSPENDED" ||
      !command.inspected ||
      command.reason.trim().length < 10
    )
      throw new Error(
        "HSE must record corrective action and re-inspection before resuming.",
      );
    if (!p.approval || !currentSignatures(p) || !gasCurrent(p, now))
      throw new Error("Current approvals and safety checks are required.");
    p.status = "ACTIVE";
    p.suspensionReason = null;
    p.attendanceAfter = at;
    audit(
      p,
      "WORK_RESUMED",
      `${command.reason} Holder must sign again after re-inspection.`,
    );
  }
  if (command.type === "RETURN") {
    if (!isHse || command.reason.trim().length < 5)
      throw new Error("HSE must provide a reason for requesting changes.");
    p.requirementsVersion = 1;
    p.status = "COLLECTING";
    p.revision++;
    p.signatures = {};
    p.approval = null;
    p.suspensionReason = null;
    audit(p, "CHANGES_REQUESTED", command.reason.trim());
  }
  if (command.type === "MONITOR") {
    if (!isHse && !(actor.role === "Issuer" && p.members.Issuer === actor.id))
      throw new Error(
        "Only HSE or the assigned Issuer can record monitoring checks.",
      );
    if (command.notes.trim().length < 5)
      throw new Error("Record the inspection or test evidence.");
    p.monitoring.push({
      id: crypto.randomUUID(),
      personId: actor.id,
      name: actor.name,
      at,
      kind: command.kind,
      result: command.result,
      notes: command.notes.trim(),
    });
    audit(
      p,
      "MONITORING_RECORDED",
      `${command.kind}: ${command.result}. ${command.notes}`,
    );
    if (command.result === "FAIL" && ["ACTIVE", "SCHEDULED"].includes(status)) {
      p.status = "SUSPENDED";
      p.suspensionReason = command.notes.trim();
      audit(p, "WORK_SUSPENDED", "A failed monitoring check stopped the work.");
    }
  }
  return { state, permit: p };
}

export function canRead(p: WeeklyPermit, actor: Person) {
  return (
    actor.role === "HSE" || partyRoles.some((r) => p.members[r] === actor.id)
  );
}
