import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { ViteDevServer } from "vite";

import { demoByobMetrics } from "./demo";
import { demoAirdrops } from "./demoAirdrops";
import {
  mintSession,
  parseCookieHeader,
  readSession,
  sessionClearCookie,
  sessionCookieName,
  sessionSetCookie,
} from "./session";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const isProd = process.env.NODE_ENV === "production";

const username = process.env.ADMIN_USERNAME?.trim() || "admin";
const password = process.env.ADMIN_PASSWORD?.trim();
const sessionSecret = process.env.SESSION_SECRET?.trim();
const monitorUrl = (process.env.MONITOR_URL || "").replace(/\/+$/, "");
const monitorKey = process.env.MONITOR_ADMIN_API_KEY?.trim() || "";
const port = Number(process.env.PORT || 8790);
const cookieSecure = process.env.COOKIE_SECURE === "1";

if (!password || !sessionSecret) {
  console.error("Set ADMIN_PASSWORD and SESSION_SECRET (see .env.example)");
  process.exit(1);
}

function currentUser(cookieHeader: string | undefined): string | null {
  const cookies = parseCookieHeader(cookieHeader);
  const tok = cookies[sessionCookieName()];
  const s = readSession(tok, sessionSecret!);
  return s?.username ?? null;
}

function buildApi(): Hono {
  const app = new Hono();
  app.use("*", secureHeaders());

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      monitorConfigured: Boolean(monitorUrl && monitorKey),
      demo: !(monitorUrl && monitorKey),
    }),
  );

  app.get("/api/me", (c) => {
    const u = currentUser(c.req.header("cookie"));
    if (!u) return c.json({ authenticated: false }, 401);
    return c.json({ authenticated: true, username: u });
  });

  app.post("/api/login", async (c) => {
    let body: { username?: unknown; password?: unknown };
    try {
      body = (await c.req.json()) as { username?: unknown; password?: unknown };
    } catch {
      return c.json({ error: "invalid JSON" }, 400);
    }
    const u = String(body.username ?? "");
    const p = String(body.password ?? "");
    if (u !== username || p !== password) {
      return c.json({ error: "invalid credentials" }, 401);
    }
    const token = mintSession(u, sessionSecret!);
    c.header("Set-Cookie", sessionSetCookie(token, cookieSecure));
    return c.json({ ok: true, username: u });
  });

  app.post("/api/logout", (c) => {
    c.header("Set-Cookie", sessionClearCookie(cookieSecure));
    return c.json({ ok: true });
  });

  app.get("/api/byob/metrics", async (c) => {
    if (!currentUser(c.req.header("cookie"))) return c.json({ error: "unauthorized" }, 401);

    if (!monitorUrl || !monitorKey) {
      return c.json({ ...demoByobMetrics(), source: "demo" as const });
    }

    try {
      const res = await fetch(`${monitorUrl}/v1/admin/byob/metrics?auditLimit=200`, {
        headers: { authorization: `Bearer ${monitorKey}`, accept: "application/json" },
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        return c.json({ error: "monitor returned non-JSON", status: res.status }, 502);
      }
      if (!res.ok) {
        return c.json({ error: "monitor error", status: res.status, body }, 502);
      }
      return c.json({ ...(body as object), source: "monitor" as const });
    } catch (e) {
      return c.json({ error: "failed to reach monitor", detail: (e as Error).message }, 502);
    }
  });

  app.get("/api/airdrops", async (c) => {
    if (!currentUser(c.req.header("cookie"))) return c.json({ error: "unauthorized" }, 401);

    const limitRaw = c.req.query("limit");
    const limit = Math.min(200, Math.max(1, Number.parseInt(limitRaw || "60", 10) || 60));

    if (!monitorUrl) {
      return c.json({ ...demoAirdrops(), source: "demo" as const });
    }

    try {
      const dailyRes = fetch(`${monitorUrl}/v1/ouro/daily?days=14`, { headers: { accept: "application/json" } });

      if (monitorKey) {
        const [adminRes, daily] = await Promise.all([
          fetch(`${monitorUrl}/v1/admin/airdrops?limit=${limit}`, {
            headers: { authorization: `Bearer ${monitorKey}`, accept: "application/json" },
          }),
          dailyRes,
        ]);
        if (!adminRes.ok) {
          const text = await adminRes.text();
          return c.json({ error: "monitor admin airdrops error", status: adminRes.status, body: text.slice(0, 300) }, 502);
        }
        const adminBody = (await adminRes.json()) as {
          explorer?: string;
          epochs?: unknown[];
          note?: string;
        };
        const dailyBody = daily.ok ? ((await daily.json()) as { days?: unknown[] }) : { days: [] };
        return c.json({
          source: "monitor" as const,
          explorer: adminBody.explorer || "https://robinhoodchain.blockscout.com",
          epochs: adminBody.epochs ?? [],
          days: dailyBody.days ?? [],
          note: adminBody.note,
        });
      }

      const [epochsRes, daily] = await Promise.all([
        fetch(`${monitorUrl}/v1/ouro/epochs?limit=${limit}`, { headers: { accept: "application/json" } }),
        dailyRes,
      ]);
      if (!epochsRes.ok) {
        return c.json({ error: "monitor epochs error", status: epochsRes.status }, 502);
      }
      const epochsBody = (await epochsRes.json()) as { epochs?: unknown[] };
      const dailyBody = daily.ok ? ((await daily.json()) as { days?: unknown[] }) : { days: [] };
      return c.json({
        source: "monitor" as const,
        explorer: "https://robinhoodchain.blockscout.com",
        epochs: epochsBody.epochs ?? [],
        days: dailyBody.days ?? [],
      });
    } catch (e) {
      return c.json({ error: "failed to reach monitor", detail: (e as Error).message }, 502);
    }
  });

  return app;
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

async function serveDist(pathname: string): Promise<Response | null> {
  const dist = join(root, "dist");
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const file = join(dist, rel);
  if (!file.startsWith(dist) || !existsSync(file)) {
    if (!existsSync(join(dist, "index.html"))) return null;
    const buf = await readFile(join(dist, "index.html"));
    return new Response(buf, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const buf = await readFile(file);
  const type = mime[extname(file)] || "application/octet-stream";
  return new Response(buf, { headers: { "content-type": type } });
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function main() {
  const api = buildApi();
  let vite: ViteDevServer | undefined;

  if (!isProd) {
    const { createServer } = await import("vite");
    vite = await createServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  const server = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || "/";
    if (url.startsWith("/api/")) {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) for (const item of v) headers.append(k, item);
        else headers.set(k, v);
      }
      const host = req.headers.host || `127.0.0.1:${port}`;
      const method = req.method || "GET";
      const hasBody = method !== "GET" && method !== "HEAD";
      const raw = hasBody ? await readBody(req) : undefined;
      const body = raw && raw.length ? new Uint8Array(raw) : undefined;
      const request = new Request(`http://${host}${url}`, {
        method,
        headers,
        body,
      });
      const response = await api.fetch(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const buf = Buffer.from(await response.arrayBuffer());
      res.end(buf);
      return;
    }

    if (vite) {
      vite.middlewares(req, res, () => {
        res.statusCode = 404;
        res.end("Not found");
      });
      return;
    }

    const pathname = new URL(url, `http://127.0.0.1`).pathname;
    const out = await serveDist(pathname);
    if (!out) {
      res.statusCode = 500;
      res.end("UI not built. Run pnpm build.");
      return;
    }
    res.statusCode = out.status;
    out.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await out.arrayBuffer()));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(
      `ouro-admin-dashboard http://127.0.0.1:${port}` +
        (monitorUrl ? ` · monitor ${monitorUrl}` : " · demo metrics"),
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
