import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class NotFoundError extends Error {}
export class ValidationError extends Error {}
export class ServiceUnavailableError extends Error {}

/** Convertit une erreur métier en réponse HTTP JSON homogène : { error: string, details? }. */
export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return NextResponse.json(
      {
        error: first ? `${first.path.join(".") || "Donnée"} : ${first.message}` : "Données invalides.",
        details: error.issues,
      },
      { status: 400 },
    );
  }
  if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof ServiceUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
  console.error("[api]", error);
  return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Corps de requête JSON invalide.");
  }
}

/** Auteur d'une action (nom saisi dans les Paramètres), transmis par l'en-tête X-Oceades-Author. */
export function authorOf(request: Request): string {
  const raw = request.headers.get("x-oceades-author");
  try {
    const name = raw ? decodeURIComponent(raw).trim().slice(0, 60) : "";
    return name || "Équipe";
  } catch {
    return "Équipe";
  }
}

type Handler<C> = (request: Request, ctx: C) => Promise<Response>;

/** Enveloppe une route : toute erreur est convertie en réponse JSON homogène. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
