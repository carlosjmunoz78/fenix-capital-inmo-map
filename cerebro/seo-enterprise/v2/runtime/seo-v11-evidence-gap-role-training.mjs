/**
 * SEO-001 · V11: corrective knowledge and physical evidence routing.
 * Adds a scoped, read-only training / evidence handoff for existing roles.
 * Never converts a training test or a JSON flag into a trusted release proof.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {evaluateV10} from './seo-v10-continuous-readiness.mjs';
const ROOT='cerebro/seo-enterprise/v2/';
const SOURCE=ROOT+'registry/seo001-v11-evidence-gap-role-training-2026-11-08.json';
const ROSTER=ROOT+'seo-specialist-role-roster-v2.json';
const hash=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
const fail=x=>{throw Error('SEO001_V11_'+x)};
const read=(root,p)=>JSON.parse(fs.readFileSync(path.resolve(root,p),'utf8'));
export function buildSeoEvidenceHandoffs({root=process.cwd(),registry,readiness,routeAudit}={}){
 const reg=registry||read(root,SOURCE);
 const ready=readiness||evaluateV10({root});
 const roster=read(root,ROSTER);
 const route=routeAudit||read(root,ROOT+'registry/seo001-v11-b2b-live-form-static-readonly-2026-11-08.json');
 if(route.company_id!=='fenix'||route.engine_id!=='SEO-001'||route.environment!=='LAB'||
    route.status!=='REAL_FORM_CODE_PATH_FOUND_POSITIVE_CRM_E2E_HOLD'||
    route.route_contract?.backend_destination_mode!=='PRODUCTION_IF_WORDPRESS_HOST_FENIXCAPITAL_ES'||
    route.route_contract?.positive_test_safe_on_live_site!==false||
    route.observed_limitations?.crm_row_created_verified!==false||
    route.observed_limitations?.production_requests_sent!==0||
    route.cms_writes!==0||route.crm_writes!==0||route.published!==0)
     fail('B2B_ROUTE_NOT_ISOLATED');
 if(reg.company_id!=='fenix'||reg.engine_id!=='SEO-001'||reg.environment!=='LAB'||
   reg.status!=='KNOWLEDGE_GAP_HANDFOFFS_PREPARED_NOT_EXECUTED'||
   reg.real_attestations_created!==0||reg.real_exams_passed!==0||
   reg.iam_actors_authenticated!==0||reg.production_release!==false||
   !Array.isArray(reg.protocols)||reg.protocols.length!==7||
   !Object.entries(reg.operating_contract||{}).every(([k,v])=>k.startsWith('no_')?v===true:true)||
   reg.operating_contract.no_publish!==true||reg.operating_contract.no_paid_calls!==true||
   ready.status!=='AUTOMATIC_QA_READINESS_PASS_PUBLICATION_HOLD'||
   ready.publish_allowed!==false||ready.autopublish_allowed!==false||
   ready.production_integrated!==false||ready.first_three_owner_signed_publication_receipts_verified!==0||
   roster.counts?.independently_iam_verified!==0||
   roster.counts?.total_role_templates!==191)
   fail('SCOPE_OR_TRUST_DRIFT');
 const blocked=ready.phases.filter(x=>x.state==='UNVERIFIED').map(x=>x.code);
 const actual=reg.protocols.map(x=>x.gate);
 if(blocked.length!==7||JSON.stringify(blocked)!==JSON.stringify(actual))fail('GATE_ROUTING_DRIFT');
 const roles=[];
 for(const p of reg.protocols){
   const [dept,kind,number]=p.owner_role.split(':');
   const team=roster.departments.find(d=>d.department_id===dept);
   if(!team||kind!=='SPECIALIST'||!team.subagents.includes(p.owner_role)||
      !p.category||!p.required_proof||!p.next_safe_action||!p.rejected_faux_proof||
      p.required_proof.length<55||p.rejected_faux_proof.length<25||
      (p.human_exception!==null&&!reg.operating_contract.allowed_human_exceptions.includes(p.human_exception)))
      fail('UNASSIGNED_OR_INCOMPLETE_ROLE');
   const pack=read(root,ROOT+team.knowledge_pack);
   if(pack.department_id!==dept||pack.company_id!=='fenix'||pack.engine_id!=='SEO-001'||
      !pack.knowledge?.competencies?.includes(p.competency)||
      pack.training?.evaluation?.real_exercises_passed!==0||
      pack.training?.evaluation?.actual_passes!==0)fail('SPECIALIST_KNOWLEDGE_NOT_BOUND');
   roles.push({gate:p.gate,owner_role:p.owner_role,knowledge_pack:team.knowledge_pack,
    required_proof:p.required_proof,missing_proof_type:p.category,
    next_safe_action:p.next_safe_action,failed_example:p.rejected_faux_proof,
    status:'AWAITING_INDEPENDENT_REAL_PROOF',human_exception:p.human_exception,
    training_evidence_is_not_real_attestation:true,actor_iam_verified:false,release_authorized:false});
 }
 if(reg.protocols.find(x=>x.gate==='INDEPENDENT_YMYL_LEGAL_REVIEW')?.human_exception!=='LEGAL_REQUIRED'||
    reg.protocols.find(x=>x.gate==='THREE_OWNER_SIGNED_PUBLISHES')?.human_exception!=='SIGNATURE_REQUIRED')
    fail('HUMAN_EXCEPTION_MISSING');
 return {schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
   environment:'LAB',version:'11.0.0',
   status:'SEVEN_ROLE_HANDOFFS_PREPARED_RELEASE_HOLD',
   source_v10_fingerprint:ready.idempotency_fingerprint,
   source_registry_sha256:hash(fs.readFileSync(path.resolve(root,SOURCE),'utf8')),
   knowledge_binding_verified:roles.length===7,
   role_exams_proven_passed:0,authenticated_agents_in_this_roster:0,
   handoffs:roles,missing_physical_evidence_count:7,
   b2b_live_form_preflight:{plugin_active:true,bridge_to_prod_host:true,positive_e2e_verified:false,
    safe_live_submit_allowed:false,notes:'STATIC CODE ONLY; NO LEAD WAS SUBMITTED'},
   new_secrets:0,new_model_calls:0,new_subscriptions_eur:0,
   wordpress_writes:0,crm_writes:0,supabase_writes:0,
   independent_receipts_newly_created:0,release_authorized:false,
   autopublish_allowed:false,owner_grant_current:false};
}
export function saveSeoEvidenceHandoffs({root=process.cwd(),outputDir}={}){
 if(!outputDir||!path.isAbsolute(outputDir)||outputDir.includes('..')||
    ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(x=>
      path.resolve(outputDir).startsWith(path.resolve(x)+path.sep))||
    fs.existsSync(outputDir))fail('ARTIFACT_TEMP_ONLY');
 const obj=buildSeoEvidenceHandoffs({root});
 fs.mkdirSync(outputDir,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(outputDir,'seo001-v11-handoffs.json'),
  JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o600});
 return {status:obj.status,role_handoffs:obj.handoffs.length,live_agent_exams:0,publish_allowed:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3)fail('CLI_ARGS');
 console.log(JSON.stringify(saveSeoEvidenceHandoffs({outputDir:path.resolve(process.argv[2])})));
}
