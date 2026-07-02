import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reanalyzeDomain } from "@/lib/api";
import DomainDetailDialog from "./DomainDetailDialog";

/**
 * Inline "Upload a clip for {Domain}" affordance rendered on domain cards
 * where the current evidence is missing / low-confidence / QC-failed.
 *
 * On click it opens the SAME DomainDetailDialog the parent uses on the main
 * assessment page — instructions, examples, "how to record", the animated
 * VideoDropzone, everything — but the upload inside is routed to the
 * single-domain `/reanalyze-domain` endpoint instead of the full pipeline.
 * The resulting refreshed report is bubbled up via `onReportUpdated`.
 */
export default function DomainReuploadButton({
  sessionId,
  domainKey,
  domainName,
  reason,
  onReportUpdated,
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);

  if (!sessionId || sessionId === "demo") return null;

  const resetInternal = () => {
    setUploading(false);
    setProgress(0);
    setUploadComplete(false);
    setUploaded(null);
    setPendingReport(null);
  };

  const closeDialog = () => {
    setOpen(false);
    // Small delay so the exit animation finishes before we wipe state,
    // otherwise the dropzone can flash empty mid-close.
    setTimeout(resetInternal, 250);
  };

  const handleUpload = async (_dk, file) => {
    setUploading(true);
    setProgress(0);
    setUploadComplete(false);
    try {
      const { report } = await reanalyzeDomain(sessionId, domainKey, file, (pct) =>
        setProgress(pct)
      );
      // Synthesise a minimal "uploaded" marker so the dropzone shows the
      // filled state while the 3-step animation wraps up.
      setUploaded({ domain: domainKey, filename: file.name, size_bytes: file.size });
      setPendingReport(report);
      // Flip the flag that lets UploadProcessingSteps close step 3.
      setUploadComplete(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.message) {
        toast.error(detail.message, {
          description: (detail.issues || []).slice(0, 2).join(" · "),
        });
      } else {
        toast.error("Couldn't analyse this clip. Please try another.");
      }
      setUploading(false);
      setUploadComplete(false);
    }
  };

  // Fired by UploadProcessingSteps once all 3 checkmarks land. At this
  // point the backend has ALREADY responded (uploaded state is set); we
  // simply push the new report up and close the dialog.
  const handleProcessingComplete = () => {
    if (pendingReport) {
      onReportUpdated?.(pendingReport);
      toast.success(`${domainName || domainKey} re-analysed`);
    }
    setUploading(false);
    closeDialog();
  };

  const handleDelete = () => {
    // Cancel/clear locally — nothing was persisted at the backend beyond
    // the re-analysis call itself (which either succeeded or errored).
    resetInternal();
  };

  return (
    <>
      <div className="mt-3 rounded-xl bg-white/80 border border-amber-100 p-2.5 flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Upload className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-amber-900">
            Upload a clip for {domainName || domainKey}
          </div>
          {reason && (
            <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {reason}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={uploading}
            data-testid={`domain-reupload-${domainKey}`}
            className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-kiddo-coral hover:bg-kiddo-coralDeep disabled:opacity-60 text-white text-[11px] font-bold transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> Record & upload clip
              </>
            )}
          </button>
        </div>
      </div>

      {/* Same popup used on the main assessment page — with all the
          instructions, examples, dos & don'ts, and animated dropzone. */}
      <DomainDetailDialog
        open={open}
        domainKey={domainKey}
        onClose={() => {
          // Don't allow closing mid-upload; the pipeline needs the file.
          if (uploading && !uploadComplete) return;
          closeDialog();
        }}
        uploads={uploaded ? { [domainKey]: uploaded } : {}}
        uploading={{ [domainKey]: uploading }}
        progress={{ [domainKey]: progress }}
        uploadCompleteByDomain={{ [domainKey]: uploadComplete }}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onProcessingComplete={handleProcessingComplete}
      />
    </>
  );
}
