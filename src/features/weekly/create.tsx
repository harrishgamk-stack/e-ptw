"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, QrCode } from "lucide-react";
import { Field } from "@/components/ui";
import { addDays, localDay } from "./model";
import { WeeklyFrame } from "./frame";
import { WeeklyLogin } from "./login";
import { useWeekly } from "./store";
function CreateForm() {
  const { now, command } = useWeekly(),
    router = useRouter();
  const [title, setTitle] = useState(""),
    [location, setLocation] = useState(""),
    [startDay, setStart] = useState(localDay(now)),
    [endDay, setEnd] = useState(addDays(localDay(now), 6)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="weekly-narrow">
      <Link className="back-link" href="/">
        <ArrowLeft size={14} />
        My permit
      </Link>
      <div className="weekly-page-heading">
        <div>
          <span className="weekly-eyebrow">START THE SHARED PERMIT</span>
          <h1>One permit for your work period.</h1>
          <p>
            Create it once. Share its QR so Requester, Issuer and Holder can
            fill their own sections.
          </p>
        </div>
      </div>
      <form
        className="weekly-card weekly-create"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const p = await command({
              type: "CREATE",
              input: { title, location, startDay, endDay },
            });
            router.push(`/work/${p.id}`);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to create permit.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="What work is planned?" required>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Warehouse ventilation maintenance"
          />
        </Field>
        <Field label="Work location" required>
          <input
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Warehouse A"
          />
        </Field>
        <div className="weekly-form-grid">
          <Field label="First day" required>
            <input
              required
              type="date"
              value={startDay}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Last day" required>
            <input
              required
              type="date"
              min={startDay}
              max={addDays(startDay, 6)}
              value={endDay}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <div className="weekly-info">
          <QrCode size={21} />
          <p>
            The QR stays the same throughout this period. Work can begin only
            after all three parties sign and HSE approves.
          </p>
        </div>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <button className="weekly-button primary" disabled={busy}>
          {busy ? "Creating…" : "Create & get QR"}
          <ArrowRight size={17} />
        </button>
      </form>
    </div>
  );
}
export function CreateWeekly() {
  const { actor, ready } = useWeekly();
  return (
    <WeeklyFrame>
      {!ready ? (
        <div className="weekly-loading">Loading…</div>
      ) : !actor ? (
        <WeeklyLogin />
      ) : ["Requester", "Issuer"].includes(actor.role) ? (
        <CreateForm />
      ) : (
        <div className="weekly-card weekly-empty">
          <h2>Ask an Issuer or Requester to create the permit.</h2>
          <p>Then open its QR to complete your part.</p>
          <Link className="weekly-button secondary" href="/">
            Back to my permits
          </Link>
        </div>
      )}
    </WeeklyFrame>
  );
}
