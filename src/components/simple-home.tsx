"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  FilePlus2,
  MapPin,
  PenLine,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useStore } from "./store";
import { Badge, Empty } from "./ui";
import { permitStatus } from "./permit-table";

export function SimpleHome() {
  const { permits, signatures, demo } = useStore();
  const [query, setQuery] = useState("");
  const visible = permits.filter((p) =>
    `${p.number} ${p.title} ${p.location} ${p.holder}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="simple-workspace">
      <div className="simple-heading">
        <span className="eyebrow">PCG ePTW</span>
        <h1>Your permits. One simple place.</h1>
        <p>Create a permit, review the work, and record an acknowledgement.</p>
      </div>
      <div className="simple-start">
        <Link href="/new-permit">
          <span className="simple-step-icon">
            <FilePlus2 size={23} />
          </span>
          <div>
            <span>01</span>
            <h2>Create a permit</h2>
            <p>Start with the basic work details.</p>
          </div>
          <ArrowRight size={19} />
        </Link>
        <Link href="/sign">
          <span className="simple-step-icon">
            <PenLine size={23} />
          </span>
          <div>
            <span>02</span>
            <h2>Review & sign</h2>
            <p>Add your name and acknowledgement.</p>
          </div>
          <ArrowRight size={19} />
        </Link>
        <Link href="/sign#receipts">
          <span className="simple-step-icon">
            <ShieldCheck size={23} />
          </span>
          <div>
            <span>03</span>
            <h2>Check a signature record</h2>
            <p>See who signed, when, and what changed.</p>
          </div>
          <ArrowRight size={19} />
        </Link>
      </div>
      <section className="panel simple-permits">
        <div className="simple-section-heading">
          <div>
            <h2>Permits</h2>
            <p>
              {permits.filter((p) => permitStatus(p, demo) === "ACTIVE").length}{" "}
              active · {signatures.length} acknowledgement
              {signatures.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link className="button primary" href="/new-permit">
            <FilePlus2 size={16} />
            New permit
          </Link>
        </div>
        <div className="simple-search">
          <Search size={18} />
          <input
            aria-label="Find a permit"
            placeholder="Find a permit by name, number or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {visible.slice(0, 8).map((p) => {
          const status = permitStatus(p, demo),
            canSign = !["CLOSED", "CANCELLED", "EXPIRED", "SUSPENDED"].includes(
              status,
            );
          return (
            <article key={p.id} className="simple-permit-row">
              <div className="simple-permit-main">
                <div className="simple-permit-meta">
                  <Link href={`/permits/${p.id}`}>{p.number}</Link>
                  <Badge status={status} />
                </div>
                <h3>
                  <Link href={`/permits/${p.id}`}>{p.title}</Link>
                </h3>
                <p>
                  <span>
                    <MapPin size={13} />
                    {p.location || "Location to be added"}
                  </span>
                  <span>
                    <Users size={13} />
                    {p.holder || "Holder to be added"}
                  </span>
                </p>
              </div>
              <div className="simple-row-actions">
                <Link className="button secondary" href={`/permits/${p.id}`}>
                  View permit
                </Link>
                {canSign && (
                  <Link
                    className="button primary"
                    href={`/sign?permit=${p.id}`}
                  >
                    <PenLine size={14} />
                    Sign
                  </Link>
                )}
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <Empty
            title="No matching permits"
            description="Try another search or start a new permit."
          />
        )}
      </section>
      <div className="simple-bottom-note">
        <ClipboardCheck size={17} />
        <p>
          Signing records your acknowledgement. Work still needs the required
          safety checks and approvals.
        </p>
        <Link href="/overview">
          Detailed dashboard <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
