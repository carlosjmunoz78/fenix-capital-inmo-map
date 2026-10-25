#!/usr/bin/env python3
"""Fail-closed admission gate for BM-02/BM-03 real-person source media.

The owner/supervisor decision is the operational authority for identity use inside
CEREBRO. APPROVED continues automatically within its recorded scope; DENIED and
REVOKED stop the operation. Missing approval raises HUMAN_REQUIRED/LEGAL_REQUIRED.
This source gate never grants benchmark credit or global PROD promotion authority.
"""
from __future__ import annotations
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path

REQUIRED = {
    'BM-02': {
        'modalities': {'image', 'video', '3d'},
        'uses': {'DIGITAL_DOUBLE', 'GENERATIVE_DERIVATIVE'},
    },
    'BM-03': {
        'modalities': {'voice'},
        'uses': {'VOICE_CLONE', 'VOICE_CONVERSION', 'TTS', 'PROSODY', 'MULTILINGUAL'},
    },
}
CONSENT_APPROVED = {'APPROVED', 'AUTHORIZED', 'GRANTED'}
OWNER_DECISIONS = {'APPROVED', 'DENIED', 'REVOKED'}
ENVIRONMENTS = {'DEV', 'PREPROD', 'PROD'}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_date(value):
    if not value:
        return None
    s = str(value).replace('Z', '+00:00')
    d = datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--benchmark', choices=sorted(REQUIRED), required=True)
    ap.add_argument('--rights', required=True)
    ap.add_argument('--media', action='append', default=[])
    ap.add_argument('--environment', choices=sorted(ENVIRONMENTS), default='PREPROD')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    rpath = Path(a.rights).resolve()
    rights = json.loads(rpath.read_text(encoding='utf-8'))
    rr = rights.get('rights_record') or {}
    owner = rr.get('owner_authorization') or {}
    canon = rights.get('canonical_assets') or {}
    req = REQUIRED[a.benchmark]

    mods = set(rr.get('allowed_modalities') or [])
    uses = set(rr.get('allowed_uses') or [])
    refs = [str(x).strip() for x in rr.get('evidence_refs') or [] if str(x).strip()]
    owner_mods = set(owner.get('modalities') or [])
    owner_actions = set(owner.get('actions') or [])
    owner_envs = {str(x).upper() for x in owner.get('environments') or []}
    owner_evidence = [str(x).strip() for x in owner.get('evidence_refs') or [] if str(x).strip()]
    owner_hashes = {str(x).lower() for x in owner.get('material_sha256') or [] if str(x).strip()}
    owner_decision = str(owner.get('decision') or 'PENDING').upper()

    now = datetime.now(timezone.utc)
    vf = parse_date(rr.get('valid_from'))
    vu = parse_date(rr.get('valid_until'))

    media = []
    for raw in a.media:
        p = Path(raw).resolve()
        digest = sha(p) if p.is_file() else None
        media.append({
            'path': str(p),
            'exists': p.is_file(),
            'bytes': p.stat().st_size if p.is_file() else 0,
            'sha256': digest,
            'covered_by_owner_hash': digest in owner_hashes if digest and owner_hashes else None,
        })

    if a.benchmark == 'BM-02':
        canonical_refs = (canon.get('face_refs') or []) + (canon.get('body_refs') or [])
        required_owner_modalities = {'image', 'video'}
    else:
        canonical_refs = canon.get('voice_refs') or []
        required_owner_modalities = {'voice'}

    owner_decision_valid = owner_decision in OWNER_DECISIONS
    owner_approved = owner_decision == 'APPROVED'
    owner_scope_ok = (
        owner_approved
        and bool(str(owner.get('authorization_id') or '').strip())
        and bool(str(owner.get('decided_by') or '').strip())
        and bool(str(owner.get('decided_at') or '').strip())
        and owner.get('attests_rights_or_permission') is True
        and required_owner_modalities.issubset(owner_mods)
        and req['uses'].issubset(owner_actions)
        and a.environment in owner_envs
        and len(owner_evidence) > 0
    )
    owner_material_ok = (
        not owner_hashes
        or (len(media) > 0 and all(x['sha256'] in owner_hashes for x in media if x['sha256']))
    )

    checks = {
        'real_authorized_identity': rights.get('identity_type') == 'REAL_AUTHORIZED',
        'subject_reference_present': bool(str(rights.get('subject_reference') or '').strip()),
        'consent_approved': str(rr.get('consent_status') or '').upper() in CONSENT_APPROVED,
        'required_modalities_explicit': req['modalities'].issubset(mods) if a.benchmark == 'BM-02' else 'voice' in mods,
        'required_uses_explicit': req['uses'].issubset(uses),
        'evidence_refs_present': len(refs) > 0,
        'revocation_process_present': bool(str(rr.get('revocation_process') or '').strip()),
        'valid_from_active': vf is None or vf <= now,
        'valid_until_active': vu is None or now <= vu,
        'provenance_present': bool(rights.get('provenance_record')),
        'canonical_source_refs_present': len(canonical_refs) > 0,
        'checksums_present': len(rights.get('checksums') or []) > 0,
        'physical_media_present': len(media) > 0 and all(x['exists'] and x['bytes'] > 0 for x in media),
        'owner_decision_valid': owner_decision_valid,
        'owner_approved': owner_approved,
        'owner_scope_covers_operation': owner_scope_ok,
        'owner_material_scope_ok': owner_material_ok,
    }

    admitted = all(checks.values())
    missing_owner_decision = owner_decision == 'PENDING' or not owner_decision_valid
    denied_or_revoked = owner_decision in {'DENIED', 'REVOKED'}

    if admitted:
        blocker = None
        human_required = False
        human_reason = None
    elif missing_owner_decision:
        blocker = 'OWNER_AUTHORIZATION_DECISION_REQUIRED'
        human_required = True
        human_reason = 'LEGAL_REQUIRED'
    elif denied_or_revoked:
        blocker = f'OWNER_AUTHORIZATION_{owner_decision}'
        human_required = False
        human_reason = None
    elif owner_approved and not owner_scope_ok:
        blocker = 'OWNER_AUTHORIZATION_SCOPE_MISMATCH'
        human_required = False
        human_reason = None
    else:
        blocker = 'AUTHORIZED_SOURCE_CONTRACT_INVALID'
        human_required = False
        human_reason = None

    prod_source_use_authorized = admitted and a.environment == 'PROD'
    publish_authorized = admitted and 'PUBLISH' in owner_actions
    commercial_use_authorized = admitted and 'COMMERCIAL_USE' in owner_actions

    doc = {
        'schema_version': '2.0.0',
        'state_type': 'CEREBRO_UMS_AUTHORIZED_REAL_PERSON_ADMISSION_V2',
        'benchmark_id': a.benchmark,
        'environment': a.environment,
        'status': 'ADMITTED' if admitted else 'BLOCKED_FAIL_CLOSED',
        'blocker': blocker,
        'admitted': admitted,
        'benchmark_credit': False,
        'identity_id': rights.get('identity_id'),
        'identity_type': rights.get('identity_type'),
        'rights_record_sha256': sha(rpath),
        'media': media,
        'required_scope': {'modalities': sorted(req['modalities']), 'uses': sorted(req['uses'])},
        'declared_scope': {'modalities': sorted(mods), 'uses': sorted(uses)},
        'owner_authorization': {
            'authorization_id': owner.get('authorization_id'),
            'decision': owner_decision,
            'decided_by': owner.get('decided_by'),
            'decided_at': owner.get('decided_at'),
            'authorization_basis': owner.get('authorization_basis'),
            'modalities': sorted(owner_mods),
            'actions': sorted(owner_actions),
            'environments': sorted(owner_envs),
            'evidence_refs': owner_evidence,
        },
        'checks': checks,
        'human_required': human_required,
        'human_required_reason': human_reason,
        'prod_source_use_authorized': prod_source_use_authorized,
        'publish_authorized': publish_authorized,
        'commercial_use_authorized': commercial_use_authorized,
        'prod_authorized': False,
        'spend_authorized': False,
        'readiness_mutation_authorized': False,
        'authority_note': 'Source admission is not global PROD promotion authority; the final UMS readiness tribunal remains authoritative.'
    }
    Path(a.out).write_text(json.dumps(doc, indent=2), encoding='utf-8')
    print(json.dumps(doc, indent=2))
    if not admitted:
        raise SystemExit(12)


if __name__ == '__main__':
    main()
