import { NextResponse } from "next/server";
export function validateMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url)
    .origin;
  if (origin && origin !== allowedOrigin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json(
      { error: "JSON request required" },
      { status: 415 },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 1048576)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  return null;
}
