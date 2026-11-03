import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimited } from "@/lib/ratelimit";
import { errorResponse } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().max(60).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (rateLimited(`signup:${ip}`, 10)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    const body = schema.parse(await req.json().catch(() => ({})));
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "An account with that email already exists. Try logging in." }, { status: 409 });
    const user = await db.user.create({
      data: { email: body.email, name: body.name || null, passwordHash: await bcrypt.hash(body.password, 12), profile: { create: {} } },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
