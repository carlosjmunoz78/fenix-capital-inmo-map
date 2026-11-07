#!/usr/bin/env python3
"""Read the existing October 18 STAGING V4 ZIP, never crawl the website.
Produces URL -> image usage index + receipt in LAB, without copying raw HTML
or modifying the historical source. Standard library only.
"""
import csv
import hashlib
import io
import json
import os
import sys
import zipfile
from collections import defaultdict
from pathlib import Path, PurePosixPath

EXPECTED_ZIP_SHA256 = "59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04"
STAGING_HOST = "https://staging.fenixcapital.es/"
MAX_MEMBERS = 100000
MAX_UNPACKED = 2 * 1024 * 1024 * 1024

def digest_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def one_member(z, suffix):
    matches = [m for m in z.namelist() if m == suffix or m.endswith("/" + suffix)]
    if len(matches) != 1:
        raise ValueError("ARCHIVE_MEMBER_NOT_UNIQUE:" + suffix)
    return matches[0]

def rows(z, suffix):
    with z.open(one_member(z, suffix), "r") as raw:
        text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
        try:
            return list(csv.DictReader(text))
        finally:
            text.detach()

def read_archive(zip_path):
    if digest_file(zip_path) != EXPECTED_ZIP_SHA256:
        raise ValueError("HISTORICAL_V4_SHA256_MISMATCH")
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        if len(names) > MAX_MEMBERS or len(names) != len(set(names)):
            raise ValueError("ARCHIVE_MEMBER_COUNT_OR_DUPLICATES")
        total = 0
        for info in z.infolist():
            path = PurePosixPath(info.filename)
            if path.is_absolute() or any(p in ("..", "") for p in path.parts):
                raise ValueError("ARCHIVE_TRAVERSAL")
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("ARCHIVE_SYMLINK")
            total += info.file_size
        if total > MAX_UNPACKED:
            raise ValueError("ARCHIVE_TOO_LARGE")
        url_rows = rows(z, "urls.csv")
        image_rows = rows(z, "images/images.csv")
        usage_rows = rows(z, "images/image_usage.csv")
        if len(url_rows) != 204 or len(image_rows) != 680:
            raise ValueError("ARCHIVED_INVENTORY_COUNT_DRIFT")
        image_lookup = {str(i.get("media_id", "")).strip(): i for i in image_rows}
        if len(image_lookup) != len(image_rows):
            raise ValueError("IMAGE_MASTER_DUPLICATE_IDS")
        url_lookup = {row.get("url", ""): row for row in url_rows}
        if len(url_lookup) != len(url_rows) or any(not u.startswith(STAGING_HOST) for u in url_lookup):
            raise ValueError("URL_INVENTORY_INVALID")
        copied = {ext: sum(1 for n in names if "/copy/" in "/" + n and n.endswith(ext))
            for ext in (".html", ".txt", ".json")}
        if not all(copied.values()):
            raise ValueError("EXACT_COPY_ARCHIVE_MISSING")
        usage = defaultdict(list)
        for row in usage_rows:
            u = row.get("page_url", "")
            mid = str(row.get("media_id", "")).strip()
            if u not in url_lookup or mid not in image_lookup:
                raise ValueError("IMAGE_USAGE_NOT_IN_URL_OR_IMAGE_REGISTRY")
            item = image_lookup[mid]
            usage[u].append({
                "media_id": mid,
                "filename": item.get("filename", ""),
                "alt": row.get("alt", "") or item.get("alt", ""),
                "image_url": row.get("src", "") or item.get("media_url", ""),
                "rights_recorded": bool(item.get("rights_license", "").strip()),
                "usage_type": row.get("usage_type", "")
            })
        mapped = []
        for url, row in sorted(url_lookup.items()):
            mapped.append({
                "source_environment": "STAGING",
                "url": url,
                "wordpress_id": row.get("wp_id", ""),
                "wp_type": row.get("wp_type", ""),
                "title": row.get("title", ""),
                "response_sha256": row.get("response_sha256", ""),
                "internal_link_count": row.get("internal_link_count", ""),
                "image_usages": usage.get(url, []),
                "copy_archive_ref": "copy/*.html|txt|json (resolve by source manifest)"
            })
        receipt = {
            "status": "V4_HISTORICAL_CORPUS_PHYSICALLY_READ_IN_GITHUB_LAB",
            "company_id": "fenix", "engine_id": "SEO-001", "environment": "LAB",
            "source_environment": "STAGING", "baseline_version": "V4",
            "archive_sha256_verified": True,
            "historical_urls": len(url_rows),
            "historical_images": len(image_rows),
            "image_use_rows": len(usage_rows),
            "urls_with_image_usage": len(usage),
            "copy_files_by_type": copied,
            "real_wordpress_prod_reconciled": False,
            "shared_job001_runtime_mounted": False,
            "real_company_agents_using_corpus": False,
            "site_writes": 0, "external_paid_api_calls": 0,
            "full_current_prod_corpus_claimed": False
        }
        return mapped, receipt

def main(argv):
    if len(argv) != 4:
        raise ValueError("USAGE: reader ZIP OUTPUT_INDEX OUTPUT_RECEIPT")
    src, index_out, receipt_out = argv[1:]
    index, receipt = read_archive(src)
    for path, value in [(index_out, {"items": index, "historical_only": True}),
                        (receipt_out, receipt)]:
        dest = Path(path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(dest, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(json.dumps(receipt, sort_keys=True))

if __name__ == "__main__":
    try:
        main(sys.argv)
    except Exception as exc:
        print(json.dumps({"status": "BLOCKED", "error": str(exc)[:125], "external_writes": 0}),
              file=sys.stderr)
        raise SystemExit(2)
