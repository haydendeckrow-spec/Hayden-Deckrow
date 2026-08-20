import Link from "next/link";
import { getCurrentUser, clientForUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UrgencyBadge from "@/components/UrgencyBadge";
import StatusBadge from "@/components/StatusBadge";

export default async function ClientDashboardPage() {
  const user = await getCurrentUser();
  const client = clientForUser(user);

  const [nextVisit, recentTasks] = await Promise.all([
    prisma.visit.findFirst({
      where: { clientId: client.id, status: "SCHEDULED" },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.task.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-blue-900">Your Dashboard</h1>
        <Link href="/client/tasks">
          <Button>+ Request Help With Something</Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-xl font-bold text-slate-800">Your Plan</h2>
          <p className="text-lg">{client.subscriptionTier.name}</p>
          {user.role === "CLIENT" && (
            <p className="text-slate-600">${client.subscriptionTier.monthlyPrice}/month</p>
          )}
          <p className="mt-4 text-lg font-semibold text-emerald-700">
            {client.flexVisitsRemaining} flex visit{client.flexVisitsRemaining === 1 ? "" : "s"}{" "}
            left this month
          </p>
        </Card>

        <Card>
          <h2 className="mb-2 text-xl font-bold text-slate-800">Next Scheduled Visit</h2>
          {nextVisit ? (
            <>
              <p className="text-lg">
                {new Date(nextVisit.scheduledDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {nextVisit.crewAssigned && (
                <p className="text-slate-600">Crew: {nextVisit.crewAssigned}</p>
              )}
            </>
          ) : (
            <p className="text-slate-600">No visit scheduled yet. Our team will reach out soon.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Recent Tasks</h2>
          <Link href="/client/tasks" className="font-semibold text-blue-700 underline">
            See all
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <p className="text-slate-600">
            You haven&apos;t requested anything yet.{" "}
            <Link href="/client/tasks" className="font-semibold text-blue-700 underline">
              Add your first task
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {recentTasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-lg font-medium">{task.title}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <UrgencyBadge urgency={task.urgency} />
                  <StatusBadge status={task.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
