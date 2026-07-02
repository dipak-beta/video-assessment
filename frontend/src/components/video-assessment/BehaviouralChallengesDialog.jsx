import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  ShieldAlert,
  Info,
  Lightbulb,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";
import VideoDropzone from "./VideoDropzone";

const SLOTS = [
  {
    key: "challenging_1",
    title: "Clip 1 · Behavioural challenge",
    hint: "A moment that's tough at home — meltdown, refusal, sensory overload.",
  },
  {
    key: "challenging_2",
    title: "Clip 2 · Optional second example",
    hint: "Another example or a different type of challenging moment.",
  },
];

export default function BehaviouralChallengesDialog({
  open,
  onClose,
  uploads,
  uploading,
  progress,
  onUpload,
  onDelete,
  onSkip,
  onDone,
}) {
  const uploadedCount = SLOTS.filter((s) => uploads[s.key]).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="behavioural-challenges-dialog"
        aria-describedby={undefined}
        className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Behavioural challenges (optional)</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div
          className="relative px-5 sm:px-7 pt-6 pb-5"
          style={{
            background:
              "linear-gradient(135deg, #FCE7F3 0%, #FFFFFF 60%, #FEF3C7 100%)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#F472B6", color: "white" }}
            >
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-pink-700">
                Optional · Step 9
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-black text-kiddo-ink leading-tight">
                Behavioural challenges
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-md">
                Real-life clips of moments that are tough at home help the AI
                understand context — triggers, intensity, recovery patterns.
                Skip if you&apos;d rather not share.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-7 py-4 overflow-y-auto">
          {/* Info strip */}
          <div className="flex items-start gap-2 rounded-2xl bg-pink-50/70 border border-pink-100 p-3 mb-4">
            <Info className="w-4 h-4 text-pink-600 mt-0.5 shrink-0" />
            <div className="text-xs text-pink-900 leading-relaxed">
              These clips are <b>not scored on their own</b>. They&apos;re used
              as context to enrich the overall report — for example, to suggest
              calmer transitions or sensory strategies.
            </div>
          </div>

          {/* What to capture */}
          <div className="rounded-2xl border border-slate-100 p-3 mb-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              What helps the most
            </div>
            <ul className="mt-1.5 text-xs text-slate-700 space-y-1">
              <li>• Capture the moment naturally — don&apos;t stage it.</li>
              <li>• Include the lead-up so the trigger is visible.</li>
              <li>• 30 – 90 seconds is plenty. Faces are masked on-device.</li>
            </ul>
          </div>

          {/* Two upload slots */}
          <div className="space-y-3">
            {SLOTS.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                className="rounded-2xl border border-slate-100 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-kiddo-ink">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-500">{s.hint}</div>
                  </div>
                  {uploads[s.key] && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Attached
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <VideoDropzone
                    domainKey={s.key}
                    isUploading={!!uploading[s.key]}
                    isDone={!!uploads[s.key]}
                    progress={progress[s.key] || 0}
                    onUpload={(file) => onUpload(s.key, file)}
                    onDelete={() => onDelete(s.key)}
                    compact={false}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 sm:px-7 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="cb-skip"
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip this step
          </button>
          <button
            type="button"
            data-testid="cb-done"
            onClick={onDone}
            className="ml-auto inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-pink-500 text-white text-sm font-bold hover:bg-pink-600 disabled:opacity-50"
            disabled={uploadedCount === 0}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {uploadedCount > 0
              ? `Done · ${uploadedCount} attached`
              : "Attach a clip to continue"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
