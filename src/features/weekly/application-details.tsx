import { Draft } from "@/lib/domain";

export function ApplicationDetails({ application: a }: { application: Draft }) {
  return (
    <section className="weekly-application-details">
      <h3>Detailed permit application</h3>
      <dl className="weekly-definition-grid">
        {[
          [
            "Department / work area",
            [a.department, a.area].filter(Boolean).join(" · "),
          ],
          ["Purpose of work", a.purpose],
          [
            "Production impact",
            `${a.impact} · Shutdown ${a.shutdown ? "required" : "not required"} · ${a.emergency ? "Emergency work" : "Planned work"}`,
          ],
          ["Additional notes", a.notes],
          [
            "Requester contact",
            [a.requester, a.requesterDepartment, a.phone]
              .filter(Boolean)
              .join(" · "),
          ],
          [
            "Planned Holder contact",
            [a.holder, a.holderPhone].filter(Boolean).join(" · "),
          ],
          ["Toolbox meeting plan", a.toolbox],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value || "Not recorded"}</dd>
          </div>
        ))}
      </dl>
      <h4>Contractors & Safety Induction</h4>
      {(a.contractors ?? []).map((c, index) => (
        <div className="weekly-application-item" key={c.id}>
          <strong>
            Contractor {index + 1}: {c.name || "Name pending"}
          </strong>
          <p>
            {c.phone || "Phone pending"} · Safety Induction{" "}
            {c.safetyInduction ? "completed" : "pending"} · Acknowledgement{" "}
            {c.acknowledged ? "recorded" : "pending"}
          </p>
        </div>
      ))}
      {a.companyRiskAssessment && (
        <div className="weekly-application-item">
          <strong>Formal company risk assessment</strong>
          <p>
            {a.companyRiskAssessment.reference} ·{" "}
            {a.companyRiskAssessment.assessedBy} ·{" "}
            {a.companyRiskAssessment.assessmentDate}
          </p>
          <p>
            {a.companyRiskAssessment.documentName} ·{" "}
            {a.companyRiskAssessment.completed
              ? "Completed declaration recorded"
              : "Completion pending"}
          </p>
        </div>
      )}
      <h4>All recorded hazards ({a.hazards.length})</h4>
      {a.hazards.map((h, index) => (
        <div className="weekly-application-item" key={h.id}>
          <strong>
            {index + 1}. {h.hazard || "Hazard to complete"}
          </strong>
          <p>
            Consequence: {h.consequence || "Not recorded"} · People affected:{" "}
            {h.affected || "Not recorded"}
          </p>
          <p>Controls: {h.controls || "Not recorded"}</p>
          <p>
            Initial score {h.likelihood * h.severity} → residual{" "}
            {h.residualLikelihood * h.residualSeverity} · Responsible:{" "}
            {h.responsible || "Not recorded"}
          </p>
        </div>
      ))}
      <h4>Worker details ({a.workers.length})</h4>
      {a.workers.map((w) => (
        <div className="weekly-application-item" key={w.id}>
          <strong>{w.name || "Worker to complete"}</strong>
          <p>
            {[w.company, w.trade, w.phone].filter(Boolean).join(" · ") ||
              "Company / trade / contact not recorded"}
          </p>
          <p>
            {w.competency || "Competency not recorded"}
            {w.expiry ? ` · Expiry ${w.expiry}` : ""} · Induction{" "}
            {w.inducted ? "recorded" : "pending"}
          </p>
        </div>
      ))}
      <h4>Supporting document register ({a.documents.length})</h4>
      <p className="weekly-muted">
        Local demo: filenames and document details only. File contents are not
        uploaded or shared.
      </p>
      {a.documents.map((d, index) => (
        <div className="weekly-application-item" key={`${d.name}-${index}`}>
          <strong>{d.name}</strong>
          <p>
            {d.type}
            {d.expiry ? ` · Expiry ${d.expiry}` : ""}
          </p>
        </div>
      ))}
    </section>
  );
}
