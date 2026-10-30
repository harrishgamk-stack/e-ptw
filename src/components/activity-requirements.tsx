"use client";
import { CompanyAssessment, Draft } from "@/lib/domain";
import { activityKey, workRequirements } from "@/lib/work-policy";
import { Field } from "./ui";
export const emptyAssessment: CompanyAssessment = {
  reference: "",
  assessedBy: "",
  assessmentDate: "",
  documentName: "",
  completed: false,
};
export function AssessmentFields({
  value,
  onChange,
  onDocument,
  error,
  activities,
}: {
  value?: CompanyAssessment;
  onChange: (value: CompanyAssessment) => void;
  onDocument: (file: File) => void;
  error?: string;
  activities: string[];
}) {
  const r = value ?? emptyAssessment;
  return (
    <section className="company-assessment">
      <h3>Formal company risk assessment</h3>
      <p>
        Required for the selected high-risk work. Record the company assessment
        before submitting.
      </p>
      <div className="form-grid">
        <Field label="Company risk assessment reference" required>
          <input
            value={r.reference}
            onChange={(e) => onChange({ ...r, reference: e.target.value })}
          />
        </Field>
        <Field label="Assessed by" required>
          <input
            value={r.assessedBy}
            onChange={(e) => onChange({ ...r, assessedBy: e.target.value })}
          />
        </Field>
        <Field label="Assessment date" required>
          <input
            type="date"
            value={r.assessmentDate}
            onChange={(e) => onChange({ ...r, assessmentDate: e.target.value })}
          />
        </Field>
        <Field label="Company risk assessment document" required>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onDocument(file);
            }}
          />
        </Field>
      </div>
      {r.documentName && (
        <p>
          Registered assessment: <strong>{r.documentName}</strong>
        </p>
      )}
      <p className="document-demo-note">
        Local demo: document details are retained; file contents are not
        uploaded or verified.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={r.completed}
          onChange={(e) =>
            onChange({
              ...r,
              completed: e.target.checked,
              activitiesKey: activityKey(activities),
            })
          }
        />
        The formal company risk assessment is completed and covers these
        activities.
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function GeneratedRequirements({
  activities,
  hazards = [],
}: {
  activities: string[];
  hazards?: Draft["hazards"];
}) {
  const required = workRequirements(activities, hazards);
  if (!activities.length)
    return (
      <div className="inline-notice">
        Select work activities to generate the risk assessment, required PPE,
        controls and sub-permits.
      </div>
    );
  return (
    <section className="generated-requirements">
      <h3>Automatically generated requirements</h3>
      <p>
        <strong>
          {required.formalAssessment
            ? "High-risk work · Formal company risk assessment required"
            : "General work · Normal risk assessment required"}
        </strong>
      </p>
      <div className="generated-permits">
        {required.permits.map((p) => (
          <span key={p.activity}>{p.title}</span>
        ))}
        {!required.permits.length && (
          <span>
            {required.formalAssessment
              ? "High Risk Work Permit"
              : "General work permit"}
          </span>
        )}
      </div>
      <p>Required PPE: {required.ppe.join(", ")}</p>
      <p className="approval-route">
        <strong>Approval route:</strong> {required.route}
      </p>
      <p>
        Permit types and safety requirements follow your activities
        automatically. Confirm site controls once under Safety Requirements.
      </p>
    </section>
  );
}
export function documentIssue(file: File) {
  return file.size > 10 * 1024 * 1024
    ? "Documents must be 10 MB or less."
    : !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(
          file.type,
        )
      ? "Use a PDF or an image for the company risk assessment."
      : "";
}
