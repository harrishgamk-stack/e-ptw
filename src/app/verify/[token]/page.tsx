import { z } from "zod";
import { Verification } from "@/components/verification";
import { Permit } from "@/lib/domain";
import { isConfigured, supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let record: Permit | null = null;
  if (isConfigured() && z.uuid().safeParse(token).success) {
    const db = await supabaseServer();
    const { data } = await db.rpc("verify_permit", { token });
    if (data)
      record = {
        id: "public-verification",
        number: data.number,
        title: data.title,
        type: data.type,
        location: data.location,
        contractor: data.contractor,
        holder: data.holder,
        start: data.start,
        end: data.end,
        status: data.status,
        workers: data.workers,
        department: "",
        risk: "Low",
        token,
      };
  }
  return <Verification token={token} record={record} />;
}
