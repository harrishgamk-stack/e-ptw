import { NextResponse } from "next/server";
import { z } from "zod";
import { draftSchema } from "@/lib/domain";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  if (!isConfigured())
    return NextResponse.json(
      { error: "Demo document contents are not uploaded" },
      { status: 503 },
    );
  const query = new URL(request.url).searchParams,
    id = query.get("permitId"),
    path = query.get("path");
  if (!z.uuid().safeParse(id).success || !path?.startsWith(`${id}/`))
    return NextResponse.json(
      { error: "Invalid document request" },
      { status: 400 },
    );
  const db = await supabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { data } = await db
    .from("permits")
    .select("draft")
    .eq("id", id!)
    .single();
  const draft = draftSchema.safeParse(data?.draft);
  if (!draft.success || !draft.data.documents.some((d) => d.path === path))
    return NextResponse.json(
      { error: "Document not accessible" },
      { status: 404 },
    );
  const { data: signed, error } = await db.storage
    .from("permit-documents")
    .createSignedUrl(path, 60);
  if (error)
    return NextResponse.json(
      { error: "Document unavailable" },
      { status: 404 },
    );
  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}
