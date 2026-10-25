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
EXPECTED_BLEND_SHA=os.environ.get('NOVA01_BLEND_SHA256','').strip().lower()
if not BLEND.is_file(): raise SystemExit('NOVA01_BLEND_MISSING')
started=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def look(obj,target=(0,0,1.05)):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

actual_blend_sha=sha(BLEND)
if EXPECTED_BLEND_SHA and actual_blend_sha!=EXPECTED_BLEND_SHA:
    raise SystemExit(f'NOVA01_BLEND_SHA_MISMATCH:{actual_blend_sha}')

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.fps=6
cam=scene.camera
if cam is None: raise SystemExit('NOVA01_CAMERA_MISSING')

frames_dir=ROOT/'frames'; frames_dir.mkdir(exist_ok=True)
frames=[]
# Deterministic micro-orbit: no Action/F-Curve API dependency. The motion is deliberately
# small so frames can be judged against the canonical frontal identity while still proving
# temporal continuity and real re-rendering from the 3D asset.
for frame in range(1,13):
    t=(frame-1)/11.0
    x=-0.20 + 0.40*t
    y=-8.30 - 0.06*math.sin(math.pi*t)
    z=1.15 + 0.025*math.sin(math.pi*t)
    cam.location=(x,y,z); look(cam,(0,0,1.05)); scene.frame_set(frame)
    p=frames_dir/f'nova01_{frame:04d}.png'; scene.render.filepath=str(p)
    render_started=time.time(); bpy.ops.render.render(write_still=True)
    frames.append({'index':frame,'path':str(p.relative_to(ROOT)),'sha256':sha(p),'bytes':p.stat().st_size,'render_seconds':round(time.time()-render_started,3),'camera_location':[round(float(v),5) for v in cam.location]})

manifest={
  'schema_version':'1.0.1','state_type':'CEREBRO_UMS_BM01_VIDEO_IDENTITY_CANDIDATE_V1',
  'company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-01',
  'character_id':'UMS-SYNTH-CHAR-001','character_name':'Nova-01','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
  'status':'VIDEO_IDENTITY_CANDIDATE_GENERATED','identity_validation':'CROSS_MODAL_FRAME_METRICS_REQUIRED_BEFORE_PROOF',
  'source_blend':{'path':str(BLEND),'sha256':actual_blend_sha,'bytes':BLEND.stat().st_size,'expected_sha256':EXPECTED_BLEND_SHA or None},
  'blender_version':bpy.app.version_string,'render_engine':scene.render.engine,'render_device':'CPU','fps':scene.render.fps,'frame_count':len(frames),
  'frames':frames,'tribunal_frames':[1,6,12],'motion':'DETERMINISTIC_MICRO_ORBIT','elapsed_seconds':round(time.time()-started,3),'additional_cost_eur':0,
  'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(ROOT/'bm01-video-identity-candidate.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
