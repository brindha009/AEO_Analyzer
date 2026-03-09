# AEO Analyzer

A full-stack web tool that scores any URL for **Answer Engine Optimization (AEO)** — measuring how well a page is positioned to be cited and quoted by AI answer engines like ChatGPT, Perplexity, Google SGE, and Bing Copilot.

Paste a URL, and the app fetches the page, extracts its content, and sends it to Claude AI for a structured 6-dimension analysis with per-dimension feedback and prioritised recommendations.

---

## What It Does

Traditional SEO focuses on ranking in search results. AEO focuses on something newer: getting your content **selected as a source** by AI systems that generate direct answers. This tool audits a page across six dimensions that AI answer engines care about most:

| Dimension | Max Score | What it evaluates |
|---|---|---|
| Content Clarity | 20 | Is the writing clear, well-structured, and easy for AI to parse? |
| Structured Data | 20 | JSON-LD schema, FAQPage, HowTo, Article markup |
| Answer Readiness | 20 | Does the page directly answer questions a user might ask? |
| Topical Authority | 15 | Does the page demonstrate expertise and depth on its topic? |
| Entity Clarity | 15 | Are key entities (people, places, products) clearly named and defined? |
| Freshness Signals | 10 | Are there publish dates, update dates, or other recency indicators? |

Results include a 0–100 overall score, per-dimension feedback written by Claude, and three prioritised action items.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.11, FastAPI, Uvicorn |
| Web scraping | httpx (async), BeautifulSoup4, lxml |
| AI scoring | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Data validation | Pydantic v2 |
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS v3 |
| Environment | python-dotenv |

---

## Project Structure

```
AEO_Analyzer/
├── backend/
│   ├── main.py         — FastAPI app, CORS, /health and /analyze routes
│   ├── scraper.py      — Async URL fetcher with in-memory cache
│   ├── scorer.py       — Claude API client and prompt logic
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx             — Main layout and state
        ├── api.ts              — fetch wrapper
        ├── types.ts            — TypeScript interfaces
        └── components/
            ├── URLInput.tsx        — URL field + submit button
            ├── ScoreGauge.tsx      — Animated SVG score ring
            ├── DimensionCard.tsx   — Per-dimension score + feedback
            └── Recommendations.tsx — Top 3 action items
```

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your Anthropic API key:
#   ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# Start the API server
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### 2. Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:5173`

---

