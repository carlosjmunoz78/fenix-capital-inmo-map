#!/usr/bin/env python3
"""Create and physically render an animated 3D VFX shot on sealed Nova-01.

Runs inside Blender 5.2 LTS after opening the immutable BM-01 .blend. VFX are true
3D objects with animation curves and emissive materials; no 2D overlay or static pan.
"""
from __future__ import annotations
import bpy, hashlib, json, math, os, time
from pathlib import Path
from mathutils import Vector

OUT=Path(os.environ.get('BM06_OUT','ums-bm06-vfx')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
FRAMES_DIR=OUT/'frames'; FRAMES_DIR.mkdir(parents=True,exist_ok=True)
FRAME_COUNT=int(os.environ.get('BM06_FRAMES','12')); FPS=int(os.environ.get('BM06_FPS','12')); RES=int(os.environ.get('BM06_RES','256'))
SOURCE_BLEND=Path(bpy.data.filepath).resolve(); EXPECTED=os.environ.get('BM01_BLEND_SHA256','').strip()
started=time.time()

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def emission_mat(name,color,strength):
    m=bpy.data.materials.new(name); m.use_nodes=True; n=m.node_tree.nodes; n.clear()
    out=n.new('ShaderNodeOutputMaterial'); em=n.new('ShaderNodeEmission'); em.inputs['Color'].default_value=(*color,1.0); em.inputs['Strength'].default_value=strength
    m.node_tree.links.new(em.outputs['Emission'],out.inputs['Surface']); return m

def look(obj,target=(0,0,1.05)): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

if not SOURCE_BLEND.is_file(): raise SystemExit('BM01_SOURCE_BLEND_MISSING')
source_sha=sha(SOURCE_BLEND)
if EXPECTED and source_sha!=EXPECTED: raise SystemExit('BM01_SOURCE_BLEND_SHA_MISMATCH')
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=RES; scene.render.resolution_y=RES; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.fps=FPS
scene.frame_start=1; scene.frame_end=FRAME_COUNT

cyan=emission_mat('VFX_Cyan',(0.05,0.55,1.0),7.0); gold=emission_mat('VFX_Gold',(1.0,0.42,0.04),5.0); violet=emission_mat('VFX_Violet',(0.45,0.08,1.0),4.0)
vfx=[]
# Two luminous torus rings behind/around the upper body.
for idx,(radius,z,mat) in enumerate([(1.55,1.18,cyan),(1.92,1.08,violet)]):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=0.035,major_segments=96,minor_segments=12,location=(0,0.42,z),rotation=(math.radians(78),0,0))
    o=bpy.context.object; o.name=f'VFX_EnergyRing_{idx+1}'; o.data.materials.append(mat); vfx.append(o)
    o.rotation_euler.z=-0.25 if idx==0 else 0.25; o.keyframe_insert('rotation_euler',frame=1,index=2)
    o.rotation_euler.z+=(math.pi*1.35 if idx==0 else -math.pi*1.05); o.keyframe_insert('rotation_euler',frame=FRAME_COUNT,index=2)
