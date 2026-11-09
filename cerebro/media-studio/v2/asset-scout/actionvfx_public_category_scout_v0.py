#!/usr/bin/env python3
"""UMS-001 ActionVFX public category scout v0.
Public discovery only: no API key, payment, downloads, or private/partner endpoints.
Run --live only from an isolated authorized LAB runner with internet.
"""
import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://backend.actionvfx.com/api/v1/categories"
SOURCE_DOC = "https://www.actionvfx.com/developer/api/public"
LICENSE = "https://www.actionvfx.com/license"
MAX_BODY_BYTES = 1_500_000
MAX_PAGES = 4
USER_AGENT = "CEREBRO-UMS001-ActionVFX-Catalog-LAB/0.1"
KEYWORDS = (
    "fire", "smoke", "dust", "dirt", "explosion", "energy",
    "portal", "wind", "spark", "debris", "water", "particle",
    "light", "shock", "blast", "magic", "atmospher"
)

def safe_text(value, limit=300):
    return re.sub(r"[\r\n\t]+", " ", str(value or ""))[:limit]

def reduce_category(entry, parent=None):
    if not isinstance(entry, dict):
        return []
    slug = entry.get("slug")
    if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,100}", slug):
        return []
    title = safe_text(entry.get("name"), 120)
    keywords = [safe_text(x, 60) for x in entry.get("keywords", [])[:30]
                if isinstance(x, str)]
    description = safe_text(entry.get("description"), 300)
    match_text = (title + " " + description + " " + " ".join(keywords)).lower()
    score = sum(1 for word in KEYWORDS if word in match_text)
    item = {"name": title, "slug": slug, "parent_slug": parent,
            "keywords": keywords, "relevance_score": score,
            "source": "ActionVFX", "source_docs": SOURCE_DOC,
            "license_url": LICENSE, "rights_status": "NOT_REVIEWED",
            "media_downloaded": False, "commercial_use_approved": False}
    result = [item]
    for child in entry.get("subcategories", [])[:100]:
        result += reduce_category(child, slug)
    return result

def retrieve_page(page, limit):
    params = urlencode({"page": page, "limit": limit, "library_id": 1})
    req = Request(BASE + "?" + params, headers={
        "Accept": "application/json", "User-Agent": USER_AGENT})
    with urlopen(req, timeout=15) as response:
        if response.status != 200 or not response.geturl().startswith(BASE + "?"):
            raise ValueError("Unexpected API response or redirect")
        data = response.read(MAX_BODY_BYTES + 1)
        if len(data) > MAX_BODY_BYTES:
            raise ValueError("API response exceeded maximum size")
        result = json.loads(data)
    if not isinstance(result, dict) or not isinstance(result.get("data"), list):
        raise ValueError("Unexpected ActionVFX API schema")
    return result

def collect(pages):
    result = {}
    for page in pages:
        if not isinstance(page, dict) or not isinstance(page.get("data"), list):
            raise ValueError("Malformed catalog data")
        for entry in page["data"]:
            for item in reduce_category(entry):
                result[(item["parent_slug"], item["slug"])] = item
    return sorted(result.values(),
                  key=lambda x: (-x["relevance_score"], x["name"]))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--fixture", type=Path)
    ap.add_argument("--output", type=Path,
                    default=Path("lab/actionvfx_public_categories.json"))
    args = ap.parse_args()
    if args.fixture:
        data = json.loads(args.fixture.read_text(encoding="utf-8"))
        pages = data if isinstance(data, list) else [data]
    elif args.live:
        pages = []
        first = retrieve_page(1, 10)
        pages.append(first)
        total_pages = int(first.get("total_pages", 1))
        if not 1 <= total_pages <= MAX_PAGES:
            raise ValueError("Too many pages; fail closed")
        for page in range(2, total_pages + 1):
            time.sleep(1)
            pages.append(retrieve_page(page, 10))
    else:
        print("NO_GO: require --fixture or --live", file=sys.stderr)
        return 2
    manifest = {
        "company_id": "fenix",
        "engine_id": "UMS-001", "environment": "LAB",
        "version": "actionvfx-public-categories-v0",
        "mode": "PUBLIC_API_NO_KEY",
        "source": BASE, "source_docs": SOURCE_DOC,
        "commercial_license": "BLOCKED_UNTIL_COMPANY_TIER_VERIFIED",
        "downloads_count": 0, "billable_calls": 0,
        "private_api_called": False,
        "categories": collect(pages),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(
        manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "status": "PUBLIC_CATEGORIES_DISCOVERED_NOT_DOWNLOADED",
        "categories": len(manifest["categories"]),
        "output": str(args.output), "cost_eur": 0}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
