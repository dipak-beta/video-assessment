import { CalendarClock } from "lucide-react";

// Hoisted at module scope so React sees a stable component type across
// renders (avoids react/no-unstable-nested-components).
function MilestoneColumn({ items, title, tone }) {
  return (
    <div className={`rounded-2xl p-3 ${tone.bg} border ${tone.border}`}>
      <div
        className={`text-[10px] font-bold uppercase tracking-wider ${tone.text}`}
      >
        {title}
      </div>
      <ul className="mt-1 space-y-0.5 text-[11px] sm:text-xs text-slate-700">
        {items.map((s, i) => (
          <li key={`${i}-${s}`}>• {s}</li>
        ))}
      </ul>
    </div>
  );
}

// Renders the "Developmental milestones" block (Achieved / Emerging / Next to
// watch for). Pure presentational — returns null if the report has no
// milestone data.
export default function DevelopmentalMilestonesSection({ milestones }) {
  if (!milestones) return null;
  const achieved = milestones.achieved || [];
  const emerging = milestones.emerging || [];
  const next = milestones.next_to_watch_for || [];
  if (achieved.length === 0 && emerging.length === 0 && next.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <CalendarClock className="w-3.5 h-3.5" />
        Developmental milestones
      </div>
      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <MilestoneColumn
          items={achieved}
          title="Achieved"
          tone={{ bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700" }}
        />
        <MilestoneColumn
          items={emerging}
          title="Emerging"
          tone={{ bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-700" }}
        />
        <MilestoneColumn
          items={next}
          title="Next to watch for"
          tone={{ bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" }}
        />
      </div>
    </div>
  );
}
