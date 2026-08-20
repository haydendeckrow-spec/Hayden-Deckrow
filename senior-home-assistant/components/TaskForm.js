"use client";

import { useState } from "react";
import { quoteForUrgency } from "@/lib/pricingCalc";
import { URGENCY, URGENCY_LABELS } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { Label, TextInput, TextArea, Select } from "@/components/ui/FormField";

/**
 * Task request form with a live urgency-based price preview. The preview
 * uses the same lib/pricingCalc math the server uses when the request is
 * actually confirmed, so the number shown here never contradicts billing.
 */
export default function TaskForm({
  action,
  urgencyPricing,
  flexVisitsRemaining,
  initialTask,
  showPricing = true,
}) {
  const [urgency, setUrgency] = useState(initialTask?.urgency ?? URGENCY.WHENEVER);

  const quote = quoteForUrgency({
    urgencyPricing,
    urgency,
    isSubscriber: true,
    flexVisitsRemaining,
  });

  return (
    <form action={action} className="space-y-5">
      {initialTask && <input type="hidden" name="taskId" value={initialTask.id} />}

      <div>
        <Label htmlFor="title">What do you need help with?</Label>
        <TextInput
          id="title"
          name="title"
          required
          defaultValue={initialTask?.title}
          placeholder="e.g. Trim the front hedges"
        />
      </div>

      <div>
        <Label htmlFor="description">A few more details (optional)</Label>
        <TextArea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialTask?.description}
          placeholder="Anything the crew should know"
        />
      </div>

      <div>
        <Label htmlFor="photo">Add a photo (optional)</Label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="block w-full rounded-lg border-2 border-slate-300 px-4 py-3"
        />
      </div>

      {!initialTask && (
        <div>
          <Label htmlFor="urgency">How urgent is this?</Label>
          <Select
            id="urgency"
            name="urgency"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          >
            {Object.entries(URGENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <div
            className={`mt-3 rounded-xl border-2 p-4 ${quote.price === 0 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}
          >
            <p className="text-xl font-bold">
              {quote.price === 0
                ? "No charge"
                : showPricing
                  ? `Estimated price: $${quote.price}`
                  : "This will be billed to the account"}
            </p>
            {showPricing && <p className="text-slate-700">{quote.explanation}</p>}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full">
        {initialTask ? "Save changes" : "Request this task"}
      </Button>
    </form>
  );
}
