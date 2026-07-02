import { Link } from "react-router-dom";
import { VA } from "@/constants/testIds";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a
          href="https://kiddoplus.com"
          data-testid={VA.navHome}
          className="flex items-center gap-2 group"
        >
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-kiddo-coral to-kiddo-peach flex items-center justify-center text-white font-heading font-black text-lg shadow-soft">
            K
          </span>
          <span className="font-heading font-black text-xl text-kiddo-ink">
            Kiddo<span className="text-kiddo-coral">+</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#how" className="hover:text-kiddo-coral transition-colors">
            How it works
          </a>
          <a href="#domains" className="hover:text-kiddo-coral transition-colors">
            8 Domains
          </a>
          <a href="#privacy" className="hover:text-kiddo-coral transition-colors">
            Privacy
          </a>
          <a href="#report" className="hover:text-kiddo-coral transition-colors">
            Sample Report
          </a>
        </nav>
        <Link
          to="#upload"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="hidden sm:inline-flex items-center gap-2 px-5 h-10 rounded-full bg-kiddo-ink text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          Start Assessment
        </Link>
      </div>
    </header>
  );
}
