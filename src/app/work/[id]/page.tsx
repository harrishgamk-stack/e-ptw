import { WeeklyWork } from "@/features/weekly/work";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WeeklyWork id={id} />;
}
