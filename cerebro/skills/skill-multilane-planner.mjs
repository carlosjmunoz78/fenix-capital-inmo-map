import fs from 'node:fs';
import path from 'node:path';
import {resolveHumanAlias} from '../governance/human-communication.mjs';

export const SKILL_STUDY_LANES=Object.freeze([
  Object.freeze({id:'ENGINEERING',human_name:'CEREBRO e Ingeniería',max_parallel:1}),
  Object.freeze({id:'DEVICE_CONTROL',human_name:'Control de PC, móvil y tablet',max_parallel:1}),
  Object.freeze({id:'GROWTH',human_name:'SEO, Research y Crecimiento',max_parallel:1}),
  Object.freeze({id:'CREATION',human_name:'Imagen, vídeo, voz y creación digital',max_parallel:1}),
  Object.freeze({id:'COMPANY',human_name:'Web, CRM, App y creación de empresa',max_parallel:1}),
  Object.freeze({id:'FAST_LANE',human_name:'Vía rápida',max_parallel:3})
]);

const DEVICE_TERMS=/\b(browser|computer[ -]?use|android|mobile|tablet|desktop|windows|macos|ios|adb|appium|playwright|selenium|device|screen|click|navigate)\b/i;
const CREATION_TERMS=/\b(image|images|video|audio|voice|design|creative|remotion|hyperframes|ffmpeg|caption|subtitle|media|render)\b/i;
const GROWTH_TERMS=/\b(seo|keyword|serp|search console|competitor|market research|growth|campaign|social|content marketing|local seo|analytics)\b/i;
const COMPANY_TERMS=/\b(crm|wordpress|website|web app|app builder|supabase|postgres|company|business|bootstrap|customer|sales|landing page|database)\b/i;

function clone(v){return JSON.parse(JSON.stringify(v??{}));}
function textOf(x){return `${x?.declared_name??x?.name??''} ${x?.declared_description??''} ${x?.domain??''}`.toLowerCase();}
function idsFromBucket(bucket){return Object.keys(bucket??{});}
function safeNumber(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}

export function classifyStrategicLane(candidate){
  const domain=candidate?.domain??'';
  const text=textOf(candidate);

  // Explicit supply-chain domains are authoritative. Keyword hints are only a fallback
  // for generic/mixed domains, so "database design" can never be mistaken for image/design work.
  if(domain==='browser-automation-scraping') return 'DEVICE_CONTROL';
  if(domain==='multimedia-voice-video-design') return 'CREATION';
  if(['seo-search-content','marketing-growth-social','external-information-retrieval'].includes(domain)) return 'GROWTH';
  if(['multi-company-business-bootstrap','web-wordpress-frontend','sales-crm-customer','data-database-supabase'].includes(domain)) return 'COMPANY';

  if(DEVICE_TERMS.test(text)) return 'DEVICE_CONTROL';
  if(CREATION_TERMS.test(text)) return 'CREATION';
  if(GROWTH_TERMS.test(text)) return 'GROWTH';
  if(COMPANY_TERMS.test(text)) return 'COMPANY';
  return 'ENGINEERING';
}

export function estimateWorkClass(candidate){
  const lane=classifyStrategicLane(candidate);
  const permissionRisk=safeNumber(candidate?.penalties?.permission_risk,35);
  const instructionRisk=safeNumber(candidate?.penalties?.instruction_integrity,35);
  const permissionSimplicity=safeNumber(candidate?.components?.permission_simplicity,0);
  const portability=safeNumber(candidate?.components?.portability,0);
  if(lane==='DEVICE_CONTROL'||lane==='COMPANY'||permissionRisk>=30||permissionSimplicity<55) return 'DEEP';
  if(permissionRisk<=15&&instructionRisk<=15&&permissionSimplicity>=85&&portability>=65) return 'EXPRESS';
  return 'STANDARD';
}

export function isSafeStudyCandidate(candidate){
  if(!candidate?.candidate_id) return false;
  if(!['HIGH_VALUE_LAB_BENCHMARK','LAB_BENCHMARK'].includes(candidate?.recommendation)) return false;
  if(candidate?.prod_authorized===true||candidate?.prod_write===true||candidate?.customer_data===true||candidate?.customer_data_used===true) return false;
  if(candidate?.external_skill_code_execution===true||candidate?.external_code_executed===true||candidate?.trading===true||candidate?.trading_access===true||candidate?.paid_fallback===true) return false;
  if(safeNumber(candidate?.additional_cost_eur,0)!==0) return false;
  return true;
}

export function isExpressCandidate(candidate){
  return isSafeStudyCandidate(candidate)&&estimateWorkClass(candidate)==='EXPRESS';
}

function activeCanonicalItems(state){
  return [...Object.values(state?.waiting_safe_handler??{}),...Object.values(state?.in_flight??{})]
    .filter((x)=>x?.candidate_id);
}

function canonicalKnownIds(state){
  return new Set([
    ...(state?.processed_candidate_ids??[]),
    ...idsFromBucket(state?.waiting_safe_handler),
    ...idsFromBucket(state?.in_flight),
    ...idsFromBucket(state?.waiting_human),
    ...idsFromBucket(state?.completed),
    ...idsFromBucket(state?.terminal_hold)
  ]);
}

