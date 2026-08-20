import Link from "next/link";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";
import NotificationBell from "@/components/NotificationBell";
import LogoutButton from "@/components/LogoutButton";

const NAV_LINKS = [
  { href: "/client", label: "Dashboard" },
  { href: "/client/tasks", label: "My Tasks" },
  { href: "/client/visits", label: "Visit History" },
  { href: "/client/family", label: "Family Access" },
];

export default async function ClientLayout({ children }) {
  const user = await requireUser([ROLES.CLIENT, ROLES.FAMILY]);

  return (
    <div className="senior-portal flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-2xl font-bold text-blue-900">Helping Hands</p>
            <p className="text-slate-600">Hi, {user.name.split(" ")[0]}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 pb-3">
          <ul className="flex flex-wrap gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-blue-100 hover:text-blue-800"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-slate-500">
        Need help right now? Call us at (555) 010-2020.
      </footer>
    </div>
  );
}
