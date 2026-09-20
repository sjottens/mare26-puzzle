"use client";

import { useEffect } from "react";

/** Registers the offline service worker (production builds only; it would fight HMR in dev). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[maré26] service worker registration failed", err);
    });
  }, []);
  return null;
}
