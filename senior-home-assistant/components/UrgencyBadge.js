import { URGENCY_LABELS } from "@/lib/constants";

const STYLES = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  THIS_WEEK: "bg-amber-100 text-amber-800 border-amber-300",
  WHENEVER: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export default function UrgencyBadge({ urgency }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm font-bold whitespace-nowrap ${STYLES[urgency] ?? "bg-slate-100 text-slate-800 border-slate-300"}`}
    >
      {URGENCY_LABELS[urgency] ?? urgency}
    </span>
  );
}
