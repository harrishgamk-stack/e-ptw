"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Printer,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
} from "lucide-react";
import { verifyAcknowledgement } from "@/lib/acknowledgement";
import { useStore } from "./store";
import { Badge, Empty } from "./ui";
import { permitStatus } from "./permit-table";

export function SignatureReceipt({ token }: { token: string }) {
  const { signatures, permits, ready, demo } = useStore();
  const receipt = signatures.find((s) => s.token === token),
    permit = permits.find((p) => p.id === receipt?.payload.permitId);
  const [check, setCheck] = useState<{
      intact: boolean;
      unchanged: boolean | null;
    } | null>(null),
    [qr, setQr] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (receipt)
      verifyAcknowledgement(receipt, permit).then((result) => {
        if (!cancelled) setCheck(result);
      });
    return () => {
      cancelled = true;
    };
  }, [receipt, permit]);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/signatures/${token}`, {
      width: 180,
      margin: 1,
      color: { dark: "#18344d", light: "#ffffff" },
    }).then(setQr);
  }, [token]);
  if (!ready) return <div className="empty">Checking acknowledgement…</div>;
  if (!receipt)
    return (
      <div className="simple-workspace narrow">
        <Empty
          title="Acknowledgement not found"
          description="Demo records are saved in the browser where they were signed. Open the original browser or create an acknowledgement here."
        />
        <Link href="/sign" className="button primary">
          Go to Sign & Verify
        </Link>
      </div>
    );
  if (!check) return <div className="empty">Checking record…</div>;
  const status = permit ? permitStatus(permit, demo) : null,
    stop = Boolean(
      status &&
      ["SUSPENDED", "EXPIRED", "CANCELLED", "CLOSED"].includes(status),
    );
  const Icon = check.intact ? CheckCircle2 : ShieldX;
  return (
    <div className="simple-workspace narrow receipt-workspace">
      <Link className="back-link" href="/sign">
        <ArrowLeft size={14} />
        Back to Sign & Verify
      </Link>
      <section className="panel receipt-card">
        <div className={`receipt-banner ${!check.intact ? "mismatch" : ""}`}>
          <Icon size={37} />
          <span className="eyebrow">DIGITAL ACKNOWLEDGEMENT</span>
          <h1>
            {check.intact ? "Acknowledgement recorded" : "Record mismatch"}
          </h1>
          <p>
            {check.intact
              ? "The saved acknowledgement matches its recorded checksum."
              : "The saved acknowledgement has changed or cannot be checked."}
          </p>
        </div>
        <div className="receipt-body">
          <div className="receipt-reference">
            <span>ACK-{token.slice(0, 8).toUpperCase()}</span>
            <span>LOCAL DEMO</span>
          </div>
          <div className="signed-by">
            <span>Signed by</span>
            <h2>{receipt.payload.signerName}</h2>
            <p>{receipt.payload.signerRole}</p>
            <div className="signature-preview">
              {receipt.payload.typedSignature}
            </div>
          </div>
          <dl className="info-grid">
            <div>
              <dt>Permit</dt>
              <dd>{receipt.payload.permitNumber}</dd>
            </div>
            <div>
              <dt>Signed on</dt>
              <dd>
                {new Date(receipt.payload.signedAt).toLocaleString("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                MYT
              </dd>
            </div>
            <div>
              <dt>Work</dt>
              <dd>{receipt.snapshot.title}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{receipt.snapshot.location || "Not recorded"}</dd>
            </div>
          </dl>
          <blockquote className="receipt-statement">
            {receipt.payload.statement}
          </blockquote>
          <div
            className={`receipt-check ${!check.intact ? "mismatch" : check.unchanged === false ? "changed" : ""}`}
          >
            {check.intact ? <ShieldCheck size={20} /> : <ShieldX size={20} />}
            <div>
              <strong>
                {check.intact
                  ? check.unchanged === false
                    ? "Permit changed since signing"
                    : "Saved record matches"
                  : "Record could not be verified"}
              </strong>
              <p>
                {check.unchanged === true
                  ? "The permit is unchanged since this acknowledgement."
                  : check.unchanged === false
                    ? "The permit has changed since signing. Review the updated permit and acknowledge again."
                    : "The current permit is unavailable; only the saved record was checked."}
              </p>
            </div>
          </div>
          {stop && (
            <div className="error-message">
              <strong>WORK MUST NOT CONTINUE</strong>
              <p>
                The current permit is {status?.toLowerCase()}. An
                acknowledgement does not override its status.
              </p>
            </div>
          )}
          <div className="receipt-current-status">
            <span>Current permit status</span>
            {status ? <Badge status={status} /> : <span>Unavailable</span>}
            {permit && (
              <Link href={`/permits/${permit.id}`}>View permit →</Link>
            )}
          </div>
          <div className="receipt-qr-row">
            {qr && (
              <Image
                unoptimized
                src={qr}
                width={110}
                height={110}
                alt="QR code for this local acknowledgement record"
              />
            )}
            <div>
              <h3>Check this acknowledgement</h3>
              <p>
                This demo link and QR open the record in this browser.
                Cross-device verification needs connected storage.
              </p>
              <button
                className="button secondary compact"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Copy size={13} />
                {copied ? "Link copied" : "Copy local link"}
              </button>
            </div>
          </div>
          <details className="receipt-technical">
            <summary>Verification details</summary>
            <p>SHA-256 reference</p>
            <code>{receipt.receiptHash}</code>
            <p>
              The checksum detects record changes. It does not prove the
              signer’s identity. Names, roles and timestamps are self-declared
              in this local demo.
            </p>
          </details>
          <div className="receipt-print">
            <button className="button secondary" onClick={() => window.print()}>
              <Printer size={16} />
              Print / save PDF
            </button>
            <Link className="button primary" href="/sign">
              Done
              <CheckCircle2 size={15} />
            </Link>
          </div>
        </div>
      </section>
      <p className="sign-demo-note">
        <TriangleAlert size={14} />
        Demo record · identity is not authenticated · no work authorization
      </p>
    </div>
  );
}
