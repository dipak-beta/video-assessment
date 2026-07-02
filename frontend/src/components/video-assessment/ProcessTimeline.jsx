import { motion } from "framer-motion";
import { Upload, ShieldCheck, ScanLine, FileBarChart, Trash } from "lucide-react";
import { VA } from "@/constants/testIds";

const steps = [
  { icon: Upload, title: "Upload Videos", desc: "Short clips of natural play." },
  { icon: ShieldCheck, title: "Secure AI Analysis", desc: "Encrypted, private, parent-controlled." },
  { icon: ScanLine, title: "Development Detection", desc: "Pose, movement & behaviour signals." },
  { icon: FileBarChart, title: "Detailed Report", desc: "Parent-friendly detailed summary in minutes." },
  { icon: Trash, title: "Videos Auto Deleted", desc: "Nothing stored after processing." },
];

export default function ProcessTimeline() {
  return (
    <section id="how" className="bg-soft-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            From video to report in 5 calm steps
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Designed by occupational therapists. Built for everyday parents.
          </p>
        </div>

        <div
          data-testid={VA.processTimeline}
          className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative"
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.08 }}
              className="relative rounded-3xl bg-white p-6 shadow-soft border border-slate-100 hover:shadow-hover transition-shadow"
            >
              <div className="absolute -top-3 left-6 px-2.5 py-1 rounded-full bg-kiddo-ink text-white text-[10px] font-bold tracking-wider">
                STEP {i + 1}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-kiddo-coralDeep" />
              </div>
              <h3 className="font-heading text-lg font-bold text-kiddo-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
