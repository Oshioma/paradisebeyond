import { timingSafeEqual } from "node:crypto";

/** `Authorization: Bearer <secret>`, compared in constant time. No secret configured = never authorised. */
export function authorised(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
