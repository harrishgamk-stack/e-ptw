"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { emptyDraft } from "@/lib/domain";
import { useStore } from "./store";
import { Field } from "./ui";
export function QuickPermit() {
  const { save } = useStore(),
    router = useRouter();
  const [title, setTitle] = useState(""),
    [location, setLocation] = useState(""),
    [holder, setHolder] = useState(""),
    [company, setCompany] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="simple-workspace narrow">
      <div className="simple-heading">
        <span className="eyebrow">STEP 1 · WORK DETAILS</span>
        <h1>Start a permit</h1>
        <p>
          Just the essentials to get started. Complete the safety details before
          submission.
        </p>
      </div>
      <form
        className="panel simple-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (start && end && new Date(end) <= new Date(start))
              throw new Error("End time must be after the start time.");
            const id = await save({
              ...structuredClone(emptyDraft),
              title,
              location,
              holder,
              contractor: company,
              start,
              end,
              description: title,
            });
            router.push(`/permits/${id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <div className="full">
            <Field label="What work is planned?" required>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Replace the warehouse ventilation fan"
              />
            </Field>
          </div>
          <Field label="Work location" required>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Warehouse A"
            />
          </Field>
          <Field label="Permit holder" required>
            <input
              required
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Person responsible for the work"
            />
          </Field>
          <div className="full">
            <Field label="Company / contractor">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
              />
            </Field>
          </div>
          <Field label="Planned start">
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Planned end">
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}
        <div className="simple-form-footer">
          <p>
            <FilePlus2 size={16} />
            Saved as a draft. Work is not authorized.
          </p>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save draft"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
      <Link className="simple-text-link" href="/permits/new">
        Open the full safety form instead →
      </Link>
    </div>
  );
}
