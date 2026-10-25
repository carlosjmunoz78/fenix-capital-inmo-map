#!/usr/bin/env python3
"""Render a short PREPROD Nova-01 identity-motion candidate from the sealed Blender scene.

This creates video-source frames only. Cross-modal frame metrics and MP4 sealing happen
outside Blender and must pass before VIDEO_IDENTITY_PROOF may be claimed.
"""
import bpy, hashlib, json, math, os, time
from pathlib import Path
from mathutils import Vector

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD':
    raise SystemExit('BM01_VIDEO_PREPROD_ONLY')

ROOT=Path(os.environ.get('UMS_VIDEO_OUT','ums-bm01-video')).resolve(); ROOT.mkdir(parents=True,exist_ok=True)
BLEND=Path(os.environ['NOVA01_BLEND']).resolve()
if not BLEND.is_file(): raise SystemExit('NOVA01_BLEND_MISSING')
started=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def look(obj,target=(0,0,1.05)):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.fps=6
scene.frame_start=1; scene.frame_end=12
cam=scene.camera
if cam is None: raise SystemExit('NOVA01_CAMERA_MISSING')

# Micro-orbit keeps the face nearly frontal while proving temporal continuity.
keys=[(1,(-0.24,-8.28,1.15)),(6,(0.0,-8.36,1.18)),(12,(0.24,-8.28,1.15))]
for frame,pos in keys:
    scene.frame_set(frame); cam.location=pos; look(cam); cam.keyframe_insert(data_path='location',frame=frame); cam.keyframe_insert(data_path='rotation_euler',frame=frame)
for curve in cam.animation_data.action.fcurves if cam.animation_data and cam.animation_data.action else []:
    for kp in curve.keyframe_points: kp.interpolation='BEZIER'

frames_dir=ROOT/'frames'; frames_dir.mkdir(exist_ok=True)
scene.render.filepath=str(frames_dir/'nova01_')
bpy.ops.render.render(animation=True)
frames=sorted(frames_dir.glob('nova01_*.png'))
if len(frames)!=12: raise SystemExit(f'FRAME_COUNT_MISMATCH:{len(frames)}')
manifest={
  'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_VIDEO_IDENTITY_CANDIDATE_V1',
  'company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-01',
  'character_id':'UMS-SYNTH-CHAR-001','character_name':'Nova-01','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
  'status':'VIDEO_IDENTITY_CANDIDATE_GENERATED','identity_validation':'CROSS_MODAL_FRAME_METRICS_REQUIRED_BEFORE_PROOF',
  'source_blend':{'path':str(BLEND),'sha256':sha(BLEND),'bytes':BLEND.stat().st_size},
  'blender_version':bpy.app.version_string,'render_engine':scene.render.engine,'render_device':'CPU','fps':scene.render.fps,'frame_count':len(frames),
  'frames':[{'index':i+1,'path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size} for i,p in enumerate(frames)],
  'tribunal_frames':[1,6,12],'elapsed_seconds':round(time.time()-started,3),'additional_cost_eur':0,
  'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(ROOT/'bm01-video-identity-candidate.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
