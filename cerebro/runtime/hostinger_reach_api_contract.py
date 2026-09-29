"""Hostinger Reach public API contract used by PLUGIN-UNIVERSAL-001.

No credentials are stored here. The caller must inject a bearer token through
an authorized secret provider. V0 supports safe preparation: templates,
draft campaigns, profiles/domains, contacts/tags and statistics. It does not
pretend to expose campaign send/schedule when the documented API surface does
not provide that operation.
"""
from __future__ import annotations

from dataclasses import dataclass

BASE_PATH = "/api/reach/v1"

@dataclass(frozen=True)
class ReachRoute:
    method: str
    path_template: str
    effect: str
    purpose: str


PUBLIC_API_ROUTES = {
    "profiles_list": ReachRoute("GET", f"{BASE_PATH}/profiles", "READ_ONLY", "discover profiles"),
    "profile_domain": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/domains", "READ_ONLY", "verify sending domain"),
    "profile_features": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/features", "READ_ONLY", "plan feature access"),
    "profile_limits": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/limits", "READ_ONLY", "remaining email and recipient limits"),
    "segments_create": ReachRoute("POST", f"{BASE_PATH}/segmentation/segments", "MUTATION", "create audience segment"),
    "templates_list": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/templates", "READ_ONLY", "list reusable templates"),
    "template_create": ReachRoute("POST", f"{BASE_PATH}/profiles/{{profile_uuid}}/templates", "MUTATION_DRAFT", "create reusable email template"),
    "campaigns_list": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/campaigns", "READ_ONLY", "list campaigns"),
    "campaign_create_draft": ReachRoute("POST", f"{BASE_PATH}/profiles/{{profile_uuid}}/campaigns", "MUTATION_DRAFT", "create draft campaign"),
    "campaign_stats": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/campaigns/{{campaign_uuid}}/statistics", "READ_ONLY", "campaign performance"),
    "contacts_create": ReachRoute("POST", f"{BASE_PATH}/profiles/{{profile_uuid}}/contacts", "EXTERNAL_DELIVERY", "create contact"),
    "tags_create": ReachRoute("POST", f"{BASE_PATH}/profiles/{{profile_uuid}}/tags", "MUTATION", "create or find tags"),
    "automations_list": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/automations", "READ_ONLY", "list automations"),
    "automation_steps": ReachRoute("GET", f"{BASE_PATH}/profiles/{{profile_uuid}}/automations/{{automation_uuid}}/steps", "READ_ONLY", "inspect automation steps"),
}

UNSUPPORTED_V0 = {
    "campaign_schedule",
    "campaign_send",
    "automation_create",
    "automation_update",
    "automation_activate",
}


def route(name: str, **params: str) -> ReachRoute:
    spec = PUBLIC_API_ROUTES[name]
    path = spec.path_template.format(**params)
    return ReachRoute(spec.method, path, spec.effect, spec.purpose)


def can_autonomously_send_campaign() -> bool:
    return False


def newsletter_preparation_capabilities() -> tuple[str, ...]:
    """Newsletter usage is intentionally forbidden; Brevo is canonical."""
    return ()
