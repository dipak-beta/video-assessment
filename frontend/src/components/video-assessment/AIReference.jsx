import { motion } from "framer-motion";
import { VA } from "@/constants/testIds";

const observations = [
  "Body posture", "Movement quality", "Motor planning", "Hand coordination",
  "Play behaviour", "Response to instructions", "Eye gaze direction", "Object interaction",
  "Balance", "Walking pattern", "Attention", "Social engagement",
  "Communication behaviour", "Emotional responses", "Task completion", "Behaviour transitions",
  "Adaptive functioning",
];

export default function AIReference() {
  return (
    <section data-testid={VA.aiReference} className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
              AI Analysis Reference
            </p>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
              How AI understands development
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg">
              The system analyses many subtle signals from natural video and compares them with
              developmental milestones and evidence-based behavioural indicators.
            </p>
            <div className="mt-6 rounded-3xl p-5 bg-amber-50 border border-amber-100">
              <p className="text-sm text-amber-900">
                <strong>Note:</strong> This assessment is an AI-assisted screening tool and does{" "}
                not replace a clinical evaluation by a qualified healthcare professional.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {observations.map((o, i) => (
              <motion.span
                key={o}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
                className="px-3.5 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-700 hover:border-kiddo-coral hover:text-kiddo-coralDeep transition-colors"
              >
                {o}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
