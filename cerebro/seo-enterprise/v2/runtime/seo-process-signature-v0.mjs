/** Process-local ED25519 evidence chain. Public proof only; ephemeral private key never persisted.
 * Self-signed PROCESS provenance, not external IAM/PKI or legal signature.
 */
import {generateKeyPairSync,sign,verify,createPublicKey,createHash} from 'node:crypto';
const hex=x=>createHash('sha256').update(x).digest('hex');
const BINDINGS=new Map([['SEO_D15_WORKER','SUBAGENT'],['SEO_D31_QA','QA_AGENT'],['SEO_JUDGE_A','JUDGE']]);
const maxsize=180000;
export function sealProcessReceipt({receipt,role_id}){
 if(!BINDINGS.has(role_id))throw Error('UNREGISTERED_PROCESS_ROLE');
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||receipt.process_proof)throw Error('RECEIPT_FORMAT_INVALID');
 if(role_id!==receipt.worker_role_id&&role_id!==receipt.role_id&&role_id!==receipt.judge_role_id)throw Error('PROCESS_ROLE_MISMATCH');
 const canonical=JSON.stringify(receipt);
 if(canonical.length>maxsize)throw Error('RECEIPT_TOO_LARGE');
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const public_spki_pem=publicKey.export({type:'spki',format:'pem'});
 const payload={schema:'SEO_V2_PROCESS_SIGNATURE_V0',role_id,role_class:BINDINGS.get(role_id),
  pid:process.pid,record_digest:hex(canonical),public_spki_pem,
  external_iam_attested:false,root_of_trust:'SELF_GENERATED_EPHEMERAL_PROCESS_KEY'};
 const signature=sign(null,Buffer.from(JSON.stringify(payload)),privateKey).toString('base64');
 return {...receipt,process_proof:{payload,signature_base64:signature}};
}
export function verifyProcessReceipt({receipt,expected_role}){
 if(!BINDINGS.has(expected_role))throw Error('UNREGISTERED_PROCESS_ROLE');
 const proof=receipt?.process_proof;
 if(!proof||!proof.payload||typeof proof.signature_base64!=='string')throw Error('PROCESS_SIGNATURE_REQUIRED');
 const p=proof.payload;
 if(p.schema!=='SEO_V2_PROCESS_SIGNATURE_V0'||p.role_id!==expected_role||
  p.role_class!==BINDINGS.get(expected_role)||p.external_iam_attested!==false||
  p.root_of_trust!=='SELF_GENERATED_EPHEMERAL_PROCESS_KEY')throw Error('PROCESS_ROLE_UNTRUSTED');
 if(!Number.isSafeInteger(p.pid)||p.pid<=0||p.pid!==(expected_role==='SEO_D15_WORKER'?receipt.worker_process_pid:expected_role==='SEO_D31_QA'?receipt.reviewer_process_pid:receipt.judge_process_pid))
  throw Error('PROCESS_PID_MISMATCH');
 const unsigned={...receipt};delete unsigned.process_proof;
 if(hex(JSON.stringify(unsigned))!==p.record_digest)throw Error('PROCESS_RECEIPT_TAMPERED');
 try{
  const key=createPublicKey({key:p.public_spki_pem,format:'pem'});
  if(key.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(JSON.stringify(p)),key,Buffer.from(proof.signature_base64,'base64')))
   throw Error('INVALID');
 }catch{throw Error('PROCESS_SIGNATURE_INVALID')}
 return {valid:true,role_id:expected_role,pid:p.pid,record_digest:p.record_digest,
  external_iam_attested:false,external_pki_verified:false,
  same_host_trust_boundary:true};
}
