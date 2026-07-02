import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  EyeOff,
  Trash2,
  Clock,
  Minimize2,
} from "lucide-react";
import CompletionView from "./CompletionView";
import LivePoseTracker from "./LivePoseTracker";
import { PIPELINE, FLOATERS } from "./analysis-overlay/constants";
import useAnalysisETA from "./analysis-overlay/useAnalysisETA";
import SkeletonVisualizer from "./analysis-overlay/SkeletonVisualizer";
import PartialResultsPanel from "./analysis-overlay/PartialResultsPanel";
import PipelineStepCard from "./analysis-overlay/PipelineStepCard";
import UpcomingStepsPanel from "./analysis-overlay/UpcomingStepsPanel";

export default function AnalysisOverlay({ open, status, videoFiles, report, onViewReport, onClose, onMinimise }) {
  const progress = status?.progress ?? 0;
  const state = status?.state ?? "analyzing";

  // Timer + baseline + ETA — extracted into a dedicated hook so the parent
  // stays focused on layout & orchestration.
  const { startedAt, nowMs, remainingInfo, elapsedLabel } = useAnalysisETA({
    open,
    state,
    progress,
    videoFiles,
  });
  const etaLabel = remainingInfo.text;

  const currentIdx = useMemo(
    () => PIPELINE.findIndex((s) => progress < s.to),
    [progress]
  );
  const activeIdx = currentIdx === -1 ? PIPELINE.length - 1 : currentIdx;

  // --- Minimum-dwell UI clock ---------------------------------------------
  // Each step in the pipeline should be VISIBLE for at least STEP_MIN_MS so
  // the user can read the label and see the animation. The backend
  // progresses on its own clock and may jump several steps at once. We
  // throttle the displayed active step to at most one step every
  // STEP_MIN_MS (independent of backend). The final displayed index is
  // min(uiClockIdx, activeIdx) so:
  //   • If backend is fast, the UI lags and shows each step for >= STEP_MIN_MS.
  //   • If backend is slow, the UI waits at the backend's step.
  const STEP_MIN_MS = 15000;
  const [uiClockIdx, setUiClockIdx] = useState(0);

  useEffect(() => {
    if (!open) setUiClockIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (uiClockIdx >= PIPELINE.length - 1) return undefined;
    const id = setTimeout(
      () => setUiClockIdx((i) => Math.min(i + 1, PIPELINE.length - 1)),
      STEP_MIN_MS
    );
    return () => clearTimeout(id);
  }, [open, uiClockIdx]);

  const displayedActiveIdx = Math.min(uiClockIdx, activeIdx);

  // Cycle floating labels every 1.8s
  const [floatTick, setFloatTick] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setFloatTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [open]);
  const visibleFloaters = useMemo(() => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      out.push(FLOATERS[(floatTick + i) % FLOATERS.length]);
    }
    return out;
  }, [floatTick]);

  const partial = (status?.partial_observations || []).filter(
    (d) => d && d.score != null && !d.insufficient_evidence
  );

  const activeStep =
    state === "complete"
      ? PIPELINE[PIPELINE.length - 1]
      : PIPELINE[displayedActiveIdx] || PIPELINE[0];
  const stepNumber = Math.min(displayedActiveIdx + 1, PIPELINE.length);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          data-testid="analysis-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="AI analysis in progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-5xl my-auto rounded-3xl bg-white overflow-hidden shadow-2xl"
          >
            {state === "complete" ? (
              <CompletionView
                onViewReport={onViewReport}
                onClose={onClose}
                reshootPrompts={report?.reshoot_prompts || []}
                elapsedSec={
                  startedAt != null
                    ? Math.max(1, Math.floor((nowMs - startedAt) / 1000))
                    : null
                }
                clipCount={
                  (status?.uploaded_domains || []).length ||
                  (report?.uploaded_domains || []).length ||
                  (report?.domains || []).filter((d) => !d?.insufficient_evidence).length
                }
              />
            ) : (
              <>
                {/* Top progress strip */}
                <div className="h-1.5 bg-slate-100 w-full">
                  <motion.div
                    className="h-full bg-gradient-to-r from-kiddo-coral via-kiddo-peach to-kiddo-mint"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>

                <div className="grid lg:grid-cols-12 gap-0">
                  {/* LEFT: Animated visualizer */}
                  <div className="lg:col-span-7 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-8 lg:p-10 min-h-[360px] sm:min-h-[460px] overflow-hidden">
                    {state === "analyzing" && onMinimise && (
                      <button
                        type="button"
                        onClick={onMinimise}
                        data-testid="analysis-minimise-btn"
                        aria-label="Minimise — keep analysing in background"
                        title="Minimise — keep analysing in background"
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all backdrop-blur-md"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        Minimise
                      </button>
                    )}
                    {/* soft glow */}
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-kiddo-coral/30 blur-3xl" />
                    <div className="absolute -bottom-24 -right-12 w-72 h-72 rounded-full bg-kiddo-mint/25 blur-3xl" />

                    <div className="relative flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      AI analysis in progress
                    </div>

                    <h2 className="relative mt-2 font-heading text-2xl sm:text-3xl font-black tracking-tight">
                      Reading your child&apos;s movements…
                    </h2>
                    <p className="relative mt-1 text-sm text-white/75 max-w-md">
                      Faces stay private. Only movement, gestures and behaviour
                      patterns are extracted.
                    </p>

                    {/* Skeleton / pose viewer */}
                    <div className="relative mt-6 sm:mt-8 mx-auto max-w-[280px] sm:max-w-[340px]">
                      {videoFiles && Object.keys(videoFiles).length > 0 ? (
                        <LivePoseTracker videoFiles={videoFiles} />
                      ) : (
                        <SkeletonVisualizer />
                      )}

                      {/* Floating signal pills */}
                      <div className="absolute -left-4 sm:-left-8 top-6 space-y-2 pointer-events-none">
                        <AnimatePresence mode="popLayout">
                          {visibleFloaters.slice(0, 2).map((f, i) => (
                            <motion.div
                              key={`${floatTick}-l-${i}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -12 }}
                              transition={{ duration: 0.5 }}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold bg-white/95 text-slate-900 shadow-lg"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: f.color }}
                              />
                              {f.txt}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="absolute -right-2 sm:-right-8 bottom-6 space-y-2 pointer-events-none">
                        <AnimatePresence mode="popLayout">
                          {visibleFloaters.slice(2, 3).map((f, i) => (
                            <motion.div
                              key={`${floatTick}-r-${i}`}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 12 }}
                              transition={{ duration: 0.5 }}
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold bg-white/95 text-slate-900 shadow-lg"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: f.color }}
                              />
                              {f.txt}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Trust footer */}
                    <div className="relative mt-6 sm:mt-8 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                        <ShieldCheck className="w-4 h-4 mx-auto text-emerald-300" />
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                          Encrypted
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                        <EyeOff className="w-4 h-4 mx-auto text-emerald-300" />
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                          Face Masked
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                        <Trash2 className="w-4 h-4 mx-auto text-emerald-300" />
                        <div className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                          Auto-deleted
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Pipeline steps */}
                  <div className="lg:col-span-5 bg-white p-5 sm:p-8 lg:p-10">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-kiddo-coralDeep">
                        AI pipeline
                      </div>
                      <div className="flex items-center gap-3">
                        {etaLabel && state === "analyzing" && (
                          <span
                            data-testid="analysis-eta-pill"
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm sm:text-base font-heading font-bold text-emerald-800 tabular-nums shadow-[0_2px_6px_-2px_rgba(16,185,129,0.35)]"
                          >
                            <Clock
                              className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${
                                remainingInfo.estimating ? "animate-pulse" : ""
                              }`}
                            />
                            {etaLabel}
                          </span>
                        )}
                        <div className="text-xs font-bold text-slate-500 tabular-nums">
                          {progress}%
                        </div>
                      </div>
                    </div>
                    <h3 className="mt-3 font-heading text-lg sm:text-xl font-black text-kiddo-ink">
                      {state === "complete"
                        ? "Report ready 🎉"
                        : PIPELINE[displayedActiveIdx]?.label || "Preparing analysis"}
                    </h3>

                    <p className="mt-2 text-xs sm:text-sm text-slate-500">
                      {state === "complete" ? (
                        <>Report ready — opening now.</>
                      ) : (
                        <>
                          {elapsedLabel && (
                            <>
                              Elapsed{" "}
                              <span className="tabular-nums text-slate-700">
                                {elapsedLabel}
                              </span>
                              {" · "}
                            </>
                          )}
                          You can leave this open — we&apos;ll auto-open your
                          report when it&apos;s ready.
                        </>
                      )}
                    </p>

                    {/* Progressive results — populated by the backend as each
                        video completes so parents see scores landing live. */}
                    {state !== "complete" && <PartialResultsPanel partial={partial} />}

                    <ul
                      data-testid="analysis-pipeline-steps"
                      className="mt-5"
                    >
                      {/* Segmented step indicator */}
                      <div className="flex items-center gap-1 mb-3" aria-hidden="true">
                        {PIPELINE.map((s, i) => {
                          const done = state === "complete" || i < displayedActiveIdx;
                          const isActive = i === displayedActiveIdx && state !== "complete";
                          return (
                            <div
                              key={s.id}
                              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                done
                                  ? "bg-emerald-400"
                                  : isActive
                                  ? "bg-kiddo-coral"
                                  : "bg-slate-200"
                              }`}
                            />
                          );
                        })}
                      </div>

                      <PipelineStepCard
                        activeStep={activeStep}
                        state={state}
                        stepNumber={stepNumber}
                        total={PIPELINE.length}
                      />

                      <UpcomingStepsPanel
                        pipeline={PIPELINE}
                        displayedActiveIdx={displayedActiveIdx}
                        state={state}
                      />
                    </ul>

                    {state === "error" && (
                      <div className="mt-4 rounded-2xl p-3 bg-rose-50 text-rose-700 text-sm">
                        {status?.error || "Something went wrong. Please retry."}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
