import fs from 'node:fs';
import crypto from 'node:crypto';

const read=(p)=>fs.readFileSync(p,'utf8');
const sha=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const requireToken=(s,t,label)=>{if(!s.includes(t))throw new Error(`${label}: missing ${t}`)};
const forbidToken=(s,t,label)=>{if(s.includes(t))throw new Error(`${label}: unexpected ${t}`)};

const livePeople=read('supabase/rollback/fenix-expediente-people-v2/index.ts');
const candidatePeople=read('supabase/functions/fenix-expediente-people/index.ts');
const liveIntelligence=read('supabase/rollback/fenix-document-intelligence-v12/index.ts');
const candidateIntelligence=read('supabase/functions/fenix-document-intelligence/index.ts');
const liveExtract=read('supabase/functions/fenix-document-extract/index.ts');

for(const token of ['fenix_prod_actor_context_by_auth_server','fenix_prod_exp_people_server','fenix_prod_contact_get_server','fenix_prod_exp_person_create_server','fenix_prod_exp_person_update_server','fenix_prod_contact_list_assign_server']){
  requireToken(livePeople,token,'people rollback');
  requireToken(candidatePeople,token,'people candidate');
}
forbidToken(livePeople,'fenix_prod_exp_labor_profile_server','people rollback');
requireToken(candidatePeople,'fenix_prod_exp_labor_profile_server','people candidate');
requireToken(candidatePeople,'mergeLabor','people candidate');

for(const token of ['fenix_prod_session_context','fenix_prod_runtime_policy_server','fenix_prod_evidence_scope_server',"human_reason:'LOW_CONFIDENCE'", "human_reason:'POLICY_CONFLICT'",'conflicts_require_confirmation']){
  requireToken(liveIntelligence,token,'intelligence rollback');
}
for(const token of ['auth.getUser','fenix_prod_actor_context_by_auth_server','fenix_prod_runtime_policy_server','fenix_prod_evidence_scope_server',"human_reason:'LOW_CONFIDENCE'", "human_reason:'POLICY_CONFLICT'",'conflicts_require_confirmation']){
  requireToken(candidateIntelligence,token,'intelligence candidate');
}
forbidToken(candidateIntelligence,"rpc('fenix_prod_session_context'","intelligence candidate");
forbidToken(candidateIntelligence,'rpc("fenix_prod_session_context"','intelligence candidate');
for(const token of ['modalidad_contrato','fecha_inicio_contrato','fecha_fin_contrato','jornada','categoria_profesional','numero_pagas']) requireToken(candidateIntelligence,token,'intelligence candidate');
requireToken(candidateIntelligence,'normalizeConfidence','intelligence candidate');
forbidToken(liveIntelligence,'normalizeConfidence','intelligence rollback');

const expectedExtract='2f1bf1e8a0d1272135948e46b07e438ec89b10abf9804af1fde035e93446c063';
if(sha(liveExtract)!==expectedExtract) throw new Error(`extract baseline drift: ${sha(liveExtract)}`);

console.log(JSON.stringify({
  ok:true,
  rollback:{
    people_v2_sha256:sha(livePeople),
    intelligence_v12_sha256:sha(liveIntelligence),
    extract_v12_sha256:sha(liveExtract)
  },
  candidate_deltas:{
    people_labor_merge:true,
    intelligence_server_identity:true,
    intelligence_labor_projection:true,
    intelligence_confidence_normalization:true
  }
}));