## API Reference

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /analyze`

**Request**
```json
{ "url": "https://example.com/article" }
```

**Response**
```json
{
  "url": "https://example.com/article",
  "overall_score": 74,
  "dimensions": {
    "content_clarity":   { "score": 16, "max": 20, "feedback": "Well-structured paragraphs..." },
    "structured_data":   { "score": 12, "max": 20, "feedback": "Article schema found but no FAQPage..." },
    "answer_readiness":  { "score": 15, "max": 20, "feedback": "Page answers the primary query directly..." },
    "topical_authority": { "score": 11, "max": 15, "feedback": "Good depth but lacks citations..." },
    "entity_clarity":    { "score": 12, "max": 15, "feedback": "Key entities are named but not defined..." },
    "freshness_signals": { "score":  8, "max": 10, "feedback": "Publish date is present..." }
  },
  "recommendations": [
    "Add FAQPage JSON-LD schema with at least 5 question-answer pairs.",
    "Include explicit author attribution with a Person schema.",
    "Add a last-updated date visible on the page."
  ],
  "page_title": "Example Article Title",
  "meta_description": "A brief description...",
  "headings": ["Main Heading", "Section One", "Section Two"],
  "has_schema": true,
  "schema_types": ["Article"],
  "error": null
}
```

**Error responses**
- `422` — URL could not be fetched (invalid URL, timeout, non-HTML response)
- `502` — Claude API call failed (bad key, rate limit, etc.)

---

## How I Built This With AI

This project was built entirely using **Cursor** with Claude as the AI pair programmer. Here is an honest account of the methodology, what worked well, and where human judgement was needed.

### Prompting Methodology

I worked through the project in numbered steps, each given as a focused prompt with a clear deliverable. Rather than asking for everything at once, each prompt targeted one layer:

- Step 1: scaffold the backend (FastAPI, `/analyze` endpoint, response schema)
- Step 2: write the scraper (`scrape_url` function, specific return fields)
- Step 3: write the Claude scorer (`score_aeo` function, exact JSON shape)
- Step 4: wire the endpoint to call scraper → scorer in sequence
- Step 5: build the frontend components one by one
- Step 6: review the scraper for performance and edge cases
- Step 7: write this README

This step-by-step approach meant each generation was small enough to review carefully, and mistakes in one layer didn't cascade into the next.

### What Cursor Got Right

**Backend structure** — FastAPI boilerplate, Pydantic request/response models, CORS middleware, and the `load_dotenv` setup were all generated correctly on the first attempt with no changes needed.

**Prompt engineering for the scorer** — The system prompt instructing Claude to return only valid JSON (no markdown fences) and the exact JSON shape in the user message template were well-constructed. The fallback regex to strip accidental code fences was a smart defensive addition.

**Error handling breadth** — The scraper correctly handled `httpx.TimeoutException`, `httpx.HTTPStatusError`, `httpx.RequestError`, non-HTML content types, and invalid URL schemes without being prompted for each individually.

**Component decomposition** — The frontend was split into four focused components (`URLInput`, `ScoreGauge`, `DimensionCard`, `Recommendations`) with clean prop interfaces, which made them easy to reason about and update independently.

### What Needed Correction

**Redundant DOM traversal (SELECT \* equivalent)** — The original scraper had a `_has_schema()` helper that traversed the entire DOM a second time — scanning all `<script type="application/ld+json">` tags and all `itemtype` attributes — immediately after `_extract_schema_types()` had already done exactly that. I caught this in the Step 6 review and collapsed it to `bool(schema_types)`.

**Missing in-memory cache** — The first version of the scraper re-fetched the same URL on every request with no caching. For a tool likely to be tested with the same URLs repeatedly, this was wasteful and slow. A 10-minute TTL cache using `time.monotonic()` was added in the performance review step.

**Stale response model** — After rewiring the endpoint in Step 4 to use `scraper + scorer` instead of the original `analyzer.py` pipeline, the `AnalyzeResponse` Pydantic model and the frontend `types.ts` still referenced the old shape (`categories`, `grade`, `summary`). Both had to be updated to match the new `dimensions` dictionary from Claude.

**Non-200 status handling** — The original scraper used `response.raise_for_status()` which threw a generic exception. This was replaced with an explicit `if response.status_code != 200` check that also captures the final URL after redirects, giving much clearer error messages.

### Key Architectural Decisions Made While Reviewing AI Output

**Scraper and scorer as separate modules** — The AI initially suggested putting scraping logic directly in `main.py`. I kept them as separate modules (`scraper.py`, `scorer.py`) so each can be tested in isolation, the cache lives in the scraper layer, and swapping the AI model in the scorer doesn't touch any other file.

**Claude as scorer, not rule engine** — An earlier iteration used a hand-coded heuristic scorer (`analyzer.py`). I replaced it with Claude because heuristic rules for AEO signals age quickly as answer engines evolve, while a well-prompted language model can reason about nuance (e.g. whether content actually *answers* a question, not just whether it contains question-formatted headings).

**TypedDict for scraper return type** — Using `TypedDict` for `ScrapeResult` rather than a Pydantic model keeps the scraper dependency-free from FastAPI internals, making it independently testable and reusable outside the web context.

**Cache only successful results** — The in-memory cache stores only successful scrapes. Error results are intentionally not cached so a transient failure (timeout, rate limit) doesn't lock out a URL for 10 minutes.
