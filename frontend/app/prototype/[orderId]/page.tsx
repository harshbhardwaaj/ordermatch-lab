import { redirect } from "next/navigation";

import { getOrderReviewHref } from "@/lib/product-workflow";

export default async function PrototypeOrderIndexPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  redirect(getOrderReviewHref(orderId, "fields"));
}
