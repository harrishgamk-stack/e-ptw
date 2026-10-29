"use client";
import Link from "next/link";
import { ArrowUpRight, Download, ShieldCheck } from "lucide-react";
import { Dashboard, exportCsv } from "@/components/dashboard";
import { PermitTable } from "@/components/permit-table";
import { Empty, SectionTitle } from "@/components/ui";
import {
  dateLabel,
  effectiveWeeklyStatus,
  hasTodaySignature,
  timeLabel,
} from "../weekly/model";
import { useWeekly } from "../weekly/store";
import { WeeklyFrame } from "../weekly/frame";
import { WeeklyLogin } from "../weekly/login";
import { gasCurrent } from "../weekly/engine";
import { hseData } from "./data";

const titles: Record<string, [string, string]> = {
  approvals: [
    "Approval centre",
    "Review the three signatures and sign once to activate the permit.",
  ],
  "active-work": [
    "Active work",
    "Monitor work within its approved validity and daily Holder sign-in.",
  ],
  safety: [
    "Safety monitoring",
    "Check daily signatures, record inspections and stop unsafe work.",
  ],
  contractors: [
    "Contractors",
    "Companies recorded by Requesters on shared permits.",
  ],
  workers: [
    "Workers / Permit Users",
    "People participating in this browser’s local workflow.",
  ],
  risks: [
    "Risk assessments",
    "Review Issuer hazards, risk ratings and controls in each permit.",
  ],
  reports: ["Reports", "Export the shared permit register for your records."],
  audit: [
    "Audit logs",
    "A record of permit changes, signatures, approvals and monitoring.",
  ],
  "master-data": [
    "Master data",
    "Reference roles and work categories for the permit workflow.",
  ],
  settings: [
    "HSE administration settings",
    "Workspace details and the local demo’s operating limits.",
  ],
};

export function HseAccess({ children }: { children: React.ReactNode }) {
  const { actor, ready, enabled } = useWeekly();
  if (!enabled)
    return (
      <WeeklyFrame>
        <p>This local HSE workspace is unavailable in connected mode.</p>
      </WeeklyFrame>
    );
  if (!ready)
    return (
      <WeeklyFrame>
        <div className="weekly-loading">Opening HSE workspace…</div>
      </WeeklyFrame>
    );
  if (!actor)
    return (
      <WeeklyFrame>
        <WeeklyLogin />
      </WeeklyFrame>
    );
  if (actor.role !== "HSE")
    return (
      <WeeklyFrame>
        <div className="weekly-card weekly-empty">
          <ShieldCheck size={32} />
          <h1>HSE admin workspace</h1>
          <p>
            Your {actor.role} workspace contains your permits and daily signing.
          </p>
          <Link href="/" className="weekly-button primary">
            Go to My permit
          </Link>
        </div>
      </WeeklyFrame>
    );
  return children;
}

