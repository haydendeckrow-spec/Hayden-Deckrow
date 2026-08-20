"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createUserSession } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export async function registerAction(formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const address = String(formData.get("address") || "").trim();
  const subscriptionTierId = String(formData.get("subscriptionTierId") || "");

  function fail(message) {
    redirect(`/register?error=${encodeURIComponent(message)}`);
  }

  if (!name || !email || !password || !address || !subscriptionTierId) {
    fail("Please fill in every field.");
  }
  if (password.length < 8) {
    fail("Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail("An account with that email already exists.");
  }

  const tier = await prisma.subscriptionTier.findUnique({ where: { id: subscriptionTierId } });
  if (!tier) {
    fail("Please choose a valid subscription plan.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
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

  await createUserSession(user.id);
  redirect("/client");
}
