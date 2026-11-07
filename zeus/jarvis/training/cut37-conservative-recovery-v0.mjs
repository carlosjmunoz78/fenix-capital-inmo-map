/**
 * CEREBRO OS CUT37 · Fail-closed recovery of an interrupted PREPAID LAB envelope.
 *
 * Output is a candidate JSON ledger ONLY. This module never calls DeepSeek,
 * dispatches workflows or writes the canonical ledger. The one-shot operator
 * compares source SHA, tests and evidence before any real branch change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const RECOVERY = Object.freeze({
  run_id:'42290257959', company_id:'fenix', engine_id:'JARVIS',
  reserved_usd:1.8, expected_cursor:322, prior_spent_usd:1.899419652,
  previous_ledger_sha:'0ece9d8f03293a8d4839fdb69c27291f65f1ea73',
  artifact_id:13539581837, artifact_run:42290257959,
  artifact_files:Object.freeze({
    'cut37-run-plan.json':'40a538798966b5b5bd75568dd7572874bafb1b7b05b75acce6c6727a98c64408',
    'jarvis-study-4229025795900.json':'685e6c3a60048e784eeae4c3c9bfc97fc8d2e802ac1d4fc6de1d0a36eeb3c923',
    'partial-study-4229025795900.json':'6c8d5664cfbd5535ef3121f1af7c0039ed1d2ae2a004276880b63a1db2897020',
    'partial-study-4229025795901.json':'d15c89b5076c6a032e9075b871361567ca7a9a94dc4f4fdeb4d8b4ff7b9ec704'
  }),
  cause:'PROVIDER_HTTP_503_WITH_UNSETTLED_RESERVATION',
  mode:'WORST_CASE_FULL_RESERVATION_ACCOUNTED_NOT_VERIFIED_BILLING'
});
const sha=x=>createHash('sha256').update(x).digest('hex');
const safeRounded=x=>Math.round(x*1e9)/1e9;
export function validateEvidence(folder,read=fs.readFileSync) {
  const docs={};
  for (const [file,expected] of Object.entries(RECOVERY.artifact_files)) {
    const bytes=read(path.join(folder,file));
    if(sha(bytes)!==expected)throw new Error('EVIDENCE_SHA_MISMATCH:'+file);
    docs[file]=JSON.parse(bytes.toString('utf8'));
  }
  const plan=docs['cut37-run-plan.json'];
  const full=docs['jarvis-study-4229025795900.json'];
  const partial0=docs['partial-study-4229025795900.json'];
  const partial1=docs['partial-study-4229025795901.json'];
  if(String(plan.run_id)!==RECOVERY.run_id || plan.environment!=='LAB' ||
    plan.cycles!==12 || plan.reserved_usd!==1.8 || plan.cursor!==322)
    throw new Error('RUN_PLAN_CONTRACT_MISMATCH');
  if(full.environment!=='LAB'||full.company_id!=='fenix'||full.model!=='deepseek-flash'||
     full.calls!==12 ||full.cases_attempted!==6||full.auto_promote!==false||full.prod_authorized!==false)
    throw new Error('FULL_CYCLE_INVALID');
  for(const p of [partial0,partial1]) {
    if(p.status!=='PARTIAL_NOT_APPROVED'||p.environment!=='LAB'||p.company_id!=='fenix'||
       p.engine_id!=='JARVIS'||p.model!=='deepseek-flash'||p.auto_promote!==false||
       p.prod_authorized!==false||p.provider_billing_reconciled!==false)
      throw new Error('PARTIAL_EVIDENCE_INVALID');
  }
  if(partial0.calls!==12 ||partial1.calls!==1 ||
    full.usd_peak_estimate!==partial0.usd_peak_estimate ||
    safeRounded(partial0.usd_peak_estimate+partial1.usd_peak_estimate)>RECOVERY.reserved_usd)
    throw new Error('PARTIAL_COUNTS_OR_RESERVED_CAP_INVALID');
  return {
    observed_calls:13, completed_full_cycles:1,
    observed_peak_estimate_usd:safeRounded(partial0.usd_peak_estimate+partial1.usd_peak_estimate),
    billing_verified:false, trusted_hash_count:Object.keys(docs).length
  };
}
export function conservativelyRecover(ledger, evidence) {
  if(ledger.schema!=='jarvis.deepseek.autonomy.ledger.v1' || ledger.company_id!=='fenix' ||
    ledger.engine_id!=='JARVIS'||ledger.environment!=='LAB' ||
    ledger.status!=='RESERVED'||ledger.owner_permission_eur!==50 ||
    ledger.lifetime_guard_usd!==40||ledger.synthetic_only!==true ||
    ledger.auto_promote!==false||ledger.auto_recharge!==false||
    ledger.production_mutation!==false||ledger.recovery||
    ledger.pending?.run_id!==RECOVERY.run_id||ledger.pending?.cursor!==322 ||
    ledger.pending?.reserved_usd!==1.8||ledger.pending?.cycles!==12 ||
    ledger.cycle_cursor!==322||ledger.spent_estimate_usd!==RECOVERY.prior_spent_usd)
      throw new Error('LEDGER_PRECONDITIONS_NOT_MET');
  if(evidence?.trusted_hash_count!==4 ||evidence?.observed_calls!==13 ||
    evidence?.completed_full_cycles!==1 ||evidence?.billing_verified!==false)
      throw new Error('RECONCILIATION_EVIDENCE_INVALID');
  const originalPending=structuredClone(ledger.pending);
  const estimated=safeRounded(ledger.spent_estimate_usd+RECOVERY.reserved_usd);
  if(estimated>ledger.lifetime_guard_usd)throw new Error('CONSERVATIVE_CAP_EXCEEDED');
  return {
    ...structuredClone(ledger),
    status:'PAUSED',
    spent_estimate_usd:estimated,
    pending:null,
    halt_reason:'CUT37_PROVIDER_HTTP_503_SETTLED_CONSERVATIVELY_PAUSED',
    budget_accounting_basis:'INCLUDES_FULL_UNSETTLED_RESERVATION_NOT_ACTUAL_BILLING',
    recovery:{
      recovery_version:'CUT37-conservative-v0.1.0',
      source_run_id:RECOVERY.run_id,
      source_artifact_id:RECOVERY.artifact_id,
      source_ledger_blob_sha:RECOVERY.previous_ledger_sha,
      cause:RECOVERY.cause,
      original_pending:originalPending,
      charged_conservative_usd:RECOVERY.reserved_usd,
      observed_calls_not_counted_as_completed:evidence.observed_calls,
      observed_peak_estimate_usd:evidence.observed_peak_estimate_usd,
      provider_billing_reconciled:false,
      auto_resume:false,
      human_or_gov_review_before_resume:true,
      artifact_hashes:RECOVERY.artifact_files
    }
  };
}
export function prepareRecovery(ledgerFile,artifactFolder,outFile) {
  const ledger=JSON.parse(fs.readFileSync(ledgerFile,'utf8'));
  const evidence=validateEvidence(artifactFolder);
  const next=conservativelyRecover(ledger,evidence);
  fs.writeFileSync(outFile,JSON.stringify(next,null,2)+'\n',{mode:0o600});
  return {status:next.status,source_run_id:next.recovery.source_run_id,
    counted_worst_case_usd:next.recovery.charged_conservative_usd,
    reserve_cleared:next.pending===null,auto_resume:false,
    new_estimate_usd:next.spent_estimate_usd,billing_verified:false};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(process.argv[2]!=='--preview'||process.argv.length!==6)throw Error('PREVIEW_ONLY');
  console.log(JSON.stringify(prepareRecovery(process.argv[3],process.argv[4],process.argv[5])));
}
