"use client";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { useWeekly } from "./store";
import { dateLabel, initials } from "./model";
export function WeeklyFrame({ children }: { children: React.ReactNode }) {
  const { actor, now, enabled, error, signOut } = useWeekly();
  return (
    <div className="weekly-app">
      <header className="weekly-header">
        <Link className="weekly-brand" href="/">
          <span>PCG</span>
          <strong>ePTW</strong>
        </Link>
        {actor && (
          <div className="weekly-person">
            <span className="weekly-avatar">{initials(actor.name)}</span>
            <div>
              <strong>{actor.name}</strong>
              <small>
                {actor.role} · IC •••• {actor.icLast4}
              </small>
            </div>
            <button aria-label="Sign out of weekly workspace" onClick={signOut}>
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>
      <div className="weekly-demo">
        <span>
          <i />
          LOCAL WORKFLOW DEMO
        </span>
        <p>
          Tabs in this browser sync. Separate phones are not connected. Use
          sample IC details only.
        </p>
      </div>
      <main className="weekly-main">
        {!enabled ? (
          <div className="error-message">
            This workflow is not connected to live storage.{" "}
            <Link href="/staff-login">Use staff sign-in</Link>.
          </div>
        ) : (
          <>
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
            {children}
          </>
        )}
      </main>
      <footer className="weekly-footer">
        <span>
          <ShieldCheck size={14} />
          PCG Permit to Work
        </span>
        <span>{dateLabel(now.toISOString())} · Malaysia time</span>
      </footer>
    </div>
  );
}
