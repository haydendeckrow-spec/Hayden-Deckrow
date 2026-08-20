import { getSubscriptionTiers, getUrgencyPricing } from "@/lib/pricing";
import { updateSubscriptionTierAction, updateUrgencyPricingAction } from "./actions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default async function PricingPage() {
  const [tiers, urgencyRules] = await Promise.all([getSubscriptionTiers(), getUrgencyPricing()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pricing Configuration</h1>
        <p className="text-slate-600">
          These values drive every price shown to clients - nothing is hardcoded in the app.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-800">Subscription tiers</h2>
        <div className="space-y-4">
          {tiers.map((tier) => (
            <form
              key={tier.id}
              action={updateSubscriptionTierAction}
              className="flex flex-wrap items-end gap-4 rounded-xl bg-slate-50 p-4"
            >
              <input type="hidden" name="id" value={tier.id} />
              <div>
                <p className="font-bold">{tier.name}</p>
                <p className="text-sm text-slate-500">{tier.crewSize}-person crew - {tier.visitFrequency}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">Monthly price ($)</label>
                <input
                  type="number"
                  name="monthlyPrice"
                  min={0}
                  defaultValue={tier.monthlyPrice}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">Flex visits/mo</label>
                <input
                  type="number"
                  name="flexVisitsPerMonth"
                  min={0}
                  defaultValue={tier.flexVisitsPerMonth}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <Button type="submit" className="px-4 py-2 text-sm">
                Save
              </Button>
            </form>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-800">On-demand / pop-in visit pricing</h2>
        <div className="space-y-4">
          {urgencyRules.map((rule) => (
            <form
              key={rule.id}
              action={updateUrgencyPricingAction}
              className="flex flex-wrap items-end gap-4 rounded-xl bg-slate-50 p-4"
            >
              <input type="hidden" name="id" value={rule.id} />
              <p className="w-40 font-bold">{rule.label}</p>
              <div>
                <label className="block text-xs font-semibold text-slate-500">Subscriber flat fee ($)</label>
                <input
                  type="number"
                  name="flatFee"
                  min={0}
                  defaultValue={rule.flatFee}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">Non-subscriber fee ($)</label>
                <input
                  type="number"
                  name="nonSubscriberFee"
                  min={0}
                  defaultValue={rule.nonSubscriberFee}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1.5"
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  id={`free-${rule.id}`}
                  name="freeForSubscribers"
                  defaultChecked={rule.freeForSubscribers}
                  className="h-5 w-5"
                />
                <label htmlFor={`free-${rule.id}`} className="text-sm">Free for subscribers</label>
              </div>
              <Button type="submit" className="px-4 py-2 text-sm">
                Save
              </Button>
            </form>
          ))}
        </div>
      </Card>

      <p className="text-sm text-slate-500">
        Note: subscribers always get their first 2 flex visits per month free, regardless of these
        settings - that rule lives in <code>lib/pricingCalc.js</code>.
      </p>
    </div>
  );
}
