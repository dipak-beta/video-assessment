import { ListChecks, Lightbulb, Sparkles } from "lucide-react";

// Hoisted at module scope so React sees a stable component type across
// renders (avoids react/no-unstable-nested-components).
function ProgramCard({ items, title, Icon, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-2xl p-4 ${tone.bg} border ${tone.border}`}>
      <div
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${tone.text}`}
      >
        <Icon className="w-3.5 h-3.5" /> {title}
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px] sm:text-xs text-slate-700">
        {items.map((s, i) => (
          <li key={`${i}-${s}`}>• {s}</li>
        ))}
      </ul>
    </div>
  );
}

// Renders the "Home program / Parent tips / Professional next steps"
// three-column block near the end of the report. Pure presentational —
// returns null if all three lists are empty.
export default function HomeProgramSection({
  homeProgram,
  parentTips,
  professionalRecommendations,
}) {
  const hp = homeProgram || [];
  const pt = parentTips || [];
  const pr = professionalRecommendations || [];
  if (hp.length === 0 && pt.length === 0 && pr.length === 0) return null;

  return (
    <div className="mt-6 grid sm:grid-cols-3 gap-3">
      <ProgramCard
        items={hp}
        title="Home program"
        Icon={ListChecks}
        tone={{ bg: "bg-slate-50", border: "border-slate-100", text: "text-slate-600" }}
      />
      <ProgramCard
        items={pt}
        title="Parent tips"
        Icon={Lightbulb}
        tone={{ bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700" }}
      />
      <ProgramCard
        items={pr}
        title="Professional next steps"
        Icon={Sparkles}
        tone={{ bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-700" }}
      />
    </div>
  );
}
