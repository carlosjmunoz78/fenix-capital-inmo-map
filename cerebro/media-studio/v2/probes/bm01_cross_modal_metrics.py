#!/usr/bin/env python3
"""Deterministic BM-01 2D↔3D identity metrics for synthetic Nova-01.

Thresholds are intentionally fixed in source before observing the candidate render.
This gate measures cross-modal continuity; it does not mutate UMS readiness.
"""
from __future__ import annotations
import argparse, hashlib, json, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

SEEDS={
    'skin':np.array([200,143,114],dtype=np.float32),
    'gold':np.array([217,180,91],dtype=np.float32),
    'eye_blue':np.array([85,122,149],dtype=np.float32),
}
THRESHOLDS={
    'background_rgb_distance_max':38.0,
    'foreground_center_distance_max':0.16,
    'foreground_width_delta_max':0.22,
    'foreground_height_delta_max':0.20,
    'skin_seed_radius':68.0,
    'skin_min_coverage':0.025,
    'skin_centroid_rgb_distance_max':36.0,
    'dark_foreground_coverage_delta_max':0.20,
    'gold_seed_radius':72.0,
    'gold_min_coverage':0.00025,
    'eye_blue_seed_radius':72.0,
    'eye_blue_min_coverage':0.00020,
    'edge_density_delta_max':0.14,
    'optional_passes_required':2,
}

def sha(path:Path)->str: return hashlib.sha256(path.read_bytes()).hexdigest()
def rgb_image(path:Path): return np.asarray(Image.open(path).convert('RGB'),dtype=np.float32)
def crop_label(a):
    h,w,_=a.shape
    return a[int(h*0.10):h,0:w,:]
