import os
import re
import json
import uuid
import logging
from typing import List, Optional

import numpy as np
import pandas as pd
from groq import Groq
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.services.dataset_ingestion_service import get_current_df
from app.ai.embedding_service import get_embedding, get_batch_embeddings

logger = logging.getLogger(__name__)

# ── OpenAI client ─────────────────────────────────────────────────────────────
_client = None

def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


# ── Dataset loading (DB-first, _current_df fallback) ─────────────────────────

def _load_df(dataset_id: Optional[str] = None, db=None) -> Optional[pd.DataFrame]:
    """
    Load DataFrame by priority:
      1. DB lookup via dataset_id  (persistent, multi-user safe)
      2. _current_df fallback      (single-user in-memory)
    """
    if dataset_id and db:
        from app.services.dataset_ingestion_service import get_dataset_by_id, df_from_dataset
        row = get_dataset_by_id(dataset_id, db)
        if row is not None:
            return df_from_dataset(row)
    return get_current_df()


# ── FAISS-based RAG (per-policy, persisted to disk) ──────────────────────────
# Falls back to in-memory sklearn cosine similarity when faiss is unavailable.

_clauses: List[str] = []
_clause_embeddings: List[List[float]] = []


def _safe_policy_id(policy_id: str) -> str:
    """Strip path separators and dots to prevent path traversal via policy_id."""
    import re as _re
    return _re.sub(r"[^\w\-]", "_", policy_id)[:128]


def store_clauses(clauses: List[str], policy_id: Optional[str] = None) -> None:
    """
    Store clauses in memory AND persist FAISS index to disk when policy_id given.
    Falls back gracefully if faiss is not installed.
    """
    global _clauses, _clause_embeddings
    _clauses = clauses
    _clause_embeddings = get_batch_embeddings(clauses) if clauses else []
    logger.info(f"RAG store updated with {len(_clauses)} clauses")

    if policy_id and _clause_embeddings:
        try:
            import faiss
            safe_id    = _safe_policy_id(policy_id)
            dim        = len(_clause_embeddings[0])
            index      = faiss.IndexFlatL2(dim)
            index.add(np.array(_clause_embeddings, dtype="float32"))
            index_path = os.path.join(settings.RAG_INDEX_DIR, f"{safe_id}.index")
            meta_path  = os.path.join(settings.RAG_INDEX_DIR, f"{safe_id}.json")
            faiss.write_index(index, index_path)
            with open(meta_path, "w") as f:
                json.dump(clauses, f)
            logger.info(f"FAISS index saved for policy_id={safe_id}")
        except ImportError:
            logger.warning("faiss not installed — skipping disk persistence")
        except Exception as e:
            logger.error(f"FAISS save failed: {e}")


def retrieve(query: str, k: int = 2, policy_id: Optional[str] = None) -> List[str]:
    """
    Retrieve top-k clauses.
    Tries FAISS index from disk first (if policy_id given), falls back to in-memory.
    """
    if policy_id:
        safe_id    = _safe_policy_id(policy_id)
        index_path = os.path.join(settings.RAG_INDEX_DIR, f"{safe_id}.index")
        meta_path  = os.path.join(settings.RAG_INDEX_DIR, f"{safe_id}.json")
        if os.path.exists(index_path) and os.path.exists(meta_path):
            try:
                import faiss
                index   = faiss.read_index(index_path)
                with open(meta_path) as f:
                    clauses = json.load(f)
                q_vec = np.array(get_embedding(query), dtype="float32").reshape(1, -1)
                _, indices = index.search(q_vec, k)
                return [clauses[i] for i in indices[0] if i < len(clauses)]
            except Exception as e:
                logger.warning(f"FAISS retrieval failed, falling back: {e}")

    # In-memory fallback
    if not _clauses or not _clause_embeddings:
        return []
    q_vec      = np.array(get_embedding(query)).reshape(1, -1)
    corpus     = np.array(_clause_embeddings)
    scores     = cosine_similarity(q_vec, corpus)[0]
    top_idx    = scores.argsort()[::-1][:k]
    return [_clauses[i] for i in top_idx]


