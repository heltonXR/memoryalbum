import { isAdmin } from "@/lib/security";
import { AdminPanel } from "@/components/AdminPanel";
import { Login } from "@/components/Login";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administração — Memory Album",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  return (await isAdmin()) ? <AdminPanel /> : <Login />;
}
