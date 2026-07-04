import { OrderProcessing } from "@/components/product/order-processing";

export default async function PrototypeOrderProcessingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <OrderProcessing orderId={orderId} />;
}
