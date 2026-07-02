import { motion } from "framer-motion";
import {
  Sparkles,
  Trophy,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  Hand,
  Activity,
  MessageCircle,
  Brain,
  Heart,
  Eye,
  HeartPulse,
  HandHeart,
  Footprints,
  GraduationCap,
  Smile,
  ListChecks,
  Camera,
  CalendarClock,
  Lightbulb,
} from "lucide-react";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";
import DomainReuploadButton from "./DomainReuploadButton";
import BehaviourSection from "./report-preview/BehaviourSection";
import DevelopmentalMilestonesSection from "./report-preview/DevelopmentalMilestonesSection";
import HomeProgramSection from "./report-preview/HomeProgramSection";
import { retryReportAnalysis } from "@/lib/api";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const summaries = [
  { key: "motor_summary", icon: Activity, label: "Motor", color: "text-kiddo-coralDeep", bg: "bg-orange-50" },
  { key: "behaviour_summary", icon: Brain, label: "Behaviour", color: "text-amber-700", bg: "bg-amber-50" },
  { key: "communication_summary", icon: MessageCircle, label: "Communication", color: "text-sky-700", bg: "bg-sky-50" },
  { key: "sensory_summary", icon: Hand, label: "Sensory", color: "text-emerald-700", bg: "bg-emerald-50" },
];

// Icon + accent mapping per domain key — keeps the per-domain cards visually
// distinct without depending on hard-coded colour strings inside the JSX.
const DOMAIN_ACCENT = {
  attention:     { icon: Eye,            bg: "bg-rose-50",    accent: "text-rose-700",    ring: "border-rose-100" },
  emotion:       { icon: Heart,          bg: "bg-pink-50",    accent: "text-pink-700",    ring: "border-pink-100" },
  sensory:       { icon: HeartPulse,     bg: "bg-amber-50",   accent: "text-amber-700",   ring: "border-amber-100" },
  social:        { icon: MessageCircle,  bg: "bg-sky-50",     accent: "text-sky-700",     ring: "border-sky-100" },
  gross_motor:   { icon: Footprints,     bg: "bg-emerald-50", accent: "text-emerald-700", ring: "border-emerald-100" },
  fine_motor:    { icon: HandHeart,      bg: "bg-orange-50",  accent: "text-kiddo-coralDeep", ring: "border-orange-100" },
  daily_living:  { icon: Smile,          bg: "bg-violet-50",  accent: "text-violet-700",  ring: "border-violet-100" },
  learning_play: { icon: GraduationCap,  bg: "bg-teal-50",    accent: "text-teal-700",    ring: "border-teal-100" },
};

