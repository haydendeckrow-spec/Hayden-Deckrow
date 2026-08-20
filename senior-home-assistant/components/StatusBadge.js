import { TASK_STATUS_LABELS } from "@/lib/constants";

const STYLES = {
  REQUESTED: "bg-slate-100 text-slate-800 border-slate-300",
  SCHEDULED: "bg-blue-100 text-blue-800 border-blue-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-300 line-through",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm font-bold whitespace-nowrap ${STYLES[status] ?? "bg-slate-100 text-slate-800 border-slate-300"}`}
    >
      {TASK_STATUS_LABELS[status] ?? status}
    </span>
  );
}
