import re
import json
import logging
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from groq import Groq
from pydantic import BaseModel

from app.core.config import settings
from app.state.store import get_dataset, has_dataset
from app.simulation.simulator import (
    simulate_rule, get_dataset_stats,
    DEMO_RULES, DEMO_MAPPINGS,
)
from app.rule_engine.orchestrator import run_compliance_check
from app.violation_engine.orchestrator import run_violation_engine
from app.explainability_engine.explainer import attach_explanations

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Groq client
# ---------------------------------------------------------------------------

_groq_client = None

def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def _call_groq(prompt: str) -> str:
    response = _get_groq().chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=500,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    query: str
    session_id: str = "demo_session"


# ---------------------------------------------------------------------------
# Intent detection
# ---------------------------------------------------------------------------

def detect_intent(query: str) -> str:
    q = query.lower()
    # simulate must check before general keywords
    if any(k in q for k in ["what if", "impact", "simulate", "change threshold", "reduce limit", "increase limit"]):
        return "simulate"
    if any(k in q for k in ["should we", "recommend", "advise", "worth", "implement"]):
        return "recommend"
    # query must check before explain — "list", "top", "highest" are data queries not explanations
    if any(k in q for k in ["show", "list", "display", "top", "highest", "largest", "high risk", "how many", "count", "total", "international"]):
        return "query"
    if any(k in q for k in ["why", "explain", "reason", "flagged", "violation"]):
        return "explain"
    return "general"


# ---------------------------------------------------------------------------
# Rule extractor from natural language
# ---------------------------------------------------------------------------

def _extract_rule_from_query(query: str) -> str | None:
    """
    Tries to extract a rule string like 'transaction_amount > 500000'
    from a natural language query.
    """
    # Match patterns like "500000", "5 lakh", "5L", "10 lakh"
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|l\b)", query.lower())
    if lakh_match:
        value = float(lakh_match.group(1)) * 100_000
        return f"transaction_amount > {int(value)}"

    crore_match = re.search(r"(\d+(?:\.\d+)?)\s*crore", query.lower())
    if crore_match:
        value = float(crore_match.group(1)) * 10_000_000
        return f"transaction_amount > {int(value)}"

    # Match plain numbers
    num_match = re.search(r"\b(\d{4,})\b", query)
    if num_match:
        return f"transaction_amount > {num_match.group(1)}"

    return None


# ---------------------------------------------------------------------------
# Flow handlers
# ---------------------------------------------------------------------------

def _simulate_flow(query: str, df: pd.DataFrame) -> Dict[str, Any]:
    new_rule = _extract_rule_from_query(query)
    if not new_rule:
        return {
            "intent": "simulate",
            "response": "I couldn't extract a rule from your query. Try: 'What if transaction limit is 500000?'",
        }

    # Add new rule field to mappings if needed
    mappings = list(DEMO_MAPPINGS)
    result = simulate_rule(df, DEMO_RULES, new_rule, mappings)

    direction = "increase" if result["increase_percent"] >= 0 else "decrease"
    abs_pct   = abs(result["increase_percent"])

    response = (
        f"Simulation complete for rule: **{new_rule}**\n\n"
        f"- Current violations: {result['old_violations']}\n"
        f"- Violations after rule: {result['new_violations']}\n"
        f"- Change: {abs_pct}% {direction} in violations\n"
        f"- Newly flagged rows: {result['newly_flagged_rows']}\n"
        f"- Compliance rate: {result['old_compliance_rate']}% -> {result['new_compliance_rate']}%"
    )

    return {"intent": "simulate", "response": response, "data": result}


