"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, clientForUser } from "@/lib/session";
import { getUrgencyPricing, quoteForUrgency } from "@/lib/pricing";
import { savePhotoUpload } from "@/lib/uploads";
import { URGENCY, TASK_STATUS } from "@/lib/constants";
import { notifyAdmins } from "@/lib/notifications";

export async function createTaskAction(formData) {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  if (!client) throw new Error("No client account linked to this user.");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const urgency = String(formData.get("urgency") || "");

  if (!title) throw new Error("Please enter a task title.");
  if (!Object.values(URGENCY).includes(urgency)) throw new Error("Please choose an urgency.");

  const photo = formData.get("photo");
  const photoUrl = await savePhotoUpload(photo);

  const urgencyPricing = await getUrgencyPricing();
  const { price, usesFlexVisit } = quoteForUrgency({
    urgencyPricing,
    urgency,
    isSubscriber: true, // every Client record represents an active subscriber
    flexVisitsRemaining: client.flexVisitsRemaining,
  });

  await prisma.$transaction(async (tx) => {
    await tx.task.create({
      data: {
        clientId: client.id,
        title,
        description,
        photoUrl,
        urgency,
        priceQuote: price,
        billable: price > 0,
        createdById: user.id,
      },
    });

    if (usesFlexVisit) {
      await tx.client.update({
        where: { id: client.id },
        data: { flexVisitsRemaining: { decrement: 1 } },
      });
    }
  });

  const urgencyLabel = urgency.toLowerCase().replace("_", " ");
  await notifyAdmins(`New ${urgencyLabel} task request: "${title}" from ${user.name}.`);

  revalidatePath("/client");
  revalidatePath("/client/tasks");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
}

// Clients/family can only edit a task while it hasn't been scheduled yet.
export async function updateTaskAction(formData) {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  if (!client) throw new Error("No client account linked to this user.");

  const taskId = String(formData.get("taskId") || "");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.clientId !== client.id) throw new Error("Task not found.");
  if (task.status !== TASK_STATUS.REQUESTED) {
    throw new Error("This task has already been scheduled and can no longer be edited.");
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) throw new Error("Please enter a task title.");

  const photo = formData.get("photo");
  const photoUrl = await savePhotoUpload(photo);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  revalidatePath("/client/tasks");
}
