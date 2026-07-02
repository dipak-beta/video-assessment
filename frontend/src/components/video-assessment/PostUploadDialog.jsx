import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Wand2, ArrowRight, Lock, EyeOff } from "lucide-react";
import { DOMAINS } from "@/data/domains";
import FaceBlurPreview from "./FaceBlurPreview";

export default function PostUploadDialog({
  open,
  uploadedDomainKey,
  uploadedFile,
  uploadsCount,
  onClose,
  onContinue,
  onAnalyze,
}) {
  if (!uploadedDomainKey) return null;
  const uploaded = DOMAINS.find((d) => d.key === uploadedDomainKey);
  if (!uploaded) return null;

  // Determine next domain (first in DOMAINS order not yet uploaded — minus current)
  // We rely on prop `uploadedKeys` via context if provided; otherwise pick by index.
  const Icon = uploaded.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="post-upload-dialog"
        aria-describedby={undefined}
        className="max-w-md rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>
            {uploaded.name} video uploaded — next step
          </DialogTitle>
        </VisuallyHidden>
        <div className="relative">

          {/* Top hero strip */}
          <div
            className="px-6 pt-7 pb-4"
            style={{
              background: `linear-gradient(135deg, ${uploaded.color}14 0%, #FFFFFF 100%)`,
            }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-soft mb-3"
              style={{ background: uploaded.color, color: "white" }}
            >
              <Icon className="w-7 h-7" />
            </motion.div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Video uploaded
            </div>
            <h3 className="mt-1 font-heading text-xl font-black text-kiddo-ink">
              {uploaded.name} ready
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Great — that&apos;s {uploadsCount} of 9 steps done. What would
              you like to do next?
            </p>
          </div>

          {/* Masked video preview (uploaded clip with faces blurred on-device) */}
          {uploadedFile && (
            <div className="px-6 pt-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4 }}
              >
                <FaceBlurPreview file={uploadedFile} />
              </motion.div>
            </div>
          )}

          {/* Privacy reassurance — animated "done" badges */}
          <div className="px-6 pt-3 pb-4 grid grid-cols-2 gap-2.5">
            {[
              {
                icon: Lock,
                label: "Encrypting & secure storage",
                tone: "from-emerald-500 to-teal-500",
                ring: "rgba(16,185,129,0.45)",
              },
              {
                icon: EyeOff,
                label: "Face privacy masking",
                tone: "from-teal-500 to-sky-500",
                ring: "rgba(14,165,233,0.45)",
              },
            ].map(({ icon: BadgeIcon, label, tone, ring }, i) => (
              <motion.div
                key={label}
                data-testid={`post-upload-reassure-${i}`}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 0.15 + i * 0.12,
                  type: "spring",
                  stiffness: 280,
                  damping: 20,
                }}
                className="relative flex items-center gap-2.5 rounded-2xl px-3 py-2.5 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 overflow-hidden"
                style={{ boxShadow: `0 6px 20px -10px ${ring}` }}
              >
                {/* Sweeping shimmer */}
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
                    filter: "blur(4px)",
                  }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "320%" }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    repeatDelay: 1.8 + i * 0.6,
                    ease: "easeInOut",
                  }}
                />

                {/* Icon tile with pulsing ring */}
                <span className="relative shrink-0">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl"
                    style={{ boxShadow: `0 0 0 0 ${ring}` }}
                    animate={{
                      boxShadow: [
                        `0 0 0 0 ${ring}`,
                        `0 0 0 6px rgba(16,185,129,0)`,
                      ],
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      delay: 0.4 + i * 0.3,
                      ease: "easeOut",
                    }}
                  />
                  <span
                    className={`relative w-9 h-9 rounded-xl bg-gradient-to-br ${tone} text-white flex items-center justify-center`}
                  >
                    <BadgeIcon className="w-4 h-4" />
                  </span>
                  {/* Animated check stamp */}
                  <motion.span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow ring-1 ring-emerald-200"
                    initial={{ scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.55 + i * 0.12,
                      type: "spring",
                      stiffness: 420,
                      damping: 16,
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </motion.span>
                </span>

                <div className="min-w-0 relative">
                  <div className="text-[11px] font-bold text-emerald-900 leading-tight">
                    {label}
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    <motion.span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.2,
                      }}
                    />
                    Done
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pt-1 pb-6 space-y-2.5">
            <button
              type="button"
              onClick={onContinue}
              data-testid="post-upload-continue"
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-kiddo-coral hover:bg-orange-50/40 text-left transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-kiddo-coralDeep flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-kiddo-ink text-sm">
                  Upload next video
                </div>
                <div className="text-xs text-slate-500">
                  Open the next domain to keep going
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onAnalyze}
              data-testid="post-upload-analyze"
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-kiddo-coral text-white hover:bg-kiddo-coralDeep transition-colors text-left shadow-[0_10px_30px_-12px_rgba(255,138,101,0.7)]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  Analyze {uploadsCount} video{uploadsCount > 1 ? "s" : ""} now
                </div>
                <div className="text-xs text-white/85">
                  Generate the AI screening report
                </div>
              </div>
            </button>

            <p className="text-[11px] text-slate-400 text-center pt-1">
              You can add more videos any time from the dashboard.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
