"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Building2,
  Clock3,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useStore } from "./store";
import { Badge, Empty, Field, Risk, SectionTitle, TypeIcon } from "./ui";
import { permitStatus, time } from "./permit-table";
import { contractors as sampleContractors } from "@/lib/demo";
import { exportCsv } from "./dashboard";
import { activities, ppeOptions, safetyControls } from "@/lib/domain";
export function Workspace({ section }: { section: string }) {
  const { permits, audit, demo } = useStore();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All work"),
    [directory, setDirectory] = useState(demo ? sampleContractors : []),
    [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [contact, setContact] = useState(""),
    [expiry, setExpiry] = useState("");
  useEffect(() => {
    if (demo) {
      const saved = localStorage.getItem("pcg-contractors");
      if (saved)
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-persisted demo profiles after SSR.
          setDirectory(JSON.parse(saved));
        } catch {
          /* Ignore old local data. */
        }
    }
  }, [demo]);
  const active = permits.filter((p) =>
      ["ACTIVE", "SUSPENDED"].includes(permitStatus(p, demo)),
    ),
    pending = permits.filter((p) =>
      ["PENDING_APPROVAL", "SUBMITTED", "UNDER_REVIEW"].includes(p.status),
    );
  const titles: Record<string, [string, string]> = {
    "active-work": [
      "Active work board",
      "A live operational view of approved work across your facilities.",
    ],
    approvals: [
      "Approval centre",
      "Review work scopes and critical controls before making a decision.",
    ],
    safety: [
      "Safety monitoring",
      "Focus on suspended permits, high-risk work and upcoming expiry.",
    ],
    contractors: [
      "Contractor directory",
      "Keep approved companies and their safety credentials in view.",
    ],
    workers: [
      "Workers & permit users",
      "People assigned to work across your permit register.",
    ],
    risks: [
      "Risk assessments",
      "Understand hazards, residual risks and the controls that protect your people.",
    ],
    reports: [
      "Permit reports",
      "Operational reporting from the current permit register.",
    ],
    audit: [
      "Audit explorer",
      "A traceable record of permit decisions and safety actions.",
    ],
    "master-data": [
      "Master data",
      "Reference data and safety classifications for the initial PCG workspace.",
    ],
    settings: [
      "Workspace settings",
      "Configuration and deployment readiness for PCG ePTW.",
    ],
  };
  const [title, sub] = titles[section] ?? ["Workspace", ""];
  function searchBar(placeholder: string) {
    return (
      <div className="table-search" style={{ marginBottom: 22, maxWidth: 450 }}>
        <Search size={16} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    );
  }
  function cards() {
    const data = (section === "approvals" ? pending : active).filter(
      (p) =>
        (filter === "All work" ||
          (filter === "Suspended"
            ? permitStatus(p, demo) === "SUSPENDED"
            : p.type === filter)) &&
        `${p.title} ${p.number} ${p.location} ${p.contractor}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return (
      <>
        {searchBar("Search work, permit or location...")}
        {section !== "approvals" && (
          <div className="tabs" style={{ marginBottom: 22, paddingLeft: 0 }}>
            {[
              "All work",
              "Hot Work",
              "Confined Space",
              "Electrical work",
              "Suspended",
            ].map((t) => (
              <button
                key={t}
                className={filter === t ? "active" : ""}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="card-board">
          {data.map((p) => (
            <section className="panel work-card" key={p.id}>
              <div className="work-card-top">
                <TypeIcon type={p.type} />
                <Badge status={permitStatus(p, demo)} />
              </div>
              <h3>{p.title}</h3>
              <div className="permit-number">{p.number}</div>
              <p>
                <MapPin size={13} />
                {p.location}
              </p>
              <p>
                <Building2 size={13} />
                {p.contractor}
              </p>
              <p>
                <Users size={13} />
                {p.holder} · {p.workers} workers
              </p>
              <p>
                <Clock3 size={13} />
                {time(p.start)} — {time(p.end)} MYT
              </p>
              <div className="work-card-footer">
                <Risk risk={p.risk} />
                <Link
                  className="text-link"
                  href={`/${section === "approvals" ? "approvals" : "permits"}/${p.id}`}
                >
                  {section === "approvals" ? "Review permit" : "Open permit"}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </section>
          ))}
        </div>
        {!data.length && (
          <Empty
            title={
              section === "approvals"
                ? "No approvals waiting"
                : "No matching work"
            }
            description="Use another filter or check the permit register."
          />
        )}
      </>
    );
  }
  return (
    <>
      <div className="page-intro heading-row">
        <div>
          <div className="eyebrow">PCG OPERATIONS</div>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        {section === "reports" ? (
          <button
            className="button secondary"
            onClick={() => exportCsv(permits, demo)}
          >
            <ArrowDownToLine size={15} />
            Export CSV
          </button>
        ) : section === "contractors" && demo ? (
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add contractor
          </button>
        ) : (
          <Link className="button secondary" href="/permits/new">
            <Plus size={15} />
            Create permit
          </Link>
        )}
      </div>
      {["active-work", "approvals"].includes(section) && cards()}
      {section === "safety" && (
        <>
          <div className="mini-stats">
            {[
              [
                "Active high-risk work",
                active.filter((p) => p.risk === "High" || p.risk === "Extreme")
                  .length,
              ],
              [
                "Suspended permits",
                active.filter((p) => permitStatus(p, demo) === "SUSPENDED")
                  .length,
              ],
              [
                "Expired permits",
                permits.filter((p) => permitStatus(p, demo) === "EXPIRED")
                  .length,
              ],
            ].map(([label, n]) => (
              <div className="panel mini-stat" key={label}>
                <span>{label}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="inline-notice">
            <ShieldCheck size={18} />
            Operational status never replaces a site inspection. Re-check
            controls when conditions or work scopes change.
          </div>
          {cards()}
        </>
      )}
      {section === "contractors" && (
        <>
          {searchBar("Search contractors...")}
          <div className="directory-grid">
            {directory
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => (
                <section key={c.name} className="panel directory-card">
                  <div className="title-row">
                    <span className="type-icon">
                      <Building2 size={18} />
                    </span>
                    <Badge
                      status={
                        new Date(c.expiry) < new Date() ? "EXPIRED" : c.status
                      }
                    />
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.trade}</p>
                  <div className="review-section">
                    <p>Contact · {c.contact}</p>
                    <p>Registered workers · {c.workers}</p>
                    <p>Credential expiry · {c.expiry}</p>
                  </div>
                  <p style={{ fontSize: 10, marginTop: 12 }}>
                    {c.status === "APPROVED"
                      ? "Verify certificates again before permit issuance."
                      : "Additional verification required before work can be issued."}
                  </p>
                </section>
              ))}
          </div>
          {!directory.length && (
            <Empty
              title="No contractor profiles loaded"
              description="In this initial connected release, enter contractor information in the permit wizard. Directory management is available in local demo mode."
            />
          )}
        </>
      )}
      {section === "workers" && (
        <>
          {searchBar("Search people or company...")}
          <div className="directory-grid">
            {permits
              .flatMap(
                (p) =>
                  p.draft?.workers.map((w) => ({
                    name: w.name,
                    company: w.company,
                    trade: w.trade,
                    expiry: w.expiry,
                    permit: p,
                  })) ??
                  (demo
                    ? [
                        {
                          name: p.holder,
                          company: p.contractor,
                          trade: "Permit holder (sample)",
                          expiry: "",
                          permit: p,
                        },
                      ]
                    : []),
              )
              .filter((w) =>
                `${w.name} ${w.company}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((w, i) => (
                <Link
                  href={`/permits/${w.permit.id}`}
                  className="panel directory-card"
                  key={`${w.permit.id}-${i}`}
                >
                  <div className="title-row">
                    <h3>{w.name}</h3>
                    <Users size={17} />
                  </div>
                  <p>{w.company}</p>
                  <p>{w.trade}</p>
                  <p>
                    Certificate expiry · {w.expiry || "Not recorded in sample"}
                  </p>
                  <p>{w.permit.number}</p>
                </Link>
              ))}
          </div>
          {!permits.length && (
            <Empty
              title="No permit users yet"
              description="Workers added through the permit wizard appear here."
            />
          )}
        </>
      )}
      {section === "risks" && (
        <>
          <div className="inline-notice">
            <TriangleAlert size={17} />
            Initial matrix: 1–4 Low · 5–9 Medium · 10–16 High · 17–25 Extreme.
            PCG HSE must approve the matrix for production.
          </div>
          <div className="directory-grid">
            {permits
              .filter((p) => p.draft?.hazards.length)
              .map((p) => (
                <Link
                  className="panel directory-card"
                  key={p.id}
                  href={`/permits/${p.id}`}
                >
                  <div className="title-row">
                    <h3>{p.number}</h3>
                    <Risk risk={p.risk} />
                  </div>
                  <p>{p.title}</p>
                  {p.draft?.hazards.map((h) => (
                    <div className="review-section" key={h.id}>
                      <h3>{h.hazard}</h3>
                      <p>{h.controls}</p>
                      <p>
                        Residual: {h.residualLikelihood * h.residualSeverity} ·
                        Responsible: {h.responsible}
                      </p>
                    </div>
                  ))}
                </Link>
              ))}
          </div>
          {!permits.some((p) => p.draft?.hazards.length) && (
            <Empty
              title="No detailed assessments recorded yet"
              description="Add hazards and controls in step 4 of a new permit. Assessments will appear here."
            />
          )}
        </>
      )}
      {section === "reports" && (
        <>
          <div className="mini-stats">
            {[
              ["Total permits", permits.length],
              [
                "Closed permits",
                permits.filter((p) => p.status === "CLOSED").length,
              ],
              [
                "Suspension events",
                audit.filter(
                  (a) =>
                    a.action.includes("SUSPENDED") ||
                    a.action.toLowerCase().includes("suspended"),
                ).length,
              ],
            ].map(([l, n]) => (
              <div className="panel mini-stat" key={l}>
                <span>{l}</span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
          <div className="directory-grid">
            {[
              ["Permits by department", "department"],
              ["Permits by contractor", "contractor"],
              ["Permit type frequency", "type"],
              ["Permits by status", "status"],
            ].map(([heading, key]) => (
              <section className="panel" key={key}>
                <SectionTitle title={heading} />
                <div className="report-bars">
                  {[
                    ...new Set(
                      permits.map((p) => String(p[key as keyof typeof p])),
                    ),
                  ].map((v) => {
                    const n = permits.filter(
                      (p) => p[key as keyof typeof p] === v,
                    ).length;
                    return (
                      <div key={v} className="report-bar">
                        <div>
                          <span>{v || "Unassigned"}</span>
                          <b>{n}</b>
                        </div>
                        <div className="bar-track">
                          <i
                            style={{
                              width: `${(n / Math.max(1, permits.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      {section === "audit" && (
        <>
          {searchBar("Search audit actions or remarks...")}
          <section className="panel audit-list">
            {audit
              .filter((a) =>
                `${a.action} ${a.reason} ${a.actor}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((a) => (
                <div className="audit-item" key={a.id}>
                  <span className="type-icon">
                    <ShieldCheck size={17} />
                  </span>
                  <div>
                    <Link href={`/permits/${a.permitId}`}>
                      <strong>{a.action}</strong>
                    </Link>
                    <p>{a.reason}</p>
                    <p>
                      {a.actor} · Event {a.id}
                    </p>
                  </div>
                  <time>
                    {new Date(a.at).toLocaleString("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                    })}
                  </time>
                </div>
              ))}
            {!audit.length && (
              <Empty
                title="No audit events yet"
                description="Create or update a permit to record the first event."
              />
            )}
          </section>
        </>
      )}
      {section === "master-data" && (
        <>
          <div className="inline-notice">
            <ShieldCheck size={17} />R / I / H classifications intentionally
            have no assumed meaning. HSE must define them. The database supports
            configurable master data; this initial interface shows the supplied
            defaults.
          </div>
          <div className="directory-grid">
            {[
              ["Work activities", activities],
              ["PPE types", ppeOptions],
              ["General safety checklist", safetyControls],
              [
                "R / I / H classifications",
                [
                  "R — undefined, awaiting HSE definition",
                  "I — undefined, awaiting HSE definition",
                  "H — undefined, awaiting HSE definition",
                ],
              ],
            ].map(([name, items]) => (
              <section className="panel" key={name as string}>
                <SectionTitle title={name as string} />
                <div className="panel-body" style={{ paddingTop: 0 }}>
                  {(items as string[]).map((i) => (
                    <p
                      key={i}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid #eef1f5",
                        fontSize: 12,
                        color: "#7f8fa3",
                      }}
                    >
                      {i}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      {section === "settings" && (
        <div className="settings-list">
          <section className="panel">
            <SectionTitle title="Workspace & connection" />
            <div className="panel-body" style={{ paddingTop: 0 }}>
              <dl className="info-grid">
                {[
                  ["Organization", "Premier Centre Group"],
                  ["Product", "PCG ePTW"],
                  [
                    "Environment",
                    demo ? "Local pilot demonstration" : "Supabase connected",
                  ],
                  ["Timezone", "Asia/Kuala_Lumpur"],
                  [
                    "Document storage",
                    demo ? "Metadata only in demo" : "Private Supabase bucket",
                  ],
                  [
                    "Authorization",
                    demo
                      ? "Simulated HSE account"
                      : "Database role / permission policies",
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
          <section className="panel">
            <SectionTitle title="Production readiness" />
            <div className="panel-body" style={{ paddingTop: 0 }}>
              <div className="inline-notice">
                <ShieldCheck size={18} />
                This is an initial implementation for review. HSE policy
                approval, live Supabase testing and the remaining workflow
                modules are required before using it to authorize work.
              </div>
              <p style={{ fontSize: 12, color: "#7c8ca0" }}>
                The implementation and deployment guide in the repository
                identifies completed modules, safety gates and outstanding
                production work. Ordinary configuration values are seeded in
                PostgreSQL system_settings.
              </p>
            </div>
          </section>
          {demo && (
            <section className="panel">
              <SectionTitle title="Local demo data" />
              <div className="panel-body" style={{ paddingTop: 0 }}>
                <p style={{ fontSize: 12, color: "#7c8ca0", marginBottom: 17 }}>
                  Local drafts and actions persist in this browser. Resetting
                  restores the original sample permits.
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      window.confirm("Reset demo permits and local drafts?")
                    ) {
                      ["pcg-pilot-v1", "pcg-wizard", "pcg-contractors"].forEach(
                        (k) => localStorage.removeItem(k),
                      );
                      window.location.reload();
                    }
                  }}
                >
                  Reset local demo
                </button>
              </div>
            </section>
          )}
        </div>
      )}
      {adding && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              const next = [
                ...directory,
                {
                  name,
                  contact,
                  trade: "Contractor profile",
                  workers: 0,
                  status: "CONDITIONAL",
                  expiry,
                },
              ];
              setDirectory(next);
              localStorage.setItem("pcg-contractors", JSON.stringify(next));
              setAdding(false);
              setName("");
              setContact("");
              setExpiry("");
            }}
          >
            <div className="modal-head">
              <h2>Add contractor</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAdding(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              New local profiles begin with conditional status and require
              verification.
            </p>
            <Field label="Company name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Contact person">
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </Field>
            <Field label="Credential expiry">
              <input
                required
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <button className="button primary">Save local profile</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
