import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { VA } from "@/constants/testIds";

const pipelineSteps = [
  "Validating videos",
  "Encrypting & secure storage",
  "Pose estimation",
  "Landmark extraction",
  "Behaviour analysis",
  "Development scoring",
  "Generating report",
];

export default function AnalysisProgress({ status }) {
  if (!status || status.state === "pending") return null;

  return (
    <motion.div
      data-testid={VA.analysisProgress}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-3xl bg-white border border-slate-100 shadow-soft p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        {status.state === "complete" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-kiddo-coral animate-spin" />
        )}
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {status.state === "complete" ? "Complete" : "Processing"}
          </div>
          <div className="font-heading font-bold text-kiddo-ink">{status.step}</div>
        </div>
        <div className="text-2xl font-heading font-black text-kiddo-ink">
          {status.progress}%
        </div>
      </div>
      <div className="mt-4">
        <Progress value={status.progress} className="h-2" />
      </div>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pipelineSteps.map((s, i) => {
          const reached = status.progress >= (i + 1) * (100 / pipelineSteps.length);
          return (
            <div
              key={s}
              className={`text-xs px-2.5 py-1.5 rounded-full text-center ${
                reached
                  ? "bg-orange-50 text-kiddo-coralDeep"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              {s}
            </div>
          );
        })}
      </div>
      {status.error && (
        <div className="mt-4 rounded-2xl p-3 bg-rose-50 text-rose-700 text-sm">
          {status.error}
        </div>
      )}
    </motion.div>
  );
}
