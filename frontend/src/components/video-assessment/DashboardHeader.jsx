import {
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  FileBarChart,
  MoreVertical,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { VA } from "@/constants/testIds";
import ProcessDetailsDialog from "./ProcessDetailsDialog";
import BackedByGoogleBadge from "./BackedByGoogleBadge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function DashboardHeader() {
  const [pipelineOpen, setPipelineOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <a
          href="https://kiddoplus.com"
          data-testid={VA.navHome}
          className="flex items-center gap-2 shrink-0"
        >
          <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-kiddo-coral to-kiddo-peach flex items-center justify-center text-white font-heading font-black text-base sm:text-lg shadow-soft">
            K
          </span>
          <span className="font-heading font-black text-lg sm:text-xl text-kiddo-ink hidden xs:inline">
            Kiddo<span className="text-kiddo-coral">+</span>
          </span>
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/progress"
            data-testid="header-progress-link"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-slate-50 text-kiddo-ink text-[10px] sm:text-xs font-semibold hover:bg-slate-100"
          >
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Progress
          </Link>
          <Link
            to="/report"
            data-testid="header-report-link"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full bg-slate-50 text-kiddo-ink text-[10px] sm:text-xs font-semibold hover:bg-slate-100"
          >
            <FileBarChart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Report
          </Link>
          <Link
            to="/trust"
            data-testid="header-trust-link"
            className="inline-flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold whitespace-nowrap hover:bg-emerald-100"
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Privacy First
          </Link>

          {/* Animated "Backed by Google" badge */}
          <BackedByGoogleBadge
            size="sm"
            dataTestId="header-backed-by-google"
          />

          <button
            type="button"
            onClick={() => setPipelineOpen(true)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500"
            aria-label="How the pipeline works"
            data-testid="header-help-button"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>

          {/* Mobile-only kebab — collapses Progress & Report links from the
              cramped mobile header into a compact dropdown. Hidden on >=sm
              where the full Progress/Report pills are shown inline. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="More navigation"
                data-testid="header-mobile-menu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[180px] rounded-2xl border border-slate-100 shadow-xl p-1.5 bg-white"
            >
              <DropdownMenuItem asChild>
                <Link
                  to="/progress"
                  data-testid="header-mobile-menu-progress"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-kiddo-ink cursor-pointer focus:bg-slate-50"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  Progress
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/report"
                  data-testid="header-mobile-menu-report"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-kiddo-ink cursor-pointer focus:bg-slate-50"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 text-kiddo-coralDeep">
                    <FileBarChart className="w-4 h-4" />
                  </span>
                  Report
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProcessDetailsDialog
        open={pipelineOpen}
        onClose={() => setPipelineOpen(false)}
      />
    </header>
  );
}
