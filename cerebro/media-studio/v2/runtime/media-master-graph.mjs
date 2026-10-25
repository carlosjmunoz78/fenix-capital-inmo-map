import crypto from 'node:crypto';

function id(prefix){return `${prefix}-${crypto.randomUUID()}`;}
function now(){return new Date().toISOString();}

export function createMediaMasterGraph({company_id,studio_id='UMS',production_id,environment='PROD',version='2.0.0',created_by='UMS-BRAIN-001',provenance_root='PENDING'}){
  if(!company_id||!production_id) throw new Error('company_id and production_id are required');
  return {
    graph_id:id('MMG'), company_id, studio_id, production_id, environment, version,
    universe:{identities:[],characters:[],worlds:[],stories:[],music_themes:[],sound_identities:[],rights_provenance:[]},
    production:{sequences:[],edit_timelines:[],mix_sessions:[],color_di:[],spatial_masters:[],media_masters:[],deliverables:[]},
    audit:{created_at:now(),created_by,provenance_root,rights_gate_state:'UNKNOWN'}
  };
}

export function addSequence(graph,{sequence_id=id('SEQ') }={}){
  const sequence={sequence_id,scenes:[]}; graph.production.sequences.push(sequence); return sequence;
}
export function addScene(sequence,{scene_id=id('SCN')}={}){
  const scene={scene_id,shots:[]}; sequence.scenes.push(scene); return scene;
}
export function addShot(scene,{shot_id=id('SHT')}={}){
  const shot={shot_id,performances:[],camera:[],lighting:[],assets:[],audio:[],vfx:[],versions_reviews:[]}; scene.shots.push(shot); return shot;
}
export function attach(graph,bucket,ref){
  if(!(bucket in graph.universe)) throw new Error(`unknown universe bucket: ${bucket}`);
  if(!graph.universe[bucket].includes(ref)) graph.universe[bucket].push(ref);
  return graph;
}
export function appendRightsProvenance(graph,ref,state='PASS'){
  attach(graph,'rights_provenance',ref); graph.audit.rights_gate_state=state; return graph;
}
export function countShots(graph){return graph.production.sequences.reduce((n,s)=>n+s.scenes.reduce((m,c)=>m+c.shots.length,0),0);}
export function assertIsolation(graph,{company_id,production_id}){
  if(graph.company_id!==company_id) throw new Error('CROSS_COMPANY_DENY');
  if(graph.production_id!==production_id) throw new Error('CROSS_PRODUCTION_DENY');
  return true;
}
