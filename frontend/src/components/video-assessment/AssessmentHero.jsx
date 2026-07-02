import { motion } from "framer-motion";
import { Wand2, Loader2, Play, CheckCircle2, Sparkles } from "lucide-react";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";

export default function AssessmentHero({
  uploadedCount,
  total = 9,
  analyzing,
  status,
  onAnalyze,
  onScrollToFirstDomain,
  analysisMinimised = false,
  onResumeAnalysis,
}) {
  const pct = Math.round((uploadedCount / total) * 100);
  const canAnalyze = uploadedCount > 0 && !analyzing;
  const canResume = analyzing && analysisMinimised && !!onResumeAnalysis;
  const buttonEnabled = canAnalyze || canResume;
  const recommended = uploadedCount >= 3;

  // Feature checklist — split into two columns of four, each cell carries a
  // soft brand-hue chip behind the check icon (adds subtle rhythm vs. eight
  // identical rows of emerald checks).
  const features = [
    { label: "Face privacy masking", hue: "#FF8A65" },
    { label: "Pose estimation", hue: "#4DB6AC" },
    { label: "Hand tracking", hue: "#FFA000" },
    { label: "Action recognition", hue: "#4FC3F7" },
    { label: "Behaviour analysis", hue: "#FF6B6B" },
    { label: "Domain scoring", hue: "#81C784" },
    { label: "Parent-friendly detailed report", hue: "#A78BFA" },
    { label: "Auto-deleted videos", hue: "#34D399" },
  ];

  return (
    <section
      data-testid="assessment-hero"
      className="relative rounded-3xl bg-gradient-to-br from-orange-100 via-amber-50 to-teal-100 p-[1.5px] shadow-[0_20px_60px_-30px_rgba(255,138,101,0.35)]"
    >
      {/* Ambient floating sparkle — decorative, no functional impact */}
      <div className="pointer-events-none absolute -top-6 -right-6 w-40 h-40 rounded-full bg-gradient-to-br from-orange-200/40 to-teal-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 w-56 h-56 rounded-full bg-gradient-to-br from-amber-100/40 to-rose-100/30 blur-3xl" />

      <div className="relative rounded-[1.4rem] bg-white/95 backdrop-blur-sm p-5 sm:p-8 lg:p-10">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left: heading + progress */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-kiddo-coralDeep text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] shadow-[0_2px_8px_-2px_rgba(255,138,101,0.4)]">
              <span className="inline-flex w-4 h-4 rounded-full bg-white items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-kiddo-coralDeep" />
              </span>
              New Assessment
            </div>
            <h1
              data-testid={VA.heroHeading}
              className="mt-3 font-heading text-2xl sm:text-3xl lg:text-[2.5rem] font-black tracking-tight text-kiddo-ink leading-[1.1]"
            >
              AI Developmental Video Assessment
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Upload short, natural clips of your child during everyday play.
              Our AI screens 9 developmental steps (8 core domains + 1 optional
              behavioural check) and generates a
              parent-friendly, detailed report — usually within a few minutes.
            </p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                <span>
                  <span className="text-kiddo-ink font-black text-base">
                    {uploadedCount}
                  </span>
                  <span className="text-slate-400"> / {total}</span>{" "}
                  <span className="text-slate-500">videos uploaded</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-kiddo-coralDeep font-black tracking-tight"
                  aria-label={`${pct} percent complete`}
                >
                  {pct}%
                </span>
              </div>

              {/* Segmented progress — one segment per step, filled in
                  domain color as uploads land. 8 core domains + 1 optional
                  behavioural step = 9 segments. */}
              <div className="mt-2.5 grid grid-cols-9 gap-1">
                {[
                  ...DOMAINS,
                  {
                    key: "__behavioural__",
                    color: "#F472B6",
                    name: "Behavioural",
                  },
                ].map((d, i) => {
                  const filled = i < uploadedCount;
                  return (
                    <motion.div
                      key={d.key}
                      initial={{ scaleX: 0.6, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="h-2 rounded-full origin-left transition-colors duration-300"
                      style={{
                        background: filled ? d.color : "#F1F5F9",
                        boxShadow: filled
                          ? `0 4px 12px -4px ${d.color}80`
                          : undefined,
                      }}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {DOMAINS.map((d) => (
                  <span
                    key={d.key}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white border border-slate-100 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)]"
                    style={{ color: d.color }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: d.color }}
                    />
                    {d.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: CTA + helper */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/60 p-5 sm:p-6 shadow-[0_8px_30px_-16px_rgba(255,138,101,0.35)]"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex w-5 h-5 rounded-full bg-kiddo-coral text-white items-center justify-center text-[10px] font-black">
                  2
                </span>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] text-kiddo-coralDeep">
                  Run AI Analysis
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                {uploadedCount === 0
                  ? "Upload at least one short video to begin. You can add more later."
                  : recommended
                  ? `${uploadedCount} videos uploaded — you have enough for a meaningful report.`
                  : `${uploadedCount} video${uploadedCount > 1 ? "s" : ""} uploaded — you can add more domains for a richer report.`}
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <motion.button
                  type="button"
                  data-testid={VA.runAnalysisBtn}
                  onClick={canResume ? onResumeAnalysis : onAnalyze}
                  disabled={!buttonEnabled}
                  whileHover={buttonEnabled ? { y: -2, scale: 1.02 } : undefined}
                  whileTap={buttonEnabled ? { scale: 0.98 } : undefined}
                  className="relative inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-kiddo-coral text-white font-bold shadow-[0_14px_34px_-12px_rgba(255,138,101,0.75)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-kiddo-coralDeep transition-colors flex-1 min-w-0 whitespace-nowrap overflow-hidden"
                  title={
                    canResume
                      ? "Analysis is running in the background — tap to open the progress popup"
                      : undefined
                  }
                >
                  {/* Subtle sheen — only when enabled */}
                  {buttonEnabled && (
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  )}
                  {canResume ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="truncate">
                        Analyzing… {status?.progress || 0}%
                      </span>
                    </>
                  ) : analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      <span className="truncate">
                        Analyzing… {status?.progress || 0}%
                      </span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 shrink-0" />
                      Analyse
                    </>
                  )}
                </motion.button>

                {uploadedCount === 0 && (
                  <button
                    type="button"
                    onClick={onScrollToFirstDomain}
                    className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-white border border-slate-200 text-kiddo-ink font-bold hover:border-kiddo-coral hover:text-kiddo-coralDeep hover:-translate-y-0.5 transition-all whitespace-nowrap"
                    data-testid="hero-cta-upload"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    Upload Videos
                  </button>
                )}
              </div>

              <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:text-xs text-slate-700">
                {features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2">
                    <span
                      className="inline-flex w-4 h-4 rounded-full items-center justify-center shrink-0"
                      style={{ background: `${f.hue}20`, color: f.hue }}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                    <span className="truncate">{f.label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
