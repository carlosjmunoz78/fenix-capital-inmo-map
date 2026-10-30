import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const ENGINE_ID='ORCH-001';
const ENV='PREPROD';
const VERSION='jarvis-mission-dag-v2';
const ROOT='MISSION-JARVIS-001';
const MASTER_DEFAULT='cerebro/jarvis/mission-001/master-parts';
const MASTER_PART_COUNT=7;
const MASTER_B64_LENGTH=53461;
const MASTER_SHA256='278e3754ae032ec62f763d81d097110c8b35afb99972985d9c952fd0d564e05e';

const PROGRAMS=[
 ['P01','JARVIS CORE',['identity','constitution','authority','context compiler','orchestrator','capability fabric','information-flow','execution journal','root of trust','core invariants']],
 ['P02','MEMORY & WORLD MODEL',['memory','world model','knowledge','context','truth','temporal','entity','reconciliation','carlos twin']],
 ['P03','CAPABILITY FABRIC & ROUTING',['capability','router','model router','tool','mcp','interop','factory','skill','runtime']],
 ['P04','SECURITY / AUTHORITY / IFC',['security','authority','vault','credential','zero trust','sandbox','firewall','fraud','guardian','privacy','consent']],
 ['P05','DURABLE CLOUD RUNTIME',['cloud','durable','checkpoint','event-driven','mesh','node','standby','partition','offline','scheduler']],
 ['P06','EXECUTION / TRANSACTIONS / RECONCILIATION',['transaction','saga','exactly-once','command log','reconcile','desired state','contract evolution','delivery','kill / pause']],
 ['P07','EVALUATION / VERIFICATION / TRIBUNAL',['evaluation','verifier','tribunal','golden','formal verification','benchmark','regression','quality index','evidence']],
 ['P08','SWARMS / CLONES / SOCIETY GOVERNOR',['clone','swarm','society','role governor','agent reputation','board mode','parallel','massive']],
 ['P09','CONVERSATION / PERSONALITY / REPRESENTATION',['conversation','personality','representation','social presence','communication twin','interrupt','attention','owner friction']],
 ['P10','VOICE / LANGUAGES / INTERPRETATION',['voice','language','translation','interpreter','diction','pronunciation','prosody','multilingual']],
 ['P11','OBSERVATORY / INSTRUMENTATION',['observatory','instrumentation','sensor','measurement','ground-truth','lineage','metric integrity','blind-spot']],
 ['P12','DISCOVERY / LEARNING / KNOWLEDGE',['discovery','hypothesis','learning','research','question generator','process mining','knowledge candidate','mastery']],
 ['P13','SELF-IMPROVEMENT / SELF-REPAIR',['self-improvement','self-repair','self-evolution','weakness','champion / challenger','anti-entropy','complexity budget']],
 ['P14','FUTURE SIMULATION / ANTICIPATION',['future','simulation','forecast','anticipatory','early warning','counterfactual','optionality','regret']],
 ['P15','MULTIPROJECT / MULTICOMPANY / LIFE OS',['project','company','multiempresa','life os','health','family','travel','personal','portfolio']],
 ['P16','RECOVERY / REBUILD / SOVEREIGNTY',['recovery','rebuild','backup','restore','sovereign','disaster','seed','capsule','succession']],
 ['P17','JARVIS CONSOLE / UX / HANDOFF',['console','interface','ux','handoff','view 0','work / project os','adaptive ui','accessibility']],
 ['P18','INSTITUTIONAL ACCEPTANCE / ZERO-CARLOS',['zero-carlos','owner absence','institutional acceptance','acceptance test','owner dependency','governance capacity']]
];

const CORE=['IDENTITY','CONSTITUTION','AUTHORITY','CONTEXT_COMPILER','WORLD_MEMORY_ACCESS','ORCHESTRATOR','CAPABILITY_FABRIC','IFC_SECURITY','VERIFIER_EVALUATION','EVENT_EXECUTION_JOURNAL'];
const LIFECYCLE=[['scope','deterministic'],['inventory','repo_read'],['dependencies','repo_read'],['contract','deterministic'],['design','deepseek_candidate'],['implement','deepseek_candidate'],['test','test'],['security','security'],['evaluate','evaluation'],['observe','deterministic'],['resilience','test'],['document','docs'],['accept','evidence']];

