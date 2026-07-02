import { useEffect, useState } from "react";
import {
  X,
  Brain,
  TrendingUp,
  ShieldCheck,
  Lock,
  Sparkles,
  Star,
  Crown,
  BadgeCheck,
  Globe,
  Users,
  UploadCloud,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import BackedByGoogleBadge from "./BackedByGoogleBadge";

const FEATURES = [
  {
    icon: Brain,
    title: "8 Developmental Domains",
    text: "Complete analysis across all key areas",
  },
  {
    icon: TrendingUp,
    title: "AI-Powered Insights",
    text: "Advanced AI understands subtle behaviors",
  },
  {
    icon: ShieldCheck,
    title: "Parent-Friendly Detailed Report",
    text: "Clear, actionable & easy to understand",
  },
  {
    icon: Lock,
    title: "100% Private & Secure",
    text: "Your videos are auto-deleted after analysis",
  },
  {
    icon: Trash2,
    title: "Auto-deleted videos",
    text: "Permanently removed once your report is ready",
  },
];

const DOMAIN_BARS = [
  { name: "Attention & Self-Regulation", score: 88, color: "#5B8DEE" },
  { name: "Emotion & Behaviour", score: 82, color: "#FFB74D" },
  { name: "Sensory Processing", score: 90, color: "#FF8A65" },
  { name: "Social & Communication", score: 84, color: "#FF7043" },
];

const OVERALL = 85;

// Hook: viewport width tier — "mobile" (<640), "tablet" (<1024), "desktop" (>=1024).
function useViewportTier() {
  const compute = () => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  };
  const [tier, setTier] = useState(compute);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setTier(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return tier;
}

// SVG circular progress ring
function ScoreRing({ value = 85, size = 132, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#E6F4EE"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#37B37E"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-heading font-extrabold text-kiddo-ink leading-none"
          style={{ fontSize: size * 0.3 }}
        >
          {value}
        </div>
        <div
          className="mt-1 text-slate-500 font-medium"
          style={{ fontSize: size * 0.09 }}
        >
          /100
        </div>
      </div>
    </div>
  );
}

function DomainBar({ name, score, color, delay = 0 }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] sm:text-[13px] font-semibold text-kiddo-ink truncate">
          {name}
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay }}
          />
        </div>
      </div>
      <div className="text-xs sm:text-sm font-heading font-bold text-kiddo-ink w-7 sm:w-8 text-right">
        {score}
      </div>
    </div>
  );
}

