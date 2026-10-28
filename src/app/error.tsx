"use client";
import { TriangleAlert } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <TriangleAlert size={35} />
      <h3>The workspace could not be loaded</h3>
      <p>
        Permit status is unavailable. Reload before relying on any safety
        information.
      </p>
      <button
        className="button primary"
        style={{ marginTop: 20 }}
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
