"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, QrCode, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  dateLabel,
  effectiveWeeklyStatus,
  hasTodaySignature,
  PartyRole,
} from "./model";
import { WeeklyFrame } from "./frame";
import { WeeklyLogin } from "./login";
import { WeeklyStatus } from "./home";
import { useWeekly } from "./store";
import { gasCurrent } from "./engine";
export function JoinWeekly({ token }: { token: string }) {
  const { state, actor, ready, now, command } = useWeekly(),
    router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const p = state.permits.find((p) => p.token === token);
  if (!ready)
    return (
      <WeeklyFrame>
        <div className="weekly-loading">Checking this permit…</div>
      </WeeklyFrame>
    );
  if (!p)
    return (
      <WeeklyFrame>
        <div className="weekly-card weekly-empty">
          <QrCode size={38} />
          <h1>Permit not available in this browser</h1>
          <p>
            This is a local demo. Its QR links work in tabs of the browser where
            the permit was created. Separate phones need connected storage.
          </p>
          <Link className="weekly-button primary" href="/">
            Open my workspace
          </Link>
        </div>
      </WeeklyFrame>
    );
  const status = effectiveWeeklyStatus(p, now),
    stop = ["EXPIRED", "SUSPENDED", "CLOSED"].includes(status),
    joined =
      actor &&
      (actor.role === "HSE" || p.members[actor.role as PartyRole] === actor.id);
  return (
    <WeeklyFrame>
      <div className="weekly-qr-verification">
        <QrCode size={30} />
        <span className="weekly-eyebrow">SHARED PERMIT QR</span>
        <h1>{p.title}</h1>
        <p>
          {p.number} · {p.location}
        </p>
        <WeeklyStatus permit={p} />
        <p>
          {dateLabel(p.start)} — {dateLabel(p.end)}
        </p>
        {stop ? (
          <div className="weekly-stop">
            <TriangleAlert size={22} />
            <div>
              <strong>WORK MUST NOT CONTINUE</strong>
              <p>
                {p.suspensionReason ?? `The permit is ${status.toLowerCase()}.`}
              </p>
            </div>
          </div>
        ) : status === "ACTIVE" && !gasCurrent(p, now) ? (
          <div className="weekly-stop">
            <TriangleAlert size={23} />
            <div>
              <strong>ENTRY BLOCKED — GAS CHECK REQUIRED</strong>
              <p>
                A current passing gas test is required before work can continue.
              </p>
            </div>
          </div>
        ) : status === "ACTIVE" ? (
          <div className="weekly-info">
            <ShieldCheck size={22} />
            <p>
              {hasTodaySignature(p, now)
                ? "HSE approval and today’s Holder signature are recorded. Confirm current controls before work."
                : "HSE has approved this permit. The Holder still needs to sign for today."}
            </p>
          </div>
        ) : (
          <div className="weekly-info">
            <ShieldCheck size={21} />
            <p>
              Complete the shared permit and collect all three signatures. HSE
              approval is required before activation.
            </p>
          </div>
        )}
        {actor && (
          <>
            <p>
              Signed in as <strong>{actor.name}</strong> · {actor.role}
            </p>
            {joined ? (
              <Link
                className="weekly-button primary"
                href={`/work/${p.id}${actor.role === "Holder" ? "#today" : ""}`}
              >
                {actor.role === "HSE"
                  ? "Review & monitor permit"
                  : actor.role === "Holder" && status === "ACTIVE"
                    ? "Open permit & sign for today"
                    : "Open my section"}
                <ArrowRight size={17} />
              </Link>
            ) : (
              <button
                className="weekly-button primary"
                disabled={busy || stop}
                onClick={async () => {
                  setError("");
                  setBusy(true);
                  try {
                    const joined = await command({ type: "JOIN", token });
                    router.push(`/work/${joined.id}`);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Unable to join.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Joining…" : `Join as ${actor.role}`}
                <ArrowRight size={17} />
              </button>
            )}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
          </>
        )}
      </div>
      {!actor && <WeeklyLogin />}
    </WeeklyFrame>
  );
}