# Eight orbiting emissive energy motes with true 3D translation keyframes.
for idx in range(8):
    a=2*math.pi*idx/8
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=0.075,location=(1.55*math.cos(a),0.12+0.38*math.sin(a),1.15+0.78*math.sin(a)))
    o=bpy.context.object; o.name=f'VFX_Orb_{idx+1:02d}'; o.data.materials.append(gold if idx%2==0 else cyan); vfx.append(o)
    for frame in (1,FRAME_COUNT//2,FRAME_COUNT):
        t=(frame-1)/max(FRAME_COUNT-1,1); ang=a+2*math.pi*t*(1.0+0.08*(idx%3)); o.location=(1.55*math.cos(ang),0.08+0.48*math.sin(ang),1.15+0.78*math.sin(ang*1.15)); o.keyframe_insert('location',frame=frame)
# Pulsing central energy core and light.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=0.13,location=(0,-0.72,1.28)); core=bpy.context.object; core.name='VFX_EnergyCore'; core.data.materials.append(gold); vfx.append(core)
for frame,scale in [(1,0.65),(FRAME_COUNT//2,1.35),(FRAME_COUNT,0.72)]: core.scale=(scale,scale,scale); core.keyframe_insert('scale',frame=frame)
bpy.ops.object.light_add(type='POINT',location=(0,-1.1,1.45)); light=bpy.context.object; light.name='VFX_PulseLight'; light.data.color=(1.0,0.28,0.04); light.data.energy=120; light.data.shadow_soft_size=1.2; vfx.append(light)
light.data.keyframe_insert('energy',frame=1); light.data.energy=650; light.data.keyframe_insert('energy',frame=FRAME_COUNT//2); light.data.energy=180; light.data.keyframe_insert('energy',frame=FRAME_COUNT)

# Keep the existing BM01 camera but add a small dolly so the shot itself is animated in 3D.
cam=scene.camera or bpy.data.objects.get('Nova_Camera')
if cam is None: raise SystemExit('BM01_CAMERA_MISSING')
scene.camera=cam
base=cam.location.copy()
for frame,dx,dz in [(1,-0.10,0.00),(FRAME_COUNT//2,0.00,0.06),(FRAME_COUNT,0.12,0.00)]: cam.location=(base.x+dx,base.y,base.z+dz); look(cam,(0,0,1.08)); cam.keyframe_insert('location',frame=frame); cam.keyframe_insert('rotation_euler',frame=frame)

frame_meta=[]
for frame in range(1,FRAME_COUNT+1):
    scene.frame_set(frame); p=FRAMES_DIR/f'bm06_{frame:04d}.png'; scene.render.filepath=str(p); t=time.time(); bpy.ops.render.render(write_still=True)
    frame_meta.append({'frame':frame,'path':str(p.relative_to(OUT)),'sha256':sha(p),'bytes':p.stat().st_size,'render_seconds':round(time.time()-t,3)})

blend=OUT/'bm06-vfx-shot.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
animated=[]; fcurve_count=0
for o in vfx+[cam]:
    ad=getattr(o,'animation_data',None)
    if ad and ad.action:
        curves=list(ad.action.fcurves); fcurve_count+=len(curves)
        if curves: animated.append(o.name)
# Light energy is datablock animation, not object animation.
if light.data.animation_data and light.data.animation_data.action:
    curves=list(light.data.animation_data.action.fcurves); fcurve_count+=len(curves); animated.append('VFX_PulseLight.data')
unique=len({f['sha256'] for f in frame_meta})
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM06_BLENDER_VFX_CANDIDATE_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-06',
 'character_id':'UMS-SYNTH-CHAR-001','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
 'status':'THREE_D_ANIMATED_VFX_CANDIDATE_GENERATED','source_benchmark':'BM-01','source_blend':{'sha256':source_sha,'path':str(SOURCE_BLEND)},
 'blender_version':bpy.app.version_string,'render_engine':scene.render.engine,'render_device':'CPU','frame_count':FRAME_COUNT,'fps':FPS,'resolution':[RES,RES],
 'vfx_object_names':[o.name for o in vfx],'vfx_object_count':len(vfx),'animated_targets':animated,'animation_fcurve_count':fcurve_count,
 'frame_hash_uniqueness':{'unique':unique,'total':FRAME_COUNT,'motion_proven':unique>=FRAME_COUNT-1},'frames':frame_meta,
 'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size},'elapsed_seconds':round(time.time()-started,3),
 'vfx_techniques':['EMISSIVE_3D_GEOMETRY','ANIMATED_TRANSFORMS','PULSING_POINT_LIGHT','CAMERA_DOLLY'],
 'two_d_overlay_used':False,'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm06-vfx-candidate.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2)); raise SystemExit(0 if manifest['frame_hash_uniqueness']['motion_proven'] else 11)
