import re
import logging
import os
from pdfminer.high_level import extract_text
from docx import Document
from collections import Counter
from typing import Dict, List, Optional
import warnings

# Disable unnecessary warnings
warnings.filterwarnings("ignore", category=FutureWarning)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Lazy import config to read environment settings
try:
    import config
    _MODEL_NAME = config.NER_MODEL
except ImportError:
    _MODEL_NAME = os.getenv("NER_MODEL", "dslim/bert-base-NER")

# ----------------- Optional Imports ----------------- #
try:
    import torch
except ImportError:
    torch = None

try:
    from transformers import pipeline
except ImportError:
    pipeline = None

# ----------------- Global Pipeline ----------------- #
_NER_PIPELINE: Optional[object] = None


def get_ner_pipeline():
    """Lazy-loads and caches the NER model pipeline safely (CPU-only, version-flexible)."""
    global _NER_PIPELINE

    if _NER_PIPELINE is not None:
        return _NER_PIPELINE

    if pipeline is None:
        logger.warning("Transformers not installed — running in regex-only mode.")
        return None

    try:
        logger.info("Loading NER pipeline on CPU...")
        try:
            # ✅ Modern transformers versions (>=4.30)
            _NER_PIPELINE = pipeline(
                "ner",
                model=_MODEL_NAME,
                aggregation_strategy="simple",
                device=-1,  # CPU-only mode
            )
        except TypeError:
            # ✅ Fallback for older transformers versions (<4.30)
            _NER_PIPELINE = pipeline(
                "ner",
                model=_MODEL_NAME,
                device=-1,
            )

        logger.info(f"✅ NER model '{_MODEL_NAME}' loaded successfully.")
    except Exception as e:
        logger.exception("❌ Failed to load NER pipeline: %s", e)
        _NER_PIPELINE = None

    return _NER_PIPELINE


def parse_experience_years(exp_str: str) -> float:
    """Parses experience strings (e.g. '3-5 years', '5+ years', '6 months') to extract total years."""
    try:
        exp_str_lower = exp_str.lower()
        # Find all numbers (including decimals)
        numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", exp_str)]
        if not numbers:
            return 0.0
        
        # Take the maximum of numbers (handles ranges like "3-5" -> 5.0)
        val = max(numbers)
        
        if "month" in exp_str_lower or "mo" in exp_str_lower:
            return val / 12.0
        return val
    except Exception:
        return 0.0


