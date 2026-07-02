import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, CloudUpload, Loader2 } from "lucide-react";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";
import BehaviouralChallengesCard from "./BehaviouralChallengesCard";

export default function DomainStepper({
  uploads,
  uploading,
  progress,
  onSelectDomain,
  onSelectChallenging,
  challengingSkipped,
}) {
  const domainReadyCount = Object.keys(uploads).filter((k) =>
    DOMAINS.some((d) => d.key === k)
  ).length;
  const hasChallenging =
    !!uploads["challenging_1"] || !!uploads["challenging_2"];
  // Total = 8 developmental domains + 1 optional behavioural step
  const readyCount = domainReadyCount + (hasChallenging ? 1 : 0);
  const total = DOMAINS.length + 1;

  return (
    <section id="domains" className="mt-8 sm:mt-10">
      <div className="flex items-end justify-between gap-4 mb-4 sm:mb-5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-kiddo-coralDeep mb-1">
            Step 1 · Capture
          </div>
          <h2 className="font-heading text-xl sm:text-2xl lg:text-3xl font-black text-kiddo-ink tracking-tight">
            Upload one short video per domain
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-xl">
            Tap any domain to open instructions and upload. 30 – 60 seconds. Max
            200 MB. MP4 · MOV · WEBM.
          </p>
        </div>
        <div className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)] text-xs font-bold text-slate-600">
          <span className="text-kiddo-ink font-black">{readyCount}</span>
          <span className="text-slate-400">/ {total}</span>
          <span className="text-slate-500">ready</span>
        </div>
      </div>

      <div
        data-testid={VA.domainGrid}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4"
      >
        {DOMAINS.map((d, i) => {
          const u = uploads[d.key];
          const isUp = uploading[d.key];
          const pr = progress[d.key] || 0;
          const Icon = d.icon;
          return (
            <motion.button
              type="button"
              key={d.key}
              data-testid={VA.domainCard(d.key)}
              onClick={() => onSelectDomain(d.key)}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              className={`group relative text-left rounded-2xl bg-white overflow-hidden p-4 sm:p-5 transition-all shadow-[0_4px_14px_-8px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.18)] ${
                u
                  ? "ring-1 ring-emerald-200 border border-emerald-200"
                  : "border border-slate-100 hover:border-slate-200"
              }`}
            >
              {/* Domain-color accent bar along the top edge */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, ${d.color}, ${d.color}66)`,
                }}
              />
              {/* Soft radial wash on hover — decorative, brand-color tinted */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
                style={{ background: `${d.color}26` }}
              />

              {/* Top row: icon + chevron */}
              <div className="relative flex items-start justify-between gap-3">
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ring-1 shadow-[0_6px_16px_-8px_rgba(15,23,42,0.14)]"
                  style={{
                    background: `linear-gradient(135deg, ${d.color}22, ${d.color}0F)`,
                    color: d.color,
                    borderColor: `${d.color}30`,
                  }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-kiddo-coral group-hover:translate-x-1 transition-all mt-1.5" />
              </div>

              {/* Labels */}
              <div className="relative mt-3 flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    background: `${d.color}1A`,
                    color: d.color,
                    boxShadow: `inset 0 0 0 1px ${d.color}25`,
                  }}
                >
                  {d.index}/9
                </span>
                {u ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : isUp ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-kiddo-coralDeep inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading {pr}%
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/70">
                    <CloudUpload className="w-3 h-3" /> Tap to upload
                  </span>
                )}
              </div>

              <h3 className="relative mt-2 font-heading font-black text-kiddo-ink text-base sm:text-lg leading-tight">
                {d.name}
              </h3>
              <p className="relative mt-1 text-xs sm:text-[13px] text-slate-500 line-clamp-2 leading-relaxed">
                {d.examples.slice(0, 3).join(" · ")}
              </p>

              {/* Progress bar for uploaded */}
              {u && (
                <div className="relative mt-3.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "100%",
                      background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)`,
                      boxShadow: `0 0 12px ${d.color}66`,
                    }}
                  />
                </div>
              )}
              {isUp && (
                <div className="relative mt-3.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pr}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </motion.button>
          );
        })}

        {/* 9th card: optional Behavioural Challenges */}
        <BehaviouralChallengesCard
          uploads={uploads}
          uploading={uploading}
          skipped={challengingSkipped}
          onSelect={onSelectChallenging}
        />
      </div>
    </section>
  );
}
