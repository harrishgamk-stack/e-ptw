import { NextResponse } from "next/server";
import { z } from "zod";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isConfigured() || !z.uuid().safeParse(token).success)
    return NextResponse.json(
      { record: null },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  const db = await supabaseServer();
  const { data, error } = await db.rpc("verify_permit", { token });
  if (error)
    return NextResponse.json(
      { error: "Verification unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { record: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
