import { motion } from "framer-motion";
import {
  CheckCircle2,
  Trash2,
  FileBarChart,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Timer,
} from "lucide-react";

const confetti = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: 50 + (Math.random() - 0.5) * 60,
  y: 50 + (Math.random() - 0.5) * 30,
  color: ["#FF8A65", "#4DB6AC", "#FFCA28", "#4FC3F7", "#81C784", "#FF6B6B"][
    i % 6
  ],
  delay: Math.random() * 0.4,
  dx: (Math.random() - 0.5) * 360,
  dy: -120 - Math.random() * 220,
  rotate: (Math.random() - 0.5) * 540,
  size: 5 + Math.random() * 6,
}));

// IMPORTANT: This view sits inside an AnimatePresence (in AnalysisOverlay).
// We deliberately render the tiles, privacy badge and CTAs WITHOUT
// `motion.*` wrappers / `initial={{ opacity: 0 }}` to avoid a framer-motion
// 11 + React 19 race condition that can leave child motion components stuck
// at the initial opacity (which made the "View Report" button invisible and
// unreachable).
export default function CompletionView({
  onViewReport,
  onClose,
  reshootPrompts = [],
  elapsedSec = null,
  clipCount = 0,
}) {
  // Benchmark: ~15 minutes of manual clinician review per clip. If we know
  // the analysis wall-time, subtract it — otherwise show the aggregate.
  const MANUAL_PER_CLIP_MIN = 15;
  const manualMin = Math.max(0, clipCount * MANUAL_PER_CLIP_MIN);
  const aiMin =
    elapsedSec != null ? Math.max(0.5, Math.round((elapsedSec / 60) * 10) / 10) : null;
  const savedMin =
    manualMin > 0
      ? Math.max(1, Math.round(manualMin - (aiMin ?? 0)))
      : 0;
  const savingsLabel =
    savedMin >= 60
      ? `~${Math.round(savedMin / 60)} h ${savedMin % 60 ? `${savedMin % 60} min` : ""}`.trim()
      : `~${savedMin} min`;

  return (
    <div
      data-testid="analysis-complete-view"
      className="relative w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50"
    >
      {/* Confetti — purely decorative, safe to keep on framer-motion */}
      <div className="absolute inset-0 pointer-events-none">
        {confetti.map((c) => (
          <motion.span
            key={c.id}
            initial={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              opacity: 1,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              x: c.dx,
              y: c.dy,
              opacity: [1, 1, 0],
              scale: [0, 1, 0.8],
              rotate: c.rotate,
            }}
            transition={{
              duration: 1.6,
              delay: c.delay,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: c.size,
              height: c.size * 0.4,
              background: c.color,
              borderRadius: 3,
            }}
          />
        ))}
      </div>

      <div className="relative px-6 sm:px-10 py-10 sm:py-14 flex flex-col items-center text-center max-w-2xl mx-auto">
        {/* Animated check */}
        <div className="relative">
          {/* Concentric rings */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid #34D399" }}
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{ scale: [0.6, 2.4], opacity: [0.6, 0] }}
              transition={{
                duration: 2,
                delay: 0.2 + i * 0.4,
                repeat: Infinity,
                repeatDelay: 0.8,
                ease: "easeOut",
              }}
            />
          ))}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(16,185,129,0.55)]">
            <svg
              viewBox="0 0 52 52"
              className="w-11 h-11 sm:w-12 sm:h-12"
              fill="none"
            >
              <path
                d="M14 27 L23 36 L40 18"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h2 className="mt-7 font-heading text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-kiddo-ink">
          Your report is ready
          <span className="inline-block ml-1.5">
            <Sparkles className="inline w-6 h-6 text-amber-500" />
          </span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md">
          We&apos;ve finished analysing your child&apos;s videos and prepared a
          calm, parent-friendly detailed developmental screening report.
        </p>

        {/* Confirmation tiles */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
          <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-soft flex items-start gap-3 text-left">
            <div className="relative w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="font-heading font-bold text-kiddo-ink text-sm">
                Videos deleted
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All uploaded videos were permanently removed.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-soft flex items-start gap-3 text-left">
            <div className="relative w-10 h-10 rounded-2xl bg-orange-50 text-kiddo-coralDeep flex items-center justify-center shrink-0">
              <FileBarChart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div>
              <div className="font-heading font-bold text-kiddo-ink text-sm">
                Report generated
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                8 domains scored + optional behavioural check.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy badge */}
        <div className="mt-6 inline-flex items-center gap-1.5 text-xs text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5" />
          Privacy preserved — only anonymised observations are kept.
        </div>

        {/* Time-saved badge — surfaces the AI's real value vs manual review */}
        {clipCount > 0 && savedMin > 0 && (
          <motion.div
            data-testid="completion-time-saved"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
            className="mt-5 w-full max-w-md rounded-2xl bg-white border border-emerald-100 p-4 shadow-soft flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-[0_10px_25px_-8px_rgba(20,184,166,0.55)]">
              <Timer className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Time saved
              </div>
              <div className="font-heading text-lg font-black text-kiddo-ink leading-tight">
                You&apos;ve saved {savingsLabel} of manual review
              </div>
            </div>
          </motion.div>
        )}

        {/* Reshoot prompts (from QC pass) */}
        {reshootPrompts.length > 0 && (
          <div
            data-testid="reshoot-prompts"
            className="mt-6 w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Reshoot tips
            </div>
            <div className="mt-1 text-sm font-bold text-amber-900">
              A couple of clips could be even better next time
            </div>
            <ul className="mt-2 space-y-1.5">
              {reshootPrompts.slice(0, 4).map((rp, i) => (
                <li key={i} className="text-xs text-amber-900">
                  <span className="font-bold">
                    {(rp.domain || "").replace(/_/g, " ")}
                  </span>
                  {": "}
                  {(rp.issues || []).join("; ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTAs — plain DOM, ALWAYS visible. */}
        <div className="mt-8 w-full max-w-md flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            data-testid="view-report-button"
            onClick={onViewReport}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-kiddo-coral text-white font-semibold shadow-[0_10px_30px_-12px_rgba(255,138,101,0.7)] hover:bg-kiddo-coralDeep transition-colors whitespace-nowrap"
          >
            View Report
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          <button
            type="button"
            data-testid="completion-close-button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-white border border-slate-200 text-kiddo-ink font-semibold hover:border-kiddo-coral transition-colors whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
