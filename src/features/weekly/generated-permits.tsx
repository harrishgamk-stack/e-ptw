import { subPermitReference, workRequirements } from "@/lib/work-policy";
import { effectiveWeeklyStatus, WeeklyPermit } from "./model";
import { useWeekly } from "./store";
export function GeneratedPermits({ permit }: { permit: WeeklyPermit }) {
  const { now } = useWeekly();
  const required = workRequirements(
    permit.sections.Requester.data.activities,
    permit.application?.hazards,
  );
  const status = effectiveWeeklyStatus(permit, now);
  if (!required.permits.length) return null;
  return (
    <section className="generated-permit-records">
      <h3>Automatically generated sub-permits</h3>
      <p>
        These sub-permits share the parent permit’s validity, revision,
        signatures and HSE decision.
      </p>
      {required.permits.map((p) => {
        const ready = p.controls.every(
          (c) =>
            permit.sections.Issuer.data.special[`${p.activity}:${c}`] === "yes",
        );
        return (
          <div className="weekly-application-item" key={p.activity}>
            <strong>{p.title}</strong>
            <p>
              {subPermitReference(permit.number, p.activity)} ·{" "}
              {status === "ACTIVE"
                ? "Active with parent permit"
                : ["SUSPENDED", "EXPIRED", "CLOSED"].includes(status)
                  ? `${status} — work must not continue`
                  : ready
                    ? "Controls recorded · awaiting signatures / HSE decision"
                    : "Required controls pending"}
            </p>
            <ul>
              {p.controls.map((c) => (
                <li key={c}>
                  {permit.sections.Issuer.data.special[`${p.activity}:${c}`] ===
                  "yes"
                    ? "✓"
                    : "○"}{" "}
                  {c}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="approval-route">{required.route}</p>
    </section>
  );
}
