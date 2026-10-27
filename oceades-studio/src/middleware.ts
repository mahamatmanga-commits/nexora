import { NextResponse, type NextRequest } from "next/server";

/**
 * Protection d'accès optionnelle : si OCEADES_PASSWORD est défini, toute l'application (pages et API)
 * exige une session ouverte via /connexion. Sans variable, l'accès reste libre (usage local).
 * La gestion de comptes individuels et de rôles arrivera avec Supabase Auth.
 */
export const SESSION_COOKIE = "oceades_session";

export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`oceades-studio:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const password = process.env.OCEADES_PASSWORD;
  if (!password) return NextResponse.next();
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/connexion") || pathname.startsWith("/api/auth")) return NextResponse.next();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(password))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = "/connexion";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
