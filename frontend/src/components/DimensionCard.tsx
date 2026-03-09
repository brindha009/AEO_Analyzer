import type { DimensionScore } from "../types";

interface Props {
  name: string;
  dimension: DimensionScore;
}

const DIMENSION_META: Record<string, { label: string; icon: string }> = {
  content_clarity:   { label: "Content Clarity",   icon: "📝" },
  structured_data:   { label: "Structured Data",   icon: "🗂️" },
  topical_authority: { label: "Topical Authority",  icon: "🏅" },
  answer_readiness:  { label: "Answer Readiness",   icon: "❓" },
  entity_clarity:    { label: "Entity Clarity",     icon: "🔖" },
  freshness_signals: { label: "Freshness Signals",  icon: "📅" },
};

function barColor(pct: number): string {
  if (pct > 70) return "bg-emerald-400";
  if (pct >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function badgeStyle(pct: number): string {
  if (pct > 70) return "bg-emerald-900/50 text-emerald-300";
  if (pct >= 40) return "bg-amber-900/50 text-amber-300";
  return "bg-red-900/50 text-red-300";
}

export default function DimensionCard({ name, dimension }: Props) {
  const { score, max, feedback } = dimension;
  const pct = Math.round((score / max) * 100);
  const meta = DIMENSION_META[name] ?? { label: name, icon: "📊" };

  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-3 animate-slide-up border border-white/5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{meta.icon}</span>
          <span className="text-sm font-semibold text-slate-200">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-slate-100">{score}</span>
          <span className="text-xs text-slate-500">/ {max}</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle(pct)}`}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Feedback */}
      <p className="text-xs text-slate-400 leading-relaxed">{feedback}</p>
    </div>
  );
}
