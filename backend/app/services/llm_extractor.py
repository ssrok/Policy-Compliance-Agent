import json
import logging
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy client — initialized on first use so startup doesn't fail if key is missing
_client = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

SYSTEM_PROMPT = """You are a compliance rule extraction engine.
Given a policy clause, extract a structured rule in JSON.
Return ONLY valid JSON with these exact keys:
{
  "entity":   string or null,   // what the rule applies to (e.g. "transaction", "user")
  "field":    string or null,   // the specific field/attribute (e.g. "amount", "age")
  "operator": string or null,   // comparison operator: ">", "<", ">=", "<=", "==", "!="
  "value":    number or null,   // the threshold/numeric value
  "action":   string or null    // what must happen (e.g. "report", "flag", "block", "notify")
}
If a field cannot be determined from the clause, set it to null.
Do NOT include any explanation or markdown — only the JSON object."""

def extract_rule_from_clause(clause: str) -> dict:
    """
    Sends a single clause to OpenAI GPT and returns a structured rule dict.
    Returns a dict with all null fields if extraction fails.
    """
    try:
        response = _get_client().chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Extract rule from: \"{clause}\""}
            ],
            temperature=0,        # deterministic output
            max_tokens=200,
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
        parsed["source_clause"] = clause
        return parsed

    except json.JSONDecodeError:
        logger.warning(f"LLM returned non-JSON for clause: {clause[:80]}")
        return _empty_rule(clause)
    except Exception as e:
        logger.error(f"LLM extraction failed: {str(e)}")
        return _empty_rule(clause)


def extract_rules_from_clauses(clauses: list[str]) -> list[dict]:
    """
    Runs LLM extraction on all clauses.
    Skips clauses that produce fully-null rules (no useful info extracted).
    """
    results = []
    for clause in clauses:
        rule = extract_rule_from_clause(clause)
        # Only keep rules where at least one meaningful field was extracted
        if any(rule.get(k) is not None for k in ["entity", "field", "operator", "value", "action"]):
            results.append(rule)
        else:
            logger.info(f"Skipping clause with no extractable rule: {clause[:60]}")
    logger.info(f"Extracted {len(results)} rules from {len(clauses)} clauses")
    return results


def _empty_rule(clause: str) -> dict:
    return {
        "entity": None, "field": None, "operator": None,
        "value": None, "action": None, "source_clause": clause
    }
