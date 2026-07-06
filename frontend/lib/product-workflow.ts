import { getCachedCatalogItemById } from "@/lib/api";
import type { SyntheticOrderRecord } from "@/data/orders";

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
  return getCachedCatalogItemById(catalogItemId);
}

export function getOtherOrders(
  orders: SyntheticOrderRecord[],
  orderId: string,
  limit = 3,
) {
  return orders.filter((order) => order.id !== orderId).slice(0, limit);
}
