import { Status } from "@/lib/domain";
import {
  Flame,
  Zap,
  HardHat,
  Wrench,
  Container,
  ArrowUpRight,
} from "lucide-react";
export const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
export function Badge({ status }: { status: Status | string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <i />
      {label(status)}
    </span>
  );
}
export function Risk({ risk }: { risk: string }) {
  return (
    <span className={`risk risk-${risk.toLowerCase()}`}>
      <span />
      {risk}
    </span>
  );
}
export function TypeIcon({ type }: { type: string }) {
  const Icon =
    type === "Hot Work"
      ? Flame
      : type === "Electrical work"
        ? Zap
        : type === "Confined Space"
          ? Container
          : type === "Working at height"
            ? HardHat
            : Wrench;
  return (
    <span
      className={`type-icon type-${type === "Hot Work" ? "hot" : type === "Electrical work" ? "electrical" : type === "Confined Space" ? "space" : "general"}`}
    >
      <Icon size={17} />
    </span>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <HardHat size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function SectionTitle({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children ?? <ArrowUpRight size={18} />}
    </div>
  );
}
export function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
    </label>
  );
}
