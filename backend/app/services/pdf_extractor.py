import pdfplumber
import fitz  # PyMuPDF
import re
import logging
import unicodedata

# Configure basic logging
logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """
    Cleans extracted text by joining broken sentences, 
    removing excessive whitespace, and ensuring document continuity.
    """
    if not text:
        return ""
        
    # 1. Normalize Unicode characters (e.g., convert ligatures like 'fi' to separate characters)
    text = unicodedata.normalize("NFKC", text)
        
    # 2. Replace multiple spaces/tabs with a single space
    text = re.sub(r'[ \t]+', ' ', text)
    
    # 3. Join lines that have hyphenated words at the end
    text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
    
    # 4. Replace single newlines with spaces (for continuity) but keep double+ for paragraphs
    text = re.sub(r'(?<!\n)\n(?!\n)', ' ', text)
    
    return text.strip()

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF file using pdfplumber as primary 
    and PyMuPDF (fitz) as fallback.
    """
    
    # Method 1: pdfplumber (Primary)
    try:
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        
        if pages:
            logger.info(f"Successfully extracted text using pdfplumber from: {file_path}")
            return clean_text(" ".join(pages))
        else:
            logger.warning(f"pdfplumber found no extractable text in: {file_path}")
            
    except Exception as e:
        logger.error(f"pdfplumber extraction failed for {file_path}: {str(e)}")

    # Method 2: PyMuPDF / fitz (Fallback)
    try:
        pages = []
        doc = fitz.open(file_path)
        for page in doc:
            text = page.get_text()
            if text:
                pages.append(text)
        doc.close()

        if pages:
            logger.info(f"Successfully extracted text using PyMuPDF (fitz) from: {file_path}")
            return clean_text(" ".join(pages))
        else:
            logger.warning(f"PyMuPDF found no extractable text in: {file_path}")
            
    except Exception as e:
        logger.error(f"PyMuPDF (fitz) extraction failed for {file_path}: {str(e)}")

    # Final Failure
    raise RuntimeError(f"CRITICAL: Failed to extract text from PDF after trying both pdfplumber and PyMuPDF for: {file_path}")
