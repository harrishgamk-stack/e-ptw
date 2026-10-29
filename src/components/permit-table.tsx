"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowDown, MoreHorizontal } from "lucide-react";
import { Permit, effectiveStatus } from "@/lib/domain";
import { Badge, Risk, TypeIcon, Empty } from "./ui";
export function permitStatus(p: Permit, demo: boolean, now = new Date()) {
  return effectiveStatus(
    p,
    demo && p.id.startsWith("demo-")
      ? new Date("2026-10-28T11:50:00+08:00")
      : now,
  );
}
export const time = (value: string) =>
  value
    ? new Date(value).toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kuala_Lumpur",
      })
    : "—";
export function PermitTable({
  permits,
  demo,
  detailBase = "/permits",
  now,
}: {
  permits: Permit[];
  demo: boolean;
  detailBase?: string;
  now?: Date;
}) {
  if (!permits.length)
    return (
      <Empty
        title="No permits found"
        description="Try another filter or create a new permit to get started."
      />
    );
  return (
    <div className="table-scroll">
      <table className="permit-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                aria-label="Select all displayed permits"
                onChange={(e) => {
                  document
                    .querySelectorAll<HTMLInputElement>(".permit-select")
                    .forEach((c) => {
                      c.checked = e.target.checked;
                    });
                }}
              />
            </th>
            <th>
              Permit / Work details <ArrowDown size={12} />
            </th>
            <th>Location & contractor</th>
            <th>Validity</th>
            <th>Risk level</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {permits.map((p) => (
            <tr key={p.id}>
              <td>
                <input
                  type="checkbox"
                  className="permit-select"
                  aria-label={`Select ${p.number}`}
                />
              </td>
              <td>
                <Link href={`${detailBase}/${p.id}`} className="permit-cell">
                  <TypeIcon type={p.type} />
                  <div>
                    <strong>
                      {p.number}
                      <ArrowUpRight size={12} />
                    </strong>
                    <span>{p.title}</span>
                  </div>
                </Link>
              </td>
              <td>
                <div className="two-lines">
                  <strong>{p.location || "Not specified"}</strong>
                  <span>{p.contractor || "Not assigned"}</span>
                </div>
              </td>
              <td>
                <div className="two-lines">
                  {detailBase === "/work" && (
                    <span>
                      {new Date(p.start).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kuala_Lumpur",
                      })}{" "}
                      –{" "}
                      {new Date(p.end).toLocaleDateString("en-MY", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </span>
                  )}
                  <strong>
                    {time(p.start)} <span className="time-dash">—</span>{" "}
                    {time(p.end)}
                  </strong>
                  <span>{p.holder || "Holder not assigned"}</span>
                </div>
              </td>
              <td>
                <Risk risk={p.risk} />
              </td>
              <td>
                <Badge status={permitStatus(p, demo, now)} />
              </td>
              <td>
                <Link
                  className="row-action"
                  href={`${detailBase}/${p.id}`}
                  aria-label={`View ${p.number}`}
                >
                  <MoreHorizontal size={19} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
