#!/usr/bin/env python3
"""Fail-closed admission gate for BM-02/BM-03 real-person source media.
This gate grants admission only; it never grants benchmark credit or PROD authority.
"""
from __future__ import annotations
import argparse,hashlib,json
from datetime import datetime,timezone
from pathlib import Path

REQUIRED={
  'BM-02':{'modalities':{'image','video','3d'},'uses':{'DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE'}},
  'BM-03':{'modalities':{'voice'},'uses':{'VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL'}},
}
APPROVED={'APPROVED','AUTHORIZED','GRANTED'}

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def parse_date(v):
    if not v: return None
    s=str(v).replace('Z','+00:00'); d=datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--benchmark',choices=sorted(REQUIRED),required=True); ap.add_argument('--rights',required=True); ap.add_argument('--media',action='append',default=[]); ap.add_argument('--out',required=True); a=ap.parse_args()
    rpath=Path(a.rights).resolve(); rights=json.loads(rpath.read_text()); rr=rights.get('rights_record') or {}; canon=rights.get('canonical_assets') or {}; req=REQUIRED[a.benchmark]
    mods=set(rr.get('allowed_modalities') or []); uses=set(rr.get('allowed_uses') or []); refs=[str(x).strip() for x in rr.get('evidence_refs') or [] if str(x).strip()]
    now=datetime.now(timezone.utc); vf=parse_date(rr.get('valid_from')); vu=parse_date(rr.get('valid_until'))
    media=[]
    for raw in a.media:
        p=Path(raw).resolve(); media.append({'path':str(p),'exists':p.is_file(),'bytes':p.stat().st_size if p.is_file() else 0,'sha256':sha(p) if p.is_file() else None})
    if a.benchmark=='BM-02': canonical_refs=(canon.get('face_refs') or [])+(canon.get('body_refs') or [])
    else: canonical_refs=canon.get('voice_refs') or []
    checks={
      'real_authorized_identity':rights.get('identity_type')=='REAL_AUTHORIZED',
      'subject_reference_present':bool(str(rights.get('subject_reference') or '').strip()),
      'consent_approved':str(rr.get('consent_status') or '').upper() in APPROVED,
      'required_modalities_explicit':req['modalities'].issubset(mods) if a.benchmark=='BM-02' else 'voice' in mods,
      'required_uses_explicit':req['uses'].issubset(uses),
      'evidence_refs_present':len(refs)>0,
      'revocation_process_present':bool(str(rr.get('revocation_process') or '').strip()),
      'valid_from_active':vf is None or vf<=now,
      'valid_until_active':vu is None or now<=vu,
      'provenance_present':bool(rights.get('provenance_record')),
      'canonical_source_refs_present':len(canonical_refs)>0,
      'checksums_present':len(rights.get('checksums') or [])>0,
      'physical_media_present':len(media)>0 and all(x['exists'] and x['bytes']>0 for x in media),
    }
    admitted=all(checks.values())
    doc={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_AUTHORIZED_REAL_PERSON_ADMISSION_V1','benchmark_id':a.benchmark,'environment':'PREPROD','status':'ADMITTED' if admitted else 'BLOCKED_FAIL_CLOSED','admitted':admitted,'benchmark_credit':False,
      'identity_id':rights.get('identity_id'),'identity_type':rights.get('identity_type'),'rights_record_sha256':sha(rpath),'media':media,
      'required_scope':{'modalities':sorted(req['modalities']),'uses':sorted(req['uses'])},'declared_scope':{'modalities':sorted(mods),'uses':sorted(uses)},'checks':checks,
      'human_required':not admitted,'human_required_reason':'LEGAL_REQUIRED' if not admitted else None,
      'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
    }
    Path(a.out).write_text(json.dumps(doc,indent=2),encoding='utf-8'); print(json.dumps(doc,indent=2))
    if not admitted: raise SystemExit(12)
if __name__=='__main__': main()
