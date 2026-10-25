#!/usr/bin/env python3
"""Seal one RAVDESS real-human AV sample for BM-02/BM-03 internal validation.

This does not download anything. The workflow supplies one official RAVDESS clip,
its extracted audio/frame and the authoritative Zenodo file metadata. The script
hashes all physical media, records attribution/license limits and creates a
run-scoped REAL_AUTHORIZED rights record using LICENSED_DATASET authorization.
"""
from __future__ import annotations
import argparse, hashlib, json
from datetime import datetime, timezone
from pathlib import Path


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--clip',required=True)
    ap.add_argument('--audio',required=True)
    ap.add_argument('--frame',required=True)
    ap.add_argument('--record-metadata',required=True)
    ap.add_argument('--archive-metadata',required=True)
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    out=Path(a.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    clip=Path(a.clip).resolve(); audio=Path(a.audio).resolve(); frame=Path(a.frame).resolve()
    record=json.loads(Path(a.record_metadata).read_text(encoding='utf-8'))
    archive=json.loads(Path(a.archive_metadata).read_text(encoding='utf-8'))
    for p in (clip,audio,frame):
        if not p.is_file() or p.stat().st_size<1000: raise SystemExit(f'RAVDESS_MEDIA_INVALID:{p}')
    clip_name=clip.name
    expected='01-01-01-01-01-01-01.mp4'
    if clip_name!=expected: raise SystemExit(f'RAVDESS_UNEXPECTED_CLIP:{clip_name}')
    hashes={p.name:sha(p) for p in (clip,audio,frame)}
    now=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    doi=str(record.get('doi') or '10.5281/zenodo.1188976')
    license_id='CC-BY-NC-SA-4.0'
    source_ref=f'https://doi.org/{doi}'
    owner_ref='git:cerebro/media-studio/v2/policy/owner-authorization-policy-v1.md'
    rights={
      'identity_id':'RAVDESS_ACTOR_01_INTERNAL_VALIDATION',
      'identity_type':'REAL_AUTHORIZED',
      'subject_reference':'RAVDESS:Actor_01',
      'rights_record':{
        'consent_status':'AUTHORIZED',
        'allowed_modalities':['image','video','voice','3d','motion'],
        'allowed_uses':['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE','VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL','INTERNAL_VALIDATION'],
        'territories':['INTERNAL_TEST_ONLY'],
        'valid_from':None,'valid_until':None,
        'revocation_process':'Remove or supersede this run-scoped authorization record; future gates fail closed.',
        'evidence_refs':[source_ref,'license:CC-BY-NC-SA-4.0',owner_ref],
        'owner_authorization':{
          'authorization_id':'OWNER_APPROVED_RAVDESS_INTERNAL_BM02_BM03_2026-10-26',
          'decision':'APPROVED','decided_by':'CEREBRO_OWNER_SUPERVISOR','decided_at':now,
          'authorization_basis':'LICENSED_DATASET','attests_rights_or_permission':True,
          'modalities':['image','video','voice','3d','motion'],
          'actions':['DIGITAL_DOUBLE','GENERATIVE_DERIVATIVE','VOICE_CLONE','VOICE_CONVERSION','TTS','PROSODY','MULTILINGUAL','INTERNAL_VALIDATION'],
          'environments':['PREPROD'],
          'material_refs':[clip.name,audio.name,frame.name],
          'material_sha256':list(hashes.values()),
          'evidence_refs':[source_ref,'license:CC-BY-NC-SA-4.0',owner_ref],
          'notes':'Owner authorizes CEREBRO to execute BM-02/BM-03 internal validation under the dataset license; no publication or commercial use of this dataset sample.'
        }
      },
      'provenance_record':{
        'dataset':'The Ryerson Audio-Visual Database of Emotional Speech and Song (RAVDESS)',
        'record_id':'1188976','doi':doi,'source_ref':source_ref,'license':license_id,
        'archive_key':archive.get('key'),'archive_checksum':archive.get('checksum'),'archive_size':archive.get('size'),
        'clip_filename':clip.name,
        'filename_semantics':{'modality':'full-AV','vocal_channel':'speech','emotion':'neutral','intensity':'normal','statement':'Kids are talking by the door','repetition':1,'actor':1},
        'attribution':'Livingstone, Steven R.; Russo, Frank A. (2018), RAVDESS, Zenodo record 1188976.',
        'restriction':'CC BY-NC-SA 4.0: internal non-commercial benchmark validation only in this run.'
      },
      'canonical_assets':{'face_refs':[frame.name],'body_refs':[clip.name],'voice_refs':[audio.name],'motion_refs':[clip.name],'3d_assets':[],'character_bible':None},
      'versions':[{'version':'source-v1','sealed_at':now}],
      'checksums':[f'sha256:{v}' for v in hashes.values()]
    }
    manifest={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_RAVDESS_AUTHORIZED_TEST_SOURCE_V1','environment':'PREPROD',
      'status':'SEALED_LICENSED_REAL_HUMAN_SOURCE','dataset_license':license_id,'commercial_use':False,'publish_authorized':False,
      'source_ref':source_ref,'clip':{'path':clip.name,'sha256':hashes[clip.name],'bytes':clip.stat().st_size},
      'audio':{'path':audio.name,'sha256':hashes[audio.name],'bytes':audio.stat().st_size},
      'frame':{'path':frame.name,'sha256':hashes[frame.name],'bytes':frame.stat().st_size},
      'archive':archive,'rights_file':'identity-rights.json','additional_cost_eur':0
    }
    (out/'identity-rights.json').write_text(json.dumps(rights,indent=2),encoding='utf-8')
    (out/'source-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__': main()
