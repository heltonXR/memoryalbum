"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente dentro de alguns instantes.</p>
      <button onClick={reset} className="btn">
        Tentar novamente
      </button>
    </main>
  );
}
