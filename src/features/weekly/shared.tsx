"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { safetyControls } from "@/lib/domain";
import { allIssues } from "./engine";
import {
  addDays,
  dateLabel,
  localDay,
  hasSignatureForDay,
  partyRoles,
  timeLabel,
  WeeklyPermit,
} from "./model";
import { useWeekly } from "./store";
import { ApplicationDetails } from "./application-details";
import { GeneratedPermits } from "./generated-permits";
export function SharedQr({ permit }: { permit: WeeklyPermit }) {
  const [qr, setQr] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/join/${permit.token}`, {
      width: 220,
      margin: 1,
      color: { dark: "#17324d", light: "#ffffff" },
    }).then(setQr);
  }, [permit.token]);
  return (
    <section className="weekly-card weekly-share">
      <div>
        <span className="weekly-icon">
          <QrCode size={23} />
        </span>
        <h2>One QR. The whole week.</h2>
        <p>
          Share this QR with the Requester, Issuer and Holder. Return to the
          same QR for the Holder’s daily signature.
        </p>
      </div>
      {qr && (
        <Image
          src={qr}
          width={175}
          height={175}
          unoptimized
          alt={`Shared permit QR for ${permit.number}`}
        />
      )}
      <div className="weekly-share-actions">
        <button
          className="weekly-button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${window.location.origin}/join/${permit.token}`,
              );
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy size={15} />
          {copied ? "Link copied" : "Copy permit link"}
        </button>
        <Link
          className="weekly-button secondary"
          target="_blank"
          rel="noopener noreferrer"
          href={`/join/${permit.token}`}
        >
          <ExternalLink size={15} />
          Open shared page
        </Link>
      </div>
      <small>
        Local demo: open in tabs of this browser. Separate phones need shared
        storage.
      </small>
    </section>
  );
}
export function PartyProgress({ permit }: { permit: WeeklyPermit }) {
  const { state } = useWeekly();
  return (
    <div className="weekly-party-progress">
      {partyRoles.map((role) => {
        const person = state.people.find((p) => p.id === permit.members[role]),
          signed = permit.signatures[role]?.revision === permit.revision;
        return (
          <div key={role} className={signed ? "is-signed" : ""}>
            <span>{signed ? <Check size={17} /> : role[0]}</span>
            <div>
              <strong>{role}</strong>
              <p>{person?.name ?? "Waiting to join"}</p>
              <small>
                {signed
                  ? "Signed"
                  : person
                    ? "Complete section & sign"
                    : "Open the shared QR"}
              </small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function SharedSummary({
  permit,
  onReviewed,
  open = false,
}: {
  permit: WeeklyPermit;
  onReviewed?: () => void;
  open?: boolean;
}) {
  const r = permit.sections.Requester.data,
    i = permit.sections.Issuer.data,
    h = permit.sections.Holder.data;
  return (
    <details
      className="weekly-card weekly-full-summary"
      open={open || undefined}
      onToggle={(e) => {
        if (e.currentTarget.open) onReviewed?.();
      }}
    >
      <summary>
        Review the full shared permit <span>Revision {permit.revision}</span>
      </summary>
      <div className="weekly-summary-body">
        <GeneratedPermits permit={permit} />
        {permit.application && (
          <ApplicationDetails application={permit.application} />
        )}
        <section>
          <h3>Work & risk assessment</h3>
          <dl className="weekly-definition-grid">
            {[
              ["Work scope", r.scope],
              ["Company", r.company],
              ["Equipment", r.equipment],
              ["Activities", r.activities.join(", ")],
              ["Hazard / consequence", `${r.hazard} · ${r.consequence}`],
              ["Risk controls", r.riskControls],
              ["Responsible person", r.responsible],
              [
                "Risk scores",
                `Initial ${r.likelihood * r.severity} → residual ${r.residualLikelihood * r.residualSeverity}`,
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not yet recorded"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Issuer’s safety controls</h3>
          <dl className="weekly-definition-grid">
            {[
              ["PPE", i.ppe.join(", ")],
              [
                "Site controls",
                `${i.generalControls.length}/${safetyControls.length} verified`,
              ],
              ["Emergency arrangements", i.emergencyPlan],
              ...Object.entries(i.special).map(([k, v]) => [
                k.replace(":", " · "),
                v === "yes" ? "Confirmed" : v === "no" ? "Not confirmed" : v,
              ]),
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not yet recorded"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Holder & team</h3>
          <dl className="weekly-definition-grid">
            {[
              ["Team members", h.teamNames],
              ["Number of workers", String(h.workerCount)],
              ["Contact", h.phone],
              [
                "Toolbox / competency / conditions",
                `${h.toolbox ? "Briefed" : "Briefing pending"} · ${h.competent ? "Competencies confirmed" : "Competencies pending"} · ${h.understood ? "Conditions accepted" : "Acceptance pending"}`,
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v || "Not yet recorded"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Signatures for this revision</h3>
          {partyRoles.map((role) => (
            <div className="weekly-signature-row" key={role}>
              <strong>{role}</strong>
              <span>
                {permit.signatures[role]?.name ?? "Awaiting signature"}
              </span>
              <small>
                {permit.signatures[role]
                  ? timeLabel(permit.signatures[role]!.signedAt)
                  : "—"}
              </small>
            </div>
          ))}
          {permit.approval && (
            <div className="weekly-signature-row">
              <strong>HSE</strong>
              <span>{permit.approval.name}</span>
              <small>{timeLabel(permit.approval.signedAt)}</small>
            </div>
          )}
        </section>
        {allIssues(permit).length > 0 && (
          <section className="weekly-outstanding">
            <h3>Still needed before signing</h3>
            <ul>
              {allIssues(permit).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}
export function WeekAttendance({ permit }: { permit: WeeklyPermit }) {
  const { now } = useWeekly();
  const start = localDay(new Date(permit.start)),
    end = localDay(new Date(permit.end)),
    today = localDay(now);
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(start, index),
  ).filter((day) => day <= end);
  return (
    <section className="weekly-card weekly-attendance">
      <div>
        <h2>Daily Holder signatures</h2>
        <p>
          One initial approval. A fresh Holder acknowledgement for each work
          day.
        </p>
      </div>
      <div className="weekly-days">
        {days.map((day) => {
          const signed = hasSignatureForDay(permit, day);
          return (
            <div
              key={day}
              className={`${day === today ? "today" : ""} ${signed ? "signed" : ""}`}
            >
              <span>
                {new Date(`${day}T12:00:00+08:00`).toLocaleDateString("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                  weekday: "short",
                })}
              </span>
              <strong>{Number(day.slice(-2))}</strong>
              <small>
                {signed ? <Check size={15} /> : day < today ? "—" : "○"}
              </small>
            </div>
          );
        })}
      </div>
      <details className="weekly-disclosure">
        <summary>Sign-in history ({permit.attendance.length})</summary>
        {permit.attendance.length ? (
          permit.attendance.map((a) => (
            <div className="weekly-signature-row" key={a.id}>
              <strong>{a.name}</strong>
              <span>{a.day}</span>
              <small>
                {timeLabel(a.signedAt)} ·{" "}
                {a.kind === "INITIAL" ? "Initial signature" : "Daily sign-in"} ·
                rev {a.revision}
              </small>
            </div>
          ))
        ) : (
          <p className="weekly-muted">
            The Holder’s signatures will appear here.
          </p>
        )}
      </details>
      <p className="weekly-small">
        Validity: {dateLabel(permit.start)} — {dateLabel(permit.end)}. A daily
        signature never extends the approved period.
      </p>
    </section>
  );
}
