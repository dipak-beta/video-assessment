import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  EyeOff,
  Lock,
  Trash2,
  Cpu,
  Globe2,
  Clock,
  Hash,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { getTrustStats } from "@/lib/api";

const fmtSec = (s) => {
  if (!s) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const ss = Math.round(s - m * 60);
  return `${m}m ${ss}s`;
};

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
  >
    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700">
      <Icon className="w-4.5 h-4.5" />
    </div>
    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {label}
    </div>
    <div className="font-heading text-2xl font-black text-kiddo-ink">{value}</div>
    {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
  </motion.div>
);

const Principle = ({ icon: Icon, title, body }) => (
  <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-white p-3">
    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <div className="font-bold text-kiddo-ink text-sm">{title}</div>
      <div className="text-xs text-slate-600 leading-relaxed">{body}</div>
    </div>
  </div>
);

export default function TrustCenterDialog({ open, onClose }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try { setStats(await getTrustStats()); } catch { /* ignore */ }
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="trust-center-dialog"
        aria-describedby={undefined}
        className="max-w-2xl rounded-3xl border border-slate-100 p-0 overflow-hidden bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Kiddo+ Trust Center</DialogTitle>
        </VisuallyHidden>

        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/60">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacy that we can prove
          </div>
          <h2 className="mt-1 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
            Kiddo+ Trust Center
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Live, anonymised numbers from our analysis pipeline.
          </p>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <StatCard
              icon={Clock}
              label="Avg. video lifetime"
              value={stats ? fmtSec(stats.avg_video_lifetime_sec) : "—"}
              sub="Upload → deletion"
            />
            <StatCard
              icon={Trash2}
              label="Videos deleted"
              value={stats ? stats.videos_processed_and_deleted.toLocaleString() : "—"}
              sub="Processed and removed"
            />
            <StatCard
              icon={Hash}
              label="Reports generated"
              value={stats ? stats.total_assessments_generated.toLocaleString() : "—"}
              sub="AI screenings completed"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Principle
              icon={EyeOff}
              title="On-device face masking"
              body="Your phone detects and masks faces before the video is uploaded."
            />
            <Principle
              icon={Lock}
              title="Encrypted in transit & at rest"
              body="TLS 1.3 in transit. Isolated processing storage."
            />
            <Principle
              icon={Cpu}
              title="Powered by Google Gemini"
              body="Pose, hand-tracking, action recognition. Never facial recognition."
            />
            <Principle
              icon={Globe2}
              title="Pseudonymous by default"
              body="No account, no email, no device fingerprint."
            />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              What happens to your video
            </div>
            <ol className="mt-2 space-y-2 text-xs text-slate-700">
              {[
                "Faces are detected and masked on your device before the video leaves your phone.",
                "The clip travels over TLS 1.3 to an isolated processing server.",
                "A fast quality-control pass checks framing, lighting and that a child is visible.",
                "Heavy multimodal analysis extracts pose, hands and actions — never identity.",
                "A parent-friendly detailed report is generated against an anonymous session ID.",
                "The original video file is permanently deleted from disk.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
