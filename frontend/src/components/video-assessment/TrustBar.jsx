import { motion } from "framer-motion";
import { Shield, Cpu, Stethoscope, Trash2, Zap } from "lucide-react";
import { VA } from "@/constants/testIds";

const items = [
  { icon: Shield, label: "Privacy First", color: "bg-emerald-50 text-emerald-600" },
  { icon: Cpu, label: "AI Powered", color: "bg-orange-50 text-kiddo-coralDeep" },
  { icon: Stethoscope, label: "Therapist Guided", color: "bg-teal-50 text-kiddo-mint" },
  { icon: Trash2, label: "Videos Auto Deleted", color: "bg-rose-50 text-rose-500" },
  { icon: Zap, label: "Report in Minutes", color: "bg-amber-50 text-amber-600" },
];

export default function TrustBar() {
  return (
    <section data-testid={VA.trustBar} className="border-y border-slate-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-100 hover:border-orange-100 transition-colors"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${it.color}`}>
                <it.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-sm font-semibold text-kiddo-ink">{it.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