export default function WelcomePopup({ open, onClose, onCTA }) {
  const tier = useViewportTier();
  const isMobile = tier === "mobile";
  const isTablet = tier === "tablet";

  // Score ring sizing per tier
  const ringSize = isMobile ? 116 : isTablet ? 128 : 148;
  const ringStroke = isMobile ? 10 : isTablet ? 11 : 12;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="welcome-popup"
        aria-describedby={undefined}
        className="max-w-4xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        {/* Sticky header — same visual pattern as ReportDialog */}
        <div className="sticky top-0 z-20 px-4 sm:px-7 pt-4 sm:pt-5 pb-3 sm:pb-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-b border-slate-100">
          <div className="flex items-start gap-3 pr-10">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-soft"
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                New &amp; Powerful
              </div>
              <DialogTitle className="mt-0.5 font-heading text-lg sm:text-xl md:text-2xl font-black text-kiddo-ink leading-tight">
                World&apos;s Best{" "}
                <span className="text-emerald-600">AI Report</span> for Your
                Child
              </DialogTitle>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome popup"
            className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-sm border border-slate-200/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: isMobile ? "calc(92vh - 96px)" : "calc(92vh - 100px)" }}
        >
          <div className="px-4 sm:px-7 py-4 sm:py-5">
            <div className="grid md:grid-cols-2 gap-5 md:gap-6 items-stretch">
              {/* LEFT COLUMN — report preview */}
              <div className="relative order-2 md:order-1 flex">
                {/* Report preview card */}
                <div className="relative w-full rounded-2xl bg-white border border-slate-200 shadow-[0_10px_40px_-14px_rgba(15,23,42,0.12)] p-4 sm:p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs sm:text-[13px] font-semibold text-slate-500">
                      Overall Development Score
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      <Crown className="w-3 h-3" />
                      Best in class
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    <ScoreRing
                      value={OVERALL}
                      size={ringSize}
                      stroke={ringStroke}
                    />
                    <div className="flex-1 min-w-0 w-full space-y-2 sm:space-y-2.5">
                      {DOMAIN_BARS.map((d, i) => (
                        <DomainBar
                          key={d.name}
                          name={d.name}
                          score={d.score}
                          color={d.color}
                          delay={0.35 + i * 0.1}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 text-right text-[11px] sm:text-xs text-slate-400 font-medium">
                    + 4 more domains
                  </div>

                  {/* AI Key Insights */}
                  <div className="mt-3 rounded-xl bg-gradient-to-br from-sky-50 to-emerald-50/60 border border-sky-100/70 p-3 sm:p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                      </div>
                      <div className="text-xs sm:text-[13px] font-heading font-bold text-sky-700">
                        AI Key Insights
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs sm:text-[12.5px] text-slate-700 leading-snug">
                      <li className="flex gap-2">
                        <span className="text-slate-400 mt-1 flex-shrink-0">•</span>
                        <span>
                          Your child shows strong curiosity and problem solving skills.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-400 mt-1 flex-shrink-0">•</span>
                        <span>Sensory seeking behaviors observed in play.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-slate-400 mt-1 flex-shrink-0">•</span>
                        <span>
                          Benefits from movement-based &amp; structured activities.
                        </span>
                      </li>
                    </ul>
                    <div className="mt-2 flex items-center gap-2 text-xs sm:text-[12.5px] font-semibold text-emerald-700">
                      <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                      Personalized recommendations included
                    </div>
                  </div>

                  {/* Inline "Therapist Verified" pill */}
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-50/70 border border-emerald-100 py-1.5 px-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="h-3 w-3 text-white" />
                    </div>
                    <div className="text-xs sm:text-[13px] font-heading font-bold text-emerald-800">
                      Therapist Verified
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — trust heading + features + stats */}
              <div className="order-1 md:order-2 flex flex-col">
                {/* Trust subheading (moved here from left column to fill top gap) */}
                <div className="text-center md:text-left mb-3 sm:mb-4">
                  <div className="font-heading font-extrabold text-emerald-600 text-sm sm:text-base tracking-tight">
                    Comprehensive · Accurate · Actionable
                  </div>
                  <div className="mt-0.5 text-slate-500 text-xs sm:text-[13px]">
                    Trusted by thousands of parents worldwide
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-2.5 sm:space-y-3">
                  {FEATURES.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <motion.li
                        key={f.title}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
                      >
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4.5 w-4.5 sm:h-[18px] sm:w-[18px] text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-kiddo-ink text-sm sm:text-[15px] leading-tight">
                            {f.title}
                          </div>
                          <div className="text-slate-500 text-xs sm:text-[13px] leading-snug mt-0.5">
                            {f.text}
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>

                {/* Compact 3-up trust strip (replaces the full-width stats bar
                    below — keeps everything above the fold). Stacks on mobile,
                    single row on tablet+. flex-1 pushes it to bottom of column. */}
                <div className="mt-auto pt-3 sm:pt-4">
                  {/* Backed by Google — animated brag badge that also fills
                      the empty vertical gap between the features list and the
                      trust strip below. */}
                  <div className="flex justify-center md:justify-start mb-2 sm:mb-3">
                    <BackedByGoogleBadge
                      size="lg"
                      dataTestId="popup-backed-by-google"
                    />
                  </div>
                  <div className="rounded-xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-100 px-3 py-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-kiddo-ink text-[12.5px] leading-tight">
                            4.9/5 Rating
                          </div>
                          <div className="text-[10.5px] text-slate-500 leading-tight">
                            1200+ reports
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-kiddo-ink text-[12.5px] leading-tight">
                            Expert-trusted
                          </div>
                          <div className="text-[10.5px] text-slate-500 leading-tight">
                            OTs &amp; specialists
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-sky-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-kiddo-ink text-[12.5px] leading-tight">
                            40+ Countries
                          </div>
                          <div className="text-[10.5px] text-slate-500 leading-tight">
                            Worldwide
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA — animated: pulsing coral-tinted shadow + a slow shimmer
                sweep + a gently bouncing upload icon so the primary action
                feels alive without spinning tacky loops. */}
            <div className="mt-4 sm:mt-5 flex flex-col items-center gap-2">
              <motion.button
                type="button"
                onClick={() => {
                  onCTA?.();
                  onClose?.();
                }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 12px 30px -10px rgba(16,185,129,0.55)",
                    "0 18px 40px -8px rgba(16,185,129,0.75)",
                    "0 12px 30px -10px rgba(16,185,129,0.55)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative overflow-hidden w-full sm:w-auto sm:min-w-[360px] inline-flex items-center justify-center gap-2 h-12 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-heading font-bold text-base sm:text-lg"
              >
                {/* Slow shimmer sweep */}
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -inset-x-8"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.38) 55%, transparent 100%)",
                    filter: "blur(4px)",
                  }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "120%" }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 0.4,
                  }}
                />
                <motion.span
                  className="relative flex items-center"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <UploadCloud className="h-5 w-5" />
                </motion.span>
                <span className="relative">Upload Video &amp; Get AI Report</span>
              </motion.button>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 text-center px-4">
                <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                Your videos are private and auto-deleted after analysis.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
