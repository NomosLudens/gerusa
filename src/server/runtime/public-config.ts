import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

type PublicRuntimeConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  googleApiKey?: string;
  googleClientId?: string;
};

type RuntimeRequest = Request & {
  __kallistisRuntimeEnv?: PublicRuntimeConfig;
};

export const getPublicRuntimeConfig = createServerOnlyFn((): PublicRuntimeConfig => {
  try {
    const request = getRequest() as RuntimeRequest;
    if (request.__kallistisRuntimeEnv) {
      const runtime = request.__kallistisRuntimeEnv;
      return {
        supabaseUrl: runtime.supabaseUrl,
        supabasePublishableKey: runtime.supabasePublishableKey,
        googleApiKey: runtime.googleApiKey,
        googleClientId: runtime.googleClientId,
      };
    }
  } catch {
    // Build-time and tests do not have a TanStack request context.
  }

  const env = typeof process !== "undefined" ? process.env : {};
  return {
    supabaseUrl: env.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY,
    googleApiKey: env.VITE_GOOGLE_API_KEY,
    googleClientId: env.VITE_GOOGLE_CLIENT_ID,
  };
});
