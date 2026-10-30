"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Wizard } from "@/components/wizard";
import {
  addDays,
  effectiveWeeklyStatus,
  localDay,
  PartyRole,
  WeeklyPermit,
} from "./model";
import { applicationInput, newApplication } from "./application";
import { WeeklyFrame } from "./frame";
import { WeeklyLogin } from "./login";
import { useWeekly } from "./store";

function DetailedCreate({ permit }: { permit?: WeeklyPermit }) {
  const { actor, now, command } = useWeekly();
  const [initial] = useState(() => ({
    draft: permit?.application
      ? structuredClone(permit.application)
      : newApplication(
          actor!.name,
          actor!.role as PartyRole,
          localDay(now),
          addDays(localDay(now), 6),
        ),
    revision: permit?.revision ?? null,
  }));
  const permitId = permit?.id;
  const actorId = actor!.id;
  const shared = useMemo(
    () => ({
      initialDraft: initial.draft,
      revision: initial.revision,
      editing: !!permitId,
      storageKey: `pcg-weekly-application-${actorId}-${permitId ?? "new"}`,
      onSubmit: async (application: typeof initial.draft) => {
        const saved = await command(
          permitId
            ? {
                type: "UPDATE_APPLICATION",
                permitId,
                expectedRevision: initial.revision!,
                application,
              }
            : { type: "CREATE", input: applicationInput(application) },
        );
        return saved.id;
      },
    }),
    [initial, actorId, permitId, command],
  );
  return (
    <div className="weekly-detailed-create">
      <Wizard shared={shared} />
    </div>
  );
}

export function CreateWeekly({ editId }: { editId?: string }) {
  const { actor, state, ready, now } = useWeekly();
  const permit = editId
    ? state.permits.find((p) => p.id === editId)
    : undefined;
  const editable =
    !editId ||
    !!(
      permit?.application &&
      permit.createdBy === actor?.id &&
      ["COLLECTING", "HSE_REVIEW"].includes(effectiveWeeklyStatus(permit, now))
    );
  return (
    <WeeklyFrame>
      {!ready ? (
        <div className="weekly-loading">Loading…</div>
      ) : !actor ? (
        <WeeklyLogin />
      ) : !["Requester", "Issuer"].includes(actor.role) ? (
        <div className="weekly-card weekly-empty">
          <h2>Ask an Issuer or Requester to create the permit.</h2>
          <p>Then open its QR to complete your part.</p>
          <Link className="weekly-button secondary" href="/">
            Back to my permits
          </Link>
        </div>
      ) : !editable ? (
        <div className="weekly-card weekly-empty">
          <h2>This detailed work plan cannot be edited here.</h2>
          <p>
            Only its creator can edit it before activation. Ask HSE to return
            approved work for changes.
          </p>
          <Link className="weekly-button secondary" href="/">
            Back to my permits
          </Link>
        </div>
      ) : (
        <DetailedCreate
          key={`${actor.id}:${editId ?? "new"}`}
          permit={permit}
        />
      )}
    </WeeklyFrame>
  );
}
