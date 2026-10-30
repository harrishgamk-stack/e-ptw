import { AuditEvent, Permit, riskLevel } from "@/lib/domain";
import { effectiveWeeklyStatus, WeeklyState } from "../weekly/model";
import { contractorNames } from "@/lib/work-policy";

/** Adapt shared permits for the original HSE dashboard without a second data store. */
export function hseData(state: WeeklyState, now: Date) {
  const permits = state.permits.map((p): Permit => {
    const status = effectiveWeeklyStatus(p, now);
    const risk = p.sections.Requester.data;
    const statuses: Record<string, Permit["status"]> = {
      COLLECTING: "DRAFT",
      HSE_REVIEW: "PENDING_APPROVAL",
      SCHEDULED: "ISSUED",
      ACTIVE: "ACTIVE",
      SUSPENDED: "SUSPENDED",
      EXPIRED: "EXPIRED",
      CLOSED: "CLOSED",
    };
    return {
      id: p.id,
      number: p.number,
      title: p.title,
      location: p.location,
      department: p.application?.department || "Site operations",
      contractor: p.application?.contractors
        ? contractorNames(p.application) || "Internal work"
        : p.sections.Requester.data.company,
      holder:
        state.people.find((person) => person.id === p.members.Holder)?.name ??
        "",
      type: p.sections.Requester.data.activities[0] ?? "General work",
      status: statuses[status],
      risk: riskLevel(
        Math.max(
          risk.likelihood * risk.severity,
          ...(p.application?.hazards.map((h) => h.likelihood * h.severity) ??
            []),
        ),
      ),
      start: p.start,
      end: p.end,
      workers: p.sections.Holder.data.workerCount,
      token: p.token,
      created_at: p.createdAt,
    };
  });
  const audit: AuditEvent[] = state.audit.map((a) => ({
    id: a.id,
    permitId: a.permitId,
    action: a.action
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase()),
    actor: `${a.name} · ${a.role}`,
    at: a.at,
    reason: a.reason,
  }));
  return { permits, audit, now };
}
