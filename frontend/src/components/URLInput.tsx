import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function URLInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function validate(url: string): boolean {
    try {
      const { protocol } = new URL(url);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    if (!validate(withProtocol)) {
      setError("Please enter a valid URL (e.g. https://example.com).");
      return;
    }
    setError("");
    onSubmit(withProtocol);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(""); }}
            placeholder="https://yourwebsite.com/page"
            disabled={loading}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition disabled:opacity-50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3.5 rounded-xl font-semibold text-sm bg-brand-600 hover:bg-brand-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-brand-900/40"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5 pl-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </form>
  );
}
