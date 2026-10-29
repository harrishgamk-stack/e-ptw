"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { canRead } from "./engine";
import {
  dateLabel,
  effectiveWeeklyStatus,
  hasTodaySignature,
  WeeklyPermit,
} from "./model";
import { WeeklyFrame } from "./frame";
import { WeeklyLogin } from "./login";
import { useWeekly } from "./store";
import { HseWorkspace } from "../hse/workspace";
export function WeeklyStatus({ permit }: { permit: WeeklyPermit }) {
  const { now } = useWeekly();
  const status = effectiveWeeklyStatus(permit, now);
  return (
    <span className={`weekly-status ${status.toLowerCase()}`}>
      <i />
      {
        (
          {
            COLLECTING: "Complete & sign",
            HSE_REVIEW: "With HSE",
            ACTIVE: "Active",
            SUSPENDED: "Suspended",
            SCHEDULED: "Starts soon",
            EXPIRED: "Expired",
            CLOSED: "Closed",
          } as Record<string, string>
        )[status]
      }
    </span>
  );
}
export function WeeklyHome() {
  const { state, actor, ready, now } = useWeekly();
  const router = useRouter(),
    [link, setLink] = useState(""),
    [error, setError] = useState("");
  const mine = actor ? state.permits.filter((p) => canRead(p, actor)) : [];
  if (ready && actor?.role === "HSE") return <HseWorkspace />;
  return (
    <WeeklyFrame>
      {!ready ? (
        <div className="weekly-loading">Opening your workspace…</div>
      ) : !actor ? (
        <WeeklyLogin />
      ) : (
        <>
          <div className="weekly-page-heading">
            <div>
              <span className="weekly-eyebrow">YOUR WORKSPACE</span>
              <h1>My permit</h1>
              <p>
                {actor.role === "Holder"
                  ? "Open your permit and sign for today. The same QR works throughout its validity."
                  : "Create a permit for the work period. Complete your section and share the QR."}
              </p>
            </div>
            {["Issuer", "Requester"].includes(actor.role) && (
              <Link className="weekly-button primary" href="/new-permit">
                <FilePlus2 size={17} />
                Create permit
              </Link>
            )}
          </div>

          <div className="weekly-permits">
            {mine.map((p) => (
              <Link
                className="weekly-card weekly-permit-card"
                key={p.id}
                href={`/work/${p.id}`}
              >
                <div className="weekly-card-top">
                  <span>{p.number}</span>
                  <WeeklyStatus permit={p} />
                </div>
                <h2>{p.title}</h2>
                <p>
                  <MapPin size={15} />
                  {p.location}
                </p>
                <div className="weekly-validity">
                  <span>
                    {dateLabel(p.start)} — {dateLabel(p.end)}
                  </span>
                  <strong>Up to 7 days</strong>
                </div>
                <div className="weekly-permit-card-footer">
                  {effectiveWeeklyStatus(p, now) === "ACTIVE" ? (
                    <span
                      className={
                        hasTodaySignature(p, now) ? "signed" : "pending"
                      }
                    >
                      <CheckCircle2 size={16} />
                      {hasTodaySignature(p, now)
                        ? "Holder signed for today"
                        : "Holder needs to sign for today"}
                    </span>
                  ) : (
                    <span>
                      <ShieldCheck size={16} />
                      {p.status === "HSE_REVIEW"
                        ? "All three parties signed · HSE review next"
                        : "One shared permit · three sections"}
                    </span>
                  )}
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))}
            {!mine.length && (
              <div className="weekly-card weekly-empty">
                <QrCode size={36} />
                <h2>
                  {actor.role === "Holder"
                    ? "Open the permit QR to join"
                    : "Your permits will appear here"}
                </h2>
                <p>
                  You only see permits you created or joined. Ask the creator
                  for the shared QR or link.
                </p>
              </div>
            )}
          </div>
          <form
            className="weekly-card weekly-open-qr"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const token = link.trim().split("/").pop()?.split("?")[0];
                if (!token || !state.permits.some((p) => p.token === token))
                  throw new Error(
                    "This permit is not in this browser. For the local demo, use another tab in the same browser.",
                  );
                setError("");
                router.push(`/join/${token}`);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Unable to open this link.",
                );
              }
            }}
          >
            <QrCode size={23} />
            <div>
              <h3>Have a permit QR link?</h3>
              <p>Paste it here to join, or open it directly from the QR.</p>
            </div>
            <input
              aria-label="Permit QR link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste permit link"
              required
            />
            <button className="weekly-button secondary">
              Open
              <ArrowRight size={15} />
            </button>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="weekly-bottom-note">
            <ShieldCheck size={16} />
            Initial approval happens once. Daily Holder signatures never extend
            the permit or override a suspension.
          </p>
        </>
      )}
    </WeeklyFrame>
  );
}
