import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const COOKIE = "sat_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentUserId(): Promise<string | null> {
  return verifyToken((await cookies()).get(COOKIE)?.value);
}

/** For server components/pages: returns the user or redirects to login. */
export async function requireUser() {
  const id = await currentUserId();
  if (!id) redirect("/login");
  const user = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!user) redirect("/login");
  return user;
}

/** For route handlers: returns user id or null (caller sends 401). */
export async function apiUserId() {
  const id = await currentUserId();
  if (!id) return null;
  const exists = await db.user.findUnique({ where: { id }, select: { id: true } });
  return exists ? id : null;
}

export const SESSION_COOKIE = COOKIE;
