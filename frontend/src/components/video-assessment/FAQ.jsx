import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VA } from "@/constants/testIds";

const items = [
  {
    q: "Why do you need multiple videos?",
    a: "Development isn't one skill — we look across 9 slices (8 core domains + 1 optional behavioural). Different short clips help our AI see how your child moves, plays, communicates and regulates emotion across natural moments.",
  },
  {
    q: "How many videos should I upload?",
    a: "Ideally one short clip (30–60 sec) per step — 8 for the core domains plus an optional 9th behavioural clip. You can also upload fewer; the report will simply focus on the domains you provided.",
  },
  {
    q: "What if my child refuses to be on camera?",
    a: "Don't force it. Try filming during natural play when they aren't paying attention to the camera. A few candid seconds is more useful than a staged clip.",
  },
  {
    q: "Will my videos be stored?",
    a: "No. Videos are encrypted during processing and automatically deleted as soon as the report is generated. Only the anonymised observations are retained.",
  },
  {
    q: "Who can view my videos?",
    a: "No human reviews your uploads by default. Processing happens through secure AI pipelines. Only you can choose to share the final report.",
  },
  {
    q: "How accurate is the AI?",
    a: "Our screening pipeline is designed to surface developmental patterns with confidence scores. It is best used as a starting point — not a diagnosis.",
  },
  {
    q: "Can this diagnose autism or other conditions?",
    a: "No. Kiddo+ provides AI-assisted developmental screening only. A formal diagnosis requires evaluation by a qualified paediatric healthcare professional.",
  },
  {
    q: "Can this replace therapy?",
    a: "No. Kiddo+ supports your child's development with everyday guidance, but it never replaces clinical assessment or therapy from licensed professionals.",
  },
];

export default function FAQ() {
  return (
    <section data-testid={VA.faq} className="bg-soft-section">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">FAQ</p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            Questions, answered.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {items.map((it, i) => (
            <AccordionItem
              key={it.q}
              value={`item-${i}`}
              data-testid={VA.faqItem(i)}
              className="rounded-2xl bg-white border border-slate-100 px-5 sm:px-6 shadow-soft"
            >
              <AccordionTrigger className="text-left text-base sm:text-lg font-heading font-bold text-kiddo-ink hover:no-underline py-5">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 pb-5">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
