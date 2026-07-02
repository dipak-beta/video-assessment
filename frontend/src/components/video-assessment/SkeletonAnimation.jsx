import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { VA } from "@/constants/testIds";

const joints = {
  head: [50, 14],
  neck: [50, 24],
  shoulderL: [38, 30],
  shoulderR: [62, 30],
  elbowL: [30, 47],
  elbowR: [70, 47],
  wristL: [25, 62],
  wristR: [75, 62],
  spine: [50, 50],
  hipL: [43, 66],
  hipR: [57, 66],
  kneeL: [40, 82],
  kneeR: [60, 82],
  ankleL: [38, 96],
  ankleR: [62, 96],
};

const bones = [
  ["head", "neck"],
  ["neck", "shoulderL"],
  ["neck", "shoulderR"],
  ["shoulderL", "elbowL"],
  ["elbowL", "wristL"],
  ["shoulderR", "elbowR"],
  ["elbowR", "wristR"],
  ["neck", "spine"],
  ["spine", "hipL"],
  ["spine", "hipR"],
  ["hipL", "kneeL"],
  ["kneeL", "ankleL"],
  ["hipR", "kneeR"],
  ["kneeR", "ankleR"],
];

const flow = [
  "Original Video",
  "Privacy Mask",
  "Skeleton",
  "Feature Extraction",
  "Development Analysis",
  "Report",
];

export default function SkeletonAnimation() {
  return (
    <section data-testid={VA.skeletonAnim} className="bg-soft-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
            Inside the pipeline
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            From video to insight, step by step
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Pose estimation extracts a skeleton of joints. Hand tracking adds finger detail.
            Together they describe how your child moves, plays and interacts — privately.
          </p>

          <div className="mt-8 space-y-2">
            {flow.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3"
              >
                <span className="w-8 h-8 rounded-full bg-white border border-slate-200 text-xs font-bold text-kiddo-ink flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="font-semibold text-kiddo-ink">{f}</span>
                {i < flow.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="relative rounded-[2.5rem] bg-white p-8 sm:p-12 border border-slate-100 shadow-soft">
            <svg viewBox="0 0 100 110" className="w-full max-w-[420px] mx-auto block">
              {/* breathing rings */}
              <motion.circle
                cx="50"
                cy="55"
                r="44"
                fill="none"
                stroke="#FFE0D6"
                strokeWidth="0.3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.02, 0.95] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.circle
                cx="50"
                cy="55"
                r="36"
                fill="none"
                stroke="#D4EFEC"
                strokeWidth="0.3"
                animate={{ opacity: [0.6, 1, 0.6], scale: [1.01, 0.97, 1.01] }}
                transition={{ duration: 3.4, repeat: Infinity }}
              />

              {bones.map(([a, b], i) => {
                const [ax, ay] = joints[a];
                const [bx, by] = joints[b];
                return (
                  <motion.line
                    key={`${a}-${b}`}
                    x1={ax}
                    y1={ay}
                    x2={bx}
                    y2={by}
                    stroke="#1E293B"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.07, duration: 0.6 }}
                  />
                );
              })}
              {Object.entries(joints).map(([k, [x, y]], i) => (
                <motion.circle
                  key={k}
                  cx={x}
                  cy={y}
                  r={1.6}
                  fill="#FF8A65"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                />
              ))}
              {/* gentle bob animation */}
              <motion.g
                animate={{ y: [0, -1.5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-orange-50 p-3">
                <div className="text-xs uppercase font-bold text-kiddo-coralDeep tracking-wider">
                  Joints
                </div>
                <div className="text-2xl font-heading font-black text-kiddo-ink">17</div>
              </div>
              <div className="rounded-2xl bg-teal-50 p-3">
                <div className="text-xs uppercase font-bold text-kiddo-mint tracking-wider">
                  Hand Pts
                </div>
                <div className="text-2xl font-heading font-black text-kiddo-ink">21</div>
              </div>
              <div className="rounded-2xl bg-sky-50 p-3">
                <div className="text-xs uppercase font-bold text-sky-600 tracking-wider">
                  Domains
                </div>
                <div className="text-2xl font-heading font-black text-kiddo-ink">8</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
