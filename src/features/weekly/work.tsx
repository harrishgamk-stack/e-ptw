"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  MapPin,
  ShieldCheck,
  TriangleAlert,
  QrCode,
  X,
} from "lucide-react";
import { allIssues, canRead, gasCurrent, sectionIssues } from "./engine";
import {
  dateLabel,
  effectiveWeeklyStatus,
  PartyRole,
  timeLabel,
} from "./model";
import { WeeklyFrame } from "./frame";
import { WeeklyLogin } from "./login";
import { WeeklyStatus } from "./home";
import { useWeekly } from "./store";
import { SectionForm } from "./section-form";
import {
  PartyProgress,
  SharedQr,
  SharedSummary,
  WeekAttendance,
} from "./shared";
import {
  DailySigning,
  HseReview,
  MonitoringActions,
  PartySigning,
} from "./actions";
export function WeeklyWork({ id }: { id: string }) {
  const { state, actor, ready, now } = useWeekly(),
    [seenRevision, setSeen] = useState<number | null>(null),
    [showQr, setShowQr] = useState(false);
  useEffect(() => {
    if (!showQr) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowQr(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showQr]);
  const p = state.permits.find((p) => p.id === id);
  if (!ready)
    return (
      <WeeklyFrame>
        <div className="weekly-loading">Opening shared permit…</div>
      </WeeklyFrame>
    );
  if (!actor)
    return (
      <WeeklyFrame>
        <WeeklyLogin />
      </WeeklyFrame>
    );
  if (!p || !canRead(p, actor))
    return (
      <WeeklyFrame>
        <div className="weekly-card weekly-empty">
          <h2>Open the permit’s QR link to join.</h2>
          <p>
            You can only open permits you created or joined. HSE can review
            every permit in this local demo.
          </p>
          <Link href="/" className="weekly-button secondary">
            My permits
          </Link>
        </div>
      </WeeklyFrame>
    );
  const status = effectiveWeeklyStatus(p, now),
    collecting = status === "COLLECTING",
    hse = actor.role === "HSE",
    signed =
      !hse && p.signatures[actor.role as PartyRole]?.revision === p.revision,
    stage = ["ACTIVE", "SUSPENDED", "SCHEDULED"].includes(status)
      ? 3
      : status === "HSE_REVIEW"
        ? 2
        : allIssues(p).length
          ? 0
          : 1;
  return (
    <WeeklyFrame>
      <Link href="/" className="back-link">
        <ArrowLeft size={14} />
        {hse ? "HSE workspace" : "My permit"}
      </Link>
      <div className="weekly-work-heading">
        <div>
          <span className="weekly-eyebrow">{p.number}</span>
          <h1>{p.title}</h1>
          <p>
            <MapPin size={15} />
            {p.location}
            <span>•</span>
            {dateLabel(p.start)} — {dateLabel(p.end)}
          </p>
        </div>
        <div className="weekly-heading-actions">
          <WeeklyStatus permit={p} />
          <button
            className="weekly-button secondary"
            onClick={() => setShowQr(true)}
          >
            <QrCode size={17} />
            Show QR
          </button>
        </div>
      </div>
      {["COLLECTING", "HSE_REVIEW"].includes(status) &&
        p.application &&
        p.createdBy === actor.id && (
          <p className="weekly-plan-edit">
            <Link
              className="weekly-button secondary"
              href={`/new-permit?edit=${p.id}`}
            >
              Edit detailed permit form
            </Link>
            <span>Changes require all parties to review and sign again.</span>
          </p>
        )}
      <div className="weekly-flow">
        {[
          "Fill together",
          "Three signatures",
          "HSE review",
          "Active & daily sign-in",
        ].map((s, i) => (
          <div
            className={i === stage ? "current" : i < stage ? "complete" : ""}
            key={s}
          >
            <span>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      {["EXPIRED", "CLOSED", "SUSPENDED"].includes(status) && (
        <div className="weekly-stop">
          <TriangleAlert size={25} />
          <div>
            <strong>WORK MUST NOT CONTINUE</strong>
            <p>
              {status === "SUSPENDED"
                ? p.suspensionReason
                : `This permit is ${status.toLowerCase()}. Daily signatures cannot extend or reactivate it.`}
            </p>
          </div>
        </div>
      )}
      {status === "HSE_REVIEW" && !hse && (
        <div className="weekly-info">
          <Clock3 size={24} />
          <div>
            <strong>With HSE for the initial approval.</strong>
            <p>
              All three parties have signed. Work is not active until HSE signs.
            </p>
          </div>
        </div>
      )}
      {status === "SCHEDULED" && (
        <div className="weekly-info">
          <Clock3 size={22} />
          <p>
            HSE has signed. This permit becomes active when its approved
            validity starts. Sign-in is blocked before then.
          </p>
        </div>
      )}
      {status === "ACTIVE" && !gasCurrent(p, now) && (
        <div className="weekly-stop">
          <TriangleAlert size={24} />
          <div>
            <strong>ENTRY BLOCKED — GAS CHECK REQUIRED</strong>
            <p>
              The last required gas check is stale or failed. HSE or the Issuer
              must record a current passing test.
            </p>
          </div>
        </div>
      )}
      {status === "ACTIVE" && <DailySigning permit={p} />}
      <div className="weekly-work-grid">
        <div className="weekly-work-content">
          <PartyProgress permit={p} />
          {collecting && !hse && (
            <>
              <section className="weekly-card weekly-my-section">
                <div className="weekly-my-section-heading">
                  <div>
                    <span className="weekly-eyebrow">
                      YOUR PART · {actor.role.toUpperCase()}
                    </span>
                    <h2>
                      {signed ? "Your saved section" : "Complete your section"}
                    </h2>
                    <p>
                      Only you can update this section. The other parties can
                      complete theirs at the same time.
                    </p>
                  </div>
                  <span>
                    {sectionIssues(p, actor.role as PartyRole).length
                      ? "Details needed"
                      : "Details ready"}
                  </span>
                </div>
                {signed ? (
                  <details className="weekly-disclosure">
                    <summary>
                      Change my section (signatures will need renewal)
                    </summary>
                    <SectionForm permit={p} role={actor.role as PartyRole} />
                  </details>
                ) : (
                  <SectionForm permit={p} role={actor.role as PartyRole} />
                )}
              </section>
              <PartySigning permit={p} seenRevision={seenRevision} />
            </>
          )}
          <SharedSummary
            permit={p}
            open={hse && status === "HSE_REVIEW"}
            onReviewed={() => setSeen(p.revision)}
          />
          <HseReview permit={p} />
          {["ACTIVE", "SUSPENDED", "SCHEDULED", "EXPIRED"].includes(status) && (
            <WeekAttendance permit={p} />
          )}
          <MonitoringActions permit={p} />
          <details className="weekly-card weekly-history">
            <summary>
              Permit history{" "}
              <span>
                {state.audit.filter((e) => e.permitId === p.id).length} events
              </span>
            </summary>
            {(p.signedVersions ?? []).map((version) => (
              <details
                className="weekly-disclosure"
                key={version.revision}
                style={{ margin: "15px 24px" }}
              >
                <summary>
                  Signed revision {version.revision} ·{" "}
                  {timeLabel(version.recordedAt)}
                </summary>
                <p>
                  <strong>{version.snapshot.title}</strong> ·{" "}
                  {version.snapshot.location}
                </p>
                <p>{version.snapshot.sections.Requester.scope}</p>
                <p>
                  Risk controls:{" "}
                  {version.snapshot.sections.Requester.riskControls}
                </p>
                <p>
                  Emergency arrangements:{" "}
                  {version.snapshot.sections.Issuer.emergencyPlan}
                </p>
                <p>
                  Holder’s team: {version.snapshot.sections.Holder.teamNames}
                </p>
                <p className="weekly-small">
                  Archived content reference: {version.contentHash}
                </p>
              </details>
            ))}
            {state.audit
              .filter((e) => e.permitId === p.id)
              .map((e) => (
                <div key={e.id}>
                  <strong>{e.action.replaceAll("_", " ").toLowerCase()}</strong>
                  <p>{e.reason}</p>
                  <small>
                    {e.name} · {e.role} · {timeLabel(e.at)}
                  </small>
                </div>
              ))}
            <p className="weekly-small">
              Earlier signatures: {p.signatureHistory.length} · HSE approvals:{" "}
              {p.approvalHistory.length}. Changes retain historical evidence.
            </p>
          </details>
        </div>
        <aside>
          <SharedQr permit={p} />
          {p.approval && (
            <section className="weekly-card weekly-approval-card">
              <ShieldCheck size={27} />
              <h3>Initial HSE approval</h3>
              <p>{p.approval.name}</p>
              <small>
                {timeLabel(p.approval.signedAt)} · revision{" "}
                {p.approval.revision}
              </small>
              <p>
                No repeat approval is needed each day unless scope, conditions
                or safety controls change.
              </p>
            </section>
          )}
          <div className="weekly-info">
            <ShieldCheck size={20} />
            <p>
              This is a workflow demonstration. No site work is authorized by
              the local demo.
            </p>
          </div>
        </aside>
      </div>
      {showQr && (
        <div
          className="weekly-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQr(false);
          }}
        >
          <div
            className="weekly-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Shared permit QR"
          >
            <button
              className="weekly-qr-close"
              autoFocus
              aria-label="Close permit QR"
              onClick={() => setShowQr(false)}
            >
              <X size={20} />
            </button>
            <SharedQr permit={p} />
          </div>
        </div>
      )}
    </WeeklyFrame>
  );
}