export function HseWorkspace({
  section = "dashboard",
  workType,
}: {
  section?: string;
  workType?: string;
}) {
  const { state, now } = useWeekly();
  const source = hseData(state, now);
  const rows =
    section === "approvals"
      ? source.permits.filter((p) => p.status === "PENDING_APPROVAL")
      : section === "active-work"
        ? source.permits.filter(
            (p) => p.status === "ACTIVE" && (!workType || p.type === workType),
          )
        : source.permits;
  const [title, description] = titles[section] ?? ["HSE dashboard", ""];
  return (
    <HseAccess>
      {section === "dashboard" || section === "permits" ? (
        <Dashboard source={source} listOnly={section === "permits"} />
      ) : (
        <>
          <div className="page-heading">
            <div className="eyebrow">HSE ADMINISTRATION</div>
            <div className="heading-row">
              <div>
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
              {section === "reports" && (
                <button
                  className="button primary"
                  onClick={() => exportCsv(source.permits)}
                >
                  <Download size={16} />
                  Export permit register
                </button>
              )}
            </div>
          </div>
          {["approvals", "active-work", "risks", "reports"].includes(
            section,
          ) && (
            <section className="panel">
              <SectionTitle
                title={
                  section === "approvals"
                    ? "Ready for HSE signature"
                    : "Shared permits"
                }
              >
                <span className="count-pill">{rows.length} permits</span>
              </SectionTitle>
              <PermitTable
                permits={rows}
                demo={false}
                detailBase="/work"
                now={now}
              />
            </section>
          )}
          {section === "safety" && (
            <section className="panel">
              <SectionTitle
                title="Daily safety checks"
                sub="Open a permit to record an inspection, gas reading, suspension or corrective action."
              />
              {state.permits
                .filter((p) =>
                  ["ACTIVE", "SUSPENDED", "SCHEDULED"].includes(
                    effectiveWeeklyStatus(p, now),
                  ),
                )
                .map((p) => {
                  const status = effectiveWeeklyStatus(p, now);
                  return (
                    <Link
                      href={`/work/${p.id}`}
                      key={p.id}
                      className="hse-monitor-row"
                    >
                      <div>
                        <strong>
                          {p.number} · {p.title}
                        </strong>
                        <p>
                          {p.location} · {dateLabel(p.start)} –{" "}
                          {dateLabel(p.end)}
                        </p>
                      </div>
                      <div>
                        <strong>
                          {status === "SUSPENDED"
                            ? "Work suspended"
                            : status === "SCHEDULED"
                              ? "Starts soon"
                              : hasTodaySignature(p, now)
                                ? "Holder signed today"
                                : "Holder signature required today"}
                        </strong>
                        <p>
                          {p.suspensionReason ??
                            (!gasCurrent(p, now)
                              ? "Gas test needs attention"
                              : "Open permit to review controls")}
                        </p>
                      </div>
                      <ArrowUpRight size={18} />
                    </Link>
                  );
                })}
              {!state.permits.some((p) =>
                ["ACTIVE", "SUSPENDED", "SCHEDULED"].includes(
                  effectiveWeeklyStatus(p, now),
                ),
              ) && (
                <Empty
                  title="No work to monitor yet"
                  description="Approved permits appear here during their validity."
                />
              )}
            </section>
          )}
          {section === "audit" && (
            <section className="panel">
              <SectionTitle title="Permit activity" />
              {state.audit.map((a) => (
                <Link
                  className="hse-monitor-row"
                  key={a.id}
                  href={`/work/${a.permitId}`}
                >
                  <div>
                    <strong>{a.action}</strong>
                    <p>
                      {a.name} · {a.role} · {a.reason}
                    </p>
                  </div>
                  <span>
                    {dateLabel(a.at)} · {timeLabel(a.at)}
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {!state.audit.length && (
                <Empty
                  title="No activity yet"
                  description="Actions on shared permits appear here."
                />
              )}
            </section>
          )}
          {section === "workers" && (
            <section className="panel">
              <SectionTitle title="Registered demo participants" />
              <div className="table-scroll">
                <table className="permit-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Masked IC</th>
                      <th>Assigned permits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.people.map((person) => (
                      <tr key={person.id}>
                        <td>{person.name}</td>
                        <td>{person.role}</td>
                        <td>•••• {person.icLast4}</td>
                        <td>
                          {person.role === "HSE"
                            ? "All · administration"
                            : state.permits.filter((p) =>
                                Object.values(p.members).includes(person.id),
                              ).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {section === "contractors" && (
            <section className="panel">
              <SectionTitle title="Companies on shared permits" />
              {Array.from(
                new Set(
                  source.permits.map((p) => p.contractor).filter(Boolean),
                ),
              ).map((company) => (
                <div key={company} className="hse-monitor-row">
                  <strong>{company}</strong>
                  <span>
                    {
                      source.permits.filter((p) => p.contractor === company)
                        .length
                    }{" "}
                    permits
                  </span>
                </div>
              ))}
              {!source.permits.some((p) => p.contractor) && (
                <Empty
                  title="No companies recorded yet"
                  description="Requester company details appear here after their section is saved."
                />
              )}
            </section>
          )}
          {section === "master-data" && (
            <section className="panel hse-reference">
              <SectionTitle title="Workflow reference" />
              <dl>
                <dt>Requester</dt>
                <dd>
                  Creates the permit, describes the work and signs the shared
                  revision.
                </dd>
                <dt>Issuer</dt>
                <dd>
                  Creates the permit, records risk controls and signs the shared
                  revision.
                </dd>
                <dt>Holder</dt>
                <dd>
                  Confirms the team, signs initially and signs for every work
                  day.
                </dd>
                <dt>HSE administrator</dt>
                <dd>
                  Reviews all three signatures, approves initially and monitors
                  work daily.
                </dd>
                <dt>Work categories</dt>
                <dd>
                  Hot Work · Confined Space · Working at height · Electrical
                  work · Mechanical work
                </dd>
              </dl>
            </section>
          )}
          {section === "settings" && (
            <section className="panel hse-reference">
              <SectionTitle title="Workspace configuration" />
              <dl>
                <dt>Access</dt>
                <dd>
                  HSE has the admin dashboard. Issuer, Requester and Holder use
                  My permit.
                </dd>
                <dt>Storage</dt>
                <dd>
                  Local browser storage. Tabs in the same browser sync; separate
                  phones do not.
                </dd>
                <dt>Identity</dt>
                <dd>
                  Name and sample IC identify a demo participant. They are not
                  production authentication. Only an IC hash and last four
                  digits are stored.
                </dd>
                <dt>Approval</dt>
                <dd>
                  One initial HSE approval. Holder signs daily within the
                  permit’s validity; HSE monitors each day.
                </dd>
                <dt>Time zone</dt>
                <dd>
                  Asia/Kuala_Lumpur · Maximum permit validity: seven calendar
                  days.
                </dd>
              </dl>
            </section>
          )}
        </>
      )}
    </HseAccess>
  );
}
