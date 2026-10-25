#!/usr/bin/env python3
import bpy, math, os, json, hashlib, time
from pathlib import Path
from mathutils import Vector

OUT=Path(os.environ.get('UMS_BLENDER_OUT','ums-blender52-nova01')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
REF=Path(os.environ.get('NOVA01_FRONT_REFERENCE','')).resolve() if os.environ.get('NOVA01_FRONT_REFERENCE') else None
started=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def srgb_channel_to_linear(v):
    v=float(v)/255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def rgb8_linear(rgb): return tuple(srgb_channel_to_linear(v) for v in rgb)
def mat(name,rgb8,rough=0.55):
    rgb=rgb8_linear(rgb8); rgba=(*rgb,1.0); m=bpy.data.materials.new(name); m.diffuse_color=rgba; m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=rgba; bsdf.inputs['Roughness'].default_value=rough
    if 'Metallic' in bsdf.inputs: bsdf.inputs['Metallic'].default_value=0.0
    if 'IOR Level' in bsdf.inputs: bsdf.inputs['IOR Level'].default_value=0.18
    return m

def look(obj,target=(0,0,1.0)): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def add_uv(name,loc,scale,material,segments=64,rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); bpy.ops.object.shade_smooth(); return o

def add_curve(name,pts,material,bevel=0.035):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=bevel; c.bevel_resolution=4; c.resolution_u=10
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(pts)-1)
    for bp,co in zip(s.bezier_points,pts): bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(material); return o

def add_triangle(name,pts,material):
    mesh=bpy.data.meshes.new(name+'Mesh'); mesh.from_pydata(pts,[],[(0,1,2)]); mesh.update(); o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); o.data.materials.append(material); return o

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'; scene.render.image_settings.color_depth='8'; scene.render.fps=24
scene.view_settings.view_transform='Standard'; scene.view_settings.exposure=0.0; scene.view_settings.gamma=1.0
scene.world.use_nodes=True
world_bg=scene.world.node_tree.nodes.get('Background'); world_bg.inputs['Color'].default_value=(*rgb8_linear((23,26,32)),1.0); world_bg.inputs['Strength'].default_value=1.0

skin=mat('Nova Skin',(200,143,114),0.62); skin_shadow=mat('Nova Nose',(186,129,102),0.65)
hair=mat('Nova Hair',(32,37,44),0.72); suit=mat('Nova Suit',(48,52,59),0.68); shirt=mat('Nova Shirt',(36,41,49),0.68)
white=mat('Eye White',(245,245,240),0.48); blue=mat('Eye Blue',(85,122,149),0.4); brow=mat('Brow',(42,37,36),0.7); mouth=mat('Mouth',(107,51,46),0.68); gold=mat('Gold Trim',(217,180,91),0.38)

add_uv('Head',(0,0,1.55),(1.05,0.88,1.32),skin)
add_uv('Ear_L',(-1.03,0,1.55),(0.22,0.17,0.34),skin,48,24); add_uv('Ear_R',(1.03,0,1.55),(0.22,0.17,0.34),skin,48,24)
add_uv('Hair_Cap',(0,0.04,2.45),(1.10,0.90,0.55),hair)
add_triangle('Hair_Wedge_L',[(-0.92,-0.84,2.37),(0,-0.90,2.62),(-0.28,-0.92,2.20)],hair)
add_triangle('Hair_Wedge_R',[(0.92,-0.84,2.37),(0,-0.90,2.62),(0.28,-0.92,2.20)],hair)
for x in (-0.38,0.38):
    add_uv('EyeWhite'+str(x),(x,-0.835,1.78),(0.20,0.075,0.115),white,48,24)
    add_uv('Pupil'+str(x),(x,-0.905,1.78),(0.075,0.035,0.075),blue,40,20)
