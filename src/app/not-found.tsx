import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>The requested page is unavailable.</p>
      <Link className="button primary" href="/" style={{ marginTop: 20 }}>
        Back to dashboard
      </Link>
    </div>
  );
}
