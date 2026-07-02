import { motion } from "framer-motion";
import {
  Activity,
  Hand,
  Sparkles,
  ShieldCheck,
  EyeOff,
  Trash2,
} from "lucide-react";

const pipelines = [
  {
    icon: Activity,
    title: "Pose Estimation",
    desc: "17-point body skeleton tracks posture, balance and movement quality.",
    color: "#FF8A65",
  },
  {
    icon: Hand,
    title: "Hand Tracking",
    desc: "21-point hand landmarks detect grasp type, bilateral use and finger precision.",
    color: "#4DB6AC",
  },
  {
    icon: Sparkles,
    title: "Action Recognition",
    desc: "Identifies discrete actions: walking, pointing, stacking, pretend play and more.",
    color: "#4FC3F7",
  },
];

const privacy = [
  {
    icon: EyeOff,
    title: "Faces never identified",
    desc: "AI focuses on movement, not identity. Faces are auto-masked.",
  },
  {
    icon: ShieldCheck,
    title: "Encrypted processing",
    desc: "Videos are encrypted in transit and at rest during analysis.",
  },
  {
    icon: Trash2,
    title: "Auto-deleted after report",
    desc: "Original videos are permanently removed once the report is generated.",
  },
];

export default function InfoPanel() {
  return (
    <section className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* AI signals — soft cream/orange wash */}
      <div className="relative rounded-2xl bg-gradient-to-br from-orange-50/70 via-white to-white border border-orange-100/70 p-5 sm:p-7 shadow-[0_8px_28px_-16px_rgba(255,138,101,0.25)] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-100/40 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-orange-100 text-[10px] font-black uppercase tracking-[0.14em] text-kiddo-coralDeep">
            <Sparkles className="w-3 h-3" />
            What the AI extracts
          </div>
          <h3 className="mt-2 font-heading font-black text-lg sm:text-xl text-kiddo-ink tracking-tight">
            Three structured signal layers
          </h3>
          <div className="mt-5 space-y-4">
            {pipelines.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3.5"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)]"
                  style={{
                    background: `linear-gradient(135deg, ${p.color}22, ${p.color}0D)`,
                    color: p.color,
                    borderColor: `${p.color}30`,
                  }}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-black text-kiddo-ink text-sm sm:text-[15px]">
                    {p.title}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy — richer mint wash */}
      <div
        id="privacy"
        className="relative rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white border border-emerald-100 p-5 sm:p-7 shadow-[0_8px_28px_-16px_rgba(77,182,172,0.35)] overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-emerald-100/50 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-emerald-100 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
            <ShieldCheck className="w-3 h-3" />
            Privacy & safety
          </div>
          <h3 className="mt-2 font-heading font-black text-lg sm:text-xl text-kiddo-ink tracking-tight">
            Your child&apos;s privacy comes first
          </h3>
          <div className="mt-5 space-y-4">
            {privacy.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white text-emerald-600 ring-1 ring-emerald-100 shadow-[0_4px_12px_-6px_rgba(77,182,172,0.4)]">
                  <p.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-black text-kiddo-ink text-sm sm:text-[15px]">
                    {p.title}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
