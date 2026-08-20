import { prisma } from "@/lib/prisma";
import { markNotificationsReadAction } from "@/app/notifications-actions";

export default async function NotificationBell({ userId }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-4 py-2 font-semibold">
        <span aria-hidden="true">🔔</span>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        {notifications.length === 0 && (
          <p className="p-3 text-slate-500">No notifications yet.</p>
        )}
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg p-3 text-sm ${n.read ? "bg-slate-50 text-slate-600" : "bg-blue-50 text-slate-900 font-medium"}`}
            >
              <p>{n.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        {unreadCount > 0 && (
          <form action={markNotificationsReadAction} className="mt-2">
            <button type="submit" className="w-full rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              Mark all as read
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
