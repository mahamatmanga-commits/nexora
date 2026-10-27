import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/middleware";

export async function POST(request: Request) {
  const password = process.env.OCEADES_PASSWORD;
  if (!password) return NextResponse.json({ ok: true });
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (body.password !== password) {
    await new Promise((r) => setTimeout(r, 600)); // ralentit les essais successifs
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" && request.url.startsWith("https") });
  return res;
}
