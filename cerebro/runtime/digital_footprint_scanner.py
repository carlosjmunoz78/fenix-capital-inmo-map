"""SCAN-001 · deterministic read-only Digital Footprint Scanner V0.

PREPROD-only shared-runtime scanner. Network access is injectable; tests never
require the public Internet. V0 inspects public HTTP responses supplied by a
caller/fetcher and never writes to remote systems.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any, Callable
from urllib.parse import urljoin, urlparse

ENGINE_ID = "SCAN-001"
ENGINE_VERSION = "0.2.0"
ALLOWED_ENVIRONMENTS = {"LOCAL", "LAB", "DEV", "PREPROD"}
SOCIAL_HOSTS = {
    "facebook.com": "facebook", "instagram.com": "instagram", "linkedin.com": "linkedin",
    "youtube.com": "youtube", "x.com": "x", "twitter.com": "x", "tiktok.com": "tiktok",
}


class ScannerError(Exception):
    code = "SCAN_ERROR"
    human_required_code: str | None = None


class ScannerValidationError(ScannerError):
    code = "SCAN_INVALID_INPUT"


class ScannerPolicyError(ScannerError):
    code = "SCAN_POLICY_DENY"
    human_required_code = "POLICY_CONFLICT"


@dataclass(frozen=True)
class FetchResponse:
    url: str
    status: int
    headers: dict[str, str]
    body: str


class _Signals(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self._in_title = False
        self.links: list[str] = []
        self.meta: dict[str, str] = {}
        self.generators: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {k.lower(): (v or "") for k, v in attrs}
        if tag.lower() == "title":
            self._in_title = True
        elif tag.lower() == "a" and data.get("href"):
            self.links.append(data["href"])
        elif tag.lower() == "meta":
            key = (data.get("name") or data.get("property") or "").lower()
            val = data.get("content", "").strip()
            if key and val:
                self.meta[key] = val
            if key == "generator":
                self.generators.append(val)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data


def _domain(value: str) -> str:
    raw = str(value or "").strip().lower()
    if raw.startswith("http://") or raw.startswith("https://"):
        raw = urlparse(raw).hostname or ""
    raw = raw.rstrip(".")
    if not re.fullmatch(r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", raw):
        raise ScannerValidationError("invalid public domain")
    return raw


def _normalize_headers(headers: dict[str, Any] | None) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in (headers or {}).items()}


def _technology_signals(headers: dict[str, str], body: str, generators: list[str]) -> list[str]:
    signals: set[str] = set()
    server = headers.get("server", "").lower()
    powered = headers.get("x-powered-by", "").lower()
    sample = body[:200000].lower()
    for name, markers in {
        "wordpress": ["wp-content/", "wp-includes/", "wordpress"],
        "elementor": ["elementor"],
        "cloudflare": ["cf-ray", "cloudflare"],
        "nextjs": ["_next/", "next.js"],
    }.items():
        if any(marker in sample or marker in server or marker in powered or marker in " ".join(generators).lower() for marker in markers):
            signals.add(name)
    if "cf-ray" in headers:
        signals.add("cloudflare")
    return sorted(signals)


class DigitalFootprintScanner:
    """Read-only footprint scanner with injected HTTP fetch capability."""

    def __init__(self, fetcher: Callable[[str], FetchResponse], environment: str = "PREPROD") -> None:
        env = str(environment).strip().upper()
        if env not in ALLOWED_ENVIRONMENTS:
            raise ScannerPolicyError("SCAN-001 V0 is non-PROD only")
        if not callable(fetcher):
            raise ScannerValidationError("fetcher must be callable")
        self.fetcher = fetcher
        self.environment = env

    def scan(self, *, company_id: str, domain: str, evidence_at: str) -> dict[str, Any]:
        company = str(company_id or "").strip().lower()
        if not company:
            raise ScannerValidationError("company_id is required")
        stamp = str(evidence_at or "").strip()
        if not stamp:
            raise ScannerValidationError("evidence_at is required")
        host = _domain(domain)
        root = f"https://{host}/"
        response = self.fetcher(root)
        if not isinstance(response, FetchResponse):
            raise ScannerValidationError("fetcher must return FetchResponse")
        headers = _normalize_headers(response.headers)
        parser = _Signals()
        parser.feed(response.body or "")

        social: dict[str, set[str]] = {}
        internal: set[str] = set()
        external: set[str] = set()
        for href in parser.links:
            absolute = urljoin(root, href)
            parsed = urlparse(absolute)
            link_host = (parsed.hostname or "").lower()
            if not link_host:
                continue
            if link_host == host or link_host.endswith("." + host):
                internal.add(absolute)
            else:
                external.add(absolute)
                for social_host, network in SOCIAL_HOSTS.items():
                    if link_host == social_host or link_host.endswith("." + social_host):
                        social.setdefault(network, set()).add(absolute)

        robots = self._optional_fetch(urljoin(root, "robots.txt"))
        sitemap = self._optional_fetch(urljoin(root, "sitemap.xml"))
        canonical = parser.meta.get("og:url", "")
        digest_source = "\n".join([host, str(response.status), response.body or "", robots.get("body", ""), sitemap.get("body", "")])
        return {
            "company_id": company,
            "engine_id": ENGINE_ID,
            "environment": self.environment,
            "version": ENGINE_VERSION,
            "domain": host,
            "evidence_at": stamp,
            "root": {"url": response.url, "status": int(response.status), "title": parser.title.strip(), "canonical_signal": canonical},
            "indexation": {"robots": robots, "sitemap": sitemap},
            "technologies": _technology_signals(headers, response.body or "", parser.generators),
            "social_profiles": {k: sorted(v) for k, v in sorted(social.items())},
            "internal_links": sorted(internal),
            "external_links": sorted(external),
            "evidence_sha256": hashlib.sha256(digest_source.encode("utf-8")).hexdigest(),
            "read_only": True,
            "external_cost_eur": 0,
        }

    def _optional_fetch(self, url: str) -> dict[str, Any]:
        try:
            response = self.fetcher(url)
        except Exception as exc:  # deterministic envelope; no retry/polling in V0
            return {"url": url, "available": False, "error": type(exc).__name__}
        if not isinstance(response, FetchResponse):
            return {"url": url, "available": False, "error": "INVALID_FETCH_RESPONSE"}
        body = response.body or ""
        return {"url": response.url, "available": 200 <= int(response.status) < 400, "status": int(response.status), "body": body[:20000]}

    def health(self) -> dict[str, Any]:
        return {
            "ok": True, "engine_id": ENGINE_ID, "engine_version": ENGINE_VERSION,
            "environment": self.environment, "mode": "read_only", "network": "injected_fetcher",
            "external_cost_eur": 0, "prod_enabled": False,
        }
