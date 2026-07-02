import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X, HelpCircle, Video } from "lucide-react";
import { VA } from "@/constants/testIds";

const dos = [
  "Natural behaviour",
  "Good lighting",
  "Entire body visible",
  "Normal daily activities",
  "Let your child behave naturally",
  "Stable camera",
];

const donts = [
  "Force the child",
  "Constant prompting",
  "Heavy editing",
  "Loud background TV",
  "Filters or beauty effects",
  "Multiple children in frame",
];

const faq = [
  {
    q: "Why do you need multiple videos?",
    a: "Development isn't one skill — we look across 9 slices (8 core domains + 1 optional behavioural). Different short clips help our AI see how your child moves, plays, communicates and regulates emotion across natural moments.",
  },
  {
    q: "How many videos should I upload?",
    a: "Ideally one short clip (30–60 sec) per step — 8 for the core domains plus an optional 9th behavioural clip. You can upload fewer; the report will focus on the domains you provided.",
  },
  {
    q: "What if my child refuses to be on camera?",
    a: "Don't force it. Try filming during natural play. A few candid seconds is more useful than a staged clip.",
  },
  {
    q: "Will my videos be stored?",
    a: "No. Videos are encrypted during processing and automatically deleted as soon as the report is generated.",
  },
  {
    q: "How accurate is the AI?",
    a: "Our pipeline combines pose estimation, hand tracking and action recognition with a vision-language model. It is a starting point, not a diagnosis.",
  },
  {
    q: "Can this diagnose autism or other conditions?",
    a: "No. Kiddo+ provides AI-assisted developmental screening only. A formal diagnosis requires evaluation by a qualified paediatric healthcare professional.",
  },
];

export default function GuidanceAndFAQ() {
  return (
    <section className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Recording tips */}
      <div
        data-testid={VA.recordingTips}
        className="lg:col-span-5 rounded-2xl bg-white border border-slate-100 p-5 sm:p-7 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.15)]"
      >
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-[0.14em] text-kiddo-coralDeep">
          <Video className="w-3 h-3" />
          Recording tips
        </div>
        <h3 className="mt-2 font-heading font-black text-lg sm:text-xl text-kiddo-ink tracking-tight">
          A few things that help the AI
        </h3>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Do column */}
          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 mb-2.5">
              <span className="inline-flex w-4 h-4 rounded-full bg-emerald-500 text-white items-center justify-center">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
              Do
            </div>
            <ul className="space-y-2">
              {dos.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-snug"
                >
                  <Check
                    className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0"
                    strokeWidth={2.5}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Don't column */}
          <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-rose-700 mb-2.5">
              <span className="inline-flex w-4 h-4 rounded-full bg-rose-500 text-white items-center justify-center">
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              </span>
              Don&apos;t
            </div>
            <ul className="space-y-2">
              {donts.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 leading-snug"
                >
                  <X
                    className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0"
                    strokeWidth={2.5}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div
        data-testid={VA.faq}
        className="lg:col-span-7 rounded-2xl bg-white border border-slate-100 p-5 sm:p-7 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.15)]"
      >
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black uppercase tracking-[0.14em] text-kiddo-coralDeep">
          <HelpCircle className="w-3 h-3" />
          FAQ
        </div>
        <h3 className="mt-2 font-heading font-black text-lg sm:text-xl text-kiddo-ink tracking-tight">
          Common questions
        </h3>
        <Accordion type="single" collapsible className="mt-3">
          {faq.map((it, i) => (
            <AccordionItem
              key={it.q}
              value={`item-${i}`}
              data-testid={VA.faqItem(i)}
              className="border-b border-slate-100 last:border-b-0 group"
            >
              <AccordionTrigger className="text-left text-sm sm:text-[15px] font-bold text-kiddo-ink hover:text-kiddo-coralDeep hover:no-underline py-3.5 transition-colors">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 pb-3 leading-relaxed">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
