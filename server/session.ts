/**
 * Signed cookie sessions — HMAC-SHA256 over `user|exp`, base64url payload.
 * No external session store; revoke by rotating SESSION_SECRET.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "ouro_admin_session";
const MAX_AGE_SEC = 60 * 60 * 12; // 12h

export function sessionCookieName(): string {
  return COOKIE;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function mintSession(username: string, secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = b64url(Buffer.from(JSON.stringify({ u: username, exp }), "utf8"));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

export function readSession(token: string | undefined, secret: string): { username: string } | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; exp?: unknown };
    if (typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export function sessionSetCookie(token: string, secure: boolean): string {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function sessionClearCookie(secure: boolean): string {
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}
