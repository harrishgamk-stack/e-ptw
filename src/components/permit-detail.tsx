"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock3,
  Copy,
  LoaderCircle,
  Printer,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { emptyDraft, Status, transitions } from "@/lib/domain";
import { useStore } from "./store";
import { Badge, Empty, Field, label, Risk, SectionTitle, TypeIcon } from "./ui";
import { permitStatus, time } from "./permit-table";
export function PermitDetail({
  id,
  approval = false,
  closure = false,
}: {
  id: string;
  approval?: boolean;
  closure?: boolean;
}) {
  const { permits, audit, demo, transition, operation, save, ready, can } =
    useStore();
  const p = permits.find((p) => p.id === id);
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(
      closure ? "COMPLETION_REQUESTED" : null,
    ),
    [reason, setReason] = useState(""),
    [checks, setChecks] = useState<Record<string, boolean>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [category, setCategory] = useState("Unsafe condition"),
    [value, setValue] = useState(""),
    [qr, setQr] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (p)
      QRCode.toDataURL(`${window.location.origin}/verify/${p.token}`, {
        width: 220,
        margin: 1,
        color: { dark: "#18344d", light: "#ffffff" },
      }).then(setQr);
  }, [p]);
  if (!ready)
    return (
      <div className="empty">
        <LoaderCircle size={25} />
        Loading permit…
      </div>
    );
  if (!p)
    return (
      <Empty
        title="Permit not found"
        description="This permit may not exist or your account may not have access."
      />
    );
  const status = permitStatus(p, demo),
    isClosed = ["CLOSED", "CANCELLED"].includes(status),
    events = audit.filter((a) => a.permitId === id),
    actions = Object.keys(transitions[status] ?? {}) as Status[];
  const open = (action: string) => {
    setModal(action);
    setReason("");
    setChecks({});
    setError("");
    setValue("");
  };
  const confirmLabels =
    modal === "ACTIVE"
      ? {
          inspected: "I confirm the work area has been re-inspected.",
          controls:
            "All mandatory controls, LOTO and required gas tests are verified.",
          acknowledged: "The permit holder acknowledges the permit conditions.",
        }
      : modal === "CLOSED"
        ? {
            areaSafe: "Workplace is safe, cleaned and handed back.",
            isolationRemoved:
              "Isolation is safely removed; guards and covers are restored.",
            alarmsRestored:
              "Alarms are restored, temporary controls removed and waste disposed.",
            holder: "Permit holder closure acknowledgement recorded.",
            issuer: "Permit issuer closure acknowledgement recorded.",
          }
        : modal === "extension"
          ? {
              conditions: "Conditions and current workers have been reviewed.",
              hazards: "No new hazards or scope changes remain unresolved.",
              risk: "Risk assessment has been reviewed.",
              issuer: "Issuer and holder approval recorded.",
            }
          : modal === "transfer"
            ? {
                outgoing: "Outgoing holder acknowledgement recorded.",
                incoming: "Incoming holder acknowledgement recorded.",
                issuer: "Issuer approval recorded.",
              }
            : modal === "signout"
              ? {
                  stopped: "Work is stopped and tools are secured.",
                  safe: "The area has been left safe and open hazards recorded.",
                  energy: "Energy state has been checked.",
                  holder:
                    "Holder and issuer sign-out acknowledgements recorded.",
                }
              : {};
  async function act() {
    if (!p || !modal) return;
    setError("");
    if (reason.trim().length < 3) {
      setError("Provide a meaningful reason or acknowledgement.");
      return;
    }
    if (Object.keys(confirmLabels).some((k) => !checks[k])) {
      setError("Complete every required confirmation.");
      return;
    }
    setBusy(true);
    try {
      if (["extension", "transfer", "signout"].includes(modal))
        await operation(id, modal, reason, value);
      else
        await transition(
          id,
          modal as Status,
          modal === "SUSPENDED" ? `${category}: ${reason}` : reason,
          { ...checks, reviewed },
        );
      setModal(null);
      setNotice("Action recorded in the permit audit history.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete action");
    } finally {
      setBusy(false);
    }
  }
  const actionLabels: Partial<Record<Status, string>> = {
    UNDER_REVIEW: "Start safety review",
    PENDING_APPROVAL: "Send for approval",
    APPROVED: "Approve current step",
    ISSUED: "Issue permit",
    ACTIVE:
      status === "SUSPENDED"
        ? "Authorize resumption"
        : "Acknowledge & activate",
    SUSPENDED: "Suspend permit",
    COMPLETION_REQUESTED: "Request closure",
    CLOSED: "Complete closure",
    CHANGES_REQUIRED: "Request changes",
    CANCELLED: "Cancel / reject permit",
    SUBMITTED: "Submit permit",
  };
  return (
    <>
      <Link href={approval ? "/approvals" : "/permits"} className="back-link">
        <ChevronLeft size={14} />
        Back to {approval ? "approvals" : "permits"}
      </Link>
      <div className="detail-header">
        <TypeIcon type={p.type} />
        <div>
          <div className="eyebrow">
            {approval ? "APPROVAL REVIEW" : p.type.toUpperCase()}
          </div>
          <h1>{p.number}</h1>
          <p>{p.title}</p>
        </div>
        <Badge status={status} />
      </div>
      {notice && <div className="success-message">{notice}</div>}
      {status === "SUSPENDED" && (
        <div className="error-message">
          <strong>WORK MUST STOP</strong>
          <p>
            This permit is suspended. Corrective action, re-inspection and
            authorization are required before work resumes.
          </p>
        </div>
      )}
      {status === "EXPIRED" && (
        <div className="error-message">
          <strong>PERMIT EXPIRED — WORK MUST NOT CONTINUE</strong>
        </div>
      )}
      {p.workActive === false && (
        <div className="inline-notice">
          <Clock3 size={16} />
          Work session signed out. Permit validity does not authorize work
          without a new pre-work confirmation.
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="panel detail-block">
            <SectionTitle title="Work information">
              <button className="text-link" onClick={() => window.print()}>
                <Printer size={14} />
                Print / Save PDF
              </button>
            </SectionTitle>
            <div className="panel-body" style={{ paddingTop: 0 }}>
              <dl className="info-grid">
                {[
                  ["Location", p.location],
                  ["Department", p.department],
                  ["Contractor", p.contractor],
                  ["Permit holder", p.holder],
                  [
                    "Planned start",
                    `${p.start ? new Date(p.start).toLocaleDateString("en-MY") : ""} · ${time(p.start)}`,
                  ],
                  [
                    "Valid until",
                    `${p.end ? new Date(p.end).toLocaleDateString("en-MY") : ""} · ${time(p.end)}`,
                  ],
                  ["Approved workers", String(p.workers)],
                  [
                    "Work session",
                    p.workActive === false
                      ? "Signed out"
                      : "See work session history",
                  ],
                  ["Work order", p.draft?.reference ?? "Not recorded"],
                  ["Equipment", p.draft?.equipment ?? "Refer to work scope"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Not recorded"}</dd>
                  </div>
                ))}
              </dl>
              {p.draft?.description && (
                <div className="review-section">
                  <h3>Description & purpose</h3>
                  <p>{p.draft.description}</p>
                  <p>{p.draft.purpose}</p>
                </div>
              )}
            </div>
          </section>
          <section className="panel detail-block">
            <SectionTitle title="Critical safety information">
              <Risk risk={p.risk} />
            </SectionTitle>
            <div className="panel-body" style={{ paddingTop: 0 }}>
              {p.draft ? (
                <>
                  <h3>Activities</h3>
                  <p className="muted" style={{ padding: "8px 0 20px" }}>
                    {p.draft.activities.join(" · ")}
                  </p>
                  <h3>Required PPE</h3>
                  <p className="muted" style={{ padding: "8px 0 20px" }}>
                    {p.draft.ppe.join(" · ")}
                  </p>
                  <h3>Safety controls</h3>
                  <div className="checks-grid" style={{ marginTop: 15 }}>
                    {p.draft.controls.map((c) => (
                      <span className="check" key={c}>
                        <CheckCheck size={15} color="#5c9b7f" />
                        {c}
                      </span>
                    ))}
                  </div>
                  <h3 className="form-section-title">Risk assessment</h3>
                  {p.draft.hazards.map((h) => (
                    <div className="risk-card" key={h.id}>
                      <h3>{h.hazard}</h3>
                      <p className="muted" style={{ padding: "8px 0" }}>
                        {h.consequence} · {h.affected}
                      </p>
                      <p>{h.controls}</p>
                      <div className="score-display">
                        Residual risk <Risk risk={p.risk} />
                        <span>Responsible: {h.responsible}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(p.draft.special).length > 0 && (
                    <>
                      <h3 className="form-section-title">
                        Specialist controls & evidence
                      </h3>
                      <dl className="info-grid">
                        {Object.entries(p.draft.special).map(([key, v]) => (
                          <div key={key}>
                            <dt>{key.replace(":", " · ")}</dt>
                            <dd>
                              {v === "yes"
                                ? "Confirmed"
                                : v === "no"
                                  ? "Not confirmed"
                                  : v || "Not recorded"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}
                  {p.draft.workers.length > 0 && (
                    <>
                      <h3 className="form-section-title">
                        Workers / permit users
                      </h3>
                      {p.draft.workers.map((w) => (
                        <div className="review-section" key={w.id}>
                          <h3>
                            {w.name} · {w.trade}
                          </h3>
                          <p>
                            {w.company} · Induction:{" "}
                            {w.inducted ? "Complete" : "Pending"} · Certificate:{" "}
                            {w.expiry || "Not recorded"}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                  {p.draft.documents.length > 0 && (
                    <>
                      <h3 className="form-section-title">
                        Supporting documents
                      </h3>
                      {p.draft.documents.map((d, i) => (
                        <div className="review-section" key={i}>
                          <p>
                            {d.type} ·{" "}
                            {demo ? (
                              d.name
                            ) : (
                              <a
                                className="text-link"
                                target="_blank"
                                rel="noopener noreferrer"
                                href={`/api/documents?permitId=${id}&path=${encodeURIComponent(d.path)}`}
                              >
                                {d.name} ↗
                              </a>
                            )}{" "}
                            {d.expiry && `· Expiry ${d.expiry}`}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="inline-notice">
                  <ShieldCheck size={18} />
                  This sample permit demonstrates operational visibility. It has
                  no verified safety evidence and cannot authorize real work.
                  Create a new permit to review the complete safety workflow.
                </div>
              )}
              {approval && (
                <label
                  className="check no-print"
                  style={{
                    marginTop: 25,
                    padding: 15,
                    background: "#f3f7fd",
                    borderRadius: 7,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  I have opened and reviewed the critical safety information,
                  work scope and supporting evidence.
                </label>
              )}
            </div>
          </section>
          <section className="panel detail-block">
            <SectionTitle
              title="Permit history"
              sub="Every decision leaves a record."
            />
            <div className="timeline">
              {events.length ? (
                events.map((e) => (
                  <div className="timeline-entry" key={e.id}>
                    <strong>{e.action}</strong>
                    <p>{e.reason}</p>
                    <small>
                      {e.actor} ·{" "}
                      {new Date(e.at).toLocaleString("en-MY", {
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </small>
                  </div>
                ))
              ) : (
                <p className="muted">
                  No audit events are visible for this permit.
                </p>
              )}
            </div>
          </section>
        </div>
        <aside>
          <section className="panel detail-block">
            <SectionTitle title="Permit actions">
              <ShieldCheck size={17} />
            </SectionTitle>
            <div
              className="panel-body detail-actions"
              style={{ paddingTop: 0 }}
            >
              {["DRAFT", "CHANGES_REQUIRED"].includes(status) && (
                <Link className="button primary" href={`/permits/${id}/edit`}>
                  Continue editing
                </Link>
              )}
              {!["CLOSED", "CANCELLED", "SUSPENDED", "EXPIRED"].includes(
                status,
              ) && (
                <Link className="button secondary" href={`/sign?permit=${id}`}>
                  Sign acknowledgement
                </Link>
              )}
              {actions
                .filter(
                  (s) =>
                    s !== "SUBMITTED" &&
                    s !== "EXPIRED" &&
                    (status !== "PENDING_APPROVAL" || approval) &&
                    can(transitions[status]?.[s] ?? ""),
                )
                .map((s) => (
                  <button
                    key={s}
                    disabled={
                      approval &&
                      ["APPROVED", "CHANGES_REQUIRED", "CANCELLED"].includes(
                        s,
                      ) &&
                      !reviewed
                    }
                    className={`button ${s === "SUSPENDED" ? "danger" : s === "CHANGES_REQUIRED" || s === "CANCELLED" ? "secondary" : "primary"}`}
                    onClick={() => open(s)}
                  >
                    {s === "SUSPENDED" && <TriangleAlert size={15} />}
                    {actionLabels[s] ?? label(s)}
                  </button>
                ))}
              {status === "PENDING_APPROVAL" && !approval && (
                <Link className="button primary" href={`/approvals/${id}`}>
                  Open approval review
                </Link>
              )}
              {status === "ACTIVE" && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => open("extension")}
                  >
                    Extend validity
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => open("transfer")}
                  >
                    Transfer holder
                  </button>
                  <button
                    className="button secondary"
                    disabled={p.workActive === false}
                    onClick={() => open("signout")}
                  >
                    End-of-day sign out
                  </button>
                </>
              )}
              {isClosed && (
                <div className="inline-notice">
                  This permit is read-only. Historical records are retained.
                </div>
              )}
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    const draft = p.draft
                      ? {
                          ...p.draft,
                          confirmed: false,
                          start: "",
                          end: "",
                          special: {},
                          controls: [],
                          documents: [],
                          workers: p.draft.workers.map((w) => ({
                            ...w,
                            acknowledged: false,
                          })),
                        }
                      : {
                          ...emptyDraft,
                          title: `Copy of ${p.title}`,
                          location: p.location,
                          department: p.department,
                          contractor: p.contractor,
                          holder: p.holder,
                          activities: [p.type],
                        };
                    const next = await save(draft);
                    router.push(`/permits/${next}/edit`);
                  } catch (e) {
                    setNotice(
                      e instanceof Error ? e.message : "Unable to duplicate",
                    );
                  }
                }}
              >
                <Copy size={14} />
                Duplicate as new draft
              </button>
            </div>
          </section>
          <section className="panel detail-block">
            <SectionTitle title="On-site verification">
              <QrCode size={17} />
            </SectionTitle>
            <div
              className="panel-body"
              style={{ paddingTop: 0, textAlign: "center" }}
            >
              {qr && (
                <div className="qr-frame">
                  <Image
                    src={qr}
                    alt={`Verification QR code for ${p.number}`}
                    width={220}
                    height={220}
                    unoptimized
                  />
                </div>
              )}
              <p
                style={{ fontSize: 10, color: "#95a2b3", margin: "8px 0 15px" }}
              >
                Scan to check the current permit status.
              </p>
              <Link className="button secondary" href={`/verify/${p.token}`}>
                Open verification
                <ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} />
              </Link>
            </div>
          </section>
          <div className="inline-notice">
            <ShieldCheck size={17} />
            The permit supports the safe work process. PCG’s competent HSE
            personnel remain responsible for safety decisions.
          </div>
        </aside>
      </div>
      {modal && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-title"
          >
            <div className="modal-head">
              <h2 id="action-title">
                {actionLabels[modal as Status] ?? label(modal)}
              </h2>
              <button aria-label="Close action" onClick={() => setModal(null)}>
                <X size={18} />
              </button>
            </div>
            <p>
              {p.number} · {p.title}
            </p>
            {demo && (
              <div className="inline-notice">
                Demo action only. A real approval requires a separately
                authenticated authorized account.
              </div>
            )}
            {modal === "SUSPENDED" && (
              <Field label="Reason category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "Unsafe condition",
                    "Control failure",
                    "Incident",
                    "Weather",
                    "Alarm / emergency",
                    "Unauthorized personnel",
                    "Scope changed",
                    "Other",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            )}
            {modal === "extension" && (
              <Field label="Requested new expiry (maximum 7 days from original)">
                <input
                  type="datetime-local"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
            )}
            {modal === "transfer" && (
              <Field label="Incoming permit holder">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </Field>
            )}
            <Field
              label={
                modal === "ACTIVE"
                  ? "Corrective action, re-inspection & acknowledgement"
                  : "Reason / handover notes / remarks"
              }
              required
            >
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Record the decision and relevant safety information."
              />
            </Field>
            <div style={{ display: "grid", gap: 14 }}>
              {Object.entries(confirmLabels).map(([key, text]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={checks[key] ?? false}
                    onChange={(e) =>
                      setChecks({ ...checks, [key]: e.target.checked })
                    }
                  />
                  {text}
                </label>
              ))}
            </div>
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className={`button ${modal === "SUSPENDED" ? "danger" : "primary"}`}
                disabled={busy}
                onClick={act}
              >
                {busy ? "Recording…" : "Confirm & record"}
                <Check size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
