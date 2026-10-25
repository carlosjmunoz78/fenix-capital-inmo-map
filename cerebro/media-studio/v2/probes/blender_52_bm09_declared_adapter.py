#!/usr/bin/env python3
"""BM-09 PREPROD declared-device adapter dry run.

Renders a deterministic eight-view light-field style output from the sealed BM-07 GLB.
The device profile is synthetic CEREBRO reference hardware. No physical holographic
or light-field display is claimed or required by this dry-run benchmark path.
"""
from __future__ import annotations
import bpy,hashlib,json,math,os,time
from pathlib import Path
from mathutils import Vector

if os.environ.get('CEREBRO_ENVIRONMENT','PREPROD').upper()!='PREPROD': raise SystemExit('BM09_PREPROD_ONLY')
if os.environ.get('CEREBRO_SPEND_AUTHORIZED','false').lower()=='true': raise SystemExit('BM09_SPEND_NOT_ALLOWED')

SRC=Path(os.environ['BM09_SOURCE_GLB']).resolve(); EXPECTED=os.environ.get('BM09_SOURCE_SHA256','').lower().strip()
OUT=Path(os.environ.get('UMS_BM09_OUT','ums-bm09-declared-device')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
VIEWS=OUT/'views'; VIEWS.mkdir(exist_ok=True); START=time.time()
ANGLES=[-28,-20,-12,-4,4,12,20,28]

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def look(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

if not SRC.is_file(): raise SystemExit('BM09_SOURCE_GLB_MISSING')
actual=sha(SRC)
if EXPECTED and actual!=EXPECTED: raise SystemExit(f'BM09_SOURCE_HASH_MISMATCH:{actual}')

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SRC))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes: raise SystemExit('BM09_NO_IMPORTED_MESH')
# Bounds in world coordinates.
pts=[]
for o in meshes:
    pts.extend([o.matrix_world @ Vector(c) for c in o.bound_box])
mins=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
maxs=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
center=(mins+maxs)*0.5; ext=maxs-mins; diagonal=ext.length

scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=256; scene.render.resolution_y=256; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.world.color=(0.008,0.012,0.024)
# Floor gives the declared device output a stable spatial reference plane.
bpy.ops.mesh.primitive_plane_add(size=max(8.0,diagonal*2.6),location=(center.x,center.y,mins.z-0.03)); floor=bpy.context.object; floor.name='BM09_Declared_Device_Floor'
mat=bpy.data.materials.new('BM09_Floor'); mat.diffuse_color=(0.015,0.022,0.045,1); floor.data.materials.append(mat)
# Deterministic lights.
for name,loc,energy,size in [('Key',(center.x-4,center.y-5,center.z+5),850,4.0),('Fill',(center.x+4,center.y-1,center.z+2),520,3.0)]:
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.name=f'BM09_{name}'; l.data.energy=energy; l.data.shape='DISK'; l.data.size=size; look(l,center)
bpy.ops.object.camera_add(); cam=bpy.context.object; cam.name='BM09_Declared_Device_Camera'; cam.data.lens=58; scene.camera=cam
radius=max(4.8,diagonal*1.75)
views=[]
for idx,deg in enumerate(ANGLES,1):
    a=math.radians(deg); cam.location=(center.x+radius*math.sin(a),center.y-radius*math.cos(a),center.z+diagonal*0.14); look(cam,center)
    p=VIEWS/f'bm09-view-{idx:02d}.png'; scene.render.filepath=str(p); t=time.time(); bpy.ops.render.render(write_still=True)
    if not p.is_file() or p.stat().st_size<5000: raise RuntimeError(f'BM09_VIEW_NOT_RENDERED:{idx}')
    views.append({'index':idx,'angle_degrees':deg,'path':str(p.relative_to(OUT)),'sha256':sha(p),'bytes':p.stat().st_size,'camera_location':[float(x) for x in cam.location],'render_seconds':round(time.time()-t,3)})
blend=OUT/'bm09-declared-device-adapter.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM09_DECLARED_DEVICE_ADAPTER_V1','benchmark_id':'BM-09','environment':'PREPROD','status':'DECLARED_DEVICE_ADAPTER_DRY_RUN_GENERATED',
 'source':{'benchmark_id':'BM-07','asset':'bm07-spatial-asset.glb','sha256':actual,'bytes':SRC.stat().st_size},
 'device_profile':{'id':'CEREBRO_DECLARED_LIGHTFIELD_8V_V1','class':'DECLARED_LIGHTFIELD_SPATIAL_DISPLAY','synthetic_profile':True,'hardware_present':False,'hardware_runtime_proven':False,'dry_run_only':True,'view_count':8,'quilt_layout':[4,2],'per_view_resolution':[256,256],'view_angles_degrees':ANGLES,'linear_unit':'meter'},
 'adapter':{'input_format':'GLB','output_views':'PNG','camera_lens_mm':58,'spatial_center':[float(x) for x in center],'source_extents_m':[float(x) for x in ext],'source_diagonal_m':float(diagonal)},
 'views':views,'artifacts':{'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size}},
 'rights':{'status':'INTERNAL_ORIGINAL','external_assets':0},'elapsed_seconds':round(time.time()-START,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm09-adapter-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
