import { OrderSummary } from "@/components/product/order-summary";

export default async function PrototypeOrderSummaryPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <OrderSummary orderId={orderId} />;
}
