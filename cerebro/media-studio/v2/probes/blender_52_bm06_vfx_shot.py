#!/usr/bin/env python3
"""Physical PREPROD BM-06: deterministic 3D animated VFX shot in Blender 5.2 LTS.

All geometry, lighting and effects are generated procedurally. No external media assets,
textures, models or paid services are used.
"""
from __future__ import annotations
import bpy, math, os, json, hashlib, time
from pathlib import Path
from mathutils import Vector

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD':
    raise SystemExit('BM06_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true':
    raise SystemExit('BM06_SPEND_NOT_ALLOWED')

OUT=Path(os.environ.get('UMS_BM06_OUT','ums-bm06-vfx')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
FRAMES=OUT/'frames'; FRAMES.mkdir(exist_ok=True)
STARTED=time.time(); SEED=20261025; FRAME_COUNT=18; FPS=9

def sha(p:Path)->str: return hashlib.sha256(p.read_bytes()).hexdigest()
def look(obj,target=(0,0,0.2)):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def emission_material(name,rgb,strength):
    m=bpy.data.materials.new(name); m.use_nodes=True
    nt=m.node_tree; nt.nodes.clear()
    out=nt.nodes.new('ShaderNodeOutputMaterial'); em=nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value=(*rgb,1); em.inputs['Strength'].default_value=strength
    nt.links.new(em.outputs['Emission'],out.inputs['Surface'])
    return m,em
def principled(name,rgb,metallic=0.0,roughness=0.4):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=(*rgb,1)
    bsdf.inputs['Metallic'].default_value=metallic; bsdf.inputs['Roughness'].default_value=roughness
    return m
def add_uv(name,loc,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o
def key(obj,path,frame): obj.keyframe_insert(data_path=path,frame=frame)

# Clean scene.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=320; scene.render.resolution_y=180; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='8'
scene.render.fps=FPS; scene.frame_start=1; scene.frame_end=FRAME_COUNT
scene.world.color=(0.004,0.006,0.012)

# Compositor optical layer: deterministic fog glow around emissive elements.
scene.use_nodes=True
nodes=scene.node_tree.nodes; links=scene.node_tree.links; nodes.clear()
rl=nodes.new('CompositorNodeRLayers'); glare=nodes.new('CompositorNodeGlare'); comp=nodes.new('CompositorNodeComposite')
glare.glare_type='FOG_GLOW'; glare.quality='HIGH'; glare.threshold=0.8; glare.size=6; glare.mix=0.0
links.new(rl.outputs['Image'],glare.inputs['Image']); links.new(glare.outputs['Image'],comp.inputs['Image'])

# Materials and set dressing.
core_mat,core_em=emission_material('BM06_EnergyCore',(0.08,0.55,1.0),8.0)
ring_mat,_=emission_material('BM06_ContainmentRing',(0.03,0.22,0.85),4.5)
shard_mat,_=emission_material('BM06_OrbitalShard',(0.15,0.70,1.0),3.2)
metal=principled('BM06_ChamberMetal',(0.015,0.025,0.055),0.7,0.28)
accent=principled('BM06_AccentMetal',(0.08,0.11,0.16),0.9,0.22)

# Floor and backdrop geometry.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=5.0,depth=0.32,location=(0,0,-1.35)); platform=bpy.context.object; platform.name='BM06_Platform'; platform.data.materials.append(metal)
bpy.ops.mesh.primitive_torus_add(major_radius=3.6,minor_radius=0.14,major_segments=64,minor_segments=12,location=(0,0,-1.13)); floor_ring=bpy.context.object; floor_ring.name='BM06_FloorAccent'; floor_ring.data.materials.append(ring_mat)

# Energy core.
core=add_uv('BM06_Energy_Core',(0,0,0),(0.88,0.88,0.88),core_mat)
for f in range(1,FRAME_COUNT+1):
    phase=(f-1)/(FRAME_COUNT-1)
    s=0.88*(1.0+0.10*math.sin(phase*math.tau*2.0))
    core.scale=(s,s,s); key(core,'scale',f)
    core_em.inputs['Strength'].default_value=7.0+3.0*(0.5+0.5*math.sin(phase*math.tau*2.0))
    core_em.inputs['Strength'].keyframe_insert(data_path='default_value',frame=f)

# Three animated containment rings.
rings=[]
for i,(radius,minor,tilt) in enumerate([(1.45,0.055,(math.radians(63),0,0)),(1.78,0.045,(0,math.radians(58),math.radians(20))),(2.05,0.04,(math.radians(28),math.radians(32),0))]):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=minor,major_segments=64,minor_segments=10,location=(0,0,0))
    r=bpy.context.object; r.name=f'BM06_Containment_Ring_{i+1:02d}'; r.data.materials.append(ring_mat); rings.append(r)
    for f in range(1,FRAME_COUNT+1):
        p=(f-1)/(FRAME_COUNT-1); spin=(i+1)*math.tau*p*(0.45+0.16*i)
        r.rotation_euler=(tilt[0]+spin*(0.25+i*0.05),tilt[1]+spin*(0.35+i*0.04),tilt[2]+spin)
        key(r,'rotation_euler',f)

# 24 deterministic orbital shards (procedural particle-like field).
shards=[]
for i in range(24):
    angle0=(i/24.0)*math.tau
    radius=2.25+(i%5)*0.18
    z0=-0.62+(i%7)*0.20
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=0.10+(i%3)*0.018,location=(radius*math.cos(angle0),radius*math.sin(angle0),z0))
    s=bpy.context.object; s.name=f'BM06_Orbital_Shard_{i+1:02d}'; s.scale=(1.0,0.48,1.55); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); s.data.materials.append(shard_mat); shards.append(s)
    speed=0.55+(i%4)*0.09; phase_offset=(i%6)*0.12
    for f in range(1,FRAME_COUNT+1):
        p=(f-1)/(FRAME_COUNT-1)
        a=angle0+math.tau*(speed*p+phase_offset*0.06)
        wob=0.18*math.sin(a*2.0+i*0.7)
        s.location=(radius*math.cos(a),radius*math.sin(a),z0+wob)
        s.rotation_euler=(a*0.7,a*0.33,-a*0.9)
        key(s,'location',f); key(s,'rotation_euler',f)

