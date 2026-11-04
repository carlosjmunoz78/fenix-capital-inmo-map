/** ZEUS JARVIS B10 CUT03 — read-only control-plane observation reconciler.
 * Safely wraps external status: ACTIVE deploy != healthy endpoint or owner-authorized
 * mission. Any observation is REAL_EXTERNAL_READ, NEVER PROD_OPERATION_VERIFIED.
 * Does not perform network I/O or touch Supabase/App/CRM.
 */
import {createHash} from 'node:crypto';
import {assessJarvisB10Certification} from './jarvis-b10-certification-matrix.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const SHA=/^[a-f0-9]{40}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const KIND=Object.freeze([
 'SUPABASE_PROJECT_STATUS','EDGE_FUNCTION_DEPLOYED',
 'B3_PROD_CONTROL','B4_PROD_CONTROL','COMPANY_REGISTRY_PREPROD_COUNT',
 'GITHUB_MAIN_HEAD','GITHUB_B10_HEAD','PUBLIC_APP_SOURCE_SHA_ATTEMPT',
 'BROWSER_SESSION_ATTEMPT'
]);
const SOURCE=Object.freeze({
 SUPABASE_PROJECT_STATUS:'SUPABASE_CONTROL_PLANE',
 EDGE_FUNCTION_DEPLOYED:'SUPABASE_CONTROL_PLANE',
 B3_PROD_CONTROL:'SUPABASE_SQL_READONLY',
 B4_PROD_CONTROL:'SUPABASE_SQL_READONLY',
 COMPANY_REGISTRY_PREPROD_COUNT:'SUPABASE_SQL_READONLY',
 GITHUB_MAIN_HEAD:'GITHUB_READONLY',
 GITHUB_B10_HEAD:'GITHUB_READONLY',
 PUBLIC_APP_SOURCE_SHA_ATTEMPT:'PUBLIC_HTTP_READONLY',
 BROWSER_SESSION_ATTEMPT:'USER_BROWSER_READONLY'
});
const FIELDS=new Set(['kind','source','companyId','environment','reference',
 'observedAt','status','value','environmentScope']);
const STATUSES=new Set(['ACTIVE_HEALTHY','ACTIVE','DISABLED_KILLSWITCH_ON',
 'EMPTY','KNOWN_COMMIT_SHA','NOT_ACCESSIBLE','UNREACHABLE','NOT_VERIFIED']);
