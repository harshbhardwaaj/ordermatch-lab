"use client";

import { useEffect } from "react";

import { fetchOrders } from "@/lib/api";

let warmupFired = false;

/** Fires one harmless request the moment the app loads, so a sleeping
 * free-tier backend starts waking up while the visitor is still on the
 * static intro pages, before they ever reach a real data screen. */
export function BackendWarmup() {
  useEffect(() => {
    if (warmupFired) return;
    warmupFired = true;
    fetchOrders().catch(() => {});
  }, []);

  return null;
}
