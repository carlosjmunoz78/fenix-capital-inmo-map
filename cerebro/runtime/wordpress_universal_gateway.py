"""PLUGIN-UNIVERSAL-001 · deterministic capability gateway V0.

This module does not talk to WordPress directly. It normalizes capability
contracts for existing WordPress providers and enforces CEREBRO scope/policy
before any external adapter is invoked.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable

ENGINE_ID = "PLUGIN-UNIVERSAL-001"
ENGINE_VERSION = "0.1.0"

CANONICAL_HUMAN_CODES = {
    "LEGAL_REQUIRED",
    "SIGNATURE_REQUIRED",
    "LOW_CONFIDENCE",
    "HIGH_RISK",
    "POLICY_CONFLICT",
    "SECURITY_INCIDENT",
    "MONEY_LIMIT",
    "CUSTOMER_HUMAN_REQUEST",
}


class Capability(str, Enum):
    DISCOVER = "DISCOVER"
    CONTENT_READ = "CONTENT_READ"
    CONTENT_DRAFT = "CONTENT_DRAFT"
    CONTENT_PUBLISH = "CONTENT_PUBLISH"
    SEO_READ = "SEO_READ"
    SEO_WRITE = "SEO_WRITE"
    MEDIA_READ = "MEDIA_READ"
    MEDIA_WRITE = "MEDIA_WRITE"
    LEAD_CAPTURE = "LEAD_CAPTURE"
    FORM_MANAGE = "FORM_MANAGE"
    LEAD_MAGNET = "LEAD_MAGNET"
    NEWSLETTER_MANAGE = "NEWSLETTER_MANAGE"
    NEWSLETTER_SEND = "NEWSLETTER_SEND"
    CACHE_READ = "CACHE_READ"
    CACHE_PURGE = "CACHE_PURGE"
    VERIFY = "VERIFY"
    BACKUP = "BACKUP"
    ROLLBACK = "ROLLBACK"
    REBUILD = "REBUILD"


@dataclass(frozen=True)
class TenantScope:
    company_id: str
    environment: str
    version: str


@dataclass(frozen=True)
class ProviderBinding:
    capability: Capability
    provider: str
    operation: str
    effect: str  # READ_ONLY | MUTATION | EXTERNAL_DELIVERY
    prod_allowed: bool = False


@dataclass(frozen=True)
class GatewayRequest:
    scope: TenantScope
    capability: Capability
    idempotency_key: str
    confirmed: bool = False


@dataclass(frozen=True)
class GatewayDecision:
    allowed: bool
    decision: str
    human_required_code: str | None = None
    provider: str | None = None
    operation: str | None = None


class UniversalPluginGateway:
    def __init__(self, *, scope: TenantScope) -> None:
        if not scope.company_id.strip():
            raise ValueError("company_id is required")
        if scope.environment not in {"LAB", "PREPROD", "PROD"}:
            raise ValueError("invalid environment")
        self.scope = scope
        self._bindings: dict[Capability, ProviderBinding] = {}

    def bind(self, binding: ProviderBinding) -> None:
        if binding.effect not in {"READ_ONLY", "MUTATION", "EXTERNAL_DELIVERY"}:
            raise ValueError("invalid effect")
        if binding.capability in self._bindings:
            raise ValueError(f"duplicate binding for {binding.capability.value}")
        self._bindings[binding.capability] = binding

    def decide(self, request: GatewayRequest) -> GatewayDecision:
        if request.scope != self.scope:
            return GatewayDecision(False, "DENY_SCOPE_MISMATCH", "POLICY_CONFLICT")

        binding = self._bindings.get(request.capability)
        if binding is None:
            return GatewayDecision(False, "DENY_CAPABILITY_UNBOUND", "POLICY_CONFLICT")

        if not request.idempotency_key.strip():
            return GatewayDecision(False, "DENY_IDEMPOTENCY_REQUIRED", "POLICY_CONFLICT")

        if request.scope.environment == "PROD":
            if not binding.prod_allowed:
                return GatewayDecision(False, "DENY_PROD_NOT_PROMOTED", "HIGH_RISK")
            if binding.effect != "READ_ONLY" and not request.confirmed:
                return GatewayDecision(False, "DENY_PROD_CONFIRMATION_REQUIRED", "HIGH_RISK")

        if binding.effect in {"MUTATION", "EXTERNAL_DELIVERY"} and not request.confirmed:
            return GatewayDecision(False, "DENY_CONFIRMATION_REQUIRED", "HIGH_RISK")

        return GatewayDecision(
            True,
            "ALLOW",
            provider=binding.provider,
            operation=binding.operation,
        )

    def execute(
        self,
        request: GatewayRequest,
        *,
        adapters: dict[str, Callable[[str, GatewayRequest], Any]],
    ) -> Any:
        decision = self.decide(request)
        if not decision.allowed:
            return decision
        adapter = adapters.get(decision.provider or "")
        if adapter is None:
            return GatewayDecision(False, "DENY_PROVIDER_UNAVAILABLE", "POLICY_CONFLICT")
        return adapter(decision.operation or "", request)

    def inventory(self) -> dict[str, dict[str, Any]]:
        return {
            cap.value: {
                "provider": binding.provider,
                "operation": binding.operation,
                "effect": binding.effect,
                "prod_allowed": binding.prod_allowed,
            }
            for cap, binding in sorted(self._bindings.items(), key=lambda x: x[0].value)
        }


def fenix_live_binding_plan() -> tuple[ProviderBinding, ...]:
    """Evidence-backed provider plan. Missing capabilities stay intentionally unbound."""
    return (
        ProviderBinding(Capability.DISCOVER, "cowboy", "wp_get_rest_routes", "READ_ONLY"),
        ProviderBinding(Capability.CONTENT_READ, "cowboy", "wp_get_post", "READ_ONLY"),
        ProviderBinding(Capability.CONTENT_DRAFT, "cowboy", "wp_create_post:draft", "MUTATION"),
        ProviderBinding(Capability.CONTENT_PUBLISH, "core_guard", "publish-post-transaction", "MUTATION"),
        ProviderBinding(Capability.SEO_READ, "cowboy", "wp_seo_get_meta", "READ_ONLY"),
        ProviderBinding(Capability.SEO_WRITE, "cowboy", "wp_seo_update_meta", "MUTATION"),
        ProviderBinding(Capability.MEDIA_READ, "cowboy", "wp_list_media", "READ_ONLY"),
        ProviderBinding(Capability.MEDIA_WRITE, "cowboy", "wp_upload_media", "MUTATION"),
        ProviderBinding(Capability.LEAD_CAPTURE, "fenix_cerebro_leads", "fenix-cerebro/v1/lead", "EXTERNAL_DELIVERY"),
        ProviderBinding(Capability.FORM_MANAGE, "hostinger_reach", "forms:get+post", "MUTATION"),
        ProviderBinding(Capability.LEAD_MAGNET, "fenix_cerebro_leads", "lead_magnet_gate", "MUTATION"),
        ProviderBinding(Capability.NEWSLETTER_MANAGE, "brevo", "contacts+lists+emailCampaigns:create_update_schedule", "MUTATION"),\n        ProviderBinding(Capability.NEWSLETTER_SEND, "brevo", "emailCampaigns:sendNow_or_scheduledAt", "EXTERNAL_DELIVERY"),
        ProviderBinding(Capability.CACHE_READ, "cowboy", "wp_cache_get_provider", "READ_ONLY"),
        ProviderBinding(Capability.CACHE_PURGE, "core_guard", "purge-cache-url", "MUTATION"),
        ProviderBinding(Capability.VERIFY, "core_guard", "live-verify-page", "READ_ONLY"),
        ProviderBinding(Capability.BACKUP, "cowboy", "wp_create_checkpoint", "MUTATION"),
        ProviderBinding(Capability.ROLLBACK, "cowboy", "wp_undo_change", "MUTATION"),
        ProviderBinding(Capability.REBUILD, "cerebro_maintenance", "run-once", "MUTATION"),
    )


def build_fenix_preprod_gateway() -> UniversalPluginGateway:
    gateway = UniversalPluginGateway(
        scope=TenantScope("fenix-capital", "PREPROD", ENGINE_VERSION)
    )
    for binding in fenix_live_binding_plan():
        gateway.bind(binding)
    return gateway
