import { requireUser } from "@/lib/auth/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div>
      <DashboardTopbar
        user={user}
        area="My Account"
        nav={[
          { label: "My Trips", href: "/account" },
          { label: "Saved", href: "/saved" },
        ]}
      />
      {children}
    </div>
  );
}
