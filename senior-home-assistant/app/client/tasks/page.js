import { getCurrentUser, clientForUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUrgencyPricing } from "@/lib/pricing";
import { createTaskAction, updateTaskAction } from "./actions";
import { TASK_STATUS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import UrgencyBadge from "@/components/UrgencyBadge";
import StatusBadge from "@/components/StatusBadge";
import TaskForm from "@/components/TaskForm";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  const showPricing = user.role === "CLIENT";

  const [urgencyPricing, tasks] = await Promise.all([
    getUrgencyPricing(),
    prisma.task.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-blue-900">My Tasks</h1>

      <Card>
        <h2 className="mb-4 text-xl font-bold text-slate-800">Request Something New</h2>
        <TaskForm
          action={createTaskAction}
          urgencyPricing={urgencyPricing}
          flexVisitsRemaining={client.flexVisitsRemaining}
          showPricing={showPricing}
        />
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Task History</h2>
        {tasks.length === 0 && <p className="text-slate-600">No tasks yet.</p>}
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{task.title}</h3>
                {task.description && <p className="mt-1 text-slate-700">{task.description}</p>}
                <p className="mt-2 text-slate-500">
                  Requested {new Date(task.createdAt).toLocaleDateString()}
                  {task.billable
                    ? showPricing
                      ? ` - $${task.priceQuote}`
                      : " - billable"
                    : " - included"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <UrgencyBadge urgency={task.urgency} />
                <StatusBadge status={task.status} />
              </div>
            </div>

            {task.photoUrl && (
              <img
                src={task.photoUrl}
                alt={`Photo for task: ${task.title}`}
                className="mt-3 max-h-64 rounded-xl border border-slate-200 object-cover"
              />
            )}

            {task.status === TASK_STATUS.REQUESTED && (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-blue-700 underline">
                  Edit this task
                </summary>
                <div className="mt-4">
                  <TaskForm
                    action={updateTaskAction}
                    initialTask={task}
                    urgencyPricing={urgencyPricing}
                    flexVisitsRemaining={client.flexVisitsRemaining}
                    showPricing={showPricing}
                  />
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