function sha(v){return crypto.createHash('sha256').update(typeof v==='string'?v:Buffer.from(v)).digest('hex');}
function slug(v){return v.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}

function loadMaster(masterPath){
 const abs=path.resolve(masterPath);
 const stat=fs.statSync(abs);
 let text;
 let transport='plain';
 let partCount=0;
 let b64Length=null;
 if(stat.isDirectory()){
   const parts=fs.readdirSync(abs).filter(n=>/^part-\d{2}$/.test(n)).sort();
   if(parts.length!==MASTER_PART_COUNT)throw new Error(`JARVIS_MASTER_PART_COUNT_MISMATCH:${parts.length}`);
   const encoded=parts.map(n=>fs.readFileSync(path.join(abs,n),'utf8').trim()).join('');
   partCount=parts.length;b64Length=encoded.length;transport='multipart_gzip_base64';
   if(encoded.length!==MASTER_B64_LENGTH)throw new Error(`JARVIS_MASTER_B64_LENGTH_MISMATCH:${encoded.length}`);
   text=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 }else{
   const raw=fs.readFileSync(abs,'utf8').trim();
   if(masterPath.endsWith('.gz.b64')){transport='single_gzip_base64';b64Length=raw.length;text=zlib.gunzipSync(Buffer.from(raw,'base64')).toString('utf8');}
   else text=raw;
 }
 const sourceSha=sha(text);
 if(sourceSha!==MASTER_SHA256)throw new Error(`JARVIS_MASTER_SHA256_MISMATCH:${sourceSha}`);
 return {text,sourceSha,transport,partCount,b64Length};
}

