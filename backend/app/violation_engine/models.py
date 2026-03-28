"""
violation_engine/models.py
--------------------------
Pydantic schemas for enriched violation objects.
These are the output contracts for Module 7.
"""

from typing import Any
from pydantic import BaseModel


class EnrichedViolation(BaseModel):
    violation_id: str       # UUID
    rule: str               # e.g. "amount > 10000"
    row_index: int          # row position in dataset
    column: str             # mapped dataset column
    value: Any              # actual value found in the row
    expected: str           # human-readable expectation e.g. "> 10000"
    message: str            # e.g. "Value 500 does not satisfy > 10000"
    severity: str           # "high" | "medium" | "low"
    explanation: str = ""   # filled by Module 8 explainability engine
