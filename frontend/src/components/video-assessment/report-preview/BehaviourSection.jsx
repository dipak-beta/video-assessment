import { Brain } from "lucide-react";

// Hoisted at module scope so React sees a stable component type across
// renders (avoids react/no-unstable-nested-components).
function BulletList({ items, title, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-xl bg-white border ${tone.border} p-3`}>
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

// Renders the "Behaviour & self-regulation" block of the report.
// Pure presentational — takes the raw `behaviour_section` object from the
// report payload and renders nothing if there's no meaningful content.
export default function BehaviourSection({ behaviourSection }) {
  const b = behaviourSection;
  if (!b) return null;
  const hasContent =
    b.summary || (b.regulation_strengths || []).length > 0;
  if (!hasContent) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-amber-800">
        <Brain className="w-4 h-4" />
        <div className="text-[10px] font-bold uppercase tracking-wider">
          Behaviour & self-regulation
        </div>
      </div>
      {b.summary && (
        <p className="mt-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {b.summary}
        </p>
      )}
      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <BulletList
          items={b.regulation_strengths}
          title="Regulation strengths"
          tone={{ border: "border-emerald-100", text: "text-emerald-700" }}
        />
        <BulletList
          items={b.regulation_challenges}
          title="Regulation challenges"
          tone={{ border: "border-amber-100", text: "text-amber-700" }}
        />
        <BulletList
          items={b.triggers}
          title="Likely triggers"
          tone={{ border: "border-rose-100", text: "text-rose-700" }}
        />
        <BulletList
          items={b.coping_strategies_observed}
          title="Coping strategies observed"
          tone={{ border: "border-sky-100", text: "text-sky-700" }}
        />
      </div>
      {b.caregiver_response && (
        <p className="mt-3 text-[11px] sm:text-xs italic text-slate-600">
          <strong className="not-italic">Caregiver response:</strong>{" "}
          {b.caregiver_response}
        </p>
      )}
      {(b.parent_suggestions || []).length > 0 && (
        <div className="mt-3 rounded-xl bg-white border border-amber-100 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            What to try at home
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] sm:text-xs text-slate-700">
            {(b.parent_suggestions || []).map((s, i) => (
              <li key={`${i}-${s}`}>• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
