// FACT-001 / Supabase Management API. PURE policy module: no fetch, SQL or mutations.
// Additive LAB candidate. Do not import into the deployed v33 broker until physical gates.
const SCOPE = Object.freeze({ company_id:'fenix-capital', engine_id:'FACT-001', environment:'LAB', version:'1.0.0', client_id:'cerebro' });
export const SUPABASE_MGMT_LAB = Object.freeze({
  project_ref:'cluhljgonannaafpmblx',
  resource_type:'edge_function',
  resource_slug:'cerebro-fact001-sb-mgmt-canary-lab',
  principal:'github_oidc',
  capability:'fact001.supabase.edge_canary.lab',
  operations:Object.freeze(['edge.read','edge.create','edge.update','edge.delete']),
  max_cost_eur:0,
  ttl_seconds:900,
  mutation_enabled:false,
});
const HEX64=/^[a-f0-9]{64}$/;
const ID=/^FACT001-SBMGT-[A-Z0-9-]{8,60}$/;
const KEYS=Object.freeze([...Object.keys(SCOPE),'project_ref','resource_type','resource_slug','operation','request_id','idempotency_key','max_cost_eur','expires_at','expected_state','expected_sha256','artifact_sha256','rollback_sha256']);
const strictObject = value => value && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype;
const sorted = keys => [...keys].sort().join('|');
const fail = code => { throw new Error(code); };
const validHash = v => typeof v==='string' && HEX64.test(v);

// Trust context is supplied ONLY by the already verified backend identity policy,
// never copied from a JSON order or any caller-supplied field.
export function assertServicePrincipal(principal) {
  if(!strictObject(principal) || principal.trusted!==true || principal.client_id!=='cerebro' ||
     principal.company_id!==SCOPE.company_id || principal.engine_id!==SCOPE.engine_id ||
     principal.environment!=='LAB' || principal.source!=='github_oidc' ||
     principal.capability!==SUPABASE_MGMT_LAB.capability) fail('SB_MGMT_SERVICE_IDENTITY_DENIED');
  return true;
}

export function assertEdgeLabOrder(order,{now=Date.now()}={}) {
  if(!strictObject(order) || sorted(Object.keys(order))!==sorted(KEYS)) fail('SB_MGMT_ORDER_FIELDS_DENIED');
  for(const [k,v] of Object.entries(SCOPE)) if(order[k]!==v) fail('SB_MGMT_SCOPE_DENIED');
  if(order.project_ref!==SUPABASE_MGMT_LAB.project_ref || order.resource_type!==SUPABASE_MGMT_LAB.resource_type ||
     order.resource_slug!==SUPABASE_MGMT_LAB.resource_slug) fail('SB_MGMT_RESOURCE_DENIED');
  if(!SUPABASE_MGMT_LAB.operations.includes(order.operation)) fail('SB_MGMT_OPERATION_DENIED');
  if(typeof order.request_id!=='string'||!ID.test(order.request_id)||order.idempotency_key!==order.request_id)
     fail('SB_MGMT_IDEMPOTENCY_DENIED');
  if(order.max_cost_eur!==0) fail('SB_MGMT_MONEY_LIMIT');
  if(!Number.isSafeInteger(order.expires_at) || !Number.isSafeInteger(now) ||
     order.expires_at<=now || order.expires_at>now+SUPABASE_MGMT_LAB.ttl_seconds*1000)
     fail('SB_MGMT_TIME_DENIED');
  if(!['absent','present'].includes(order.expected_state)) fail('SB_MGMT_BASELINE_DENIED');
  const op=order.operation;
  const exists=order.expected_state==='present';
  if(op==='edge.create' && exists) fail('SB_MGMT_CREATE_MUST_BE_ABSENT');
  if((op==='edge.update'||op==='edge.delete')&&!exists) fail('SB_MGMT_EXISTING_REQUIRED');
  if(exists ? !validHash(order.expected_sha256) : order.expected_sha256!==null)
    fail('SB_MGMT_EXPECTED_SHA_DENIED');
  const needsArtifact=op==='edge.create'||op==='edge.update';
  if(needsArtifact ? !validHash(order.artifact_sha256) : order.artifact_sha256!==null)
    fail('SB_MGMT_ARTIFACT_DENIED');
  const needsRollback=op!=='edge.read';
  if(needsRollback ? !validHash(order.rollback_sha256) : order.rollback_sha256!==null)
    fail('SB_MGMT_ROLLBACK_HASH_DENIED');
  return Object.freeze({...order});
}

// The caller must obtain baseline/snapshot from an authenticated server-side
// readback of the EXACT allowlisted resource. Snapshot verification is separate
// from an untrusted order and must include a tested restore artifact for writes.
export function planSupabaseEdgeCanary({order,principal,baseline,backup,now=Date.now(),enableMutations=false}={}) {
  assertServicePrincipal(principal);
  const o=assertEdgeLabOrder(order,{now});
  if(!strictObject(baseline) || baseline.verified!==true || baseline.project_ref!==o.project_ref ||
     baseline.resource_slug!==o.resource_slug || typeof baseline.exists!=='boolean' ||
     !Number.isSafeInteger(baseline.checked_at) || baseline.checked_at>now || baseline.checked_at<now-60000)
     fail('SB_MGMT_PREFLIGHT_UNVERIFIED');
  if(baseline.exists!==(o.expected_state==='present')) fail('SB_MGMT_OLD_VS_NEW_CONFLICT');
  if(baseline.exists && (!validHash(baseline.sha256)||baseline.sha256!==o.expected_sha256))
     fail('SB_MGMT_BASELINE_HASH_CHANGED');
  const mutation=o.operation!=='edge.read';
  if(mutation){
    if(enableMutations!==true) fail('SB_MGMT_MUTATIONS_OFF');
    if(!strictObject(backup) || backup.verified!==true || backup.rollback_test_passed!==true ||
       backup.project_ref!==o.project_ref || backup.resource_slug!==o.resource_slug ||
       backup.sha256!==o.rollback_sha256 || backup.before_sha256!==o.expected_sha256 ||
       !Number.isSafeInteger(backup.checked_at)||backup.checked_at>now||backup.checked_at<now-300000)
       fail('SB_MGMT_BACKUP_ROLLBACK_REQUIRED');
    // For a CREATE, rollback is verified deletion of only this synthetic canary.
    if(o.operation==='edge.create' && backup.restore_kind!=='delete_new_canary')
       fail('SB_MGMT_WRONG_ROLLBACK_STRATEGY');
    if(o.operation!=='edge.create' && backup.restore_kind!=='restore_exact_canary')
       fail('SB_MGMT_WRONG_ROLLBACK_STRATEGY');
  }
  // No URLs, tokens, SQL, body, provider payload, personal data or secrets in the plan.
  return Object.freeze({status:mutation?'LAB_MUTATION_PLAN_ONLY':'LAB_READ_PLAN_ONLY',executed:false,
    operation:o.operation,project_ref:o.project_ref,resource_slug:o.resource_slug,
    request_id:o.request_id,idempotency_key:o.idempotency_key,
    before_sha256:o.expected_sha256,artifact_sha256:o.artifact_sha256,
    rollback_sha256:o.rollback_sha256,max_cost_eur:0,company_id:o.company_id,
    engine_id:o.engine_id,environment:'LAB',version:o.version,needs_signed_executor:true});
}