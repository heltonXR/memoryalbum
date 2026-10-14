"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function Login() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="shell gate">
      <p className="eyebrow">Memory Album · administração</p>
      <h1>Bem-vindo de volta.</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.get("email"),
                password: form.get("password"),
              }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível iniciar sessão.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Palavra-passe
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            maxLength={256}
          />
        </label>
        <button className="btn" disabled={busy}>
          {busy ? "A verificar…" : "Iniciar sessão"}
        </button>
        <p role="alert">{error}</p>
      </form>
    </main>
  );
}
