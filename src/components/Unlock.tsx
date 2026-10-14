"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function Unlock({
  slug,
  secretKey,
  visibility,
}: {
  slug: string;
  secretKey?: string;
  visibility: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function unlock(key?: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/albums/${slug}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(key ? { key } : { password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir o álbum.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (secretKey) void unlock(secretKey);
  }, [secretKey]);
  return (
    <main className="shell gate">
      <p className="eyebrow">Memory Album · acesso reservado</p>
      <h1>Um momento só nosso.</h1>
      {visibility === "PASSWORD" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void unlock();
          }}
        >
          <label>
            Palavra-passe do álbum
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={256}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? "A abrir…" : "Abrir álbum"}
          </button>
        </form>
      ) : (
        <p>
          {busy
            ? "A verificar o seu link…"
            : "Abra o link completo que recebeu da família."}
        </p>
      )}
      <p role="alert">{error}</p>
    </main>
  );
}
