import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { URGENCY_ORDER, TASK_STATUS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import UrgencyBadge from "@/components/UrgencyBadge";

export default async function AdminOverviewPage() {
  const [clients, requestedTasks] = await Promise.all([
    prisma.client.findMany({
      include: {
        owner: true,
        subscriptionTier: true,
        visits: { where: { status: "SCHEDULED" }, orderBy: { scheduledDate: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { status: TASK_STATUS.REQUESTED },
      include: { client: { include: { owner: true } } },
    }),
  ]);

  const sortedRequests = [...requestedTasks].sort(
    (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold uppercase text-slate-500">Active Clients</p>
          <p className="text-3xl font-bold">{clients.filter((c) => c.active).length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase text-slate-500">Open Requests</p>
          <p className="text-3xl font-bold">{sortedRequests.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase text-slate-500">Urgent Requests</p>
          <p className="text-3xl font-bold text-red-700">
            {sortedRequests.filter((t) => t.urgency === "URGENT").length}
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Incoming Requests (by urgency)</h2>
          <Link href="/admin/requests" className="font-semibold text-blue-700 underline">
            Manage all
          </Link>
        </div>
        {sortedRequests.length === 0 ? (
          <p className="text-slate-500">No open requests.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Client</th>
                <th className="py-2">Task</th>
                <th className="py-2">Urgency</th>
                <th className="py-2">Requested</th>
              </tr>
            </thead>
            <tbody>
              {sortedRequests.slice(0, 8).map((task) => (
                <tr key={task.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{task.client.owner.name}</td>
                  <td className="py-2">{task.title}</td>
                  <td className="py-2">
                    <UrgencyBadge urgency={task.urgency} />
                  </td>
                  <td className="py-2 text-slate-500">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Clients</h2>
          <Link href="/admin/clients" className="font-semibold text-blue-700 underline">
            Manage all
          </Link>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Client</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Flex Visits Left</th>
              <th className="py-2">Next Visit</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{client.owner.name}</td>
                <td className="py-2">{client.subscriptionTier.name}</td>
                <td className="py-2">{client.flexVisitsRemaining}</td>
                <td className="py-2">
                  {client.visits[0]
                    ? new Date(client.visits[0].scheduledDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-2">
                  {client.active ? (
                    <span className="text-emerald-700 font-semibold">Active</span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
