import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, AlertCircle, Trophy, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { getSharedReport } from "@/lib/api";

const Section = ({ title, items, color = "text-kiddo-ink", icon: Icon }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className={`inline-flex items-center gap-2 text-sm font-bold ${color}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="text-xs text-slate-700 flex gap-2">
            <span className="text-kiddo-coral">•</span> {s}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function SharedReportDialog({ open, slug, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !slug) return;
    setLoading(true);
    setError(null);
    setReport(null);
    (async () => {
      try {
        const data = await getSharedReport(slug);
        setReport(data.report);
      } catch {
        setError("This shared report link is invalid or has been removed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, slug]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="shared-report-dialog"
        aria-describedby={undefined}
        className="max-w-3xl rounded-3xl border border-slate-100 p-0 overflow-hidden bg-white"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Shared developmental screening report</DialogTitle>
        </VisuallyHidden>

        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-orange-50/60 via-white to-teal-50/60">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-kiddo-coralDeep">
            <ShieldCheck className="w-3.5 h-3.5" />
            Shared report · read-only
          </div>
          <h2 className="mt-1 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
            Kiddo+ AI Screening
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Shared with you by a parent. AI-assisted developmental screening — not a clinical diagnosis.
          </p>
        </div>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-slate-500">Loading shared report…</div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div className="mt-1 font-bold text-rose-800 text-sm">{error}</div>
            </div>
          ) : report ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-orange-50/40 via-white to-teal-50/40 p-4 border border-slate-100"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-kiddo-coralDeep">
                      Overall score
                    </div>
                    <div className="font-heading text-4xl font-black text-kiddo-ink">
                      {report.overall_score}
                      <span className="text-lg text-slate-400">/100</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    AI generated
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  {report.overall_summary}
                </p>
              </motion.div>

              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                <Section title="Strengths" icon={Trophy} color="text-emerald-700" items={report.strengths || []} />
                <Section title="Areas to support" icon={TrendingUp} color="text-kiddo-coralDeep" items={report.areas_needing_support || []} />
              </div>

              {report.domains && report.domains.length > 0 && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="text-sm font-bold text-kiddo-ink">Domain scores</div>
                  <div className="mt-2 grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                    {report.domains.map((d) => (
                      <div key={d.domain} className="rounded-lg border border-slate-100 p-2 text-center">
                        <div className="font-heading text-lg font-black">
                          {d.reshoot_needed ? "—" : (d.score ?? "—")}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider truncate">
                          {d.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.recommended_activities && report.recommended_activities.length > 0 && (
                <Section
                  title="Recommended activities"
                  icon={Sparkles}
                  color="text-kiddo-coralDeep"
                  items={report.recommended_activities.map(
                    (a) => `${a.title} (${a.duration}) — ${a.description}`
                  )}
                />
              )}

              <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck className="inline w-3 h-3 text-emerald-600 mr-1 -mt-0.5" />
                {report.disclaimer}
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
