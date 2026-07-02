import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileBarChart, Loader2 } from "lucide-react";
import ReportPreview from "./ReportPreview";
import ReportActions from "./ReportActions";

/**
 * ReportDialog
 * ------------------------------------------------------------
 * Wraps <ReportPreview /> in the same shadcn Dialog shell used
 * by ProcessDetailsDialog ("Inside the pipeline · How we process
 * your child's video"):
 *   - rounded-3xl card on a dim+blur scrim
 *   - gradient header with icon badge, uppercase eyebrow,
 *     bold heading, helper paragraph + action buttons
 *   - scrollable body underneath
 */
export default function ReportDialog({ open, onClose, report, onLoadDemo, onReportUpdated, onOpenReanalyze, analysisRunning, onResumeAnalysis }) {
  const r = report;
  // Derive clipCount + elapsedSec so <ReportActions> can piggyback the
  // "AI took X min vs ~Y clinician" brag line onto the WhatsApp share text.
  // clipCount: number of domains that produced observable evidence in this
  // session — a good proxy for "clips analysed".
  const clipCount = r
    ? (r.uploaded_domains?.length ||
       (r.domains || []).filter((d) => !d?.insufficient_evidence).length ||
       0)
    : 0;
  // elapsedSec: wall-time of the most recent analysis for this session,
  // persisted by VideoAssessment when the pipeline completed.
  let elapsedSec = null;
  if (r?.session_id && typeof window !== "undefined") {
    try {
      const v = window.localStorage.getItem(`va_elapsed_sec:${r.session_id}`);
      if (v != null) elapsedSec = Math.max(1, parseInt(v, 10) || 0) || null;
    } catch { /* ignore */ }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="report-dialog"
        aria-describedby={undefined}
        className="max-w-5xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Kiddo+ Development Report</DialogTitle>
        </VisuallyHidden>
        {/* Header — same pattern as ProcessDetailsDialog, compact on mobile */}
        <div className="relative px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-gradient-to-br from-orange-50 via-white to-teal-50">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4 pr-8">
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-kiddo-coral text-white flex items-center justify-center shrink-0 shadow-soft"
              >
                <FileBarChart className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-kiddo-coralDeep">
                  Kiddo+ Development Report
                </div>
                <h2 className="mt-0.5 font-heading text-lg sm:text-2xl font-black text-kiddo-ink leading-tight">
                  {r ? "AI Screening Result" : "Sample Report Preview"}
                </h2>
                {/* Description hidden on small screens to save vertical space */}
                <p className="mt-1 text-sm text-slate-600 hidden sm:block">
                  {r
                    ? "Your child's developmental screening across 9 steps (8 domains + optional behavioural) — scores, strengths, growth areas and a 30-day home program."
                    : "A live preview using sample data. Load a real session to see your child's report."}
                </p>
              </div>
            </div>

            {(r || analysisRunning) && (
              <div className="lg:pt-1 shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {analysisRunning && (
                  <button
                    type="button"
                    onClick={onResumeAnalysis}
                    data-testid="report-view-analysis-progress"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-kiddo-coral to-kiddo-coralDeep text-white text-sm font-bold shadow-[0_10px_28px_-12px_rgba(255,138,101,0.7)] hover:-translate-y-0.5 transition-all"
                    title="A new analysis is running in the background — open its progress"
                  >
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
                    </span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    View analysis progress
                  </button>
                )}
                {r && (
                  <ReportActions
                    sessionId={r.session_id}
                    clipCount={clipCount}
                    elapsedSec={elapsedSec}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className="px-4 sm:px-8 py-5 sm:py-7 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 170px)" }}
        >
          <ReportPreview
            report={report}
            onLoadDemo={onLoadDemo}
            onReportUpdated={onReportUpdated}
            onOpenReanalyze={onOpenReanalyze}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
