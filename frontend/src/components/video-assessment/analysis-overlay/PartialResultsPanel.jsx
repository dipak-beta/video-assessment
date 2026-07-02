// Live results pill list — shown while analysis is running whenever the
// backend emits partial_observations. Pure presentational.
export default function PartialResultsPanel({ partial }) {
  if (!partial || partial.length === 0) return null;
  return (
    <div
      data-testid="analysis-partial-results"
      className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
          Live results
        </div>
        <div className="text-[10px] font-semibold text-emerald-700">
          {partial.length} of 8 domain{partial.length === 1 ? "" : "s"} ready
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {partial.slice(0, 8).map((d) => (
          <li
            key={d.domain}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-[11px] font-semibold text-slate-800"
            title={d.name || d.domain}
          >
            <span className="text-slate-500 capitalize">
              {(d.name || d.domain || "").split(" ")[0]}
            </span>
            <span className="tabular-nums text-emerald-700">{d.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
