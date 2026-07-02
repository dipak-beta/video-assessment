import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Lock,
  EyeOff,
  Activity,
  Hand,
  Sparkles,
  Brain,
  FileBarChart,
  Trash2,
  ShieldCheck,
  Database,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    id: "upload",
    icon: Lock,
    color: "#FF8A65",
    title: "Secure encrypted upload",
    short: "TLS 1.3 in transit, encrypted at rest.",
    details: [
      "Your video travels to our servers over a TLS 1.3 encrypted connection.",
      "Each upload is tied to a single anonymised assessment session — never to your name, email or device identifier.",
      "Files are stored on isolated, access-controlled processing storage for the brief window they are being analysed.",
    ],
    Illustration: UploadIllustration,
  },
  {
    id: "privacy",
    icon: EyeOff,
    color: "#34D399",
    title: "Face privacy mask",
    short: "Faces auto-blurred before analysis begins.",
    details: [
      "Before any developmental analysis runs, faces are automatically detected and masked.",
      "We never use facial recognition — your child is never identified as a person.",
      "Only body, hand and gaze direction signals are extracted.",
    ],
    Illustration: PrivacyIllustration,
  },
  {
    id: "pose",
    icon: Activity,
    color: "#FFA000",
    title: "Pose estimation",
    short: "17-point full-body skeleton tracked frame by frame.",
    details: [
      "Our pose model maps 17 body landmarks — head, shoulders, elbows, wrists, spine, hips, knees, ankles.",
      "From these joints we compute posture, balance, symmetry, gait quality and transitions.",
      "This is the same family of models used in clinical movement-analysis research.",
    ],
    Illustration: PoseIllustration,
  },
  {
    id: "hand",
    icon: Hand,
    color: "#4DB6AC",
    title: "Hand tracking",
    short: "21 landmarks per hand for fine-motor signals.",
    details: [
      "Each hand is tracked with 21 fingertip and knuckle landmarks.",
      "We infer grasp type (palmar, radial, pincer), bilateral coordination, finger isolation and in-hand manipulation.",
      "Crucial for evaluating fine motor and daily-living skills.",
    ],
    Illustration: HandIllustration,
  },
  {
    id: "action",
    icon: Sparkles,
    color: "#4FC3F7",
    title: "Action recognition",
    short: "Discrete behaviours: walking, pointing, stacking, pretend play…",
    details: [
      "Temporal action models identify what your child is actually doing in each clip — walking, running, jumping, pointing, stacking, sharing, requesting, pretend play.",
      "These behaviour labels become evidence-grounded inputs to the developmental report.",
    ],
    Illustration: ActionIllustration,
  },
  {
    id: "reason",
    icon: Brain,
    color: "#A78BFA",
    title: "Cross-domain reasoning",
    short: "Vision-language AI combines all signals into observations.",
    details: [
      "A vision-language model (Gemini 2.5) combines pose, hand, and action signals across all 8 developmental domains.",
      "It maps observed patterns against age-band developmental milestones and evidence-informed behavioural indicators.",
      "The output is structured JSON — never freeform speculation.",
    ],
    Illustration: ReasonIllustration,
  },
  {
    id: "report",
    icon: FileBarChart,
    color: "#FF6B6B",
    title: "Parent-friendly detailed report",
    short: "Scores, strengths, growth areas, recommendations.",
    details: [
      "8 domain scores (0–100) with confidence levels.",
      "Plain-language strengths, areas needing support, recommended activities and a 30-day home program.",
      "Carries a clear disclaimer: AI-assisted screening, not a clinical diagnosis.",
    ],
    Illustration: ReportIllustration,
  },
  {
    id: "delete",
    icon: Trash2,
    color: "#10B981",
    title: "Permanent video deletion",
    short: "Original videos are removed the moment your report is ready.",
    details: [
      "As soon as the report is generated, every original video file is permanently deleted from our processing storage.",
      "No backups, no archives. The deletion is irreversible.",
      "Only the anonymised developmental observations remain — and only if you explicitly keep them.",
    ],
    Illustration: DeleteIllustration,
  },
];

