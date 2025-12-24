import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { Sidebar } from "./components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl p-6">{children}</div>
      </main>
    </div>
  );
}
