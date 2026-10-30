"use client";
import { Contractor } from "@/lib/domain";
import { Field } from "./ui";
export function ContractorFields({
  value,
  onChange,
}: {
  value: Contractor[];
  onChange: (value: Contractor[]) => void;
}) {
  function update(index: number, patch: Partial<Contractor>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  return (
    <div className="contractor-fields">
      <Field label="Number of contractors">
        <select
          value={value.length}
          onChange={(e) => {
            const count = Number(e.target.value);
            onChange(
              Array.from(
                { length: count },
                (_, i) =>
                  value[i] ?? {
                    id: crypto.randomUUID(),
                    name: "",
                    phone: "",
                    safetyInduction: false,
                    acknowledged: false,
                  },
              ),
            );
          }}
        >
          {Array.from({ length: 26 }, (_, i) => (
            <option key={i} value={i}>
              {i === 0 ? "0 — Internal work" : i}
            </option>
          ))}
        </select>
      </Field>
      {value.map((c, index) => (
        <fieldset className="contractor-card" key={c.id}>
          <legend>Contractor {index + 1}</legend>
          <div className="form-grid">
            <Field label="Contractor Name" required>
              <input
                value={c.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            </Field>
            <Field label="Phone Number" required>
              <input
                type="tel"
                value={c.phone}
                onChange={(e) => update(index, { phone: e.target.value })}
              />
            </Field>
          </div>
          <div className="checks-grid">
            <label className="check">
              <input
                type="checkbox"
                checked={c.safetyInduction}
                onChange={(e) =>
                  update(index, { safetyInduction: e.target.checked })
                }
              />
              Safety Induction completed
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={c.acknowledged}
                onChange={(e) =>
                  update(index, { acknowledged: e.target.checked })
                }
              />
              Safety Induction acknowledged
            </label>
          </div>
        </fieldset>
      ))}
    </div>
  );
}
