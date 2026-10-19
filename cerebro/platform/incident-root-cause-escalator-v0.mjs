import crypto from 'node:crypto';

const HUMAN_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export function normalizeFailure(input={}) {
  const workflow=String(input.workflow??'UNKNOWN').trim();
  const job=String(input.job??'UNKNOWN').trim();
  const step=String(input.step??'UNKNOWN').trim();
  const error=String(input.error??'UNKNOWN').replace(/\s+/g,' ').trim().slice(0,500);
  const environment=String(input.environment??'PREPROD').trim().toUpperCase();
  const fingerprint=crypto.createHash('sha256').update([workflow,job,step,error,environment].join('|')).digest('hex');
  return {workflow,job,step,error,environment,fingerprint};
}

export function decideIncidentAction({current, history=[], proposedRepair=null}={}) {
  const f=normalizeFailure(current);
  const same=history.map(normalizeFailure).filter(x=>x.fingerprint===f.fingerprint).length;
  const occurrences=same+1;
  const canonicalHumanReason=HUMAN_REASONS.has(current?.human_required_reason) ? current.human_required_reason : null;

  if (canonicalHumanReason) return {
    state:'HUMAN_REQUIRED', reason:canonicalHumanReason, occurrences, fingerprint:f.fingerprint,
    retry_authorized:false, root_cause_repair_required:false, prod_authorized:false
  };

  if (occurrences >= 2) {
    const bounded=Boolean(proposedRepair?.bounded && proposedRepair?.reversible && proposedRepair?.preprod_only && proposedRepair?.tests_defined && proposedRepair?.rollback_defined && proposedRepair?.additional_cost_eur===0 && proposedRepair?.prod_write===false && proposedRepair?.permission_expansion===false && proposedRepair?.gate_relaxation===false);
    return {
      state: bounded ? 'ROOT_CAUSE_REPAIR_READY' : 'ROOT_CAUSE_REPAIR_REQUIRED',
      reason:'REPEATED_IDENTICAL_FAILURE_ANTI_LOOP', occurrences, fingerprint:f.fingerprint,
      retry_authorized:false, root_cause_repair_required:true,
      repair_authorized:bounded, prod_authorized:false,
      required_evidence:['root_cause','bounded_patch','tests','old_vs_new','rollback','post_patch_single_validation']
    };
  }

  return {
    state:'ONE_SAFE_RETRY_ALLOWED', reason:'FIRST_OCCURRENCE', occurrences, fingerprint:f.fingerprint,
    retry_authorized:true, max_retries:1, root_cause_repair_required:false, prod_authorized:false
  };
}

export function assertRepairEnvelope(repair={}) {
  const checks={
    bounded:repair.bounded===true,
    reversible:repair.reversible===true,
    preprod_only:repair.preprod_only===true,
    tests_defined:repair.tests_defined===true,
    rollback_defined:repair.rollback_defined===true,
    zero_cost:Number(repair.additional_cost_eur)===0,
    no_prod:repair.prod_write===false,
    no_permission_expansion:repair.permission_expansion===false,
    no_gate_relaxation:repair.gate_relaxation===false
  };
  return {green:Object.values(checks).every(Boolean),checks};
}
