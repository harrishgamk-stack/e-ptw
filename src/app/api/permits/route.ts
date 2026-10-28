import { NextResponse } from "next/server";
import { z } from "zod";
import { draftSchema, riskLevel } from "@/lib/domain";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
import { validateMutationRequest } from "@/lib/request-security";
export async function GET() {
  if (!isConfigured())
    return NextResponse.json(
      { error: "Local demo mode uses browser storage." },
      { status: 503 },
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
  const { data: userRoles } = await db
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);
  const roleIds = (userRoles ?? []).map((r) => r.role_id);
  const { data: permissionRows } = roleIds.length
    ? await db
        .from("role_permissions")
        .select("permission_key")
        .in("role_id", roleIds)
    : { data: [] };
  const [{ data, error }, { data: audit }] = await Promise.all([
    db
      .from("permits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (error)
    return NextResponse.json(
      {
        error:
          "Unable to load permits. Check migrations and account permissions.",
      },
      { status: 500 },
    );
  return NextResponse.json(
    {
      permissions: (permissionRows ?? []).map((p) => p.permission_key),
      permits: (data ?? []).map((p) => {
        const parsed = draftSchema.safeParse(p.draft);
        const d = parsed.success ? parsed.data : null;
        return {
          id: p.id,
          number: p.system_permit_number,
          title: p.title,
          location: d?.location ?? "",
          department: d?.department ?? "",
          contractor: d?.contractor ?? "",
          holder: d?.holder ?? "",
          type: d?.activities[0] ?? "General work",
          status: p.status,
          risk: riskLevel(
            Math.max(
              1,
              ...(d?.hazards ?? []).map(
                (h) => h.residualLikelihood * h.residualSeverity,
              ),
            ),
          ),
          start: p.starts_at ?? d?.start ?? "",
          end: p.ends_at ?? d?.end ?? "",
          workers: d?.workers.length ?? 0,
          token: p.verification_token,
          draft: d ?? undefined,
          created_at: p.created_at,
        };
      }),
      audit: (audit ?? []).map((a) => ({
        id: a.id,
        permitId: a.permit_id,
        action: a.action,
        actor: a.actor_id ? "Authenticated member" : "System",
        at: a.created_at,
        reason: a.reason ?? "",
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const rejected = validateMutationRequest(request);
  if (rejected) return rejected;
  if (!isConfigured())
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({ draft: draftSchema, id: z.uuid().optional() })
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid draft data. Check all fields." },
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
  const { data, error } = await db.rpc("save_permit_draft", {
    input: parsed.data.draft,
    target: parsed.data.id ?? null,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ id: data });
}
