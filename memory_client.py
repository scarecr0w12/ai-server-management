"""Client wrapper for MCP Memory Service (HTTP API).

This module provides a *very thin* abstraction over the REST endpoints exposed
by the `mcp-memory-service` project (see https://github.com/doobidoo/mcp-memory-service).
It auto-detects whether the service is reachable; if not, it degrades
gracefully by returning empty results – ensuring the rest of the application
continues to function during local development.
"""
from __future__ import annotations

import logging
import os
import time
from typing import List, Dict, Any, Optional

import requests

# Environment variables
_MEMORY_BASE_URL = os.getenv("MEMORY_SERVICE_URL", "http://localhost:8001")
_MEMORY_API_KEY = os.getenv("MEMORY_SERVICE_API_KEY")

_SESSION = requests.Session()
_DEFAULT_TIMEOUT = float(os.getenv("MEMORY_CLIENT_TIMEOUT", 3))

logging.basicConfig(level=logging.INFO, format="[MemoryClient] %(message)s")


def _headers() -> Dict[str, str]:
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if _MEMORY_API_KEY:
        headers["x-api-key"] = _MEMORY_API_KEY
    return headers


def health() -> bool:
    """Return True if memory service is reachable."""
    try:
        resp = _SESSION.get(f"{_MEMORY_BASE_URL}/health", timeout=_DEFAULT_TIMEOUT)
        return resp.status_code == 200
    except requests.RequestException:
        return False


def store(content: str, *, server_id: Optional[str] = None, tags: Optional[List[str]] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
    payload: Dict[str, Any] = {
        "content": content,
        "timestamp": int(time.time()),
    }
    if server_id:
        payload.setdefault("tags", []).append(f"server:{server_id}")
        payload.setdefault("metadata", {})["server_id"] = server_id
    if tags:
        payload["tags"] = tags
    if metadata:
        payload["metadata"] = metadata
    try:
        resp = _SESSION.post(f"{_MEMORY_BASE_URL}/memory", json=payload, headers=_headers(), timeout=_DEFAULT_TIMEOUT)
        return resp.status_code == 200
    except requests.RequestException as exc:
        logging.warning("Memory store failed: %s", exc)
        return False


def search(query: str, *, limit: int = 3, server_id: Optional[str] = None) -> List[str]:
    """Return a list of memory content strings most relevant to the query."""
    params = {"q": query, "limit": limit}
    if server_id:
        params["filter_tag"] = f"server:{server_id}"
    try:
        resp = _SESSION.get(f"{_MEMORY_BASE_URL}/memory/search", params=params, headers=_headers(), timeout=_DEFAULT_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            return [item["content"] for item in data.get("results", [])]
    except requests.RequestException as exc:
        logging.info("Memory search unavailable: %s", exc)
    return []


def wipe_all(server_id: str) -> bool:
    """Delete all memories for a server."""
    try:
        resp = _SESSION.delete(f"{_MEMORY_BASE_URL}/memory", params={"filter_tag": f"server:{server_id}"}, headers=_headers(), timeout=_DEFAULT_TIMEOUT)
        return resp.status_code == 200
    except requests.RequestException as exc:
        logging.warning("Memory wipe failed: %s", exc)
        return False


def wipe_before(server_id: str, before_ts: int) -> bool:
    """Delete memories before timestamp for a server."""
    try:
        params = {"filter_tag": f"server:{server_id}", "before": before_ts}
        resp = _SESSION.delete(f"{_MEMORY_BASE_URL}/memory", params=params, headers=_headers(), timeout=_DEFAULT_TIMEOUT)
        return resp.status_code == 200
    except requests.RequestException as exc:
        logging.warning("Memory wipe failed: %s", exc)
        return False
