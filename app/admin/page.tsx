import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Product Manager | ShopWiseFinder",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) redirect("/admin/login");
  return <AdminDashboard />;
}
