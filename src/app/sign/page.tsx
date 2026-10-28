import { DigitalSign } from "@/components/digital-sign";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ permit?: string }>;
}) {
  const { permit } = await searchParams;
  return <DigitalSign initialPermit={permit} />;
}
