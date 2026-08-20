"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { ROLES, INVITE_STATUS } from "@/lib/constants";

export async function acceptInviteAction(formData) {
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  function fail(message) {
    redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
  }

  if (!name || !password) fail("Please fill in every field.");
  if (password.length < 8) fail("Password must be at least 8 characters.");

  const invite = await prisma.familyInvite.findUnique({ where: { token } });
  if (!invite || invite.status !== INVITE_STATUS.PENDING) {
    fail("This invite is no longer valid.");
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) fail("An account with that email already exists - please sign in instead.");

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email: invite.email,
        passwordHash,
        role: ROLES.FAMILY,
        clientId: invite.clientId,
      },
    });
    await tx.familyInvite.update({
      where: { id: invite.id },
      data: { status: INVITE_STATUS.ACCEPTED },
    });
    return created;
  });

  await createUserSession(user.id);
  redirect("/client");
}
