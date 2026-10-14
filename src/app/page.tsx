import Link from "next/link";
export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">Memory Album</p>
      <h1>Memórias para recordar.</h1>
      <p>Gio e Edy · 16 de Outubro de 2026</p>
      <Link className="btn" href="/a/graduacao-2026">
        Ver álbum de demonstração
      </Link>
    </main>
  );
}