export default function ProcessDetailsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        data-testid="process-details-dialog"
        className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[92vh] rounded-3xl border border-slate-100 p-0 overflow-hidden gap-0 bg-white"
      >
        {/* Header */}
        <div className="relative px-5 sm:px-8 pt-7 pb-5 bg-gradient-to-br from-orange-50 via-white to-teal-50">
          <div className="flex items-start gap-3 pr-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-soft"
            >
              <ShieldCheck className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Inside the pipeline
              </div>
              <h2 className="mt-0.5 font-heading text-xl sm:text-2xl font-black text-kiddo-ink">
                How we process your child&apos;s video
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                An 8-step privacy-first pipeline — from encrypted upload to
                permanent deletion. Every step explained.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          className="px-4 sm:px-8 py-5 sm:py-7 overflow-y-auto"
          style={{ maxHeight: "calc(92vh - 170px)" }}
        >
          <ol className="relative">
            {/* Vertical timeline line */}
            <span
              aria-hidden="true"
              className="absolute left-[26px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-100 to-transparent"
            />

            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const Illustration = s.Illustration;
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-16 pb-7 last:pb-0"
                >
                  {/* Step icon */}
                  <div
                    className="absolute left-0 top-0 w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-soft border border-white"
                    style={{ background: s.color, color: "white" }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  {/* Step number badge */}
                  <span className="absolute -left-1 -top-1 w-5 h-5 rounded-full bg-white text-[10px] font-bold text-slate-600 flex items-center justify-center border border-slate-200">
                    {i + 1}
                  </span>

                  <div className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-kiddo-ink text-base sm:text-lg">
                          {s.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{s.short}</p>
                        <ul className="mt-3 space-y-1.5">
                          {s.details.map((d) => (
                            <li
                              key={d}
                              className="flex items-start gap-2 text-xs sm:text-sm text-slate-700"
                            >
                              <CheckCircle2
                                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                style={{ color: s.color }}
                              />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="shrink-0 sm:w-32 sm:h-32 w-full h-24 rounded-2xl flex items-center justify-center" style={{ background: `${s.color}10` }}>
                        <Illustration color={s.color} />
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>

          {/* Trust footer */}
          <div className="mt-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
            <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-900">
              <strong>Never used for AI training.</strong> Your child&apos;s
              videos are never used to train our or anyone else&apos;s models.
              Only anonymised developmental observations are retained — and only
              if you keep them.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------- Mini animated illustrations ----------------- */

function UploadIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <motion.rect
        x="20" y="60" width="60" height="22" rx="5"
        fill="none" stroke={color} strokeWidth="2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      />
      <motion.path
        d="M50 55 V20 M40 30 L50 20 L60 30"
        stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="50" cy="71" r="2" fill={color}
        animate={{ scale: [1, 1.6, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </svg>
  );
}

function PrivacyIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <circle cx="50" cy="45" r="20" fill={`${color}33`} />
      <motion.circle
        cx="50" cy="45" r="20"
        fill="none" stroke={color} strokeWidth="2"
        animate={{ r: [20, 24, 20], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <rect x="36" y="40" width="28" height="10" rx="5" fill="white" />
      <rect x="36" y="40" width="28" height="10" rx="5" fill={color} opacity="0.4" />
      <text x="50" y="80" textAnchor="middle" fontSize="9" fill={color} fontWeight="700">PRIVATE</text>
    </svg>
  );
}

function PoseIllustration({ color }) {
  const dots = [
    [50, 15], [50, 28], [40, 32], [60, 32],
    [35, 50], [65, 50], [50, 55], [42, 70],
    [58, 70], [40, 85], [60, 85],
  ];
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <motion.line x1="50" y1="15" x2="50" y2="28" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
      />
      <motion.line x1="40" y1="32" x2="60" y2="32" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
      />
      <motion.line x1="40" y1="32" x2="35" y2="50" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
      />
      <motion.line x1="60" y1="32" x2="65" y2="50" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
      />
      <motion.line x1="50" y1="28" x2="50" y2="55" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.line x1="42" y1="70" x2="50" y2="55" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.35 }}
      />
      <motion.line x1="58" y1="70" x2="50" y2="55" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.35 }}
      />
      <motion.line x1="40" y1="85" x2="42" y2="70" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.45 }}
      />
      <motion.line x1="60" y1="85" x2="58" y2="70" stroke={color} strokeWidth="1.2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.45 }}
      />
      {dots.map(([x, y], i) => (
        <motion.circle
          key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.6, 1] }}
          transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
        />
      ))}
    </svg>
  );
}

