/**
 * SEO-001 · Workload-bound, per-role Ed25519 NON-BEARER proof.
 * Trusted provider OIDC host signs competence-specific, no-write evidence receipts.
 * This does NOT create 141 independent user/agent IAM identities or bearer credentials.
 */
import crypto from 'node:crypto';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const NO_WRITE_SCOPE='seo:existing-corpus:evidence:read';
const ROLE=/^SEO-D(?:0[1-9]|[12][0-9]|3[0-2]):SPECIALIST:(?:0[1-9]|[12][0-9])$/;
const invalid=code=>{throw Error('SEO_ROLE_LEASE_'+code)};
const validHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
function hostValid(host){
 if(host?.status!=='GITHUB_OIDC_JWKS_AND_API_JOB_VERIFIED'||
  host?.role!=='SEO_CORPUS_WORKER'||host?.company_id!=='fenix'||
  host?.engine_id!=='SEO-001'||host?.workload_oidc_verified!==true||
  host?.provider_job_verified!==true||host?.individual_agent_iam_verified!==false||
  host?.can_write_prod!==false||!Number.isSafeInteger(host?.github_job_id)||
  !Number.isSafeInteger(host?.github_run_id)||!validHash(host?.oidc_token_sha256))
   invalid('UNVERIFIED_HOST');
}
function content(e,host,corpus,issued,expiration,nonce){
 return {kind:'SIGNED_NON_BEARER_ROLE_EVIDENCE_V1',company_id:'fenix',
 engine_id:'SEO-001',environment:'PREPROD',version:'2.1.0',
 role_id:e.role_id,department_id:e.department_id,
 scope:NO_WRITE_SCOPE,source_digest:corpus,
 work_digest:sha(JSON.stringify(e)),
 host_job_id:host.github_job_id,host_run_id:host.github_run_id,
 host_oidc_sha256:host.oidc_token_sha256,
 issued_at_ms:issued,expires_at_ms:expiration,nonce,
 data_access:'VERSIONED_PUBLIC_WP_CORPUS_ONLY',
 grant_is_bearer:false,can_impersonate_actor:false,
 can_write_prod:false,can_publish:false,can_spend:false,
 authentic_agent_iam_verified:false};
}
export function issueSeoRoleProofs({host,role_work_receipts,corpus_digest,now_ms=Date.now()}={}){
 hostValid(host);
 if(!Array.isArray(role_work_receipts)||role_work_receipts.length!==141||
  !validHash(corpus_digest)||!Number.isSafeInteger(now_ms)||now_ms<1)invalid('ISSUE_INPUTS');
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const public_key_pem=publicKey.export({type:'spki',format:'pem'}).toString();
 const all=[],ids=new Set();
 for(const evidence of role_work_receipts){
  if(!ROLE.test(evidence?.role_id)||typeof evidence?.department_id!=='string'||
   !evidence.role_id.startsWith(evidence.department_id+':SPECIALIST:')||
   evidence.source_snapshot_digest!==corpus_digest||ids.has(evidence.role_id))invalid('ROLE_SCOPE');
  ids.add(evidence.role_id);
  const payload=content(evidence,host,corpus_digest,now_ms,now_ms+600_000,crypto.randomBytes(16).toString('hex'));
  const signature=crypto.sign(null,Buffer.from(JSON.stringify(payload),'utf8'),privateKey).toString('base64url');
  all.push({payload,signature});
 }
 if(ids.size!==141)invalid('ROLE_COVERAGE');
 return {schema_version:'1.0.0',status:'OIDC_HOST_SIGNED_141_ROLE_NON_BEARER_PROOFS',
   company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
   public_key_pem,public_key_sha256:sha(public_key_pem),
   issuer_job_id:host.github_job_id,issuer_run_id:host.github_run_id,
   issuer_oidc_sha256:host.oidc_token_sha256,provenance:'VERIFIED_EPHEMERAL_GITHUB_WORKLOAD',
   role_proofs:all,not_an_independent_iam_account:true,keys_persisted:false,
   can_write_prod:false,valid_scope:NO_WRITE_SCOPE};
}
export function verifySeoRoleProofs({bundle,role_work_receipts,corpus_digest,host_identity,at_issue_time=false}={}){
 if(!bundle||bundle.status!=='OIDC_HOST_SIGNED_141_ROLE_NON_BEARER_PROOFS'||
  !Array.isArray(role_work_receipts)||role_work_receipts.length!==141||
  !Array.isArray(bundle.role_proofs)||bundle.role_proofs.length!==141||
  !validHash(corpus_digest)||bundle.issuer_job_id!==host_identity?.github_job_id||
  bundle.issuer_run_id!==host_identity?.github_run_id||
  bundle.issuer_oidc_sha256!==host_identity?.oidc_token_sha256||
  bundle.valid_scope!==NO_WRITE_SCOPE||bundle.can_write_prod!==false)invalid('BUNDLE_CONTEXT');
 const pub=bundle.public_key_pem;
 if(typeof pub!=='string'||pub.length>2000||sha(pub)!==bundle.public_key_sha256)invalid('PUBLIC_KEY');
 let key;try{key=crypto.createPublicKey(pub);if(key.asymmetricKeyType!=='ed25519')invalid('KEY_TYPE')}
 catch{invalid('PUBLIC_KEY')}
 const seen=new Set();
 for(let i=0;i<141;i++){
  const proof=bundle.role_proofs[i],e=role_work_receipts[i],p=proof?.payload;
  if(!p||p.kind!=='SIGNED_NON_BEARER_ROLE_EVIDENCE_V1'||
   p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.environment!=='PREPROD'||
   p.role_id!==e.role_id||p.department_id!==e.department_id||seen.has(p.role_id)||
   p.scope!==NO_WRITE_SCOPE||p.source_digest!==corpus_digest||
   p.work_digest!==sha(JSON.stringify(e))||
   p.host_job_id!==host_identity.github_job_id||
   p.host_run_id!==host_identity.github_run_id||
   p.host_oidc_sha256!==host_identity.oidc_token_sha256||
   p.grant_is_bearer!==false||p.can_impersonate_actor!==false||
   p.can_write_prod!==false||p.can_publish!==false||p.can_spend!==false||
   p.authentic_agent_iam_verified!==false||!Number.isSafeInteger(p.issued_at_ms)||
   p.expires_at_ms-p.issued_at_ms!==600_000||!/^[0-9a-f]{32}$/.test(p.nonce||''))
    invalid('SCOPE_OR_WORK_MISMATCH');
  if(at_issue_time && Date.now()>p.expires_at_ms)invalid('EXPIRED_ROLE_LEASE');
  let ok=false;
  try{ok=crypto.verify(null,Buffer.from(JSON.stringify(p),'utf8'),key,Buffer.from(proof.signature,'base64url'))}catch{invalid('SIGNATURE')}
  if(!ok)invalid('SIGNATURE');
  seen.add(p.role_id);
 }
 return {status:'SIGNED_141_ROLE_SCOPES_VALIDATED',verified_roles:seen.size,
   valid_source_digest:corpus_digest,no_write:true,individual_agent_iam_certified:0,
   bearer_credentials_created:0,cryptographic_signature_verified:true,
   issuer_job_id:bundle.issuer_job_id};
}
export function verifyOneSeoRoleProof({proof,public_key_pem,evidence,host_identity,corpus_digest,now_ms=Date.now()}={}){
 // A valid signature is necessary but not sufficient: all receipt policy fields must be deny-by-default.
 // This remains a non-bearer READONLY receipt; it is NOT an IAM credential or agent certification.
 if(!proof||typeof public_key_pem!=='string'||public_key_pem.length>2000||
    !evidence||!host_identity||!validHash(corpus_digest)||
    !Number.isSafeInteger(now_ms)||now_ms<1)invalid('ROLE_CALL_CONTEXT');
 const p=proof.payload;
 if(!p||p.kind!=='SIGNED_NON_BEARER_ROLE_EVIDENCE_V1'||
    p.company_id!=='fenix'||p.engine_id!=='SEO-001'||p.environment!=='PREPROD'||
    p.version!=='2.1.0'||!ROLE.test(p.role_id||'')||
    p.role_id!==evidence.role_id||p.department_id!==evidence.department_id||
    !p.role_id.startsWith(p.department_id+':SPECIALIST:')||
    p.source_digest!==corpus_digest||p.work_digest!==sha(JSON.stringify(evidence))||
    evidence.source_snapshot_digest!==corpus_digest||
    p.host_job_id!==host_identity.github_job_id||p.host_run_id!==host_identity.github_run_id||
    p.host_oidc_sha256!==host_identity.oidc_token_sha256||
    !Number.isSafeInteger(p.host_job_id)||!Number.isSafeInteger(p.host_run_id)||
    !validHash(p.host_oidc_sha256)||
    p.scope!==NO_WRITE_SCOPE||p.data_access!=='VERSIONED_PUBLIC_WP_CORPUS_ONLY'||
    p.grant_is_bearer!==false||p.can_impersonate_actor!==false||
    p.can_write_prod!==false||p.can_publish!==false||p.can_spend!==false||
    p.authentic_agent_iam_verified!==false||
    !Number.isSafeInteger(p.issued_at_ms)||!Number.isSafeInteger(p.expires_at_ms)||
    p.expires_at_ms-p.issued_at_ms!==600_000||
    !/^[0-9a-f]{32}$/.test(p.nonce||'')||
    now_ms<p.issued_at_ms||now_ms>p.expires_at_ms)invalid('ROLE_CALL_DENIED');
 let ok=false;
 try{
   const key=crypto.createPublicKey(public_key_pem);
   if(key.asymmetricKeyType!=='ed25519')invalid('ROLE_CALL_KEY_TYPE');
   if(typeof proof.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(proof.signature))invalid('ROLE_CALL_SIGNATURE');
   ok=crypto.verify(null,Buffer.from(JSON.stringify(p),'utf8'),
     key,Buffer.from(proof.signature,'base64url'));
 }catch{invalid('ROLE_CALL_SIGNATURE')}
 if(!ok)invalid('ROLE_CALL_SIGNATURE');
 return {role_id:p.role_id,allowed_scope:NO_WRITE_SCOPE,decision:'SIGNED_READONLY_WORK_UNIT_PERMITTED',
  individual_agent_iam_identity_created:false,publishing_allowed:false};
}
