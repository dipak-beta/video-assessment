import { motion } from "framer-motion";
import { VA } from "@/constants/testIds";

// Skeleton joints (relative coordinates 0-100 viewBox)
const joints = {
  head: [50, 18],
  neck: [50, 27],
  shoulderL: [40, 32],
  shoulderR: [60, 32],
  elbowL: [33, 47],
  elbowR: [67, 47],
  wristL: [29, 62],
  wristR: [71, 62],
  spine: [50, 50],
  hipL: [44, 65],
  hipR: [56, 65],
  kneeL: [42, 82],
  kneeR: [58, 82],
  ankleL: [40, 96],
  ankleR: [60, 96],
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

const labels = [
  "Pose Estimation",
  "Movement Analysis",
  "Hand Tracking",
  "Behaviour Detection",
  "Joint Attention",
  "Eye Gaze Direction",
  "Interaction Mapping",
  "Motor Pattern Detection",
  "Temporal Behaviour",
  "Social Engagement",
];

export default function AIAnalysisVisualizer() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
            What our AI actually sees
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            Movement patterns, not faces
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Faces are masked. The AI focuses on body movement, hand control and behaviour
            patterns — the same observations a paediatric therapist makes.
          </p>
        </div>

        <div
          data-testid={VA.aiVisualizer}
          className="mt-14 grid lg:grid-cols-12 gap-10 items-center"
        >
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-hover ring-1 ring-slate-100 aspect-[4/3] bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1706889949025-2fa85aa8a5d1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
                alt="Child playing"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* privacy soft mask */}
              <div
                className="absolute"
                style={{
                  left: "44%",
                  top: "22%",
                  width: "14%",
                  height: "12%",
                  background: "rgba(255,255,255,0.55)",
                  filter: "blur(10px)",
                  borderRadius: "50%",
                }}
              />
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold tracking-wider uppercase text-emerald-700">
                Face Privacy Masked
              </span>

              {/* SVG skeleton overlay */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
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
                      stroke="#FF8A65"
                      strokeWidth="0.6"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.95 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.6 }}
                    />
                  );
                })}
                {Object.entries(joints).map(([k, [x, y]], i) => (
                  <motion.circle
                    key={k}
                    cx={x}
                    cy={y}
                    r={1.1}
                    fill="#4DB6AC"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: [0, 1.4, 1] }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
                  />
                ))}
              </svg>

              {/* gradient overlay bottom */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                {[
                  { l: "Posture", v: "balanced" },
                  { l: "Engagement", v: "high" },
                  { l: "Movement", v: "smooth" },
                ].map((m) => (
                  <div
                    key={m.l}
                    className="rounded-xl bg-white/85 backdrop-blur px-3 py-2"
                  >
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      {m.l}
                    </div>
                    <div className="text-xs font-bold text-kiddo-ink capitalize">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {labels.map((l, i) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-soft"
                >
                  <span className="w-2 h-2 rounded-full bg-kiddo-coral animate-pulse" />
                  <span className="text-xs sm:text-sm font-semibold text-kiddo-ink">{l}</span>
                </motion.div>
              ))}
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Kiddo+ combines pose & hand landmarks, gaze direction, motion patterns and behaviour
              cues into a structured observation report — not a clinical diagnosis.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
