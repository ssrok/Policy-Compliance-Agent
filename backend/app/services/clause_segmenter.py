import spacy
import re
import logging

logger = logging.getLogger(__name__)

# List of critical policy/legal keywords to boost detection quality
IMPORTANT_KEYWORDS = {"must", "shall", "required", "prohibited", "not allowed", "will", "responsibility", "mandatory"}

# Load a small spacy model for sentence boundary detection
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("Spacy model 'en_core_web_sm' not found. Creating a blank 'en' model with sentencizer.")
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")

def is_useful_clause(clause: str) -> bool:
    """
    Heuristic-based filtering of meaningful policy clauses.
    Signal-boosts sentences containing critical legal/policy terms.
    """
    words = clause.split()
    
    # 1. Reject absolute noise (< 4 words)
    if len(words) < 4:
        return False
        
    # 2. Smart legal boost: keep short sentences if they contain powerful keywords
    if any(keyword in clause.lower() for keyword in IMPORTANT_KEYWORDS):
        return True
    
    # 3. Reject potential headings/titles (short + no terminal punctuation)
    if len(words) < 10 and not re.search(r'[.!?:]$', clause.strip()):
        return False

    return True

def segment_clauses(text: str) -> list[str]:
    """
    Segments raw text into clean, structured policy clauses while avoiding duplicates 
    and ensuring high rule-density after filtering noise.
    """
    if not text:
        return []

    # Optimized spaCy pipeline execution
    # Using context manager for pipe disabling is cleaner and ensures state is handled correctly.
    with nlp.select_pipes(disable=["ner", "lemmatizer", "attribute_ruler"]):
        doc = nlp(text)
    
    clauses = []
    seen = set()
    
    for sent in doc.sents:
        # 1. Basic cleaning and layout normalization
        raw_clause = sent.text.strip()
        clean_clause = re.sub(r'[\n\t\r]+', ' ', raw_clause)
        clean_clause = re.sub(r'\s+', ' ', clean_clause).strip()
        
        # 2. Strip unnecessary trailing list/artifact punctuation
        clean_clause = clean_clause.rstrip(",;:")
        
        # 3. Deduplication and Heuristic Filtering
        if clean_clause and clean_clause not in seen:
            if is_useful_clause(clean_clause):
                clauses.append(clean_clause)
                seen.add(clean_clause)
            
    logger.info(f"Segmented {len(clauses)} clauses from input text after deduplication and filtering.")
    return clauses
