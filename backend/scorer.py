"""
scorer.py — Claude-powered AEO scorer.

Calls the Anthropic Claude API with scraped page content and returns
a structured AEO score with per-dimension feedback and recommendations.
"""

import json
import os
import re

import anthropic

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 1000

SYSTEM_PROMPT = """You are an expert in Answer Engine Optimization (AEO) — the practice of \
optimising web content to be cited and surfaced by AI answer engines such as ChatGPT, \
Perplexity, Google SGE, and Bing Copilot.

Your task is to evaluate a web page based on the scraped content provided and return a \
precise, evidence-based AEO score.

You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no commentary \
before or after. Any non-JSON output will cause a parsing failure."""

USER_TEMPLATE = """Evaluate the following scraped web page content for AEO quality.

--- SCRAPED CONTENT ---
Title: {title}

Meta Description: {meta_description}

Headings:
{headings}

Body Text (first 3000 chars):
{body_text}

Schema Markup Present: {has_schema}
Schema Types Found: {schema_types}
-----------------------

Return ONLY this JSON structure (no markdown, no extra text):
{{
  "overall_score": <integer 0-100>,
  "dimensions": {{
    "content_clarity":    {{ "score": <integer 0-20>, "max": 20, "feedback": "<string>" }},
    "structured_data":    {{ "score": <integer 0-20>, "max": 20, "feedback": "<string>" }},
    "topical_authority":  {{ "score": <integer 0-15>, "max": 15, "feedback": "<string>" }},
    "answer_readiness":   {{ "score": <integer 0-20>, "max": 20, "feedback": "<string>" }},
    "entity_clarity":     {{ "score": <integer 0-15>, "max": 15, "feedback": "<string>" }},
    "freshness_signals":  {{ "score": <integer 0-10>, "max": 10, "feedback": "<string>" }}
  }},
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}}"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_user_message(scraped: dict) -> str:
    headings = scraped.get("headings") or []
    headings_text = (
        "\n".join(f"  - {h}" for h in headings) if headings else "  (none found)"
    )
    schema_types = scraped.get("schema_types") or []
    return USER_TEMPLATE.format(
        title=scraped.get("title") or "(none)",
        meta_description=scraped.get("meta_description") or "(none)",
        headings=headings_text,
        body_text=scraped.get("body_text") or "(none)",
        has_schema=str(scraped.get("has_schema", False)),
        schema_types=", ".join(schema_types) if schema_types else "(none)",
    )


def _parse_response(raw: str) -> dict:
    """
    Extract and parse the JSON object from Claude's response.
    Handles cases where the model accidentally wraps output in markdown fences.
    """
    text = raw.strip()

    # Strip optional markdown code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        # Find the outermost { ... } block
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]

    return json.loads(text)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def score_aeo(scraped: dict) -> dict:
    """
    Call the Claude API with *scraped* page content and return a structured
    AEO score dict.

    The returned dict always has the shape::

        {
            "overall_score": int,
            "dimensions": {
                "content_clarity":   {"score": int, "max": 20, "feedback": str},
                "structured_data":   {"score": int, "max": 20, "feedback": str},
                "topical_authority": {"score": int, "max": 15, "feedback": str},
                "answer_readiness":  {"score": int, "max": 20, "feedback": str},
                "entity_clarity":    {"score": int, "max": 15, "feedback": str},
                "freshness_signals": {"score": int, "max": 10, "feedback": str},
            },
            "recommendations": [str, str, str],
            "error": None  # or an error message string
        }
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return _error_result("ANTHROPIC_API_KEY environment variable is not set.")

    user_message = _build_user_message(scraped)

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.AuthenticationError:
        return _error_result("Invalid Anthropic API key.")
    except anthropic.RateLimitError:
        return _error_result("Anthropic rate limit reached. Please try again shortly.")
    except anthropic.APIStatusError as exc:
        return _error_result(f"Anthropic API error {exc.status_code}: {exc.message}")
    except Exception as exc:
        return _error_result(f"Unexpected error calling Claude: {exc}")

    raw_text = message.content[0].text if message.content else ""

    try:
        result = _parse_response(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        return _error_result(
            f"Failed to parse Claude's response as JSON: {exc}. "
            f"Raw response: {raw_text[:300]}"
        )

    result.setdefault("error", None)
    return result


def _error_result(message: str) -> dict:
    return {
        "overall_score": 0,
        "dimensions": {
            "content_clarity":   {"score": 0, "max": 20, "feedback": ""},
            "structured_data":   {"score": 0, "max": 20, "feedback": ""},
            "topical_authority": {"score": 0, "max": 15, "feedback": ""},
            "answer_readiness":  {"score": 0, "max": 20, "feedback": ""},
            "entity_clarity":    {"score": 0, "max": 15, "feedback": ""},
            "freshness_signals": {"score": 0, "max": 10, "feedback": ""},
        },
        "recommendations": [],
        "error": message,
    }
