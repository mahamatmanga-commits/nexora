/** Client HTTP minimal : remonte les messages d'erreur métier renvoyés par l'API. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("Serveur injoignable. Vérifiez que l'application est bien lancée.", 0);
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error ?? `Erreur ${response.status}`, response.status);
  return data as T;
}

/** Import d'un fichier en flux avec suivi de progression (XHR, car fetch n'expose pas la progression d'envoi). */
export function uploadFile<T>(
  file: File,
  params: Record<string, string>,
  onProgress?: (ratio: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const query = new URLSearchParams({ name: file.name, ...params });
    xhr.open("POST", `/api/media?${query}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: { error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(data?.error ?? `Erreur ${xhr.status}`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Échec de l'envoi du fichier.", 0));
    xhr.send(file);
  });
}
