import { getBrand } from "@/lib/brand/server";
import { requireRole } from "@/lib/auth/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("host", "/studio");
  const brand = getBrand();
  return (
    <div>
      <DashboardTopbar
        brand={brand}
        user={user}
        area={brand.theme === "earth" ? brand.terms.hostArea : "Host Studio"}
        nav={[
          { label: "Overview", href: "/studio" },
          { label: brand.theme === "earth" ? "My listings" : "My Retreats", href: "/studio/retreats" },
          { label: "Your page", href: "/studio/branding" },
          // Spend Time Off Grid is request-to-book: hosts answer requests first.
          ...(brand.theme === "earth" ? [{ label: "Requests", href: "/studio/requests" }] : []),
          { label: "Bookings", href: "/studio/bookings" },
          { label: brand.theme === "earth" ? "Past travellers" : "Past guests", href: "/studio/guests" },
          { label: "Contacts", href: "/studio/contacts" },
          { label: "Guest photos", href: "/studio/photos" },
          { label: "Messages", href: "/studio/messages" },
          { label: "Payouts", href: "/studio/payouts" },
        ]}
      />
      {children}
    </div>
  );
}
