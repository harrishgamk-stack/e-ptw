"use client";
import { useState } from "react";
import { Check, Save } from "lucide-react";
import { Field } from "@/components/ui";
import {
  activities,
  ppeOptions,
  safetyControls,
  specialControls,
} from "@/lib/domain";
import { PartyData, PartyRole, WeeklyPermit } from "./model";
import { useWeekly } from "./store";
const activityOptions = ["General work", ...activities];
export function SectionForm({
  permit,
  role,
}: {
  permit: WeeklyPermit;
  role: PartyRole;
}) {
  const { command } = useWeekly();
  const [data, setData] = useState<PartyData>(() =>
      structuredClone(permit.sections[role].data),
    ),
    [base, setBase] = useState(permit.sections[role].revision),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function set<K extends keyof PartyData>(key: K, value: PartyData[K]) {
    setData((previous) => ({ ...previous, [key]: value }));
    setMessage("");
  }
  const toggle = (
    key: "activities" | "ppe" | "generalControls",
    value: string,
  ) =>
    set(
      key,
      data[key].includes(value)
        ? data[key].filter((v) => v !== value)
        : [...data[key], value],
    );
  const special = (key: string, value: string) =>
    set("special", { ...data.special, [key]: value });
  const stale = base !== permit.sections[role].revision;
  return (
    <form
      className="weekly-section-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const updated = await command({
            type: "SAVE",
            permitId: permit.id,
            role,
            expectedRevision: base,
            data,
          });
          setBase(updated.sections[role].revision);
          setMessage(
            "Your section is saved. The other parties can see it in their tabs.",
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {stale && (
        <div className="error-message">
          Your section was updated in another tab. Your unsaved input has been
          kept.
          <button
            type="button"
            className="weekly-button secondary"
            onClick={() => {
              setData(structuredClone(permit.sections[role].data));
              setBase(permit.sections[role].revision);
              setError("");
            }}
          >
            Load latest section
          </button>
        </div>
      )}
      {role === "Requester" && (
        <>
          <div className="weekly-form-grid">
            <Field label="Company / department" required>
              <input
                value={data.company}
                onChange={(e) => set("company", e.target.value)}
              />
            </Field>
            <Field label="Machinery / equipment">
              <input
                value={data.equipment}
                onChange={(e) => set("equipment", e.target.value)}
              />
            </Field>
            <div className="wide">
              <Field label="Work scope" required>
                <textarea
                  value={data.scope}
                  onChange={(e) => set("scope", e.target.value)}
                  placeholder="Describe the work and how it will be carried out."
                />
              </Field>
            </div>
          </div>
          <h3>What activities are involved?</h3>
          <div className="weekly-choice-grid">
            {activityOptions.map((a) => (
              <label
                className={`weekly-choice ${data.activities.includes(a) ? "chosen" : ""}`}
                key={a}
              >
                <input
                  type="checkbox"
                  checked={data.activities.includes(a)}
                  onChange={() => toggle("activities", a)}
                />
                {a}
              </label>
            ))}
          </div>
          <details className="weekly-disclosure">
            <summary>Risk assessment</summary>
            <div className="weekly-form-grid">
              <Field label="Main hazard" required>
                <input
                  value={data.hazard}
                  onChange={(e) => set("hazard", e.target.value)}
                  placeholder="e.g. Unexpected movement of equipment"
                />
              </Field>
              <Field label="Potential consequence" required>
                <input
                  value={data.consequence}
                  onChange={(e) => set("consequence", e.target.value)}
                />
              </Field>
              <div className="wide">
                <Field label="Risk control measures" required>
                  <textarea
                    value={data.riskControls}
                    onChange={(e) => set("riskControls", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Person responsible for controls" required>
                <input
                  value={data.responsible}
                  onChange={(e) => set("responsible", e.target.value)}
                />
              </Field>
              {(
                [
                  "likelihood",
                  "severity",
                  "residualLikelihood",
                  "residualSeverity",
                ] as const
              ).map((key, i) => (
                <Field
                  key={key}
                  label={
                    [
                      "Initial likelihood",
                      "Initial severity",
                      "Residual likelihood",
                      "Residual severity",
                    ][i]
                  }
                >
                  <select
                    value={data[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <p className="weekly-muted">
              Initial score {data.likelihood * data.severity} · Residual score{" "}
              {data.residualLikelihood * data.residualSeverity}. An extreme
              residual score (17–25) blocks signing.
            </p>
          </details>
        </>
      )}
      {role === "Issuer" && (
        <>
          <h3>Required PPE</h3>
          <div className="weekly-check-grid">
            {ppeOptions.map((p) => (
              <label className="check" key={p}>
                <input
                  type="checkbox"
                  checked={data.ppe.includes(p)}
                  onChange={() => toggle("ppe", p)}
                />
                {p}
              </label>
            ))}
          </div>
          <h3>Site safety checks</h3>
          <div className="weekly-check-grid">
            {safetyControls.map((c) => (
              <label className="check" key={c}>
                <input
                  type="checkbox"
                  checked={data.generalControls.includes(c)}
                  onChange={() => toggle("generalControls", c)}
                />
                {c}
              </label>
            ))}
          </div>
          <Field label="Emergency / rescue arrangements" required>
            <textarea
              value={data.emergencyPlan}
              onChange={(e) => set("emergencyPlan", e.target.value)}
              placeholder="Emergency contacts, assembly point and rescue arrangements."
            />
          </Field>
          {permit.sections.Requester.data.activities
            .filter((a) => specialControls[a])
            .map((a) => (
              <details key={a} className="weekly-disclosure" open>
                <summary>{a} controls</summary>
                <div className="weekly-check-grid">
                  {specialControls[a].map((c) => (
                    <label className="check" key={c}>
                      <input
                        type="checkbox"
                        checked={data.special[`${a}:${c}`] === "yes"}
                        onChange={(e) =>
                          special(`${a}:${c}`, e.target.checked ? "yes" : "no")
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </details>
            ))}
          {permit.sections.Requester.data.activities.some((a) =>
            ["Mechanical work", "Electrical work", "Confined Space"].includes(
              a,
            ),
          ) && (
            <div className="weekly-form-grid">
              {["isolationPoint", "lockNumber", "verifiedBy"].map((key, i) => (
                <Field
                  label={
                    [
                      "Isolation point",
                      "Lock number",
                      "Zero-energy verified by",
                    ][i]
                  }
                  key={key}
                  required
                >
                  <input
                    value={data.special[key] ?? ""}
                    onChange={(e) => special(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          )}
          {permit.sections.Requester.data.activities.includes("Hot Work") && (
            <Field label="Fire watch person" required>
              <input
                value={data.special.fireWatch ?? ""}
                onChange={(e) => special("fireWatch", e.target.value)}
              />
            </Field>
          )}
          {permit.sections.Requester.data.activities.includes(
            "Confined Space",
          ) && (
            <div className="weekly-form-grid">
              {[
                "spaceName",
                "attendant",
                "entrySupervisor",
                "rescueTeam",
                "gasEvidence",
              ].map((key, i) => (
                <Field
                  label={
                    [
                      "Space name / ID",
                      "Attendant",
                      "Entry supervisor",
                      "Rescue team",
                      "Gas-test evidence / approved limits reference",
                    ][i]
                  }
                  key={key}
                  required
                >
                  <input
                    value={data.special[key] ?? ""}
                    onChange={(e) => special(key, e.target.value)}
                  />
                </Field>
              ))}
              <p className="weekly-muted wide">
                A current passing gas check must also be recorded under
                Monitoring before HSE approval and each entry. A failed or stale
                check blocks entry.
              </p>
            </div>
          )}
        </>
      )}
      {role === "Holder" && (
        <>
          <div className="weekly-form-grid">
            <div className="wide">
              <Field label="Team / worker names" required>
                <textarea
                  value={data.teamNames}
                  onChange={(e) => set("teamNames", e.target.value)}
                  placeholder="Names of the workers covered by this permit"
                />
              </Field>
            </div>
            <Field label="Number of workers" required>
              <input
                type="number"
                min={1}
                max={1000}
                value={data.workerCount || ""}
                onChange={(e) => set("workerCount", Number(e.target.value))}
              />
            </Field>
            <Field label="Contact phone" required>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
          </div>
          <div className="weekly-check-list">
            {(["toolbox", "competent", "understood"] as const).map((key, i) => (
              <label className="check" key={key}>
                <input
                  type="checkbox"
                  checked={data[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {
                  [
                    "The team has received the toolbox / safety briefing.",
                    "The team’s competencies and induction are current.",
                    "I understand the work scope, permit conditions and stop-work responsibilities.",
                  ][i]
                }
              </label>
            ))}
          </div>
        </>
      )}
      {message && (
        <div className="weekly-success">
          <Check size={16} />
          {message}
        </div>
      )}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <div className="weekly-section-footer">
        <p>
          Saving changes requires all three parties to sign the updated
          revision.
        </p>
        <button className="weekly-button primary" disabled={busy || stale}>
          <Save size={16} />
          {busy ? "Saving…" : "Save my section"}
        </button>
      </div>
    </form>
  );
}
