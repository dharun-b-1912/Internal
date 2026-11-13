const DEFAULT_REDIS_URL = "https://cunning-kiwi-203450.upstash.io";
const DEFAULT_REDIS_TOKEN = "gQAAAAAAAxq6AAIgcDE0ODdkZjI3ZTliZGI0MzgwODRjYmRlZWNiNDY4OGU5Zg";

async function compressString(str: string): Promise<string> {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
  }
  return "gz:" + btoa(binary);
}

async function decompressString(rawVal: string): Promise<string> {
  if (!rawVal) return "";
  let str = rawVal;
  if (str.startsWith('"') && str.endsWith('"')) {
    try { str = JSON.parse(str); } catch {}
  }
  if (!str.startsWith("gz:")) return str;
  const base64 = str.slice(3);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

export class UpstashRedis {
  private url: string;
  private token: string;

  constructor(url?: string, token?: string) {
    const envUrl = typeof Deno !== "undefined"
      ? Deno.env.get("UPSTASH_REDIS_REST_URL")
      : typeof process !== "undefined"
        ? process.env.UPSTASH_REDIS_REST_URL
        : undefined;
    const envToken = typeof Deno !== "undefined"
      ? Deno.env.get("UPSTASH_REDIS_REST_TOKEN")
      : typeof process !== "undefined"
        ? process.env.UPSTASH_REDIS_REST_TOKEN
        : undefined;

    this.url = (url || envUrl || DEFAULT_REDIS_URL).replace(/\/+$/, "");
    this.token = token || envToken || DEFAULT_REDIS_TOKEN;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data.result !== "string") return null;
      try {
        const decompressed = await decompressString(data.result);
        return JSON.parse(decompressed) as T;
      } catch {
        // Automatically evict truncated or corrupted key to avoid breaking requests
        void this.del(key);
        return null;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, exSeconds = 180): Promise<boolean> {
    try {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      const payload = await compressString(raw);
      if (payload.length > 950_000) return false;
      const res = await fetch(`${this.url}/set/${encodeURIComponent(key)}?ex=${exSeconds}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async del(...keys: string[]): Promise<boolean> {
    try {
      if (!keys.length) return true;
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(keys.map((k) => ["DEL", k])),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async flushAppData(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/keys/joy_app_data*`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (Array.isArray(data.result) && data.result.length > 0) {
        await this.del(...data.result);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const redis = new UpstashRedis();
