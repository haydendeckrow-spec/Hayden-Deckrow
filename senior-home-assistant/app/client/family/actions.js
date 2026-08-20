"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, clientForUser } from "@/lib/session";
import { ROLES, INVITE_STATUS } from "@/lib/constants";

export async function inviteFamilyMemberAction(formData) {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  if (!client) throw new Error("No client account linked to this user.");

  // Only the primary subscriber (not other family members) can send invites,
  // matching the "read/write, not billing/account admin" scope for family.
  if (user.role !== ROLES.CLIENT) {
    throw new Error("Only the primary account holder can invite family members.");
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) throw new Error("Please enter an email address.");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("That email is already registered.");

  const token = crypto.randomBytes(24).toString("hex");
  await prisma.familyInvite.create({
    data: { clientId: client.id, email, token },
  });

  revalidatePath("/client/family");
}

export async function revokeInviteAction(formData) {
  const user = await getCurrentUser();
  const client = clientForUser(user);
  if (!client || user.role !== ROLES.CLIENT) throw new Error("Not authorized.");

  const inviteId = String(formData.get("inviteId") || "");
  const invite = await prisma.familyInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.clientId !== client.id) throw new Error("Invite not found.");
  if (invite.status === INVITE_STATUS.ACCEPTED) throw new Error("Invite already accepted.");

  await prisma.familyInvite.delete({ where: { id: inviteId } });
  revalidatePath("/client/family");
}
