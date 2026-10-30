"use client";
import { Draft, riskLevel } from "@/lib/domain";
import { Field, Risk } from "./ui";
export function HazardFields({
  value,
  onChange,
}: {
  value: Draft["hazards"];
  onChange: (value: Draft["hazards"]) => void;
}) {
  function update(index: number, patch: Partial<Draft["hazards"][number]>) {
    onChange(value.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }
  return (
    <>
      {value.map((h, index) => (
        <div className="risk-card" key={h.id}>
          <div className="risk-card-head">
            <h3>
              {h.activity
                ? `${h.activity} risk assessment`
                : `Hazard ${index + 1}`}
            </h3>
            {!h.activity && (
              <button
                type="button"
                aria-label={`Remove hazard ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
          <div className="form-grid">
            {(
              [
                "hazard",
                "consequence",
                "affected",
                "controls",
                "responsible",
              ] as const
            ).map((key, i) => (
              <Field
                key={key}
                label={
                  [
                    "Hazard",
                    "Potential consequence",
                    "Who may be affected",
                    "Controls / additional measures",
                    "Responsible person",
                  ][i]
                }
                required
              >
                <input
                  value={h[key]}
                  onChange={(e) => update(index, { [key]: e.target.value })}
                />
              </Field>
            ))}
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
                  value={h[key]}
                  onChange={(e) =>
                    update(index, { [key]: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option value={n} key={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <div className="score-display">
            <span>
              Initial: <b>{h.likelihood * h.severity}</b>
            </span>
            <Risk risk={riskLevel(h.likelihood * h.severity)} />
            <span>
              Residual: <b>{h.residualLikelihood * h.residualSeverity}</b>
            </span>
            <Risk risk={riskLevel(h.residualLikelihood * h.residualSeverity)} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              hazard: "",
              consequence: "",
              affected: "",
              controls: "",
              responsible: "",
              likelihood: 3,
              severity: 3,
              residualLikelihood: 2,
              residualSeverity: 2,
            },
          ])
        }
      >
        Add hazard
      </button>
    </>
  );
}