def bg_color(a):
    h,w,_=a.shape; s=max(4,min(h,w)//24)
    samples=np.concatenate([a[:s,:s].reshape(-1,3),a[:s,-s:].reshape(-1,3),a[-s:,:s].reshape(-1,3),a[-s:,-s:].reshape(-1,3)],axis=0)
    return np.median(samples,axis=0)
def foreground_mask(a,bg): return np.linalg.norm(a-bg[None,None,:],axis=2)>30.0
def bbox(mask):
    ys,xs=np.where(mask)
    h,w=mask.shape
    if len(xs)<20: return None
    return {'x0':float(xs.min()/w),'x1':float((xs.max()+1)/w),'y0':float(ys.min()/h),'y1':float((ys.max()+1)/h),'cx':float((xs.min()+xs.max()+1)/(2*w)),'cy':float((ys.min()+ys.max()+1)/(2*h)),'width':float((xs.max()+1-xs.min())/w),'height':float((ys.max()+1-ys.min())/h)}
def palette_stats(a,seed,radius,scope=None):
    d=np.linalg.norm(a-seed[None,None,:],axis=2)
    m=d<=radius
    if scope is not None: m &= scope
    n=int(m.sum()); total=int(scope.sum()) if scope is not None else a.shape[0]*a.shape[1]
    centroid=a[m].mean(axis=0) if n else np.array([math.nan]*3)
    return {'pixels':n,'coverage':float(n/max(total,1)),'centroid':[float(x) for x in centroid]}
def edge_density(a,scope):
    im=Image.fromarray(np.clip(a,0,255).astype(np.uint8),'RGB').convert('L').filter(ImageFilter.FIND_EDGES)
    e=np.asarray(im,dtype=np.float32)>35
    return float((e & scope).sum()/max(int(scope.sum()),1))
def dist(a,b): return float(np.linalg.norm(np.array(a,dtype=np.float32)-np.array(b,dtype=np.float32)))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--reference',required=True); ap.add_argument('--candidate',required=True); ap.add_argument('--out',required=True); args=ap.parse_args()
    rp,cp,op=Path(args.reference),Path(args.candidate),Path(args.out)
    r,c=crop_label(rgb_image(rp)),crop_label(rgb_image(cp))
    if r.shape[:2]!=c.shape[:2]: c=np.asarray(Image.fromarray(c.astype(np.uint8)).resize((r.shape[1],r.shape[0]),Image.Resampling.LANCZOS),dtype=np.float32)
    rbg,cbg=bg_color(r),bg_color(c); rm,cm=foreground_mask(r,rbg),foreground_mask(c,cbg); rb,cb=bbox(rm),bbox(cm)
    if rb is None or cb is None: raise SystemExit('foreground detection failed')
    skin_r=palette_stats(r,SEEDS['skin'],THRESHOLDS['skin_seed_radius'],rm); skin_c=palette_stats(c,SEEDS['skin'],THRESHOLDS['skin_seed_radius'],cm)
    gold_r=palette_stats(r,SEEDS['gold'],THRESHOLDS['gold_seed_radius'],rm); gold_c=palette_stats(c,SEEDS['gold'],THRESHOLDS['gold_seed_radius'],cm)
    blue_r=palette_stats(r,SEEDS['eye_blue'],THRESHOLDS['eye_blue_seed_radius'],rm); blue_c=palette_stats(c,SEEDS['eye_blue'],THRESHOLDS['eye_blue_seed_radius'],cm)
    dark_r=float((((r.mean(axis=2)<82)&rm).sum())/max(int(rm.sum()),1)); dark_c=float((((c.mean(axis=2)<82)&cm).sum())/max(int(cm.sum()),1))
    edge_r,edge_c=edge_density(r,rm),edge_density(c,cm)
    metrics={
      'background_rgb_distance':dist(rbg,cbg),
      'foreground_center_distance':float(math.hypot(rb['cx']-cb['cx'],rb['cy']-cb['cy'])),
      'foreground_width_delta':float(abs(rb['width']-cb['width'])),
      'foreground_height_delta':float(abs(rb['height']-cb['height'])),
      'skin_reference':skin_r,'skin_candidate':skin_c,'skin_centroid_rgb_distance':dist(skin_r['centroid'],skin_c['centroid']),
      'dark_foreground_reference':dark_r,'dark_foreground_candidate':dark_c,'dark_foreground_coverage_delta':float(abs(dark_r-dark_c)),
      'gold_reference':gold_r,'gold_candidate':gold_c,
      'eye_blue_reference':blue_r,'eye_blue_candidate':blue_c,
      'edge_density_reference':edge_r,'edge_density_candidate':edge_c,'edge_density_delta':float(abs(edge_r-edge_c)),
      'reference_bbox':rb,'candidate_bbox':cb,
    }
    mandatory={
      'background':bool(metrics['background_rgb_distance']<=THRESHOLDS['background_rgb_distance_max']),
      'bbox_center':bool(metrics['foreground_center_distance']<=THRESHOLDS['foreground_center_distance_max']),
      'bbox_width':bool(metrics['foreground_width_delta']<=THRESHOLDS['foreground_width_delta_max']),
      'bbox_height':bool(metrics['foreground_height_delta']<=THRESHOLDS['foreground_height_delta_max']),
      'skin_presence':bool(skin_r['coverage']>=THRESHOLDS['skin_min_coverage'] and skin_c['coverage']>=THRESHOLDS['skin_min_coverage']),
      'skin_color':bool(metrics['skin_centroid_rgb_distance']<=THRESHOLDS['skin_centroid_rgb_distance_max']),
    }
    optional={
      'dark_structure':bool(metrics['dark_foreground_coverage_delta']<=THRESHOLDS['dark_foreground_coverage_delta_max']),
      'gold_accent':bool(gold_r['coverage']>=THRESHOLDS['gold_min_coverage'] and gold_c['coverage']>=THRESHOLDS['gold_min_coverage']),
      'eye_blue':bool(blue_r['coverage']>=THRESHOLDS['eye_blue_min_coverage'] and blue_c['coverage']>=THRESHOLDS['eye_blue_min_coverage']),
      'edge_density':bool(metrics['edge_density_delta']<=THRESHOLDS['edge_density_delta_max']),
    }
    optional_passes=int(sum(1 for v in optional.values() if v))
    passed=bool(all(mandatory.values()) and optional_passes>=THRESHOLDS['optional_passes_required'])
    report={'schema_version':'1.0.1','state_type':'CEREBRO_UMS_BM01_CROSS_MODAL_METRICS_V1','benchmark_id':'BM-01','character_id':'UMS-SYNTH-CHAR-001','identity_type':'SYNTHETIC_ORIGINAL','environment':'PREPROD','status':'CROSS_MODAL_PASS' if passed else 'CROSS_MODAL_FAIL','threshold_policy':'FIXED_BEFORE_CANDIDATE_OBSERVATION','thresholds':THRESHOLDS,'mandatory_gates':mandatory,'optional_gates':optional,'optional_passes':optional_passes,'metrics':metrics,'reference':{'path':str(rp),'sha256':sha(rp)},'candidate':{'path':str(cp),'sha256':sha(cp)},'readiness_mutation_authorized':False,'prod_authorized':False,'additional_cost_eur':0}
    op.parent.mkdir(parents=True,exist_ok=True); op.write_text(json.dumps(report,indent=2,allow_nan=False),encoding='utf-8'); print(json.dumps(report,indent=2,allow_nan=False))
    raise SystemExit(0 if passed else 3)
if __name__=='__main__': main()
