import { CreateWeekly } from "@/features/weekly/create";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  return <CreateWeekly editId={edit} />;
}