function parseSections(text){const lines=text.replace(/\r\n/g,'\n').split('\n');const out=[];for(let i=0;i<lines.length;i++){const m=lines[i].match(/^#\s+(\d+)\.\s+(.+?)\s*$/);if(!m)continue;const body=[];for(let j=i+1;j<lines.length&&!/^#\s+\d+\.\s+/.test(lines[j]);j++){if(lines[j].trim())body.push(lines[j].trim());}out.push({section:Number(m[1]),title:m[2].trim(),body:body.join(' ').slice(0,6000)});}return out;}
function classify(s){const hay=`${s.title} ${s.body}`.toLowerCase();let best=PROGRAMS[0],score=-1;for(const p of PROGRAMS){const n=p[2].reduce((a,k)=>a+(hay.includes(k)?1:0),0);if(n>score){score=n;best=p;}}return{program_id:best[0],program_name:best[1],score};}
function unitBase(id,parent,kind,wave,route,title){return{work_unit_id:id,parent_id:parent,kind,wave,route_class:route,title,company_id:'zeus',engine_id:ENGINE_ID,environment:ENV,version:VERSION,status:'READY',paid_ai_allowed:route==='deepseek_candidate',prod_write_allowed:false,trading_access:false,estimated_cost_eur:0,idempotency_key:sha(`${VERSION}|${id}`)};}

export function buildJarvisDag({masterPath=process.env.JARVIS_MASTER_FILE||MASTER_DEFAULT}={}){
 const source=loadMaster(masterPath);const sections=parseSections(source.text);
 if(sections.length<400)throw new Error(`JARVIS_MASTER_SECTION_COUNT_TOO_LOW:${sections.length}`);
 const units=[];
 units.push({...unitBase(ROOT,null,'mission_root',0,'orchestrator','BUILD JARVIS MASTER V1'),dependencies:[],acceptance_criteria:['all mandatory programs accepted or governed HUMAN_REQUIRED recorded']});
 let prev=ROOT;
 CORE.forEach((name,i)=>{const id=`${ROOT}.CORE.${String(i+1).padStart(2,'0')}.${name}`;units.push({...unitBase(id,ROOT,'core_gate_unit',i+1,i===3?'deepseek_candidate':'deterministic',name),dependencies:[prev],acceptance_criteria:[`${name} contract and verifier evidence exist`]});prev=id;});
 const coreGate=`${ROOT}.CORE.GATE`;units.push({...unitBase(coreGate,ROOT,'core_gate',11,'governance','MINIMAL IMMUTABLE CORE GATE'),dependencies:[prev],acceptance_criteria:['all ten minimal core units resolved','no PROD authority']});
 for(const[pid,pname]of PROGRAMS)units.push({...unitBase(`${ROOT}.${pid}`,ROOT,'program',12,'orchestrator',pname),dependencies:[coreGate],program_id:pid,program_name:pname,acceptance_criteria:['all requirement lifecycle units resolved or governed exception recorded']});
 for(const s of sections){const c=classify(s);const sid=`S${String(s.section).padStart(3,'0')}-${slug(s.title)}`;const req=`${ROOT}.${c.program_id}.${sid}`;units.push({...unitBase(req,`${ROOT}.${c.program_id}`,'requirement',13,'orchestrator',s.title),dependencies:[`${ROOT}.${c.program_id}`],program_id:c.program_id,program_name:c.program_name,master_section:s.section,source_ref:`JARVIS_MASTER_V1_RC2#${s.section}`,scope_text:s.body,acceptance_criteria:['lifecycle complete','evidence attached','rollback/rebuild impact known']});let dep=req;LIFECYCLE.forEach(([phase,route],idx)=>{const id=`${req}.${phase}`;units.push({...unitBase(id,req,'task',20+idx,route,`${phase}: ${s.title}`),dependencies:[dep],program_id:c.program_id,program_name:c.program_name,master_section:s.section,phase,risk_class:['implement','security','accept'].includes(phase)?'medium_preprod':'low_preprod',authority_required:'CEREBRO_PREPROD',success_criteria:[`${phase} evidence exists`,'preserve existing behavior','no PROD write'],evidence_required:[`${id}.json`]});dep=id;});}
 const ids=new Set(units.map(u=>u.work_unit_id));if(ids.size!==units.length)throw new Error('DUPLICATE_WORK_UNIT_ID');for(const u of units)for(const d of u.dependencies||[])if(!ids.has(d))throw new Error(`MISSING_DEP:${d}`);
 const waves={};for(const u of units){waves[u.wave]??=[];waves[u.wave].push(u.work_unit_id);}
 return{schema_version:'2.1',mission_id:ROOT,source_master:path.basename(masterPath),source_sha256:source.sourceSha,source_transport:source.transport,source_part_count:source.partCount,source_b64_length:source.b64Length,generated_at:new Date(0).toISOString(),program_count:PROGRAMS.length,master_section_count:sections.length,work_unit_count:units.length,task_count:units.filter(u=>u.kind==='task').length,core_gate_count:CORE.length,wave_count:Object.keys(waves).length,safeguards:{environment:ENV,prod_write:false,trading:false,deepseek_temporary:true,deepseek_dependency_target:0,max_repo_write_concurrency:1,master_integrity_verified:true},programs:PROGRAMS.map(([id,name])=>({id,name})),waves:Object.fromEntries(Object.entries(waves).map(([k,v])=>[k,{count:v.length}])),units};
}
function main(){const out=process.env.JARVIS_DAG_OUT||'artifacts/jarvis-mission-001-dag';const dag=buildJarvisDag();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'mission-dag.json'),JSON.stringify(dag,null,2));fs.writeFileSync(path.join(out,'work-units.jsonl'),dag.units.map(x=>JSON.stringify(x)).join('\n')+'\n');fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({mission_id:dag.mission_id,source_sha256:dag.source_sha256,source_transport:dag.source_transport,source_part_count:dag.source_part_count,source_b64_length:dag.source_b64_length,program_count:dag.program_count,master_section_count:dag.master_section_count,work_unit_count:dag.work_unit_count,task_count:dag.task_count,wave_count:dag.wave_count,safeguards:dag.safeguards},null,2));console.log(JSON.stringify({ok:true,mission_id:dag.mission_id,programs:dag.program_count,sections:dag.master_section_count,units:dag.work_unit_count,tasks:dag.task_count,waves:dag.wave_count,sha256:dag.source_sha256,transport:dag.source_transport,parts:dag.source_part_count,b64_length:dag.source_b64_length}));}
if(import.meta.url===`file://${process.argv[1]}`)main();
