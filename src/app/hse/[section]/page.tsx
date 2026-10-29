import { notFound } from "next/navigation";
import { HseWorkspace } from "@/features/hse/workspace";
const hseSections = [
  "permits",
  "approvals",
  "active-work",
  "safety",
  "contractors",
  "workers",
  "risks",
  "reports",
  "audit",
  "master-data",
  "settings",
];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { section } = await params;
  if (!hseSections.includes(section)) notFound();
  const { type } = await searchParams;
  return <HseWorkspace section={section} workType={type} />;
}
