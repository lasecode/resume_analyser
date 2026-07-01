import logging
from typing import Optional
from resume_parser import ResumeParser

logger = logging.getLogger(__name__)

# Singleton parser instance
_parser_instance: Optional[ResumeParser] = None

def init_parser() -> None:
    """Initialize the ResumeParser singleton."""
    global _parser_instance
    try:
        logger.info("Initializing Resume Parser...")
        _parser_instance = ResumeParser()
        logger.info("✅ Resume Parser initialized successfully.")
    except Exception as e:
        _parser_instance = None
        logger.exception("❌ Failed to initialize Resume Parser: %s", e)

def get_parser() -> Optional[ResumeParser]:
    """Retrieve the ResumeParser singleton instance."""
    return _parser_instance
