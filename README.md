# Resume Analyser

An AI-assisted resume parsing and scoring tool. Upload a resume (PDF/DOCX) or point it to a public resume URL, and it extracts skills, education, experience, and job history, then returns a 0–100 fit score — all through a FastAPI backend with a React-based frontend.

## Features

- 📄 Upload resumes as PDF or DOCX, or submit a public URL to a resume
- 🧠 Hybrid parsing pipeline — Named Entity Recognition (`dslim/bert-base-NER`) combined with regex-based extraction, with automatic fallback to regex-only mode if the NER model fails to load
- 🏷️ Skill extraction with frequency counts and top-5 "majority skills"
- 🎓 Education and 💼 job history extraction
- 📊 Overall resume score (0–100) based on skill count, years of experience, and job count
- ⚡ REST API built with FastAPI, CORS-enabled for frontend integration

## Tech Stack

**Backend**
- FastAPI + Uvicorn
- Hugging Face Transformers (`dslim/bert-base-NER`) + PyTorch (CPU inference)
- `pdfminer.six` for PDF text extraction
- `python-docx` for DOCX text extraction

**Frontend**
- React + Vite + TypeScript
- Tailwind CSS

## Project Structure

```
├── resume_service/
│   ├── main.py              # FastAPI app & routes
│   ├── resume_parser.py     # NER + regex parsing/scoring logic
│   ├── requirements.txt
│   ├── runtime.txt
│   └── test.py              # unit tests
├── frontend/                 # React + Vite + TS + Tailwind app
├── Dockerfile
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ (for the frontend)

### Backend Setup

```bash
cd resume_service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run the API locally:

```bash
python main.py
```

By default the server runs on `http://localhost:7860` (configurable via the `PORT` environment variable).

Optional environment variables:

| Variable     | Description                                  | Default            |
|--------------|-----------------------------------------------|---------------------|
| `PORT`       | Port the API listens on                       | `7860`              |
| `NER_MODEL`  | Hugging Face model used for entity recognition | `dslim/bert-base-NER` |
| `HF_HOME`    | Cache directory for downloaded model weights   | `/tmp/hf_cache`     |

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```
VITE_API_URL=http://localhost:7860
```

Then run:

```bash
npm run dev
```

### Docker (Backend)

```bash
docker build -t resume-analyser .
docker run -p 7860:7860 resume-analyser
```

## API Reference

Base URL (local): `http://localhost:7860`

### `GET /health`
Health check for the API and model status.

**Response**
```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "1.0.0"
}
```

### `POST /parse`
Parses an uploaded resume file.

- **Content-Type:** `multipart/form-data`
- **Field:** `file` — a `.pdf` or `.docx` file

**Response**
```json
{
  "success": true,
  "data": {
    "skills": ["python", "docker", "aws"],
    "skill_counts": { "python": 3, "docker": 1 },
    "majority_skills": ["python", "docker", "aws"],
    "education": ["B.Sc. in Computer Science"],
    "experience": ["5 years"],
    "job_experiences": ["Backend Engineer at Google"],
    "score": 78
  }
}
```

### `POST /parse-url`
Parses a resume from a publicly accessible URL (e.g. a Supabase storage link).

- **Content-Type:** `application/json`

**Request body**
```json
{ "url": "https://example.com/resume.pdf" }
```

**Response:** same shape as `/parse`.

### Error Responses
All errors follow FastAPI's standard shape:
```json
{ "detail": "Only PDF and DOCX files are supported." }
```

| Status | Meaning                                  |
|--------|-------------------------------------------|
| 400    | Invalid file type or unreachable URL      |
| 500    | Parsing error                             |
| 503    | Model not loaded / service unavailable    |

## How Scoring Works

The resume score is a weighted composite:

- **50%** — skill count (capped at 20 skills)
- **30%** — total years of experience (capped at 20 years)
- **20%** — number of distinct roles/job history entries (capped at 5)

Result is clamped to a 0–100 range.

## Known Issues / Roadmap

- Some bugs currently open (frontend edge cases, parsing accuracy) — being tracked and fixed post-launch
- `/parse-url` does not yet validate against internal/private network URLs (SSRF hardening planned)
- No file size limit enforced yet on uploads
- Regex-based education/experience extraction can occasionally over- or under-match on non-standard resume formats

## License

Specify a license (MIT, Apache 2.0, etc.) — not yet set.
