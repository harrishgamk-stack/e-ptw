import { NextResponse } from "next/server";
import { z } from "zod";
import { draftSchema, statuses, submissionIssues } from "@/lib/domain";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { validateMutationRequest } from "@/lib/request-security";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  if (!isConfigured())
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  const { id } = await params;
  const parsed = z
    .object({
      status: z.enum(statuses),
      reason: z.string().trim().min(3).max(5000),
      checks: z.record(z.string(), z.boolean()).default({}),
    })
    .safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return NextResponse.json(
      { error: "Invalid transition request" },
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
  if (parsed.data.status === "SUBMITTED") {
    const { data } = await db
      .from("permits")
      .select("draft")
      .eq("id", id)
      .single();
    const draft = draftSchema.safeParse(data?.draft);
    if (!draft.success)
      return NextResponse.json(
        { error: "Complete the permit wizard first." },
        { status: 400 },
      );
    const issues = submissionIssues(draft.data);
    if (issues.length)
      return NextResponse.json({ error: issues.join("\n") }, { status: 400 });
  }
  const { error } = await db.rpc("transition_permit", {
    target: id,
    next_status: parsed.data.status,
    reason: parsed.data.reason,
    checks: parsed.data.checks,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
