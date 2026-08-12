import { requireRole } from "@/lib/auth/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("host", "/studio");
  return (
    <div>
      <DashboardTopbar
        user={user}
        area="Host Studio"
        nav={[
          { label: "Overview", href: "/studio" },
          { label: "My Retreats", href: "/studio/retreats" },
          { label: "Bookings", href: "/studio/bookings" },
          { label: "Payouts", href: "/studio/payouts" },
        ]}
      />
      {children}
    </div>
  );
}
