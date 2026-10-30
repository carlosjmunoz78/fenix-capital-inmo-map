import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadCanonicalMissionRoots, buildMissionDag} from '../runtime/mission-recursive-decomposer-v1.mjs';
import {buildBrandTokens, buildAppFactoryPlan} from './brand-commerce-appfactory-runtime-v0.mjs';

const MODULE_DIR=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(MODULE_DIR,'../..');
const PREPROD='PREPROD';
const MISSION_ID='M18-DIGITAL-INDUSTRY-2026-10-30';
const CONTROL={prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0,external_publish:false,destructive_migration:false};

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function writeText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value,'utf8');}
function hash(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function assertSafety(value,label){
  if(!value||value.prod_write!==false||value.paid_ai!==false||value.trading!==false||Number(value.additional_cost_eur)!==0) throw new Error(`${label}: unsafe control drift`);
}
function loadWaveReceipts(repoRoot=REPO_ROOT){
  const w2=readJson(path.join(repoRoot,'cerebro/evidence/M18_DIGITAL_INDUSTRY_WAVE2_CROSSWALK_2026-10-30.json'));
  const w3=readJson(path.join(repoRoot,'cerebro/evidence/M18_DIGITAL_INDUSTRY_WAVE3_DEEP_GAP_2026-10-30.json'));
  if(w2.environment!==PREPROD||w3.environment!==PREPROD) throw new Error('M18 receipts must be PREPROD');
  if(w2.mission_id!==MISSION_ID||w3.mission_id!==MISSION_ID) throw new Error('M18 receipt mission mismatch');
  assertSafety(w2.safety,'wave2'); assertSafety(w3.safety,'wave3');
  if(w2.final_decisions_made!==0||w3.final_build_decisions!==0) throw new Error('upstream receipts must remain non-final');
  return {w2,w3};
}

function canonicalM18(repoRoot=REPO_ROOT){
  const scopeFile=path.join(repoRoot,'28_MACROFRENTES.md');
  const loaded=loadCanonicalMissionRoots({scope_file:scopeFile});
  if(!loaded.hydrated) throw new Error(`M18 canonical scope hydration failed: ${loaded.error}`);
  const root=loaded.roots.find(x=>x.mission_id==='M18');
  if(!root?.scope_text) throw new Error('M18 canonical root not found');
  return {root,source_sha256:loaded.sha256};
}

export function synthesizeM18CapabilityDecisions({repoRoot=REPO_ROOT}={}){
  const {w2,w3}=loadWaveReceipts(repoRoot);
  const {root}=canonicalM18(repoRoot);
  const explicitLocalization=/Localization Factory/i.test(root.scope_text);
  if(!explicitLocalization) throw new Error('M18 scope no longer explicitly requires Localization Factory');
  const deep=new Map((w3.reports||[]).map(r=>[r.capability_family,r]));
  const decisions=[];
  for(const id of w2.REUSE||[]) decisions.push({capability_family:id,decision:'REUSE',source:'WAVE2_PHYSICAL_EVIDENCE',operational_claim:false});
  for(const id of w2.WRAP||[]) decisions.push({capability_family:id,decision:'WRAP',source:'WAVE2_PHYSICAL_EVIDENCE',operational_claim:false});
  for(const id of w2.EXTEND||[]) decisions.push({capability_family:id,decision:'EXTEND',source:'WAVE2_PHYSICAL_EVIDENCE',operational_claim:false});
  for(const id of w2.BUILD_CANDIDATES_REQUIRING_DEEP_VERIFICATION||[]){
    const report=deep.get(id);
    if(id==='localization_factory'){
      if(report?.verified_state!=='NO_EVIDENCE') throw new Error('localization gap changed; rerun deep verification');
      decisions.push({capability_family:id,decision:'BUILD_INTERNAL_CAPABILITY_SCAFFOLD',source:'WAVE3_NO_EVIDENCE+CANONICAL_SCOPE_BUSINESS_VALUE',business_value:'EXPLICIT_M18_REQUIREMENT',operational_claim:false});
    }else if(report?.verified_state==='EXISTING_PHYSICAL_STACK'){
      decisions.push({capability_family:id,decision:'REUSE_OR_EXTEND',source:'WAVE3_EXISTING_PHYSICAL_STACK',operational_claim:false});
    }else if(report?.verified_state==='EXISTING_GOVERNED_SURFACE'){
      decisions.push({capability_family:id,decision:'WRAP_OR_EXTEND',source:'WAVE3_EXISTING_GOVERNED_SURFACE',operational_claim:false});
    }else{
      decisions.push({capability_family:id,decision:'HOLD_DEEPER_AUDIT',source:'WAVE3_UNRESOLVED',operational_claim:false});
    }
  }
  decisions.sort((a,b)=>a.capability_family.localeCompare(b.capability_family));
  const counts=Object.fromEntries([...new Set(decisions.map(x=>x.decision))].sort().map(k=>[k,decisions.filter(x=>x.decision===k).length]));
  const out={schema_version:'1.0.0',state_type:'M18_CAPABILITY_DECISION_MATRIX_V1',mission_id:MISSION_ID,company_id:'fenix',environment:PREPROD,version:'m18-autopilot-controller-v1',capability_count:decisions.length,counts,decisions,safety:{...CONTROL},final_engine_identities_created:0,internal_capability_scaffolds_authorized:decisions.filter(x=>x.decision==='BUILD_INTERNAL_CAPABILITY_SCAFFOLD').map(x=>x.capability_family),prod_authorized:false};
  return {...out,fingerprint:hash(out)};
}

export function buildM18CapabilityGraph(decisionMatrix){
  const shared=['FACT-001','ORCH-001','JOB-001','QA-001','EVA-001','JDG-001','OBSERV-001','LRN-001','FINOPS-001'];
  const nodes=decisionMatrix.decisions.map(d=>({id:d.capability_family,kind:'M18_CAPABILITY_FAMILY',disposition:d.decision,company_scope:'MULTI_COMPANY_READY',environment:PREPROD,version:'v1'}));
  const edges=[];
  for(const n of nodes) for(const dep of shared) edges.push({from:n.id,to:dep,type:'CONTROL_PLANE_DEPENDENCY'});
  const out={schema_version:'1.0.0',state_type:'M18_CAPABILITY_GRAPH_V1',mission_id:MISSION_ID,environment:PREPROD,nodes,shared_control_plane:shared,edges,safety:{...CONTROL},prod_authorized:false};
  return {...out,fingerprint:hash(out)};
}

export function buildLocalizationScaffold(){
  const manifest={schema_version:'1.0.0',state_type:'M18_LOCALIZATION_FACTORY_MANIFEST_V1',company_id:'GLOBAL',engine_id:'FACT-001',capability_id:'LOCALIZATION_FACTORY',environment:PREPROD,version:'0.1.0-scaffold',owner_root:'M18',operational:false,status:'SCAFFOLD_ONLY_PREPROD',supports:['locale_strategy','translation_memory_contract','i18n_contract','market_localization_rules','content_variant_contract'],multi_company_fields:['company_id','engine_id','environment','version'],permissions:{prod_write:false,external_publish:false,customer_data:false,trading:false,spend:false},required_gates:['IMPLEMENTATION','UNIT_TESTS','CONTRACT_TESTS','INTEGRATION_TESTS','EVA-001','JDG-001','OBSERVABILITY','COST','BACKUP','ROLLBACK','REBUILD','OLD_VS_NEW'],additional_cost_eur:0};
  const runtime=`export const LOCALIZATION_FACTORY_SCAFFOLD=Object.freeze(${JSON.stringify(manifest,null,2)});\n\nexport function executeLocalizationFactory(){\n  throw new Error('LOCALIZATION_FACTORY_SCAFFOLD_NOT_IMPLEMENTED');\n}\n`;
  const test=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {LOCALIZATION_FACTORY_SCAFFOLD,executeLocalizationFactory} from './localization-factory-v1.scaffold.mjs';\n\ntest('localization scaffold is PREPROD fail-closed and zero-cost',()=>{\n  assert.equal(LOCALIZATION_FACTORY_SCAFFOLD.environment,'PREPROD');\n  assert.equal(LOCALIZATION_FACTORY_SCAFFOLD.operational,false);\n  assert.equal(LOCALIZATION_FACTORY_SCAFFOLD.additional_cost_eur,0);\n  assert.equal(LOCALIZATION_FACTORY_SCAFFOLD.permissions.prod_write,false);\n  assert.throws(()=>executeLocalizationFactory(),/SCAFFOLD_NOT_IMPLEMENTED/);\n});\n`;
  const evaluation={schema_version:'1.0.0',state_type:'M18_LOCALIZATION_FACTORY_EVALUATION_CONTRACT_V1',environment:PREPROD,capability_id:'LOCALIZATION_FACTORY',independent_evaluation:'EVA-001',tribunal:'JDG-001',axes:['functional_correctness','locale_fidelity','brand_consistency','accessibility','seo','security_privacy','latency','cost','rollback_rebuild'],promotion_authorized:false};
  const recovery={schema_version:'1.0.0',state_type:'M18_LOCALIZATION_FACTORY_RECOVERY_CONTRACT_V1',environment:PREPROD,capability_id:'LOCALIZATION_FACTORY',parallel_only:true,backup_required:true,rollback_required:true,rebuild_required:true,prod_authorized:false};
  const runbook=`# M18 Localization Factory · PREPROD scaffold\n\nStatus: **SCAFFOLD_ONLY_PREPROD**.\n\nThis is an internal FACT-001 capability scaffold created only because Wave 3 found no physical evidence while canonical M18 explicitly requires Localization Factory. It is deliberately non-operational. No new engine identity is created.\n\nPromotion requires implementation, tests, EVA-001, JDG-001, observability, cost, backup, rollback, rebuild and OLD vs NEW. PROD remains disabled.\n`;
  return {manifest,runtime,test,evaluation,recovery,runbook};
}

export function buildM18ReferenceProductDryRun(){
  const context={company_id:'fenix',engine_id:'FACT-001',capability_id:'BRAND-COMMERCE-APPFACTORY',environment:'PREPROD',version:'v0'};
  const tokens=buildBrandTokens({context,brand_contract_ref:'m18:reference:brand',source_engine_id:'BRANDBOOT-001',palette:{primary:'#111111',secondary:'#666666',background:'#FFFFFF',foreground:'#111111'},typography:{heading:'system-ui',body:'system-ui'},base_spacing_px:8,radius_px:8});
  if(tokens.allowed!==true) throw new Error(`brand token dry-run blocked: ${JSON.stringify(tokens)}`);
  const app=buildAppFactoryPlan({context,surface:'PWA',app_slug:'m18-reference-product',brand_tokens_ref:`m18:tokens:${tokens.tokens_hash}`,requirements_ref:'m18:reference:requirements',confidence:1,spend_cents:0});
  if(app.allowed!==true) throw new Error(`app dry-run blocked: ${JSON.stringify(app)}`);
  return {schema_version:'1.0.0',state_type:'M18_REFERENCE_PRODUCT_DRY_RUN_V1',mission_id:MISSION_ID,environment:PREPROD,brand_tokens:tokens,app_plan:app,external_side_effect_executed:false,preview_deployed:false,prod_authorized:false,additional_cost_eur:0};
}

export function buildM18AutopilotState({repoRoot=REPO_ROOT}={}){
  const decisions=synthesizeM18CapabilityDecisions({repoRoot});
  const graph=buildM18CapabilityGraph(decisions);
  const {root,source_sha256}=canonicalM18(repoRoot);
  const missionGraph=buildMissionDag(loadCanonicalMissionRoots({scope_file:path.join(repoRoot,'28_MACROFRENTES.md')}).roots,{environment:PREPROD,generated_at:'1970-01-01T00:00:00.000Z'});
  const m18Units=missionGraph.units.filter(x=>x.mission_id==='M18');
  const m18Atomic=m18Units.filter(x=>x.kind==='atomic_work_unit'||x.kind==='capability_work_unit');
  const dryRun=buildM18ReferenceProductDryRun();
  const state={schema_version:'1.0.0',state_type:'M18_DIGITAL_INDUSTRY_AUTOPILOT_STATE_V1',mission_id:MISSION_ID,canonical_root:'M18',canonical_scope_ref:root.canonical_scope_ref,canonical_source_sha256:source_sha256,environment:PREPROD,version:'m18-autopilot-controller-v1',status:'AUTOPILOT_ACTIVE_PREPROD',phase:'CONTINUOUS_M18_MISSION_SWEEP',m18_work_units:m18Units.length,m18_atomic_units:m18Atomic.length,capability_count:decisions.capability_count,internal_build_scaffolds:decisions.internal_capability_scaffolds_authorized,reference_product_dry_run:'GREEN_PLAN_ONLY',continuous_worker:{workflow:'.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml',lane:0,start_cycle:0,max_cycle:504,mission_filter:'M18',auto_refill:true,stop_conditions:['MAX_CYCLE_REACHED','HUMAN_REQUIRED','CONTRACT_OR_TEST_RED','NO_PROGRESS_GUARD']},next_actions:['persist capability decisions and graph','persist localization fail-closed scaffold','run scaffold and M18 regression tests','start existing self-refilling Continuous Useful Worker V1 on M18','collect repeated M18 evidence sweeps','stop at PREPROD promotion packet or canonical HUMAN_REQUIRED'],human_required:null,safety:{...CONTROL},prod_authorized:false};
  return {...state,fingerprint:hash({state,decisions:decisions.fingerprint,graph:graph.fingerprint,dryRun})};
}

export function writeM18AutopilotArtifacts({repoRoot=REPO_ROOT,outRoot=null,repoWrite=false}={}){
  const decisions=synthesizeM18CapabilityDecisions({repoRoot});
  const graph=buildM18CapabilityGraph(decisions);
  const localization=buildLocalizationScaffold();
  const dryRun=buildM18ReferenceProductDryRun();
  const state=buildM18AutopilotState({repoRoot});
  const root=repoWrite?repoRoot:path.resolve(outRoot||path.join(repoRoot,'artifacts/m18-autopilot-v1'));
  const evidenceRoot=repoWrite?path.join(root,'cerebro/evidence'):root;
  writeJson(path.join(evidenceRoot,'M18_CAPABILITY_DECISIONS_V1.json'),decisions);
  writeJson(path.join(evidenceRoot,'M18_CAPABILITY_GRAPH_V1.json'),graph);
  writeJson(path.join(evidenceRoot,'M18_REFERENCE_PRODUCT_DRY_RUN_V1.json'),dryRun);
  writeJson(path.join(evidenceRoot,'M18_AUTOPILOT_STATE_V1.json'),state);
  const locRoot=repoWrite?path.join(root,'cerebro/digital-build/generated/localization-factory'):path.join(root,'localization-factory');
  writeJson(path.join(locRoot,'manifest.json'),localization.manifest);
  writeText(path.join(locRoot,'localization-factory-v1.scaffold.mjs'),localization.runtime);
  writeText(path.join(locRoot,'localization-factory-v1.scaffold.test.mjs'),localization.test);
  writeJson(path.join(locRoot,'evaluation.json'),localization.evaluation);
  writeJson(path.join(locRoot,'recovery.json'),localization.recovery);
  writeText(path.join(locRoot,'README.md'),localization.runbook);
  return {decisions,graph,dryRun,state,localization_root:locRoot};
}

async function main(){
  const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,v='true']=a.replace(/^--/,'').split('=');return [k,v];}));
  if((process.env.CEREBRO_SUPERVISOR_ENV||PREPROD)!==PREPROD) throw new Error('M18 autopilot is PREPROD-only');
  if(process.env.CEREBRO_ALLOW_PAID_FANOUT==='YES') throw new Error('paid fanout denied');
  if(process.env.CEREBRO_PROD_WRITE==='true') throw new Error('PROD write denied');
  if(process.env.CEREBRO_TRADING_ACCESS==='true') throw new Error('Trading denied');
  const out=writeM18AutopilotArtifacts({repoRoot:REPO_ROOT,outRoot:args.out,repoWrite:args['repo-write']==='true'});
  console.log(JSON.stringify({ok:true,status:out.state.status,phase:out.state.phase,capabilities:out.decisions.capability_count,m18_atomic_units:out.state.m18_atomic_units,scaffolds:out.state.internal_build_scaffolds,reference_product:out.state.reference_product_dry_run,auto_refill:out.state.continuous_worker.auto_refill,max_cycle:out.state.continuous_worker.max_cycle,prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0}));
}

const self=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(self) main().catch(error=>{console.error(String(error?.stack||error));process.exitCode=1;});
