import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Zap,
  Lock,
  ShieldCheck,
} from "lucide-react";

/**
 * UploadProcessingSteps
 * ------------------------------------------------------------
 * Inline 3-step animation that sits under the upload-progress
 * bar inside DomainDetailDialog. Triggered by the parent once
 * upload progress crosses ~90%.
 *
 *   1. Compressing the video           — 3 s timer
 *   2. Encrypting and securing video   — 3 s timer
 *   3. Applying face privacy mask      — stays active until
 *      `uploadComplete` becomes true (i.e. until the real
 *      upload finishes and the parent is ready to open the
 *      next popup). After uploadComplete we mark it ✓, hold
 *      briefly and fire `onComplete`.
 *
 * Props
 *   - active          : start the sequence (latched on first true)
 *   - uploadComplete  : signal step 3 it can wrap up
 *   - onComplete      : called once all 3 steps are ✓ and held
 */

const STEPS = [
  {
    key: "compress",
    title: "Compressing the video",
    subtitle: "Optimising file size for fast, secure transit.",
    Icon: Zap,
    accent: "#FF8A65", // kiddo-coral
    tint: "#FFF1EB",
  },
  {
    key: "encrypt",
    title: "Encrypting and securing the video",
    subtitle: "End-to-end protected — only your therapist team can read it.",
    Icon: Lock,
    accent: "#5B8DEF", // soft indigo
    tint: "#EEF2FF",
  },
  {
    key: "mask",
    title: "Applying face privacy mask",
    subtitle: "On-device blur so your child is never identifiable.",
    Icon: ShieldCheck,
    accent: "#14B8A6", // kiddo-teal
    tint: "#E6FFFB",
  },
];

const TIMED_STEP_MS = 3000;     // steps 1 & 2
const STEP_BREATH_MS = 220;     // pause between consecutive steps
const FINAL_HOLD_MS = 500;      // hold green ✓ on step 3 before onComplete

export default function UploadProcessingSteps({
  active,
  uploadComplete,
  onComplete,
}) {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [doneFired, setDoneFired] = useState(false);

  // Latch first activation.
  useEffect(() => {
    if (active && !started) setStarted(true);
  }, [active, started]);

  // Drive steps 1 & 2 on fixed timers.
  useEffect(() => {
    if (!started) return undefined;
    const timers = [];

    // Step 1 -> done at TIMED_STEP_MS
    timers.push(
      setTimeout(() => {
        setCompleted((c) => (c.includes(0) ? c : [...c, 0]));
        timers.push(setTimeout(() => setCurrent(1), STEP_BREATH_MS));
      }, TIMED_STEP_MS)
    );

    // Step 2 -> done at 2 * TIMED_STEP_MS
    timers.push(
      setTimeout(() => {
        setCompleted((c) => (c.includes(1) ? c : [...c, 1]));
        timers.push(setTimeout(() => setCurrent(2), STEP_BREATH_MS));
      }, TIMED_STEP_MS * 2)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [started]);

  // Step 3 only wraps up once the real upload has finished. We also require
  // step 2 to be visually complete first so the user always sees all three.
  useEffect(() => {
    if (!started || doneFired) return undefined;
    if (!uploadComplete) return undefined;
    if (current < 2) return undefined; // wait until we've actually reached step 3
    if (!completed.includes(1)) return undefined;
    const timers = [];
    // Mark step 3 done, brief hold, then fire onComplete.
    setCompleted((c) => (c.includes(2) ? c : [...c, 2]));
    timers.push(
      setTimeout(() => {
        setDoneFired(true);
        onComplete?.();
      }, FINAL_HOLD_MS)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [started, uploadComplete, current, completed, doneFired, onComplete]);

  if (!started) return null;

  return (
    <div
      data-testid="upload-processing-steps"
      className="mt-4 rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-sm p-3 sm:p-3.5"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-kiddo-coralDeep">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kiddo-coral opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-kiddo-coral" />
          </span>
          Processing securely
        </div>
        <div className="text-[10px] font-semibold text-slate-400">
          {completed.length}/{STEPS.length}
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const isDone = completed.includes(i);
          const isActive = current === i && !isDone;
          const isPending = !isActive && !isDone;

          return (
            <li
              key={s.key}
              data-testid={`upload-step-${s.key}`}
              data-state={isDone ? "done" : isActive ? "active" : "pending"}
              className="flex items-start gap-2.5 rounded-xl p-2 sm:p-2.5"
              style={{
                background: isActive ? s.tint : "transparent",
                transition: "background 220ms ease",
              }}
            >
              {/* Icon tile */}
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  boxShadow: isActive
                    ? `0 6px 18px -10px ${s.accent}90`
                    : "0 0 0 0 rgba(0,0,0,0)",
                }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: isDone ? "#10B981" : s.accent,
                  color: "white",
                  opacity: isPending ? 0.32 : 1,
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDone ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="icon"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <s.Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Text + live bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div
                    className="text-[12.5px] sm:text-sm font-semibold text-kiddo-ink truncate"
                    style={{ opacity: isPending ? 0.55 : 1 }}
                  >
                    {s.title}
                  </div>
                  {isActive && (
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                  )}
                </div>
                <div
                  className="text-[10.5px] sm:text-[11.5px] text-slate-500 mt-0.5 leading-snug"
                  style={{ opacity: isPending ? 0.55 : 1 }}
                >
                  {s.subtitle}
                </div>

                {/* Indeterminate shuttle bar — same treatment for every
                    active step so the motion is consistent across the
                    trio. (Previously step 1 could render "fixed" because
                    the wrapping AnimatePresence had initial={false} which
                    swallowed the very first bar's entrance animation.) */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      key={`bar-${s.key}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-1.5 h-[3px] rounded-full overflow-hidden bg-slate-100 relative"
                    >
                      <motion.div
                        className="absolute top-0 h-full w-1/3 rounded-full"
                        style={{ background: s.accent }}
                        animate={{ x: ["-40%", "180%"] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