add_curve('Brow_L',[(-0.63,-0.91,2.05),(-0.38,-0.96,2.08),(-0.18,-0.91,2.05)],brow,0.045)
add_curve('Brow_R',[(0.18,-0.91,2.05),(0.38,-0.96,2.08),(0.63,-0.91,2.05)],brow,0.045)
add_uv('Nose',(0,-0.89,1.48),(0.14,0.12,0.33),skin_shadow,40,20)
add_curve('Smile',[(-0.31,-0.91,1.12),(0,-0.96,1.08),(0.31,-0.91,1.12)],mouth,0.028)
add_uv('BeautyMark',(-0.37,-0.91,1.37),(0.035,0.018,0.035),brow,24,12)
add_uv('Torso',(0,0,-0.40),(1.48,0.72,1.48),suit)
add_triangle('Collar_L',[(-0.72,-0.70,0.55),(-0.10,-0.78,-0.25),(0,-0.79,0.42)],hair)
add_triangle('Collar_R',[(0.72,-0.70,0.55),(0.10,-0.78,-0.25),(0,-0.79,0.42)],hair)
add_triangle('Shirt',[(-0.18,-0.785,0.44),(0.18,-0.785,0.44),(0,-0.79,-0.12)],shirt)
add_curve('GoldShoulder_L',[(-1.36,-0.56,0.17),(-1.20,-0.70,0.48),(-0.83,-0.73,0.67)],gold,0.035)
add_curve('GoldShoulder_R',[(1.36,-0.56,0.17),(1.20,-0.70,0.48),(0.83,-0.73,0.67)],gold,0.035)

bpy.ops.object.light_add(type='AREA',location=(-3.2,-4.5,5.2)); key=bpy.context.object; key.data.energy=720; key.data.size=4; look(key,(0,0,1.2))
bpy.ops.object.light_add(type='AREA',location=(3.4,-3.0,3.4)); fill=bpy.context.object; fill.data.energy=420; fill.data.size=3; look(fill,(0,0,1.4))
bpy.ops.object.light_add(type='AREA',location=(0,2.0,4.8)); rim=bpy.context.object; rim.data.energy=520; rim.data.size=3; look(rim,(0,0,1.8))

bpy.ops.object.camera_add(location=(0,-8.3,1.15)); cam=bpy.context.object; cam.name='Nova_Camera'; cam.data.lens=60; scene.camera=cam; look(cam,(0,0,1.05))
views={'FRONT':(0,-8.3,1.15),'PROFILE_LEFT':(-6.6,-3.0,1.25),'THREE_QUARTER_RIGHT':(4.7,-6.2,1.30)}; renders={}
for label,pos in views.items():
    cam.location=pos; look(cam,(0,0,1.05)); path=OUT/f'nova01-3d-{label.lower()}.png'; scene.render.filepath=str(path); t=time.time(); bpy.ops.render.render(write_still=True); renders[label]={'path':path.name,'sha256':sha(path),'bytes':path.stat().st_size,'render_seconds':round(time.time()-t,3)}

blend=OUT/'nova01-3d-reference.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
glb=OUT/'nova01-3d-reference.glb'; bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_cameras=True,export_lights=True)
usd=OUT/'nova01-3d-reference.usdc'; usd_status='NOT_EXPORTED'
try: bpy.ops.wm.usd_export(filepath=str(usd)); usd_status='EXPORTED'
except Exception as exc: usd_status=f'OPTIONAL_EXPORT_FAILED:{type(exc).__name__}'
assets={'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size},'glb':{'path':glb.name,'sha256':sha(glb),'bytes':glb.stat().st_size},'renders':renders}
if usd.exists(): assets['usd']={'path':usd.name,'sha256':sha(usd),'bytes':usd.stat().st_size}
manifest={'schema_version':'1.2.0','state_type':'CEREBRO_UMS_BM01_BLENDER_3D_REFERENCE_CANDIDATE_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','character_id':'UMS-SYNTH-CHAR-001','character_name':'Nova-01','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,'status':'THREE_D_REFERENCE_CANDIDATE_GENERATED','identity_validation':'CROSS_MODAL_METRICS_REQUIRED_BEFORE_PROOF','blender_version':bpy.app.version_string,'render_engine':scene.render.engine,'render_device':'CPU','color_management':'STANDARD_SRGB8_TO_LINEAR_MATERIALS','source_reference':({'path':str(REF),'sha256':sha(REF),'bytes':REF.stat().st_size} if REF and REF.exists() else None),'assets':assets,'usd_status':usd_status,'scene_object_count':len(bpy.data.objects),'elapsed_seconds':round(time.time()-started,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False}
(OUT/'bm01-blender-3d-reference-candidate.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
