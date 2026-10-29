"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  Files,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useWeekly } from "../weekly/store";
import { effectiveWeeklyStatus, initials } from "../weekly/model";

const navigation = [
  { label: "Dashboard", href: "/hse", icon: LayoutDashboard },
  { label: "Permits", href: "/hse/permits", icon: Files },
  { label: "Approvals", href: "/hse/approvals", icon: ClipboardCheck },
  { label: "Active Work", href: "/hse/active-work", icon: Radio },
  { label: "Safety Monitoring", href: "/hse/safety", icon: ShieldCheck },
  { label: "Contractors", href: "/hse/contractors", icon: Building2 },
  { label: "Workers / Permit Users", href: "/hse/workers", icon: Users },
  { label: "Risk Assessments", href: "/hse/risks", icon: ShieldCheck },
  { label: "Reports", href: "/hse/reports", icon: ChartNoAxesCombined },
  { label: "Audit Logs", href: "/hse/audit", icon: ScrollText },
  { label: "Master Data", href: "/hse/master-data", icon: Database },
  { label: "Settings", href: "/hse/settings", icon: Settings },
];

export function HseShell({ children }: { children: React.ReactNode }) {
  const { actor, state, signOut, error, now } = useWeekly();
  const pathname = usePathname(),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState("");
  const selected =
    navigation.find((n) => n.href === pathname)?.label ??
    (pathname === "/" ? "Dashboard" : "Permit workspace");
  const pending = state.permits.filter(
    (p) => effectiveWeeklyStatus(p, now) === "HSE_REVIEW",
  ).length;
  return (
    <div className="app-shell hse-shell">
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href="/hse" className="brand">
          <span className="brand-symbol">
            P<span>C</span>G
          </span>
          <span className="brand-text">
            ePTW<small>PREMIER CENTRE GROUP</small>
          </span>
        </Link>
        <div className="workspace-label">HSE ADMINISTRATION</div>
        <div className="site-select">
          <span className="site-icon">
            <Building2 size={18} />
          </span>
          <div>
            PCG Operations<small>All facilities</small>
          </div>
        </div>
        <nav className="hse-navigation" aria-label="HSE administration">
          {navigation.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobile(false)}
              className={`nav-item ${selected === n.label ? "selected" : ""}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.label === "Approvals" && pending > 0 && <b>{pending}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">{initials(actor?.name ?? "HSE")}</span>
            <div>
              <strong>{actor?.name}</strong>
              <small>HSE · Administrator</small>
            </div>
            <button
              aria-label="Sign out of weekly workspace"
              onClick={() => {
                signOut();
                router.push("/");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>HSE Admin</span>
            <span className="crumb-slash">/</span>
            <strong>{selected}</strong>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="Global permit search"
                placeholder="Search permits…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button aria-label="Close search" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </div>
            <Link href="/hse/approvals" className="text-link">
              <ShieldCheck size={17} />
              <span>HSE</span>
            </Link>
          </div>
        </header>
        {search && (
          <div className="search-popover">
            <div className="popover-title">Shared permit search</div>
            {state.permits
              .filter((p) =>
                `${p.number} ${p.title} ${p.location}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .slice(0, 6)
              .map((p) => (
                <Link
                  href={`/work/${p.id}`}
                  key={p.id}
                  onClick={() => setSearch("")}
                >
                  <Files size={17} />
                  <div>
                    <strong>{p.number}</strong>
                    <small>{p.title}</small>
                  </div>
                </Link>
              ))}
            {!state.permits.some((p) =>
              `${p.number} ${p.title} ${p.location}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ) && <p>No matching permits.</p>}
          </div>
        )}
        <div className="demo-strip">
          <span>
            <i />
            Local workflow demo
          </span>{" "}
          HSE admin · Tabs in this browser sync. Separate phones are not
          connected. Use sample IC details only.
        </div>
        <main>
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} />
            PCG ePTW · HSE administration
          </span>
          <span>Safe work. Shared responsibility.</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="HSE mobile navigation">
        <Link href="/hse">
          <LayoutDashboard />
          Dashboard
        </Link>
        <Link href="/hse/permits">
          <Files />
          Permits
        </Link>
        <Link href="/hse/approvals">
          <ClipboardCheck />
          Approvals
        </Link>
        <Link href="/hse/safety">
          <ShieldCheck />
          Safety
        </Link>
        <button onClick={() => setMobile(true)}>
          <Menu />
          More
        </button>
      </nav>
    </div>
  );
}