export default function ReportPreview({ report, onLoadDemo, onReportUpdated }) {
  const r = report;
  const [retrying, setRetrying] = useState(false);
  // Look up domain-level flags for the reupload button
  const lowConfDomains = new Set((r?.low_confidence_videos || []));
  const reshootByDomain = Object.fromEntries(
    (r?.reshoot_prompts || []).map((p) => [p.domain, p])
  );

  const onRetry = async () => {
    if (!r?.session_id || r.session_id === "demo" || retrying) return;
    setRetrying(true);
    try {
      const { report: refreshed } = await retryReportAnalysis(r.session_id);
      onReportUpdated?.(refreshed);
      toast.success("Report regenerated");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Couldn't retry — please try again in a moment"
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section
      id="report"
      data-testid={VA.reportPreview}
      className="rounded-3xl bg-gradient-to-br from-orange-50/40 via-white to-teal-50/40 p-1"
    >
      <div className="rounded-[1.4rem] bg-white border border-slate-100">
        {/* Body — the title row + action buttons are owned by ReportDialog so
            they sit inside the pipeline-style gradient header at the top. */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-5">
          {!r && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  Therapist Verified
                </span>
                <span className="text-xs text-slate-500">
                  Try a sample to preview the report layout.
                </span>
              </div>
              <button
                data-testid={VA.reportLoadDemo}
                onClick={onLoadDemo}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-kiddo-ink text-white text-xs font-semibold hover:bg-slate-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample
              </button>
            </div>
          )}

        {r ? (
          <>
            {(() => {
              // When the overall score is 0/absent, surface the most likely
              // reason so parents don't misread the number as a diagnosis.
              const zeroScore = !r.overall_score || r.overall_score === 0;
              if (!zeroScore) return null;
              const doms = r.domains || [];
              const total = doms.length;
              const insufficient = doms.filter((d) => d?.insufficient_evidence).length;
              const qcFailed = (r.reshoot_prompts || []).length;
              const lowConf = (r.low_confidence_videos || []).length;
              // LLM-side failure detection: we have observations (so videos were
              // analysed), but score is still 0 → likely the final combiner
              // returned invalid JSON and we can retry without re-uploading.
              const hasObservations = doms.some(
                (d) => !d?.insufficient_evidence
              );
              const looksLikeLlmFailure =
                hasObservations && qcFailed === 0 && insufficient < total;

              let title = "Overall score can't be computed yet";
              let reason = "The AI didn't have enough clear evidence to score any domain.";
              if (total > 0 && insufficient === total) {
                reason = `All ${total} domains are still missing evidence. Upload short 20-40s clips focused on each domain to unlock the score.`;
              } else if (qcFailed > 0 && lowConf === 0 && insufficient === 0) {
                reason = `${qcFailed} clip${qcFailed === 1 ? "" : "s"} weren't scorable (too dark, too close, child not visible, or under 10 seconds). Reshoot and re-upload to compute the score.`;
              } else if (lowConf > 0) {
                reason = `The AI wasn't confident enough on ${lowConf} clip${lowConf === 1 ? "" : "s"} to compute a reliable overall score. Try a fresh take in better lighting.`;
              } else if (insufficient > 0) {
                reason = `${insufficient} of ${total} domains need a fresh clip before an overall score can be computed. Scroll down to see which ones and upload directly.`;
              }
              if (looksLikeLlmFailure) {
                title = "The final AI step didn't produce a score";
                reason = `We successfully analysed your clips but the report-combining step returned an incomplete answer. This usually resolves on a second try — no re-uploads needed.`;
              }
              return (
                <div
                  data-testid="report-zero-score-reason"
                  className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Why is my score 0?
                      </div>
                      <div className="mt-0.5 font-heading text-sm sm:text-base font-bold text-kiddo-ink">
                        {title}
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {reason}
                      </p>
                      {looksLikeLlmFailure && r.session_id && r.session_id !== "demo" && (
                        <button
                          type="button"
                          onClick={onRetry}
                          disabled={retrying}
                          data-testid="report-retry-analysis"
                          className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-kiddo-coral hover:bg-kiddo-coralDeep disabled:opacity-60 text-white text-xs font-bold transition-colors shadow-[0_10px_30px_-12px_rgba(255,138,101,0.7)]"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                          {retrying ? "Retrying…" : "Retry analysis"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-5 grid sm:grid-cols-3 gap-3 sm:gap-5">
              <div className="rounded-2xl p-4 sm:p-5 bg-orange-50 border border-orange-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-kiddo-coralDeep">
                  Overall Score
                </div>
                <div className="mt-1 font-heading text-4xl sm:text-5xl font-black text-kiddo-ink">
                  {r.overall_score}
                  <span className="text-xl sm:text-2xl text-slate-400">
                    /100
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Confidence {Math.round((r.confidence || 0) * 100)}%
                </div>
              </div>
              <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50 border border-emerald-100 sm:col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Summary
                </div>
                <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {r.overall_summary}
                </p>
                {r.age_context && (
                  <p className="mt-2 text-[11px] sm:text-xs italic text-emerald-800/80 leading-relaxed">
                    {r.age_context}
                  </p>
                )}
              </div>
            </div>

            {/* 4 themed summaries */}
            {summaries.some((s) => r[s.key]) && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summaries.map(
                  (s) =>
                    r[s.key] && (
                      <div
                        key={s.key}
                        className={`rounded-2xl p-4 ${s.bg} border border-slate-100`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${s.color}`}
                        >
                          <s.icon className="w-3.5 h-3.5" />
                          {s.label}
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {r[s.key]}
                        </p>
                      </div>
                    )
                )}
              </div>
            )}

            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Domain scores
              </div>
              <div className="mt-3 space-y-2.5">
                {DOMAINS.map((d) => {
                  const dom = (r.domains || []).find(
                    (x) => x.domain === d.key
                  );
                  const score = dom?.score ?? 0;
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <span className="text-xs sm:text-sm font-semibold text-kiddo-ink w-32 sm:w-44 truncate">
                        {d.name}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ background: d.color }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-kiddo-ink w-8 text-right">
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Domain-by-domain narratives (all 8 domains) */}
            {(r.per_domain_narratives || []).length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <ListChecks className="w-3.5 h-3.5" />
                  Domain-by-domain insights
                </div>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(r.per_domain_narratives || []).map((n) => {
                    const accent = DOMAIN_ACCENT[n.domain] || DOMAIN_ACCENT.attention;
                    const Icon = accent.icon;
                    const insufficient = n.insufficient_evidence;
                    return (
                      <div
                        key={n.domain}
                        data-testid={`domain-narrative-${n.domain}`}
                        className={`rounded-2xl p-4 ${accent.bg} border ${accent.ring}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center ${accent.accent}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${accent.accent}`}>
                                {n.name || n.domain}
                              </div>
                              {n.score != null && (
                                <div className="text-[11px] text-slate-500 font-semibold">
                                  Score · {n.score}/100
                                </div>
                              )}
                            </div>
                          </div>
                          {insufficient && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white text-amber-700 border border-amber-200">
                              <Camera className="w-2.5 h-2.5" />
                              Need clip
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-[12px] sm:text-sm text-slate-700 leading-relaxed">
                          {n.narrative}
                        </p>
                        {(n.key_observations || []).length > 0 && (
                          <div className="mt-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Observed
                            </div>
                            <ul className="mt-1 space-y-0.5 text-[11px] sm:text-xs text-slate-700">
                              {(n.key_observations || []).slice(0, 5).map((o, i) => (
                                <li key={`${i}-${o}`}>• {o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(n.next_steps || []).length > 0 && (
                          <div className="mt-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Try this week
                            </div>
                            <ul className="mt-1 space-y-0.5 text-[11px] sm:text-xs text-slate-700">
                              {(n.next_steps || []).slice(0, 4).map((o, i) => (
                                <li key={`${i}-${o}`}>• {o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {insufficient && n.filming_tip && (
                          <div className="mt-2.5 rounded-xl bg-white/70 border border-amber-100 p-2 text-[11px] text-amber-900 italic">
                            Filming tip: {n.filming_tip}
                          </div>
                        )}
                        {(() => {
                          const needsClip =
                            insufficient ||
                            lowConfDomains.has(n.domain) ||
                            !!reshootByDomain[n.domain];
                          if (!needsClip) return null;
                          const reshoot = reshootByDomain[n.domain];
                          const reason =
                            (reshoot?.issues || [])[0] ||
                            (lowConfDomains.has(n.domain)
                              ? "The AI wasn't confident on this clip — a fresh take will strengthen the score."
                              : n.filming_tip ||
                                "Not enough evidence yet — a short clip focused on this domain will unlock the score.");
                          return (
                            <DomainReuploadButton
                              sessionId={r?.session_id}
                              domainKey={n.domain}
                              domainName={n.name || n.domain}
                              reason={reason}
                              onReportUpdated={onReportUpdated}
                            />
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dedicated Behaviour section */}
            <BehaviourSection behaviourSection={r.behaviour_section} />

            {/* Developmental milestones */}
            <DevelopmentalMilestonesSection
              milestones={r.developmental_milestones}
            />

            {/* Hand + action chips per domain */}
            {(r.domains || []).some(
              (d) => (d.hand_signals || []).length || (d.action_signals || []).length
            ) && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Extracted AI signals
                </div>
                <div className="mt-3 space-y-2">
                  {(r.domains || []).map((d) => {
                    if (
                      !(d.hand_signals || []).length &&
                      !(d.action_signals || []).length
                    )
                      return null;
                    return (
                      <div
                        key={d.domain}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        <span className="text-[11px] font-semibold text-slate-500 w-28 shrink-0">
                          {d.name}
                        </span>
                        {(d.hand_signals || []).map((h) => (
                          <span
                            key={`h-${d.domain}-${h}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700"
                          >
                            <Hand className="inline w-2.5 h-2.5 mr-0.5" />
                            {h}
                          </span>
                        ))}
                        {(d.action_signals || []).map((a) => (
                          <span
                            key={`a-${d.domain}-${a}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-kiddo-coralDeep"
                          >
                            <Activity className="inline w-2.5 h-2.5 mr-0.5" />
                            {a}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Trophy className="w-4 h-4" /> Strengths
                </div>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm text-slate-700">
                  {(r.strengths || []).slice(0, 6).map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl p-4 bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <TrendingUp className="w-4 h-4" /> Areas needing support
                </div>
                <ul className="mt-2 space-y-1 text-xs sm:text-sm text-slate-700">
                  {(r.areas_needing_support || []).slice(0, 6).map((s) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {(r.recommended_activities || []).length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Recommended Kiddo+ activities
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
                  {(r.recommended_activities || []).slice(0, 8).map((a) => (
                    <div
                      key={a.title}
                      className="rounded-xl p-3 bg-white border border-slate-100"
                    >
                      <div className="text-[10px] uppercase font-bold tracking-wider text-kiddo-coral">
                        {(a.domain || "").replace(/_/g, " ")} · {a.duration}
                      </div>
                      <div className="font-bold text-kiddo-ink text-sm mt-0.5">
                        {a.title}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-3">
                        {a.description}
                      </p>
                      {a.why_it_helps && (
                        <p className="text-[10px] italic text-emerald-700 mt-1">
                          Why it helps: {a.why_it_helps}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Home program + Parent tips + Professional next steps */}
            <HomeProgramSection
              homeProgram={r.home_program}
              parentTips={r.parent_tips}
              professionalRecommendations={r.professional_recommendations}
            />

            <div className="mt-5 rounded-xl p-3 bg-slate-50 text-[11px] sm:text-xs text-slate-600 flex gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
              {r.disclaimer}
            </div>
          </>
        ) : (
          <div className="mt-5 grid sm:grid-cols-3 gap-3 sm:gap-5">
            <div className="rounded-2xl p-5 bg-slate-50 h-28 animate-pulse" />
            <div className="rounded-2xl p-5 bg-slate-50 h-28 sm:col-span-2 animate-pulse" />
            <div className="rounded-2xl p-5 bg-slate-50 h-12 sm:col-span-3 animate-pulse" />
            <div className="rounded-2xl p-5 bg-slate-50 h-12 sm:col-span-3 animate-pulse" />
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
