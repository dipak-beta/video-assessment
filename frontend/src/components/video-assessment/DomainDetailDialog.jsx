import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X as XIcon,
  CheckCircle2,
  Clock,
  Camera,
  Lightbulb,
} from "lucide-react";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";
import VideoDropzone from "./VideoDropzone";

export default function DomainDetailDialog({
  open,
  domainKey,
  onClose,
  uploads,
  uploading,
  progress,
  uploadCompleteByDomain,
  onUpload,
  onDelete,
  onProcessingComplete,
}) {
  const domain = DOMAINS.find((d) => d.key === domainKey);
  if (!domain) return null;
  const u = uploads[domain.key];
  const isUp = uploading[domain.key];
  const pr = progress[domain.key] || 0;
  const uploadComplete = !!(uploadCompleteByDomain && uploadCompleteByDomain[domain.key]);
  const Icon = domain.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid={`domain-dialog-${domain.key}`}
        aria-describedby={undefined}
        className="max-w-2xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>
            Step {domain.index} of 9 · {domain.name}
          </DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div
          className="relative px-5 sm:px-7 pt-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${domain.color}18 0%, #FFFFFF 100%)`,
          }}
        >
          <div className="flex items-start gap-4 pr-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-soft shrink-0"
              style={{ background: domain.color, color: "white" }}
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    background: `${domain.color}1A`,
                    color: domain.color,
                  }}
                >
                  Step {domain.index} of 9
                </span>
                {u && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>
              <h2 className="mt-1 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
                {domain.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{domain.why}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="px-5 sm:px-7 py-5 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 180px)" }}
        >
          {/* Upload zone first */}
          <VideoDropzone
            domainKey={domain.key}
            domainColor={domain.color}
            uploaded={u}
            uploading={isUp}
            progress={pr}
            uploadComplete={uploadComplete}
            onUpload={(file) => onUpload(domain.key, file)}
            onDelete={() => onDelete(domain.key)}
            onProcessingComplete={() => onProcessingComplete?.(domain.key)}
            testIdUpload={VA.domainUpload(domain.key)}
            testIdRemove={VA.domainRemove(domain.key)}
            compact
          />

          {/* Quick meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {domain.duration}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> {domain.angle}
            </span>
          </div>

          {/* How to record */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Lightbulb className="w-3.5 h-3.5" /> How to record
            </div>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {domain.how}
            </p>
          </div>

          {/* AI observe */}
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              AI will observe
            </div>
            <div className="flex flex-wrap gap-1.5">
              {domain.observe.map((o) => (
                <span
                  key={o}
                  className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: `${domain.color}14`,
                    color: domain.color,
                  }}
                >
                  {o}
                </span>
              ))}
            </div>
          </div>

          {/* Examples + avoid */}
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-3 bg-emerald-50/60 border border-emerald-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                Good examples
              </div>
              <ul className="space-y-0.5 text-xs text-slate-700">
                {domain.examples.slice(0, 5).map((e) => (
                  <li key={e} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-3 bg-rose-50/60 border border-rose-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-1.5">
                Avoid
              </div>
              <ul className="space-y-0.5 text-xs text-slate-700">
                {domain.avoid.slice(0, 3).map((e) => (
                  <li key={e} className="flex items-start gap-1.5">
                    <XIcon className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
