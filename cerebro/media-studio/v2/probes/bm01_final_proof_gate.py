#!/usr/bin/env python3
"""Aggregate BM-01 proof gate.

No benchmark registry mutation occurs here. This gate only emits immutable aggregate
proof when 2D reference provenance, image identity, video identity and 3D identity
are all independently PASS_WITH_EVIDENCE for the same synthetic character.
"""
from __future__ import annotations
import argparse, hashlib, json, os
from pathlib import Path

CHARACTER_ID='UMS-SYNTH-CHAR-001'
CANONICAL_FRONT='e0f5968b9919f87c420f3c7ba4127bc1d48c01ddab2505f93f93d858958d04ec'

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p:str):
    path=Path(p); return path,json.loads(path.read_text())

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--stage0',required=True)
    ap.add_argument('--image-proof',required=True)
    ap.add_argument('--video-proof',required=True)
    ap.add_argument('--three-d-proof',required=True)
    ap.add_argument('--out',required=True)
    a=ap.parse_args()
    stage0p,stage0=load(a.stage0); imagep,image=load(a.image_proof); videop,video=load(a.video_proof); threedp,threed=load(a.three_d_proof)
    bm0=stage0.get('bm01_stage0',stage0)
    proofs={'image':image,'video':video,'three_d':threed}
    checks={
      'stage0_green':bm0.get('status')=='BM01_STAGE0_REFERENCE_GREEN',
      'stage0_same_character':bm0.get('character_id')==CHARACTER_ID,
      'stage0_synthetic_original':bm0.get('identity_type')=='SYNTHETIC_ORIGINAL' and bm0.get('real_person_reference') is False,
      'stage0_front_hash':any(x.get('view')=='FRONT' and x.get('sha256')==CANONICAL_FRONT for x in bm0.get('reference_assets',[])),
      'image_pass':image.get('status')=='PASS_WITH_EVIDENCE' and image.get('proof_type')=='IMAGE_IDENTITY_PROOF',
      'video_pass':video.get('status')=='PASS_WITH_EVIDENCE' and video.get('proof_type')=='VIDEO_IDENTITY_PROOF',
      'three_d_pass':threed.get('status')=='PASS_WITH_EVIDENCE' and threed.get('proof_type')=='THREE_D_REFERENCE_PROOF',
      'same_character_all':all(p.get('character_id')==CHARACTER_ID for p in proofs.values()),
      'preprod_only':all(p.get('environment')=='PREPROD' for p in proofs.values()),
      'zero_added_cost':all(p.get('additional_cost_eur')==0 for p in proofs.values()),
      'prod_blocked':all(p.get('prod_authorized') is False for p in proofs.values()),
      'publish_blocked':all(p.get('publish_authorized',False) is False for p in proofs.values()),
      'all_internal_checks_pass':all(all(p.get('checks',{}).values()) for p in proofs.values()),
    }
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_FINAL_PROOF_V1','benchmark_id':'BM-01',
      'benchmark_name':'Persistent synthetic character across image video and 3D references',
      'character_id':CHARACTER_ID,'identity_type':'SYNTHETIC_ORIGINAL','environment':'PREPROD',
      'status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED','checks':checks,
      'evidence':{
        'stage0':{'sha256':sha(stage0p),'path':str(stage0p),'front_sha256':CANONICAL_FRONT},
        'image_identity_proof':{'sha256':sha(imagep),'path':str(imagep),'source_run_id':image.get('github_run_id')},
        'video_identity_proof':{'sha256':sha(videop),'path':str(videop),'source_run_id':video.get('github_run_id')},
        'three_d_reference_proof':{'sha256':sha(threedp),'path':str(threedp),'source_run_id':threed.get('github_run_id')},
      },
      'physical_modalities':['2D_REFERENCE','IMAGE_GENERATION','VIDEO','3D'],
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,
      'benchmark_registry_mutation_authorized':passed,
      'universal_media_studio_ready_authorized':False,
      'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA')
    }
    out=Path(a.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    raise SystemExit(0 if passed else 6)

if __name__=='__main__': main()
