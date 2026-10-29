"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Field } from "@/components/ui";
import { useStore } from "@/components/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CompanyBrand } from "./company-brand";
export default function Login() {
  const { demo } = useStore(),
    router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="brand">
          <CompanyBrand />
        </div>
        <div>
          <ShieldCheck
            size={42}
            style={{ color: "var(--brand-mint)", marginBottom: 25 }}
          />
          <h1>Safer work starts with a clear plan.</h1>
          <p>
            Your people, permits and critical safety controls. Connected in one
            trusted workspace.
          </p>
        </div>
        <small>Electronic Permit to Work & Safety Control System</small>
      </div>
      <div className="login-form-panel">
        <form
          className="login-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            if (demo) {
              setError(
                "This workspace is in local demo mode. Use the demo button below, or configure Supabase to sign in.",
              );
              setBusy(false);
              return;
            }
            const { error } = await supabaseBrowser().auth.signInWithPassword({
              email,
              password,
            });
            if (error) {
              setError("Unable to sign in. Check your email and password.");
              setBusy(false);
            } else {
              router.push("/");
              router.refresh();
            }
          }}
        >
          <div className="eyebrow">PCG SAFETY WORKSPACE</div>
          <h2>Welcome back</h2>
          <p>Sign in to manage permits and keep work safe.</p>
          <Field label="Work email">
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="name@pcg.com.my"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to workspace"}
            <ArrowRight size={15} />
          </button>
          {demo && (
            <Link href="/" className="button secondary">
              Explore local demo
              <ArrowRight size={15} />
            </Link>
          )}
          <p className="login-note">
            Access is restricted to authorized personnel. Account and role
            provisioning is managed by your PCG administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
