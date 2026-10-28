"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { demoPermits, demoAudit } from "@/lib/demo";
import {
  Acknowledgement,
  SignerInput,
  createAcknowledgement,
} from "@/lib/acknowledgement";
import {
  AuditEvent,
  Permit,
  Draft,
  Status,
  transitions,
  submissionIssues,
  effectiveStatus,
  riskLevel,
} from "@/lib/domain";
type Store = {
  permits: Permit[];
  audit: AuditEvent[];
  demo: boolean;
  ready: boolean;
  signatures: Acknowledgement[];
  sign: (permitId: string, input: SignerInput) => Promise<string>;
  loadError: string;
  can: (permission: string) => boolean;
  save: (draft: Draft, id?: string) => Promise<string>;
  transition: (
    id: string,
    status: Status,
    reason: string,
    checks?: Record<string, boolean>,
  ) => Promise<void>;
  operation: (
    id: string,
    action: string,
    reason: string,
    value?: string,
  ) => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({
  children,
  demo,
}: {
  children: React.ReactNode;
  demo: boolean;
}) {
  const [permits, setPermits] = useState<Permit[]>(demo ? demoPermits : []),
    [audit, setAudit] = useState<AuditEvent[]>(demo ? demoAudit : []),
    [ready, setReady] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const [signatures, setSignatures] = useState<Acknowledgement[]>([]);
  const latestPermits = useRef<Permit[]>(demo ? demoPermits : []);
  useEffect(() => {
    latestPermits.current = permits;
  }, [permits]);
  const refresh = useCallback(async () => {
    if (demo) return;
    const response = await fetch("/api/permits");
    if (!response.ok)
      throw new Error("Unable to load permits. Please sign in again.");
    const data = await response.json();
    setPermissions(data.permissions ?? []);
    setLoadError("");
    latestPermits.current = data.permits;
    setPermits(data.permits);
    setAudit(data.audit);
  }, [demo]);
  useEffect(() => {
    if (demo) {
      try {
        const saved = localStorage.getItem("pcg-pilot-v1");
        if (saved) {
          const data = JSON.parse(saved);
          latestPermits.current = data.permits;
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate persisted browser state after SSR.
          setPermits(data.permits);
          setAudit(data.audit);
          setSignatures(data.signatures ?? []);
        }
      } catch {
        localStorage.removeItem("pcg-pilot-v1");
      }
      setReady(true);
    } else {
      refresh()
        .catch(() => {
          setLoadError(
            "Workspace data is unavailable. Do not rely on permit status until the connection is restored.",
          );
        })
        .finally(() => setReady(true));
    }
  }, [demo, refresh]);
  useEffect(() => {
    if (demo && ready)
      localStorage.setItem(
        "pcg-pilot-v1",
        JSON.stringify({ permits, audit, signatures }),
      );
  }, [permits, audit, signatures, demo, ready]);
  useEffect(() => {
    if (!demo) return;
    const synchronize = (event: StorageEvent) => {
      if (event.key !== "pcg-pilot-v1" || !event.newValue) return;
      try {
        const data = JSON.parse(event.newValue);
        latestPermits.current = data.permits;
        setPermits(data.permits);
        setAudit(data.audit);
        setSignatures(data.signatures ?? []);
      } catch {
        /* Ignore malformed external storage. */
      }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [demo]);
  useEffect(() => {
    if (demo) return;
    const synchronize = () => {
      if (
        !document.hidden &&
        !location.pathname.startsWith("/login") &&
        !location.pathname.startsWith("/verify")
      )
        refresh().catch(() =>
          setLoadError(
            "Workspace data could not be refreshed. Reconnect before relying on permit status.",
          ),
        );
    };
    const interval = setInterval(synchronize, 15000);
    window.addEventListener("focus", synchronize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", synchronize);
    };
  }, [demo, refresh]);
  const event = (permitId: string, action: string, reason: string) =>
    setAudit((prev) => [
      {
        id: crypto.randomUUID(),
        permitId,
        action,
        actor: "Sarah Lim · HSE (demo)",
        at: new Date().toISOString(),
        reason,
      },
      ...prev,
    ]);
  async function sign(permitId: string, input: SignerInput) {
    if (!demo)
      throw new Error(
        "Signing is currently available in the local demo. Authenticated signing has not been enabled for connected workspaces.",
      );
    const permit = latestPermits.current.find((p) => p.id === permitId);
    if (!permit) throw new Error("Select a permit first.");
    const status = effectiveStatus(
      permit,
      permit.id.startsWith("demo-")
        ? new Date("2026-10-28T11:50:00+08:00")
        : new Date(),
    );
    if (["CLOSED", "CANCELLED", "SUSPENDED", "EXPIRED"].includes(status))
      throw new Error(
        "This permit cannot receive a new acknowledgement in its current state.",
      );
    const receipt = await createAcknowledgement(permit, input);
    setSignatures((previous) => [receipt, ...previous]);
    event(
      permitId,
      "Digital acknowledgement recorded (demo)",
      `${receipt.payload.signerName} · ${receipt.payload.signerRole}. Receipt ${receipt.token}. SHA-256 ${receipt.receiptHash}. Identity is not authenticated in demo mode.`,
    );
    return receipt.token;
  }
  async function save(draft: Draft, id?: string) {
    if (!demo) {
      const response = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      return result.id as string;
    }
    const current = latestPermits.current.find((p) => p.id === id);
    if (current && !["DRAFT", "CHANGES_REQUIRED"].includes(current.status))
      throw new Error("Only drafts and returned permits can be edited.");
    const nextId = id ?? crypto.randomUUID();
    const risk = riskLevel(
      Math.max(
        1,
        ...draft.hazards.map((h) => h.residualLikelihood * h.residualSeverity),
      ),
    );
    const permit: Permit = {
      id: nextId,
      number:
        current?.number ??
        `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: draft.title || "Untitled permit",
      location: draft.location,
      department: draft.department,
      contractor: draft.contractor,
      holder: draft.holder,
      type:
        draft.activities.find((a) =>
          [
            "Hot Work",
            "Confined Space",
            "Electrical work",
            "Working at height",
          ].includes(a),
        ) ??
        draft.activities[0] ??
        "General work",
      status: current?.status ?? "DRAFT",
      risk,
      start: draft.start,
      end: draft.end,
      workers: draft.workers.length,
      token: current?.token ?? crypto.randomUUID(),
      draft: structuredClone(draft),
    };
    latestPermits.current = [
      permit,
      ...latestPermits.current.filter((p) => p.id !== nextId),
    ];
    setPermits(latestPermits.current);
    event(
      nextId,
      current ? "Draft updated" : "Permit created",
      "Local demonstration record",
    );
    return nextId;
  }
  async function transition(
    id: string,
    status: Status,
    reason: string,
    checks: Record<string, boolean> = {},
  ) {
    if (!demo) {
      const response = await fetch(`/api/permits/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason, checks }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      return;
    }
    const permit = latestPermits.current.find((p) => p.id === id);
    if (
      !permit ||
      !transitions[
        effectiveStatus(
          permit,
          permit.id.startsWith("demo-")
            ? new Date("2026-10-28T11:50:00+08:00")
            : new Date(),
        )
      ]?.[status]
    )
      throw new Error("This transition is not allowed.");
    if (!reason.trim())
      throw new Error("A reason or acknowledgement is required.");
    if (status === "APPROVED" && !checks.reviewed)
      throw new Error(
        "Open the approval review and read the critical safety information first.",
      );
    if (status === "SUBMITTED") {
      const issues = permit.draft
        ? submissionIssues(permit.draft)
        : ["Complete the permit wizard before submitting."];
      if (issues.length) throw new Error(issues[0]);
    }
    if (
      status === "ACTIVE" &&
      (!checks.inspected || !checks.controls || !checks.acknowledged)
    )
      throw new Error(
        "Inspection, safety controls and holder acknowledgement are required.",
      );
    if (
      status === "CLOSED" &&
      (!checks.areaSafe ||
        !checks.isolationRemoved ||
        !checks.alarmsRestored ||
        !checks.holder ||
        !checks.issuer)
    )
      throw new Error("Complete every closure confirmation.");
    latestPermits.current = latestPermits.current.map((p) =>
      p.id === id ? { ...p, status } : p,
    );
    setPermits(latestPermits.current);
    event(id, `${permit.status} → ${status}`, reason);
  }
  async function operation(
    id: string,
    action: string,
    reason: string,
    value?: string,
  ) {
    if (!demo)
      throw new Error(
        "This operation is not enabled for connected workspaces in this initial release.",
      );
    const p = permits.find((p) => p.id === id);
    if (!p || !["ACTIVE", "SUSPENDED"].includes(p.status))
      throw new Error("This action requires an active or suspended permit.");
    if (reason.trim().length < 3)
      throw new Error("Provide a meaningful reason.");
    if (action === "extension") {
      const next = new Date(value ?? "");
      if (
        !Number.isFinite(next.getTime()) ||
        next <= new Date(p.end) ||
        next.getTime() - new Date(p.originalEnd ?? p.end).getTime() >
          7 * 86400000
      )
        throw new Error(
          "Extension must follow the current expiry and stay within 7 days of the original expiry.",
        );
      setPermits((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                originalEnd: x.originalEnd ?? x.end,
                end: next.toISOString(),
              }
            : x,
        ),
      );
      event(
        id,
        "Extension approved (demo)",
        `Original expiry: ${p.end}. New expiry: ${next.toISOString()}. ${reason}`,
      );
    }
    if (action === "transfer") {
      if (!value?.trim()) throw new Error("Specify an incoming holder.");
      setPermits((prev) =>
        prev.map((x) => (x.id === id ? { ...x, holder: value } : x)),
      );
      event(
        id,
        "Holder transferred (demo)",
        `${p.holder} → ${value}. ${reason}`,
      );
    }
    if (action === "signout") {
      setPermits((prev) =>
        prev.map((x) => (x.id === id ? { ...x, workActive: false } : x)),
      );
      event(
        id,
        "Work session signed out",
        `Work stopped; area safe, tools secured and energy state reviewed. ${reason}`,
      );
    }
  }
  return (
    <Context.Provider
      value={{
        permits,
        audit,
        demo,
        ready,
        signatures,
        sign,
        loadError,
        can: (permission: string) => demo || permissions.includes(permission),
        save,
        transition,
        operation,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is required");
  return store;
}
