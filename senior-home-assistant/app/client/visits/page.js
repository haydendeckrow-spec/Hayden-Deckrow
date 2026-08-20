import { getCurrentUser, clientForUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/StatusBadge";

export default async function VisitHistoryPage() {
  const user = await getCurrentUser();
  const client = clientForUser(user);

  const visits = await prisma.visit.findMany({
    where: { clientId: client.id },
    orderBy: { scheduledDate: "desc" },
    include: { tasks: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Visit History</h1>

      {visits.length === 0 && <p className="text-slate-600">No visits yet.</p>}

      {visits.map((visit) => {
        const photos = visit.photos ? JSON.parse(visit.photos) : [];
        return (
          <Card key={visit.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {new Date(visit.scheduledDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <StatusBadge status={visit.status} />
            </div>
            {visit.crewAssigned && <p className="mt-1 text-slate-600">Crew: {visit.crewAssigned}</p>}
            {visit.notes && <p className="mt-2 text-slate-700">{visit.notes}</p>}

            {visit.tasks.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-700">
                {visit.tasks.map((task) => (
                  <li key={task.id}>{task.title}</li>
                ))}
              </ul>
            )}

            {photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {photos.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Photo from visit"
                    className="h-32 w-32 rounded-xl border border-slate-200 object-cover"
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
