import os
from typing import List, Optional

# Load Port
PORT = int(os.getenv("PORT", "7860"))

# Hugging Face Settings
HF_HOME = os.getenv("HF_HOME", "/tmp/hf_cache")
os.environ["HF_HOME"] = HF_HOME
os.environ["TRANSFORMERS_CACHE"] = HF_HOME

# Model Settings
NER_MODEL = os.getenv("NER_MODEL", "dslim/bert-base-NER")

# CORS Settings
# If CORS_ORIGINS is set to "*" or is empty, we will handle allowed credentials appropriately in main.py
raw_cors_origins = os.getenv("CORS_ORIGINS", "")
if raw_cors_origins:
    CORS_ORIGINS = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]
else:
    # Default local dev origins
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:7860",
        "http://127.0.0.1:7860",
    ]

# Upload & File settings
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(10 * 1024 * 1024)))  # Default 10MB

# Timeouts
DOWNLOAD_TIMEOUT = float(os.getenv("DOWNLOAD_TIMEOUT", "20.0"))
REQUEST_TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "60.0"))

# SSRF Protection Allowed Domains (Optional, comma-separated)
raw_allowed_domains = os.getenv("ALLOWED_DOMAINS", "")
if raw_allowed_domains:
    ALLOWED_DOMAINS: Optional[List[str]] = [
        domain.strip() for domain in raw_allowed_domains.split(",") if domain.strip()
    ]
else:
    ALLOWED_DOMAINS = None
