import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAcknowledgement,
  verifyAcknowledgement,
  canonicalJson,
} from "../src/lib/acknowledgement";
import { demoPermits } from "../src/lib/demo";
const signer = {
  name: "Ahmad Firdaus",
  role: "Permit holder" as const,
  signature: "Ahmad Firdaus",
  confirmed: true as const,
};
test("acknowledgement binds the signer, permit snapshot, time and unique reference", async () => {
  const receipt = await createAcknowledgement(demoPermits[0], signer);
  assert.equal(receipt.payload.signerName, signer.name);
  assert.match(receipt.receiptHash, /^[0-9a-f]{64}$/);
  assert.ok(Number.isFinite(new Date(receipt.payload.signedAt).getTime()));
  assert.deepEqual(await verifyAcknowledgement(receipt, demoPermits[0]), {
    intact: true,
    unchanged: true,
  });
  const second = await createAcknowledgement(demoPermits[0], signer);
  assert.notEqual(receipt.token, second.token);
});
test("changed signer, signature, time, reference or snapshot fail the record check", async () => {
  const receipt = await createAcknowledgement(demoPermits[0], signer);
  for (const mutate of [
    (r: typeof receipt) => {
      r.payload.signerName = "Someone Else";
    },
    (r: typeof receipt) => {
      r.payload.typedSignature = "Someone Else";
    },
    (r: typeof receipt) => {
      r.payload.signedAt = "2020-01-01T00:00:00Z";
    },
    (r: typeof receipt) => {
      r.token = crypto.randomUUID();
    },
    (r: typeof receipt) => {
      r.snapshot.title = "Changed scope";
    },
  ]) {
    const altered = structuredClone(receipt);
    mutate(altered);
    assert.equal(
      (await verifyAcknowledgement(altered, demoPermits[0])).intact,
      false,
    );
  }
});
test("a later permit change keeps the historic acknowledgement and flags the changed permit", async () => {
  const receipt = await createAcknowledgement(demoPermits[0], signer);
  const updated = { ...demoPermits[0], end: "2026-10-29T17:00:00+08:00" };
  assert.deepEqual(await verifyAcknowledgement(receipt, updated), {
    intact: true,
    unchanged: false,
  });
  assert.equal(receipt.snapshot.end, demoPermits[0].end);
});
test("signing rejects unmatched typed names and omitted consent", async () => {
  await assert.rejects(
    createAcknowledgement(demoPermits[0], {
      ...signer,
      signature: "Other Name",
    }),
  );
  await assert.rejects(
    createAcknowledgement(demoPermits[0], {
      ...signer,
      confirmed: false as unknown as true,
    }),
  );
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
});
