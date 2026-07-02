import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { VA } from "@/constants/testIds";

const dos = [
  "Natural behaviour",
  "Good lighting",
  "Entire body visible",
  "Normal daily activities",
  "Let your child behave naturally",
  "Stable camera",
  "Horizontal or vertical",
];

const donts = [
  "Force the child",
  "Constant prompting",
  "Heavy editing",
  "Loud background TV",
  "Filters or beauty effects",
  "Multiple children in frame",
];

export default function RecordingTips() {
  return (
    <section data-testid={VA.recordingTips} className="bg-soft-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
            Recording tips
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            Calm video, calmer report
          </h2>
          <p className="mt-4 text-slate-600">
            A few small things help the AI understand your child more accurately.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-8 md:p-10 bg-emerald-50/70 border border-emerald-100"
          >
            <h3 className="font-heading text-xl font-bold text-emerald-900">Do</h3>
            <ul className="mt-4 space-y-3">
              {dos.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </span>
                  <span className="text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl p-8 md:p-10 bg-rose-50/70 border border-rose-100"
          >
            <h3 className="font-heading text-xl font-bold text-rose-900">Don&apos;t</h3>
            <ul className="mt-4 space-y-3">
              {donts.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </span>
                  <span className="text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
