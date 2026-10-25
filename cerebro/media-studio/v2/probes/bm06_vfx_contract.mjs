import fs from 'node:fs';
import path from 'node:path';
import {createEffectSpec,assertEffectRights} from '../runtime/effects-factory.mjs';
import {createMediaMasterGraph,addSequence,addScene,addShot,appendRightsProvenance,assertIsolation} from '../runtime/media-master-graph.mjs';

const environment=String(process.env.CEREBRO_ENVIRONMENT??'PREPROD').toUpperCase();
if(environment!=='PREPROD') throw new Error('BM06_PREPROD_ONLY');
const outDir=path.resolve(process.env.UMS_BM06_OUT??'ums-bm06-vfx');
fs.mkdirSync(outDir,{recursive:true});

const graph=createMediaMasterGraph({company_id:'GLOBAL',production_id:'UMS-BM06-PREPROD',environment:'PREPROD',version:'1.1.0',created_by:'UMS-001',provenance_root:'BM06_INTERNAL_ORIGINAL'});
assertIsolation(graph,{company_id:'GLOBAL',production_id:'UMS-BM06-PREPROD'});
const seq=addSequence(graph,{sequence_id:'SEQ-BM06-001'});
const scene=addScene(seq,{scene_id:'SCN-BM06-ENERGY-CHAMBER'});
const shot=addShot(scene,{shot_id:'SHT-BM06-001'});

const effects=[
  createEffectSpec({family:'ENERGY',description:'Procedural emissive energy core with deterministic pulse and rotating containment rings',parameters:{seed:20261025,pulse_cycles:2,ring_count:3},compatible_surfaces:['RASTER_VIDEO_2D','BLENDER_SCENE'],rights:{status:'INTERNAL_ORIGINAL',license_ref:'INTERNAL'},provenance:'BM06_PROCEDURAL_BLENDER'}),
  createEffectSpec({family:'PARTICLES',description:'Procedural orbital shard field generated from primitive geometry',parameters:{seed:20261025,count:24,orbit_radius:[2.2,3.2]},compatible_surfaces:['RASTER_VIDEO_2D','BLENDER_SCENE'],rights:{status:'INTERNAL_ORIGINAL',license_ref:'INTERNAL'},provenance:'BM06_PROCEDURAL_BLENDER'}),
  createEffectSpec({family:'LIGHT',description:'Animated key rim and energy-reactive point lighting',parameters:{seed:20261025,key_energy:700,rim_energy:500},compatible_surfaces:['RASTER_VIDEO_2D','BLENDER_SCENE'],rights:{status:'INTERNAL_ORIGINAL',license_ref:'INTERNAL'},provenance:'BM06_PROCEDURAL_BLENDER'}),
  createEffectSpec({family:'OPTICAL',description:'Portable procedural emissive halo treatment authored as animated 3D geometry inside the Blender scene',parameters:{seed:20261025,halo_layers:3,implementation:'EMISSIVE_GEOMETRY'},compatible_surfaces:['RASTER_VIDEO_2D','BLENDER_SCENE'],rights:{status:'INTERNAL_ORIGINAL',license_ref:'INTERNAL'},provenance:'BM06_PROCEDURAL_BLENDER_OPTICAL'})
];
for(const fx of effects) assertEffectRights(fx);
shot.vfx.push(...effects);
shot.camera.push({type:'PROCEDURAL_DOLLY_ORBIT',frames:18,seed:20261025});
shot.lighting.push({type:'PROCEDURAL_THREE_POINT_PLUS_EMISSIVE',rights:'INTERNAL_ORIGINAL'});
shot.assets.push({type:'GENERATED_PRIMITIVES_ONLY',external_assets:0,rights:'INTERNAL_ORIGINAL'});
appendRightsProvenance(graph,'BM06:ALL_ASSETS_INTERNAL_ORIGINAL','PASS');

const doc={
  schema_version:'1.1.0',state_type:'CEREBRO_UMS_BM06_VFX_SHOT_CONTRACT_V1',benchmark_id:'BM-06',
  benchmark_name:'3D animated VFX shot',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'1.1.0',
  status:'SPEC_READY',graph,shot_contract:{sequence_id:seq.sequence_id,scene_id:scene.scene_id,shot_id:shot.shot_id,frame_count:18,fps:9,resolution:[320,180],required_vfx_families:['ENERGY','PARTICLES','LIGHT','OPTICAL'],external_assets_allowed:0,render_runtime:'BLENDER_5_2_LTS_CPU',optical_implementation:'EMISSIVE_GEOMETRY'},
  authority:{prod_authorized:false,publish_authorized:false,spend_authorized:false,additional_cost_eur:0}
};
fs.writeFileSync(path.join(outDir,'bm06-vfx-contract.json'),JSON.stringify(doc,null,2));
console.log(JSON.stringify(doc,null,2));
