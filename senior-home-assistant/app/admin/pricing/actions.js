"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLES } from "@/lib/constants";

export async function updateSubscriptionTierAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const id = String(formData.get("id") || "");
  const monthlyPrice = Number(formData.get("monthlyPrice"));
  const flexVisitsPerMonth = Number(formData.get("flexVisitsPerMonth"));

  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) throw new Error("Invalid price.");
  if (!Number.isFinite(flexVisitsPerMonth) || flexVisitsPerMonth < 0) throw new Error("Invalid flex visit count.");

  await prisma.subscriptionTier.update({
    where: { id },
    data: { monthlyPrice, flexVisitsPerMonth },
  });

  revalidatePath("/admin/pricing");
}

export async function updateUrgencyPricingAction(formData) {
  await requireUser([ROLES.ADMIN]);

  const id = String(formData.get("id") || "");
  const flatFee = Number(formData.get("flatFee"));
  const nonSubscriberFee = Number(formData.get("nonSubscriberFee"));
  const freeForSubscribers = formData.get("freeForSubscribers") === "on";

  if (!Number.isFinite(flatFee) || flatFee < 0) throw new Error("Invalid fee.");
  if (!Number.isFinite(nonSubscriberFee) || nonSubscriberFee < 0) throw new Error("Invalid fee.");

  await prisma.urgencyPricing.update({
    where: { id },
    data: { flatFee, nonSubscriberFee, freeForSubscribers },
  });

  revalidatePath("/admin/pricing");
}
