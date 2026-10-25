#!/usr/bin/env python3
"""Fail-closed physical proof gate for BM-06 · 3D animated VFX shot.

Thresholds are fixed here before observing the physical candidate.
"""
from __future__ import annotations
import argparse, hashlib, json, math, os
from pathlib import Path
import numpy as np
from PIL import Image

REQUIRED_FAMILIES={'ENERGY','PARTICLES','LIGHT','OPTICAL'}
THRESHOLDS={
    'required_frames':18,
    'minimum_unique_frames':16,
    'keyframe_mean_abs_delta_min':1.20,
    'temporal_center_luma_span_min':2.00,
    'bright_pixel_coverage_min':0.002,
    'blend_bytes_min':100_000,
    'video_bytes_min':8_000,
}

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def load_json(p): return json.loads(Path(p).read_text())
def frame_rgb(p): return np.asarray(Image.open(p).convert('RGB'),dtype=np.float32)
def luma(a): return 0.2126*a[:,:,0]+0.7152*a[:,:,1]+0.0722*a[:,:,2]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--contract',required=True); ap.add_argument('--candidate',required=True)
    ap.add_argument('--root',required=True); ap.add_argument('--video',required=True); ap.add_argument('--ffprobe',required=True); ap.add_argument('--out',required=True)
    a=ap.parse_args(); root=Path(a.root); video=Path(a.video); out=Path(a.out)
    contract=load_json(a.contract); cand=load_json(a.candidate); ff=load_json(a.ffprobe)
    frames=cand.get('artifacts',{}).get('frames',[])
    frame_paths=[root/f['path'] for f in frames]
    artifact_checks=[]
    for meta,p in zip(frames,frame_paths):
        artifact_checks.append(bool(p.is_file() and p.stat().st_size==meta.get('bytes') and sha(p)==meta.get('sha256')))
    hashes=[f.get('sha256') for f in frames]; unique=len(set(hashes))
    key_indices=[0,8,17]
    key_arrays=[frame_rgb(frame_paths[i]) for i in key_indices if i<len(frame_paths) and frame_paths[i].is_file()]
    deltas=[]
    if len(key_arrays)==3:
        deltas=[float(np.mean(np.abs(key_arrays[i]-key_arrays[i+1]))) for i in range(2)]
    mean_key_delta=float(np.mean(deltas)) if deltas else 0.0
    center_lumas=[]; bright_coverages=[]
    for p in frame_paths:
        if not p.is_file(): continue
        arr=frame_rgb(p); h,w,_=arr.shape; crop=arr[int(h*.25):int(h*.75),int(w*.30):int(w*.70)]
        lum=luma(crop); center_lumas.append(float(lum.mean())); bright_coverages.append(float((lum>180).mean()))
    luma_span=(max(center_lumas)-min(center_lumas)) if center_lumas else 0.0
    bright_max=max(bright_coverages) if bright_coverages else 0.0
    streams=ff.get('streams',[]); formats=ff.get('format',{})
    vstream=next((s for s in streams if s.get('codec_type')=='video' or s.get('codec_name')),streams[0] if streams else {})
    checks={
      'contract_spec_ready':contract.get('status')=='SPEC_READY' and contract.get('benchmark_id')=='BM-06',
      'contract_required_vfx_families':set(contract.get('shot_contract',{}).get('required_vfx_families',[]))==REQUIRED_FAMILIES,
      'candidate_generated':cand.get('status')=='BM06_PHYSICAL_CANDIDATE_GENERATED' and cand.get('benchmark_id')=='BM-06',
      'blender_5_2_lts_cpu':str(cand.get('runtime',{}).get('blender_version','')).startswith('5.2.3') and cand.get('runtime',{}).get('device')=='CPU',
      'vfx_families_present':REQUIRED_FAMILIES.issubset(set(cand.get('vfx',{}).get('families',[]))),
      'internal_original_only':cand.get('rights',{}).get('status')=='INTERNAL_ORIGINAL' and cand.get('rights',{}).get('external_assets')==0 and cand.get('rights',{}).get('external_textures')==0 and cand.get('rights',{}).get('external_models')==0,
      'frame_count':len(frames)==THRESHOLDS['required_frames'] and cand.get('shot',{}).get('frame_count')==THRESHOLDS['required_frames'],
      'frame_artifacts_hash_valid':len(artifact_checks)==THRESHOLDS['required_frames'] and all(artifact_checks),
      'temporal_uniqueness':unique>=THRESHOLDS['minimum_unique_frames'],
      'keyframe_motion_metric':mean_key_delta>=THRESHOLDS['keyframe_mean_abs_delta_min'],
      'energy_luma_animation':luma_span>=THRESHOLDS['temporal_center_luma_span_min'],
      'emissive_glow_presence':bright_max>=THRESHOLDS['bright_pixel_coverage_min'],
      'animated_blend_present':False,
      'video_h264':vstream.get('codec_name')=='h264',
      'video_resolution':int(vstream.get('width',0))==320 and int(vstream.get('height',0))==180,
      'video_fps':str(vstream.get('r_frame_rate',''))=='9/1',
      'video_artifact':video.is_file() and video.stat().st_size>=THRESHOLDS['video_bytes_min'],
      'zero_cost':cand.get('additional_cost_eur')==0 and contract.get('authority',{}).get('additional_cost_eur')==0,
      'prod_publish_spend_blocked':cand.get('prod_authorized') is False and cand.get('publish_authorized') is False and cand.get('spend_authorized') is False,
    }
    blend_meta=cand.get('artifacts',{}).get('blend',{}); blend=root/blend_meta.get('path','__missing__')
    checks['animated_blend_present']=bool(blend.is_file() and blend.stat().st_size>=THRESHOLDS['blend_bytes_min'] and sha(blend)==blend_meta.get('sha256'))
    passed=all(checks.values())
    report={
      'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM06_ANIMATED_VFX_PROOF_V1','benchmark_id':'BM-06','proof_type':'THREE_D_ANIMATED_VFX_SHOT_PROOF','environment':'PREPROD','status':'PASS_WITH_EVIDENCE' if passed else 'FAIL_CLOSED',
      'threshold_policy':'FIXED_BEFORE_CANDIDATE_OBSERVATION','thresholds':THRESHOLDS,'checks':checks,
      'metrics':{'unique_frame_hashes':unique,'keyframe_pair_mean_abs_deltas':deltas,'mean_keyframe_delta':mean_key_delta,'center_luma_min':min(center_lumas) if center_lumas else None,'center_luma_max':max(center_lumas) if center_lumas else None,'center_luma_span':luma_span,'max_bright_pixel_coverage':bright_max},
      'evidence':{'contract_sha256':sha(Path(a.contract)),'candidate_sha256':sha(Path(a.candidate)),'blend_sha256':sha(blend) if blend.is_file() else None,'video_sha256':sha(video) if video.is_file() else None,'video_bytes':video.stat().st_size if video.is_file() else 0,'ffprobe_sha256':sha(Path(a.ffprobe))},
      'vfx_families':sorted(REQUIRED_FAMILIES),'frame_count':len(frames),'fps':9,'resolution':[320,180],
      'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'benchmark_registry_mutation_authorized':passed,'universal_media_studio_ready_authorized':False,'github_run_id':os.environ.get('GITHUB_RUN_ID'),'github_sha':os.environ.get('GITHUB_SHA')
    }
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
    raise SystemExit(0 if passed else 6)

if __name__=='__main__': main()
