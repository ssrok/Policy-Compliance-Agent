import uuid
import logging
from sqlalchemy.orm import Session
from app.models.rule import Rule

logger = logging.getLogger(__name__)

def _generate_rule_id() -> str:
    """Generates a short unique rule ID like RULE_a3f2b1."""
    return f"RULE_{uuid.uuid4().hex[:6].upper()}"

def save_rules(db: Session, file_id: str, extracted_rules: list[dict]) -> list[Rule]:
    """
    Persists a list of extracted rule dicts to the DB.
    Returns the saved Rule ORM objects.
    """
    saved = []
    for rule_data in extracted_rules:
        rule = Rule(
            rule_id       = _generate_rule_id(),
            file_id       = file_id,
            source_clause = rule_data.get("source_clause", ""),
            entity        = rule_data.get("entity"),
            field         = rule_data.get("field"),
            operator      = rule_data.get("operator"),
            value         = rule_data.get("value"),
            action        = rule_data.get("action"),
        )
        db.add(rule)
        saved.append(rule)

    db.commit()
    for rule in saved:
        db.refresh(rule)

    logger.info(f"Saved {len(saved)} rules for file_id={file_id}")
    return saved


def get_rules_by_file(db: Session, file_id: str) -> list[Rule]:
    """Returns all rules extracted from a specific policy file."""
    return db.query(Rule).filter(Rule.file_id == file_id).all()


def get_all_rules(db: Session) -> list[Rule]:
    """Returns all rules across all policy files."""
    return db.query(Rule).all()
