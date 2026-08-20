"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { savePhotoUpload } from "@/lib/uploads";
import { ROLES, TASK_STATUS, VISIT_STATUS } from "@/lib/constants";
import { notifyClientUsers } from "@/lib/notifications";

// Schedules a routine subscription visit (not tied to any specific task
// request) - e.g. the regular weekly route.
export async function createRoutineVisitAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const clientId = String(formData.get("clientId") || "");
  const scheduledDate = String(formData.get("scheduledDate") || "");
  const crewAssigned = String(formData.get("crewAssigned") || "").trim();

  if (!clientId || !scheduledDate) throw new Error("Please choose a client and date.");

  await prisma.visit.create({
    data: {
      clientId,
      scheduledDate: new Date(scheduledDate),
      crewAssigned: crewAssigned || null,
      status: VISIT_STATUS.SCHEDULED,
    },
  });

  await notifyClientUsers(
    clientId,
    `A visit has been scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`
  );

  revalidatePath("/admin/visits");
  revalidatePath("/client");
}

export async function completeVisitAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const visitId = String(formData.get("visitId") || "");
  const notes = String(formData.get("notes") || "").trim();
  const photoFiles = formData.getAll("photos").filter((f) => f && f.size > 0);

  const visit = await prisma.visit.findUnique({ where: { id: visitId }, include: { tasks: true } });
  if (!visit) throw new Error("Visit not found.");

  const uploadedUrls = [];
  for (const file of photoFiles) {
    const url = await savePhotoUpload(file);
    if (url) uploadedUrls.push(url);
  }

  await prisma.$transaction([
    prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VISIT_STATUS.COMPLETED,
        notes: notes || visit.notes,
        photos: JSON.stringify(uploadedUrls),
      },
    }),
    prisma.task.updateMany({
      where: { visitId },
      data: { status: TASK_STATUS.COMPLETED },
    }),
  ]);

  const taskSummary = visit.tasks.length > 0 ? ` Tasks completed: ${visit.tasks.map((t) => t.title).join(", ")}.` : "";
  await notifyClientUsers(visit.clientId, `Your visit on ${new Date(visit.scheduledDate).toLocaleDateString()} is complete.${taskSummary}`);

  revalidatePath("/admin/visits");
  revalidatePath("/admin");
  revalidatePath("/client");
  revalidatePath("/client/visits");
}

export async function cancelVisitAction(formData) {
  await requireUser([ROLES.ADMIN]);
  const visitId = String(formData.get("visitId") || "");

  await prisma.$transaction([
    prisma.visit.update({ where: { id: visitId }, data: { status: VISIT_STATUS.CANCELLED } }),
    prisma.task.updateMany({
      where: { visitId },
      data: { status: TASK_STATUS.REQUESTED, visitId: null },
    }),
  ]);

  revalidatePath("/admin/visits");
  revalidatePath("/admin/requests");
}
