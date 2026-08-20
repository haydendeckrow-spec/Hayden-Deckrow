"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLES, TASK_STATUS, VISIT_STATUS } from "@/lib/constants";
import { notifyClientUsers } from "@/lib/notifications";

// Schedules a visit for a task request: creates a Visit and links the task
// to it. Assigning a crew to a request is the same action as scheduling it.
export async function scheduleTaskAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const taskId = String(formData.get("taskId") || "");
  const scheduledDate = String(formData.get("scheduledDate") || "");
  const crewAssigned = String(formData.get("crewAssigned") || "").trim();

  if (!scheduledDate) throw new Error("Please choose a date.");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found.");

  await prisma.visit.create({
    data: {
      clientId: task.clientId,
      scheduledDate: new Date(scheduledDate),
      crewAssigned: crewAssigned || null,
      status: VISIT_STATUS.SCHEDULED,
      tasks: { connect: { id: taskId } },
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: TASK_STATUS.SCHEDULED },
  });

  await notifyClientUsers(
    task.clientId,
    `A crew has been scheduled for "${task.title}" on ${new Date(scheduledDate).toLocaleDateString()}.`
  );

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/visits");
  revalidatePath("/client");
}
