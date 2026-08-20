// Pure pricing math - no database or server-only imports, so this module is
// safe to import from both Server Components and Client Components (e.g.
// for the live price preview while a client is filling out a task request).

/**
 * Computes the price preview for a task request based on urgency and the
 * client's subscription/flex-visit state. Mirrors the logic used at
 * confirmation time so the preview shown to the client never lies.
 *
 * @param {object} params
 * @param {Array<{urgency: string, label: string, flatFee: number, freeForSubscribers: boolean, nonSubscriberFee: number}>} params.urgencyPricing
 * @param {string} params.urgency
 * @param {boolean} params.isSubscriber
 * @param {number} params.flexVisitsRemaining
 * @returns {{price: number, usesFlexVisit: boolean, explanation: string}}
 */
export function quoteForUrgency({ urgencyPricing, urgency, isSubscriber, flexVisitsRemaining }) {
  const rule = urgencyPricing.find((u) => u.urgency === urgency);
  if (!rule) {
    return { price: 0, usesFlexVisit: false, explanation: "" };
  }

  if (!isSubscriber) {
    return {
      price: rule.nonSubscriberFee,
      usesFlexVisit: false,
      explanation: `Non-subscriber rate for "${rule.label}".`,
    };
  }

  // Subscribers get flex visits/month included, regardless of urgency tier.
  if (flexVisitsRemaining > 0) {
    return {
      price: 0,
      usesFlexVisit: true,
      explanation: `Covered by 1 of your remaining flex visits (${flexVisitsRemaining} left this month).`,
    };
  }

  if (rule.freeForSubscribers) {
    return {
      price: 0,
      usesFlexVisit: false,
      explanation: `Included with your subscription - fits your next scheduled route.`,
    };
  }

  return {
    price: rule.flatFee,
    usesFlexVisit: false,
    explanation: `Flex visits used up for this month - billed at the "${rule.label}" rate.`,
  };
}
