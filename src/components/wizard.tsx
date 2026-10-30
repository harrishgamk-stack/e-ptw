"use client";
import { useEffect, useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  CloudCheck,
  FileUp,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  activities,
  Draft,
  draftSchema,
  emptyDraft,
  ppeOptions,
  safetyControls,
  specialControls,
  submissionIssues,
} from "@/lib/domain";
import { useStore } from "./store";
import { HazardFields } from "./hazard-fields";
import { ContractorFields } from "./contractor-fields";
import {
  AssessmentFields,
  GeneratedRequirements,
  documentIssue,
  emptyAssessment,
} from "./activity-requirements";
import {
  companyAssessmentIssues,
  contractorNames,
  departments,
  selectActivities,
  workRequirements,
  prepareDraftForForm,
} from "@/lib/work-policy";
import { Field, TypeIcon } from "./ui";
import { supabaseBrowser } from "@/lib/supabase/client";
const steps = [
  "Work Details",
  "People & Contractor",
  "Work Activities",
  "Risk Assessment",
  "Safety Requirements",
  "Special Permits",
  "Documents",
  "Review & Submit",
];
const locations = [
  "Warehouse A",
  "Production Block A",
  "Production Block B",
  "Utilities Plant",
  "Electrical Room 2",
  "Pump House",
  "Logistics Centre",
  "Admin Building",
  "Other location",
];
type FieldsProps = { form: UseFormReturn<Draft> };
function WorkFields({ form: { register, watch } }: FieldsProps) {
  return (
    <div className="form-grid">
      <Field label="Work title" required>
        <input
          {...register("title")}
          placeholder="e.g. Conveyor support bracket welding"
        />
      </Field>
      <Field label="Department" required>
        <select {...register("department")}>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Work location" required>
        <select {...register("location")}>
          <option value="">Select location</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Machinery / equipment">
        <input
          {...register("equipment")}
          placeholder="Equipment name or asset ID"
        />
      </Field>
      {watch("location") === "Other location" && (
        <div className="full">
          <Field label="Other location & justification" required>
            <input {...register("otherLocation")} />
          </Field>
        </div>
      )}
      <Field label="Work area">
        <input {...register("area")} placeholder="Specific work area" />
      </Field>
      <Field label="Planned start" required>
        <input type="datetime-local" {...register("start")} />
      </Field>
      <Field label="Planned end" required>
        <input type="datetime-local" {...register("end")} />
      </Field>
      <div className="full">
        <Field label="Description of work" required>
          <textarea
            {...register("description")}
            placeholder="Describe the work scope, method and equipment involved."
          />
        </Field>
      </div>
      <div className="full">
        <Field label="Purpose of work" required>
          <textarea
            {...register("purpose")}
            placeholder="Why is this work needed?"
          />
        </Field>
      </div>
      <Field label="Production impact">
        <select {...register("impact")}>
          <option>None</option>
          <option>Partial interruption</option>
          <option>Full shutdown</option>
        </select>
      </Field>
      <Field label="Other notes">
        <input {...register("notes")} />
      </Field>
      <label className="check">
        <input type="checkbox" {...register("shutdown")} />
        Shutdown required
      </label>
      <label className="check">
        <input type="checkbox" {...register("emergency")} />
        Emergency work
      </label>
    </div>
  );
}
function PeopleFields({ form: { register, watch, setValue } }: FieldsProps) {
  const workers = watch("workers");
  return (
    <>
      <h3 style={{ marginBottom: 18 }}>Requester & permit holder</h3>
      <div className="form-grid">
        <Field label="Requester name" required>
          <input {...register("requester")} />
        </Field>
        <Field label="Requester Department" required>
          <input
            {...register("requesterDepartment")}
            list="pcg-requester-departments"
            placeholder="e.g. Mixing, Blowing or Extrusion"
          />
          <datalist id="pcg-requester-departments">
            {departments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Field>
        <Field label="Phone" required>
          <input type="tel" {...register("phone")} />
        </Field>
        <Field label="Permit holder" required>
          <input {...register("holder")} />
        </Field>
        <Field label="Holder phone">
          <input type="tel" {...register("holderPhone")} />
        </Field>
      </div>
      <h3 className="form-section-title">Contractors & Safety Induction</h3>
      <ContractorFields
        value={watch("contractors") ?? []}
        onChange={(contractors) => {
          setValue("contractors", contractors, { shouldDirty: true });
          setValue(
            "contractor",
            contractors
              .map((c) => c.name.trim())
              .filter(Boolean)
              .join("; "),
          );
        }}
      />
      <h3 className="form-section-title">
        Workers / permit users ({workers.length})
      </h3>
      {workers.map((w, i) => (
        <div className="worker-row" key={w.id}>
          <div>
            <h3>Worker {i + 1}</h3>
            <button
              type="button"
              aria-label={`Remove worker ${i + 1}`}
              onClick={() =>
                setValue(
                  "workers",
                  workers.filter((x) => x.id !== w.id),
                )
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="form-grid">
            {(
              [
                "name",
                "identity",
                "company",
                "trade",
                "phone",
                "competency",
              ] as const
            ).map((f, j) => (
              <Field
                label={
                  [
                    "Full name",
                    "Employee / ID / passport",
                    "Company",
                    "Trade / role",
                    "Phone",
                    "Competency",
                  ][j]
                }
                key={f}
                required={j < 4}
              >
                <input {...register(`workers.${i}.${f}`)} />
              </Field>
            ))}
            <Field label="Certificate expiry" required>
              <input type="date" {...register(`workers.${i}.expiry`)} />
            </Field>
            <div style={{ display: "grid", gap: 12 }}>
              <label className="check">
                <input type="checkbox" {...register(`workers.${i}.inducted`)} />
                Safety induction completed
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  {...register(`workers.${i}.acknowledged`)}
                />
                Worker acknowledgement recorded
              </label>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          setValue("workers", [
            ...workers,
            {
              id: crypto.randomUUID(),
              name: "",
              identity: "",
              company: watch("contractors")?.[0]?.name || watch("department"),
              trade: "",
              phone: "",
              competency: "",
              expiry: "",
              inducted: false,
              acknowledged: false,
            },
          ])
        }
      >
        <Plus size={15} />
        Add worker
      </button>
    </>
  );
}
function RiskFields({ form }: FieldsProps) {
  const { watch, setValue, getValues } = form;
  const [assessmentError, setAssessmentError] = useState("");
  const hazards = watch("hazards");
  return (
    <>
      <div className="inline-notice">
        <ShieldCheck size={17} />
        Assess initial and residual risk. Extreme residual risk blocks
        submission. Risk limits require PCG HSE approval before live use.
      </div>
      {workRequirements(watch("activities"), hazards).formalAssessment && (
        <AssessmentFields
          activities={watch("activities")}
          value={watch("companyRiskAssessment")}
          onChange={(r) =>
            setValue("companyRiskAssessment", r, { shouldDirty: true })
          }
          error={assessmentError}
          onDocument={(file) => {
            const issue = documentIssue(file);
            setAssessmentError(issue);
            if (issue) return;
            const r = getValues("companyRiskAssessment") ?? emptyAssessment;
            setValue(
              "companyRiskAssessment",
              { ...r, documentName: file.name },
              { shouldDirty: true },
            );
            setValue(
              "documents",
              [
                ...getValues("documents").filter((d) => d.name !== file.name),
                {
                  name: file.name,
                  type: "Company risk assessment",
                  path: "local-demo-metadata",
                  expiry: "",
                },
              ],
              { shouldDirty: true },
            );
          }}
        />
      )}
      <HazardFields
        value={hazards}
        onChange={(hazards) =>
          setValue("hazards", hazards, { shouldDirty: true })
        }
      />
    </>
  );
}
function SpecialFields({ form: { watch, setValue } }: FieldsProps) {
  const selected = watch("activities"),
    special = watch("special");
  const set = (key: string, value: string) =>
    setValue("special", { ...special, [key]: value }, { shouldDirty: true });
  const fields: Record<string, string[]> = {
    "Mechanical work": [
      "Isolation type",
      "Energy source",
      "Isolation point",
      "Lock number",
      "Tag number",
      "Person applying lock",
      "Date/time applied",
      "Verified by",
      "Photo evidence reference",
    ],
    "Electrical work": [
      "Isolation type",
      "Energy source",
      "Isolation point",
      "Lock number",
      "Tag number",
      "Person applying lock",
      "Date/time applied",
      "Verified by",
    ],
    "Hot Work": [
      "Hot work type",
      "Hot-work location",
      "ATEX area",
      "Fire watch person",
      "Detector isolation required",
      "Detector isolated by",
      "Detector isolation date/time",
      "Validity start",
      "Validity end",
      "Comments",
    ],
    "Confined Space": [
      "Space name / ID",
      "Entry purpose",
      "Attendant / safety watch",
      "Entry supervisor",
      "Rescue team",
      "Communication method",
      "Instrument ID",
      "Calibration validity",
      "Gas parameters / units / measured values",
      "Test timestamp",
      "Measured by",
      "Approved limits reference",
    ],
    "Working at height": [
      "Height (m)",
      "Work method",
      "Fall protection",
      "Inspection document reference",
    ],
    "Hoisting / lifting": [
      "Lift type",
      "Crane / equipment",
      "SWL",
      "Load weight",
      "Operator",
      "Rigger",
      "Signalman",
      "Certificate expiry",
    ],
    "Environmental impact": [
      "Chemical name",
      "Storage arrangements",
      "Waste disposal arrangements",
      "Disposal responsibility",
      "Additional precautions",
    ],
  };
  return (
    <>
      <GeneratedRequirements activities={selected} />
      {!selected.some((a) => specialControls[a]) && (
        <div className="inline-notice">
          <ShieldCheck size={17} />
          No specialist module is triggered by your selected activities. HSE may
          add controls during review.
        </div>
      )}
      {selected
        .filter((a) => specialControls[a])
        .map((a) => (
          <div className="detail-block" key={a}>
            <h3 className="form-section-title">{a} controls</h3>
            <div className="form-grid">
              {(fields[a] ?? []).map((f) => (
                <Field label={f} key={f}>
                  <input
                    value={special[`${a}:${f}`] ?? ""}
                    onChange={(e) => set(`${a}:${f}`, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <div className="generated-control-summary">
              <p>
                Automatically activated by Work Activities. Confirm these
                controls under Safety Requirements; no permit selection is
                needed here.
              </p>
              <ul>
                {specialControls[a].map((c) => (
                  <li key={c}>
                    {special[`${a}:${c}`] === "yes" ? "✓" : "○"} {c}
                  </li>
                ))}
              </ul>
            </div>
            {a === "Confined Space" && (
              <div style={{ marginTop: 20 }}>
                <div className="error-message">
                  Entry is prohibited until required atmospheric readings pass
                  PCG-approved limits. This declaration requires supporting test
                  evidence.
                </div>
                <Field label="Atmospheric test result">
                  <select
                    value={special.gasResult ?? ""}
                    onChange={(e) => set("gasResult", e.target.value)}
                  >
                    <option value="">Not tested</option>
                    <option>PASS</option>
                    <option>FAIL</option>
                  </select>
                </Field>
              </div>
            )}
          </div>
        ))}
    </>
  );
}
export type SharedWizard = {
  initialDraft: Draft;
  storageKey: string;
  revision: number | null;
  editing: boolean;
  onSubmit: (draft: Draft) => Promise<string>;
};
export function Wizard({
  editId,
  shared,
}: {
  editId?: string;
  shared?: SharedWizard;
}) {
  const {
      save,
      transition,
      permits,
      demo: storeDemo,
      ready: storeReady,
    } = useStore(),
    router = useRouter();
  const demo = !!shared || storeDemo,
    ready = !!shared || storeReady;
  const [step, setStep] = useState(0),
    [id, setId] = useState(editId),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [lastSaved, setLastSaved] = useState("Not saved yet"),
    [uploading, setUploading] = useState(false);
  const idRef = useRef(editId),
    restored = useRef(false),
    submitted = useRef(false);
  const form = useForm<Draft>({
    resolver: zodResolver(draftSchema),
    defaultValues: emptyDraft,
  });
  const { register, watch, setValue, getValues, reset } = form;
  const data = watch();
  const storageKey =
    shared?.storageKey ?? (editId ? `pcg-wizard-${editId}` : "pcg-wizard");
  const sharedMode = !!shared,
    sharedRevision = shared?.revision ?? null;
  useEffect(() => {
    if (ready && !restored.current) {
      const permit = editId ? permits.find((p) => p.id === editId) : undefined;
      let recovered = false;
      if (demo) {
        try {
          const local = localStorage.getItem(storageKey);
          if (local) {
            const saved = JSON.parse(local);
            if (!shared || saved.revision === shared.revision) {
              reset(
                prepareDraftForForm(
                  draftSchema.parse(shared ? saved.draft : saved),
                ),
              );
              recovered = true;
              if (shared) setLastSaved("Saved draft restored on this device");
            } else setLastSaved("Permit changed. Loaded the latest work plan.");
          }
        } catch {
          /* Ignore obsolete local draft. */
        }
      }
      if (!recovered && permit?.draft) reset(prepareDraftForForm(permit.draft));
      if (!recovered && shared) reset(prepareDraftForForm(shared.initialDraft));
      restored.current = true;
    }
  }, [ready, editId, permits, demo, reset, storageKey, shared]);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line react-hooks/incompatible-library -- React Compiler is not enabled; RHF subscription intentionally observes draft changes.
    const subscription = watch((values) => {
      if (!restored.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (demo && !submitted.current) {
          localStorage.setItem(
            storageKey,
            JSON.stringify(
              sharedMode ? { draft: values, revision: sharedRevision } : values,
            ),
          );
          setLastSaved("Draft autosaved on this device");
        }
      }, 700);
    });
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [watch, demo, storageKey, sharedMode, sharedRevision]);
  const toggle = (field: "activities" | "ppe" | "controls", value: string) => {
    if (field === "activities") {
      const current = getValues();
      const selected = current.activities.includes(value)
        ? current.activities.filter((a) => a !== value)
        : [...current.activities, value];
      const generated = selectActivities(current, selected);
      for (const key of [
        "activities",
        "ppe",
        "hazards",
        "special",
        "requirementsVersion",
      ] as const)
        setValue(key, generated[key], { shouldDirty: true });
      return;
    }
    const current = getValues(field);
    setValue(
      field,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
      { shouldDirty: true },
    );
  };
  async function saveDraft() {
    setSaving(true);
    setError("");
    try {
      if (shared) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ draft: getValues(), revision: shared.revision }),
        );
        setLastSaved(
          "Draft saved on this device. Continue when ready to share.",
        );
        return;
      }
      const current = getValues();
      const savedId = await save(
        {
          ...current,
          contractor: contractorNames(current),
          ppe: [
            ...new Set([
              ...current.ppe,
              ...workRequirements(current.activities).ppe,
            ]),
          ],
        },
        idRef.current,
      );
      idRef.current = savedId;
      setId(savedId);
      setLastSaved(
        `Last saved ${new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`,
      );
      return savedId;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
      return undefined;
    } finally {
      setSaving(false);
    }
  }
  async function submit() {
    if (shared) {
      setSaving(true);
      setError("");
      try {
        if (!getValues("confirmed"))
          throw new Error(
            "Confirm the work plan before creating the shared permit.",
          );
        const assessmentIssues = companyAssessmentIssues(getValues());
        if (assessmentIssues.length)
          throw new Error(assessmentIssues.join("\n"));
        const permitId = await shared.onSubmit(getValues());
        submitted.current = true;
        localStorage.removeItem(storageKey);
        router.push(`/work/${permitId}`);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to save the shared permit.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    const current = getValues();
    const issues = submissionIssues({
      ...current,
      ppe: [
        ...new Set([
          ...current.ppe,
          ...workRequirements(current.activities).ppe,
        ]),
      ],
    });
    if (issues.length) {
      setError(issues.join("\n"));
      return;
    }
    const savedId = await saveDraft();
    if (savedId) {
      try {
        await transition(
          savedId,
          "SUBMITTED",
          "Requester confirmed information and required safety controls.",
        );
        if (demo) localStorage.removeItem(storageKey);
        router.push(`/permits/${savedId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const results = [...getValues("documents")];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("Documents must be 10 MB or less.");
        if (
          ![
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type)
        )
          throw new Error("Use PDF, JPG, PNG or WebP documents.");
        let path = "local-demo-metadata";
        if (!demo) {
          const permitId = idRef.current ?? (await saveDraft());
          if (!permitId) throw new Error("Save the draft before uploading.");
          const name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          path = `${permitId}/${crypto.randomUUID()}-${name}`;
          const { error } = await supabaseBrowser()
            .storage.from("permit-documents")
            .upload(path, file, { upsert: false });
          if (error) throw error;
        }
        results.push({
          name: file.name,
          type: "Supporting document",
          path,
          expiry: "",
        });
      }
      setValue("documents", results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }
  return (
    <>
      <Link className="back-link" href={shared ? "/" : "/permits"}>
        <ChevronLeft size={14} />
        {shared ? "My permit" : "Back to permits"}
      </Link>
      <div className="page-intro heading-row">
        <div>
          <h1>
            {editId || shared?.editing ? "Edit permit" : "Create a new permit"}
          </h1>
          <p>Plan the work. Identify the risks. Put safety first.</p>
          {shared && (
            <p>
              Choose up to seven calendar days. Planned times use Malaysia time.
              Share the QR after creating the work plan.
            </p>
          )}
        </div>
        <span className="saved-state">
          <CloudCheck size={15} />
          {lastSaved}
        </span>
      </div>
      <div className="wizard-layout">
        <aside className="panel wizard-steps">
          {steps.map((s, i) => (
            <button
              key={s}
              className={`wizard-step ${step === i ? "current" : step > i ? "done" : ""}`}
              onClick={() => setStep(i)}
            >
              <span>{step > i ? <Check size={12} /> : i + 1}</span>
              {s}
            </button>
          ))}
          <p className="wizard-hint">
            {shared
              ? "Save a draft at any step. After creation, share the QR so all three parties can review, complete their sections and sign."
              : "Your work can be saved at every step. Submission requires complete safety information."}
          </p>
        </aside>
        <section className="panel wizard-content">
          <div className="eyebrow">STEP {step + 1} OF 8</div>
          <h2>{steps[step]}</h2>
          <p>
            {
              [
                "Tell us what work is planned and where it will take place.",
                "Identify the people responsible for the work.",
                "Select all activities that apply. Relevant safety modules will be added.",
                "Identify hazards and reduce risks before work starts.",
                "Confirm the protective equipment and site controls.",
                "Complete the controls triggered by your work activities.",
                "Attach the supporting evidence for safe work.",
                shared
                  ? "Review the work plan before sharing it with the three parties."
                  : "Check every detail before sending your permit for review.",
              ][step]
            }
          </p>
          {step === 0 && <WorkFields form={form} />}
          {step === 1 && <PeopleFields form={form} />}
          {step === 2 && (
            <>
              <div className="activity-choices">
                {activities.map((a) => (
                  <button
                    type="button"
                    className={`activity-choice ${data.activities.includes(a) ? "chosen" : ""}`}
                    key={a}
                    onClick={() => toggle("activities", a)}
                  >
                    <TypeIcon type={a} />
                    {a}
                    {data.activities.includes(a) && <Check size={13} />}
                  </button>
                ))}
              </div>
              <GeneratedRequirements
                activities={data.activities}
                hazards={data.hazards}
              />
              <div className="inline-notice" style={{ marginTop: 22 }}>
                <ShieldCheck size={17} />
                Specialist controls are required for machinery isolation, hot
                work, confined spaces, lifting and work at height.
              </div>
            </>
          )}
          {step === 3 && <RiskFields form={form} />}
          {step === 4 && (
            <>
              <h3 style={{ marginBottom: 18 }}>Required PPE</h3>
              <div className="checks-grid">
                {ppeOptions.map((p) => (
                  <label key={p} className="check">
                    <input
                      type="checkbox"
                      checked={
                        workRequirements(data.activities).ppe.includes(p) ||
                        data.ppe.includes(p)
                      }
                      disabled={workRequirements(data.activities).ppe.includes(
                        p,
                      )}
                      onChange={() => toggle("ppe", p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
              <h3 className="form-section-title">Workplace safety controls</h3>
              <div className="checks-grid">
                {safetyControls.map((c) => (
                  <label key={c} className="check">
                    <input
                      type="checkbox"
                      checked={data.controls.includes(c)}
                      onChange={() => toggle("controls", c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
              {workRequirements(data.activities, data.hazards).permits.map(
                (permit) => (
                  <section
                    className="generated-control-group"
                    key={permit.activity}
                  >
                    <h3>{permit.title} — required controls</h3>
                    <div className="checks-grid">
                      {permit.controls.map((c) => (
                        <label className="check" key={c}>
                          <input
                            type="checkbox"
                            checked={
                              data.special[`${permit.activity}:${c}`] === "yes"
                            }
                            onChange={(e) =>
                              setValue(
                                "special",
                                {
                                  ...getValues("special"),
                                  [`${permit.activity}:${c}`]: e.target.checked
                                    ? "yes"
                                    : "no",
                                },
                                { shouldDirty: true },
                              )
                            }
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                    {permit.activity === "Hot Work" && (
                      <div className="form-grid">
                        <Field label="Hot Work gas testing" required>
                          <select {...register("special.gasTesting")}>
                            <option value="">Select applicability</option>
                            <option value="required">Gas test required</option>
                            <option value="not-required">
                              Not required — justification recorded
                            </option>
                          </select>
                        </Field>
                        {data.special.gasTesting === "not-required" && (
                          <Field
                            label="Gas testing not required — justification"
                            required
                          >
                            <input {...register("special.gasJustification")} />
                          </Field>
                        )}
                      </div>
                    )}
                  </section>
                ),
              )}
              <div style={{ marginTop: 24 }}>
                {shared && (
                  <Field label="Emergency / rescue arrangements">
                    <textarea
                      {...register("special.emergencyPlan")}
                      placeholder="Emergency contacts, assembly point and rescue arrangements."
                    />
                  </Field>
                )}
                <Field label="Toolbox meeting">
                  <select {...register("toolbox")}>
                    <option>Not required</option>
                    <option>Once before work</option>
                    <option>Daily</option>
                  </select>
                </Field>
              </div>
            </>
          )}
          {step === 5 && <SpecialFields form={form} />}
          {step === 6 && (
            <>
              <div className="inline-notice">
                <FileUp size={17} />
                {shared
                  ? "Local demo: document names, types and expiry dates are retained. File contents are not uploaded or shared."
                  : demo
                    ? "Demo mode retains document names only. File contents are uploaded to private Supabase Storage after connection."
                    : "Documents are stored privately. Access requires permit authorization."}
              </div>
              <Field label="Upload documents (PDF or images, up to 10 MB each)">
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  capture="environment"
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files)}
                />
              </Field>
              {data.documents.map((d, i) => (
                <div className="risk-card" key={`${d.path}-${i}`}>
                  <div className="risk-card-head">
                    <strong>{d.name}</strong>
                    <button
                      type="button"
                      aria-label={`Remove ${d.name}`}
                      onClick={() =>
                        setValue(
                          "documents",
                          data.documents.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="form-grid">
                    <Field label="Document type">
                      <select {...register(`documents.${i}.type`)}>
                        {[
                          "Supporting document",
                          "Company risk assessment",
                          "Risk assessment",
                          "Method statement",
                          "SDS",
                          "Contractor certificate",
                          "Competency certificate",
                          "LOTO documentation",
                          "Lifting certificate",
                          "Scaffold certificate",
                          "Hot Work supporting document",
                          "Confined Space documentation",
                          "Site photos",
                          "Other",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Expiry (if applicable)">
                      <input
                        type="date"
                        {...register(`documents.${i}.expiry`)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </>
          )}
          {step === 7 && (
            <>
              {[
                [
                  "Work",
                  `${data.title} · ${data.department} · ${data.location}`,
                ],
                [
                  "Validity",
                  `${data.start.replace("T", " ")} → ${data.end.replace("T", " ")}`,
                ],
                [
                  "People",
                  `${data.holder} · ${contractorNames(data) || "Internal work"} · ${data.workers.length} workers`,
                ],
                ["Activities", data.activities.join(", ")],
                ["Risk assessment", `${data.hazards.length} hazards recorded`],
                ["PPE", data.ppe.join(", ")],
                [
                  "Safety controls",
                  `${data.controls.length} / ${safetyControls.length} complete`,
                ],
                ["Documents", `${data.documents.length} supporting documents`],
              ].map(([title, value]) => (
                <div className="review-section" key={title}>
                  <h3>{title}</h3>
                  <p>{value || "Not provided"}</p>
                </div>
              ))}
              {!shared &&
                submissionIssues({ ...data, confirmed: true }).length > 0 && (
                  <div className="error-message">
                    <strong>Requirements to resolve</strong>
                    <ul style={{ paddingLeft: 18 }}>
                      {submissionIssues({ ...data, confirmed: true }).map(
                        (issue) => (
                          <li key={issue}>{issue}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              {shared && (
                <div className="inline-notice">
                  <ShieldCheck size={17} />
                  Creating the permit does not approve work or sign for anyone.
                  Each party must review and sign, then HSE reviews and
                  activates it. Incomplete safety details can be completed
                  through the shared QR.
                </div>
              )}
              <label className="check" style={{ marginTop: 20 }}>
                <input type="checkbox" {...register("confirmed")} />I confirm
                that the information provided is correct and the required safety
                controls have been considered.
              </label>
            </>
          )}
          {error && (
            <div
              role="alert"
              className="error-message"
              style={{ whiteSpace: "pre-line" }}
            >
              {error}
            </div>
          )}
          <div className="wizard-footer">
            <button
              className="button secondary"
              type="button"
              disabled={saving}
              onClick={saveDraft}
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save draft"}
            </button>
            <div>
              {step > 0 && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setStep(step - 1);
                    setError("");
                    window.scrollTo(0, 0);
                  }}
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              )}
              {step < 7 ? (
                <button
                  className="button primary"
                  onClick={() => {
                    setStep(step + 1);
                    setError("");
                    window.scrollTo(0, 0);
                  }}
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={saving || uploading}
                  onClick={submit}
                >
                  {shared
                    ? shared.editing
                      ? "Save updated work plan"
                      : "Create & get QR"
                    : "Submit permit"}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
          {id && <span className="sr-only">Draft {id}</span>}
        </section>
      </div>
    </>
  );
}
