import { motion } from "framer-motion";
import { Upload, ArrowRight } from "lucide-react";
import { VA } from "@/constants/testIds";

export default function FinalCTA() {
  return (
    <section data-testid={VA.finalCta} className="relative overflow-hidden">
      <div className="bg-gradient-to-br from-orange-50 via-white to-teal-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight text-kiddo-ink"
          >
            Start your child&apos;s{" "}
            <span className="bg-gradient-to-r from-kiddo-coral to-kiddo-mint bg-clip-text text-transparent">
              AI development assessment
            </span>
          </motion.h2>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            Upload short, natural videos. Receive a calm, plain-language report you can actually use today.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <a
              href="#upload"
              data-testid={VA.finalCtaBtn}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-kiddo-coral text-white font-semibold shadow-[0_10px_30px_-10px_rgba(255,138,101,0.7)] hover:bg-kiddo-coralDeep transition-transform hover:-translate-y-0.5"
            >
              <Upload className="w-5 h-5" />
              Upload Videos
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="mt-5 text-xs text-slate-400">
            No credit card · Videos auto-deleted · Therapist-designed
          </p>
        </div>
      </div>
    </section>
  );
}
