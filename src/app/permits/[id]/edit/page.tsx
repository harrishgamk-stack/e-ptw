import { Wizard } from "@/components/wizard";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Wizard editId={id} />;
}
