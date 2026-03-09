interface Props {
  items: string[];
}

const ACCENT = [
  "from-brand-500 to-violet-500",
  "from-violet-500 to-pink-500",
  "from-pink-500 to-rose-500",
];

export default function Recommendations({ items }: Props) {
  if (!items.length) return null;

  return (
    <div className="glass rounded-xl p-6 border border-white/5 animate-slide-up">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Top Recommendations
      </h2>
      <ol className="space-y-3">
        {items.map((rec, i) => (
          <li key={i} className="flex items-start gap-3">
            {/* Number badge */}
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${ACCENT[i] ?? ACCENT[0]} flex items-center justify-center text-[11px] font-bold text-white mt-0.5`}
            >
              {i + 1}
            </span>
            <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
