"""
AEO Analyzer — FastAPI backend.

Run with:
    uvicorn main:app --reload --port 8000
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from scraper import scrape_url
from scorer import score_aeo

load_dotenv()

app = FastAPI(
    title="AEO Analyzer API",
    description="Analyse any URL for Answer Engine Optimisation (AEO) signals.",
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173")
# FastAPI CORS requires exact origin match; normalize common mistakes like trailing "/".
origins = [
    o.strip().rstrip("/")
    for o in _origins_raw.split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    url: HttpUrl


class DimensionScore(BaseModel):
    score: int
    max: int
    feedback: str


class AnalyzeResponse(BaseModel):
    url: str
    overall_score: int
    dimensions: dict[str, DimensionScore]
    recommendations: list[str]
    page_title: str
    meta_description: str
    headings: list[str]
    has_schema: bool
    schema_types: list[str]
    error: str | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    url_str = str(body.url)

    # Step 1 — scrape
    scraped = await scrape_url(url_str)

    if scraped["error"]:
        raise HTTPException(status_code=422, detail=scraped["error"])

    # Step 2 — score with Claude
    scored = await score_aeo(scraped)

    if scored.get("error"):
        raise HTTPException(status_code=502, detail=scored["error"])

    dimensions = {
        key: DimensionScore(
            score=val["score"],
            max=val["max"],
            feedback=val["feedback"],
        )
        for key, val in scored["dimensions"].items()
    }

    return AnalyzeResponse(
        url=url_str,
        overall_score=scored["overall_score"],
        dimensions=dimensions,
        recommendations=scored.get("recommendations", []),
        page_title=scraped["title"],
        meta_description=scraped["meta_description"],
        headings=scraped["headings"],
        has_schema=scraped["has_schema"],
        schema_types=scraped["schema_types"],
        error=None,
    )
