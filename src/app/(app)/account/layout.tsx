import { getBrand } from "@/lib/brand/server";
import { requireUser } from "@/lib/auth/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const brand = getBrand();
  return (
    <div>
      <DashboardTopbar
        brand={brand}
        user={user}
        area="My Account"
        nav={[
          { label: brand.terms.trips, href: "/account" },
          { label: "Saved", href: "/saved" },
        ]}
      />
      {children}
    </div>
  );
}
