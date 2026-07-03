import type { ReactNode } from "react";

import { OrderReviewFrame } from "@/components/product/order-review-frame";
import { OrderReviewProvider } from "@/components/product/order-review-provider";

export default async function PrototypeOrderLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <OrderReviewProvider orderId={orderId}>
      <OrderReviewFrame>{children}</OrderReviewFrame>
    </OrderReviewProvider>
  );
}
