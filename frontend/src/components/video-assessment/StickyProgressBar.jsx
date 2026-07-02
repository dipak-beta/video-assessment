import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";

export default function StickyProgressBar({
  visible,
  uploads,
  uploadedCount,
  total = 9,
  analyzing,
  status,
  onAnalyze,
  onScrollToFirstDomain,
}) {
  const pct = Math.round((uploadedCount / total) * 100);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky"
          data-testid="sticky-progress-bar"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="sticky top-14 sm:top-16 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.08)]"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
            {/* ---- Mobile layout: two compact rows ---- */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="font-heading text-lg font-black text-kiddo-ink leading-none">
                    {uploadedCount}
                  </span>
                  <span className="text-sm text-slate-400 leading-none">/{total}</span>
                  <span className="ml-1 text-[11px] text-slate-500 leading-none truncate">
                    videos uploaded
                  </span>
                </div>
                <button
                  type="button"
                  onClick={
                    uploadedCount === 0 ? onScrollToFirstDomain : onAnalyze
                  }
                  disabled={analyzing}
                  data-testid={VA.runAnalysisBtn}
                  className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-kiddo-coral text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-kiddo-coralDeep transition-colors shadow-[0_8px_20px_-10px_rgba(255,138,101,0.7)]"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {status?.progress || 0}%
                    </>
                  ) : uploadedCount === 0 ? (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Upload
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Analyze
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <Progress value={pct} className="h-1.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums w-9 text-right">
                  {pct}%
                </span>
              </div>
            </div>

            {/* ---- Tablet/Desktop layout: single row ---- */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-baseline gap-1 shrink-0">
                <span className="font-heading text-lg font-black text-kiddo-ink leading-none">
                  {uploadedCount}
                </span>
                <span className="text-sm text-slate-400">/{total}</span>
                <span className="ml-1 text-xs text-slate-500">videos</span>
              </div>

              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="flex-1 max-w-[220px]">
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="flex flex-wrap gap-1 min-w-0">
                  {DOMAINS.map((d) => {
                    const done = !!uploads[d.key];
                    return (
                      <span
                        key={d.key}
                        title={d.name}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border transition-all"
                        style={
                          done
                            ? {
                                background: d.color,
                                borderColor: d.color,
                                color: "white",
                              }
                            : {
                                background: `${d.color}10`,
                                color: d.color,
                                borderColor: `${d.color}26`,
                              }
                        }
                      >
                        {d.name.split(" ")[0]}
                      </span>
                    );
                  })}
                  {/* 9th chip — optional behavioural */}
                  {(() => {
                    const done =
                      !!uploads["challenging_1"] || !!uploads["challenging_2"];
                    const color = "#F472B6";
                    return (
                      <span
                        title="Behavioural (optional)"
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border transition-all"
                        style={
                          done
                            ? {
                                background: color,
                                borderColor: color,
                                color: "white",
                              }
                            : {
                                background: `${color}10`,
                                color,
                                borderColor: `${color}26`,
                              }
                        }
                      >
                        Behaviour*
                      </span>
                    );
                  })()}
                </div>
              </div>

              <button
                type="button"
                onClick={
                  uploadedCount === 0 ? onScrollToFirstDomain : onAnalyze
                }
                disabled={analyzing}
                data-testid={`${VA.runAnalysisBtn}-desktop`}
                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-kiddo-coral text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-kiddo-coralDeep transition-colors shadow-[0_8px_20px_-10px_rgba(255,138,101,0.7)]"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing… {status?.progress || 0}%
                  </>
                ) : uploadedCount === 0 ? (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    Upload
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    Analyze {uploadedCount} video{uploadedCount > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
