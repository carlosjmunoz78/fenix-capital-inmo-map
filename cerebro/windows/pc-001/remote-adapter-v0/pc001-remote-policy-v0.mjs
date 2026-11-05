import {
  claimUniversalDeviceEnvelopeV2,
  buildSanitizedUniversalDeviceReceiptV2
} from '../../../runtime/universal-device-command-envelope-v2.mjs';

export const PC001_REMOTE_PROOF = Object.freeze({
  capability: 'PC001_SYNTHETIC_LOCAL_PROOF',
  action: 'RUN_VISIBLE_SYNTHETIC_PROOF',
  policy_id: 'pc001-visible-synthetic-proof-preprod-v0',
  company_id: 'fenix', venture_id: 'fenix', engine_id: 'PC-001',
  environment: 'PREPROD', version: 'pc001-windows-v1',
  extra_cost_eur: 0
});

function exact(arr, value) {
  return Array.isArray(arr) && arr.length === 1 && arr[0] === value;
}
function hold(code) {
  return Object.freeze({decision: 'HOLD', blockers: Object.freeze([code]), execution_authorized: false});
}
const ALLOWED_PAYLOAD_KEYS = new Set(['schema_version','request_id','idempotency_key','issued_at','expires_at','device_id','company_id','venture_id','engine_id','environment','version','capability','action','policy']);
const ALLOWED_POLICY_KEYS = new Set(['policy_id','allowed_company_ids','allowed_venture_ids','allowed_engine_ids','allowed_environments','allowed_versions','allowed_capabilities','allowed_actions','state_changing','prod_allowed','trading_allowed','human_required']);
function requestMatches(row, deviceId) {
  if (!row || typeof row !== 'object' || !row.payload || typeof row.payload !== 'object') return false;
  const p = row.payload, c = PC001_REMOTE_PROOF;
  return Object.keys(p).every(k=>ALLOWED_PAYLOAD_KEYS.has(k)) &&
    Object.keys(p.policy??{}).every(k=>ALLOWED_POLICY_KEYS.has(k)) &&
    row.device_id === deviceId && p.device_id === deviceId &&
    row.company_id === c.company_id && p.company_id === c.company_id &&
    p.venture_id === c.venture_id && row.engine_id === c.engine_id && p.engine_id === c.engine_id &&
    row.environment === c.environment && p.environment === c.environment &&
    row.version === c.version && p.version === c.version &&
    p.schema_version === '2.0.0' &&
    row.idempotency_key === p.idempotency_key &&
    p.capability === c.capability && p.action === c.action &&
    p.policy?.policy_id === c.policy_id &&
    p.policy.state_changing === true &&
    p.policy.prod_allowed !== true && p.policy.trading_allowed !== true &&
    p.policy.human_required == null &&
    exact(p.policy.allowed_company_ids, c.company_id) &&
    exact(p.policy.allowed_venture_ids, c.venture_id) &&
    exact(p.policy.allowed_engine_ids, c.engine_id) &&
    exact(p.policy.allowed_environments, c.environment) &&
    exact(p.policy.allowed_versions, c.version) &&
    exact(p.policy.allowed_capabilities, c.capability) &&
    exact(p.policy.allowed_actions, c.action) &&
    typeof row.command_id === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(row.command_id) &&
    (!p.parameters || (Object.keys(p.parameters).length === 0 && Object.getPrototypeOf(p.parameters) === Object.prototype));
}

/**
 * A prepare/execute policy, not a transport or remote executor. No machine effects.
 * Existing Gateway polls with the already enrolled device identity. The native
 * Windows client must collect visible local consent and verify the existing
 * session; a command row alone never constitutes authorization for UI input.
 */
export function claimPc001VisibleProof({row, deviceIdentity, local, ledger = new Map(), now} = {}) {
  const identity = deviceIdentity?.canonical_device_id;
  if (!identity || deviceIdentity?.enrolled !== true || deviceIdentity?.revoked === true)
    return hold('device_identity_not_attested');
  if (local?.transport_authenticated !== true || local?.gateway_worker_quiescent !== true)
    return hold('gateway_transport_not_isolated');
  if (local?.interactive_user_session !== true || local?.local_consent_accepted !== true)
    return hold('visible_local_consent_required');
  if (local?.kill_switch_active === true || local?.stop_requested === true)
    return hold('kill_switch_active');
  if (local?.verified_fixture_sha256 !== 'd150f09b0580311d005b40b74c2dabab3f0b7e2b4e34402444add65afb557758')
    return hold('fixture_hash_mismatch');
  if (!requestMatches(row, identity)) return hold('pc001_exact_scope_policy_denied');
  const claim = claimUniversalDeviceEnvelopeV2(row.payload, ledger, {
    now: now ?? new Date().toISOString(),
    identity: {canonical_device_id: identity},
    expected_company_id: PC001_REMOTE_PROOF.company_id
  });
  if (claim.decision !== 'CLAIMED') return Object.freeze({...claim, execution_authorized: false});
  return Object.freeze({...claim, execution_authorized: true, allowed_effect: 'VISIBLE_OWN_WINDOW_AND_SYNTHETIC_FILES_ONLY'});
}

export function receiptPc001VisibleProof({row, claim, result} = {}) {
  const semanticOK = result?.visible_consent === true && result?.mouse_own_window === true &&
    result?.keyboard_readback === true && result?.screenshot_own_window === true &&
    result?.synthetic_files_recovered === true && result?.source_report_status === 'LOCAL_UI_AND_FILES_PASS_REMOTE_PENDING';
  return buildSanitizedUniversalDeviceReceiptV2({
    envelope: row.payload, claim,
    result: {
      ok: semanticOK,
      semantic_readback: {verified: semanticOK, kind: 'VISIBLE_SYNTHETIC_LOCAL_WINDOWS_PROOF',
        evidence_ref: semanticOK ? 'LOCAL_SANITIZED_RECEIPT' : null}
    }
  });
}