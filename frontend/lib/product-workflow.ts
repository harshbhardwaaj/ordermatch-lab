import { catalogItems } from "@/data/catalog";
import {
  primaryWalkthroughOrderId,
  sampleOrders,
  type SyntheticOrderRecord,
} from "@/data/orders";

export function getOrderById(orderId: string | undefined) {
  return (
    sampleOrders.find((order) => order.id === orderId) ??
    sampleOrders.find((order) => order.id === primaryWalkthroughOrderId) ??
    sampleOrders[0]
  );
}

export function getOrderProcessingHref(orderId: string) {
  return `/prototype/processing/${orderId}`;
}

export function getOrderSummaryHref(orderId: string) {
  return `/prototype/summary/${orderId}`;
}

export function getWaitingQueueHref() {
  return "/prototype/waiting";
}

export function getLineCandidates(order: SyntheticOrderRecord, lineItemId: string) {
  return order.matchCandidates
    .filter((candidate) => candidate.lineItemId === lineItemId)
    .sort((a, b) => a.rank - b.rank);
}

export function getCatalogItemById(catalogItemId: string | undefined) {
  return catalogItems.find((item) => item.id === catalogItemId);
}

export function getOtherSampleOrders(orderId: string, limit = 3) {
  return sampleOrders.filter((order) => order.id !== orderId).slice(0, limit);
}
