import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

// The "active pipeline step" card — one card visible at a time, animated
// in/out as `activeStep` changes. Pure presentational.
export default function PipelineStepCard({ activeStep, state, stepNumber, total }) {
  const Icon = activeStep.icon;
  const isComplete = state === "complete";
  return (
    <li
      data-testid={`pipeline-card-${activeStep.id}`}
      data-state={isComplete ? "done" : "active"}
      className="list-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeStep.id}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="relative rounded-3xl border border-kiddo-coral/60 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 sm:p-6 overflow-hidden shadow-[0_18px_40px_-22px_rgba(255,138,101,0.55)]"
        >
          {/* Animated sheen */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(255,138,101,0.18) 50%, transparent 70%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-200/40 blur-3xl"
          />

          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 border border-orange-100 text-[10px] font-black uppercase tracking-[0.14em] text-kiddo-coralDeep tabular-nums">
              Step {stepNumber}
              <span className="text-slate-400">/ {total}</span>
            </span>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-kiddo-coralDeep">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                In progress
              </span>
            )}
          </div>

          <div className="relative mt-4 flex items-start gap-4">
            <motion.div
              animate={
                isComplete
                  ? { scale: 1 }
                  : {
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(255,138,101,0.0)",
                        "0 14px 30px -12px rgba(255,138,101,0.7)",
                        "0 0 0 0 rgba(255,138,101,0.0)",
                      ],
                    }
              }
              transition={
                isComplete
                  ? { duration: 0.2 }
                  : { duration: 2.4, repeat: Infinity }
              }
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                isComplete ? "bg-emerald-500 text-white" : "bg-kiddo-coral text-white"
              }`}
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="font-heading font-black text-kiddo-ink text-base sm:text-lg leading-tight">
                {activeStep.label}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeStep.desc}
              </p>
            </div>
          </div>

          {/* Indeterminate bar on the active step */}
          {!isComplete && (
            <div className="relative mt-4 h-1.5 rounded-full overflow-hidden bg-orange-100">
              <motion.div
                className="absolute top-0 h-full w-1/3 rounded-full bg-kiddo-coral"
                animate={{ x: ["-40%", "180%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </li>
  );
}
