# CEREBRO Android Final V2 · Call & Voice Intelligence Requirements

Status: DEFINIDO / mandatory acceptance capability family.
Environment: PREPROD until physical/legal gates are green.

## Objective

Work phones must become governed CEREBRO information nodes. With owner authorization and applicable legal notices/policies, CEREBRO must be able to ingest call audio when technically available, preserve call metadata, transcribe it, extract structured knowledge, link it to the correct company/contact/case, and make that information available to CEREBRO. The same device layer must support generated or recorded voice messages for owner-authorized communication through WhatsApp, WhatsApp Business, Telegram and other ordinary apps.

## Call capture adapter order

The APK must not assume that a normal Android application can directly record both sides of every cellular call. Call capture is implemented as an adapter family with explicit capability/evidence state:

1. OEM_NATIVE_CALL_RECORDER — preferred when the phone/region/firmware exposes a native recorder and recordings can be observed/imported safely.
2. MANAGED_TELEPHONY_OR_VOIP — preferred for company fleets when calls can be routed through a controlled telephony/PBX/softphone path that provides reliable recordings.
3. APPROVED_THIRD_PARTY_RECORDER — allowed only after provenance, privacy, security, license, cost and physical-quality review.
4. ACCESSIBILITY_OR_MIC_FALLBACK — may collect permitted local audio/context but must never be represented as guaranteed two-sided call recording when Android does not expose the remote stream.

Every device reports one of: FULL_DUPLEX_CALL_CAPTURE, OEM_CAPTURE, PLATFORM_CAPTURE, DEGRADED_MIC_ONLY, UNSUPPORTED, HUMAN_SETUP_REQUIRED.

## Ingestion pipeline

CALL_END/CALL_RECORD_READY -> evidence hash -> encrypted upload/reference -> transcription -> speaker/participant separation when available -> structured extraction -> entity/contact/case resolution -> knowledge/event store -> retention policy -> searchable CEREBRO context.

Required metadata: company_id, engine_id, environment, version, device_id, call_id, direction, start/end timestamps, capture_adapter, capture_quality, source_file_hash, transcription_version, policy_version, retention_class and access scope. Raw credentials are never embedded.

## Zero-additional-cost preference

Transcription preference: deterministic preprocessing + local/self-hosted speech-to-text where practical (for example Whisper-compatible local runtime) -> already-contracted service -> paid external fallback only with explicit ROI/policy approval. Heavy transcription must run outside the mobile and outside Supabase transactional hot paths whenever practical.

## Voice communication

CEREBRO must support voice-message production as a universal skill: text/intent -> role/policy check -> TTS or selected recorded audio -> file validation -> target contact/conversation resolution -> WhatsApp/WhatsApp Business/Telegram/other app execution -> post-send semantic verification -> audit event.

The role/persona, voice, allowed recipients, communication objective, approval threshold and escalation policy are assigned above the Android device layer. App-specific recipes remain server-side so new communication skills do not require rebuilding the APK.

## Governance

Business call audio and transcripts are personal data when people are identifiable. Deployment requires a documented legal basis, transparency/notice where applicable, purpose limitation, minimization, retention limits, access control, deletion/export procedures and security logging. CEREBRO must support policy-driven recording disablement for excluded numbers/categories and must never bypass OS consent, lockscreen, MFA or restricted telephony security controls.

## Acceptance gates

- first Samsung device: determine real capture adapter physically;
- capture at least one authorized test call with evidence of both sides or explicitly mark degraded mode;
- produce transcript and structured summary linked to the test call;
- prove encrypted transfer/reference and retention metadata;
- generate and send one authorized voice note through WhatsApp/WhatsApp Business and one through Telegram or approved second channel;
- verify delivery state semantically where the target app exposes it;
- reboot/reconnect and repeat without reinstalling the APK;
- preserve rollback and permanent signing lineage.
