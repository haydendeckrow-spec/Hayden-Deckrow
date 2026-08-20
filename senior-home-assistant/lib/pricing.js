import { prisma } from "@/lib/prisma";
import { URGENCY } from "@/lib/constants";

export { quoteForUrgency } from "@/lib/pricingCalc";

// All pricing numbers live in the database (SubscriptionTier and
// UrgencyPricing tables), edited by the admin at /admin/pricing.
// These defaults are only used to seed the database - never hardcode
// prices directly in components or route handlers.
export const DEFAULT_SUBSCRIPTION_TIERS = [
  {
    name: "Solo crew, weekly",
    monthlyPrice: 500,
    crewSize: 1,
    visitFrequency: "Weekly",
    flexVisitsPerMonth: 2,
  },
  {
    name: "2-person crew, weekly",
    monthlyPrice: 800,
    crewSize: 2,
    visitFrequency: "Weekly",
    flexVisitsPerMonth: 2,
  },
];

export const DEFAULT_URGENCY_PRICING = [
  {
    urgency: URGENCY.WHENEVER,
    label: "Whenever (fits next scheduled route)",
    flatFee: 0,
    freeForSubscribers: true,
    nonSubscriberFee: 25,
  },
  {
    urgency: URGENCY.THIS_WEEK,
    label: "This week",
    flatFee: 70,
    freeForSubscribers: false,
    nonSubscriberFee: 70,
  },
  {
    urgency: URGENCY.URGENT,
    label: "Urgent (same/next-day)",
    flatFee: 100,
    freeForSubscribers: false,
    nonSubscriberFee: 100,
  },
];

export async function getUrgencyPricing() {
  const rows = await prisma.urgencyPricing.findMany();
  if (rows.length === 0) return DEFAULT_URGENCY_PRICING;
  return rows;
}

export async function getSubscriptionTiers() {
  return prisma.subscriptionTier.findMany({ orderBy: { monthlyPrice: "asc" } });
}
