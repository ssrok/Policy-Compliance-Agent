import re
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field alias map — maps natural language terms to canonical field names
# that the rule engine and schema mapper understand
# ---------------------------------------------------------------------------
_FIELD_ALIASES: dict[str, str] = {
    # amount variants
    "amount": "amount", "transaction amount": "amount", "txn amount": "amount",
    "transaction value": "amount", "value": "amount", "sum": "amount",
    "total": "amount", "payment": "amount", "transfer amount": "amount",
    # age variants
    "age": "age", "user age": "age", "customer age": "age",
    # status variants
    "status": "status", "transaction status": "status", "account status": "status",
    "state": "status",
    # date variants
    "date": "transaction_date", "transaction date": "transaction_date",
    "txn date": "transaction_date", "created at": "transaction_date",
    # risk / score variants
    "risk score": "risk_score", "score": "risk_score",
    # count variants
    "count": "count", "transaction count": "count", "number of transactions": "count",
}

# Natural language operator phrases → symbolic operators
_OPERATOR_PHRASES: list[tuple[str, str]] = [
    (r"greater than or equal to", ">="),
    (r"less than or equal to",    "<="),
    (r"greater than",             ">"),
    (r"more than",                ">"),
    (r"exceeds?",                 ">"),
    (r"above",                    ">"),
    (r"over",                     ">"),
    (r"less than",                "<"),
    (r"below",                    "<"),
    (r"under",                    "<"),
    (r"not equal to",             "!="),
    (r"equal to",                 "=="),
    (r"equals?",                  "=="),
    (r"must be",                  "=="),
    (r"should be",                "=="),
    (r"is",                       "=="),
    # Symbolic operators (already in rule-string form)
    (r">=",  ">="),
    (r"<=",  "<="),
    (r"!=",  "!="),
    (r">",   ">"),
    (r"<",   "<"),
    (r"==",  "=="),
]


def _resolve_field(text: str) -> str | None:
    """Finds the longest matching alias in text and returns the canonical field name."""
    text_lower = text.lower()
    # Sort by length descending so multi-word phrases match before single words
    for alias in sorted(_FIELD_ALIASES, key=len, reverse=True):
        if alias in text_lower:
            return _FIELD_ALIASES[alias]
    return None


def _resolve_operator(text: str) -> tuple[str, int] | tuple[None, None]:
    """
    Scans text for the first operator phrase and returns (operator_symbol, match_end_pos).
    """
    text_lower = text.lower()
    for phrase, symbol in _OPERATOR_PHRASES:
        m = re.search(phrase, text_lower)
        if m:
            return symbol, m.end()
    return None, None


def _resolve_value(text: str) -> str | None:
    """Extracts the first numeric value or quoted string value from text."""
    # Numeric (including decimals and currency like $1,000)
    num_match = re.search(r"\$?([\d,]+(?:\.\d+)?)", text)
    if num_match:
        return num_match.group(1).replace(",", "")
    # Quoted string value e.g. status == 'ACTIVE'
    str_match = re.search(r"['\"]([^'\"]+)['\"]", text)
    if str_match:
        return f"'{str_match.group(1)}'"
    # Bare uppercase word (e.g. ACTIVE, PENDING)
    word_match = re.search(r"\b([A-Z]{2,})\b", text)
    if word_match:
        return f"'{word_match.group(1)}'"
    return None


def extract_rule_from_clause(clause: str) -> dict:
    """
    Parses a single natural language policy clause into a structured rule dict
    using regex and alias matching — no external API required.
    """
    field    = _resolve_field(clause)
    operator, op_end = _resolve_operator(clause)
    # Only look for value in the text after the operator match
    value = _resolve_value(clause[op_end:]) if op_end is not None else _resolve_value(clause)

    return {
        "entity":        None,
        "field":         field,
        "operator":      operator,
        "value":         value,
        "action":        None,
        "source_clause": clause,
    }


def extract_rules_from_clauses(clauses: list[str]) -> list[dict]:
    """
    Runs local regex extraction on all clauses.
    Skips clauses where field, operator, or value could not be resolved.
    """
    results = []
    for clause in clauses:
        rule = extract_rule_from_clause(clause)
        if rule["field"] and rule["operator"] and rule["value"] is not None:
            results.append(rule)
        else:
            logger.info(f"Skipping unresolvable clause: {clause[:80]}")
    logger.info(f"Extracted {len(results)} rules from {len(clauses)} clauses")
    return results


def _empty_rule(clause: str) -> dict:
    return {
        "entity": None, "field": None, "operator": None,
        "value": None, "action": None, "source_clause": clause
    }
