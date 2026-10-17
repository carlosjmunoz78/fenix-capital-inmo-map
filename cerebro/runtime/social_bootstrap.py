from __future__ import annotations

from dataclasses import dataclass, asdict
from hashlib import sha256
import json
from typing import Any

CHANNELS=("instagram","facebook","linkedin")
AUDIENCES={"instagram":"particulares","facebook":"particulares","linkedin":"inmobiliarias"}
DEFAULT_SLOTS={
    "instagram":{"weekday":"TUE","local_time":"11:00","timezone":"Europe/Madrid"},
    "linkedin":{"weekday":"WED","local_time":"09:30","timezone":"Europe/Madrid"},
    "facebook":{"weekday":"THU","local_time":"18:30","timezone":"Europe/Madrid"},
}
FORBIDDEN_CLAIMS=("garantizado","aprobación garantizada","100% aprobado","sin riesgo")

@dataclass(frozen=True)
class SocialPlanItem:
    channel:str
    audience:str
    pillar:str
    objective:str
    cta_mode:str
    weekday:str
    local_time:str
    timezone:str

class SocialBootstrap:
    """SOCBOOT-001 V0.2: deterministic social operating plan, no publishing."""

    def __init__(self, *, environment:str="PREPROD") -> None:
        if environment!="PREPROD":
            raise PermissionError("SOCBOOT-001 V0.2 only supports PREPROD")
        self.environment=environment

    @staticmethod
    def _check_company(company_id:str, payload:dict[str,Any], label:str)->None:
        if payload.get("company_id") not in (None, company_id):
            raise PermissionError(f"POLICY_CONFLICT: {label} company_id mismatch")

    @staticmethod
    def _pillars(business_model:dict[str,Any])->list[str]:
        raw=business_model.get("content_pillars") or [
            "educacion_hipotecaria",
            "preparacion_documental",
            "capacidad_de_compra",
            "colaboracion_inmobiliarias",
            "casos_y_procesos_sin_promesas",
        ]
        return [str(x).strip().lower().replace(" ","_") for x in raw if str(x).strip()]

    def plan(
        self,
        *,
        company_id:str,
        business_model_profile:dict[str,Any],
        social_audit:dict[str,Any],
        marketing_context:dict[str,Any]|None=None,
        evidence_at:str,
    )->dict[str,Any]:
        if not company_id or not evidence_at:
            raise ValueError("company_id and evidence_at are required")
        self._check_company(company_id,business_model_profile,"business_model_profile")
        self._check_company(company_id,social_audit,"social_audit")
        marketing_context=marketing_context or {}
        self._check_company(company_id,marketing_context,"marketing_context")

        pillars=self._pillars(business_model_profile)
        if not pillars:
            raise ValueError("at least one content pillar is required")

        items=[]
        for idx,channel in enumerate(CHANNELS):
            slot=DEFAULT_SLOTS[channel]
            pillar=pillars[idx % len(pillars)]
            objective="qualified_lead" if channel!="linkedin" else "professional_partnership"
            cta_mode="native_dm" if channel in {"instagram","facebook"} else "verified_destination"
            items.append(SocialPlanItem(channel,AUDIENCES[channel],pillar,objective,cta_mode,slot["weekday"],slot["local_time"],slot["timezone"]))

        guardrails={
            "publishing_enabled":False,
            "prod_enabled":False,
            "require_explicit_marketing_consent":True,
            "require_idempotency":True,
            "require_queue_reconciliation":True,
            "require_brand_qa":True,
            "require_claims_review":True,
            "require_verified_destination_or_native_handler":True,
            "newsletter_segments":{"particulares":"particulares","inmobiliarias":"inmobiliarias"},
            "forbidden_claim_fragments":list(FORBIDDEN_CLAIMS),
        }
        material={
            "company_id":company_id,
            "evidence_at":evidence_at,
            "items":[asdict(x) for x in items],
            "guardrails":guardrails,
        }
        digest=sha256(json.dumps(material,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
        return {
            "company_id":company_id,
            "engine_id":"SOCBOOT-001",
            "environment":self.environment,
            "version":"0.2.0",
            "evidence_at":evidence_at,
            "plan_sha256":digest,
            "content_pillars":pillars,
            "channel_plan":[asdict(x) for x in items],
            "guardrails":guardrails,
            "inputs_used":{
                "social_audit_version":social_audit.get("version"),
                "marketing_context_present":bool(marketing_context),
            },
            "autonomy":"PLAN_ONLY_UNTIL_PUBLISHING_GATES_PASS",
            "remote_write":False,
            "additional_cost_eur":0,
        }

    def health(self)->dict[str,Any]:
        return {
            "engine_id":"SOCBOOT-001",
            "version":"0.2.0",
            "environment":self.environment,
            "mode":"deterministic_plan_only",
            "publishing_enabled":False,
            "remote_write":False,
            "prod_enabled":False,
            "external_cost_eur":0,
        }
