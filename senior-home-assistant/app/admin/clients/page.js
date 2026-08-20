import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClientAction } from "./actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default async function AdminClientsPage() {
  const [clients, tiers] = await Promise.all([
    prisma.client.findMany({ include: { owner: true, subscriptionTier: true }, orderBy: { createdAt: "asc" } }),
    prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Clients</h1>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Flex Visits</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{c.owner.name}</td>
                <td className="py-2">{c.owner.email}</td>
                <td className="py-2">{c.subscriptionTier.name}</td>
                <td className="py-2">{c.flexVisitsRemaining}</td>
                <td className="py-2">{c.active ? "Active" : "Inactive"}</td>
                <td className="py-2">
                  <Link href={`/admin/clients/${c.id}`} className="font-semibold text-blue-700 underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Add a new client</h2>
        <form action={createClientAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500">Full name</label>
            <input name="name" required className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Email</label>
            <input name="email" type="email" required className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Temporary password</label>
            <input name="password" type="text" required minLength={8} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Address</label>
            <input name="address" required className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Plan</label>
            <select name="subscriptionTierId" required defaultValue="" className="w-full rounded-md border border-slate-300 px-2 py-1.5">
              <option value="" disabled>Choose a plan</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} - ${t.monthlyPrice}/mo</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="px-4 py-2 text-sm">Create Client</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
