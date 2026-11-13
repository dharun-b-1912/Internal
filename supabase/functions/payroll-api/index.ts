import { createClient } from "@supabase/supabase-js";
import { GET, POST } from "./generated/route.ts";
import { GET as whatsappGet, POST as whatsappPost } from "./generated/whatsapp-webhook.ts";
import type { AuthenticatedUser } from "./supabase-runtime.ts";
import { redis } from "./redis-cache.ts";

const projectUrl = Deno.env.get("SUPABASE_URL");
const secretKeyDictionary = Deno.env.get("SUPABASE_SECRET_KEYS");
const modernSecretKey = secretKeyDictionary
  ? (JSON.parse(secretKeyDictionary) as Record<string, string>).default
  : undefined;
const secretKey = modernSecretKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!projectUrl || !secretKey) {
  throw new Error("Supabase did not provide the secure server-only API secrets.");
}

const admin = createClient(projectUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const allowedOrigins = new Set([
  "https://internalpayroll.joycorporatesolutions.com",
  "https://payroll.joycorporatesolutions.com",
  "https://joy-payroll.praveen-red-07.workers.dev",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  ...(Deno.env.get("APP_ORIGIN") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.includes("joypeoplehr") || host.includes("joycorporatesolutions")) return true;
  } catch { }
  if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  return false;
}

function responseHeaders(origin: string | null) {
  const allowed = origin && isAllowedOrigin(origin) ? origin : [...allowedOrigins][0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers":
      "authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "Origin",
  };
}

function jsonError(message: string, status: number, origin: string | null) {
  return Response.json(
    { error: message },
    { status, headers: responseHeaders(origin) },
  );
}

async function verifyIdentity(request: Request): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  const isConfirmed = Boolean(data?.user && (data.user.email_confirmed_at || data.user.confirmed_at || data.user.last_sign_in_at || data.user.id));
  if (error || !data?.user?.email || !isConfirmed) return null;

  const metadata = data.user.user_metadata ?? {};
  const candidate = metadata.full_name ?? metadata.name;
  const fullName =
    typeof candidate === "string" && candidate.trim()
      ? candidate.trim()
      : null;
  return {
    email: data.user.email.trim().toLowerCase(),
    fullName,
    displayName: fullName ?? data.user.email,
  };
}

export default {
  async fetch(request: Request) {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedOrigin(origin)) {
      return jsonError("This website is not permitted to access Joy Payroll.", 403, null);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }
    if (!["GET", "POST"].includes(request.method)) {
      return jsonError("Unsupported request method.", 405, origin);
    }

    const url = new URL(request.url);
    const isWhatsAppWebhook =
      url.searchParams.get("webhook") === "whatsapp" ||
      url.pathname.endsWith("/whatsapp-webhook");

    if (isWhatsAppWebhook) {
      if (request.method === "GET") {
        return whatsappGet(request);
      }
      if (request.method === "POST") {
        const response = await whatsappPost(request);
        try {
          await redis.flushAppData();
        } catch (e) {
          console.warn("Failed to flush redis on whatsapp webhook:", e);
        }
        return response;
      }
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const identity = await verifyIdentity(request);
      if (!identity) {
        return jsonError(
          "A verified Joy Payroll email and password are required.",
          401,
          origin,
        );
      }

      if (request.method === "GET") {
        const skipCache = url.searchParams.has("fresh") || url.searchParams.has("t");
        if (!skipCache) {
          try {
            const cacheKey = `joy_app_data:${identity.email}`;
            const cached = await redis.get(cacheKey);
            if (cached && typeof cached === "object") {
              return Response.json(cached, {
                status: 200,
                headers: {
                  ...responseHeaders(origin),
                  "x-cache": "HIT",
                },
              });
            }
          } catch (e) {
            console.warn("Redis GET error:", e);
          }
        }

        const applicationResponse = await GET(identity);
        const headers = new Headers(applicationResponse.headers);
        for (const [name, value] of Object.entries(responseHeaders(origin))) {
          headers.set(name, value);
        }

        if (applicationResponse.ok) {
          try {
            const payload = await applicationResponse.clone().json();
            void redis.set(`joy_app_data:${identity.email}`, payload, 180);
          } catch { }
        }

        return new Response(applicationResponse.body, {
          status: applicationResponse.status,
          headers,
        });
      }

      const applicationResponse = await POST(request, identity);
      if (applicationResponse.ok) {
        try {
          await redis.flushAppData();
        } catch (e) {
          console.warn("Failed to flush redis on mutation:", e);
        }
      }

      const headers = new Headers(applicationResponse.headers);
      for (const [name, value] of Object.entries(responseHeaders(origin))) {
        headers.set(name, value);
      }
      return new Response(applicationResponse.body, {
        status: applicationResponse.status,
        headers,
      });
    } catch (error) {
      console.error(
        "Joy payroll API request failed:",
        error instanceof Error ? error.message : String(error),
      );
      return jsonError("Unable to complete the payroll request.", 500, origin);
    }
  },
};
