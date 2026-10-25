#!/usr/bin/env python3
"""BM-02 production-safe digital-double proof using MediaPipe FaceMesh.

Transforms licensed real-human AV media into a synthetic geometry-only facial
representation and motion track. The rendered double contains no copied source
pixels: only tracked facial geometry from the source subject.
"""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np

CLIP=Path(os.environ['BM02_REAL_CLIP']).resolve(); ADMISSION=Path(os.environ['BM02_SOURCE_ADMISSION']).resolve()
OUT=Path(os.environ.get('BM02_DD_OUT','ums-bm02-mediapipe-digital-double')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
CODE_LICENSE_OK=os.environ.get('BM02_MEDIAPIPE_CODE_LICENSE_VERIFIED','false').lower()=='true'
MODEL_LICENSE_OK=os.environ.get('BM02_FACE_MESH_MODEL_LICENSE_VERIFIED','false').lower()=='true'
START=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM02_TEST_SOURCE_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM02_SPEND_NOT_ALLOWED')
for p in (CLIP,ADMISSION):
    if not p.is_file() or p.stat().st_size==0: raise SystemExit(f'BM02_INPUT_MISSING:{p}')
adm=json.loads(ADMISSION.read_text(encoding='utf-8'))
if not (adm.get('admitted') is True and adm.get('benchmark_id')=='BM-02' and adm.get('human_required') is False): raise SystemExit('BM02_SOURCE_NOT_ADMITTED')
if not CODE_LICENSE_OK or not MODEL_LICENSE_OK: raise SystemExit('BM02_MEDIAPIPE_LICENSE_EVIDENCE_MISSING')

cap=cv2.VideoCapture(str(CLIP)); fps=float(cap.get(cv2.CAP_PROP_FPS) or 30.0); total=int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
if not cap.isOpened() or total<10: raise SystemExit('BM02_SOURCE_VIDEO_INVALID')
size=512
writer=cv2.VideoWriter(str(OUT/'digital-double-wireframe.mp4'),cv2.VideoWriter_fourcc(*'mp4v'),fps,(size,size))
if not writer.isOpened(): raise SystemExit('BM02_OUTPUT_VIDEO_WRITER_FAILED')
mesh_api=mp.solutions.face_mesh
edges=sorted({tuple(sorted((int(a),int(b)))) for a,b in mesh_api.FACEMESH_TESSELATION})
tracks=[]; valid=0; decoded=0; first=None
with mesh_api.FaceMesh(static_image_mode=False,max_num_faces=1,refine_landmarks=True,min_detection_confidence=0.5,min_tracking_confidence=0.5) as fm:
    while True:
        ok,frame=cap.read()
        if not ok: break
        decoded+=1
        rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); result=fm.process(rgb)
        canvas=np.zeros((size,size,3),dtype=np.uint8)
        if result.multi_face_landmarks:
            lm=result.multi_face_landmarks[0].landmark
            pts=np.asarray([[float(p.x),float(p.y),float(p.z)] for p in lm],dtype=np.float32)
            valid+=1; tracks.append(pts)
            if first is None: first=pts.copy()
            xy=pts[:,:2]; mn=xy.min(axis=0); mx=xy.max(axis=0); center=(mn+mx)/2; scale=max(float((mx-mn).max()),1e-6)
            screen=np.empty((len(pts),2),dtype=np.int32)
            screen[:,0]=np.clip(((xy[:,0]-center[0])/scale*390+size/2),0,size-1).astype(np.int32)
            screen[:,1]=np.clip(((xy[:,1]-center[1])/scale*390+size/2),0,size-1).astype(np.int32)
            for a,b in edges:
                if a<len(screen) and b<len(screen): cv2.line(canvas,tuple(screen[a]),tuple(screen[b]),(255,255,255),1,cv2.LINE_AA)
            for idx in (1,33,263,61,291,199):
                if idx<len(screen): cv2.circle(canvas,tuple(screen[idx]),2,(180,180,180),-1,cv2.LINE_AA)
        writer.write(canvas)
