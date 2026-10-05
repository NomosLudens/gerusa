import type { AppRegistryItem } from "@/lib/app-registry";

export type MicroappHostState = "loading" | "loaded" | "error" | "blocked";

export type MicroappEvent = {
  source: string;
  action: string;
  payload?: unknown;
  timestamp?: number;
  rawEvent: MessageEvent;
};

export type MicroappHostProps = {
  appId?: string;
  app?: AppRegistryItem;
  title?: string;
  src?: string;
  expectedSource?: string;
  allowedActions?: readonly string[];
  className?: string;
  iframeClassName?: string;
  sandbox?: string;
  allow?: string;
  embedded?: boolean;
  showHeader?: boolean;
  minHeight?: string;
  loadingTimeoutMs?: number;
  loadingLabel?: string;
  onEvent?: (event: MicroappEvent, frame: HTMLIFrameElement | null) => void;
};

export type MicroappMessageData = {
  source?: unknown;
  action?: unknown;
  payload?: unknown;
  timestamp?: unknown;
};

export type ValidateMicroappMessageOptions = {
  event: MessageEvent;
  frameWindow: Window | null | undefined;
  expectedOrigin: string;
  expectedSource?: string;
  allowedActions?: readonly string[];
};

export type ValidateMicroappMessageResult =
  | { ok: true; event: MicroappEvent }
  | { ok: false; reason: string };