# ------------------ Resume Parser ------------------ #
class ResumeParser:
    """Resume Parser using hybrid NLP + regex pipeline (Space-safe)."""

    def __init__(self):
        self.ner = get_ner_pipeline()

        # --- Precompiled regex patterns ---
        skills = [
            "python", "java", "javascript", "react", "angular", "vue", "django", "flask",
            "sql", "postgresql", "mysql", "mongodb", "docker", "kubernetes", "aws", "azure",
            "machine learning", "deep learning", "nlp", "pytorch", "tensorflow", "git",
            "rest", "fastapi", "spring boot", "c++", "html", "css", "linux", "data analysis"
        ]
        self.skill_pattern = re.compile(r"(?i)\b(" + "|".join(map(re.escape, skills)) + r")\b")

        # Split education patterns to avoid false positives on short words in lowercase
        self.education_patterns = [
            # Case-insensitive for full words/explicit combinations
            re.compile(
                r"(?i)\b("
                r"bachelor(?:'s)?(?:\s+of\s+[A-Za-z\s]+)?|"
                r"master(?:'s)?(?:\s+of\s+[A-Za-z\s]+)?|"
                r"doctor\s+of\s+philosophy|doctorate|degree"
                r")\b(?:\s+(?:in|of)?\s*[A-Za-z\s&]{2,30}?(?=[,.;\n]|\s{2,}|$))?"
            ),
            # Case-sensitive for short uppercase abbreviations to avoid matching "ms", "ma", "ba" in sentences
            re.compile(
                r"\b("
                r"B\.?S\.?(?:c\.)?|M\.?S\.?(?:c\.)?|Ph\.?D\.?|B\.?A\.?|M\.?A\.?|M\.?B\.?A\.?|BSc|MSc"
                r")\b(?:\s+(?:in|of)?\s*[A-Za-z\s&]{2,30}?(?=[,.;\n]|\s{2,}|$))?"
            )
        ]

        # Improved experience regex to handle ranges (e.g. 3-5 years) and combined phrases (e.g. 5+ years)
        self.experience_pattern = re.compile(
            r"(?i)\b(\d+(?:\s*-\s*\d+)?\s*\+?\s*(?:years?|yrs?|months?|mos?))\b"
        )
        self.job_title_pattern = re.compile(
            r"(?i)(?:Experience|Work Experience|Employment History|Positions Held|"
            r"Job Title:|Position:|Role:)(.*?)(?:Education|Skills|$)", re.DOTALL
        )
        self.single_job_pattern = re.compile(
            r"(?i)(?:\n|^)?([A-Za-z0-9 &\-+/]+?)\s*(?:at|@|—|-|–|—)\s*([A-Za-z0-9 &\-+.]+)(?:\n|$)"
        )
        self.title_label_pattern = re.compile(
            r"(?i)(?:Title|Job Title|Position|Role)[:\s]+([A-Za-z0-9 &\-+/]+)"
        )

    # ----------- File Extraction ----------- #
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract and clean text from file, catching and raising clean ValueError exceptions."""
        if not os.path.exists(file_path):
            raise ValueError("File does not exist")
        if os.path.getsize(file_path) == 0:
            raise ValueError("Could not read file: File is empty")

        try:
            if file_path.lower().endswith(".pdf"):
                text = extract_text(file_path)
            elif file_path.lower().endswith(".docx"):
                doc = Document(file_path)
                text = " ".join([p.text for p in doc.paragraphs])
            else:
                raise ValueError("Unsupported file type. Must be .pdf or .docx")
        except Exception as e:
            logger.warning(f"Error parsing file {file_path}: {e}")
            raise ValueError("Could not read file") from e

        cleaned = self._clean_text(text)
        if not cleaned:
            raise ValueError("Could not read file: No text content could be extracted")

        return cleaned

    def _clean_text(self, text: str) -> str:
        """Clean vertical/horizontal spaces but preserve single newlines for parsing structure."""
        # Normalize newlines to \n
        text = re.sub(r"\r\n?", "\n", text)
        # Collapse multiple horizontal spaces to a single space
        text = re.sub(r"[ \t]+", " ", text)
        # Collapse multiple vertical newlines to a single newline
        text = re.sub(r"\n+", "\n", text)
        # Clean leading/trailing spaces per line
        lines = [line.strip() for line in text.split("\n")]
        return "\n".join([line for line in lines if line])

    # ----------- Entity Extraction ----------- #
    def extract_entities(self, text: str, run_ner: bool = True) -> Dict[str, List]:
        warnings_list = []
        ner_results = []

        if run_ner:
            if self.ner:
                try:
                    ner_results = self.ner(text)
                except Exception as e:
                    logger.warning("NER inference failed, using regex fallback: %s", e)
                    warnings_list.append(f"NER inference failed, fell back to regex: {str(e)}")
            else:
                warnings_list.append("NER model not loaded, running in regex-only mode.")
        else:
            warnings_list.append("NER processing disabled by request.")

        # Extract skills
        ner_skills = []
        for e in ner_results:
            if e.get("entity_group") in {"ORG", "MISC"}:
                word = e["word"]
                # Clean up wordpieces if present
                word = word.replace("##", "")
                ner_skills.append(word)

        regex_skills = [m.group(1) for m in self.skill_pattern.finditer(text)]
        all_skills = ner_skills + regex_skills

        # Normalize skills: lowercase, strip surrounding spaces, strip trailing/leading punctuation
        normalized_skills = []
        for s in all_skills:
            s_clean = s.lower().strip()
            # Strip trailing and leading punctuation (periods, commas, dashes, colons)
            s_clean = re.sub(r"[.,;!?/\\-]+$", "", s_clean)
            s_clean = re.sub(r"^[.,;!?/\\-]+", "", s_clean)
            s_clean = s_clean.strip()
            if s_clean:
                normalized_skills.append(s_clean)

        skill_counts = Counter(normalized_skills)
        top_skills = [s for s, _ in skill_counts.most_common(5)]

        # Extract education using refined split-logic
        education = []
        # Split on line breaks or periods
        for line in re.split(r"[.\n]+", text):
            line_clean = line.strip()
            if not line_clean:
                continue
            has_edu = False
            for pattern in self.education_patterns:
                if pattern.search(line_clean):
                    has_edu = True
                    break
            if has_edu:
                education.append(line_clean)

        # Deduplicate education entries
        education = list(dict.fromkeys(education))

        # Extract experience durations
        experience = self.experience_pattern.findall(text)
        # Clean extra spaces in experience list
        experience = [e.strip() for e in experience if e.strip()]

        # Extract jobs
        jobs = []
        for section in self.job_title_pattern.findall(text):
            for m in self.single_job_pattern.finditer(section):
                left, right = m.group(1).strip(), m.group(2).strip()
                if re.search(r"(?i)engineer|developer|manager|scientist|analyst|consultant|lead|intern", left):
                    jobs.append(f"{left} at {right}")
                else:
                    jobs.append(f"{right} at {left}")
        for m in self.title_label_pattern.finditer(text):
            jobs.append(m.group(1).strip())

        job_experiences = list(dict.fromkeys(jobs))  # deduplicate

        return {
            "skills": list(skill_counts.keys()),
            "skill_counts": dict(skill_counts),
            "majority_skills": top_skills,
            "education": education,
            "experience": experience,
            "job_experiences": job_experiences,
            "warnings": warnings_list,
        }

    # ----------- Scoring ----------- #
    def calculate_score(self, skills, experience, job_experiences) -> int:
        skill_count = len(skills or [])

        # Robust experience years calculation
        total_years = 0.0
        for exp in (experience or []):
            if exp:
                total_years += parse_experience_years(exp)

        job_count = len(job_experiences or [])

        # Weighted components
        score = (
            0.5 * min(skill_count / 20, 1.0) +
            0.3 * min(total_years / 20, 1.0) +
            0.2 * min(job_count / 5, 1.0)
        ) * 100

        # Clamp the score between 0 and 100
        score = max(0, min(round(score), 100))
        return score

    # ----------- Entry Point ----------- #
    def analyze_resume(self, file_path: str, run_ner: bool = True) -> dict:
        text = self.extract_text_from_file(file_path)
        entities = self.extract_entities(text, run_ner=run_ner)
        score = self.calculate_score(
            entities.get("skills", []),
            entities.get("experience", []),
            entities.get("job_experiences", []),
        )
        return {**entities, "score": score}
