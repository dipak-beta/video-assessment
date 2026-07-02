import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, Camera, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { DOMAINS } from "@/data/domains";
import { VA } from "@/constants/testIds";
import VideoDropzone from "./VideoDropzone";

export default function DomainCards({ uploads, uploading, progress, onUpload, onDelete }) {
  const [open, setOpen] = useState(null);

  return (
    <section id="domains" className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-kiddo-coral">
            9 Steps · 8 domains + 1 optional
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-kiddo-ink">
            Upload videos across 9 Kiddo+ steps
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Tap any card to learn exactly what to record. Each domain accepts one 30–60 second clip.
          </p>
        </div>

        <div data-testid={VA.domainGrid} className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5">
          {DOMAINS.map((d, i) => {
            const isOpen = open === d.key;
            const u = uploads[d.key];
            const isUp = uploading[d.key];
            const pr = progress[d.key] || 0;
            const Icon = d.icon;
            return (
              <motion.div
                key={d.key}
                data-testid={VA.domainCard(d.key)}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.04 }}
                className="rounded-3xl bg-white border border-slate-100 shadow-soft hover:shadow-hover transition-shadow overflow-hidden"
              >
                <button
                  data-testid={VA.domainExpand(d.key)}
                  onClick={() => setOpen(isOpen ? null : d.key)}
                  className="w-full flex items-center gap-4 p-6 text-left"
                  aria-expanded={isOpen}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${d.color}1F`, color: d.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${d.color}1A`, color: d.color }}
                      >
                        Domain {d.index}
                      </span>
                      {u && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-heading font-bold text-kiddo-ink text-lg">
                      {d.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {d.examples.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 grid sm:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                            Why we need this
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{d.why}</p>

                          <div className="mt-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                            How to record
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{d.how}</p>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-4 h-4" />
                              {d.duration}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Camera className="w-4 h-4" />
                              {d.angle}
                            </div>
                          </div>

                          <div className="mt-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                            Good examples
                          </div>
                          <ul className="mt-1 grid grid-cols-1 gap-1">
                            {d.examples.map((e) => (
                              <li key={e} className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {e}
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 text-xs font-bold uppercase text-slate-500 tracking-wider">
                            Things to avoid
                          </div>
                          <ul className="mt-1 grid grid-cols-1 gap-1">
                            {d.avoid.map((e) => (
                              <li key={e} className="flex items-center gap-2 text-sm text-slate-600">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" /> {e}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                            What AI will observe
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            {d.observe.map((o) => (
                              <span
                                key={o}
                                className="text-xs px-2.5 py-1 rounded-full"
                                style={{ background: `${d.color}14`, color: d.color }}
                              >
                                {o}
                              </span>
                            ))}
                          </div>
                          <VideoDropzone
                            domainKey={d.key}
                            domainColor={d.color}
                            uploaded={u}
                            uploading={isUp}
                            progress={pr}
                            onUpload={(file) => onUpload(d.key, file)}
                            onDelete={() => onDelete(d.key)}
                            testIdUpload={VA.domainUpload(d.key)}
                            testIdRemove={VA.domainRemove(d.key)}
                            compact
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
