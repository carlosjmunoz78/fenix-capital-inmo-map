/** ZEUS/JARVIS B9 resilience decision helper.
 * Reuses the shared worker/supervisor; creates no scheduler, retry job or executor.
 * Classifies next action only. Never auto-retries, modifies data or spends money.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const ERROR_CLASSES=new Set(['CODE','WINDOWS','NETWORK','AUTH','CREDENTIALS','PROCESS_LAUNCH',
 'RUNTIME','CI','CONFIG','FILESYSTEM','BROWSER','EXTENSION','GATEWAY',
 'POLICY','PERMISSIONS','EXTERNAL_SERVICE','UNKNOWN']);
const CRITICAL=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE',
 'HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const out=(decision,reason)=>Object.freeze({decision,reason,executed:false,retried:false,spentEuro:0});
export function decideJarvisB9Recovery({companyId,environment,missionId,failureClass='UNKNOWN',
 consecutiveSameFamily=0,operation='READ',idempotencyKey=null,rollbackRef=null,
 exceptionCode=null,estimatedExtraEuro=0}={}){
 if(typeof companyId!=='string'||!ID.test(companyId)||!['LAB','PREPROD','PROD'].includes(environment)||
  typeof missionId!=='string'||!ID.test(missionId)||!ERROR_CLASSES.has(failureClass)||
  !Number.isSafeInteger(consecutiveSameFamily)||consecutiveSameFamily<0||consecutiveSameFamily>100000||
  !['READ','MUTATION'].includes(operation)||typeof estimatedExtraEuro!=='number'||
  !Number.isFinite(estimatedExtraEuro)||estimatedExtraEuro<0||
  (idempotencyKey!==null&&(typeof idempotencyKey!=='string'||!ID.test(idempotencyKey)))||
  (rollbackRef!==null&&(typeof rollbackRef!=='string'||!ID.test(rollbackRef)))||
  (exceptionCode!==null&&!CRITICAL.has(exceptionCode)))return out('STOP','REQUEST_INVALID');
 if(exceptionCode)return out('HUMAN_REQUIRED',exceptionCode);
 if(estimatedExtraEuro>0)return out('STOP','ZERO_NEW_COST_GUARD');
 if(['AUTH','CREDENTIALS','POLICY','PERMISSIONS'].includes(failureClass))
  return out('STOP','REVALIDATE_IDENTITY_OR_POLICY');
 if(consecutiveSameFamily>=3)return out('STOP','ANTI_LOOP_REEVALUATE_CAUSE');
 if(operation==='MUTATION'&&(!idempotencyKey||!rollbackRef))
  return out('STOP','MUTATION_RETRY_REQUIRES_IDEMPOTENCY_AND_ROLLBACK');
 if(failureClass==='UNKNOWN')return out('STOP','CLASSIFY_FAILURE_BEFORE_RETRY');
 return out('CANDIDATE_ONLY','SHARED_WORKER_MAY_EVALUATE_RETRY');
}
