import { PermitDetail } from "@/components/permit-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PermitDetail id={id} closure />;
}
