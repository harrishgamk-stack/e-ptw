"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  Radio,
  ShieldCheck,
  Building2,
  Users,
  ChartNoAxesCombined,
  ScrollText,
  Database,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  PanelLeftClose,
  Menu,
  CircleHelp,
  LogOut,
  X,
  PenLine,
} from "lucide-react";
import { useStore } from "./store";
import { supabaseBrowser } from "@/lib/supabase/client";
const nav = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Permits", href: "/permits", icon: Files },
  { label: "Sign & Verify", href: "/sign", icon: PenLine },
  { label: "Detailed dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { label: "Active Work", href: "/active-work", icon: Radio },
  { label: "Safety Monitoring", href: "/safety", icon: ShieldCheck },
  { label: "Contractors", href: "/contractors", icon: Building2 },
  { label: "Workers / Permit Users", href: "/workers", icon: Users },
  { label: "Risk Assessments", href: "/risks", icon: ShieldCheck },
  { label: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { label: "Audit Logs", href: "/audit", icon: ScrollText },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const { demo, audit, permits, loadError, refresh } = useStore();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [searching, setSearching] = useState(false),
    [notifications, setNotifications] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearching(true);
      }
      if (e.key === "Escape") {
        setSearching(false);
        setNotifications(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  if (
    pathname === "/" ||
    pathname === "/new-permit" ||
    pathname.startsWith("/work/") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/staff-login")
  )
    return children;
  const results = search
    ? permits.filter((p) =>
        Object.values(p).some(
          (v) =>
            typeof v === "string" &&
            v.toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : permits.slice(0, 4);
  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-symbol">
            P<span>C</span>G
          </span>
          <span className="brand-text">
            ePTW<small>PREMIER CENTRE GROUP</small>
          </span>
        </Link>
        <div className="workspace-label">
          WORKSPACE <PanelLeftClose size={15} />
        </div>
        <div className="site-select">
          <span className="site-icon">
            <Building2 size={18} />
          </span>
          <div>
            PCG Operations<small>All facilities</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {nav
            .filter((n) =>
              ["/", "/permits", "/sign", "/audit"].includes(n.href),
            )
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobile(false)}
                className={`nav-item ${pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)) ? "selected" : ""}`}
              >
                <n.icon size={18} />
                <span>{n.label}</span>
                {n.href === "/approvals" && (
                  <b>
                    {
                      permits.filter((p) => p.status === "PENDING_APPROVAL")
                        .length
                    }
                  </b>
                )}
              </Link>
            ))}
        </nav>
        <details className="more-tools">
          <summary>
            More tools
            <ChevronDown size={14} />
          </summary>
          <nav>
            {nav
              .filter(
                (n) => !["/", "/permits", "/sign", "/audit"].includes(n.href),
              )
              .map((n) => (
                <Link
                  className={`nav-item ${pathname === n.href ? "selected" : ""}`}
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobile(false)}
                >
                  <n.icon size={18} />
                  {n.label}
                </Link>
              ))}
          </nav>
          <div className="nav-label management-label">ADMINISTRATION</div>
          <nav>
            <Link
              className={`nav-item ${pathname === "/master-data" ? "selected" : ""}`}
              href="/master-data"
            >
              <Database size={18} />
              Master Data
            </Link>
            <Link
              className={`nav-item ${pathname === "/settings" ? "selected" : ""}`}
              href="/settings"
            >
              <Settings size={18} />
              Settings
            </Link>
          </nav>
        </details>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <ShieldCheck size={19} />
            </span>
            <strong>Safety starts with us.</strong>
            <p>
              Every permit. Every person.
              <br />
              Every day.
            </p>
            <Link href="/safety">
              Safety overview <span>↗</span>
            </Link>
          </div>
          <div className="profile">
            <span className="avatar">SL</span>
            <div>
              <strong>{demo ? "Sarah Lim" : "PCG Member"}</strong>
              <small>
                {demo ? "HSE / Safety Manager" : "Authenticated workspace"}
              </small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                if (!demo) await supabaseBrowser().auth.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={16} />
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
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>
              {pathname === "/"
                ? "Home"
                : (nav.find(
                    (n) => pathname.startsWith(n.href) && n.href !== "/",
                  )?.label ?? "Permit workspace")}
            </strong>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onFocus={() => setSearching(true)}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything..."
                aria-label="Global permit search"
              />
              <kbd>⌘ K</kbd>
            </div>
            <span className="top-divider" />
            <button
              className="icon-button"
              aria-label="Open notifications"
              onClick={() => setNotifications(!notifications)}
            >
              <Bell size={19} />
              <i className="notification-dot" />
            </button>
            <Link
              href="/safety"
              aria-label="Safety help"
              className="icon-button"
            >
              <CircleHelp size={19} />
            </Link>
            <span className="avatar small">SL</span>
          </div>
        </header>
        {searching && (
          <div className="search-popover">
            <div className="popover-title">
              {search ? "Search results" : "Recent permits"}
              <button
                aria-label="Close search"
                onClick={() => setSearching(false)}
              >
                <X size={16} />
              </button>
            </div>
            {results.length ? (
              results.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/permits/${p.id}`}
                  onClick={() => setSearching(false)}
                >
                  <Files size={17} />
                  <div>
                    <strong>{p.number}</strong>
                    <small>{p.title}</small>
                  </div>
                  <span>↗</span>
                </Link>
              ))
            ) : (
              <p>No matching permits.</p>
            )}
          </div>
        )}
        {notifications && (
          <div className="notification-popover">
            <div className="popover-title">
              Safety notifications
              <button
                aria-label="Close notifications"
                onClick={() => setNotifications(false)}
              >
                <X size={16} />
              </button>
            </div>
            {audit.slice(0, 4).map((a) => (
              <Link
                href={`/permits/${a.permitId}`}
                key={a.id}
                onClick={() => setNotifications(false)}
              >
                <strong>{a.action}</strong>
                <p>{a.reason}</p>
              </Link>
            ))}
          </div>
        )}
        {demo && (
          <div className="demo-strip">
            <span>
              <i />
              Pilot workspace
            </span>{" "}
            Sample data · local changes only{" "}
            <Link href="/login">
              Connect your account <span>↗</span>
            </Link>
          </div>
        )}
        <main>
          {loadError && (
            <div role="alert" className="error-message">
              {loadError}
              <button
                className="button secondary"
                onClick={() => refresh().catch(() => {})}
              >
                Retry connection
              </button>
            </div>
          )}
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} /> PCG ePTW · Electronic Permit to Work &
            Safety Control System
          </span>
          <span>Safe work. Shared responsibility.</span>
        </footer>
      </div>
      <nav className="mobile-nav">
        <Link href="/">
          <LayoutDashboard />
          Home
        </Link>
        <Link href="/permits">
          <Files />
          Permits
        </Link>
        <Link href="/new-permit">
          <Plus />
          Create
        </Link>
        <Link href="/sign">
          <PenLine />
          Sign & Verify
        </Link>
        <button onClick={() => setMobile(true)}>
          <Menu />
          More
        </button>
      </nav>
    </div>
  );
}
