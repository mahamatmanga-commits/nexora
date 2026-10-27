import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { ValidationError } from "./errors";

/**
 * Stockage des fichiers médias.
 *
 * Les fichiers ne sont JAMAIS stockés dans la base : seuls leurs métadonnées et leur clé de stockage le sont.
 * Cette implémentation écrit sur le disque local, en flux (pas de chargement complet en mémoire),
 * ce qui convient aux vidéos lourdes. L'interface StorageAdapter permet de brancher plus tard
 * Supabase Storage / S3 (URL signées, upload résumable) sans toucher au reste de l'application.
 */
export interface StorageAdapter {
  save(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number>;
  stat(key: string): Promise<{ size: number } | null>;
  read(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array>;
  remove(key: string): Promise<void>;
}

const ROOT = path.resolve(process.env.OCEADES_STORAGE_DIR ?? "./storage");

function resolveKey(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new ValidationError("Clé de stockage invalide.");
  return full;
}

class LocalDiskStorage implements StorageAdapter {
  async save(key: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
    const full = resolveKey(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const tmp = `${full}.part`;
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        written += chunk.length;
        if (written > maxBytes) cb(new ValidationError(`Fichier trop volumineux (max ${Math.round(maxBytes / 1e6)} Mo).`));
        else cb(null, chunk);
      },
    });
    try {
      await pipeline(Readable.fromWeb(body as WebReadableStream<Uint8Array>), limiter, fs.createWriteStream(tmp));
      await fsp.rename(tmp, full);
      return written;
    } catch (error) {
      await fsp.rm(tmp, { force: true });
      throw error;
    }
  }

  async stat(key: string) {
    try {
      const s = await fsp.stat(resolveKey(key));
      return { size: s.size };
    } catch {
      return null;
    }
  }

  read(key: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
    const stream = fs.createReadStream(resolveKey(key), range);
    return Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;
  }

  async remove(key: string) {
    await fsp.rm(resolveKey(key), { force: true });
  }
}

export const storage: StorageAdapter = new LocalDiskStorage();

export const MAX_UPLOAD_BYTES = Number(process.env.OCEADES_MAX_UPLOAD_MB ?? 1024) * 1024 * 1024;

/** Types acceptés dans la médiathèque. */
export const ALLOWED_MIME = [
  /^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/,
  /^video\/(mp4|quicktime|webm)$/,
  /^application\/pdf$/,
];

export function isAllowedMime(mime: string) {
  return ALLOWED_MIME.some((re) => re.test(mime));
}
