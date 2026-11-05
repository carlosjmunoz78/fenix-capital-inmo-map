import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const J=x=>JSON.stringify(x,null,2)+'\n';
const slots=['DEPARTMENT_HEAD','AGENT','SUBAGENT','QA_AGENT'];
const supervisors=['DIRECTOR','SUPERVISOR'];
const judges=['JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','INDEPENDENT_EVALUATOR','AUDITOR'];
const slot=(id,role)=>({template_id:id+'-'+role,role,active_instances:0,iam_verified:false,permissions:[]});
export function buildSeoOrg({company_id='fenix',organization,coverage,policy,seed}={}){
 if(!/^[a-z][a-z0-9_-]{1,39}$/.test(company_id))throw Error('ORG_TENANT');
 if(organization?.professional_families?.length!==8||organization?.departments?.length!==32||
  coverage?.departments?.length!==32||coverage?.progress?.fully_ready!==0)throw Error('ORG_SOURCE');
 if(!['FACT-001','SEO-001','IAM-001','POL-001'].every(x=>seed?.engine_ids?.includes(x))||
  policy?.policy_id!=='CEREBRO_UNIVERSAL_EXCELLENCE_OWNER_AUTHORITY_V0'||
  policy?.boundaries?.additional_subscriptions_eur!==0||
  policy?.authority?.strategic_command_source!=='SINGLE_AUTHENTICATED_COMPANY_OWNER'||
  ![...slots,...supervisors,...judges].every(x=>policy?.applies_to?.includes(x)))throw Error('ORG_CONTRACT');
 const members=new Set(),family=new Set();
 for(const f of organization.professional_families){
  if(!/^SEO-PF[0-9]{2}$/.test(f.family_id)||family.has(f.family_id)||f.department_ids?.length!==4)throw Error('ORG_FAMILY');
  family.add(f.family_id);
  for(const id of f.department_ids){if(members.has(id))throw Error('ORG_MEMBER_DUP');members.add(id);}
 }
 const deps=new Map(organization.departments.map(d=>[d.department_id,d]));
 const status=new Map(coverage.departments.map(d=>[d.department_id,d.status]));
 if(members.size!==32||deps.size!==32||status.size!==32)throw Error('ORG_DUP');
 const common={company_id,engine_id:'SEO-001',environment:'SCAFFOLD',version:'0.1.0',
  generated_by:'FACT-001-ORG',real_agents:0,prod_authorized:false,additional_cost_eur:0};
 const files=new Map(),put=(p,x)=>files.set(p,J(x));
 for(const f of organization.professional_families)
  put('families/'+f.family_id+'.json',{...common,id:f.family_id,title:f.title,departments:f.department_ids,
   role_templates:supervisors.map(x=>slot(f.family_id,x)),owner_only_strategy:true,
   verified_directors:0,certified:false});
 for(const d of organization.departments){
  if(!/^SEO-D[0-9]{2}$/.test(d.department_id)||!members.has(d.department_id)||
   !family.has(d.family_id)||!status.has(d.department_id)||d.operational_status!=='DEFINED_NOT_BOUND'||
   !organization.professional_families.find(f=>f.family_id===d.family_id).department_ids.includes(d.department_id))
   throw Error('ORG_DEPT_INVALID');
  const c={...common,department_id:d.department_id,family_id:d.family_id};
  put('departments/'+d.department_id+'/manifest.json',{...c,title:d.name,source_status:status.get(d.department_id),
   role_templates:slots.map(x=>slot(d.department_id,x)),headcount:'BY_EVIDENCE_NOT_FIXED',
   real_workers:0});
  put('departments/'+d.department_id+'/contract.json',{...c,default_permissions:'DENY',
   granted_scopes:[],role_iam_verified:false,agent_iam_verified:false,owner_iam_verified:false,
   source_is_not_authority:true,shared_runtime:['FACT-001','POL-001','IAM-001','JOB-001','QA-001','LRN-001'],
   merit_policy_ref:'cerebro/governance/universal-excellence-owner-authority.v0.json',
   excellence_after_missions:policy.excellence.minimum_missions,
   excellence_minimum_score:policy.excellence.score_threshold,
   qa_and_tribunal_independent:true,sensitive_rewards_authorized:false,
   acceptance_gates:['IDENTITY','WORK_EVIDENCE','QA','TRIBUNAL','TRAINING','OLD_NEW','OBSERVABILITY','COST','BACKUP','ROLLBACK','STAGING_E2E'],
   acceptance_passed:[],production_ready:false,active_agents:0,backup_tested:false,rollback_tested:false});
 }
 put('oversight.json',{...common,role_templates:judges.map(x=>slot('SEO-OVER',x)),
  independent_iam_verified:false,merit_for_every_oversight_role:true});
 const items=[...files].sort(([a],[b])=>a.localeCompare(b)).map(([p,v])=>({
  path:p,sha256:crypto.createHash('sha256').update(v).digest('hex')}));
 put('index.json',{...common,families:8,departments:32,file_count:files.size+1,
  active_agents:0,certified_departments:0,files:items});
 return files;
}
export function saveSeoOrg(out,files){
 if(!out||!(files instanceof Map))throw Error('ORG_OUTPUT');
 const root=path.resolve(out);if(root===path.parse(root).root)throw Error('ORG_ROOT');
 const fresh=[];
 for(const [r,data] of files){
  const file=path.join(root,r);
  if(!file.startsWith(root+path.sep)||!r.endsWith('.json')||r.includes('..'))throw Error('ORG_PATH');
  for(let p=file;;p=path.dirname(p)){
   try{if(fs.lstatSync(p).isSymbolicLink())throw Error('ORG_SYMLINK');}catch(e){if(e.code!=='ENOENT')throw e;}
   if(p===root)break;
  }
  if(fs.existsSync(file)){if(fs.readFileSync(file,'utf8')!==data)throw Error('ORG_CONFLICT');}
  else fresh.push([file,data]);
 }
 for(const [f,data] of fresh){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data,{flag:'wx'});}
 return {state:'SCAFFOLD_ONLY',files:files.size,created:fresh.length,existing:files.size-fresh.length,real_agents:0,prod_authorized:false};
}
