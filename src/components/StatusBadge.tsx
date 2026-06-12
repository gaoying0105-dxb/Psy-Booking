import { STATUS_TEXT } from "@/lib/format";

const COLORS: Record<string, string> = {
  pending: "bg-amber/10 text-amber border-amber/30",
  confirmed: "bg-pine-soft text-pine border-pine/30",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  rejected: "bg-red-50 text-red-500 border-red-200",
  no_show: "bg-red-50 text-red-600 border-red-200",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        COLORS[status] ?? COLORS.cancelled
      }`}
    >
      {STATUS_TEXT[status] ?? status}
    </span>
  );
}
