"use client";

import { useEffect, useRef } from "react";

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (
    type: "release",
    listener: () => void,
    options?: AddEventListenerOptions | boolean
  ) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function useScreenWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const wakeLockNavigator = navigator as WakeLockNavigator;

    if (!wakeLockNavigator.wakeLock) return;

    let cancelled = false;

    async function releaseWakeLock() {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;

      if (!sentinel || sentinel.released) return;

      try {
        await sentinel.release();
      } catch (error) {
        console.error("Wake lock release failed", error);
      }
    }

    async function requestWakeLock() {
      if (!enabledRef.current) {
        await releaseWakeLock();
        return;
      }

      if (document.visibilityState !== "visible") return;
      if (sentinelRef.current && !sentinelRef.current.released) return;

      try {
        const sentinel = await wakeLockNavigator.wakeLock.request("screen");

        if (cancelled) {
          await sentinel.release();
          return;
        }

        sentinelRef.current = sentinel;
        sentinel.addEventListener?.("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
          }
        });
      } catch (error) {
        console.error("Wake lock request failed", error);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [enabled]);
}
