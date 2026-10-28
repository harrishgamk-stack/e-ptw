import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspaces";
const sections = [
  "active-work",
  "approvals",
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
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <Workspace section={section} />;
}