function HandIllustration({ color }) {
  const fingers = [
    [{x:30,y:55},{x:28,y:42},{x:26,y:30},{x:25,y:20}],
    [{x:40,y:50},{x:39,y:35},{x:38,y:22},{x:37,y:12}],
    [{x:50,y:48},{x:50,y:32},{x:50,y:18},{x:50,y:8}],
    [{x:60,y:50},{x:61,y:35},{x:62,y:22},{x:63,y:12}],
    [{x:70,y:55},{x:72,y:42},{x:74,y:30},{x:75,y:20}],
  ];
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <rect x="22" y="55" width="56" height="30" rx="10" fill={`${color}26`} />
      {fingers.map((finger, fi) =>
        finger.map((p, i) => (
          <motion.circle
            key={`${fi}-${i}`} cx={p.x} cy={p.y} r="2" fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 1] }}
            transition={{ delay: fi * 0.08 + i * 0.05, duration: 0.4 }}
          />
        ))
      )}
      {fingers.map((finger, fi) => (
        <motion.polyline
          key={fi}
          points={finger.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={color}
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.3 + fi * 0.08 }}
        />
      ))}
    </svg>
  );
}

function ActionIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M 20 60 Q 40 30 60 60 T 90 60"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity={1 - i * 0.3}
          animate={{ x: [-20, 20, -20] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
      <motion.circle cx="50" cy="50" r="4" fill={color}
        animate={{ x: [-15, 15, -15] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function ReasonIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      {[
        [25, 30], [75, 30], [50, 20], [25, 70], [75, 70], [50, 80],
      ].map((p, i) => (
        <motion.circle
          key={i} cx={p[0]} cy={p[1]} r="4" fill={color}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      <circle cx="50" cy="50" r="9" fill={color} opacity="0.2" />
      <circle cx="50" cy="50" r="5" fill={color} />
      {[
        [25, 30], [75, 30], [50, 20], [25, 70], [75, 70], [50, 80],
      ].map((p, i) => (
        <motion.line key={`l${i}`} x1="50" y1="50" x2={p[0]} y2={p[1]} stroke={color} strokeWidth="0.8"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </svg>
  );
}

function ReportIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <rect x="22" y="14" width="56" height="72" rx="6" fill="white" stroke={color} strokeWidth="2" />
      {[28, 40, 52, 64].map((y, i) => (
        <motion.rect
          key={y} x="30" y={y} height="5" rx="2.5" fill={color}
          initial={{ width: 0 }}
          animate={{ width: [0, 50 - i * 7, 50 - i * 7] }}
          transition={{ duration: 1.2, delay: 0.1 + i * 0.12 }}
        />
      ))}
      <motion.circle cx="50" cy="78" r="4" fill={color}
        animate={{ scale: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </svg>
  );
}

function DeleteIllustration({ color }) {
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16 sm:w-20 sm:h-20">
      <rect x="30" y="32" width="40" height="46" rx="4" fill="none" stroke={color} strokeWidth="2" />
      <rect x="28" y="26" width="44" height="6" rx="3" fill={color} />
      <line x1="50" y1="22" x2="50" y2="26" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="22" x2="58" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {[40, 50, 60].map((x, i) => (
        <motion.line
          key={x}
          x1={x} y1="40" x2={x} y2="70"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}
