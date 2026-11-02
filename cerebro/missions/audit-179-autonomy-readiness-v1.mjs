#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const argv=process.argv.slice(2);
const outArg=argv.includes('--out')?argv[argv.indexOf('--out')+1]:'/tmp/cerebro-179-readiness';
const OUT=path.resolve(outArg);
const REGISTRY='cerebro/registry/engine-registry.v1.json';
const P23_INDEX='cerebro/audit/jarvis-audit-index.v1.json';
const LAYER_MANIFESTS={
  L0:'cerebro/evidence/l0-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L1:'cerebro/evidence/l1-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L2:'cerebro/evidence/l2-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L3:'cerebro/evidence/l3-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L4:'cerebro/evidence/l4-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L5:'cerebro/evidence/l5-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L6:'cerebro/evidence/l6-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L7:'cerebro/evidence/l7-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L8:'cerebro/evidence/l8-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
  L9:'cerebro/evidence/l9-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json'
};
const EXPECTED={L0:13,L1:14,L2:15,L3:16,L4:27,L5:20,L6:25,L7:15,L8:23,L9:11};
const HUMAN_REQUIRED=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
const EXEC_EXT=new Set(['.mjs','.js','.cjs','.ts','.tsx','.jsx','.py','.sh','.sql','.json','.yml','.yaml']);
const SKIP=new Set(['.git','node_modules','dist','coverage','.next','.cache','vendor','.cerebro-generated']);
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:json(v)).digest('hex');
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(SKIP.has(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&fs.statSync(p).size<1200000)out.push(p);}return out;}
function rel(p){return path.relative(ROOT,p).split(path.sep).join('/');}
function idsFromManifest(m){const ids=[];ids.push(...Object.keys(m.new_runtime_engines||{}));ids.push(...(m.new_runtime_engine_ids||[]));ids.push(...(m.foundation_runtime_engine_ids||[]));ids.push(...(m.preserved_existing_engines||[]));ids.push(...(m.preserved_existing_engine_ids||[]));ids.push(...(m.preserved_existing||[]));return [...new Set(ids)];}
function isEvidencePath(p){return p.startsWith('cerebro/evidence/')||p.startsWith('cerebro/audit/')||p.startsWith('cerebro/runtime/')||p.startsWith('cerebro/tests/')||p.startsWith('cerebro/governance/')||p.startsWith('.github/workflows/');}
function strictSignal(files,id,{pathTerms=[],contentTerms=[],requireAllContent=false}){
  const hit=[];
  for(const f of files){if(!isEvidencePath(f.path)||!f.content.includes(id))continue;const p=f.path.toLowerCase();const pathOk=pathTerms.length===0||pathTerms.some(x=>p.includes(x));const c=f.content.toLowerCase();const contentOk=contentTerms.length===0||(requireAllContent?contentTerms.every(x=>c.includes(x)):contentTerms.some(x=>c.includes(x)));if(pathOk&&contentOk)hit.push(f.path);}
  return [...new Set(hit)].sort();
}
const registry=readJson(REGISTRY);const ids=registry.engine_ids||[];
if(registry.count!==179||ids.length!==179||new Set(ids).size!==179)throw new Error('Canonical Registry must be exactly 179 unique IDs');
const layers={};const owner=new Map();
for(const [layer,p] of Object.entries(LAYER_MANIFESTS)){const m=readJson(p);const list=idsFromManifest(m);if(list.length!==EXPECTED[layer])throw new Error(`${layer}: manifest count ${list.length} != ${EXPECTED[layer]}`);layers[layer]=list;for(const id of list){if(owner.has(id))throw new Error(`cross-layer duplicate ${id}`);owner.set(id,layer);}}
if(owner.size!==179)throw new Error(`physical manifest union ${owner.size} != 179`);
for(const id of ids)if(!owner.has(id))throw new Error(`Registry ID missing physical foundation manifest: ${id}`);
const files=[];for(const p of walk(ROOT).sort()){const r=rel(p);if(!EXEC_EXT.has(path.extname(r).toLowerCase()))continue;let content='';try{content=fs.readFileSync(p,'utf8');}catch{continue;}files.push({path:r,content});}
const p23=readJson(P23_INDEX);
const p23Integration=p23.p23_live_integration||p23.live_integration||{};
const p23Live=['LIVE','GREEN','PROD_GREEN'].includes(p23Integration.status)
  && p23Integration.target_engine==='FACT-001'
  && p23Integration.audit_points===179
  && p23Integration.prod_registered===179
  && p23Integration.prod_execution_authorized===0
  && p23Integration.prod_write_authorized===0;
