import { prisma } from "@/lib/prisma";

// Basic MVP "notification": an in-app row shown on the recipient's
// dashboard. Future work: fan this out to real email/SMS (see README).
export async function notifyUser(userId, message) {
  return prisma.notification.create({ data: { userId, message } });
}

// Notifies every user tied to a client (the owner + any family members).
export async function notifyClientUsers(clientId, message) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { familyMembers: true },
  });
  if (!client) return;

  const userIds = [client.ownerUserId, ...client.familyMembers.map((f) => f.id)];
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, message })),
  });
}

export async function notifyAdmins(message) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, message })),
  });
}