cap.release(); writer.release()
if decoded<10 or valid<10 or first is None: raise SystemExit(f'BM02_INSUFFICIENT_FACE_TRACKING:{decoded}:{valid}')
ratio=valid/decoded
if ratio<0.90: raise SystemExit(f'BM02_DETECTION_RATIO_LOW:{ratio}')
arr=np.stack(tracks,axis=0)
if arr.shape[1]<468: raise SystemExit(f'BM02_LANDMARK_COUNT_LOW:{arr.shape[1]}')
# Normalize each frame for translation/scale-invariant motion evidence.
xy=arr[:,:,:2]; centers=(xy.min(axis=1)+xy.max(axis=1))/2; spans=np.max(xy.max(axis=1)-xy.min(axis=1),axis=1); spans=np.maximum(spans,1e-6)
norm=(xy-centers[:,None,:])/spans[:,None,None]
motion=float(np.sqrt(np.mean(np.square(np.diff(norm,axis=0))))) if len(norm)>1 else 0.0
if motion<=1e-5: raise SystemExit(f'BM02_MOTION_NOT_OBSERVED:{motion}')
np.savez_compressed(OUT/'digital-double-motion.npz',landmarks=arr,fps=np.asarray([fps],dtype=np.float32))
# Export a geometry-only wireframe OBJ from the first tracked frame.
with (OUT/'digital-double-neutral.obj').open('w',encoding='utf-8') as f:
    f.write('# CEREBRO UMS BM02 MediaPipe geometry-only digital double\n')
    p=first; c=(p[:,:2].min(axis=0)+p[:,:2].max(axis=0))/2; s=max(float((p[:,:2].max(axis=0)-p[:,:2].min(axis=0)).max()),1e-6)
    q=p.copy(); q[:,:2]=(q[:,:2]-c)/s; q[:,2]=q[:,2]/s
    for x,y,z in q: f.write(f'v {x:.7f} {-y:.7f} {z:.7f}\n')
    for a,b in edges:
        if a<len(q) and b<len(q): f.write(f'l {a+1} {b+1}\n')
video=OUT/'digital-double-wireframe.mp4'; obj=OUT/'digital-double-neutral.obj'; motion_file=OUT/'digital-double-motion.npz'
for p in (video,obj,motion_file):
    if not p.is_file() or p.stat().st_size<1000: raise SystemExit(f'BM02_DERIVATIVE_MISSING:{p}')
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM02_MEDIAPIPE_DIGITAL_DOUBLE_PHYSICAL_V1','benchmark_id':'BM-02','environment':'PREPROD',
 'status':'MEDIAPIPE_REAL_HUMAN_DIGITAL_DOUBLE_PHYSICAL_PROVEN','benchmark_credit_component':True,
 'source':{'identity_type':'REAL_AUTHORIZED','path':CLIP.name,'sha256':sha(CLIP),'admission_sha256':sha(ADMISSION),'source_pixels_in_render':False},
 'runtime':{'engine':'MediaPipe FaceMesh','code_license':'Apache-2.0','model_license':'Apache-2.0','code_license_verified':True,'model_license_verified':True,'prod_runtime_license_safe':True,'added_cost_eur':0},
 'tracking':{'decoded_frames':decoded,'tracked_frames':valid,'tracking_ratio':round(ratio,6),'landmarks_per_tracked_frame':int(arr.shape[1]),'edge_count':len(edges),'motion_rms_normalized':round(motion,8),'fps':round(fps,4)},
 'outputs':{
   'wireframe_video':{'path':video.name,'sha256':sha(video),'bytes':video.stat().st_size},
   'wireframe_obj':{'path':obj.name,'sha256':sha(obj),'bytes':obj.stat().st_size},
   'motion_track':{'path':motion_file.name,'sha256':sha(motion_file),'bytes':motion_file.stat().st_size}
 },
 'elapsed_seconds':round(time.time()-START,3),'human_required':False,'additional_cost_eur':0,'publish_authorized':False,'spend_authorized':False,'prod_mutation_authorized':False
}
(OUT/'bm02-mediapipe-digital-double.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
