import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Upload, PlayCircle } from "lucide-react";

/**
 * Confirmation shown when a parent taps "Analyse" but fewer than 8 domain
 * videos are uploaded. Gently nudges them toward completing the set for a
 * more accurate report, but lets them continue if they want to.
 *
 * Buttons:
 *   • primary   → "Upload next video"   (opens the next empty domain popup)
 *   • secondary → "Continue anyway"      (runs the analysis on what's there)
 */
export default function PartialAnalyzeConfirmDialog({
  open,
  uploadedCount,
  totalDomains = 8,
  nextDomainName,
  onUploadNext,
  onContinueAnyway,
  onClose,
}) {
  const remaining = Math.max(0, totalDomains - uploadedCount);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="partial-analyze-confirm"
        aria-describedby={undefined}
        className="max-w-md w-[calc(100vw-1.5rem)] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>
            Only {uploadedCount} of {totalDomains} domain videos uploaded
          </DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-50 via-white to-orange-50">
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
              className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-[0_10px_28px_-12px_rgba(217,119,6,0.45)]"
            >
              <AlertTriangle className="w-5 h-5" />
            </motion.div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                Partial upload
              </div>
              <h2 className="mt-0.5 font-heading text-lg sm:text-xl font-black text-kiddo-ink leading-tight">
                {remaining === 1
                  ? "One more domain and you\u2019ll get the full picture"
                  : `${remaining} more domains and you\u2019ll get the full picture`}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-700 leading-relaxed">
            You&apos;ve uploaded{" "}
            <span className="font-bold text-kiddo-ink">
              {uploadedCount} of {totalDomains}
            </span>{" "}
            developmental-domain videos. Uploading a short clip for every domain
            gives our AI the strongest evidence to score each area and produce a
            complete, personalised report.
          </p>

          <div className="mt-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
              For best results
            </div>
            <ul className="mt-1.5 space-y-1 text-[12.5px] text-slate-700 leading-snug">
              <li>• More coverage &rarr; higher confidence per domain</li>
              <li>
                • Fewer &ldquo;insufficient evidence&rdquo; flags in your report
              </li>
              <li>• Clearer strengths, growth areas &amp; home program</li>
            </ul>
          </div>

          {nextDomainName && (
            <div className="mt-4 text-xs text-slate-500">
              Next up:{" "}
              <span className="font-semibold text-kiddo-ink">
                {nextDomainName}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-1 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            data-testid="partial-analyze-continue"
            onClick={onContinueAnyway}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Continue anyway
          </button>
          <button
            type="button"
            data-testid="partial-analyze-upload-next"
            onClick={onUploadNext}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-kiddo-coral hover:bg-kiddo-coralDeep text-white text-sm font-bold shadow-[0_10px_28px_-12px_rgba(255,138,101,0.7)] hover:-translate-y-0.5 transition-all"
          >
            <Upload className="w-4 h-4" />
            {nextDomainName
              ? `Upload ${nextDomainName}`
              : "Upload next video"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