# ── ChatSession helpers ───────────────────────────────────────────────────────

def create_chat_session(db, dataset_id: Optional[str], policy_id: Optional[str]) -> str:
    from app.models.chat_session import ChatSession
    session = ChatSession(
        session_id = str(uuid.uuid4()),
        dataset_id = dataset_id,
        policy_id  = policy_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session.session_id


def get_chat_session(db, session_id: str):
    from app.models.chat_session import ChatSession
    return db.query(ChatSession).filter(ChatSession.session_id == session_id).first()


# ── SimulationResult persistence ──────────────────────────────────────────────

def _save_simulation(db, result: dict, dataset_id: Optional[str], policy_id: Optional[str]) -> None:
    if db is None:
        return
    try:
        from app.models.simulation_result import SimulationResult
        row = SimulationResult(
            simulation_id  = str(uuid.uuid4()),
            dataset_id     = dataset_id,
            policy_id      = policy_id,
            column_used    = result.get("column_used"),
            old_threshold  = result.get("old_threshold"),
            new_threshold  = result.get("new_threshold"),
            old_violations = result.get("old_violations"),
            new_violations = result.get("new_violations"),
            difference     = result.get("difference"),
        )
        db.add(row)
        db.commit()
    except Exception as e:
        logger.error(f"SimulationResult save failed: {e}")


# ── Main chat handler ─────────────────────────────────────────────────────────

def handle_chat(
    query: str,
    dataset_id: Optional[str] = None,
    session_id: Optional[str] = None,
    policy_id:  Optional[str] = None,
    db=None,
) -> dict:
    # Resolve dataset_id + policy_id from session when provided
    if session_id and db:
        session = get_chat_session(db, session_id)
        if session:
            dataset_id = dataset_id or session.dataset_id
            policy_id  = policy_id  or session.policy_id

    intent = detect_intent(query)
    print(f"Detected intent: {intent}")
    df = _load_df(dataset_id, db)
    print("Chat received dataset:", df is not None)

    if intent == "simulation":
        raw_data = simulate_policy_change(query, df=df)
        _save_simulation(db, raw_data, dataset_id, policy_id)
    elif intent == "analytics":
        raw_data = generate_analytics(df=df)
    elif intent == "fix":
        raw_data = generate_fix_suggestion(query, df=df)
    elif intent == "policy_generation":
        raw_data = generate_policy(query, df=df)
    else:
        raw_data = explain_query(query, df=df)

    advisor_response = generate_advisor_response(
        context=raw_data, query=query, intent=intent, df=df, policy_id=policy_id
    )
    return {"intent": intent, "data": advisor_response, "raw": raw_data}


# ── Intent handlers (all accept optional df) ─────────────────────────────────

def _resolve_col(df: pd.DataFrame) -> Optional[str]:
    if "amount" in df.columns:
        return "amount"
    numeric = df.select_dtypes(include="number").columns.tolist()
    return numeric[0] if numeric else None


def simulate_policy_change(query: str, df: Optional[pd.DataFrame] = None) -> dict:
    if df is None:
        df = get_current_df()
    match = re.search(r"\d+(?:\.\d+)?", query)
    if not match:
        return {"type": "simulation", "message": "No numeric threshold found. Example: 'what if threshold is 5000'"}
    new_threshold = float(match.group())
    if df is None:
        return {"type": "simulation", "message": "No dataset loaded. Please upload a dataset first."}
    col = _resolve_col(df)
    if not col:
        return {"type": "simulation", "message": "No numeric column found in dataset."}
    df = df.dropna(subset=[col])
    old_threshold  = 1000
    old_violations = int((df[col] > old_threshold).sum())
    new_violations = int((df[col] > new_threshold).sum())
    return {
        "type": "simulation", "column_used": col,
        "old_threshold": old_threshold, "new_threshold": new_threshold,
        "old_violations": old_violations, "new_violations": new_violations,
        "difference": new_violations - old_violations, "message": "Simulation completed",
    }


def generate_analytics(df: Optional[pd.DataFrame] = None) -> dict:
    if df is None:
        df = get_current_df()
    if df is None:
        return {"type": "analytics", "message": "No dataset available"}
    col = _resolve_col(df)
    if not col:
        return {"type": "analytics", "message": "No numeric column found in dataset."}
    df = df.dropna(subset=[col])
    total_rows       = len(df)
    total_violations = int((df[col] > 1000).sum())
    compliance_rate  = round(((total_rows - total_violations) / total_rows) * 100, 2) if total_rows else 0.0
    violation_rate   = 100 - compliance_rate
    risk_level = "high" if violation_rate > 50 else "medium" if violation_rate > 20 else "low"
    return {
        "type": "analytics", "total_rows": total_rows,
        "total_violations": total_violations, "compliance_rate": compliance_rate,
        "risk_level": risk_level, "message": "Analytics generated",
    }


def generate_fix_suggestion(query: str, df: Optional[pd.DataFrame] = None) -> dict:
    if df is None:
        df = get_current_df()
    if df is None:
        return {"type": "fix", "message": "No dataset available"}
    col = _resolve_col(df)
    if not col:
        return {"type": "fix", "message": "No numeric column found in dataset."}
    df = df.dropna(subset=[col])
    violations       = df[df[col] > 1000]
    total_violations = len(violations)
    sample_values    = [round(float(v), 2) for v in violations[col].head(3).tolist()]
    return {
        "type": "fix", "total_violations": total_violations, "sample_values": sample_values,
        "suggestions": [
            "Reduce transaction amount below threshold",
            "Split large transactions into smaller ones",
            "Verify if high-value transactions are valid",
            "Adjust policy threshold if too strict",
        ],
        "message": "Fix suggestions generated",
    }


def generate_policy(query: str, df: Optional[pd.DataFrame] = None) -> dict:
    if df is None:
        df = get_current_df()
    if df is None:
        return {"type": "policy_generation", "message": "No dataset available"}
    col = _resolve_col(df)
    if not col:
        return {"type": "policy_generation", "message": "No numeric column found in dataset."}
    df        = df.dropna(subset=[col])
    mean      = round(float(df[col].mean()),   2)
    median    = round(float(df[col].median()), 2)
    max_      = round(float(df[col].max()),    2)
    threshold = round(median * 1.5, 2)
    return {
        "type": "policy_generation",
        "suggested_rule": f"{col} > {threshold}",
        "based_on": {"mean": mean, "median": median, "max": max_},
        "message": "Policy suggestion generated",
    }


def explain_query(query: str, df: Optional[pd.DataFrame] = None) -> dict:
    if df is None:
        df = get_current_df()
    if df is None:
        return {"type": "explanation", "message": "No dataset available. Please upload a dataset first."}
    col = _resolve_col(df)
    if not col:
        return {"type": "explanation", "message": "No numeric column found in dataset."}
    df               = df.dropna(subset=[col])
    threshold        = 1000
    total_violations = int((df[col] > threshold).sum())
    total_rows       = len(df)
    return {
        "type": "explanation", "threshold": threshold,
        "total_violations": total_violations, "total_rows": total_rows,
        "explanation": (
            f"Transactions are flagged because their values exceed the threshold of {threshold}. "
            f"{total_violations} out of {total_rows} transactions in the dataset violate this rule."
        ),
    }


# ── Dataset context builder ───────────────────────────────────────────────────

def build_dataset_context(df) -> str:
    try:
        total_rows   = len(df)
        all_cols     = df.columns.tolist()
        numeric_cols = df.select_dtypes(include="number").columns.tolist()[:2]
        stats_lines  = []
        for col in numeric_cols:
            s = df[col].dropna()
            stats_lines.append(
                f"  - {col}: mean={round(float(s.mean()),2)}, "
                f"median={round(float(s.median()),2)}, max={round(float(s.max()),2)}"
            )
        threshold     = 1000
        first_col     = numeric_cols[0] if numeric_cols else None
        violations    = int((df[first_col].dropna() > threshold).sum()) if first_col else 0
        compliance_rate = round(((total_rows - violations) / total_rows) * 100, 2) if total_rows else 0.0
        top_values    = (
            [round(float(v), 2) for v in df[df[first_col] > threshold][first_col].head(3).tolist()]
            if first_col else []
        )
        top_line = f"- Top Violating Values ({first_col}): {top_values}\n" if top_values else ""
        return (
            f"Dataset Overview:\n"
            f"- Total Rows: {total_rows}\n"
            f"- Columns: {', '.join(all_cols)}\n"
            f"- Numeric Columns: {', '.join(numeric_cols)}\n\n"
            f"Key Statistics:\n" + "\n".join(stats_lines) + "\n\n"
            f"Violation Summary:\n"
            f"- Total Violations: {violations}\n"
            f"- Compliance Rate: {compliance_rate}%\n"
            + top_line
        )
    except Exception:
        return ""


# ── Prompt + advisor ──────────────────────────────────────────────────────────

_INTENT_FIELDS = {
    "simulation":        ["explanation", "impact_analysis", "business_insight", "recommendation", "risk_level"],
    "analytics":         ["explanation", "risk_level"],
    "explanation":       ["explanation", "recommendation"],
    "fix":               ["explanation", "recommendation"],
    "policy_generation": ["explanation", "business_insight", "recommendation"],
}


def _build_prompt(context: dict, query: str, intent: str, dataset_context: str = "") -> str:
    dataset_section = f"Dataset context:\n{dataset_context}\n\n" if dataset_context else ""
    return f"""You are a senior compliance expert advising a business team.
Speak like a knowledgeable colleague — clear, direct, and confident.
Avoid phrases like "based on the dataset", "according to the data", or "it appears that".
Never start a sentence with "Based on". Reference numbers naturally, as an expert would in conversation.

User asked:
{query}

Intent: {intent}

{dataset_section}Available computed data:
{json.dumps(context, indent=2)}

Guidelines:
- explanation → explain the root cause clearly, mention the specific threshold and violation count
- analytics → give a sharp summary of risk and compliance health
- simulation → describe what changes and by how much, and whether that's a good trade-off
- policy_generation → recommend a concrete rule with reasoning
- fix → give specific, actionable steps referencing the actual violations

Respond in JSON. Only include fields that add real value for this intent:
{{
  "explanation": "...",
  "impact_analysis": "... (simulation only)",
  "business_insight": "... (simulation or policy_generation only)",
  "recommendation": "...",
  "risk_level": "low / medium / high"
}}

Rules:
- No generic filler sentences
- No hallucinated numbers — only use values from the context above
- Keep each field to 1–2 sentences maximum
- Sound like a human expert, not a report generator
"""


def generate_advisor_response(
    context: dict,
    query: str,
    intent: str = "simulation",
    df: Optional[pd.DataFrame] = None,
    policy_id: Optional[str] = None,
) -> dict:
    if df is None:
        df = get_current_df()
    dataset_context = build_dataset_context(df) if df is not None else ""

    try:
        prompt = _build_prompt(context, query, intent, dataset_context)
        response = _get_client().chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": "You are a compliance AI advisor."},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        if "{" in raw:
            raw = raw[raw.find("{") : raw.rfind("}") + 1]
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"Advisor LLM returned non-JSON: {e}")
        return _build_fallback(context, query, intent, policy_id)
    except Exception as e:
        logger.error(f"Advisor LLM call failed: {e}")
        return _build_fallback(context, query, intent, policy_id)


def _build_fallback(
    context: dict,
    query: str,
    intent: str = "simulation",
    policy_id: Optional[str] = None,
) -> dict:
    retrieved        = retrieve(query, k=2, policy_id=policy_id)
    threshold        = context.get("threshold") or context.get("old_threshold")
    new_threshold    = context.get("new_threshold")
    total_violations = context.get("total_violations") or context.get("old_violations")
    new_violations   = context.get("new_violations")
    total_rows       = context.get("total_rows")
    compliance_rate  = context.get("compliance_rate")
    risk_level       = context.get("risk_level")
    col              = context.get("column_used", "the numeric column")
    suggested_rule   = context.get("suggested_rule")

    if intent == "explanation":
        if threshold is not None and total_violations is not None and total_rows is not None:
            explanation = (
                f"{total_violations} of {total_rows} transactions exceed the {threshold} threshold on '{col}' — "
                f"that's what's triggering the flags."
            )
        elif retrieved:
            explanation = retrieved[0] + (f" {retrieved[1]}" if len(retrieved) > 1 else "")
        else:
            explanation = "Upload a dataset to get a specific explanation."

    elif intent == "simulation":
        if threshold is not None and new_threshold is not None and total_violations is not None and new_violations is not None:
            diff      = (new_violations or 0) - (total_violations or 0)
            direction = "rises" if diff > 0 else "drops"
            explanation = (
                f"Moving the threshold on '{col}' from {threshold} to {new_threshold} "
                f"{direction} violations from {total_violations} to {new_violations} ({abs(diff):+d})."
            )
        else:
            explanation = "Threshold or violation data is missing — run a dataset upload first."

    elif intent == "analytics":
        if compliance_rate is not None and total_violations is not None and total_rows is not None:
            explanation = (
                f"{total_violations} out of {total_rows} records are non-compliant — "
                f"giving a compliance rate of {compliance_rate}%."
            )
        else:
            explanation = "No dataset metrics available yet — upload a dataset to see analytics."

    elif intent == "fix":
        explanation = (
            f"There are {total_violations} violations in '{col}'. "
            f"Start by reviewing those records and deciding whether to cap values or raise the threshold."
            if total_violations is not None else
            "Upload a dataset so I can identify which records need fixing."
        )

    elif intent == "policy_generation":
        explanation = (
            f"A good starting rule would be: {suggested_rule}. It's derived from the actual distribution of your data."
            if suggested_rule else
            "Upload a dataset so I can suggest a rule grounded in your actual numbers."
        )

    else:
        explanation = retrieved[0] if retrieved else "No context available to answer this specifically right now."

    result: dict = {"explanation": explanation}
    if intent in ("simulation", "analytics"):
        result["risk_level"] = risk_level if risk_level else (
            "high" if (total_violations or 0) > (total_rows or 1) * 0.5 else "medium"
        )
    if intent in ("simulation", "fix", "policy_generation"):
        result["recommendation"] = (
            f"Try tightening the threshold on '{col}' and monitor how violation counts shift."
            if threshold is not None else
            "Review your threshold values against the current data distribution."
        )
    if intent in ("simulation", "policy_generation"):
        result["business_insight"] = (
            "A tighter threshold catches more risk, but expect more false positives — find the right balance for your team."
        )
    if intent == "simulation" and total_violations is not None and new_violations is not None:
        result["impact_analysis"] = (
            f"At {threshold}, you had {total_violations} violations. "
            f"At {new_threshold}, that becomes {new_violations}."
        )
    return result


# ── Intent detection ──────────────────────────────────────────────────────────

def detect_intent(query: str) -> str:
    normalized = query.strip().lower()
    if any(kw in normalized for kw in ("why", "reason", "flagged")):
        return "explanation"
    if any(kw in normalized for kw in ("fix", "resolve", "correct")):
        return "fix"
    if any(kw in normalized for kw in ("what if", "change", "threshold")):
        return "simulation"
    if any(kw in normalized for kw in ("insight", "summary", "analysis", "trend")):
        return "analytics"
    if any(kw in normalized for kw in ("suggest policy", "new rule", "recommend policy")):
        return "policy_generation"
    return "explanation"
