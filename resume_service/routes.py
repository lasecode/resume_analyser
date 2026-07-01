import os
import tempfile
import socket
import ipaddress
import logging
import time
import httpx
from typing import Optional, List
from urllib.parse import urlparse

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Depends
from fastapi.concurrency import run_in_threadpool

import config
from schemas import HealthResponse, ParseResponse, ResumeURL, ParserData
from services import get_parser

logger = logging.getLogger(__name__)
router = APIRouter()

# Time-based cache for the health status check
_health_cache = None
_health_cache_time = 0.0
HEALTH_CACHE_TTL = 10.0  # seconds

# Magic bytes signature definitions
PDF_MAGIC = b"%PDF"
DOCX_MAGIC = b"PK\x03\x04"


def is_safe_url(url: str, allowed_domains: Optional[List[str]] = None) -> bool:
    """SSRF validation: Ensures URL is HTTP/HTTPS and resolves to a public, non-internal IP address."""
    try:
        parsed = urlparse(url)
        if not parsed.scheme or parsed.scheme not in ("http", "https"):
            logger.warning(f"Blocked URL with invalid scheme: {parsed.scheme}")
            return False

        hostname = parsed.hostname
        if not hostname:
            logger.warning(f"Blocked URL with no hostname: {url}")
            return False

        # Domain allowlist check
        if allowed_domains:
            domain_matched = False
            for domain in allowed_domains:
                if hostname == domain or hostname.endswith("." + domain):
                    domain_matched = True
                    break
            if not domain_matched:
                logger.warning(f"Blocked URL not in allowlist: {hostname}")
                return False

        # Resolve host to IP addresses
        try:
            addr_info = socket.getaddrinfo(hostname, None)
        except socket.gaierror as e:
            logger.warning(f"Failed to resolve hostname '{hostname}': {e}")
            return False

        for info in addr_info:
            ip_str = info[4][0]
            # Strip scope zone index for IPv6 (e.g. fe80::1%lo0)
            ip_str = ip_str.split("%")[0]
            ip = ipaddress.ip_address(ip_str)

            # Block loopback, private, link-local, multicast, unspecified, and reserved IPs
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_unspecified
                or ip.is_multicast
                or ip.is_reserved
            ):
                logger.warning(f"Blocked internal/private IP range connection: {ip_str} for host: {hostname}")
                return False

        return True
    except Exception as e:
        logger.error(f"Error validating URL safety: {e}")
        return False


