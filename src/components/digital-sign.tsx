"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import {
  acknowledgementStatement,
  signerSchema,
  type SignerInput,
} from "@/lib/acknowledgement";
import { useStore } from "./store";
import { ReceiptFinder } from "./receipt-finder";
import { Badge, Field } from "./ui";
import { permitStatus, time } from "./permit-table";

export function DigitalSign({ initialPermit }: { initialPermit?: string }) {
  const { permits, signatures, sign, demo, ready } = useStore(),
    router = useRouter();
  const [selected, setSelected] = useState(initialPermit ?? ""),
    [name, setName] = useState(""),
    [role, setRole] = useState<SignerInput["role"]>("Permit holder"),
    [typed, setTyped] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const p = permits.find((p) => p.id === selected),
    status = p ? permitStatus(p, demo) : null;
  const canSign = Boolean(
    p &&
    !["SUSPENDED", "EXPIRED", "CLOSED", "CANCELLED"].includes(status ?? ""),
  );
  return (
    <div className="simple-workspace">
      <div className="simple-heading">
        <span className="eyebrow">DIGITAL ACKNOWLEDGEMENT</span>
        <h1>Review. Sign. Keep a record.</h1>
        <p>A simple way to record who acknowledged a permit and when.</p>
      </div>
      <div className="sign-layout">
        <form
          className="panel simple-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!p || !canSign) {
              setError("Select an open permit before signing.");
              return;
            }
            if (!reviewed) {
              setError("Open and review the permit summary first.");
              return;
            }
            if (!confirmed) {
              setError("Confirm that you have reviewed the permit.");
              return;
            }
            const input = signerSchema.safeParse({
              name,
              role,
              signature: typed,
              confirmed,
            });
            if (!input.success) {
              setError(input.error.issues[0].message);
              return;
            }
            setBusy(true);
            try {
              const token = await sign(p.id, input.data);
              router.push(`/signatures/${token}`);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Unable to record acknowledgement.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="sign-form-title">
            <span>1</span>
            <h2>Choose the permit</h2>
          </div>
          <Field label="Permit">
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setReviewed(false);
                setConfirmed(false);
                setError("");
              }}
            >
              <option value="">Select a permit</option>
              {permits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number} · {p.title}
                </option>
              ))}
            </select>
          </Field>
          {p && (
            <div className="sign-summary">
              <div>
                <strong>{p.title}</strong>
                <Badge status={status ?? p.status} />
              </div>
              <p>
                {p.location || "Location not recorded"} ·{" "}
                {p.holder || "Holder not recorded"}
              </p>
              <details
                key={p.id}
                onToggle={(e) => {
                  if (e.currentTarget.open) setReviewed(true);
                }}
              >
                <summary>
                  Review permit summary <ArrowRight size={14} />
                </summary>
                <dl className="info-grid">
                  <div>
                    <dt>Company</dt>
                    <dd>{p.contractor || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Validity</dt>
                    <dd>
                      {time(p.start)} — {time(p.end)} MYT
                    </dd>
                  </div>
                  <div>
                    <dt>Risk level</dt>
                    <dd>{p.risk}</dd>
                  </div>
                  <div>
                    <dt>Workers</dt>
                    <dd>{p.workers}</dd>
                  </div>
                </dl>
                <p>
                  {p.draft?.description ||
                    "Sample work scope. Review the detailed permit for all controls."}
                </p>
                <p>
                  <strong>Safety controls:</strong>{" "}
                  {p.draft?.controls.join(" · ") ||
                    "Not recorded in this sample."}
                </p>
                <p>
                  <strong>PPE:</strong>{" "}
                  {p.draft?.ppe.join(" · ") || "Not recorded in this sample."}
                </p>
                {p.draft?.hazards.map((h) => (
                  <p key={h.id}>
                    <strong>{h.hazard}</strong> — {h.controls}
                  </p>
                ))}
                <Link className="simple-text-link" href={`/permits/${p.id}`}>
                  Open all permit details →
                </Link>
              </details>
            </div>
          )}
          <div className="sign-form-title">
            <span>2</span>
            <h2>Add your acknowledgement</h2>
          </div>
          <div className="form-grid">
            <Field label="Your full name" required>
              <input
                required
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Ahmad Firdaus"
              />
            </Field>
            <Field label="Your role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SignerInput["role"])}
              >
                {[
                  "Permit holder",
                  "Permit issuer",
                  "HSE / Safety",
                  "Requester",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="typed-signature">
            <Field label="Type your full name to sign" required>
              <input
                required
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                placeholder="Your full name"
              />
            </Field>
            {typed && (
              <div
                className="signature-preview"
                aria-label="Typed signature preview"
              >
                {typed}
              </div>
            )}
          </div>
          <label className="check sign-declaration">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {acknowledgementStatement}
          </label>
          {p && !canSign && (
            <div className="error-message">
              This permit is {status?.toLowerCase()}. A new acknowledgement
              cannot be added.
            </div>
          )}
          {!demo && (
            <div className="inline-notice">
              Authenticated signing is not enabled in this connected workspace.
            </div>
          )}
          {error && (
            <div role="alert" className="error-message">
              {error}
            </div>
          )}
          <button
            className="button primary sign-submit"
            disabled={busy || !ready || !canSign || !demo}
          >
            <PenLine size={17} />
            {busy ? "Recording…" : "Sign acknowledgement"}
            <ArrowRight size={16} />
          </button>
          <p className="sign-demo-note">
            Local demo · the name you enter is not authenticated. Signing does
            not change the permit status.
          </p>
        </form>
        <aside>
          <section className="panel sign-explainer">
            <span className="simple-step-icon">
              <ShieldCheck size={27} />
            </span>
            <h2>A clear record, every time.</h2>
            <p>Your acknowledgement includes:</p>
            {[
              "The signer’s name and role",
              "The date and time",
              "A snapshot of the permit",
              "A unique reference and verification link",
            ].map((s) => (
              <div key={s}>
                <Check size={16} />
                {s}
              </div>
            ))}
            <div className="sign-explainer-note">
              <FileCheck2 size={19} />
              <p>
                Changes to the saved record or permit are flagged when you check
                it.
              </p>
            </div>
          </section>
          <section className="panel sign-explainer" id="receipts">
            <h2>Check a record</h2>
            <ReceiptFinder />
            <h3>Recent acknowledgements</h3>
            {signatures.length ? (
              signatures.slice(0, 8).map((s) => (
                <Link
                  className="signature-list-row"
                  key={s.token}
                  href={`/signatures/${s.token}`}
                >
                  <CheckCircle2 size={19} />
                  <div>
                    <strong>{s.payload.signerName}</strong>
                    <small>{s.payload.permitNumber}</small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))
            ) : (
              <p>
                No acknowledgements yet. Choose a permit to create the first
                one.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
