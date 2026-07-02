import { CheckCircle2, Clock } from "lucide-react";

// The "Just completed" and "Up next" rail shown below the active step card.
// Returns null when analysis is complete so the completion view can take
// over the space.
export default function UpcomingStepsPanel({ pipeline, displayedActiveIdx, state }) {
  if (state === "complete") return null;
  const doneStep = displayedActiveIdx > 0 ? pipeline[displayedActiveIdx - 1] : null;
  const nextStep = pipeline[displayedActiveIdx + 1] || null;
  const nextNextStep = pipeline[displayedActiveIdx + 2] || null;
  const upcoming = [nextStep, nextNextStep].filter(Boolean);
  if (!doneStep && upcoming.length === 0) return null;
  return (
    <li className="list-none mt-4">
      {doneStep && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50/70 border border-emerald-100 px-3 py-2.5 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
              Just completed
            </div>
            <div className="font-bold text-[13px] text-kiddo-ink truncate">
              {doneStep.label}
            </div>
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Up next
          </div>
          <ul className="space-y-1.5">
            {upcoming.map((s, i) => {
              const StepIcon = s.icon;
              return (
                <li key={s.id} className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
                    <StepIcon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[12.5px] text-slate-700 leading-tight truncate">
                      {s.label}
                    </div>
                    <div className="text-[10.5px] text-slate-500 leading-tight truncate">
                      {s.desc}
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 tabular-nums shrink-0">
                    {String(displayedActiveIdx + 2 + i).padStart(2, "0")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
