import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimited } from "@/lib/ratelimit";
import { errorResponse } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address."), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json().catch(() => ({})));
    if (rateLimited(`login:${body.email}`, 8)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const user = await db.user.findUnique({ where: { email: body.email } });
    // Same message either way so the form doesn't reveal which emails have accounts.
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
