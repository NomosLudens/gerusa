import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { getRuntimeEnv, getRuntimeMediaBucket, type R2BucketLike } from "./context";

export type StorageObject = {
  bytes: Uint8Array;
  contentType: string;
  size: number;
};

export type StorageItem = {
  key: string;
  size: number;
};

export type RuntimeStorage = {
  get(key: string): Promise<StorageObject | null>;
  put(key: string, value: Uint8Array | string, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<StorageItem | null>;
  list(prefix?: string): Promise<readonly StorageItem[]>;
};

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function contentTypeFor(key: string, fallback = "application/octet-stream"): string {
  return MIME_TYPES[extname(key).toLowerCase()] ?? fallback;
}

function safeKey(key: string): string {
  const normalized = key.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("storage_key_invalid");
  }
  return normalized;
}

function localRoot(rootDirectory?: string): string {
  return resolve(
    rootDirectory ?? getRuntimeEnv().galleryRoot ?? join(process.cwd(), "data/gallery"),
  );
}

async function walkLocal(directory: string, root: string, output: StorageItem[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await walkLocal(absolute, root, output);
    else if (entry.isFile()) {
      const info = await stat(absolute);
      output.push({ key: relative(root, absolute).split(sep).join("/"), size: info.size });
    }
  }
}

function createR2Storage(bucket: R2BucketLike): RuntimeStorage {
  return {
    async get(key) {
      const normalized = safeKey(key);
      const object = await bucket.get(normalized);
      if (!object) return null;
      const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
      return {
        bytes,
        size: bytes.byteLength,
        contentType: object.httpMetadata?.contentType ?? contentTypeFor(normalized),
      };
    },
    async put(key, value, contentType) {
      await bucket.put(safeKey(key), value, { httpMetadata: { contentType } });
    },
    async delete(key) {
      await bucket.delete(safeKey(key));
    },
    async head(key) {
      const normalized = safeKey(key);
      const object = await bucket.head(normalized);
      return object ? { key: normalized, size: object.size ?? 0 } : null;
    },
    async list(prefix = "") {
      const result = await bucket.list({ prefix: prefix ? safeKey(prefix) : "" });
      return result.objects.map((object) => ({ key: object.key, size: object.size ?? 0 }));
    },
  };
}

function createLocalStorage(rootDirectory?: string): RuntimeStorage {
  const root = localRoot(rootDirectory);
  return {
    async get(key) {
      const normalized = safeKey(key);
      const absolute = resolve(root, normalized);
      if (!absolute.startsWith(`${root}${sep}`)) throw new Error("storage_key_invalid");
      try {
        const info = await stat(absolute);
        if (!info.isFile()) return null;
        const bytes = new Uint8Array(await readFile(absolute));
        return { bytes, size: bytes.byteLength, contentType: contentTypeFor(normalized) };
      } catch {
        return null;
      }
    },
    async put(key, value, _contentType) {
      const normalized = safeKey(key);
      const absolute = resolve(root, normalized);
      if (!absolute.startsWith(`${root}${sep}`)) throw new Error("storage_key_invalid");
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, value, { flag: "wx" });
    },
    async delete(key) {
      const normalized = safeKey(key);
      await unlink(resolve(root, normalized)).catch(() => undefined);
    },
    async head(key) {
      const normalized = safeKey(key);
      try {
        const info = await stat(resolve(root, normalized));
        return info.isFile() ? { key: normalized, size: info.size } : null;
      } catch {
        return null;
      }
    },
    async list(prefix = "") {
      const items: StorageItem[] = [];
      await walkLocal(root, root, items);
      const normalized = prefix.replaceAll("\\", "/");
      return items.filter((item) => item.key.startsWith(normalized));
    },
  };
}

export function createRuntimeStorage(rootDirectory?: string): RuntimeStorage {
  return getRuntimeMediaBucket()
    ? createR2Storage(getRuntimeMediaBucket()!)
    : createLocalStorage(rootDirectory);
}
