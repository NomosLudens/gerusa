import { getRequest } from "@tanstack/react-start/server";

export type HyperdriveBinding = { connectionString: string };

export type R2ObjectLike = {
  body: ReadableStream<Uint8Array>;
  httpMetadata?: { contentType?: string };
  size?: number;
};

export type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>;
  head(key: string): Promise<{ size?: number; httpMetadata?: { contentType?: string } } | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string; size?: number }> }>;
};

export type RuntimeEnv = {
  databaseUrl?: string;
  hyperdrive?: HyperdriveBinding;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseServiceRoleKey?: string;
  credentialLookupKey?: string;
  recoveryPepper?: string;
  publicOrigin?: string;
  galleryRoot?: string;
  googleApiKey?: string;
  googleClientId?: string;
  openrouterApiKey?: string;
  readySecret?: string;
  media?: R2BucketLike;
  assets?: unknown;
};

type RuntimeRequest = Request & { __kallistisRuntimeEnv?: RuntimeEnv };

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function fromProcessEnv(): RuntimeEnv {
  const env = typeof process !== "undefined" ? process.env : {};
  return {
    databaseUrl: stringValue(env.KALLISTIS_DATABASE_URL),
    supabaseUrl: stringValue(env.SUPABASE_URL),
    supabasePublishableKey: stringValue(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: stringValue(env.SUPABASE_SERVICE_ROLE_KEY),
    credentialLookupKey: stringValue(env.KALLISTIS_CREDENTIAL_LOOKUP_KEY),
    recoveryPepper: stringValue(env.KALLISTIS_RECOVERY_PEPPER),
    publicOrigin: stringValue(env.KALLISTIS_PUBLIC_ORIGIN),
    galleryRoot: stringValue(env.KALLISTIS_GALLERY_ROOT),
    googleApiKey: stringValue(env.VITE_GOOGLE_API_KEY),
    googleClientId: stringValue(env.VITE_GOOGLE_CLIENT_ID),
    openrouterApiKey: stringValue(env.OPENROUTER_API_KEY),
    readySecret: stringValue(env.KALLISTIS_READY_SECRET),
  };
}

export function runtimeEnvFromBindings(env: Record<string, unknown>): RuntimeEnv {
  const hyperdrive = env.HYPERDRIVE;
  return {
    databaseUrl: stringValue(env.KALLISTIS_DATABASE_URL),
    hyperdrive:
      hyperdrive &&
      typeof hyperdrive === "object" &&
      typeof (hyperdrive as HyperdriveBinding).connectionString === "string"
        ? (hyperdrive as HyperdriveBinding)
        : undefined,
    supabaseUrl: stringValue(env.SUPABASE_URL),
    supabasePublishableKey: stringValue(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: stringValue(env.SUPABASE_SERVICE_ROLE_KEY),
    credentialLookupKey: stringValue(env.KALLISTIS_CREDENTIAL_LOOKUP_KEY),
    recoveryPepper: stringValue(env.KALLISTIS_RECOVERY_PEPPER),
    publicOrigin: stringValue(env.KALLISTIS_PUBLIC_ORIGIN),
    galleryRoot: stringValue(env.KALLISTIS_GALLERY_ROOT),
    googleApiKey: stringValue(env.VITE_GOOGLE_API_KEY),
    googleClientId: stringValue(env.VITE_GOOGLE_CLIENT_ID),
    openrouterApiKey: stringValue(env.OPENROUTER_API_KEY),
    readySecret: stringValue(env.KALLISTIS_READY_SECRET),
    media: env.KALLISTIS_MEDIA as R2BucketLike | undefined,
    assets: env.ASSETS,
  };
}

export function attachRuntimeEnv(request: Request, env: Record<string, unknown>): void {
  Object.defineProperty(request, "__kallistisRuntimeEnv", {
    value: runtimeEnvFromBindings(env),
    enumerable: false,
    configurable: true,
  });
}

export function getRuntimeEnv(): RuntimeEnv {
  try {
    const request = getRequest() as RuntimeRequest;
    if (request.__kallistisRuntimeEnv) return request.__kallistisRuntimeEnv;
  } catch {
    // Unit tests and build-time code do not have a TanStack request context.
  }
  return fromProcessEnv();
}

export function getRuntimeDatabaseUrl(): string | undefined {
  return getRuntimeEnv().hyperdrive?.connectionString ?? getRuntimeEnv().databaseUrl;
}

export function getRuntimeMediaBucket(): R2BucketLike | undefined {
  return getRuntimeEnv().media;
}
