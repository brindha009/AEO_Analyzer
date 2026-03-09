import type { AnalyzeResponse } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function analyzeUrl(url: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(
      typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail)
    );
  }

  return res.json() as Promise<AnalyzeResponse>;
}
