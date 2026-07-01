import os
import tempfile
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from docx import Document

# Set HF_HOME environment variable for testing to avoid downloading to real directory
os.environ["HF_HOME"] = tempfile.mkdtemp()

from main import app
from resume_parser import ResumeParser, parse_experience_years
from services import get_parser
import config

PDF_MAGIC = b"%PDF"

# A minimal valid PDF binary structure that pdfminer can extract text from
MINIMAL_PDF_CONTENT = (
    b"%PDF-1.4\n"
    b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
    b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
    b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <<>> /Contents 4 0 R>> endobj\n"
    b"4 0 obj <</Length 50>> stream\n"
    b"BT\n/F1 12 Tf\n72 712 Td\n(Python, React, Docker. Experience: 5 years.) Tj\nET\n"
    b"endstream\nendobj\n"
    b"xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n"
    b"trailer <</Size 5 /Root 1 0 R>>\n"
    b"startxref\n313\n%%EOF\n"
)


@pytest.fixture(scope="module")
def api_client():
    """Yields a TestClient instance inside a lifespan context to trigger initialization."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def parser():
    """Returns a local ResumeParser instance with mock NER to avoid model downloading."""
    p = ResumeParser()
    p.ner = None  # Ensure no NER model is loaded for unit tests
    return p


# ==================== UNIT TESTS ==================== #

def test_parse_experience_years():
    # Normal cases
    assert parse_experience_years("5 years") == 5.0
    assert parse_experience_years("6 months") == 0.5
    assert parse_experience_years("1.5 yrs") == 1.5
    # Ranges and combine
    assert parse_experience_years("3-5 years") == 5.0
    assert parse_experience_years("5+ years") == 5.0
    assert parse_experience_years("10+ yrs") == 10.0
    # Edge/Malformed cases
    assert parse_experience_years("a few years") == 0.0
    assert parse_experience_years("some experience") == 0.0
    assert parse_experience_years("") == 0.0


def test_calculate_score(parser):
    # Normal scoring
    skills = ["python", "django", "aws", "docker", "sql"]
    experience = ["5 years", "2 years", "6 months"]  # 7.5 years total
    jobs = ["Backend Engineer at Google", "DevOps Engineer at Amazon"]
    
    score = parser.calculate_score(skills, experience, jobs)
    # Expected:
    # skill weight: 0.5 * min(5/20, 1) = 0.125
    # experience weight: 0.3 * min(7.5/20, 1) = 0.1125
    # job weight: 0.2 * min(2/5, 1) = 0.08
    # sum = 0.3175 * 100 = 32%
    assert score == 32

    # Clamping and boundaries
    assert parser.calculate_score([], [], []) == 0
    
    large_skills = [f"skill_{i}" for i in range(30)]
    large_experience = ["25 years"]
    large_jobs = [f"job_{i}" for i in range(10)]
    assert parser.calculate_score(large_skills, large_experience, large_jobs) == 100


def test_extract_entities_normalization(parser):
    # Test skill normalization and deduplication
    text = "I work with Python, python., and PYTHON. Also Docker, docker, and React."
    entities = parser.extract_entities(text, run_ner=False)
    
    assert "python" in entities["skills"]
    assert "docker" in entities["skills"]
    assert "react" in entities["skills"]
    # Verify no punctuation remains in skill names
    for skill in entities["skills"]:
        assert not skill.endswith(".")
        assert skill == skill.lower()


def test_extract_entities_education(parser):
    # Test strict education regex (uppercase vs lowercase matches)
    text = (
        "Education: BS in Computer Science. Also got an MS of Software Engineering.\n"
        "This is Ms. Smith, she has a bachelor's in Arts.\n"
        "Avoid matching lowercase ms or ma like: she is in ms class or ma is calling."
    )
    entities = parser.extract_entities(text, run_ner=False)
    edu_list = entities["education"]
    
    # Matches
    assert any("BS in Computer Science" in item for item in edu_list)
    assert any("MS of Software Engineering" in item for item in edu_list)
    assert any("bachelor's in Arts" in item for item in edu_list)
    # Excludes (should not match lowercase ms or ma out of context)
    for item in edu_list:
        assert "ms class" not in item.lower()
        assert "ma is calling" not in item.lower()


def test_extract_text_from_file_validation(parser):
    # 1. Non-existent file
    with pytest.raises(ValueError, match="File does not exist"):
        parser.extract_text_from_file("non_existent_file.pdf")

    # 2. Empty file
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        with pytest.raises(ValueError, match="Could not read file: File is empty"):
            parser.extract_text_for_test = parser.extract_text_from_file(tmp_path)
    finally:
        os.remove(tmp_path)

    # 3. Corrupt file type
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"NOTA_PDF_CONTENT")
        tmp_path = tmp.name
    try:
        with pytest.raises(ValueError, match="Could not read file"):
            parser.extract_text_from_file(tmp_path)
    finally:
        os.remove(tmp_path)


def test_extract_text_docx(parser):
    # Create valid DOCX dynamically
    doc = Document()
    doc.add_paragraph("John Doe Resume\nSkills: Python, Django.")
    
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        doc.save(tmp.name)
        tmp_path = tmp.name
        
    try:
        text = parser.extract_text_from_file(tmp_path)
        assert "John Doe Resume" in text
        assert "Python, Django." in text
    finally:
        os.remove(tmp_path)


# ==================== INTEGRATION TESTS ==================== #

def test_api_health(api_client):
    response = api_client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert "status" in json_data
    assert "model_loaded" in json_data
    assert json_data["version"] == "1.0.0"


def test_api_parse_invalid_extension(api_client):
    # Attempt to upload TXT file
    files = {"file": ("resume.txt", b"Skills: Python", "text/plain")}
    response = api_client.post("/parse?ner=false", files=files)
    assert response.status_code == 400
    assert "Only PDF and DOCX files are supported" in response.json()["detail"]


def test_api_parse_oversized_file(api_client):
    # Make a mock large PDF (> 10MB limit)
    large_content = PDF_MAGIC + b"0" * (config.MAX_FILE_SIZE + 10)
    files = {"file": ("resume.pdf", large_content, "application/pdf")}
    response = api_client.post("/parse?ner=false", files=files)
    assert response.status_code == 413
    assert "exceeds the limit" in response.json()["detail"]


def test_api_parse_signature_spoofing(api_client):
    # PDF extension but fake DOCX structure
    files = {"file": ("resume.pdf", b"PK\x03\x04 fake docx bytes", "application/pdf")}
    response = api_client.post("/parse?ner=false", files=files)
    assert response.status_code == 400
    assert "File extension mismatch" in response.json()["detail"]


def test_api_parse_valid_pdf(api_client, monkeypatch):
    # Mock extract_text_from_file on the parser singleton to return sample text
    parser_instance = get_parser()
    if parser_instance:
        monkeypatch.setattr(parser_instance, "extract_text_from_file", lambda path: "Python, React, Docker. Experience: 5 years.")

    # Upload minimal valid PDF
    files = {"file": ("resume.pdf", MINIMAL_PDF_CONTENT, "application/pdf")}
    response = api_client.post("/parse?ner=false", files=files)
    
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "python" in data["skills"]
    assert "react" in data["skills"]
    assert "docker" in data["skills"]
    assert "warnings" in data
    assert "NER processing disabled by request." in data["warnings"]


def test_api_parse_url_ssrf_blocking(api_client):
    # Test private IPv4 ranges
    for private_url in [
        "http://127.0.0.1/resume.pdf",
        "http://localhost/resume.pdf",
        "http://169.254.169.254/resume.pdf",
        "http://10.0.0.1/resume.pdf",
        "http://192.168.1.50/resume.pdf",
    ]:
        response = api_client.post("/parse-url?ner=false", json={"url": private_url})
        assert response.status_code == 400
        assert "unauthorized network range" in response.json()["detail"]


def test_api_parse_url_invalid_extension(api_client):
    response = api_client.post("/parse-url?ner=false", json={"url": "https://example.com/resume.txt"})
    assert response.status_code == 400
    assert "Only PDF and DOCX" in response.json()["detail"]


class MockStreamResponse:
    def __init__(self, status_code, headers, content):
        self.status_code = status_code
        self.headers = headers
        self.content = content

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def iter_bytes(self, chunk_size=16384):
        yield self.content


def test_api_parse_url_success(api_client, monkeypatch):
    # Mock is_safe_url to bypass DNS resolution of example.com
    import routes
    monkeypatch.setattr(routes, "is_safe_url", lambda url, allowed_domains=None: True)
    
    # Mock extract_text_from_file on the parser singleton to return sample text
    parser_instance = get_parser()
    if parser_instance:
        monkeypatch.setattr(parser_instance, "extract_text_from_file", lambda path: "Python, React, Docker. Experience: 5 years.")

    # Mock httpx AsyncClient stream method to prevent outbound network access
    def mock_stream(*args, **kwargs):
        return MockStreamResponse(
            status_code=200,
            headers={"Content-Length": str(len(MINIMAL_PDF_CONTENT))},
            content=MINIMAL_PDF_CONTENT
        )
    
    # Stubbing stream context manager
    from httpx import AsyncClient
    monkeypatch.setattr(AsyncClient, "stream", mock_stream)
    
    response = api_client.post("/parse-url?ner=false", json={"url": "https://example.com/resume.pdf"})
    assert response.status_code == 200
    
    json_data = response.json()
    assert json_data["success"] is True
    assert "python" in json_data["data"]["skills"]
