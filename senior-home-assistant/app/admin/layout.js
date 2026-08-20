import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";
import LogoutButton from "@/components/LogoutButton";

const NAV_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/visits", label: "Visits" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/pricing", label: "Pricing" },
];

export default async function AdminLayout({ children }) {
  const user = await requireUser([ROLES.ADMIN]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-sm">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <p className="text-lg font-bold">Helping Hands Admin</p>
            <nav>
              <ul className="flex flex-wrap gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block rounded-md px-3 py-2 font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
