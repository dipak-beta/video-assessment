import { motion } from "framer-motion";
import { Sparkles, PlayCircle } from "lucide-react";
import { VA } from "@/constants/testIds";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-warm-gradient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-orange-100 shadow-soft text-xs font-semibold tracking-wide uppercase text-kiddo-coralDeep"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Assisted Developmental Screening
          </motion.div>

          <motion.h1
            data-testid={VA.heroHeading}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-kiddo-ink"
          >
            AI Developmental{" "}
            <span className="bg-gradient-to-r from-kiddo-coral via-kiddo-peach to-kiddo-mint bg-clip-text text-transparent">
              Video Assessment
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl"
          >
            Upload short natural videos of your child during everyday activities. Kiddo+ AI
            carefully observes developmental patterns across 9 steps (8 core
            developmental domains + 1 optional behavioural check)
            and generates a comprehensive parent-friendly, detailed report within minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a
              href="#upload"
              data-testid={VA.ctaStart}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-kiddo-coral text-white font-semibold shadow-[0_10px_30px_-10px_rgba(255,138,101,0.7)] hover:bg-kiddo-coralDeep transition-transform hover:-translate-y-0.5"
            >
              Start Assessment
              <PlayCircle className="w-5 h-5" />
            </a>
            <a
              href="#how"
              data-testid={VA.ctaLearn}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-white border border-slate-200 text-kiddo-ink font-semibold hover:border-kiddo-coral hover:text-kiddo-coralDeep transition-colors"
            >
              Learn How AI Works
            </a>
          </motion.div>

          <div className="mt-8 flex items-center gap-6 text-xs sm:text-sm text-slate-500">
            <div>
              <div className="font-bold text-kiddo-ink text-lg">9</div>
              Steps (8 domains + 1 optional)
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <div className="font-bold text-kiddo-ink text-lg">~5 min</div>
              Parent-friendly detailed report
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <div className="font-bold text-kiddo-ink text-lg">100%</div>
              Auto-deleted videos
            </div>
          </div>
        </div>

        {/* Right - illustration */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-kiddo-peachLight blur-2xl" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-kiddo-mintLight blur-2xl" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-hover ring-1 ring-slate-100">
              <img
                src="https://images.unsplash.com/photo-1758687126864-96b61e1b3af0?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
                alt="Family recording their child during play"
                className="w-full h-full object-cover aspect-[4/5]"
                loading="eager"
              />
              {/* floating chip */}
              <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-5 left-5 right-5 bg-white/90 backdrop-blur rounded-2xl p-4 shadow-soft flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-kiddo-mintLight flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-kiddo-mint" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    Live AI Observation
                  </div>
                  <div className="text-sm font-bold text-kiddo-ink">
                    Joint attention detected
                  </div>
                </div>
                <span className="text-xs font-bold text-kiddo-mint">98%</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
