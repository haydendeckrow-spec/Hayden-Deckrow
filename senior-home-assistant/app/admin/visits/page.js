import { prisma } from "@/lib/prisma";
import { createRoutineVisitAction, completeVisitAction, cancelVisitAction } from "./actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";

export default async function VisitsPage() {
  const [visits, clients] = await Promise.all([
    prisma.visit.findMany({
      include: { client: { include: { owner: true } }, tasks: true },
      orderBy: { scheduledDate: "desc" },
      take: 50,
    }),
    prisma.client.findMany({ include: { owner: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = visits.filter((v) => v.status === "SCHEDULED");
  const past = visits.filter((v) => v.status !== "SCHEDULED");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Visits</h1>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Schedule a routine visit</h2>
        <form action={createRoutineVisitAction} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500">Client</label>
            <select name="clientId" required className="rounded-md border border-slate-300 px-2 py-1.5">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.owner.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Date</label>
            <input type="date" name="scheduledDate" min={today} required className="rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500">Crew</label>
            <input type="text" name="crewAssigned" placeholder="e.g. Crew A" className="rounded-md border border-slate-300 px-2 py-1.5" />
          </div>
          <Button type="submit" className="px-4 py-2 text-sm">
            Schedule Visit
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Upcoming ({upcoming.length})</h2>
        <div className="space-y-4">
          {upcoming.length === 0 && <p className="text-slate-500">Nothing scheduled.</p>}
          {upcoming.map((visit) => (
            <Card key={visit.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {visit.client.owner.name} -{" "}
                    {new Date(visit.scheduledDate).toLocaleDateString()}
                  </p>
                  {visit.crewAssigned && <p className="text-slate-600">Crew: {visit.crewAssigned}</p>}
                  {visit.tasks.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-slate-700">
                      {visit.tasks.map((t) => (
                        <li key={t.id}>{t.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <StatusBadge status={visit.status} />
              </div>

              <form action={completeVisitAction} className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
                <input type="hidden" name="visitId" value={visit.id} />
                <textarea
                  name="notes"
                  placeholder="Notes about the visit (optional)"
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                />
                <input type="file" name="photos" accept="image/*" multiple className="block text-sm" />
                <div className="flex gap-2">
                  <Button type="submit" className="px-4 py-2 text-sm">
                    Mark Complete
                  </Button>
                </div>
              </form>
              <form action={cancelVisitAction} className="mt-2">
                <input type="hidden" name="visitId" value={visit.id} />
                <button type="submit" className="text-sm font-semibold text-red-700 underline">
                  Cancel visit
                </button>
              </form>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-800">Past ({past.length})</h2>
        <div className="space-y-3">
          {past.map((visit) => (
            <Card key={visit.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  {visit.client.owner.name} - {new Date(visit.scheduledDate).toLocaleDateString()}
                </p>
                {visit.notes && <p className="text-slate-600">{visit.notes}</p>}
              </div>
              <StatusBadge status={visit.status} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
