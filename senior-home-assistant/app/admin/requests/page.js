import { prisma } from "@/lib/prisma";
import { URGENCY_ORDER, TASK_STATUS } from "@/lib/constants";
import { scheduleTaskAction } from "./actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UrgencyBadge from "@/components/UrgencyBadge";

export default async function RequestsPage() {
  const tasks = await prisma.task.findMany({
    where: { status: TASK_STATUS.REQUESTED },
    include: { client: { include: { owner: true } } },
  });

  const sorted = [...tasks].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Incoming Requests</h1>
      <p className="text-slate-600">Sorted most urgent first. Schedule a crew to convert a request into a visit.</p>

      {sorted.length === 0 && <p className="text-slate-500">No open requests right now.</p>}

      {sorted.map((task) => (
        <Card key={task.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-lg font-bold">{task.title}</h2>
                <UrgencyBadge urgency={task.urgency} />
              </div>
              <p className="text-slate-600">
                {task.client.owner.name} - {task.client.address}
              </p>
              {task.description && <p className="mt-1 text-slate-700">{task.description}</p>}
              <p className="mt-1 text-slate-500">
                {task.billable ? `Billable: $${task.priceQuote}` : "Covered by subscription"}
              </p>
              {task.photoUrl && (
                <img
                  src={task.photoUrl}
                  alt={`Photo for task: ${task.title}`}
                  className="mt-2 max-h-48 rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>

            <form action={scheduleTaskAction} className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
              <input type="hidden" name="taskId" value={task.id} />
              <div>
                <label className="block text-xs font-semibold text-slate-500">Visit date</label>
                <input
                  type="date"
                  name="scheduledDate"
                  min={today}
                  required
                  className="rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">Crew</label>
                <input
                  type="text"
                  name="crewAssigned"
                  placeholder="e.g. Crew B"
                  className="rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <Button type="submit" className="px-4 py-2 text-sm">
                Schedule
              </Button>
            </form>
          </div>
        </Card>
      ))}
    </div>
  );
}
