import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { apiUserId } from "./auth";
import { UserError } from "./sessions";
import { Prisma } from "@prisma/client";

/** Wrap a route handler: auth check, JSON body validation, and consistent error responses. */
export function route<T>(schema: ZodType<T> | null, fn: (ctx: { userId: string; body: T; req: Request; params: Record<string, string> }) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const userId = await apiUserId();
      if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
      let body = undefined as T;
      if (schema) {
        const raw = await req.json().catch(() => ({}));
        body = schema.parse(raw);
      }
      const params = (await ctx?.params) ?? {};
      const out = await fn({ userId, body, req, params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input.", details: e.issues.map((i) => i.message) }, { status: 400 });
  if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return NextResponse.json({ error: "Not found." }, { status: 404 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong on our side. Your progress up to the last save is safe." }, { status: 500 });
}
