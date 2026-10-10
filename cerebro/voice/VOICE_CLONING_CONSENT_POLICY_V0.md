# VOICE-001 · Voice Cloning Consent & Provenance Policy V0

Status: `CANONICAL_CANDIDATE / PREPROD_ONLY`

## Rule

CEREBRO may synthesize or clone a voice only when the reference is demonstrably authorized for that use.

Allowed reference classes:

- `OWNER_RECORDED`: speaker recorded their own voice for CEREBRO and explicitly authorized synthetic use.
- `EMPLOYEE_CONSENTED`: speaker gave explicit, revocable authorization defining scope.
- `LICENSED_VOICE_ASSET`: source license explicitly permits the intended synthesis/cloning and commercial scope when applicable.
- `SYNTHETIC_OWNED`: voice/reference was generated or commissioned with rights permitting reuse and derivation.

Denied by default:

- scraped social/video/audio;
- celebrities, politicians or other real people without permission;
- voice notes received for another purpose;
- unknown provenance;
- references whose license is ambiguous;
- cross-company reuse without explicit scope.

## Required metadata

Before status can advance from `REFERENCE_REQUIRED` or `QUARANTINED` to `LAB_READY`:

- `voice_id`
- `company_id`
- `speaker_owner_id` or licensed asset identifier
- `provenance_class`
- `consent_ref` or `license_ref`
- `allowed_purposes`
- `prohibited_purposes`
- `created_at`
- `verified_at`
- `revocation_method`
- `reference_sha256`
- `reference_storage_ref`
- `retention_policy`

Raw reference audio must not be committed to Git.

## Revocation

Revocation marks the voice `REVOKED`, disables new synthesis and invalidates runtime caches where technically possible. Historical audit records may retain non-audio metadata required for accountability.

## Security

Voice references are sensitive biometric-adjacent media. Apply minimum privilege, encryption at rest/in transit, company isolation, audit and explicit retention. Do not place raw recordings in prompts, logs, public buckets or general Notion pages.

## External use

Synthetic audio must not be used to impersonate a person deceptively, bypass authentication, commit fraud, mislead customers about who is speaking, or evade platform controls.

## Human exception

Use the existing canonical exceptions when relevant: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
