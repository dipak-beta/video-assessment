import { motion } from "framer-motion";
import { ShieldCheck, Lock, Trash2, EyeOff, ServerCog } from "lucide-react";
import { VA } from "@/constants/testIds";

const points = [
  {
    icon: EyeOff,
    title: "Faces are never used as identity",
    desc: "AI focuses on movement and behaviour patterns, not facial recognition.",
  },
  {
    icon: Lock,
    title: "Encrypted upload & storage",
    desc: "Every video is encrypted in transit and at rest during processing.",
  },
  {
    icon: Trash2,
    title: "Videos auto-deleted",
    desc: "Original videos are permanently deleted immediately after the report is generated.",
  },
  {
    icon: ServerCog,
    title: "Never used for AI training",
    desc: "Your child's videos are never used to train models or shared with third parties.",
  },
];

export default function PrivacySection() {
  return (
    <section id="privacy" data-testid={VA.privacySection} className="bg-mint-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-100 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy first
            </div>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
              Your child&apos;s privacy comes first
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg">
              Kiddo+ analyses developmental movement patterns rather than storing identifiable
              facial information. Only anonymised developmental observations are retained — and
              only if you explicitly consent.
            </p>
            <div className="mt-6 rounded-3xl p-6 bg-white border border-emerald-100 shadow-soft">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                What is retained?
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Only the structured developmental report (anonymised observations and scores).
                Original videos are deleted within minutes.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {points.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-3xl bg-white p-6 border border-emerald-100 shadow-soft"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-kiddo-ink">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