def _recommend_flow(query: str, df: pd.DataFrame) -> Dict[str, Any]:
    new_rule = _extract_rule_from_query(query)
    stats    = get_dataset_stats(df)

    if new_rule:
        mappings = list(DEMO_MAPPINGS)
        sim_result = simulate_rule(df, DEMO_RULES, new_rule, mappings)
    else:
        sim_result = {"old_violations": "N/A", "new_violations": "N/A", "increase_percent": "N/A"}

    prompt = f"""You are a senior financial compliance expert.

Dataset summary:
- Total transactions: {stats['total_rows']}
- Average transaction amount: ₹{stats['avg_amount']:,.0f}
- Maximum transaction: ₹{stats['max_amount']:,.0f}
- High KYC risk customers: {stats['high_risk_percent']}%
- International transactions: {stats['international_percent']}%
- Average previous flag count: {stats['avg_flag_count']}

Simulation results for proposed rule "{new_rule or 'unknown'}":
- Violations before: {sim_result['old_violations']}
- Violations after: {sim_result['new_violations']}
- Increase: {sim_result['increase_percent']}%

User query: {query}

Should this rule be implemented? Give:
1. Clear YES or NO recommendation
2. Reasoning in 2-3 sentences
3. Suggested better threshold if NO
Keep response concise and professional."""

    try:
        llm_response = _call_groq(prompt)
    except Exception as e:
        logger.error(f"Groq call failed: {e}")
        llm_response = "LLM recommendation unavailable. Please check your Groq API key."

    return {
        "intent": "recommend",
        "response": llm_response,
        "data": {"simulation": sim_result, "stats": stats},
    }


def _explain_flow(query: str, df: pd.DataFrame) -> Dict[str, Any]:
    dataset = {
        "dataset_id": "demo_session",
        "columns": df.columns.tolist(),
        "rows": df.head(100).to_dict(orient="records"),
    }
    result   = run_compliance_check(dataset, DEMO_RULES, DEMO_MAPPINGS)
    enriched = run_violation_engine(result)
    enriched = attach_explanations(enriched)

    # Specific row query
    row_match = re.search(r"\b(?:row|#|index|transaction)?\s*(\d+)\b", query.lower())
    if row_match:
        row_idx  = int(row_match.group(1))
        matching = [v for v in enriched if v.row_index == row_idx]
        if not matching:
            return {"intent": "explain", "response": f"Transaction at row #{row_idx} has no violations under current rules — it is compliant."}

        v      = matching[0]
        row    = df.iloc[row_idx] if row_idx < len(df) else None
        amount = f"Rs.{row['transaction_amount']:,.0f}" if row is not None and "transaction_amount" in df.columns else "unknown"
        kyc    = row.get("kyc_risk_level", "unknown") if row is not None else "unknown"
        flags  = row.get("previous_flag_count", 0) if row is not None else 0

        prompt = f"""You are a compliance analyst. Explain in plain English why this transaction was flagged.

Transaction details:
- Amount: {amount}
- KYC risk level: {kyc}
- Previous flags: {flags}
- Rule violated: {v.rule}
- Severity: {v.severity}

Write 2-3 clear sentences explaining why this is a compliance concern. Be specific about the amounts and risk factors."""
        try:
            explanation = _call_groq(prompt)
        except Exception:
            explanation = v.explanation

        return {
            "intent": "explain",
            "response": f"Transaction #{row_idx} — Severity: {v.severity.upper()}\n\n{explanation}",
        }

    # General — explain top violations naturally
    if not enriched:
        return {"intent": "explain", "response": "No violations found under current rules."}

    high   = [v for v in enriched if v.severity == "high"]
    sample = (high[:5] if high else enriched[:5])

    # Build context for Groq
    violation_context = []
    for v in sample:
        row = df.iloc[v.row_index] if v.row_index < len(df) else None
        amount = f"Rs.{row['transaction_amount']:,.0f}" if row is not None and "transaction_amount" in df.columns else "unknown"
        kyc    = row.get("kyc_risk_level", "N/A") if row is not None else "N/A"
        flags  = row.get("previous_flag_count", 0) if row is not None else 0
        violation_context.append(f"- Row {v.row_index}: amount={amount}, KYC={kyc}, flags={flags}, rule='{v.rule}'")

    prompt = f"""You are a compliance analyst. Summarize why these transactions are flagged as violations.

Violations:
{chr(10).join(violation_context)}

Total violations in dataset: {len(enriched)}
User query: {query}

Provide a clear 3-4 sentence summary explaining the main compliance concerns. Mention specific amounts and risk patterns."""

    try:
        response = _call_groq(prompt)
    except Exception:
        lines    = [f"- Row #{v.row_index}: {v.explanation}" for v in sample]
        response = f"Found {len(enriched)} violations. Top issues:\n\n" + "\n".join(lines)

    return {"intent": "explain", "response": response}


