import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { AppError } from "./errors";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "unisphere-default-fallback-secret-2026-key"
);

export const SESSION_COOKIE_NAME = "session_token";
export const PREAUTH_COOKIE_NAME = "preauth_token";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "PRESIDENT" | "ADMIN";
  name: string;
}

export interface PreAuthPayload {
  userId: string;
  email: string;
}

// 1. Session Tokens (7 days)
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// 2. Pre-auth Tokens (10 minutes for OTP verification)
export async function createPreAuthToken(payload: PreAuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(SECRET);
}

export async function verifyPreAuthToken(token: string): Promise<PreAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as PreAuthPayload;
  } catch {
    return null;
  }
}

// 3. Helper to get authenticated user in Server Actions & Route Handlers
export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// 4. Helper to get pre-auth user
export async function getPreAuthUser(): Promise<PreAuthPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(PREAUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPreAuthToken(token);
}

// 5. Require Role Guard
export async function requireUser(allowedRoles?: string[]): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to access this resource", 403);
  }
  return user;
}

// 6. Safe next url validator (prevents open redirects)
export function sanitizeNextUrl(next: string | null | undefined, defaultPath: string): string {
  if (!next) return defaultPath;
  // Must start with a single '/' and not '//' or 'http'
  if (next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return defaultPath;
}
