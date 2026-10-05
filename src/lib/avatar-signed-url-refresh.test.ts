/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";

// Track states and effects across hook calls
let useStateCallCount = 0;
const useEffectCleanups: Array<() => void> = [];

// Mock React first to prevent "Invalid hook call"
vi.mock("react", () => {
  return {
    useState: (init: any) => {
      useStateCallCount++;
      let val = init;
      if (useStateCallCount === 1) {
        val = null;
      } else if (useStateCallCount === 2) {
        val = "https://example.com/initial-signed-url";
      }
      const setter = vi.fn();
      return [val, setter];
    },
    useRef: (init: any) => {
      return { current: init };
    },
    useCallback: (fn: any) => fn,
    useEffect: (fn: any) => {
      const cleanup = fn();
      if (typeof cleanup === "function") {
        useEffectCleanups.push(cleanup);
      }
    },
  };
});

import {
  AVATAR_SIGNED_URL_REFRESH_MS,
  shouldRefreshAvatarSignedUrl,
} from "./avatar-signed-url-refresh";
import { useProfile } from "./use-profile";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const createSignedUrlMock = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://example.com/new-signed-url" },
    error: null,
  });

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "user-123",
            display_name: "Tonyus",
            avatar_url: "avatar.jpg",
            gender: "feminino",
          },
          error: null,
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: createSignedUrlMock,
        }),
      },
    },
  };
});

// Mock DOM globals in Node environment to avoid needing jsdom dependency
let visibilityStateValue = "visible";
const listeners = new Map<string, Array<() => void>>();

if (typeof (global as any).window === "undefined") {
  (global as any).window = global;
}

if (typeof (global as any).document === "undefined") {
  (global as any).document = {
    addEventListener: (event: string, callback: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(callback);
    },
    removeEventListener: (event: string, callback: () => void) => {
      const arr = listeners.get(event) || [];
      const idx = arr.indexOf(callback);
      if (idx !== -1) arr.splice(idx, 1);
    },
    get visibilityState() {
      return visibilityStateValue;
    },
  };
}

describe("avatar signed URL refresh timing & state", () => {
  beforeEach(() => {
    useStateCallCount = 0;
    useEffectCleanups.length = 0;
    vi.useFakeTimers();
    visibilityStateValue = "visible";
    listeners.clear();
    vi.spyOn(document, "addEventListener");
    vi.spyOn(document, "removeEventListener");
    vi.spyOn(window, "setTimeout");
    vi.spyOn(window, "clearTimeout");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shouldRefreshAvatarSignedUrl renova após aproximadamente 50 minutos", () => {
    expect(shouldRefreshAvatarSignedUrl(1000, 1000 + AVATAR_SIGNED_URL_REFRESH_MS)).toBe(true);
  });

  it("shouldRefreshAvatarSignedUrl não renova antes do limite", () => {
    expect(shouldRefreshAvatarSignedUrl(1000, 1000 + AVATAR_SIGNED_URL_REFRESH_MS - 1)).toBe(false);
  });

  it("useProfile carrega o contrato atual do perfil sem agendar refresh de avatar", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ profile: null }), { status: 200 }));
    const profile = useProfile();
    expect(profile.avatarUrl).toBeNull();
    expect(profile.avatarSignedUrl).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/profile", {
      credentials: "same-origin",
      cache: "no-store",
    });
    expect(window.setTimeout).not.toHaveBeenCalled();
    expect(document.addEventListener).not.toHaveBeenCalled();
  });
});