const deny=reason=>Object.freeze({
 state:'NO_GO',reason,certified:false,productionAuthorized:false,
 prodWriteAuthorized:false,canDeploy:false,canActivate:false,
 costEuro:0,classification:'REAL_EXTERNAL_READ_ONLY'
});
function normalize(observation,companyId,nowMs){
 const o=observation;
 if(!o||typeof o!=='object'||Array.isArray(o)||
  Object.keys(o).some(k=>!FIELDS.has(k))||
  !KIND.includes(o.kind)||o.source!==SOURCE[o.kind]||
  o.companyId!==companyId||o.environment!=='PROD'||
  !valid(o.reference)||!STATUSES.has(o.status)||
  typeof o.observedAt!=='string')return null;
 const when=Date.parse(o.observedAt);
 if(!Number.isFinite(when)||new Date(when).toISOString()!==o.observedAt||
  when>nowMs+300000||when<nowMs-86400000)return null;
 if(o.kind==='COMPANY_REGISTRY_PREPROD_COUNT'&&o.environmentScope!=='PREPROD')
  return null;
 const isControl=['B3_PROD_CONTROL','B4_PROD_CONTROL'].includes(o.kind);
 if(isControl&&o.status!=='DISABLED_KILLSWITCH_ON'&&o.status!=='NOT_VERIFIED')return null;
 if(o.kind==='COMPANY_REGISTRY_PREPROD_COUNT'&&
  (o.status!=='EMPTY'||o.value!==0))return null;
 if(['GITHUB_MAIN_HEAD','GITHUB_B10_HEAD'].includes(o.kind)&&
  (o.status!=='KNOWN_COMMIT_SHA'||!SHA.test(o.value)))return null;
 if(o.kind==='SUPABASE_PROJECT_STATUS'&&o.status!=='ACTIVE_HEALTHY'&&
  o.status!=='NOT_VERIFIED')return null;
 if(o.kind==='EDGE_FUNCTION_DEPLOYED'&&o.status!=='ACTIVE'&&o.status!=='NOT_VERIFIED')return null;
 if(['PUBLIC_APP_SOURCE_SHA_ATTEMPT','BROWSER_SESSION_ATTEMPT'].includes(o.kind)&&
  !['NOT_ACCESSIBLE','UNREACHABLE','NOT_VERIFIED'].includes(o.status))return null;
 if(o.kind!=='COMPANY_REGISTRY_PREPROD_COUNT'&&
  !['GITHUB_MAIN_HEAD','GITHUB_B10_HEAD'].includes(o.kind)&&
  o.value!==undefined)return null;
 if(!isControl&&o.kind!=='COMPANY_REGISTRY_PREPROD_COUNT'&&
  o.environmentScope!==undefined)return null;
 return Object.freeze({kind:o.kind,status:o.status,source:o.source,reference:o.reference,
  observedAt:o.observedAt,
  ...(o.kind==='COMPANY_REGISTRY_PREPROD_COUNT'?{scope:'PREPROD',count:0}:{}),
  ...(['GITHUB_MAIN_HEAD','GITHUB_B10_HEAD'].includes(o.kind)?{sha:o.value}:{}),
  ...(o.kind==='EDGE_FUNCTION_DEPLOYED'?{deploymentOnly:true}:{}),
  classification:'REAL_EXTERNAL_READ',prodOperationVerified:false});
}
export function reconcileJarvisB10ReadonlyObservations({
 companyId,version='0.1.0',observedAt,observations=[]
}={}){
 if(!valid(companyId)||!valid(version)||!Array.isArray(observations)||
  observations.length>100||typeof observedAt!=='string')return deny('REQUEST_INVALID');
 const when=Date.parse(observedAt);
 if(!Number.isFinite(when)||new Date(when).toISOString()!==observedAt)
  return deny('REQUEST_INVALID');
 const accepted=[],rejected=[],seen=new Set();
 for(let i=0;i<observations.length;i++){
  const x=normalize(observations[i],companyId,when);
  if(!x){rejected.push(i);continue;}
  const key=x.kind+'|'+x.reference;
  if(seen.has(key)){rejected.push(i);continue;}
  seen.add(key);accepted.push(x);
 }
 // No auto-translation of SUPABASE "ACTIVE" into Gateway health, B3 grants,
 // real owner session, or actual PROD evidence. Default to unobserved and OFF.
 const b3=accepted.find(x=>x.kind==='B3_PROD_CONTROL'&&
  x.status==='DISABLED_KILLSWITCH_ON');
 const b4=accepted.find(x=>x.kind==='B4_PROD_CONTROL'&&
  x.status==='DISABLED_KILLSWITCH_ON');
 const snapshot={
  companyId,environment:'PROD',b3:b3?{enabled:false,killSwitch:true}:null,
  b4:b4?{enabled:false,killSwitch:true}:null,
  gateway:null,supervisor:null,audit:null,finops:null,
  tradingAccess:false,prodWritesByB10:false
 };
 const assessment=assessJarvisB10Certification({
  companyId,version,targetStage:'READ_ONLY',now:observedAt,
  controlSnapshot:snapshot,evidence:[]});
 const exported=accepted.map(x=>Object.freeze({...x}));
 const proofFingerprint=createHash('sha256').update(JSON.stringify({
  companyId,version,observedAt,accepted:exported
 })).digest('hex');
 return Object.freeze({...deny('EXTERNAL_READS_DO_NOT_CERTIFY_PROD'),
  companyId,version,observedAt,
  verifiedExternallyReadCount:accepted.length,
  rejectedObservationIndices:Object.freeze(rejected),
  externalReadObservations:Object.freeze(exported),
  fingerprintNotAuthentication:proofFingerprint,
  b10Assessment:Object.freeze({
   state:assessment.state,reason:assessment.reason,
   missing:assessment.missing,invalid:assessment.invalid,
   evidenceMetadataComplete:assessment.evidenceMetadataComplete,
   productionAuthorized:false
  }),
  blockers:Object.freeze([
   'PROD_SOURCE_SHA_NOT_ATTESTED','GATEWAY_HEALTH_AUTHENTICATED_NOT_ATTESTED',
   'OWNER_ROOT_AND_SCOPED_PROD_GRANTS_NOT_ATTESTED',
   'B2_TWO_DEVICE_REAL_TEST_NOT_ATTESTED',
   'B3_B4_LIVE_CONTROLS_NOT_ENABLED',
   'NO_EXTERNAL_PROD_AUTHORITY_GRANTED'
  ]),
  next:'EXTERNAL_READONLY_AND_INDEPENDENT_E2E_CHECKS_ONLY'
 });
}
