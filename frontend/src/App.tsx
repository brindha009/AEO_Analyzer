import { useState } from "react";
import { analyzeUrl } from "./api";
import type { AnalyzeResponse } from "./types";
import URLInput from "./components/URLInput";
import ScoreGauge from "./components/ScoreGauge";
import DimensionCard from "./components/DimensionCard";
import Recommendations from "./components/Recommendations";

type Status = "idle" | "loading" | "success" | "error";

const IDLE_PILLS = [
  { icon: "📝", label: "Content Clarity" },
  { icon: "🗂️", label: "Structured Data" },
  { icon: "🏅", label: "Topical Authority" },
  { icon: "❓", label: "Answer Readiness" },
  { icon: "🔖", label: "Entity Clarity" },
  { icon: "📅", label: "Freshness Signals" },
];

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAnalyze(url: string) {
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const data = await analyzeUrl(url);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-bold text-slate-100 tracking-tight">AEO Analyzer</span>
          <span className="text-xs text-slate-500 hidden sm:block">Answer Engine Optimization</span>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-brand-900/60 text-brand-300 border border-brand-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Powered by Claude AI
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Is your page ready for{" "}
            <span className="gradient-text">AI answer engines?</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Paste any URL and get an instant AEO score with actionable
            recommendations for ChatGPT, Perplexity, Google SGE, and Bing Copilot.
          </p>
        </div>

        {/* URL input */}
        <URLInput onSubmit={handleAnalyze} loading={status === "loading"} />

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {status === "loading" && (
          <div className="space-y-4 animate-pulse">
            <div className="glass rounded-2xl h-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-xl h-28" />
              ))}
            </div>
            <div className="glass rounded-xl h-36" />
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="glass rounded-xl p-5 border border-red-800/50 bg-red-900/10 flex items-start gap-3 animate-fade-in">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-red-300 text-sm">Analysis failed</p>
              <p className="text-red-400/80 text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {status === "success" && result && (
          <div className="space-y-6 animate-fade-in">
            {/* Overall score */}
            <ScoreGauge score={result.overall_score} />

            {/* Page metadata strip */}
            <div className="glass rounded-xl px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border border-white/5">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Page Title</p>
                <p className="text-slate-200 font-medium truncate">
                  {result.page_title || <span className="text-slate-500 italic">None found</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Headings</p>
                <p className="text-slate-200 font-medium">{result.headings.length} heading(s) found</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Schema Types</p>
                {result.schema_types.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {result.schema_types.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-brand-900/60 text-brand-300 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic text-xs">None detected</span>
                )}
              </div>
            </div>

            {/* Dimension cards */}
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Dimension Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.dimensions).map(([key, dim]) => (
                  <DimensionCard key={key} name={key} dimension={dim} />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <Recommendations items={result.recommendations} />

            <p className="text-center text-xs text-slate-600">
              Analysed:{" "}
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">
                {result.url}
              </a>
            </p>
          </div>
        )}

        {/* ── Idle hint ────────────────────────────────────────────────── */}
        {status === "idle" && (
          <div className="text-center py-6 space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
              {IDLE_PILLS.map(({ icon, label }) => (
                <div key={label} className="glass rounded-xl px-4 py-3 flex items-center gap-2.5 border border-white/5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs text-slate-400 font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600">
              6 dimensions · scored by Claude AI · no login required
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-600">
        AEO Analyzer — FastAPI · Claude AI · React
      </footer>
    </div>
  );
}