def validate_file_content(content: bytes, filename_or_url: str) -> str:
    """Checks the magic bytes of the file content. Matches with filename/URL extension."""
    if content.startswith(PDF_MAGIC):
        detected_ext = "pdf"
    elif content.startswith(DOCX_MAGIC):
        detected_ext = "docx"
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported or invalid file structure. The file signature does not match PDF or DOCX."
        )

    # Check filename extension if available
    path_without_query = filename_or_url.split("?")[0]
    _, ext = os.path.splitext(path_without_query)
    ext = ext.lower()

    if ext == ".pdf" and detected_ext != "pdf":
        raise HTTPException(
            status_code=400,
            detail="File extension mismatch: file has .pdf extension but contents are not PDF."
        )
    elif ext == ".docx" and detected_ext != "docx":
        raise HTTPException(
            status_code=400,
            detail="File extension mismatch: file has .docx extension but contents are not DOCX."
        )

    return detected_ext


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Cached status endpoint for service health probes."""
    global _health_cache, _health_cache_time
    now = time.time()

    if _health_cache is None or (now - _health_cache_time) > HEALTH_CACHE_TTL:
        parser = get_parser()
        try:
            _health_cache = {
                "status": "ok" if parser else "error",
                "model_loaded": parser is not None and parser.ner is not None,
                "version": "1.0.0",
            }
            _health_cache_time = now
        except Exception as e:
            logger.exception("Health check failed: %s", e)
            raise HTTPException(status_code=500, detail="Service unhealthy")

    return _health_cache


@router.post("/parse", response_model=ParseResponse)
async def parse_resume(
    file: UploadFile = File(...),
    ner: bool = Query(True, description="Enable NER model extraction. Set to false for fast regex-only parsing.")
):
    """Accept a resume file (PDF/DOCX) up to 10MB and return structured data."""
    parser = get_parser()
    if parser is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please try again later.")

    # 1. Early extension check
    filename = file.filename.lower() if file.filename else ""
    if not filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    # 2. Size limit enforcement & Content read
    content = await file.read(config.MAX_FILE_SIZE + 1)
    if len(content) > config.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds the limit of {config.MAX_FILE_SIZE // (1024 * 1024)}MB."
        )

    # 3. Magic bytes validation
    detected_ext = validate_file_content(content, filename)

    # Save to a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{detected_ext}") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Run CPU-bound parsing in a threadpool to prevent blocking the async loop
        result = await run_in_threadpool(parser.analyze_resume, tmp_path, run_ner=ner)

        # Safeguard score clamp
        if "score" in result:
            result["score"] = min(max(result["score"], 0), 100)

        return {"success": True, "data": result}

    except ValueError as ve:
        logger.warning(f"Validation error parsing resume: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error parsing resume: %s", e)
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as re:
                logger.error(f"Failed to remove temp file {tmp_path}: {re}")


@router.post("/parse-url", response_model=ParseResponse)
async def parse_resume_from_url(
    data: ResumeURL,
    ner: bool = Query(True, description="Enable NER model extraction. Set to false for fast regex-only parsing.")
):
    """Accept a public resume URL, validate, download safely under limits, and parse."""
    parser = get_parser()
    if parser is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please try again later.")

    # 1. File extension pre-check
    path_without_query = data.url.split("?")[0]
    _, ext = os.path.splitext(path_without_query)
    ext = ext.lower()
    if ext not in (".pdf", ".docx"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported."
        )

    # 2. SSRF Check
    if not is_safe_url(data.url, allowed_domains=config.ALLOWED_DOMAINS):
        raise HTTPException(
            status_code=400,
            detail="URL is invalid, unreachable, or references an unauthorized network range."
        )

    tmp_path = None
    try:
        # 3. Secure download with size limit and content-type validation
        logger.info(f"Downloading resume from URL: {data.url}")
        
        async with httpx.AsyncClient(timeout=config.DOWNLOAD_TIMEOUT) as client:
            async with client.stream("GET", data.url) as response:
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Could not download file from URL. HTTP status {response.status_code}"
                    )

                # Check Content-Length if present
                content_length = response.headers.get("Content-Length")
                if content_length:
                    try:
                        size = int(content_length)
                        if size > config.MAX_FILE_SIZE:
                            raise HTTPException(
                                status_code=413,
                                detail=f"File size from Content-Length exceeds limit of {config.MAX_FILE_SIZE // (1024 * 1024)}MB."
                            )
                    except ValueError:
                        pass

                # Stream content chunk-by-chunk to prevent memory bloating or downloading oversized files
                content_bytes = bytearray()
                async for chunk in response.iter_bytes(chunk_size=16384):
                    content_bytes.extend(chunk)
                    if len(content_bytes) > config.MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Downloaded file size exceeds limit of {config.MAX_FILE_SIZE // (1024 * 1024)}MB."
                        )

        content = bytes(content_bytes)

        # 4. Content verification (magic bytes & extension)
        detected_ext = validate_file_content(content, data.url)

        # Write to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{detected_ext}") as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # 5. Thread-pool execution
        result = await run_in_threadpool(parser.analyze_resume, tmp_path, run_ner=ner)

        # Safeguard score clamp
        if "score" in result:
            result["score"] = min(max(result["score"], 0), 100)

        return {"success": True, "data": result}

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.warning(f"Download timed out for URL: {data.url}")
        raise HTTPException(status_code=408, detail="Request timed out while downloading the resume.")
    except httpx.RequestError as re:
        logger.warning(f"Network error downloading URL {data.url}: {re}")
        raise HTTPException(status_code=400, detail="Failed to fetch resume from the provided URL.")
    except ValueError as ve:
        logger.warning(f"Validation error parsing downloaded resume: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error parsing resume from URL: %s", e)
        raise HTTPException(status_code=500, detail=f"Error parsing resume from URL: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception as re:
                logger.error(f"Failed to remove temp file {tmp_path}: {re}")