# Reactive lights.
def add_point(name,loc,color,energy):
    bpy.ops.object.light_add(type='POINT',location=loc); l=bpy.context.object; l.name=name; l.data.color=color; l.data.energy=energy; l.data.shadow_soft_size=2.0; return l
core_light=add_point('BM06_Core_Light',(0,0,0.4),(0.08,0.35,1.0),900)
rim_a=add_point('BM06_Rim_A',(-3.8,-2.4,2.8),(0.08,0.22,1.0),500)
rim_b=add_point('BM06_Rim_B',(3.2,1.8,2.2),(0.12,0.55,1.0),420)
for f in range(1,FRAME_COUNT+1):
    p=(f-1)/(FRAME_COUNT-1); core_light.data.energy=720+380*(0.5+0.5*math.sin(p*math.tau*2.0)); core_light.data.keyframe_insert(data_path='energy',frame=f)
    rim_a.data.energy=420+160*(0.5+0.5*math.cos(p*math.tau)); rim_a.data.keyframe_insert(data_path='energy',frame=f)
    rim_b.data.energy=360+150*(0.5+0.5*math.sin(p*math.tau+1.1)); rim_b.data.keyframe_insert(data_path='energy',frame=f)

# Camera dolly/orbit.
bpy.ops.object.camera_add(location=(7.1,-7.7,3.4)); cam=bpy.context.object; cam.name='BM06_Camera'; cam.data.lens=52; scene.camera=cam
for f in range(1,FRAME_COUNT+1):
    p=(f-1)/(FRAME_COUNT-1); a=math.radians(-43+18*p)
    radius=10.45-0.7*p
    cam.location=(radius*math.sin(a),-radius*math.cos(a),3.35-0.35*p)
    look(cam,(0,0,-0.05)); key(cam,'location',f); key(cam,'rotation_euler',f)

# Save physical animated scene before rendering.
blend=OUT/'bm06-animated-vfx-shot.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))

# Render 18 physical frames.
frames=[]
for f in range(1,FRAME_COUNT+1):
    scene.frame_set(f); p=FRAMES/f'bm06_{f:04d}.png'; scene.render.filepath=str(p); t=time.time(); bpy.ops.render.render(write_still=True)
    frames.append({'index':f,'path':str(p.relative_to(OUT)),'sha256':sha(p),'bytes':p.stat().st_size,'render_seconds':round(time.time()-t,3)})

manifest={
  'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM06_VFX_SHOT_CANDIDATE_V1','benchmark_id':'BM-06','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.0.0',
  'status':'BM06_PHYSICAL_CANDIDATE_GENERATED','runtime':{'blender_version':bpy.app.version_string,'engine':scene.render.engine,'device':'CPU'},
  'shot':{'sequence_id':'SEQ-BM06-001','scene_id':'SCN-BM06-ENERGY-CHAMBER','shot_id':'SHT-BM06-001','frame_count':FRAME_COUNT,'fps':FPS,'resolution':[scene.render.resolution_x,scene.render.resolution_y]},
  'vfx':{'families':['ENERGY','PARTICLES','LIGHT','OPTICAL'],'energy_core':'BM06_Energy_Core','containment_rings':[r.name for r in rings],'particle_shards':[s.name for s in shards],'lights':[core_light.name,rim_a.name,rim_b.name],'compositor_glare':{'type':'FOG_GLOW','quality':'HIGH','threshold':0.8,'size':6}},
  'rights':{'status':'INTERNAL_ORIGINAL','external_assets':0,'external_textures':0,'external_models':0},
  'artifacts':{'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size},'frames':frames},
  'scene_object_count':len(bpy.data.objects),'elapsed_seconds':round(time.time()-STARTED,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm06-vfx-candidate.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
