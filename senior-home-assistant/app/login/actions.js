"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export async function loginAction(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Enter your email and password.")}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk) {
    redirect(`/login?error=${encodeURIComponent("Email or password is incorrect.")}`);
  }

  await createUserSession(user.id);

  redirect(user.role === ROLES.ADMIN ? "/admin" : "/client");
}
