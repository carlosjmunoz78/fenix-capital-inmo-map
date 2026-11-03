#!/usr/bin/env python3
"""Physical PREPROD-only DOC001..004 integration on synthetic documents. No customer data."""
from __future__ import annotations
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw
from doc001_004_pipeline_v1 import (
    Doc001Pipeline, Doc002PendingLifecycle, Doc003QualityGate,
    Doc004AnomalyEngine, sha256_file,
)

def check(condition: bool, reason: str) -> None:
    if not condition:
        raise AssertionError(reason)

def synthetic_image(path: Path, *, blur: bool) -> None:
    image = Image.new("RGB", (850, 1100), "white")
    paint = ImageDraw.Draw(image)
    if blur:
        # Completely uniform fixture gives deterministic LOW_BLUR evidence.
        paint.rectangle((0, 0, 849, 1099), fill="white")
    else:
        for y in range(60, 900, 45):
            paint.rectangle((60, y, 720, y + 4), fill="black")
        paint.rectangle((50, 50, 800, 1000), outline="black", width=4)
    image.save(path)

def run() -> dict:
    with tempfile.TemporaryDirectory(prefix="cerebro-doc-preprod-") as tmp:
        folder = Path(tmp)
        normal = folder / "synthetic-normal.png"
        blurry = folder / "synthetic-blurry.png"
        synthetic_image(normal, blur=False)
        synthetic_image(blurry, blur=True)
        original_hash = {p.name: sha256_file(p) for p in [normal, blurry]}
        pipeline = Doc001Pipeline()
        meta = dict(company_id="fenix", engine_id="DOC-001", environment="PREPROD", version="v1")
        normal_result = pipeline.process(normal, meta)
        blurry_result = pipeline.process(blurry, meta)
        check(normal_result["document_sha256"] == original_hash[normal.name], "DOC001_NORMAL_HASH")
        check(blurry_result["document_sha256"] == original_hash[blurry.name], "DOC001_BLUR_HASH")
        check(normal_result["source_modified"] is False and blurry_result["source_modified"] is False, "DOC001_SOURCE_DESTRUCTIVE")
        check(normal_result["prod_write_authorized"] is False, "DOC001_PROD_WRITE")
        check(normal_result["quality"]["needs_recovery"] is False, "DOC003_NORMAL_QUALITY")
        check(blurry_result["quality"]["needs_recovery"] is True, "DOC003_BLUR_DETECTION")
        quality = Doc003QualityGate().inspect_image(blurry)
        check("POSSIBLE_BLUR" in quality.reasons, "DOC003_BLUR_REASON")
        lifec = Doc002PendingLifecycle("fenix", "SYNTHETIC-CASE")
        for transition in ("REQUESTED", "RECEIVED", "CLASSIFIED", "VALIDATED", "CLOSED"):
            lifec.move(transition, "SYNTHETIC_FIXTURE_EVIDENCE")
        check(lifec.state == "CLOSED" and len(lifec.events) == 5, "DOC002_LIFECYCLE")
        try:
            lifec.move("RECEIVED", "synthetic")
            raise AssertionError("DOC002_CLOSED_REOPEN_ALLOWED")
        except ValueError:
            pass
        scoring = Doc004AnomalyEngine()
        normal_score = scoring.score(normal_result)
        high_score = scoring.score(blurry_result, known_hashes={original_hash[blurry.name]})
        check(normal_score["accusation"] is False, "DOC004_ACCUSATION_NORMAL")
        check(high_score["risk_level"] == "HIGH", "DOC004_HIGH_RISK_MISSING")
        check(high_score["human_exception"] == "HIGH_RISK", "DOC004_HUMAN_EXCEPTION")
        check(high_score["accusation"] is False and high_score["evidence_only"] is True, "DOC004_AUTO_ACCUSATION")
        check(all(sha256_file(p) == original_hash[p.name] for p in [normal, blurry]), "DOC_FIXTURE_MODIFIED")
        try:
            pipeline.process(normal, {**meta, "environment": "PROD"})
            raise AssertionError("DOC_PROD_PERMITTED")
        except ValueError as exc:
            check("DOC_PROD_WRITE_DENIED" in str(exc), "DOC_PROD_WRONG_DENIAL")
        other = pipeline.process(normal, {**meta, "company_id": "other-company"})
        check(other["company_id"] == "other-company", "DOC_TENANT_SCOPE")
        check(other["document_sha256"] == original_hash[normal.name], "DOC_TENANT_RESULT")
        return {
            "schema_version": "1.0.0",
            "status": "GREEN_SYNTHETIC_PHYSICAL_E2E",
            "engines": ["DOC-001", "DOC-002", "DOC-003", "DOC-004"],
            "environment": "PREPROD",
            "tests": {
                "actual_image_processing": True,
                "file_hash_integrity": True,
                "quality_good_and_blurred": True,
                "missing_to_closed_lifecycle": True,
                "invalid_transition_denied": True,
                "high_risk_human_exception": True,
                "no_automatic_fraud_accusation": True,
                "tenant_scope": True,
                "prod_write_rejected": True,
                "source_nondestructive": True,
            },
            "limits": {
                "documents_synthetic_only": True,
                "real_customer_intake_integrated": False,
                "external_communications_integrated": False,
                "production_storage_integrated": False,
                "representative_real_document_corpus_verified": False,
                "prod_promotion_authorized": False
            },
            "customer_data_used": False,
            "prod_writes": False,
            "trading_access": False,
            "additional_cost_eur": 0,
        }

if __name__ == "__main__":
    result = run()
    directory = Path(os.environ.get("CEREBRO_DOC_EVIDENCE_OUT", "/tmp/cerebro-doc-physical-e2e"))
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "SUMMARY.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("DOC001_004_PHYSICAL_E2E=" + json.dumps(result, sort_keys=True))