function normalized(candidate,lane,slotId){
  return Object.freeze({
    slot_id:slotId,
    lane,
    lane_human_name:SKILL_STUDY_LANES.find((x)=>x.id===lane)?.human_name??lane,
    candidate_id:candidate.candidate_id,
    name:candidate.declared_name??candidate.name??null,
    human_alias:resolveHumanAlias({...candidate,name:candidate.declared_name??candidate.name??null}),
    domain:candidate.domain??null,
    wrapper_id:candidate.wrapper_id??null,
    value_score:safeNumber(candidate.value_score,0),
    recommendation:candidate.recommendation??null,
    work_class:estimateWorkClass(candidate),
    source:'MULTILANE_NEW_STUDY',
    prod_authorized:false,
    prod_write:false,
    customer_data_used:false,
    external_skill_code_execution:false,
    trading_access:false,
    paid_fallback:false,
    additional_cost_eur:0
  });
}

export function buildMultilanePlan(valueReport,autoloopState={},studyState={}){
  const candidates=(valueReport?.results??[])
    .filter(isSafeStudyCandidate)
    .sort((a,b)=>safeNumber(b.value_score)-safeNumber(a.value_score)||String(a.candidate_id).localeCompare(String(b.candidate_id)));
  const canonicalKnown=canonicalKnownIds(autoloopState);
  const studied=new Set(studyState?.studied_candidate_ids??[]);
  const blocked=new Set([...canonicalKnown,...studied]);
  const selectedIds=new Set();
  const matrix=[];
  const lanes={};

  for(const lane of SKILL_STUDY_LANES) lanes[lane.id]={id:lane.id,human_name:lane.human_name,status:'IDLE_NO_ELIGIBLE_CANDIDATE',existing_active:[],selected:[]};

  for(const item of activeCanonicalItems(autoloopState)){
    const lane=classifyStrategicLane(item);
    lanes[lane].existing_active.push({candidate_id:item.candidate_id,name:item.name??null,human_alias:item.human_alias??resolveHumanAlias(item),status:item.status??null,stage:item.stage??null,source:'EXISTING_CANONICAL_AUTOLOOP'});
    lanes[lane].status='ACTIVE_EXISTING_CANONICAL_AUTOLOOP';
  }

  for(const laneId of ['ENGINEERING','DEVICE_CONTROL','GROWTH','CREATION','COMPANY']){
    if(lanes[laneId].existing_active.length) continue;
    const candidate=candidates.find((x)=>!blocked.has(x.candidate_id)&&!selectedIds.has(x.candidate_id)&&classifyStrategicLane(x)===laneId);
    if(!candidate) continue;
    const item=normalized(candidate,laneId,`${laneId}-1`);
    selectedIds.add(candidate.candidate_id);
    matrix.push(item);
    lanes[laneId].selected.push(item);
    lanes[laneId].status='SELECTED_FOR_PARALLEL_STATIC_STUDY';
  }

  const fast=candidates.filter((x)=>!blocked.has(x.candidate_id)&&!selectedIds.has(x.candidate_id)&&isExpressCandidate(x)).slice(0,3);
  for(let i=0;i<fast.length;i++){
    const item=normalized(fast[i],'FAST_LANE',`FAST-${i+1}`);
    selectedIds.add(fast[i].candidate_id);
    matrix.push(item);
    lanes.FAST_LANE.selected.push(item);
  }
  if(fast.length) lanes.FAST_LANE.status='SELECTED_MULTIPLE_EXPRESS_CANDIDATES';

  const waitingHuman=Object.values(autoloopState?.waiting_human??{}).map((x)=>({candidate_id:x.candidate_id,name:x.name??null,human_alias:x.human_alias??resolveHumanAlias(x),human_required:x.human_required??null,stage:x.stage??null}));

  return Object.freeze({
    schema_version:'0.1.0',
    state_type:'CEREBRO_SKILL_MULTILANE_PLAN',
    company_id:'GLOBAL',
    engine_id:'FACT-001',
    environment:'LAB',
    version:'0.1.0',
    mode:'SIX_LANE_PARALLEL_STATIC_STUDY',
    lanes,
    matrix,
    selected_count:matrix.length,
    fast_lane_selected:fast.length,
    waiting_human:waitingHuman,
    waiting_human_blocks_other_lanes:false,
    invariants:{prod_authorized:false,prod_write:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_eur:0},
    canonical_autoloop_mutated:false
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const valuePath=argValue('--value');
  const autoloopPath=argValue('--autoloop-state');
  const studyPath=argValue('--study-state');
  const output=argValue('--output')??'artifacts/multilane/plan.json';
  if(!valuePath) throw new Error('REQUIRED: --value');
  const value=JSON.parse(fs.readFileSync(valuePath,'utf8'));
  const autoloop=autoloopPath&&fs.existsSync(autoloopPath)?JSON.parse(fs.readFileSync(autoloopPath,'utf8')):{};
  const study=studyPath&&fs.existsSync(studyPath)?JSON.parse(fs.readFileSync(studyPath,'utf8')):{};
  const plan=buildMultilanePlan(value,autoloop,study);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(plan,null,2)}\n`,'utf8');
  console.log(JSON.stringify({selected_count:plan.selected_count,fast_lane_selected:plan.fast_lane_selected,matrix:plan.matrix.map((x)=>({slot_id:x.slot_id,lane:x.lane,candidate_id:x.candidate_id,name:x.name,work_class:x.work_class})),waiting_human:plan.waiting_human.length,canonical_autoloop_mutated:false}));
}