const rows=[];
for(const id of ids){
  const evidence={
    contracts:strictSignal(files,id,{pathTerms:['contract'],contentTerms:['contract','invariant']}),
    permissions:strictSignal(files,id,{pathTerms:['permission','iam','policy'],contentTerms:['deny','allow','permission','grant']}),
    tests:strictSignal(files,id,{pathTerms:['test'],contentTerms:['assert','test','pass','green']}),
    evaluation:strictSignal(files,id,{pathTerms:['evaluation','eval'],contentTerms:['approved','pass','green','score']}),
    tribunal:strictSignal(files,id,{pathTerms:['tribunal','judge'],contentTerms:['approved','pass','green']}),
    observability:strictSignal(files,id,{pathTerms:['observ','audit'],contentTerms:['log','metric','audit','trace']}),
    backup:strictSignal(files,id,{pathTerms:['backup'],contentTerms:['tested','pass','green','restore']}),
    rollback:strictSignal(files,id,{pathTerms:['rollback'],contentTerms:['tested','pass','green','revert']}),
    rebuild:strictSignal(files,id,{pathTerms:['rebuild'],contentTerms:['tested','pass','green','deterministic']}),
    cost:strictSignal(files,id,{contentTerms:['additional_cost_eur','additional_subscription_eur','0 €','zero-cost','zero_cost']}),
    policy:strictSignal(files,id,{pathTerms:['policy','governance'],contentTerms:['fail_closed','deny','human_required','policy']}),
    preprod:strictSignal(files,id,{contentTerms:['preprod','lab_preprod']})
  };
  const gates=Object.fromEntries(Object.entries(evidence).map(([k,v])=>[k,v.length>0]));
  const gateCount=Object.values(gates).filter(Boolean).length;
  const autonomousProdReady=Object.values(gates).every(Boolean)&&p23Live;
  rows.push({company_id:'fenix',engine_id:id,layer:owner.get(id),version:registry.defaults?.version||'0.1.0',physical_foundation:true,p23_live:p23Live,gates,gate_count:gateCount,gate_total:Object.keys(gates).length,autonomous_prod_ready:autonomousProdReady,prod_registration_ready:true,prod_execution_authorized:false,human_required:autonomousProdReady?null:'POLICY_CONFLICT',human_required_allowed:HUMAN_REQUIRED,evidence});
}
const summary={schema_version:'1.0.0',mission:'AUDIT_179_AUTONOMY_P23_PREPROD_PROD_READINESS',status:'GREEN_AUDIT_COMPLETE',environment:'LAB_PREPROD',registry_total:179,physical_foundation:rows.filter(x=>x.physical_foundation).length,p23:{auditor:p23.auditor||'Jarvis (P23)',status:p23.status||null,live_integration_status:p23Integration.status||null,live_verified:p23Live},prod_registration_ready:rows.filter(x=>x.prod_registration_ready).length,autonomous_prod_ready:rows.filter(x=>x.autonomous_prod_ready).length,foundation_only:rows.filter(x=>!x.autonomous_prod_ready).length,layer_counts:Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,v.length])),strict_gate_counts:Object.fromEntries(Object.keys(rows[0].gates).map(g=>[g,rows.filter(x=>x.gates[g]).length])),additional_cost_eur:0,trading_touched:false,prod_writes:false,registry_mutated:false,factory_mutated:false,classification_rule:'EVIDENCE_FIRST_FAIL_CLOSED_NO_SCAFFOLD_OR_DOCUMENTATION_ASSUMPTIONS',next_action:p23Live?'BUILD_GOVERNED_PROD_REGISTRATION_SURFACE':'WIRE_P23_LIVE_TO_FACT_001_THEN_REAUDIT'};
const report={...summary,engines:rows};
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'AUTONOMY_READINESS_BASELINE.json'),json(report));fs.writeFileSync(path.join(OUT,'SUMMARY.json'),json(summary));fs.writeFileSync(path.join(OUT,'REBUILD.sha256'),sha(report)+'\n');
console.log('READINESS_BASELINE='+JSON.stringify(summary));
