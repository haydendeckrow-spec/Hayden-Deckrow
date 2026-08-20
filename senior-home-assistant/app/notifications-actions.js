"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Marks all of the *current session's* notifications as read. The userId is
// always taken from the session, never trusted from form input, so a user
// can't mark another user's notifications read by tampering with the form.
export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/client");
  revalidatePath("/admin");
}
