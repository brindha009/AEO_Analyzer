interface Props {
  score: number;
}

function ringColor(score: number) {
  if (score > 70) return { stroke: "#34d399", text: "text-emerald-400", label: "Great",  bg: "bg-emerald-500/10" };
  if (score >= 40) return { stroke: "#fbbf24", text: "text-amber-400",   label: "Fair",   bg: "bg-amber-500/10"  };
  return              { stroke: "#f87171", text: "text-red-400",     label: "Poor",   bg: "bg-red-500/10"    };
}

export default function ScoreGauge({ score }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const { stroke, text, label, bg } = ringColor(score);

  return (
    <div className={`glass rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-8 ${bg} border border-white/5 animate-fade-in`}>
      {/* Ring */}
      <div className="relative flex-shrink-0 w-36 h-36">
        <svg width="144" height="144" className="-rotate-90" viewBox="0 0 144 144">
          {/* Track */}
          <circle cx="72" cy="72" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="72" cy="72" r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white leading-none">{score}</span>
          <span className="text-[11px] text-slate-500 mt-1 font-medium tracking-wide">/ 100</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center sm:text-left">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Overall AEO Score</p>
        <p className={`text-5xl font-black leading-none mb-3 ${text}`}>{label}</p>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
          {score > 70
            ? "This page is well-optimised for AI answer engines."
            : score >= 40
            ? "Good foundation — several improvements can boost visibility."
            : "Significant work needed to appear in AI-generated answers."}
        </p>
      </div>
    </div>
  );
}
