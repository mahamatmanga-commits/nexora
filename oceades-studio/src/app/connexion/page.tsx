"use client";

import * as React from "react";

export default function LoginPage() {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    setBusy(false);
    if (res.ok) window.location.href = "/";
    else setError((await res.json().catch(() => null))?.error ?? "Connexion impossible.");
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#203849] p-4">
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3 rounded-xl bg-popover p-6 shadow-2xl">
        <p className="text-[15px] font-semibold">Océades Studio</p>
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe" className="h-9 rounded-md border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={busy || !password} className="h-9 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
          Se connecter
        </button>
      </form>
    </div>
  );
}