def _query_flow(query: str, df: pd.DataFrame) -> Dict[str, Any]:
    q = query.lower()

    # Extract N from "top 5", "top 10" etc.
    top_n = 5
    top_match = re.search(r"top\s*(\d+)", q)
    if top_match:
        top_n = int(top_match.group(1))

    # Top N highest risk / highest amount transactions
    if any(k in q for k in ["highest risk", "highest amount", "largest", "top"]) and "transaction_amount" in df.columns:
        sorted_df = df.sort_values("transaction_amount", ascending=False).head(top_n)
        lines = []
        for i, (_, row) in enumerate(sorted_df.iterrows(), 1):
            amount = row["transaction_amount"]
            kyc    = row.get("kyc_risk_level", "unknown")
            flags  = row.get("previous_flag_count", 0)
            intl   = "international" if row.get("is_international") else "domestic"
            cust   = row.get("customer_id", "unknown")
            txn_id = row.get("transaction_id", f"Row {i}")

            # Build reason string
            reasons = []
            if amount > 1_000_000:
                reasons.append(f"amount Rs.{amount:,.0f} exceeds Rs.10,00,000 threshold")
            else:
                reasons.append(f"amount Rs.{amount:,.0f}")
            if kyc == "high":
                reasons.append("high KYC risk")
            if flags > 0:
                reasons.append(f"{flags} previous flag(s)")
            if intl == "international":
                reasons.append("international transaction")

            reason_str = " | ".join(reasons)
            lines.append(f"{i}. {txn_id} (Customer: {cust}) — {reason_str}")

        response = f"Top {top_n} highest-amount transactions:\n\n" + "\n".join(lines)
        return {"intent": "query", "response": response}

    if "high risk" in q or "kyc" in q:
        if "kyc_risk_level" in df.columns:
            filtered = df[df["kyc_risk_level"] == "high"].sort_values("transaction_amount", ascending=False)
            sample   = filtered.head(top_n)
            lines = []
            for i, (_, row) in enumerate(sample.iterrows(), 1):
                txn_id = row.get("transaction_id", f"Row {i}")
                amount = row["transaction_amount"]
                flags  = row.get("previous_flag_count", 0)
                intl   = "international" if row.get("is_international") else "domestic"
                lines.append(f"{i}. {txn_id} — Rs.{amount:,.0f} | {intl} | {flags} prior flag(s)")
            response = (
                f"Found {len(filtered)} high KYC risk transactions. Top {min(top_n, len(filtered))} by amount:\n\n"
                + "\n".join(lines)
            )
            return {"intent": "query", "response": response}

    if "international" in q:
        if "is_international" in df.columns:
            filtered = df[df["is_international"] == True].sort_values("transaction_amount", ascending=False)
            sample   = filtered.head(top_n)
            lines = []
            for i, (_, row) in enumerate(sample.iterrows(), 1):
                txn_id  = row.get("transaction_id", f"Row {i}")
                amount  = row["transaction_amount"]
                country = row.get("country", "unknown")
                kyc     = row.get("kyc_risk_level", "unknown")
                lines.append(f"{i}. {txn_id} — Rs.{amount:,.0f} | Country: {country} | KYC: {kyc}")
            response = (
                f"Found {len(filtered)} international transactions ({round(len(filtered)/len(df)*100,1)}% of total). "
                f"Top {min(top_n, len(filtered))} by amount:\n\n" + "\n".join(lines)
            )
            return {"intent": "query", "response": response}

    if any(k in q for k in ["large", "above", "over"]):
        threshold = 1_000_000
        num = re.search(r"\b(\d{4,})\b", query)
        if num:
            threshold = int(num.group(1))
        if "transaction_amount" in df.columns:
            filtered = df[df["transaction_amount"] > threshold].sort_values("transaction_amount", ascending=False)
            return {
                "intent": "query",
                "response": f"Found {len(filtered)} transactions above Rs.{threshold:,}. Highest: Rs.{filtered.iloc[0]['transaction_amount']:,.0f}" if len(filtered) > 0 else f"No transactions above Rs.{threshold:,}.",
            }

    if any(k in q for k in ["how many", "count", "total"]):
        stats = get_dataset_stats(df)
        return {
            "intent": "query",
            "response": (
                f"Dataset summary:\n"
                f"- Total transactions: {stats['total_rows']}\n"
                f"- Avg amount: Rs.{stats['avg_amount']:,.0f}\n"
                f"- Max amount: Rs.{stats['max_amount']:,.0f}\n"
                f"- High KYC risk: {stats['high_risk_percent']}%\n"
                f"- International: {stats['international_percent']}%"
            ),
        }

    # Fallback
    stats = get_dataset_stats(df)
    return {
        "intent": "query",
        "response": (
            f"Dataset overview:\n"
            f"- {stats['total_rows']} transactions loaded\n"
            f"- Avg amount: Rs.{stats['avg_amount']:,.0f}\n"
            f"- High KYC risk: {stats['high_risk_percent']}%"
        ),
    }


