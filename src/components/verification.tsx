"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useStore } from "./store";
import { permitStatus } from "./permit-table";
import { Permit } from "@/lib/domain";
export function Verification({
  token,
  record,
}: {
  token: string;
  record: Permit | null;
}) {
  const { demo, permits, ready } = useStore();
  const [liveRecord, setLiveRecord] = useState(record);
  const [available, setAvailable] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch(
          `/api/verify/${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Unavailable");
        const { record: r } = await response.json();
        if (cancelled) return;
        setAvailable(true);
        setCheckedAt(
          new Date().toLocaleTimeString("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
          }),
        );
        setLiveRecord(
          r
            ? {
                id: "public-verification",
                number: r.number,
                title: r.title,
                type: r.type,
                location: r.location,
                contractor: r.contractor,
                holder: r.holder,
                start: r.start,
                end: r.end,
                status: r.status,
                workers: r.workers,
                department: "",
                risk: "Low",
                token,
              }
            : null,
        );
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    check();
    const interval = setInterval(check, 10000);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [token, demo]);
  const p = demo ? permits.find((p) => p.token === token) : liveRecord;
  if (demo && !ready) return <div className="empty">Checking permit…</div>;
  const status = p ? permitStatus(p, demo) : "NOT_FOUND";
  const valid = available && p && status === "ACTIVE" && p.workActive !== false;
  const Icon = valid ? ShieldCheck : ShieldX;
  return (
    <div className="verify-page">
      <div className={`verify-banner ${valid ? "" : "invalid"}`}>
        <Icon size={48} />
        <h1>
          {!available
            ? "VERIFICATION UNAVAILABLE"
            : valid
              ? "VALID PERMIT"
              : status === "NOT_FOUND"
                ? "PERMIT NOT FOUND"
                : `PERMIT ${status.replaceAll("_", " ")}`}
        </h1>
        <p>
          {valid
            ? "Work is within the approved permit validity."
            : "WORK MUST NOT CONTINUE"}
        </p>
        {demo && <p>DEMO VERIFICATION · SAMPLE DATA ONLY</p>}
        {!demo && checkedAt && (
          <p>Last checked {checkedAt} MYT · refreshes every 10 seconds</p>
        )}
      </div>
      <div className="verify-content">
        {p ? (
          <>
            <div className="eyebrow">PCG ePTW · ON-SITE VERIFICATION</div>
            <h2>{p.number}</h2>
            <p style={{ color: "#8796a9", fontSize: 12, marginBottom: 25 }}>
              {p.title}
            </p>
            <dl className="info-grid">
              {[
                ["Type", p.type],
                ["Location", p.location],
                ["Contractor", p.contractor],
                ["Permit holder", p.holder],
                ["Approved workers", String(p.workers)],
                [
                  "Validity",
                  `${new Date(p.start).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} — ${new Date(p.end).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`,
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="inline-notice" style={{ marginTop: 25 }}>
              <ShieldCheck size={17} />
              {demo
                ? "Sample permit status does not authorize real work."
                : "Confirm the current site controls before work. A valid permit does not replace on-site safety checks."}
            </div>
          </>
        ) : (
          <p>
            The verification link is invalid or unavailable. Contact the permit
            issuer before beginning work.
          </p>
        )}
        <p style={{ fontSize: 10, color: "#a2adbb", marginTop: 20 }}>
          PCG Electronic Permit to Work & Safety Control System
        </p>
        {demo && (
          <Link href="/" className="button secondary" style={{ marginTop: 20 }}>
            Back to demo workspace
          </Link>
        )}
      </div>
    </div>
  );
}
