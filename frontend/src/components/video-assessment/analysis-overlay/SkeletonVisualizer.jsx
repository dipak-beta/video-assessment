import { motion } from "framer-motion";
import { joints, bones } from "./constants";

// SVG skeleton visualiser shown in the left panel when there are no video
// files to render (e.g. demo runs). Pure animation — no state.
export default function SkeletonVisualizer() {
  return (
    <div className="relative rounded-3xl bg-white/[0.06] border border-white/10 backdrop-blur-sm p-4 sm:p-6">
      <svg viewBox="0 0 100 110" className="w-full" aria-hidden="true">
        {/* breathing rings */}
        <motion.circle
          cx="50" cy="55" r="46" fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"
          animate={{ scale: [0.96, 1.02, 0.96], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        />
        <motion.circle
          cx="50" cy="55" r="36" fill="none"
          stroke="rgba(77,182,172,0.35)" strokeWidth="0.3"
          animate={{ scale: [1.02, 0.97, 1.02], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        {/* scan line */}
        <motion.line
          x1="6" x2="94" y1="20" y2="20"
          stroke="#4DB6AC" strokeWidth="0.4"
          initial={{ y1: 20, y2: 20 }}
          animate={{ y1: [20, 96, 20], y2: [20, 96, 20] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* bones */}
        {bones.map(([a, b], i) => {
          const [ax, ay] = joints[a];
          const [bx, by] = joints[b];
          return (
            <motion.line
              key={`${a}-${b}`}
              x1={ax} y1={ay} x2={bx} y2={by}
              stroke="#FF8A65"
              strokeWidth="0.7"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.95 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.7 }}
            />
          );
        })}
        {/* joints */}
        {Object.entries(joints).map(([k, [x, y]], i) => (
          <motion.circle
            key={k}
            cx={x} cy={y} r={1.6}
            fill="#4DB6AC"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
          />
        ))}
        {/* hand markers pulsing */}
        <motion.circle
          cx={joints.wristL[0]} cy={joints.wristL[1]} r={3}
          fill="none" stroke="#FFCA28" strokeWidth="0.4"
          initial={{ r: 3 }}
          animate={{ r: [2, 4, 2], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <motion.circle
          cx={joints.wristR[0]} cy={joints.wristR[1]} r={3}
          fill="none" stroke="#FFCA28" strokeWidth="0.4"
          initial={{ r: 3 }}
          animate={{ r: [2, 4, 2], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0.5 }}
        />
      </svg>

      {/* corner overlay labels */}
      <span className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
        Face masked
      </span>
      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80">
        Encrypted
      </span>
    </div>
  );
}
