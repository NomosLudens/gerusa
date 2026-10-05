import { useEffect, useRef } from "react";

export const DEFAULT_POLL_INTERVAL_MS = 4000;

export function createPollingController(
  task: () => Promise<void> | void,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  let stopped = false;
  let inFlight = false;
  const run = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      await task();
    } finally {
      inFlight = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export function usePolling(
  task: () => Promise<void> | void,
  enabled = true,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
) {
  const taskRef = useRef(task);
  taskRef.current = task;
  useEffect(() => {
    if (!enabled) return;
    return createPollingController(() => taskRef.current(), intervalMs);
  }, [enabled, intervalMs]);
}
