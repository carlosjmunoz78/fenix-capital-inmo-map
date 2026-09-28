"""Universal WordPress business contracts for PLUGIN-UNIVERSAL-001.

Pure deterministic contracts only. They do not send mail or mutate WordPress.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from cerebro.runtime.wordpress_company_config import load_company_wordpress_config

VALID_ENVIRONMENTS = {"LAB", "PREPROD", "PROD"}
NEWSLETTER_STREAMS = {"PARTICULARES", "INMOBILIARIAS"}


@dataclass(frozen=True)
class CompanyWebProfile:
    company_id: str
    environment: str
    version: str
    primary_domain: str
    public_email: str
    lead_endpoint: str
    wordpress_base_url: str

    def validate(self) -> None:
        if not self.company_id.strip():
            raise ValueError("company_id is required")
        if self.environment not in VALID_ENVIRONMENTS:
            raise ValueError("invalid environment")
        for name, value in (
            ("primary_domain", self.primary_domain),
            ("public_email", self.public_email),
            ("lead_endpoint", self.lead_endpoint),
            ("wordpress_base_url", self.wordpress_base_url),
        ):
            if not str(value).strip():
                raise ValueError(f"{name} is required")


@dataclass(frozen=True)
class FormContract:
    form_key: str
    company_id: str
    audience: str
    required_fields: tuple[str, ...]
    consent_privacy_required: bool = True
    consent_marketing_default: bool = False
    provider: str = "hostinger_reach"

    def validate(self) -> None:
        if not self.form_key.strip():
            raise ValueError("form_key is required")
        if not self.company_id.strip():
            raise ValueError("company_id is required")
        if not ({"email", "phone", "email_or_phone"} & set(self.required_fields)):
            raise ValueError("at least email or phone must be required")
        if not self.consent_privacy_required:
            raise ValueError("privacy consent must remain required")


@dataclass(frozen=True)
class NewsletterStreamContract:
    stream_id: str
    company_id: str
    audience: str
    cadence: str
    requires_marketing_consent: bool
    provider: str | None = None
    enabled: bool = False

    def validate(self) -> None:
        if self.audience not in NEWSLETTER_STREAMS:
            raise ValueError("invalid newsletter audience")
        if self.cadence != "WEEKLY":
            raise ValueError("V0 newsletter cadence must be WEEKLY")
        if not self.requires_marketing_consent:
            raise ValueError("marketing consent is mandatory")
        if self.enabled and not self.provider:
            raise ValueError("enabled stream requires provider")


def fenix_company_profile(environment: str = "PREPROD") -> CompanyWebProfile:
    config = load_company_wordpress_config("fenix-capital")
    profile = CompanyWebProfile(
        company_id=config["company_id"],
        environment=environment,
        version=config["version"],
        primary_domain=config["primary_domain"],
        public_email=config["public_email"],
        lead_endpoint=config["lead_endpoint"],
        wordpress_base_url=config["wordpress_base_url"],
    )
    profile.validate()
    return profile


def fenix_form_contracts() -> tuple[FormContract, ...]:
    contracts = (
        FormContract(
            form_key="lead_general",
            company_id="fenix-capital",
            audience="PARTICULARES",
            required_fields=("email_or_phone",),
        ),
        FormContract(
            form_key="lead_magnet",
            company_id="fenix-capital",
            audience="PARTICULARES",
            required_fields=("email",),
        ),
        FormContract(
            form_key="partner_inmobiliaria",
            company_id="fenix-capital",
            audience="INMOBILIARIAS",
            required_fields=("email", "name"),
        ),
    )
    for item in contracts:
        item.validate()
    return contracts


def fenix_newsletter_streams() -> tuple[NewsletterStreamContract, ...]:
    # Reach public API can prepare templates and draft campaigns. Sending/scheduling
    # remains disabled until an official writable send/schedule contract is verified.
    streams = (
        NewsletterStreamContract(
            stream_id="newsletter_particulares",
            company_id="fenix-capital",
            audience="PARTICULARES",
            cadence="WEEKLY",
            requires_marketing_consent=True,
            provider="hostinger_reach_api",
            enabled=False,
        ),
        NewsletterStreamContract(
            stream_id="newsletter_inmobiliarias",
            company_id="fenix-capital",
            audience="INMOBILIARIAS",
            cadence="WEEKLY",
            requires_marketing_consent=True,
            provider="hostinger_reach_api",
            enabled=False,
        ),
    )
    for item in streams:
        item.validate()
    return streams


def unique_ids(items: Iterable[object], attr: str) -> bool:
    values = [getattr(item, attr) for item in items]
    return len(values) == len(set(values))
