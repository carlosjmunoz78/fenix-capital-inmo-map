#!/usr/bin/env python3
"""Import the BM-07 marching-cubes spatial asset into Blender 5.2 and prove it is usable."""
from __future__ import annotations
import bpy,hashlib,json,os,time
from pathlib import Path
from mathutils import Vector

OUT=Path(os.environ.get('BM07_OUT','ums-bm07-spatial')).resolve(); PLY=OUT/'bm07-isosurface.ply'; SOURCE=OUT/'bm07-volume-source.json'; started=time.time()
if not PLY.is_file() or not SOURCE.is_file(): raise SystemExit('BM07_SOURCE_ASSETS_MISSING')

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def look(obj,target=(0,0,0)): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

src=json.loads(SOURCE.read_text())
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.wm.ply_import(filepath=str(PLY)); mesh=bpy.context.object; mesh.name='BM07_Spatial_Energy_Field'
if mesh.type!='MESH': raise SystemExit('BM07_PLY_IMPORT_NOT_MESH')
# Smooth rendering and a physical material; geometry remains the imported spatial asset.
for p in mesh.data.polygons: p.use_smooth=True
mat=bpy.data.materials.new('BM07_SpatialMaterial'); mat.use_nodes=True; bsdf=mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(0.025,0.18,0.60,1); bsdf.inputs['Metallic'].default_value=0.22; bsdf.inputs['Roughness'].default_value=0.24
if 'Emission Color' in bsdf.inputs: bsdf.inputs['Emission Color'].default_value=(0.02,0.20,0.75,1); bsdf.inputs['Emission Strength'].default_value=0.45
mesh.data.materials.append(mat)
scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=320; scene.render.resolution_y=320; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.world.color=(0.004,0.006,0.015)
# Floor gives spatial scale/depth, but only the imported mesh is exported as the spatial asset.
bpy.ops.mesh.primitive_plane_add(size=14,location=(0,0,-2.25)); floor=bpy.context.object; floor.name='BM07_Proof_Floor'
fmat=bpy.data.materials.new('BM07_Floor'); fmat.diffuse_color=(0.015,0.02,0.035,1); floor.data.materials.append(fmat)
for name,loc,energy,size in [('Key',(-4,-5,5),1100,5),('Fill',(4,-2,2.5),650,4),('Rim',(0,4,4.5),950,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc); l=bpy.context.object; l.name=f'BM07_{name}'; l.data.energy=energy; l.data.shape='DISK'; l.data.size=size; look(l,(0,0,0))
bpy.ops.object.camera_add(location=(0,-7.8,1.2)); cam=bpy.context.object; cam.name='BM07_Camera'; cam.data.lens=52; scene.camera=cam
views={'FRONT':(0,-7.8,1.2),'OBLIQUE':(5.4,-5.4,2.0),'TOP_OBLIQUE':(-4.8,-4.8,4.8)}; renders={}
for label,pos in views.items():
    cam.location=pos; look(cam,(0,0,0)); p=OUT/f'bm07-{label.lower()}.png'; scene.render.filepath=str(p); t=time.time(); bpy.ops.render.render(write_still=True)
    renders[label]={'path':p.name,'sha256':sha(p),'bytes':p.stat().st_size,'render_seconds':round(time.time()-t,3)}
# Export just the imported spatial mesh for interoperable spatial formats.
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active=mesh
glb=OUT/'bm07-spatial-asset.glb'; bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
usdc=OUT/'bm07-spatial-asset.usdc'; usd_status='EXPORTED'
try: bpy.ops.wm.usd_export(filepath=str(usdc),selected_objects_only=True)
except Exception as exc: usd_status=f'OPTIONAL_EXPORT_FAILED:{type(exc).__name__}'
blend=OUT/'bm07-spatial-proof.blend'; bpy.ops.wm.save_as_mainfile(filepath=str(blend))
world=[mesh.matrix_world @ v.co for v in mesh.data.vertices]; mins=[min(p[i] for p in world) for i in range(3)]; maxs=[max(p[i] for p in world) for i in range(3)]; ext=[maxs[i]-mins[i] for i in range(3)]
art={'glb':{'path':glb.name,'sha256':sha(glb),'bytes':glb.stat().st_size},'blend':{'path':blend.name,'sha256':sha(blend),'bytes':blend.stat().st_size},'renders':renders}
if usdc.exists(): art['usdc']={'path':usdc.name,'sha256':sha(usdc),'bytes':usdc.stat().st_size}
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM07_SPATIAL_RENDER_EVIDENCE_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','benchmark_id':'BM-07','status':'SPATIAL_ASSET_PHYSICALLY_RENDERED',
 'source':{'volume_source_sha256':sha(SOURCE),'ply_sha256':sha(PLY),'asset_id':src['asset_id']},
 'runtime':{'blender_version':bpy.app.version_string,'engine':scene.render.engine,'device':'CPU'},
 'mesh':{'vertices':len(mesh.data.vertices),'polygons':len(mesh.data.polygons),'bounds_min':[float(v) for v in mins],'bounds_max':[float(v) for v in maxs],'extents':[float(v) for v in ext]},
 'artifacts':art,'usd_status':usd_status,'elapsed_seconds':round(time.time()-started,3),
 'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm07-spatial-render-evidence.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
if min(ext)<=1.0 or len(mesh.data.vertices)<1000 or len(mesh.data.polygons)<1000: raise SystemExit('BM07_IMPORTED_SPATIAL_COMPLEXITY_FAIL')
