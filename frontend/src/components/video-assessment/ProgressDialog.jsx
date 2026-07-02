import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { getParentHistory, getParentId } from "@/lib/api";

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const scoreColor = (s) => {
  if (s == null) return "#94A3B8";
  if (s >= 80) return "#16A34A";
  if (s >= 60) return "#F59E0B";
  return "#EF4444";
};

export default function ProgressDialog({ open, onClose, onStartScreening }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentId, setParentId] = useState(null);

  useEffect(() => {
    if (!open) return;
    const pid = getParentId();
    setParentId(pid);
    if (!pid) {
      setLoading(false);
      setHistory([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const data = await getParentHistory(pid);
        setHistory(data.history || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="progress-dialog"
        aria-describedby={undefined}
        className="max-w-2xl rounded-3xl border border-slate-100 p-0 overflow-hidden bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Your child&apos;s developmental progress</DialogTitle>
        </VisuallyHidden>

        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-orange-50/60 via-white to-teal-50/60">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-kiddo-coralDeep">
            <TrendingUp className="w-3.5 h-3.5" />
            Your child&apos;s journey
          </div>
          <h2 className="mt-1 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
            Developmental progress over time
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Every screening you complete is saved on this device. Repeat every
            30–60 days for the clearest growth picture.
          </p>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-slate-500">Loading your history…</div>
          ) : !parentId || history.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-soft">
              <Sparkles className="w-6 h-6 mx-auto text-kiddo-coral" />
              <div className="mt-2 font-heading text-lg font-black">
                No screenings yet
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Run your first AI screening to start tracking your child&apos;s
                developmental growth here.
              </p>
              <button
                type="button"
                data-testid="progress-empty-cta"
                onClick={() => {
                  onClose?.();
                  onStartScreening?.();
                }}
                className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-kiddo-coral text-white text-sm font-bold hover:bg-kiddo-coralDeep"
              >
                Start a screening
              </button>
            </div>
          ) : (
            <div className="space-y-3" data-testid="progress-history-list">
              {history.map((h, i) => (
                <motion.div
                  key={h.session_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(h.created_at)}
                      </div>
                      <div className="mt-1 font-heading text-base font-black">
                        {h.child_name || "Screening"}
                      </div>
                      {!h.report_ready && (
                        <div className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          In progress
                        </div>
                      )}
                    </div>
                    {h.overall_score != null && (
                      <div
                        className="flex items-baseline gap-1"
                        style={{ color: scoreColor(h.overall_score) }}
                      >
                        <span className="font-heading text-3xl font-black">
                          {h.overall_score}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/100</span>
                      </div>
                    )}
                  </div>
                  {h.domains && h.domains.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {h.domains.map((d) => (
                        <div
                          key={d.domain}
                          className="rounded-lg border border-slate-100 p-1.5 text-center"
                          title={d.name}
                        >
                          <div
                            className="font-heading text-sm font-black"
                            style={{ color: scoreColor(d.score) }}
                          >
                            {d.score ?? "—"}
                          </div>
                          <div className="text-[8px] text-slate-500 uppercase tracking-wider truncate">
                            {d.name?.split(" ")[0]}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
