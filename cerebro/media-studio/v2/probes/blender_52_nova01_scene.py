#!/usr/bin/env python3
import bpy, math, os, json, hashlib, time
from pathlib import Path
from mathutils import Vector

OUT=Path(os.environ.get('UMS_BLENDER_OUT','.ums-blender52-nova01')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
REF=Path(os.environ.get('NOVA01_FRONT_REFERENCE','')).resolve() if os.environ.get('NOVA01_FRONT_REFERENCE') else None
started=time.time()

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def mat(name,rgba,metallic=0.0,roughness=0.42):
    m=bpy.data.materials.new(name); m.diffuse_color=rgba; m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Base Color'].default_value=rgba; bsdf.inputs['Metallic'].default_value=metallic; bsdf.inputs['Roughness'].default_value=roughness
    return m

def look(obj,target=(0,0,1.2)):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def add_uv(name,loc,scale,material,segments=64,rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); bpy.ops.object.shade_smooth(); return o

def add_curve(name,pts,material,bevel=0.065):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.bevel_depth=bevel; c.bevel_resolution=5; c.resolution_u=12
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(pts)-1)
    for bp,co in zip(s.bezier_points,pts): bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(material); return o

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.cameras,bpy.data.lights):
    pass
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'; scene.render.resolution_x=512; scene.render.resolution_y=512; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False; scene.render.image_settings.color_mode='RGBA'
scene.render.image_settings.color_depth='8'; scene.render.fps=24
scene.world.color=(0.055,0.018,0.11)

navy=mat('Nova Navy',(0.018,0.025,0.065,1)); white=mat('Nova Face',(0.94,0.95,0.98,1)); purple=mat('Nova Purple',(0.42,0.11,0.75,1)); orange=mat('Nova Orange',(1.0,0.31,0.05,1)); dark=mat('Nova Torso',(0.025,0.03,0.07,1)); accent=mat('Nova Accent',(0.16,0.035,0.32,1),0.08,0.34)

head=add_uv('Nova_Head',(0,0,1.65),(1.42,1.20,1.48),navy)
face=add_uv('Nova_Face',(0,-1.095,1.65),(0.92,0.16,1.02),white)
add_uv('Nova_Eye_L',(-0.34,-1.25,1.90),(0.145,0.08,0.22),purple,48,24)
add_uv('Nova_Eye_R',(0.34,-1.25,1.90),(0.145,0.08,0.22),purple,48,24)
smile=[]
for i in range(9):
    x=-0.42+i*0.105; z=1.32-0.18*math.cos(math.pi*(i/8)); smile.append((x,-1.29,z))
add_curve('Nova_Smile',smile,orange,0.055)
add_uv('Nova_Torso',(0,0,-0.25),(1.22,0.78,1.30),dark)
add_curve('Nova_Collar',[(-0.65,-0.73,0.55),(0,-0.95,0.33),(0.65,-0.73,0.55)],accent,0.055)

bpy.ops.object.light_add(type='AREA',location=(-3.5,-4.0,5.5)); key=bpy.context.object; key.name='Key'; key.data.energy=900; key.data.shape='DISK'; key.data.size=4; look(key,(0,0,1.2))
bpy.ops.object.light_add(type='AREA',location=(4.0,-2.0,2.8)); fill=bpy.context.object; fill.name='Fill'; fill.data.energy=600; fill.data.size=3; look(fill,(0,0,1.3))
bpy.ops.object.light_add(type='AREA',location=(0,2.5,4.5)); rim=bpy.context.object; rim.name='Rim'; rim.data.energy=850; rim.data.size=2.5; look(rim,(0,0,1.7))

bpy.ops.object.camera_add(location=(0,-8.0,1.45)); cam=bpy.context.object; cam.name='Nova_Camera'; cam.data.lens=58; scene.camera=cam; look(cam,(0,0,1.15))

views={'FRONT':(0,-8.0,1.45),'PROFILE_LEFT':(-7.0,-2.5,1.45),'THREE_QUARTER_RIGHT':(4.7,-6.0,1.55)}
renders={}
for label,pos in views.items():
    cam.location=pos; look(cam,(0,0,1.15)); path=OUT/f'nova01-3d-{label.lower()}.png'; scene.render.filepath=str(path); t=time.time(); bpy.ops.render.render(write_still=True); renders[label]={'path':path.name,'sha256':sha(path),'bytes':path.stat().st_size,'render_seconds':round(time.time()-t,3)}

blend=OUT/'nova01-3d-reference.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
glb=OUT/'nova01-3d-reference.glb'; bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_cameras=True,export_lights=True)
usd=OUT/'nova01-3d-reference.usdc'
usd_status='NOT_EXPORTED'
try:
    bpy.ops.wm.usd_export(filepath=str(usd)); usd_status='EXPORTED'
except Exception as exc:
    usd_status=f'OPTIONAL_EXPORT_FAILED:{type(exc).__name__}'

assets={'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size},'glb':{'path':glb.name,'sha256':sha(glb),'bytes':glb.stat().st_size},'renders':renders}
if usd.exists(): assets['usd']={'path':usd.name,'sha256':sha(usd),'bytes':usd.stat().st_size}
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM01_BLENDER_3D_REFERENCE_PROOF_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','character_id':'UMS-SYNTH-CHAR-001','character_name':'Nova-01','identity_type':'SYNTHETIC_ORIGINAL','real_person_reference':False,
 'status':'THREE_D_REFERENCE_PROOF_GENERATED','blender_version':bpy.app.version_string,'render_engine':scene.render.engine,'render_device':'CPU','source_reference':({'path':str(REF),'sha256':sha(REF),'bytes':REF.stat().st_size} if REF and REF.exists() else None),'assets':assets,'usd_status':usd_status,'scene_object_count':len(bpy.data.objects),'elapsed_seconds':round(time.time()-started,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False
}
(OUT/'bm01-blender-3d-reference-proof.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
