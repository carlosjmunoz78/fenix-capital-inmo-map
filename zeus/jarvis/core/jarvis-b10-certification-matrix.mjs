/** ZEUS/JARVIS B10 CUT01 — certification evidence matrix, NO PROD activation.
 * Evidence inspection only. Existing B2/B3/JDG/SUP, App, Gateway and release
 * promotion authority remain the exclusive owners of PROD execution.
 * Never turn attested metadata into production authorization.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const SHA=/^[0-9a-f]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
export const B10_PHASES=Object.freeze([
 'READ_ONLY','SAFE_ACTIONS','PERSISTENT_MISSIONS','MULTICOMPANY',
 'VOICE','DELEGATION','GOVERNED_IMPROVEMENT'
]);
export const B10_STAGE_REQUIREMENTS=Object.freeze({
 READ_ONLY:Object.freeze([
  'prod_source_sha_exact','prod_gateway_health_verified',
  'owner_root_real_authenticated','b3_prod_read_grant_verified',
  'supervisor_kill_switch_live','audit_ledger_live',
  'app_crm_regression_no_damage','finops_actual_cost_measured'
 ]),
 SAFE_ACTIONS:Object.freeze([
  'safe_mutation_allowlist_verified','idempotent_replay_no_duplicate',
  'rollback_compensation_physical','prod_mutation_policy_grant_verified',
  'post_action_independent_check'
 ]),
 PERSISTENT_MISSIONS:Object.freeze([
  'real_job001_durable_recovery','two_devices_same_mission',
  'restart_no_duplicate_or_loss','central_memory_continuity',
  'backup_restore_physical'
 ]),
 MULTICOMPANY:Object.freeze([
  'two_real_company_registrations','cross_company_iam_isolation',
  'multi_company_live_read_trace','no_cross_company_secrets_or_data'
 ]),
 VOICE:Object.freeze([
  'owner_voice_same_identity','voice_two_device_handoff',
  'voice_interrupt_stop_verified','voice_privacy_and_cost_verified'
 ]),
 DELEGATION:Object.freeze([
  'real_supervisor_delegate_scope','independent_tribunal_live',
  'revocation_midflight_enforced','audit_job_permission_chain'
 ]),
 GOVERNED_IMPROVEMENT:Object.freeze([
  'old_vs_new_independent_holdout','no_regression_e2e',
  'p23_real_kpi_observability','disaster_recovery_drill',
  'independent_promotion_authority','post_promotion_rollback_monitor'
 ])
});
const trustedSources=new Set([
 'GITHUB_ACTIONS','GATEWAY_LIVE','SUPABASE_READONLY',
 'OWNER_DEVICE_E2E','IMMUTABLE_AUDIT_LEDGER','FINOPS_OBSERVER',
 'SUPERVISOR_MONITOR','TRIBUNAL_JUDGE','RELEASE_AUTHORITY'
]);
export const B10_CERTIFICATION_AUTHORITY=Object.freeze({
 productionWrites:false,autoPromotion:false,spendEuro:0,
 canChangeKillSwitch:false,canDeploy:false,canGrantPermissions:false
});
const iso=value=>{
 if(typeof value!=='string')return NaN;
 const m=Date.parse(value);return Number.isFinite(m)&&new Date(m).toISOString()===value?m:NaN;
};
function safeControl(snapshot){
 return snapshot?.environment==='PROD'&&snapshot?.companyId&&
  snapshot.b3?.enabled===true&&snapshot.b3.killSwitch===false&&
  snapshot.b4?.enabled===true&&snapshot.b4.killSwitch===false&&
  snapshot.gateway?.enabled===true&&snapshot.gateway.killSwitch===false&&
  snapshot.supervisor?.enabled===true&&snapshot.supervisor.killSwitch===false&&
  snapshot.audit?.reachable===true&&snapshot.finops?.hardCostLimitEuro===0&&
  snapshot.tradingAccess===false&&snapshot.prodWritesByB10===false;
}
const failure=(reason,extra={})=>Object.freeze({
 state:'NO_GO',reason,certified:false,productionAuthorized:false,prodWriteAuthorized:false,
 automaticActivation:false,spentEuro:0,...extra
});
export function assessJarvisB10Certification({
 companyId,version='0.1.0',targetStage='READ_ONLY',
 evidence=[],controlSnapshot,now=new Date().toISOString()
}={}){
 if(!valid(companyId)||!valid(version)||!B10_PHASES.includes(targetStage)||
  !Array.isArray(evidence)||evidence.length>300||
  !Number.isFinite(iso(now)))return failure('REQUEST_INVALID');
 if(!controlSnapshot||controlSnapshot.companyId!==companyId||
  controlSnapshot.environment!=='PROD')return failure('CONTROL_SNAPSHOT_REQUIRED');
 const controlsPass=safeControl(controlSnapshot)===true;
 const idx=B10_PHASES.indexOf(targetStage);
 const wanted=B10_PHASES.slice(0,idx+1).flatMap(p=>B10_STAGE_REQUIREMENTS[p]);
 const wantedSet=new Set(wanted);
 const counts=new Map(),validKeys=new Set(),invalid=[];
 const nowMs=iso(now);
 for(const item of evidence){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const key=item.key;
  if(!wantedSet.has(key))continue;
  counts.set(key,(counts.get(key)||0)+1);
  const when=iso(item.observedAt);
  const devices=item.key==='two_devices_same_mission';
  const good=item.companyId===companyId&&item.environment==='PROD'&&
   item.version===version&&item.verified===true&&item.classification==='PROD_OPERATION_VERIFIED'&&
   trustedSources.has(item.source)&&valid(item.receiptRef)&&SHA.test(item.evidenceHash)&&
   valid(item.verifierId)&&valid(item.candidateActorId)&&
   item.verifierId!==item.candidateActorId&&
   Number.isFinite(when)&&nowMs-when<=24*60*60*1000&&when<=nowMs+5*60*1000&&
   item.containsSecrets===false&&item.containsRawCompanyData===false&&
   item.newCostEuro===0&&item.prodMutationByB10===false&&
   (!devices||(Array.isArray(item.deviceProofRefs)&&item.deviceProofRefs.length>=2&&
     new Set(item.deviceProofRefs).size===item.deviceProofRefs.length&&
     item.deviceProofRefs.every(valid)));
  if(good)validKeys.add(key);else invalid.push(key);
 }
 // Ambiguous/bypassed evidence and duplicate receipts do not certify anything.
 for(const [key,count] of counts)if(count!==1){
  invalid.push(key);validKeys.delete(key);
 }
 const missing=wanted.filter(key=>!counts.has(key));
 const completed=B10_PHASES.map((phase,i)=>Object.freeze({
  phase,assessment:i>idx?'NOT_REQUESTED':
   B10_STAGE_REQUIREMENTS[phase].every(x=>validKeys.has(x))&&controlsPass&&
    !B10_STAGE_REQUIREMENTS[phase].some(x=>invalid.includes(x))?'EVIDENCE_METADATA_COMPLETE':'BLOCKED',
  required:B10_STAGE_REQUIREMENTS[phase].length,
  present:B10_STAGE_REQUIREMENTS[phase].filter(x=>validKeys.has(x)).length
 }));
 return Object.freeze({
  ...failure(!controlsPass?'LIVE_PRODUCTION_CONTROLS_NOT_ENABLED':
   missing.length||invalid.length?'VERIFIED_PRODUCTION_EVIDENCE_INCOMPLETE':
   'INDEPENDENT_EXTERNAL_PROMOTION_AUTHORITY_REQUIRED'),
  targetStage,companyId,version,missing:Object.freeze(missing),
  invalid:Object.freeze([...new Set(invalid)]),
  progress:Object.freeze(completed),
  evidenceMetadataComplete:controlsPass&&missing.length===0&&invalid.length===0,
  nextGate:'INDEPENDENT_EXTERNAL_AUTHORITY_REVIEW',
  evidenceClassification:'PROD_OPERATION_VERIFIED_REQUIRED',
  scope:'ASSESSMENT_ONLY_NO_ACTIVATION'
 });
}
