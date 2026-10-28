import { SignatureReceipt } from "@/components/signature-receipt";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SignatureReceipt token={token} />;
}
