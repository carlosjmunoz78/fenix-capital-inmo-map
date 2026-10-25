#!/usr/bin/env python3
"""Generate a deterministic volumetric/spatial asset for BM-07.

Creates a real 64^3 scalar density field, extracts a triangulated isosurface via
marching cubes, and stores both volumetric and mesh representations with provenance.
No external media/model assets are used.
"""
from __future__ import annotations
import hashlib,json,os,time
from pathlib import Path
import numpy as np
from skimage import measure
import trimesh

OUT=Path(os.environ.get('BM07_OUT','ums-bm07-spatial')).resolve(); OUT.mkdir(parents=True,exist_ok=True)
N=int(os.environ.get('BM07_GRID','64')); ISO=float(os.environ.get('BM07_ISO','0.43')); started=time.time()
SEED=20261025

def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
# World-space cube [-2.4,2.4]^3.
axis=np.linspace(-2.4,2.4,N,dtype=np.float32); x,y,z=np.meshgrid(axis,axis,axis,indexing='ij')
# Original procedural field: central energy sphere + tilted ring + three satellites.
r=np.sqrt(x*x+y*y+z*z)
sphere=np.exp(-((r-1.15)/0.34)**2)
# Torus around Z, tilted by combining Y/Z coordinates.
yt=0.82*y-0.57*z; zt=0.57*y+0.82*z
q=np.sqrt(x*x+yt*yt)
torus=np.exp(-(((q-1.55)/0.18)**2+(zt/0.25)**2))
field=0.72*sphere+0.82*torus
for cx,cy,cz,a,s in [(-1.25,0.65,0.65,0.72,0.38),(1.15,-0.75,0.25,0.68,0.34),(0.35,1.25,-0.65,0.62,0.31)]:
    field+=a*np.exp(-(((x-cx)**2+(y-cy)**2+(z-cz)**2)/(2*s*s)))
# Deterministic subtle modulation; no randomness needed despite declared seed.
field*=0.91+0.09*np.cos(2.7*x+1.4*y-1.1*z)
field=np.clip(field,0,1).astype(np.float32)
volume=OUT/'bm07-density-field.npz'; np.savez_compressed(volume,density=field,axis=axis,iso=np.float32(ISO),seed=np.int64(SEED))
spacing=(float(axis[1]-axis[0]),)*3
verts,faces,normals,values=measure.marching_cubes(field,level=ISO,spacing=spacing)
# Convert marching-cubes coordinates from [0,4.8] to world [-2.4,2.4].
verts=verts+np.array([axis[0],axis[0],axis[0]],dtype=np.float32)
mesh=trimesh.Trimesh(vertices=verts,faces=faces,vertex_normals=normals,process=True)
ply=OUT/'bm07-isosurface.ply'; mesh.export(ply,file_type='ply')
occ=field>=ISO
coords=np.argwhere(occ)
world_min=verts.min(axis=0); world_max=verts.max(axis=0); extents=world_max-world_min
manifest={
 'schema_version':'1.0.0','state_type':'CEREBRO_UMS_BM07_VOLUME_SOURCE_V1','company_id':'GLOBAL','engine_id':'UMS-001','environment':'PREPROD','version':'1.0.0','benchmark_id':'BM-07',
 'status':'VOLUMETRIC_SOURCE_GENERATED','asset_id':'BM07-SPATIAL-ENERGY-FIELD-001','origin':'INTERNAL_ORIGINAL_PROCEDURAL','external_assets':0,
 'grid':{'shape':[N,N,N],'voxel_count':int(field.size),'occupied_voxels':int(occ.sum()),'occupied_fraction':float(occ.mean()),'iso_level':ISO,'world_axis_min':float(axis[0]),'world_axis_max':float(axis[-1]),'voxel_spacing':spacing[0],'density_min':float(field.min()),'density_max':float(field.max()),'density_mean':float(field.mean())},
 'mesh':{'vertices':int(len(mesh.vertices)),'faces':int(len(mesh.faces)),'watertight':bool(mesh.is_watertight),'bounds_min':[float(v) for v in world_min],'bounds_max':[float(v) for v in world_max],'extents':[float(v) for v in extents],'volume':float(abs(mesh.volume))},
 'artifacts':{'volume':{'path':volume.name,'sha256':sha(volume),'bytes':volume.stat().st_size},'ply':{'path':ply.name,'sha256':sha(ply),'bytes':ply.stat().st_size}},
 'generation':{'seed':SEED,'method':'ANALYTIC_DENSITY_FIELD_PLUS_MARCHING_CUBES','library':'scikit-image+trimesh'},
 'elapsed_seconds':round(time.time()-started,3),'additional_cost_eur':0,'prod_authorized':False,'publish_authorized':False,'spend_authorized':False,'readiness_mutation_authorized':False
}
(OUT/'bm07-volume-source.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8'); print(json.dumps(manifest,indent=2))
if min(extents)<=1.0 or len(mesh.vertices)<1000 or len(mesh.faces)<1000 or occ.sum()<1000: raise SystemExit('BM07_SPATIAL_COMPLEXITY_GATE_FAIL')
