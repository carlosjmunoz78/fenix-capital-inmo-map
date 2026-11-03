"""Privacy-safe DOC-001..004 evidence boundary. No raw document text or customer identifiers."""
from __future__ import annotations
import json
from typing import Any
from doc001_004_pipeline_v1 import Doc004AnomalyEngine

SCOPE_FIELDS=("company_id","engine_id","environment","version")
ALLOWED_FAMILIES={"IDENTITY","INCOME","BANK","PROPERTY","AMBIGUOUS","UNKNOWN"}
ALLOWED_SIGNALS={"DUPLICATE_HASH","QUALITY_RECOVERY_USED_OR_NEEDED","CLASSIFICATION_UNCERTAIN","ALTERATION_TERM_HEURISTIC"}
ALLOWED_HUMAN_EXCEPTIONS={None,"HIGH_RISK"}

def _string(value:Any,field:str)->str:
    if not isinstance(value,str) or not value.strip(): raise ValueError("DOC_EVIDENCE_SCOPE_INVALID:"+field)
    return value.strip()

def privacy_safe_evidence(result:dict[str,Any],known_hashes:set[str]|None=None)->dict[str,Any]:
    """Derive a bounded evidence projection. No free-text, source paths or original names cross the boundary."""
    scope={key:_string(result.get(key),key) for key in SCOPE_FIELDS}
    if scope["environment"] not in {"LAB","PREPROD"}: raise ValueError("DOC_EVIDENCE_PROD_DENIED")
    if not scope["engine_id"].startswith("DOC-"): raise ValueError("DOC_EVIDENCE_ENGINE_DENIED")
    digest=_string(result.get("document_sha256"),"document_sha256")
    if len(digest)!=64 or any(c not in "0123456789abcdef" for c in digest): raise ValueError("DOC_EVIDENCE_HASH_INVALID")
    quality=result.get("quality") or {}
    classification=result.get("classification") or {}
    family=classification.get("family","UNKNOWN")
    if family not in ALLOWED_FAMILIES:family="UNKNOWN"
    reasons=[x for x in (quality.get("reasons") or []) if x in {"LOW_RESOLUTION","POSSIBLE_BLUR","NO_PAGES"}]
    risk=Doc004AnomalyEngine().score(result,known_hashes=known_hashes)
    if risk["human_exception"] not in ALLOWED_HUMAN_EXCEPTIONS:raise ValueError("DOC_EVIDENCE_HUMAN_GATE_INVALID")
    safe={
      **scope,
      "document_sha256":digest,
      "quality":{
        "readable":quality.get("readable") is True,
        "page_count":int(quality.get("page_count") or 0),
        "needs_recovery":quality.get("needs_recovery") is True,
        "reasons":sorted(set(reasons)),
      },
      "classification":{
        "family":family,
        "confidence":round(max(0.0,min(1.0,float(classification.get("confidence") or 0))),3),
      },
      "anomaly":{
        "score":int(risk["score"]),
        "risk_level":risk["risk_level"],
        "signals":sorted(set(s for s in risk["signals"] if s in ALLOWED_SIGNALS)),
        "human_exception":risk["human_exception"],
        "automatic_accusation":False,
      },
      "raw_text_included":False,
      "source_file_path_included":False,
      "source_modified":False,
      "prod_write_authorized":False,
      "external_write_authorized":False,
      "trading_access":False,
      "additional_cost_eur":0,
    }
    return safe

def serialized_safe_evidence(result:dict[str,Any],known_hashes:set[str]|None=None)->str:
    return json.dumps(privacy_safe_evidence(result,known_hashes),sort_keys=True,ensure_ascii=False)
