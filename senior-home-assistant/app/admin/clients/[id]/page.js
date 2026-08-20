import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateClientAction, resetFlexVisitsAction } from "../actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UrgencyBadge from "@/components/UrgencyBadge";
import StatusBadge from "@/components/StatusBadge";

export default async function AdminClientDetailPage({ params }) {
  const { id } = await params;

  const [client, tiers] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        owner: true,
        subscriptionTier: true,
        familyMembers: true,
        tasks: { orderBy: { createdAt: "desc" }, take: 10 },
        visits: { orderBy: { scheduledDate: "desc" }, take: 10 },
      },
    }),
    prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } }),
  ]);

  if (!client) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">{client.owner.name}</h1>
      <p className="text-slate-500">{client.owner.email}</p>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Account details</h2>
        <form action={updateClientAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500">Address</label>
            <input
              name="address"
              defaultValue={client.address}
              required
              className="w-full rounded-md border border-slate-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Plan</label>
            <select
              name="subscriptionTierId"
              defaultValue={client.subscriptionTierId}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5"
            >
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} - ${t.monthlyPrice}/mo
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="active" name="active" defaultChecked={client.active} className="h-5 w-5" />
            <label htmlFor="active" className="font-semibold">Active subscriber</label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="px-4 py-2 text-sm">Save Changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Flex visits remaining</h2>
            <p className="text-2xl font-bold">{client.flexVisitsRemaining}</p>
          </div>
          <form action={resetFlexVisitsAction}>
            <input type="hidden" name="clientId" value={client.id} />
            <Button type="submit" variant="secondary" className="px-4 py-2 text-sm">
              Reset to plan default
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Family members</h2>
        {client.familyMembers.length === 0 ? (
          <p className="text-slate-500">None linked.</p>
        ) : (
          <ul className="space-y-1">
            {client.familyMembers.map((m) => (
              <li key={m.id}>
                {m.name} - {m.email}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Recent tasks</h2>
        {client.tasks.length === 0 ? (
          <p className="text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {client.tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{t.title}</span>
                <span className="flex gap-2">
                  <UrgencyBadge urgency={t.urgency} />
                  <StatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Recent visits</h2>
        {client.visits.length === 0 ? (
          <p className="text-slate-500">No visits yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {client.visits.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{new Date(v.scheduledDate).toLocaleDateString()}</span>
                <StatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
