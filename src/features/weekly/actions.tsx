"use client";
import { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  PenLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Field } from "@/components/ui";
import { allIssues, currentSignatures, gasCurrent } from "./engine";
import {
  dailyStatement,
  dateLabel,
  effectiveWeeklyStatus,
  hasTodaySignature,
  localDay,
  WeeklyPermit,
} from "./model";
import { useWeekly } from "./store";
export function PartySigning({
  permit,
  seenRevision,
}: {
  permit: WeeklyPermit;
  seenRevision: number | null;
}) {
  const { actor, command } = useWeekly();
  const [confirmed, setConfirmed] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!actor || actor.role === "HSE") return null;
  const issues = allIssues(permit),
    signed = permit.signatures[actor.role]?.revision === permit.revision;
  if (signed)
    return (
      <div className="weekly-card weekly-signed-message">
        <CheckCircle2 size={30} />
        <div>
          <h2>You’ve signed your part.</h2>
          <p>
            {currentSignatures(permit)
              ? "All three signatures are complete. HSE will now review the permit."
              : "The other parties can sign the same revision. HSE review starts once all three have signed."}
          </p>
        </div>
      </div>
    );
  return (
    <section className="weekly-card weekly-sign-action">
      <div className="weekly-action-title">
        <PenLine size={23} />
        <div>
          <h2>Sign as {actor.role}</h2>
          <p>
            {actor.name} · revision {permit.revision}
          </p>
        </div>
      </div>
      {issues.length > 0 ? (
        <div className="weekly-info">
          <ClipboardCheck size={19} />
          <p>
            Finish and save all three sections first. The shared summary lists
            what is still needed.
          </p>
        </div>
      ) : (
        <>
          <label className="check">
            <input
              type="checkbox"
              disabled={seenRevision !== permit.revision}
              checked={confirmed === permit.revision}
              onChange={(e) =>
                setConfirmed(e.target.checked ? permit.revision : null)
              }
            />
            I reviewed the complete shared permit, including the work scope,
            risks and controls, and I sign my acknowledgement as {actor.role}.
          </label>
          {seenRevision !== permit.revision && (
            <p className="weekly-small">
              Open “Review the full shared permit” below before signing.
            </p>
          )}
          <button
            className="weekly-button primary"
            disabled={busy || confirmed !== permit.revision}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await command({
                  type: "SIGN",
                  permitId: permit.id,
                  expectedRevision: confirmed!,
                  confirmed: true,
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to sign.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Recording…" : `Sign as ${actor.role}`}
            <PenLine size={16} />
          </button>
        </>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
export function DailySigning({ permit }: { permit: WeeklyPermit }) {
  const { actor, command, now } = useWeekly();
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const signed = hasTodaySignature(permit, now),
    gas = gasCurrent(permit, now);
  const confirmationKey = `${localDay(now)}:${permit.revision}:${permit.attendanceAfter ?? ""}`;
  const confirmed = confirmedFor === confirmationKey;
  if (actor?.role !== "Holder")
    return (
      <div className="weekly-card weekly-signed-message">
        <ShieldCheck size={28} />
        <div>
          <h2>Approved for the work period.</h2>
          <p>
            {signed
              ? "The Holder has signed for today."
              : "The Holder must open this QR and sign for today before work starts."}{" "}
            No daily HSE reapproval is required while the approved scope and
            conditions remain unchanged.
          </p>
        </div>
      </div>
    );
  return (
    <section className="weekly-card weekly-daily" id="today">
      <div className="weekly-action-title">
        {signed ? <CheckCircle2 size={30} /> : <PenLine size={30} />}
        <div>
          <span className="weekly-eyebrow">
            HOLDER · {dateLabel(now.toISOString())}
          </span>
          <h2>
            {signed ? "You’re signed in for today." : "Sign for today’s work."}
          </h2>
          <p>
            The permit remains valid for the approved period. This is your daily
            acknowledgement.
          </p>
        </div>
      </div>
      {!gas && (
        <div className="error-message">
          <strong>ENTRY BLOCKED</strong>
          <p>
            A current passing gas check is required. Ask HSE or the Issuer to
            update monitoring.
          </p>
        </div>
      )}
      {!signed && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) =>
                setConfirmedFor(e.target.checked ? confirmationKey : null)
              }
            />
            {dailyStatement}
          </label>
          <Field label="Notes / handover (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <button
            className="weekly-button primary"
            disabled={busy || !confirmed || !gas}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await command({
                  type: "DAILY",
                  permitId: permit.id,
                  confirmed,
                  note,
                });
                setConfirmedFor(null);
                setNote("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to sign.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Recording…" : "Sign for today"}
            <PenLine size={16} />
          </button>
        </>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <p className="weekly-small">
        If the scope or conditions changed, report it and stop work. A signature
        cannot override missing controls.
      </p>
    </section>
  );
}
export function HseReview({ permit }: { permit: WeeklyPermit }) {
  const { actor, command } = useWeekly();
  const [reviewed, setReviewed] = useState<number | null>(null),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (actor?.role !== "HSE" || permit.status !== "HSE_REVIEW") return null;
  return (
    <section className="weekly-card weekly-hse-review">
      <div className="weekly-action-title">
        <ShieldCheck size={27} />
        <div>
          <span className="weekly-eyebrow">SAFETY DEPARTMENT</span>
          <h2>Final review & activation</h2>
          <p>
            Requester, Issuer and Holder have signed. Your HSE signature is the
            final activation gate.
          </p>
        </div>
      </div>
      <Field label="HSE review notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <label className="check">
        <input
          type="checkbox"
          checked={reviewed === permit.revision}
          onChange={(e) =>
            setReviewed(e.target.checked ? permit.revision : null)
          }
        />
        I reviewed the current work scope, all three signatures, risk assessment
        and required controls. I approve this permit as HSE.
      </label>
      <button
        className="weekly-button primary"
        disabled={busy || reviewed !== permit.revision}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await command({
              type: "APPROVE",
              permitId: permit.id,
              expectedRevision: reviewed!,
              confirmed: true,
              notes,
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to approve.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Recording…" : "Sign & activate permit"}
        <ShieldCheck size={17} />
      </button>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
export function MonitoringActions({ permit }: { permit: WeeklyPermit }) {
  const { actor, command, now } = useWeekly();
  const [kind, setKind] = useState<"INSPECTION" | "GAS">("INSPECTION"),
    [result, setResult] = useState<"PASS" | "FAIL">("PASS"),
    [notes, setNotes] = useState(""),
    [reason, setReason] = useState(""),
    [inspected, setInspected] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const status = effectiveWeeklyStatus(permit, now),
    hse = actor?.role === "HSE",
    monitor = hse || actor?.role === "Issuer";
  async function act(type: "MONITOR" | "SUSPEND" | "RESUME" | "RETURN") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await command(
        type === "MONITOR"
          ? { type, permitId: permit.id, kind, result, notes }
          : type === "RESUME"
            ? { type, permitId: permit.id, reason, inspected }
            : { type, permitId: permit.id, reason },
      );
      setMessage("Recorded in the permit history.");
      setNotes("");
      setReason("");
      setInspected(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record action.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="weekly-card weekly-monitoring">
      <h2>{hse ? "HSE monitoring" : "Safety monitoring & stop work"}</h2>
      <p className="weekly-muted">
        Monitoring continues through the week. It does not replace the Holder’s
        daily signature.
      </p>
      {monitor && !["CLOSED", "EXPIRED"].includes(status) && (
        <details className="weekly-disclosure">
          <summary>Record a site / gas check</summary>
          <div className="weekly-form-grid">
            <Field label="Check type">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="INSPECTION">Site inspection</option>
                <option value="GAS">Gas test (evidence required)</option>
              </select>
            </Field>
            <Field label="Result">
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as typeof result)}
              >
                <option>PASS</option>
                <option>FAIL</option>
              </select>
            </Field>
          </div>
          <Field label="Inspection notes / gas-test readings, limits and instrument evidence">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <p className="weekly-small">
            A failed check automatically suspends active work. Gas checks are
            considered current for 30 minutes in this demo.
          </p>
          <button
            className="weekly-button secondary"
            disabled={busy}
            onClick={() => act("MONITOR")}
          >
            Record check
          </button>
        </details>
      )}
      {(["ACTIVE", "SCHEDULED", "SUSPENDED"].includes(status) ||
        (hse && !["EXPIRED", "CLOSED"].includes(status))) && (
        <details className="weekly-disclosure">
          <summary>
            <TriangleAlert size={15} />
            Stop work / request changes
          </summary>
          <Field label="Reason / corrective action">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="weekly-button-row">
            {["ACTIVE", "SCHEDULED"].includes(status) && (
              <button
                className="weekly-button danger"
                disabled={busy}
                onClick={() => act("SUSPEND")}
              >
                Stop work
              </button>
            )}
            {hse && (
              <button
                className="weekly-button secondary"
                disabled={busy}
                onClick={() => act("RETURN")}
              >
                Return for changes
              </button>
            )}
          </div>
          {hse && status === "SUSPENDED" && (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={inspected}
                  onChange={(e) => setInspected(e.target.checked)}
                />
                Corrective actions are complete and I have re-inspected the work
                area.
              </label>
              <button
                className="weekly-button primary"
                disabled={busy || !inspected}
                onClick={() => act("RESUME")}
              >
                Authorize resumption
              </button>
            </>
          )}
        </details>
      )}
      {message && <div className="weekly-success">{message}</div>}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {permit.monitoring.length > 0 && (
        <div className="weekly-monitor-history">
          {[...permit.monitoring]
            .reverse()
            .slice(0, 5)
            .map((m) => (
              <div key={m.id}>
                <strong>
                  {m.kind === "GAS" ? "Gas test" : "Site check"} · {m.result}
                </strong>
                <p>{m.notes}</p>
                <small>
                  {m.name} ·{" "}
                  {new Date(m.at).toLocaleString("en-MY", {
                    timeZone: "Asia/Kuala_Lumpur",
                  })}
                </small>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
