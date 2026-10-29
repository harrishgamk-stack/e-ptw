import { JoinWeekly } from "@/features/weekly/join";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JoinWeekly token={token} />;
}
