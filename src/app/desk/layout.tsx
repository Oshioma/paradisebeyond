import { requireRole } from "@/lib/auth/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/desk");
  return (
    <div>
      <DashboardTopbar
        user={user}
        area="Admin Desk"
        nav={[
          { label: "Overview", href: "/desk" },
          { label: "Applications", href: "/desk/applications" },
          { label: "Submissions", href: "/desk/submissions" },
          { label: "Experiences", href: "/desk/experiences" },
          { label: "Bookings", href: "/desk/bookings" },
          { label: "Commissions", href: "/desk/commissions" },
          { label: "Media", href: "/desk/media" },
          { label: "System", href: "/desk/settings" },
        ]}
      />
      {children}
    </div>
  );
}
