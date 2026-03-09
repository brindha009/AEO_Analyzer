export interface DimensionScore {
  score: number;
  max: number;
  feedback: string;
}

export interface AnalyzeResponse {
  url: string;
  overall_score: number;
  dimensions: Record<string, DimensionScore>;
  recommendations: string[];
  page_title: string;
  meta_description: string;
  headings: string[];
  has_schema: boolean;
  schema_types: string[];
  error: string | null;
}
