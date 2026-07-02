import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";

/**
 * Optional 9th card — Behavioural Challenges.
 * Parents can attach up to 2 clips of challenging behaviours (meltdowns,
 * sensory overload, refusal) for richer context, or skip.
 *
 * `uploads` is the shared uploads map. We look at the special keys
 *   `challenging_1`, `challenging_2`
 * to compute the card's state.
 */
export default function BehaviouralChallengesCard({
  uploads,
  uploading,
  skipped,
  onSelect,
}) {
  const slots = ["challenging_1", "challenging_2"];
  const uploadedCount = slots.filter((k) => uploads[k]).length;
  const anyUploading = slots.some((k) => uploading[k]);

  return (
    <motion.button
      type="button"
      data-testid="domain-card-challenging"
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: 0.24 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative text-left rounded-2xl bg-white border p-4 sm:p-5 transition-all ${
        uploadedCount > 0
          ? "border-emerald-200 ring-1 ring-emerald-100"
          : skipped
          ? "border-slate-200"
          : "border-amber-100 hover:border-amber-200 hover:shadow-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "#F472B61F", color: "#DB2777" }}
        >
          <ShieldAlert className="w-5 h-5" />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all mt-1" />
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
          style={{ background: "#F472B61A", color: "#DB2777" }}
        >
          Optional · 9th
        </span>
        {uploadedCount > 0 ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {uploadedCount}/2 attached
          </span>
        ) : anyUploading ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 inline-flex items-center gap-1">
            <CloudUpload className="w-3 h-3 animate-pulse" /> Uploading…
          </span>
        ) : skipped ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
            <HeartPulse className="w-3 h-3" /> Skipped
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
            <CloudUpload className="w-3 h-3" /> Tap to add (or skip)
          </span>
        )}
      </div>

      <h3 className="mt-1.5 font-heading font-bold text-kiddo-ink text-base sm:text-lg leading-tight">
        Behavioural Challenges
      </h3>
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
        Meltdowns · Sensory overload · Refusal · Aggression
      </p>

      {uploadedCount > 0 && (
        <div className="mt-3 flex gap-1.5">
          {slots.map((k) => (
            <div
              key={k}
              className={`h-1.5 flex-1 rounded-full ${
                uploads[k] ? "bg-emerald-500" : "bg-slate-100"
              }`}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}
