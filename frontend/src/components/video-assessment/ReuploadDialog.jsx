import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, Wand2, CheckCircle2 } from "lucide-react";
import { DOMAINS } from "@/data/domains";
import VideoDropzone from "./VideoDropzone";

/**
 * Given the current report, return the list of domains that still need a
 * fresh clip: insufficient evidence, low-confidence QC on the previously
 * uploaded clip, or an explicit reshoot prompt from the QC gate.
 *
 * Exported so parents can compute the count for a top-of-report banner
 * without duplicating the logic.
 */
export function getPendingReuploadDomains(report) {
  if (!report) return [];
  const lowConf = new Set(report.low_confidence_videos || []);
  const reshootByDomain = Object.fromEntries(
    (report.reshoot_prompts || []).map((p) => [p.domain, p])
  );
  const insufficientMap = new Map();
  (report.domains || []).forEach((d) => {
    insufficientMap.set(d.domain, !!d.insufficient_evidence);
  });
  (report.per_domain_narratives || []).forEach((n) => {
    if (n.insufficient_evidence) insufficientMap.set(n.domain, true);
  });

  return DOMAINS.filter((d) => {
    return (
      insufficientMap.get(d.key) ||
      lowConf.has(d.key) ||
      !!reshootByDomain[d.key]
    );
  }).map((d) => {
    const reshoot = reshootByDomain[d.key];
    let reason =
      "Not enough evidence yet — a fresh clip focused on this domain will unlock the score.";
    if (reshoot && (reshoot.issues || [])[0]) {
      reason = reshoot.issues[0];
    } else if (lowConf.has(d.key)) {
      reason =
        "The AI wasn't confident on this clip — a fresh take will strengthen the score.";
    } else if (insufficientMap.get(d.key)) {
      reason = "No uploaded video covered this domain clearly.";
    }
    return { ...d, reason };
  });
}

/**
 * ReuploadDialog — one unified popup that lists ALL domains needing a fresh
 * clip, lets the parent attach a video for any subset, then hands the
 * collected files back to the caller which fires them through the batch
 * re-analysis pipeline (which in turn opens the AnalysisOverlay).
 */
export default function ReuploadDialog({
  open,
  onClose,
  report,
  focusDomain,
  onSubmit,
}) {
  const pending = useMemo(() => getPendingReuploadDomains(report), [report]);
  const [filesByDomain, setFilesByDomain] = useState({});
  const [uploadStates, setUploadStates] = useState({});

  // Reset local state when the dialog closes (small timeout so exit
  // animation isn't jarring).
  useEffect(() => {
    if (open) return undefined;
    const t = setTimeout(() => {
      setFilesByDomain({});
      setUploadStates({});
    }, 250);
    return () => clearTimeout(t);
  }, [open]);

  // Scroll a specific domain into view when the dialog opens with a
  // focusDomain (e.g. parent tapped "Upload clip" on that domain's card).
  useEffect(() => {
    if (!open || !focusDomain) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`reupload-row-${focusDomain}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220);
    return () => clearTimeout(t);
  }, [open, focusDomain]);

  const handleFileAdd = (domainKey, file) => {
    setFilesByDomain((m) => ({ ...m, [domainKey]: file }));
    setUploadStates((m) => ({
      ...m,
      [domainKey]: {
        filename: file.name,
        size_bytes: file.size,
        domain: domainKey,
      },
    }));
  };

  const handleFileRemove = (domainKey) => {
    setFilesByDomain((m) => {
      const n = { ...m };
      delete n[domainKey];
      return n;
    });
    setUploadStates((m) => {
      const n = { ...m };
      delete n[domainKey];
      return n;
    });
  };

  const totalReady = Object.keys(filesByDomain).length;
  const canSubmit = totalReady > 0;
  const nothingPending = pending.length === 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit?.(filesByDomain);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="reupload-dialog"
        aria-describedby={undefined}
        className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Re-upload clips for pending domains</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="relative px-5 sm:px-7 pt-5 sm:pt-6 pb-4 bg-gradient-to-br from-orange-50 via-white to-teal-50">
          <div className="flex items-start gap-3 pr-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-kiddo-coral text-white flex items-center justify-center shrink-0 shadow-soft"
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-kiddo-coralDeep">
                Boost your report
              </div>
              <h2 className="mt-0.5 font-heading text-lg sm:text-2xl font-black text-kiddo-ink leading-tight">
                {nothingPending
                  ? "All domains are scored — nothing to re-upload"
                  : `${pending.length} clip${
                      pending.length === 1 ? "" : "s"
                    } will strengthen your report`}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Add a fresh 30–60 second clip for any domain below. Upload one,
                a few, or all — we&apos;ll re-analyse them together and refresh
                your report in one go.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="px-4 sm:px-7 py-4 sm:py-5 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 220px)" }}
        >
          {nothingPending ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="mt-2 text-sm text-slate-700">
                Every domain in your report already has enough evidence.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pending.map((d) => {
                const Icon = d.icon;
                const uploaded = uploadStates[d.key];
                const highlight = d.key === focusDomain;
                return (
                  <li
                    key={d.key}
                    id={`reupload-row-${d.key}`}
                    data-testid={`reupload-row-${d.key}`}
                    className={`rounded-2xl border p-3 sm:p-4 transition-colors ${
                      highlight
                        ? "border-kiddo-coral bg-orange-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${d.color}1F`, color: d.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-bold text-kiddo-ink text-sm sm:text-base">
                            {d.name}
                          </h3>
                          {uploaded ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Clip ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 inline-flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Needs clip
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-snug">
                          {d.reason}
                        </p>
                        <div className="mt-3">
                          <VideoDropzone
                            domainKey={d.key}
                            domainColor={d.color}
                            uploaded={uploaded}
                            uploading={false}
                            progress={0}
                            onUpload={(file) => handleFileAdd(d.key, file)}
                            onDelete={() => handleFileRemove(d.key)}
                            testIdUpload={`reupload-drop-${d.key}`}
                            testIdRemove={`reupload-remove-${d.key}`}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-100 bg-white px-4 sm:px-7 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 justify-between">
          <div className="text-xs sm:text-sm text-slate-500">
            {nothingPending ? (
              <span>Nothing to re-analyse.</span>
            ) : totalReady === 0 ? (
              <span>Attach at least one clip to continue.</span>
            ) : (
              <span>
                <span className="font-bold text-kiddo-ink">{totalReady}</span>{" "}
                clip{totalReady === 1 ? "" : "s"} ready to re-analyse
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              data-testid="reupload-submit"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-kiddo-coral hover:bg-kiddo-coralDeep disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-[0_10px_28px_-12px_rgba(255,138,101,0.7)]"
            >
              <Wand2 className="w-4 h-4" />
              {totalReady > 1
                ? `Re-analyse ${totalReady} clips`
                : "Re-analyse clip"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
