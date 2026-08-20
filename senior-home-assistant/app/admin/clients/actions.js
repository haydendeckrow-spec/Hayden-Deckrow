"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export async function createClientAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const address = String(formData.get("address") || "").trim();
  const subscriptionTierId = String(formData.get("subscriptionTierId") || "");

  if (!name || !email || !password || !address || !subscriptionTierId) {
    throw new Error("Please fill in every field.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists.");

  const tier = await prisma.subscriptionTier.findUnique({ where: { id: subscriptionTierId } });
  if (!tier) throw new Error("Please choose a valid plan.");

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: ROLES.CLIENT,
      client: {
        create: {
          address,
          subscriptionTierId: tier.id,
          flexVisitsRemaining: tier.flexVisitsPerMonth,
        },
      },
    },
  });

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

export async function updateClientAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const clientId = String(formData.get("clientId") || "");
  const address = String(formData.get("address") || "").trim();
  const subscriptionTierId = String(formData.get("subscriptionTierId") || "");
  const active = formData.get("active") === "on";

  const tier = await prisma.subscriptionTier.findUnique({ where: { id: subscriptionTierId } });
  if (!tier) throw new Error("Please choose a valid plan.");

  await prisma.client.update({
    where: { id: clientId },
    data: { address, subscriptionTierId, active },
  });

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin");
}

export async function resetFlexVisitsAction(formData) {
  await requireUser([ROLES.ADMIN]);
  const clientId = String(formData.get("clientId") || "");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { subscriptionTier: true },
  });
  if (!client) throw new Error("Client not found.");

  await prisma.client.update({
    where: { id: clientId },
    data: { flexVisitsRemaining: client.subscriptionTier.flexVisitsPerMonth },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}
