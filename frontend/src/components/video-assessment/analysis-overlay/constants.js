import {
  ShieldCheck,
  EyeOff,
  Activity,
  Hand,
  Sparkles,
  Brain,
  FileBarChart,
  ScanLine,
  Lock,
} from "lucide-react";

// Ordered pipeline shown in the right panel. `from`/`to` are the backend
// progress bounds (0-100) at which the step is considered active.
export const PIPELINE = [
  { id: "validate", from: 0, to: 8, label: "Validating videos", desc: "Checking format, length & quality", icon: ScanLine },
  { id: "encrypt", from: 8, to: 16, label: "Encrypting & secure storage", desc: "Securing your child's videos in transit", icon: Lock },
  { id: "privacy", from: 16, to: 26, label: "Face privacy masking", desc: "Faces are blurred — never identified", icon: EyeOff },
  { id: "pose", from: 26, to: 44, label: "Pose estimation", desc: "Extracting 17 body landmarks", icon: Activity },
  { id: "hand", from: 44, to: 58, label: "Hand tracking", desc: "21 hand landmarks per frame — grasp, precision, bilateral use", icon: Hand },
  { id: "action", from: 58, to: 72, label: "Action recognition", desc: "Walking, jumping, pointing, stacking, pretend play…", icon: Sparkles },
  { id: "behaviour", from: 72, to: 86, label: "Behaviour analysis", desc: "Attention, regulation, social engagement", icon: Brain },
  { id: "scoring", from: 86, to: 94, label: "Development scoring", desc: "8 core developmental domains + optional behavioural, scored 0 – 100", icon: ShieldCheck },
  { id: "report", from: 94, to: 100, label: "Generating parent-friendly detailed report", desc: "Composing strengths, areas of growth & recommendations", icon: FileBarChart },
];

// Skeleton joints for the central SVG animation (values are percentages of
// the 100×110 viewBox).
export const joints = {
  head: [50, 14], neck: [50, 24],
  shoulderL: [38, 30], shoulderR: [62, 30],
  elbowL: [30, 47], elbowR: [70, 47],
  wristL: [25, 62], wristR: [75, 62],
  spine: [50, 50],
  hipL: [43, 66], hipR: [57, 66],
  kneeL: [40, 82], kneeR: [60, 82],
  ankleL: [38, 96], ankleR: [62, 96],
};
export const bones = [
  ["head","neck"],["neck","shoulderL"],["neck","shoulderR"],
  ["shoulderL","elbowL"],["elbowL","wristL"],
  ["shoulderR","elbowR"],["elbowR","wristR"],
  ["neck","spine"],["spine","hipL"],["spine","hipR"],
  ["hipL","kneeL"],["kneeL","ankleL"],
  ["hipR","kneeR"],["kneeR","ankleR"],
];

// Floating signal labels that drift in and out over the skeleton.
export const FLOATERS = [
  { txt: "Pose · balanced gait", color: "#FF8A65" },
  { txt: "Hand · pincer grasp", color: "#4DB6AC" },
  { txt: "Action · stacking", color: "#FFA000" },
  { txt: "Joint attention", color: "#4FC3F7" },
  { txt: "Bilateral use", color: "#81C784" },
  { txt: "Pointing detected", color: "#FF6B6B" },
  { txt: "Eye gaze ↘", color: "#FFCA28" },
  { txt: "Pretend play", color: "#CDDC39" },
];
