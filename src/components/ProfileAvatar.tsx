import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

const dataUrlCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

function dataUrlEndpoint(source: string) {
  return `${source}${source.includes("?") ? "&" : "?"}format=data-url`;
}

function loadDataUrl(source: string): Promise<string | null> {
  const cached = dataUrlCache.get(source);
  if (cached) return Promise.resolve(cached);
  const pending = pendingRequests.get(source);
  if (pending) return pending;
  const request = fetch(dataUrlEndpoint(source), {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json().catch(() => null)) as { data_url?: unknown } | null;
      const dataUrl =
        typeof payload?.data_url === "string" && payload.data_url.startsWith("data:image/")
          ? payload.data_url
          : null;
      if (dataUrl) dataUrlCache.set(source, dataUrl);
      return dataUrl;
    })
    .catch(() => null)
    .finally(() => {
      pendingRequests.delete(source);
    });
  pendingRequests.set(source, request);
  return request;
}

export function ProfileAvatar({
  source,
  alt,
  className,
  style,
  fallback,
}: {
  source: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fallback: ReactNode;
}) {
  const [dataUrl, setDataUrl] = useState(() =>
    source ? (dataUrlCache.get(source) ?? null) : null,
  );

  useEffect(() => {
    if (!source) {
      setDataUrl(null);
      return;
    }
    const cached = dataUrlCache.get(source);
    if (cached) {
      setDataUrl(cached);
      return;
    }
    let active = true;
    void loadDataUrl(source).then((value) => {
      if (active) setDataUrl(value);
    });
    return () => {
      active = false;
    };
  }, [source]);

  if (!dataUrl) return fallback;
  return <img src={dataUrl} alt={alt} className={className} style={style} />;
}
