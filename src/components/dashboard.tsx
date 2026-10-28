"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  TriangleAlert,
  CirclePause,
  Radio,
  MapPin,
} from "lucide-react";
import { useStore } from "./store";
import { PermitTable, permitStatus, time } from "./permit-table";
import { SectionTitle, TypeIcon, Empty } from "./ui";
import { Permit } from "@/lib/domain";
import { csvCell } from "@/lib/csv";
export function exportCsv(permits: Permit[], demo = false) {
  const columns = [
    "Permit",
    "Work",
    "Type",
    "Location",
    "Contractor",
    "Holder",
    "Start",
    "End",
    "Risk",
    "Status",
  ];
  const data = [
    columns,
    ...permits.map((p) => [
      p.number,
      p.title,
      p.type,
      p.location,
      p.contractor,
      p.holder,
      p.start,
      p.end,
      p.risk,
      permitStatus(p, demo),
    ]),
  ];
  const csv = data.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "pcg-permits.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function Dashboard({ listOnly = false }: { listOnly?: boolean }) {
  const { permits, audit, demo } = useStore();
  const [tab, setTab] = useState("All permits"),
    [query, setQuery] = useState(""),
    [type, setType] = useState("All types"),
    [department, setDepartment] = useState("All departments"),
    [page, setPage] = useState(1),
    [filters, setFilters] = useState(false);
  const active = permits.filter((p) => permitStatus(p, demo) === "ACTIVE"),
    pending = permits.filter((p) =>
      ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED"].includes(p.status),
    ),
    suspended = permits.filter((p) => permitStatus(p, demo) === "SUSPENDED");
  const now = demo ? new Date("2026-10-28T11:50:00+08:00") : new Date();
  const expiring = active.filter(
    (p) => new Date(p.end).getTime() - now.getTime() < 4 * 3600000,
  );
  const filtered = useMemo(
    () =>
      permits.filter(
        (p) =>
          (tab === "All permits" ||
            (tab === "Active" && permitStatus(p, demo) === "ACTIVE") ||
            (tab === "Pending approval" &&
              ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED"].includes(
                p.status,
              )) ||
            (tab === "Drafts" && p.status === "DRAFT") ||
            (tab === "Suspended" && permitStatus(p, demo) === "SUSPENDED")) &&
          (type === "All types" || p.type === type) &&
          (department === "All departments" || p.department === department) &&
          `${p.number} ${p.title} ${p.location} ${p.contractor} ${p.holder} ${p.department} ${p.draft?.workers.map((w) => w.name).join(" ") ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [permits, tab, type, department, query, demo],
  );
  const stats = [
    {
      label: "Active permits",
      value: active.length,
      icon: FileCheck2,
      color: "green",
      note: "Work in progress",
      tag: "Live",
      filter: "Active",
    },
    {
      label: "Pending approvals",
      value: pending.length,
      icon: Clock3,
      color: "blue",
      note: "Awaiting review",
      tag: "Action needed",
      filter: "Pending approval",
    },
    {
      label: "Expiring soon",
      value: expiring.length,
      icon: Timer,
      color: "amber",
      note: "Within the next 4 hours",
      tag: "Monitor",
      filter: "Active",
    },
    {
      label: "Suspended",
      value: suspended.length,
      icon: CirclePause,
      color: "red",
      note: "Work must remain stopped",
      tag: "Attention",
      filter: "Suspended",
    },
    {
      label: "High-risk work",
      value: active.filter((p) => p.risk === "High" || p.risk === "Extreme")
        .length,
      icon: TriangleAlert,
      color: "purple",
      note: "Active high-risk permits",
      tag: "Controlled",
      filter: "Active",
    },
    {
      label: "Closed this month",
      value: permits.filter((p) => p.status === "CLOSED").length,
      icon: ShieldCheck,
      color: "slate",
      note: "Completed & handed back",
      tag: "Complete",
      filter: "All permits",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <span className="live-dot" /> OPERATIONS OVERVIEW
        </div>
        <div className="heading-row">
          <div>
            <h1>{listOnly ? "Permit register" : "Permit to Work Dashboard"}</h1>
            <p>
              {listOnly
                ? "Manage every permit, from initial request to safe handover."
                : "A clear view of your permits, people, and safety. All in one place."}
            </p>
          </div>
          <div className="heading-actions">
            <button
              className="button secondary"
              onClick={() => exportCsv(filtered, demo)}
            >
              <ArrowDownToLine size={16} />
              Export
            </button>
            <Link href="/permits/new" className="button primary">
              <Plus size={17} />
              Create permit
            </Link>
          </div>
        </div>
        <div className="date-line">
          <CalendarDays size={14} />
          {now.toLocaleDateString("en-MY", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kuala_Lumpur",
          })}
          <span>•</span>
          <span>All facilities</span>
          {demo && <span className="snapshot">11:50 MYT sample snapshot</span>}
        </div>
      </div>
      {!listOnly && (
        <>
          <div className="metrics">
            {stats.map((s) => (
              <button
                key={s.label}
                className={`metric metric-${s.color}`}
                onClick={() => {
                  setTab(s.filter);
                  setPage(1);
                  document
                    .getElementById("permit-register")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <div className="metric-top">
                  <span>{s.label}</span>
                  <span className="metric-icon">
                    <s.icon size={18} />
                  </span>
                </div>
                <div className="metric-value">
                  {String(s.value).padStart(2, "0")}
                  <span className="metric-mini-chart">▁▂▂▃▂▄▃▅</span>
                </div>
                <div className="metric-bottom">
                  <span>{s.note}</span>
                </div>
              </button>
            ))}
          </div>
          {suspended.length > 0 && (
            <div className="safety-alert">
              <div className="alert-symbol">
                <TriangleAlert size={19} />
              </div>
              <div>
                <strong>Safety attention required</strong>
                <p>
                  {suspended.length} permit is suspended. Confirm corrective
                  actions and re-inspection before work resumes.
                </p>
              </div>
              <Link href={`/permits/${suspended[0].id}`}>
                Review permit <ArrowRight size={15} />
              </Link>
            </div>
          )}
          <div className="overview-grid">
            <section className="panel activity-overview">
              <SectionTitle
                title="Work across your site"
                sub="Active work by permit category"
              >
                <Link href="/active-work" className="text-link">
                  View live board <ArrowUpRight size={14} />
                </Link>
              </SectionTitle>
              <div className="work-types">
                {[
                  "Hot Work",
                  "Confined Space",
                  "Working at height",
                  "Electrical work",
                  "Mechanical work",
                ].map((t) => (
                  <Link
                    href={`/active-work?type=${encodeURIComponent(t)}`}
                    className="work-type"
                    key={t}
                  >
                    <TypeIcon type={t} />
                    <strong>
                      {String(
                        active.filter((p) => p.type === t).length,
                      ).padStart(2, "0")}
                    </strong>
                    <span>
                      {t === "Electrical work" ? "Electrical / LOTO" : t}
                    </span>
                    <div className="work-type-track">
                      <i
                        style={{
                          width: `${Math.max(5, (active.filter((p) => p.type === t).length / Math.max(active.length, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
              <div className="overview-foot">
                <span>
                  <i className="live-dot" />
                  {active.length} active permits across{" "}
                  {new Set(active.map((p) => p.location)).size} locations
                </span>
                <span>
                  Updated {demo ? "11:50 MYT" : "just now"} <Radio size={12} />
                </span>
              </div>
            </section>
            <section className="panel approval-preview">
              <SectionTitle title="Your approval queue">
                <span className="count-pill">{pending.length} pending</span>
              </SectionTitle>
              {pending.slice(0, 2).map((p) => (
                <Link
                  href={`/approvals/${p.id}`}
                  key={p.id}
                  className="approval-preview-row"
                >
                  <TypeIcon type={p.type} />
                  <div>
                    <strong>{p.title}</strong>
                    <span>
                      {p.number} <i>•</i> {p.location}
                    </span>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ))}
              {!pending.length && (
                <p className="muted">Your approval queue is clear.</p>
              )}
              <Link className="approval-footer" href="/approvals">
                Open approval centre <ArrowRight size={14} />
              </Link>
            </section>
          </div>
        </>
      )}
      <section className="panel register" id="permit-register">
        <div className="register-header">
          <div>
            <h2>
              {listOnly ? "All permits" : "Permit overview"}
              <span className="count-pill">{permits.length} permits</span>
            </h2>
            <p>Track, review and manage your site’s work permits.</p>
          </div>
          <button
            className="button secondary compact"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={14} />
            Customize view
          </button>
        </div>
        <div className="tabs">
          {[
            "All permits",
            "Active",
            "Pending approval",
            "Suspended",
            "Drafts",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
            >
              {t}
              {t === "Active" && <span>{active.length}</span>}
              {t === "Pending approval" && <span>{pending.length}</span>}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              aria-label="Search permit register"
              placeholder="Search permits, locations, contractors..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="toolbar-filters">
            <select
              aria-label="Permit type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option>All types</option>
              {[...new Set(permits.map((p) => p.type))].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Department filter"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option>All departments</option>
              {[...new Set(permits.map((p) => p.department))]
                .filter(Boolean)
                .map((d) => (
                  <option key={d}>{d}</option>
                ))}
            </select>
            {filters && (
              <button
                className="button secondary compact"
                onClick={() => {
                  setType("All types");
                  setDepartment("All departments");
                  setQuery("");
                  setTab("All permits");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
        <PermitTable
          permits={filtered.slice((page - 1) * 6, page * 6)}
          demo={demo}
        />
        <div className="table-footer">
          <span>
            Showing {filtered.length ? (page - 1) * 6 + 1 : 0}–
            {Math.min(page * 6, filtered.length)} of {filtered.length} permits
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from(
              { length: Math.max(1, Math.ceil(filtered.length / 6)) },
              (_, i) => (
                <button
                  className={page === i + 1 ? "current" : ""}
                  key={i}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ),
            )}
            <button
              aria-label="Next page"
              disabled={page * 6 >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
      {!listOnly && (
        <div className="bottom-grid">
          <section className="panel">
            <SectionTitle
              title="Recent safety activity"
              sub="The latest actions across your workspace"
            >
              <Link className="text-link" href="/audit">
                View audit log <ArrowUpRight size={14} />
              </Link>
            </SectionTitle>
            <div className="activity-list">
              {audit.slice(0, 3).map((a, i) => (
                <Link
                  href={`/permits/${a.permitId}`}
                  className="activity-row"
                  key={a.id}
                >
                  <span
                    className={`activity-symbol ${i === 0 ? "warning" : ""}`}
                  >
                    {i === 0 ? <CircleAlert size={16} /> : <Check size={16} />}
                  </span>
                  <div>
                    <strong>{a.action}</strong>
                    <span>{a.actor}</span>
                  </div>
                  <time>{time(a.at)}</time>
                </Link>
              ))}
              {!audit.length && (
                <Empty
                  title="No activity yet"
                  description="Permit actions will appear here."
                />
              )}
            </div>
          </section>
          <section className="panel expiry-panel">
            <SectionTitle
              title="Upcoming expiry"
              sub="Keep work within its approved validity"
            >
              <Clock3 size={18} />
            </SectionTitle>
            {active
              .sort((a, b) => a.end.localeCompare(b.end))
              .slice(0, 3)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/permits/${p.id}`}
                  className="expiry-row"
                >
                  <div>
                    <strong>{p.number}</strong>
                    <span>
                      <MapPin size={11} />
                      {p.location}
                    </span>
                  </div>
                  <span className="expiry-time">
                    {time(p.end)} <ArrowUpRight size={12} />
                  </span>
                </Link>
              ))}
            {!active.length && (
              <p className="muted">No active permits nearing expiry.</p>
            )}
          </section>
        </div>
      )}
      <div className="safety-note">
        <ShieldCheck size={14} />
        <span>Every permit is a commitment to a safer workplace.</span>
        <span>PCG SAFETY FIRST</span>
      </div>
    </>
  );
}
