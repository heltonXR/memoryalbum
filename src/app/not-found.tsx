import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell">
      <h1>Álbum indisponível.</h1>
      <p>Verifique o link que recebeu.</p>
      <Link href="/" className="btn">
        Página inicial
      </Link>
    </main>
  );
}
