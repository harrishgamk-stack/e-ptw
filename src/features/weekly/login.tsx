"use client";
import { useState } from "react";
import { ArrowRight, QrCode, ShieldCheck } from "lucide-react";
import { Field } from "@/components/ui";
import { Role } from "./model";
import { useWeekly } from "./store";
const examples: [string, string, Role][] = [
  ["Demo Requester", "000000000001", "Requester"],
  ["Demo Issuer", "000000000002", "Issuer"],
  ["Demo Holder", "000000000003", "Holder"],
  ["Demo HSE", "000000000004", "HSE"],
];
export function WeeklyLogin() {
  const { signIn } = useWeekly();
  const [name, setName] = useState(""),
    [ic, setIc] = useState(""),
    [role, setRole] = useState<Role>("Requester"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function enter(n = name, i = ic, r = role) {
    setBusy(true);
    setError("");
    try {
      await signIn(n, i, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="weekly-login">
      <section className="weekly-login-message">
        <span className="weekly-eyebrow">ONE PERMIT. ONE SHARED WORKFLOW.</span>
        <h1>
          Plan once. <br />
          Sign in each day.
          <br />
          <em>Work together.</em>
        </h1>
        <p>
          Requester, Issuer and Holder complete one permit. HSE reviews it once.
          The same QR brings the Holder back for each day’s signature.
        </p>
        <div>
          <QrCode size={19} />
          One QR for the whole permit period.
        </div>
      </section>
      <form
        className="weekly-card weekly-login-form"
        onSubmit={(e) => {
          e.preventDefault();
          enter();
        }}
      >
        <div className="weekly-form-icon">
          <ShieldCheck size={25} />
        </div>
        <h2>Find your permit</h2>
        <p>Use your name and demo IC to return to your permits.</p>
        <Field label="Full name" required>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
          />
        </Field>
        <Field label="IC number" required>
          <input
            required
            value={ic}
            onChange={(e) => setIc(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000000-00-0001"
          />
        </Field>
        <Field label="Demo role on first visit">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {["Requester", "Issuer", "Holder", "HSE"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <button className="weekly-button primary" disabled={busy}>
          {busy ? "Opening…" : "Continue"}
          <ArrowRight size={17} />
        </button>
        <p className="weekly-small">
          Demo access only. Name and IC are not proof of identity; staff
          verification will be required for a live system.
        </p>
        <div className="weekly-sample-users">
          <span>Or try a sample person</span>
          <div>
            {examples.map(([n, i, r]) => (
              <button
                type="button"
                key={r}
                disabled={busy}
                onClick={() => enter(n, i, r)}
              >
                Try as {r}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
