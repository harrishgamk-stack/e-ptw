"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "./store";
import { Field } from "./ui";
export function ReceiptFinder() {
  const { signatures } = useStore(),
    router = useRouter();
  const [reference, setReference] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="receipt-finder"
      onSubmit={(e) => {
        e.preventDefault();
        const value =
          reference
            .trim()
            .split("/")
            .pop()
            ?.replace(/^ACK-/i, "")
            .toLowerCase() ?? "";
        const matches =
          value.length >= 8
            ? signatures.filter((s) => s.token.toLowerCase().startsWith(value))
            : [];
        if (matches.length !== 1) {
          setError(
            "No matching record found in this browser. Use its full reference or original link.",
          );
          return;
        }
        setError("");
        router.push(`/signatures/${matches[0].token}`);
      }}
    >
      <Field label="Acknowledgement reference or link">
        <input
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="ACK-1234ABCD"
        />
      </Field>
      <button className="button secondary" type="submit">
        Check record →
      </button>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </form>
  );
}