def _general_flow(query: str, df: pd.DataFrame) -> Dict[str, Any]:
    stats = get_dataset_stats(df)
    prompt = f"""You are an AI compliance assistant for a banking transaction monitoring system.

Dataset context:
- {stats['total_rows']} transactions loaded
- Average amount: ₹{stats['avg_amount']:,.0f}
- High risk customers: {stats['high_risk_percent']}%

User asked: {query}

Answer concisely in 2-3 sentences. Focus on compliance and risk context."""

    try:
        response = _call_groq(prompt)
    except Exception as e:
        logger.error(f"Groq call failed: {e}")
        response = (
            "I can help you with:\n"
            "- Explaining violations (ask 'why is row X flagged?')\n"
            "- Simulating rule changes (ask 'what if limit is 500000?')\n"
            "- Querying data (ask 'show high risk transactions')\n"
            "- Recommendations (ask 'should we implement this rule?')"
        )

    return {"intent": "general", "response": response}


# ---------------------------------------------------------------------------
# Main endpoint
# ---------------------------------------------------------------------------

@router.post("/query")
async def chat_query(request: ChatRequest):
    session_id = request.session_id
    query      = request.query.strip()

    if not query:
        return {"intent": "error", "response": "Please enter a query."}

    if not has_dataset(session_id):
        return {
            "intent": "error",
            "response": "No dataset loaded. Using demo session — please restart the server.",
        }

    df     = get_dataset(session_id)
    intent = detect_intent(query)

    handler_map = {
        "simulate":  _simulate_flow,
        "recommend": _recommend_flow,
        "explain":   _explain_flow,
        "query":     _query_flow,
        "general":   _general_flow,
    }

    handler = handler_map.get(intent, _general_flow)

    try:
        result = await run_in_threadpool(handler, query, df)
        return result
    except Exception as e:
        logger.error(f"Chat handler error: {e}")
        return {"intent": "error", "response": f"Something went wrong: {str(e)}"}


# ---------------------------------------------------------------------------
# Predefined queries endpoint (for frontend buttons)
# ---------------------------------------------------------------------------

@router.get("/suggestions")
def get_suggestions():
    return {
        "suggestions": [
            {"label": "📊 Dataset Overview",          "query": "How many transactions are in the dataset?"},
            {"label": "🔴 Show High Risk",             "query": "Show high risk transactions"},
            {"label": "🌍 International Transactions", "query": "Show international transactions"},
            {"label": "⚠️ Explain Violations",         "query": "Why are transactions being flagged?"},
            {"label": "🔬 Simulate 5 Lakh Limit",      "query": "What if transaction limit is 5 lakh?"},
            {"label": "🔬 Simulate 10 Lakh Limit",     "query": "What if transaction limit is 10 lakh?"},
            {"label": "💡 Recommend Rule",             "query": "Should we implement a 5 lakh transaction limit?"},
        ]
    }
