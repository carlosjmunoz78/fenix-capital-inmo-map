#!/usr/bin/env python3
"""
CEREBRO SEO001 · Fénix Capital STAGING whole-site baseline exporter.

READ-ONLY. Hard-wired to https://staging.fenixcapital.es/ and fails closed if
redirected outside that host while enumerating content. It never authenticates,
never writes WordPress, and never touches PROD.

Outputs:
- exact HTTP HTML + exact visible copy snapshot per public content URL
- URL/tree/dependency/internal-link maps
- complete WordPress media metadata + per-URL image usage
- binary SHA256 + perceptual pHash when the public media binary is retrievable
- duplicate/near-duplicate reports
- evidence manifest and checksums
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import sys
import time
import zipfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from PIL import Image
import imagehash

BASE = "https://staging.fenixcapital.es/"
HOST = "staging.fenixcapital.es"
REST = urljoin(BASE, "wp-json/wp/v2/")
OUT = Path(os.environ.get("BASELINE_OUT", "baseline"))
UA = "CEREBRO-SEO001-STAGING-BASELINE/1.0 (+read-only; company=fenix-capital)"
NOW = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
TIMEOUT = (10, 35)

session = requests.Session()
session.headers.update({
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
})

errors: list[dict[str, Any]] = []


def plain(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, dict) and "rendered" in v:
        v = v.get("rendered", "")
    return BeautifulSoup(str(v), "lxml").get_text(" ", strip=True)


def normalize_url(raw: str, base: str = BASE) -> str:
    if not raw:
        return ""
    raw = raw.strip()
    if raw.startswith(("mailto:", "tel:", "javascript:", "data:", "#")):
        return raw
    u = urljoin(base, raw)
    p = urlparse(u)
    # Fragments never identify a different HTTP resource for the baseline graph.
    p = p._replace(fragment="")
    return urlunparse(p)


def same_site(url: str) -> bool:
    try:
        return urlparse(url).hostname == HOST
    except Exception:
        return False


def safe_name(url: str, content_id: Any = None) -> str:
    p = urlparse(url).path.strip("/") or "home"
    s = re.sub(r"[^a-zA-Z0-9._-]+", "_", p)[:160]
    return f"{content_id}_{s}" if content_id else s


def get(url: str, *, params: dict[str, Any] | None = None, expect_json: bool = False,
        allow_redirects: bool = True, attempts: int = 4) -> requests.Response:
    last: Exception | None = None
    for n in range(attempts):
        try:
            r = session.get(url, params=params, timeout=TIMEOUT, allow_redirects=allow_redirects)
            if r.status_code in (429, 500, 502, 503, 504) and n + 1 < attempts:
                time.sleep(1.5 * (n + 1))
                continue
            return r
        except Exception as exc:
            last = exc
            if n + 1 < attempts:
                time.sleep(1.5 * (n + 1))
    raise RuntimeError(f"GET failed after {attempts}: {url}: {last}")


def wp_collection(endpoint: str, fields: str | None = None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        params: dict[str, Any] = {"per_page": 100, "page": page, "status": "publish", "context": "view"}
        if fields:
            params["_fields"] = fields
        r = get(urljoin(REST, endpoint), params=params)
        if r.status_code == 400 and page > 1:
            break
        if r.status_code != 200:
            errors.append({"stage": "wp_collection", "endpoint": endpoint, "page": page,
                           "status": r.status_code, "body": r.text[:500]})
            break
        rows = r.json()
        if not rows:
            break
        out.extend(rows)
        total_pages = int(r.headers.get("X-WP-TotalPages", page))
        if page >= total_pages:
            break
        page += 1
    return out


def wp_media_collection() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1
    fields = (
        "id,date,modified,slug,status,link,title,caption,description,alt_text,"
        "media_type,mime_type,media_details,source_url,post"
    )
    while True:
        params = {"per_page": 100, "page": page, "context": "view", "_fields": fields}
        r = get(urljoin(REST, "media"), params=params)
        if r.status_code == 400 and page > 1:
            break
        if r.status_code != 200:
            errors.append({"stage": "media_collection", "page": page, "status": r.status_code,
                           "body": r.text[:500]})
            break
        rows = r.json()
        if not rows:
            break
        out.extend(rows)
        total_pages = int(r.headers.get("X-WP-TotalPages", page))
        if page >= total_pages:
            break
        page += 1
    return out


def jsonld_blocks(soup: BeautifulSoup) -> list[dict[str, Any]]:
    arr: list[dict[str, Any]] = []
    for i, node in enumerate(soup.find_all("script", attrs={"type": re.compile(r"application/ld\+json", re.I)}), 1):
        raw = node.string or node.get_text() or ""
        raw = raw.strip()
        ok = True
        parsed: Any = None
        err = ""
        try:
            parsed = json.loads(raw)
        except Exception as exc:
            ok = False
            err = str(exc)
        arr.append({"index": i, "valid_json": ok, "parsed": parsed if ok else None,
                    "raw": raw, "error": err})
    return arr


def nav_tree(node) -> Any:
    # Preserve anchor + nested list hierarchy without depending on theme-specific classes.
    def walk_list(lst):
        items = []
        for li in lst.find_all("li", recursive=False):
            a = li.find("a", recursive=False) or li.find("a")
            item = {
                "text": a.get_text(" ", strip=True) if a else li.get_text(" ", strip=True),
                "url": normalize_url(a.get("href", "")) if a else "",
                "children": [],
            }
            sub = li.find(["ul", "ol"], recursive=False)
            if sub:
                item["children"] = walk_list(sub)
            items.append(item)
        return items
    lists = node.find_all(["ul", "ol"], recursive=False)
    return [x for lst in lists for x in walk_list(lst)]


def extract_page(url: str, content_id: Any, wp_type: str, wp_obj: dict[str, Any]) -> dict[str, Any]:
    r = get(url)
    final_url = r.url
    html = r.text
    if urlparse(final_url).hostname != HOST:
        errors.append({"stage": "page_redirect_external", "url": url, "final_url": final_url})
    soup = BeautifulSoup(html, "lxml")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    meta_desc_node = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_desc = meta_desc_node.get("content", "").strip() if meta_desc_node else ""
    robots_node = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
    robots = robots_node.get("content", "").strip() if robots_node else ""
    canonical_node = soup.find("link", attrs={"rel": lambda x: x and "canonical" in x})
    canonical = canonical_node.get("href", "").strip() if canonical_node else ""

    headings = []
    for h in soup.find_all(re.compile(r"^h[1-6]$", re.I)):
        headings.append({"level": h.name.lower(), "text": h.get_text(" ", strip=True)})

    links = []
    dependencies = []
    external_links = []
    for a in soup.find_all("a", href=True):
        raw = a.get("href", "").strip()
        nu = normalize_url(raw, final_url)
        rec = {"url": nu, "raw": raw, "anchor": a.get_text(" ", strip=True),
               "rel": " ".join(a.get("rel", []) or []), "target": a.get("target", "")}
        if nu.startswith(("mailto:", "tel:", "javascript:", "data:", "#")):
            dependencies.append({"source_url": url, "type": "action_link", "target": nu,
                                 "label": rec["anchor"]})
        elif same_site(nu):
            links.append(rec)
            dependencies.append({"source_url": url, "type": "internal_link", "target": nu,
                                 "label": rec["anchor"]})
        elif nu:
            external_links.append(rec)
            dependencies.append({"source_url": url, "type": "external_link", "target": nu,
                                 "label": rec["anchor"]})

    images = []
    for img in soup.find_all("img"):
        src = normalize_url(img.get("src", ""), final_url)
        srcset = img.get("srcset", "") or ""
        srcset_urls = []
        for token in srcset.split(","):
            bit = token.strip().split(" ")[0].strip()
            if bit:
                srcset_urls.append(normalize_url(bit, final_url))
        rec = {
            "src": src,
            "srcset_urls": srcset_urls,
            "alt": img.get("alt", ""),
            "title": img.get("title", ""),
            "width": img.get("width", ""),
            "height": img.get("height", ""),
            "loading": img.get("loading", ""),
            "fetchpriority": img.get("fetchpriority", ""),
            "decoding": img.get("decoding", ""),
            "sizes": img.get("sizes", ""),
            "class": " ".join(img.get("class", []) or []),
        }
        images.append(rec)
        if src:
            dependencies.append({"source_url": url, "type": "image", "target": src,
                                 "label": rec["alt"]})
        for su in srcset_urls:
            dependencies.append({"source_url": url, "type": "image_srcset", "target": su,
                                 "label": rec["alt"]})

    for s in soup.find_all("script", src=True):
        dependencies.append({"source_url": url, "type": "script", "target": normalize_url(s["src"], final_url), "label": ""})
    for l in soup.find_all("link", href=True):
        rel = " ".join(l.get("rel", []) or [])
        if "stylesheet" in rel or "preload" in rel or "icon" in rel:
            dependencies.append({"source_url": url, "type": f"link_{rel or 'resource'}",
                                 "target": normalize_url(l["href"], final_url), "label": ""})
    for f in soup.find_all("form"):
        dependencies.append({"source_url": url, "type": "form_action",
                             "target": normalize_url(f.get("action", ""), final_url),
                             "label": f.get("id", "") or " ".join(f.get("class", []) or [])})

    # CSS background / url(...) assets visible in the response.
    for css_url in re.findall(r"url\((?:['\"]?)([^)'\"]+)", html, flags=re.I):
        cu = normalize_url(css_url, final_url)
        if cu:
            dependencies.append({"source_url": url, "type": "css_url", "target": cu, "label": ""})

    ctas = []
    for el in soup.find_all(["button", "a"]):
        cls = " ".join(el.get("class", []) or []).lower()
        txt = el.get_text(" ", strip=True)
        if "btn" in cls or "button" in cls or el.name == "button":
            ctas.append({"tag": el.name, "text": txt, "href": normalize_url(el.get("href", ""), final_url),
                         "class": cls, "type": el.get("type", "")})

    faqs = []
    for d in soup.find_all("details"):
        q = d.find("summary")
        if q:
            qq = q.get_text(" ", strip=True)
            q.extract()
            aa = d.get_text(" ", strip=True)
            faqs.append({"question": qq, "answer": aa})

    navs = []
    for i, n in enumerate(soup.find_all("nav"), 1):
        navs.append({"index": i, "aria_label": n.get("aria-label", ""), "class": " ".join(n.get("class", []) or []),
                     "items": nav_tree(n)})

    # Exact visitor-visible copy: preserve line order but normalize repeated whitespace inside each line.
    full_clone = BeautifulSoup(html, "lxml")
    for x in full_clone(["script", "style", "template", "svg"]):
        x.decompose()
    full_text = "\n".join(x.strip() for x in full_clone.stripped_strings if x.strip())
    main = soup.find("main") or soup.find(attrs={"role": "main"}) or soup.body or soup
    main_clone = BeautifulSoup(str(main), "lxml")
    for x in main_clone(["script", "style", "template", "svg"]):
        x.decompose()
    main_text = "\n".join(x.strip() for x in main_clone.stripped_strings if x.strip())

    record = {
        "snapshot_at": NOW,
        "environment": "STAGING",
        "company_id": "fenix-capital",
        "wp_type": wp_type,
        "wp_id": content_id,
        "url": url,
        "http_status": r.status_code,
        "final_url": final_url,
        "redirected": final_url.rstrip("/") != url.rstrip("/"),
        "response_sha256": hashlib.sha256(r.content).hexdigest(),
        "response_bytes": len(r.content),
        "title": title,
        "meta_description": meta_desc,
        "robots": robots,
        "canonical": canonical,
        "headings": headings,
        "h1_count": sum(1 for h in headings if h["level"] == "h1"),
        "links_internal": links,
        "links_external": external_links,
        "images": images,
        "ctas": ctas,
        "faqs": faqs,
        "schema_jsonld": jsonld_blocks(soup),
        "navs": navs,
        "full_visible_text": full_text,
        "main_visible_text": main_text,
        "wp_parent": wp_obj.get("parent", 0),
        "featured_media": wp_obj.get("featured_media", 0),
        "wp_title": plain(wp_obj.get("title")),
        "wp_excerpt": plain(wp_obj.get("excerpt")),
        "wp_slug": wp_obj.get("slug", ""),
        "dependencies": dependencies,
        "raw_http_html": html,
        "wp_content_rendered": (wp_obj.get("content") or {}).get("rendered", "") if isinstance(wp_obj.get("content"), dict) else "",
    }
    return record


def write_csv(path: Path, rows: Iterable[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            cooked = {}
            for k in fieldnames:
                v = row.get(k, "")
                if isinstance(v, (dict, list)):
                    v = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
                cooked[k] = v
            w.writerow(cooked)


def download_hash_media(m: dict[str, Any]) -> dict[str, Any]:
    url = m.get("source_url", "")
    result = {"id": m.get("id"), "source_url": url, "binary_ok": False, "binary_error": "",
              "sha256": "", "perceptual_hash": "", "bytes_downloaded": ""}
    if not url:
        result["binary_error"] = "missing_source_url"
        return result
    try:
        rr = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT)
        rr.raise_for_status()
        b = rr.content
        result["bytes_downloaded"] = len(b)
        result["sha256"] = hashlib.sha256(b).hexdigest()
        try:
            im = Image.open(BytesIO(b))
            result["perceptual_hash"] = str(imagehash.phash(im))
        except Exception as exc:
            result["binary_error"] = f"phash:{exc}"
        result["binary_ok"] = True
    except Exception as exc:
        result["binary_error"] = str(exc)
    return result


def license_guess(text: str) -> str:
    pats = [
        (r"\bcc0\b", "CC0"),
        (r"cc\s*by[- ]sa\s*4\.0", "CC BY-SA 4.0"),
        (r"cc\s*by[- ]sa", "CC BY-SA"),
        (r"cc\s*by\s*4\.0", "CC BY 4.0"),
        (r"creative commons", "Creative Commons"),
        (r"public domain|dominio p[uú]blico", "Public Domain"),
        (r"unsplash", "Unsplash license/source"),
        (r"pexels", "Pexels license/source"),
        (r"pixabay", "Pixabay license/source"),
    ]
    low = text.lower()
    return next((label for pat, label in pats if re.search(pat, low, flags=re.I)), "")


def source_guess(text: str) -> str:
    urls = re.findall(r"https?://[^\s<>\"']+", text)
    # Strip punctuation commonly left by HTML/plain descriptions.
    clean = []
    for u in urls:
        u = u.rstrip(".,);]")
        if u not in clean:
            clean.append(u)
    return " | ".join(clean[:10])


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "copy").mkdir(exist_ok=True)
    (OUT / "tree").mkdir(exist_ok=True)
    (OUT / "images").mkdir(exist_ok=True)
    (OUT / "evidence").mkdir(exist_ok=True)

    # Enumerate all public content directly from STAGING REST. No sitemap-only blind spot.
    page_fields = "id,slug,status,link,title,content,excerpt,parent,featured_media,modified"
    post_fields = "id,slug,status,link,title,content,excerpt,featured_media,modified,categories,tags"
    pages = wp_collection("pages", page_fields)
    posts = wp_collection("posts", post_fields)
    cats = wp_collection("categories", "id,slug,link,name,description,parent,count")

    # WP categories do not accept status=publish. Retry explicitly if generic helper returned none.
    if not cats:
        cats = []
        page = 1
        while True:
            rr = get(urljoin(REST, "categories"), params={"per_page": 100, "page": page, "context": "view"})
            if rr.status_code == 400 and page > 1:
                break
            if rr.status_code != 200:
                errors.append({"stage": "categories", "status": rr.status_code, "body": rr.text[:500]})
                break
            rows = rr.json()
            if not rows:
                break
            cats.extend(rows)
            if page >= int(rr.headers.get("X-WP-TotalPages", page)):
                break
            page += 1

    # Home is a distinct visitor URL even if it renders the same static page object as /inicio/.
    content: list[tuple[str, Any, str, dict[str, Any]]] = []
    seen: set[str] = set()
    for typ, rows in (("page", pages), ("post", posts), ("category", cats)):
        for obj in rows:
            u = normalize_url(obj.get("link", ""))
            if not u or not same_site(u):
                continue
            key = u.rstrip("/") + "/"
            if key not in seen:
                seen.add(key)
                content.append((u, obj.get("id"), typ, obj))
    if BASE.rstrip("/") + "/" not in seen:
        content.insert(0, (BASE, "home", "home", {"id": "home", "slug": "home", "parent": 0, "featured_media": 0}))

    page_records: list[dict[str, Any]] = []
    all_deps: list[dict[str, Any]] = []
    all_internal: list[dict[str, Any]] = []
    all_external: list[dict[str, Any]] = []
    all_navs: list[dict[str, Any]] = []
    image_occurrences: list[dict[str, Any]] = []

    for idx, (url, cid, typ, obj) in enumerate(content, 1):
        print(f"[{idx}/{len(content)}] page {url}", flush=True)
        try:
            rec = extract_page(url, cid, typ, obj)
        except Exception as exc:
            errors.append({"stage": "extract_page", "url": url, "error": str(exc)})
            continue
        page_records.append(rec)
        stem = safe_name(url, cid)
        (OUT / "copy" / f"{stem}.html").write_text(rec["raw_http_html"], encoding="utf-8")
        (OUT / "copy" / f"{stem}.txt").write_text(rec["full_visible_text"], encoding="utf-8")
        lean = {k: v for k, v in rec.items() if k not in ("raw_http_html", "full_visible_text", "main_visible_text", "wp_content_rendered", "dependencies")}
        lean["main_visible_text"] = rec["main_visible_text"]
        lean["wp_content_rendered"] = rec["wp_content_rendered"]
        (OUT / "copy" / f"{stem}.json").write_text(json.dumps(lean, ensure_ascii=False, indent=2), encoding="utf-8")
        all_deps.extend(rec["dependencies"])
        for x in rec["links_internal"]:
            all_internal.append({"source_url": url, "target_url": x["url"], "anchor": x["anchor"], "rel": x["rel"], "target": x["target"]})
        for x in rec["links_external"]:
            all_external.append({"source_url": url, "target_url": x["url"], "anchor": x["anchor"], "rel": x["rel"]})
        for n in rec["navs"]:
            all_navs.append({"source_url": url, **n})
        for im in rec["images"]:
            image_occurrences.append({"page_url": url, "wp_id": cid, "usage_type": "inline",
                                      "src": im.get("src", ""), "srcset_urls": im.get("srcset_urls", []),
                                      "alt": im.get("alt", ""), "title_attr": im.get("title", ""),
                                      "loading": im.get("loading", ""), "fetchpriority": im.get("fetchpriority", ""),
                                      "decoding": im.get("decoding", ""), "sizes": im.get("sizes", ""),
                                      "width_attr": im.get("width", ""), "height_attr": im.get("height", "")})
        if rec.get("featured_media"):
            image_occurrences.append({"page_url": url, "wp_id": cid, "usage_type": "featured_media_id",
                                      "media_id": rec["featured_media"], "src": "", "srcset_urls": [], "alt": "",
                                      "title_attr": "", "loading": "", "fetchpriority": "", "decoding": "", "sizes": "",
                                      "width_attr": "", "height_attr": ""})

    # Compact URL index: exact copy lives beside it in copy/*.
    url_rows = []
    for r in page_records:
        url_rows.append({
            "wp_type": r["wp_type"], "wp_id": r["wp_id"], "url": r["url"], "http_status": r["http_status"],
            "final_url": r["final_url"], "redirected": r["redirected"], "response_sha256": r["response_sha256"],
            "response_bytes": r["response_bytes"], "title": r["title"], "meta_description": r["meta_description"],
            "robots": r["robots"], "canonical": r["canonical"], "h1_count": r["h1_count"],
            "headings": r["headings"], "cta_count": len(r["ctas"]), "faq_count": len(r["faqs"]),
            "schema_count": len(r["schema_jsonld"]), "internal_link_count": len(r["links_internal"]),
            "external_link_count": len(r["links_external"]), "image_count": len(r["images"]),
            "wp_parent": r["wp_parent"], "featured_media": r["featured_media"], "wp_slug": r["wp_slug"],
        })
    (OUT / "urls.json").write_text(json.dumps(url_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(OUT / "urls.csv", url_rows, list(url_rows[0].keys()) if url_rows else ["url"])

    # Parent/page hierarchy.
    page_by_id = {int(p["id"]): p for p in pages if str(p.get("id", "")).isdigit()}
    children: dict[int, list[dict[str, Any]]] = defaultdict(list)
    roots: list[dict[str, Any]] = []
    for p in pages:
        parent = int(p.get("parent") or 0)
        if parent and parent in page_by_id:
            children[parent].append(p)
        else:
            roots.append(p)
    def emit_tree(items, depth=0):
        lines = []
        for p in sorted(items, key=lambda z: plain(z.get("title")).casefold()):
            lines.append(f"{'  ' * depth}- [{plain(p.get('title'))}]({p.get('link','')}) · ID {p.get('id')} · parent {p.get('parent',0)}")
            lines.extend(emit_tree(children.get(int(p["id"]), []), depth + 1))
        return lines
    tree_md = "# Árbol WordPress por parent_id · STAGING\n\n" + "\n".join(emit_tree(roots)) + "\n"
    (OUT / "tree" / "wordpress_parent_tree.md").write_text(tree_md, encoding="utf-8")

    # URL path hierarchy, useful where WordPress parent_id is flat but URL path is nested.
    path_nodes = {}
    for r in url_rows:
        path = urlparse(r["url"]).path.strip("/")
        parts = path.split("/") if path else ["/"]
        cur = ""
        for part in parts:
            prev = cur
            cur = (cur + "/" + part).replace("//", "/")
            path_nodes.setdefault(cur, {"path": cur, "parent_path": prev or "/", "has_content_url": False, "url": ""})
        path_nodes[cur]["has_content_url"] = True
        path_nodes[cur]["url"] = r["url"]
    write_csv(OUT / "tree" / "path_tree.csv", path_nodes.values(), ["path", "parent_path", "has_content_url", "url"])

    # Internal/external/dependency graph files.
    write_csv(OUT / "tree" / "internal_links.csv", all_internal, ["source_url", "target_url", "anchor", "rel", "target"])
    write_csv(OUT / "tree" / "external_links.csv", all_external, ["source_url", "target_url", "anchor", "rel"])
    write_csv(OUT / "tree" / "dependencies.csv", all_deps, ["source_url", "type", "target", "label"])
    (OUT / "tree" / "nav_structures.json").write_text(json.dumps(all_navs, ensure_ascii=False, indent=2), encoding="utf-8")

    # Validate unique internal HTTP destinations without mutating anything.
    targets = sorted({x["target_url"] for x in all_internal if x["target_url"].startswith("http") and same_site(x["target_url"])})
    target_status = []
    def check_target(u: str) -> dict[str, Any]:
        try:
            rr = requests.get(u, headers={"User-Agent": UA, "Cache-Control": "no-cache"}, timeout=TIMEOUT,
                              allow_redirects=True, stream=True)
            return {"target_url": u, "http_status": rr.status_code, "final_url": rr.url,
                    "redirected": rr.url.rstrip("/") != u.rstrip("/")}
        except Exception as exc:
            return {"target_url": u, "http_status": "", "final_url": "", "redirected": "", "error": str(exc)}
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(check_target, u): u for u in targets}
        for fut in as_completed(futs):
            target_status.append(fut.result())
    target_status.sort(key=lambda x: x["target_url"])
    write_csv(OUT / "tree" / "internal_target_status.csv", target_status,
              ["target_url", "http_status", "final_url", "redirected", "error"])

    # Media registry and binary evidence.
    media = wp_media_collection()
    media_hash: dict[int, dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(download_hash_media, m): int(m["id"]) for m in media if m.get("media_type") == "image"}
        for fut in as_completed(futs):
            res = fut.result()
            media_hash[int(res["id"])] = res

    # Build variant URL/filename -> media id resolver.
    url_to_mid: dict[str, int] = {}
    basename_to_mid: dict[str, int] = {}
    for m in media:
        mid = int(m["id"])
        src = normalize_url(m.get("source_url", ""))
        if src:
            url_to_mid[src] = mid
            basename_to_mid[os.path.basename(urlparse(src).path)] = mid
        sizes = (m.get("media_details") or {}).get("sizes") or {}
        base_dir = src.rsplit("/", 1)[0] + "/" if src else ""
        for sv in sizes.values():
            fn = sv.get("file") if isinstance(sv, dict) else None
            if fn:
                basename_to_mid[fn] = mid
                if base_dir:
                    url_to_mid[base_dir + fn] = mid

    usage_by_mid: dict[int, list[dict[str, Any]]] = defaultdict(list)
    unresolved_usage = []
    for u in image_occurrences:
        mid = u.get("media_id")
        candidates = [u.get("src", "")] + list(u.get("srcset_urls") or [])
        if not mid:
            for c in candidates:
                if not c:
                    continue
                mid = url_to_mid.get(c) or basename_to_mid.get(os.path.basename(urlparse(c).path))
                if mid:
                    break
        if mid:
            u["media_id"] = int(mid)
            usage_by_mid[int(mid)].append(u)
        else:
            unresolved_usage.append(u)

    image_rows = []
    for m in media:
        if m.get("media_type") != "image":
            continue
        mid = int(m["id"])
        md = m.get("media_details") or {}
        w = md.get("width") or ""
        h = md.get("height") or ""
        ratio = round(float(w) / float(h), 6) if w and h else ""
        caption = plain(m.get("caption"))
        desc = plain(m.get("description"))
        title = plain(m.get("title"))
        text_meta = "\n".join([title, caption, desc])
        hs = media_hash.get(mid, {})
        uses = usage_by_mid.get(mid, [])
        used_urls = sorted({x["page_url"] for x in uses})
        types = sorted({x.get("usage_type", "") for x in uses if x.get("usage_type")})
        loadings = sorted({x.get("loading", "") for x in uses if x.get("loading")})
        fps = sorted({x.get("fetchpriority", "") for x in uses if x.get("fetchpriority")})
        decs = sorted({x.get("decoding", "") for x in uses if x.get("decoding")})
        sizes_values = sorted({x.get("sizes", "") for x in uses if x.get("sizes")})
        src = normalize_url(m.get("source_url", ""))
        attached = int(m.get("post") or 0)
        attached_obj = page_by_id.get(attached)
        image_rows.append({
            "media_id": mid,
            "media_url": src,
            "assigned_post_id": attached,
            "assigned_page": attached_obj.get("link", "") if attached_obj else "",
            "filename": os.path.basename(urlparse(src).path),
            "alt": m.get("alt_text", "") or "",
            "title": title,
            "caption": caption,
            "description": desc,
            "width": w,
            "height": h,
            "ratio": ratio,
            "format": m.get("mime_type", ""),
            "bytes": hs.get("bytes_downloaded") or md.get("filesize") or "",
            "loading": loadings,
            "fetchpriority": fps,
            "decoding": decs,
            "srcset_present": any(bool(x.get("srcset_urls")) for x in uses),
            "sizes": sizes_values,
            "source_origin": source_guess(text_meta),
            "rights_license": license_guess(text_meta),
            "sha256": hs.get("sha256", ""),
            "perceptual_hash": hs.get("perceptual_hash", ""),
            "binary_ok": hs.get("binary_ok", False),
            "binary_error": hs.get("binary_error", ""),
            "usage_types": types,
            "used_on_urls": used_urls,
            "usage_count": len(uses),
            "unattached_wp": not bool(attached),
            "checked_at": NOW,
        })

    # Exact + same-pHash + near-pHash duplicate groups.
    sha_groups: dict[str, list[int]] = defaultdict(list)
    ph_groups: dict[str, list[int]] = defaultdict(list)
    for x in image_rows:
        if x["sha256"]:
            sha_groups[x["sha256"]].append(int(x["media_id"]))
        if x["perceptual_hash"]:
            ph_groups[x["perceptual_hash"]].append(int(x["media_id"]))
    duplicate_sha = [{"sha256": h, "media_ids": ids, "count": len(ids)} for h, ids in sha_groups.items() if len(ids) > 1]
    duplicate_ph = [{"perceptual_hash": h, "media_ids": ids, "count": len(ids)} for h, ids in ph_groups.items() if len(ids) > 1]

    # Near duplicates: Hamming distance <= 4 for 64-bit pHash.
    ph_items = [(int(x["media_id"]), x["perceptual_hash"]) for x in image_rows if x["perceptual_hash"]]
    near = []
    for i in range(len(ph_items)):
        a_id, a = ph_items[i]
        ai = int(a, 16)
        for j in range(i + 1, len(ph_items)):
            b_id, b = ph_items[j]
            d = (ai ^ int(b, 16)).bit_count()
            if d <= 4:
                near.append({"media_id_a": a_id, "media_id_b": b_id, "phash_distance": d})

    # Duplicate status back into image master.
    sha_dup_ids = {mid for g in duplicate_sha for mid in g["media_ids"]}
    ph_dup_ids = {mid for g in duplicate_ph for mid in g["media_ids"]}
    near_ids = {x["media_id_a"] for x in near} | {x["media_id_b"] for x in near}
    for x in image_rows:
        flags = []
        mid = int(x["media_id"])
        if mid in sha_dup_ids: flags.append("EXACT_SHA256_DUPLICATE")
        if mid in ph_dup_ids: flags.append("EXACT_PHASH_DUPLICATE")
        if mid in near_ids: flags.append("NEAR_PHASH_DUPLICATE")
        x["duplicate_status"] = flags or ["UNIQUE_BY_AVAILABLE_HASHES"]

    (OUT / "images" / "images.json").write_text(json.dumps(image_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    image_fields = list(image_rows[0].keys()) if image_rows else ["media_id"]
    write_csv(OUT / "images" / "images.csv", image_rows, image_fields)
    write_csv(OUT / "images" / "image_usage.csv", [u for uses in usage_by_mid.values() for u in uses],
              ["media_id", "page_url", "wp_id", "usage_type", "src", "srcset_urls", "alt", "title_attr",
               "loading", "fetchpriority", "decoding", "sizes", "width_attr", "height_attr"])
    write_csv(OUT / "images" / "unresolved_image_usage.csv", unresolved_usage,
              ["page_url", "wp_id", "usage_type", "src", "srcset_urls", "alt", "title_attr", "loading",
               "fetchpriority", "decoding", "sizes", "width_attr", "height_attr"])
    write_csv(OUT / "images" / "duplicates_sha256.csv", duplicate_sha, ["sha256", "media_ids", "count"])
    write_csv(OUT / "images" / "duplicates_phash.csv", duplicate_ph, ["perceptual_hash", "media_ids", "count"])
    write_csv(OUT / "images" / "near_duplicates_phash.csv", near, ["media_id_a", "media_id_b", "phash_distance"])
    missing_meta = []
    for x in image_rows:
        missing = [k for k in ("alt", "title", "caption", "description") if not x.get(k)]
        if not x.get("source_origin"): missing.append("source_origin")
        if not x.get("rights_license"): missing.append("rights_license")
        if not x.get("sha256"): missing.append("sha256")
        if not x.get("perceptual_hash"): missing.append("perceptual_hash")
        if missing:
            missing_meta.append({"media_id": x["media_id"], "filename": x["filename"], "media_url": x["media_url"],
                                 "missing_fields": missing, "used_on_urls": x["used_on_urls"]})
    write_csv(OUT / "images" / "missing_metadata.csv", missing_meta,
              ["media_id", "filename", "media_url", "missing_fields", "used_on_urls"])

    # Tree/dependency summary.
    status_counts = defaultdict(int)
    broken = []
    redirects = []
    for x in target_status:
        status_counts[str(x.get("http_status", "ERR"))] += 1
        try:
            code = int(x.get("http_status"))
        except Exception:
            code = 0
        if code >= 400 or code == 0:
            broken.append(x)
        if x.get("redirected"):
            redirects.append(x)
    write_csv(OUT / "tree" / "broken_internal_targets.csv", broken,
              ["target_url", "http_status", "final_url", "redirected", "error"])
    write_csv(OUT / "tree" / "redirected_internal_targets.csv", redirects,
              ["target_url", "http_status", "final_url", "redirected", "error"])

    manifest = {
        "schema": "CEREBRO_FENIX_STAGING_BASELINE_V1",
        "generated_at": NOW,
        "company_id": "fenix-capital",
        "environment": "STAGING",
        "base_url": BASE,
        "prod_touched": False,
        "counts": {
            "wp_pages": len(pages), "wp_posts": len(posts), "wp_categories": len(cats),
            "content_urls_snapshotted": len(page_records), "media_total": len(media),
            "images": len(image_rows), "internal_link_edges": len(all_internal),
            "external_link_edges": len(all_external), "dependency_edges": len(all_deps),
            "unique_internal_http_targets_checked": len(target_status), "broken_internal_targets": len(broken),
            "redirected_internal_targets": len(redirects), "exact_sha_duplicate_groups": len(duplicate_sha),
            "exact_phash_duplicate_groups": len(duplicate_ph), "near_phash_pairs_distance_le_4": len(near),
            "errors": len(errors),
        },
        "http_status_counts_internal_targets": dict(status_counts),
        "limitations": [
            "Exact copy is captured from the real visitor HTTP response and public WordPress REST rendered content; private editor-only raw block markup is intentionally not required.",
            "Source/rights fields are copied/inferred only from media title/caption/description. Empty values are reported, never invented.",
            "SHA256/pHash exist only when the public image binary could be retrieved during this run.",
            "STAGING robots/canonical behavior is preserved as evidence and must not be mistaken for PROD intent.",
        ],
        "files": {
            "url_master": "urls.csv / urls.json",
            "exact_copy": "copy/*.html + copy/*.txt + copy/*.json",
            "tree": "tree/wordpress_parent_tree.md + tree/path_tree.csv",
            "link_graph": "tree/internal_links.csv + tree/internal_target_status.csv",
            "dependencies": "tree/dependencies.csv",
            "images": "images/images.csv + images/images.json + images/image_usage.csv",
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")

    readme = f"""# FÉNIX CAPITAL · STAGING WHOLE-SITE BASELINE\n\nGenerated: `{NOW}`  \nEnvironment: `STAGING`  \nPROD touched: **NO**\n\n## Scope\n\nThis is the pre-production preservation snapshot requested before any official-site promotion. It contains exact HTTP HTML and visible copy per public content URL, the WordPress/path tree, internal/external/dependency graphs, and the image master registry with usage, metadata, SHA256 and perceptual pHash when retrievable.\n\n## Counts\n\n- WordPress pages: **{len(pages)}**\n- Posts: **{len(posts)}**\n- Categories: **{len(cats)}**\n- Content URLs snapshotted: **{len(page_records)}**\n- Media objects: **{len(media)}**\n- Images: **{len(image_rows)}**\n- Internal link edges: **{len(all_internal)}**\n- Unique internal targets checked: **{len(target_status)}**\n- Broken internal targets: **{len(broken)}**\n- Redirected internal targets: **{len(redirects)}**\n- Export errors: **{len(errors)}**\n\n## Rule\n\nThis baseline preserves evidence. Missing metadata, source/rights or hashes are marked missing; they are never fabricated. No result in this package authorizes PROD.\n"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    # SHA256 every generated evidence file (except checksum file itself).
    sums = []
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p.name != "SHA256SUMS.txt":
            sums.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="utf-8")

    print(json.dumps(manifest["counts"], ensure_ascii=False, indent=2), flush=True)
    if not page_records:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
