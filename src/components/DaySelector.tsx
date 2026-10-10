"use client";

import { formatDayShort } from "@/lib/dates";

/** Horizontally scrollable day picker. */
export function DaySelector({
  days,
  selected,
  onSelect,
  labels,
  includeAll = false,
  today,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  labels?: Record<string, string>;
  includeAll?: boolean;
  today?: string;
}) {
  const options = [...(includeAll ? [{ value: "all", top: "Full trip", bottom: `${days.length} days` }] : []), ...days.map((d) => {
    const [wd, ...rest] = formatDayShort(d).split(" ");
    return { value: d, top: `${wd.replace(",", "")} ${rest.join(" ")}`, bottom: d === today ? "Today" : labels?.[d] || "" };
  })];

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Choose a day">
      <div className="flex gap-2 pb-1">
        {options.map((o) => {
          const active = o.value === selected;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(o.value)}
              className={`flex min-h-14 min-w-24 shrink-0 flex-col items-start justify-center rounded-xl border px-3 py-1.5 text-left ${
                active ? "border-palm-700 bg-palm-700 text-white" : "border-sand-200 bg-white text-ink hover:bg-sand-100"
              }`}
            >
              <span className="text-sm font-semibold">{o.top}</span>
              <span className={`max-w-32 truncate text-xs ${active ? "text-palm-100" : "text-muted"}`}>{o.bottom || " "}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
