"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { digest } from "@/lib/acknowledgement";
import { applyWeeklyCommand, WeeklyCommand } from "./engine";
import {
  emptyWeeklyState,
  Person,
  Role,
  WeeklyPermit,
  WeeklyState,
} from "./model";
const DATA_KEY = "pcg-weekly-v2",
  SESSION_KEY = "pcg-weekly-person";
type ContextValue = {
  state: WeeklyState;
  actor: Person | null;
  ready: boolean;
  enabled: boolean;
  error: string;
  now: Date;
  signIn: (name: string, ic: string, role: Role) => Promise<void>;
  signOut: () => void;
  command: (command: WeeklyCommand) => Promise<WeeklyPermit>;
};
const Context = createContext<ContextValue | null>(null);
function read(): WeeklyState {
  const text = localStorage.getItem(DATA_KEY);
  if (!text) return emptyWeeklyState();
  const value = JSON.parse(text);
  if (
    value.schema !== 2 ||
    !Array.isArray(value.people) ||
    !Array.isArray(value.permits) ||
    !Array.isArray(value.audit)
  )
    throw new Error(
      "Local workflow data could not be read. Do not rely on the displayed permit status.",
    );
  return value as WeeklyState;
}
async function locked<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      "Use a current browser with Web Locks support to coordinate local editing safely.",
    );
  return navigator.locks.request("pcg-weekly-v2-write", work);
}
export function WeeklyProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WeeklyState>(emptyWeeklyState),
    [personId, setPersonId] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(new Date("2026-10-29T00:00:00Z"));
  const personRef = useRef<string | null>(null);
  const reload = useCallback(() => {
    try {
      setState(read());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Local data is unavailable.");
    }
  }, []);
  useEffect(() => {
    async function restore() {
      await Promise.resolve();
      if (enabled) {
        reload();
        const id = sessionStorage.getItem(SESSION_KEY);
        personRef.current = id;
        setPersonId(id);
      }
      setNow(new Date());
      setReady(true);
    }
    restore();
    const sync = (event: StorageEvent) => {
      if (event.key === DATA_KEY) reload();
    };
    window.addEventListener("storage", sync);
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, [enabled, reload]);
  function persist(next: WeeklyState) {
    localStorage.setItem(DATA_KEY, JSON.stringify(next));
    setState(next);
    setNow(new Date());
    setError("");
  }
  async function signIn(name: string, ic: string, role: Role) {
    if (!enabled) throw new Error("Name and IC access is a local demo only.");
    const normalized = ic.replace(/[\s-]/g, "");
    if (
      name.trim().length < 2 ||
      name.trim().length > 120 ||
      !/^\d{12}$/.test(normalized)
    )
      throw new Error("Enter a full name and a 12-digit demo IC number.");
    const hash = await digest({ localDemoIC: normalized });
    await locked(async () => {
      const next = read();
      let person = next.people.find((p) => p.icHash === hash);
      if (person && person.name.toLowerCase() !== name.trim().toLowerCase())
        throw new Error("The name and demo IC do not match the saved profile.");
      if (!person) {
        person = {
          id: crypto.randomUUID(),
          name: name.trim(),
          icHash: hash,
          icLast4: normalized.slice(-4),
          role,
        };
        next.people.push(person);
      }
      persist(next);
      personRef.current = person.id;
      sessionStorage.setItem(SESSION_KEY, person.id);
      setPersonId(person.id);
    });
  }
  function signOut() {
    personRef.current = null;
    sessionStorage.removeItem(SESSION_KEY);
    setPersonId(null);
  }
  async function command(input: WeeklyCommand) {
    if (!enabled)
      throw new Error("This workflow is available in local demo mode only.");
    if (!personRef.current) throw new Error("Sign in first.");
    return locked(async () => {
      const result = await applyWeeklyCommand(
        read(),
        personRef.current!,
        input,
        new Date(),
      );
      persist(result.state);
      return result.permit;
    });
  }
  return (
    <Context.Provider
      value={{
        state,
        actor: state.people.find((p) => p.id === personId) ?? null,
        enabled,
        ready,
        error,
        now,
        signIn,
        signOut,
        command,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWeekly() {
  const context = useContext(Context);
  if (!context) throw new Error("WeeklyProvider is required");
  return context;
}
