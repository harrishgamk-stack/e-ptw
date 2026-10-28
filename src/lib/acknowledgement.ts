import { z } from "zod";
import { Permit } from "./domain";

export const acknowledgementStatement =
  "I have reviewed this permit and acknowledge its work scope and safety conditions. This acknowledgement does not issue the permit or authorize work.";
export const signerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(120),
    role: z.enum([
      "Permit holder",
      "Permit issuer",
      "HSE / Safety",
      "Requester",
    ]),
    signature: z.string().trim().min(2),
    confirmed: z.literal(true),
  })
  .refine(
    (value) =>
      value.name.toLocaleLowerCase() === value.signature.toLocaleLowerCase(),
    {
      message: "Type your full name exactly as entered above.",
      path: ["signature"],
    },
  );
export type SignerInput = z.infer<typeof signerSchema>;
export type PermitSnapshot = {
  permitId: string;
  permitNumber: string;
  title: string;
  location: string;
  contractor: string;
  holder: string;
  start: string;
  end: string;
  status: string;
  workers: number;
  safety: Permit["draft"] | null;
};
export type Acknowledgement = {
  token: string;
  payload: {
    version: 1;
    permitId: string;
    permitNumber: string;
    signerName: string;
    signerRole: SignerInput["role"];
    typedSignature: string;
    signedAt: string;
    statement: string;
    contentHash: string;
    mode: "local-demo";
  };
  snapshot: PermitSnapshot;
  receiptHash: string;
};

/** Stable keys prevent innocent property ordering changes from invalidating a receipt. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}
export async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function permitSnapshot(p: Permit): PermitSnapshot {
  return {
    permitId: p.id,
    permitNumber: p.number,
    title: p.title,
    location: p.location,
    contractor: p.contractor,
    holder: p.holder,
    start: p.start,
    end: p.end,
    status: p.status,
    workers: p.workers,
    safety: p.draft ?? null,
  };
}
export async function createAcknowledgement(
  permit: Permit,
  input: SignerInput,
): Promise<Acknowledgement> {
  const signer = signerSchema.parse(input),
    snapshot = structuredClone(permitSnapshot(permit));
  const payload: Acknowledgement["payload"] = {
    version: 1,
    permitId: permit.id,
    permitNumber: permit.number,
    signerName: signer.name,
    signerRole: signer.role,
    typedSignature: signer.signature,
    signedAt: new Date().toISOString(),
    statement: acknowledgementStatement,
    contentHash: await digest(snapshot),
    mode: "local-demo",
  };
  const token = crypto.randomUUID();
  return {
    token,
    payload,
    snapshot,
    receiptHash: await digest({ token, payload }),
  };
}
export async function verifyAcknowledgement(
  receipt: Acknowledgement,
  current?: Permit,
): Promise<{ intact: boolean; unchanged: boolean | null }> {
  try {
    const intact =
      receipt.payload.version === 1 &&
      receipt.payload.mode === "local-demo" &&
      signerSchema.safeParse({
        name: receipt.payload.signerName,
        role: receipt.payload.signerRole,
        signature: receipt.payload.typedSignature,
        confirmed: true,
      }).success &&
      receipt.payload.permitId === receipt.snapshot.permitId &&
      receipt.payload.permitNumber === receipt.snapshot.permitNumber &&
      receipt.payload.statement === acknowledgementStatement &&
      (await digest({ token: receipt.token, payload: receipt.payload })) ===
        receipt.receiptHash &&
      (await digest(receipt.snapshot)) === receipt.payload.contentHash;
    return {
      intact,
      unchanged: current
        ? (await digest(permitSnapshot(current))) ===
          receipt.payload.contentHash
        : null,
    };
  } catch {
    return { intact: false, unchanged: null };
  }
}
