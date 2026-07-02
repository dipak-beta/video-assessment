import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  EyeOff,
  Activity,
  Hand,
  Brain,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import ProcessDetailsDialog from "./ProcessDetailsDialog";

const PILLS = [
  { icon: Lock, label: "Encrypted upload", color: "#FF8A65" },
  { icon: EyeOff, label: "Faces masked", color: "#34D399" },
  { icon: Activity, label: "Pose tracking", color: "#FFA000" },
  { icon: Hand, label: "Hand tracking", color: "#4DB6AC" },
  { icon: Brain, label: "AI reasoning", color: "#A78BFA" },
  { icon: Trash2, label: "Auto-deleted", color: "#10B981" },
];

export default function HowWeProcess() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="mt-8 sm:mt-10">
        <div className="relative rounded-2xl bg-gradient-to-br from-white via-emerald-50/40 to-white border border-emerald-100/70 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 shadow-[0_8px_28px_-20px_rgba(77,182,172,0.35)] overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-100/40 blur-3xl" />
          <div className="relative flex items-start gap-3 lg:flex-1 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-[0_10px_24px_-10px_rgba(16,185,129,0.7)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                How we process your video
              </div>
              <h3 className="mt-0.5 font-heading font-black text-base sm:text-lg text-kiddo-ink tracking-tight">
                A privacy-first 8-step pipeline
              </h3>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Encrypted upload → AI signal extraction → parent-friendly detailed report
                → permanent video deletion.
              </p>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-1.5 lg:gap-2 lg:max-w-md">
            {PILLS.map((p, i) => (
              <motion.span
                key={p.label}
                initial={{ opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white border shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)] cursor-default"
                style={{
                  color: p.color,
                  borderColor: `${p.color}30`,
                }}
              >
                <p.icon className="w-3 h-3" />
                {p.label}
              </motion.span>
            ))}
          </div>

          <button
            type="button"
            data-testid="how-we-process-see-details"
            onClick={() => setOpen(true)}
            className="relative shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-kiddo-ink text-white text-sm font-bold hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-[0_10px_24px_-12px_rgba(15,23,42,0.6)]"
          >
            See details
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <ProcessDetailsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
