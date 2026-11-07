/** FACT-001 SEO-001 adapter: deterministic, idempotent 141 role contract scaffold, not IAM provisioning. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const sourceDir=fileURLToPath(new URL('../seo-enterprise/v2/',import.meta.url));
const roster=JSON.parse(fs.readFileSync(path.join(sourceDir,'seo-specialist-role-roster-v2.json'),'utf8'));
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const safeName=s=>{if(!/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2]):SPECIALIST:\d{2}$/.test(s))throw Error('ROLE_ID_INVALID');return s.replaceAll(':','-')};
export function buildSeoSkillpackRoleContracts(){
 const outputs=[];
 for(const d of roster.departments){
  const pack=JSON.parse(fs.readFileSync(path.join(sourceDir,d.knowledge_pack),'utf8'));
  for(const role of pack.workforce.subagents){
   const basename=safeName(role.role_id)+'.json';
   const contract={schema_version:'2.1.0',company_id:'fenix',engine_id:'SEO-001',
    version:'2.1.0',environment:'LAB',role_id:role.role_id,owner_department:pack.department_id,
    factory_id:'FACT-001',logical_worker:true,server_per_agent:false,iam_principal_id:null,
    status:'SCAFFOLD_NOT_ACTIVE',required_knowledge_pack:d.knowledge_pack,
    selected_competency:role.competency,dependency_engines:pack.workforce.runtime_shared,
    config:{timeout_ms:15000,max_attempts:1,default_mode:'READ_ONLY_PLAN',cost_max_eur:0},
    data_contracts:{input:['request_id','company_id','engine_id','environment','version','source_refs','objective'],
      output:pack.instructions.output_schema,provenance_required:true},
    permissions:{allow:['KNOWLEDGE_READ','LAB_PROPOSAL'],deny:['PUBLISH','PROD_WRITE','APP_WRITE','CRM_WRITE','MERIT_SELF_AWARD','IAM_ADMIN','SPEND']},
    policy:{owner_strategy_only:true,scope_isolation:true,untrusted_source_as_data:true,
      human_required:['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']},
    events:{in:['SEO_WORKUNIT_ASSIGNED'],out:['SEO_PROPOSAL_READY','SEO_QA_REQUESTED']},
    jobs:{runtime:'JOB-001',durable:true,idempotency_key_fields:['company_id','engine_id','role_id','request_id','version'],no_prod_dispatch:true},
    api:{actor_gateway:'ACTGW-001',binding_state:'UNBOUND',live_endpoint:null},
    tests:{mandatory:['CONTRACT_VALID','TENANT_ISOLATION','READONLY_DENIAL','INDEPENDENT_QA','IDEMPOTENCY'],run_state:'SCHEMA_GENERATED_NOT_EXECUTED'},
    evaluation:{qa_department:'SEO-D31',learning_department:'SEO-D32',tribunal:'SEO:GLOBAL:JUDGE',score_threshold:90,safety_floor:95,independent_identity_required:true},
    observability:{receipt_fields:['request_id','role_id','policy_decision','evidence_ref','cost_eur','state'],retention_policy:'ENGINE_REGISTRY_POLICY_PENDING'},
    costs:{additional_eur:0,model_router:'DETERMINISTIC_FIRST',paid_ai_granted:false},
    backup:{kind:'REPO_VERSIONED_CONTRACT'},rollback:{kind:'RESTORE_PREVIOUS_COMMIT',physical_tested:false},
    rebuild:{source:'FACT-001_ADAPTER_WITH_KNOWLEDGE_INDEX',deterministic:true},
    training:{curriculum:pack.training,active_certifications:0,real_world_practice:0,learning_hooks:['LRN-001','QA-001']},
    release:{prod_allowed:false,requires:['IAM_INDEPENDENT','QA','TRIBUNAL','OLD_VS_NEW','BACKUP_RESTORE','ROLLBACK_PROVEN']}};
   outputs.push({relative_path:'roles/'+basename,contract});
  }
 }
 if(outputs.length!==141||new Set(outputs.map(x=>x.relative_path)).size!==141)throw Error('CONTRACT_COVERAGE_FAILED');
 return outputs.sort((a,b)=>a.relative_path.localeCompare(b.relative_path));
}
export function generateSeoRoleScaffolds(outDir){
 if(typeof outDir!=='string'||!outDir.trim())throw Error('OUTPUT_DIRECTORY_REQUIRED');
 const entries=buildSeoSkillpackRoleContracts();fs.mkdirSync(path.join(outDir,'roles'),{recursive:true});
 const manifest=[];
 for(const entry of entries){
  const content=JSON.stringify(entry.contract,null,2)+'\n';
  const file=path.join(outDir,entry.relative_path);
  if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')!==content)throw Error('EXISTING_CONTRACT_CONFLICT:'+entry.relative_path);
  if(!fs.existsSync(file))fs.writeFileSync(file,content,{flag:'wx'});
  manifest.push({role_id:entry.contract.role_id,path:entry.relative_path,sha256:h(content)});
 }
 const index={schema_version:'2.1.0',company_id:'fenix',engine_id:'SEO-001',
  factory_id:'FACT-001',environment:'LAB',role_templates:manifest.length,
  live_iam_principals:0,prod_grants:0,status:'SCaffold_ONLY_NOT_DEPLOYED',files:manifest};
 const c=JSON.stringify(index,null,2)+'\n',ip=path.join(outDir,'index.json');
 if(fs.existsSync(ip)&&fs.readFileSync(ip,'utf8')!==c)throw Error('EXISTING_INDEX_CONFLICT');
 if(!fs.existsSync(ip))fs.writeFileSync(ip,c,{flag:'wx'});
 return {status:index.status,role_templates:manifest.length,files:manifest.length+1,manifest_sha256:h(c),
  real_iam_actors:0,production_writes:0,new_services:0};
}
if(process.argv[1]?.endsWith('seo-skillpack-factory-v2.mjs')){
 try{if(process.argv[2]!=='generate'||!process.argv[3])throw Error('USAGE: generate OUTPUT_DIRECTORY');
  process.stdout.write(JSON.stringify(generateSeoRoleScaffolds(process.argv[3]))+'\n');
 }catch(e){process.stderr.write(String(e.message)+'\n');process.exitCode=1}
}
