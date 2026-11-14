/** LAB-only owner authority adapter for existing ACTGW-001. Never authorizes actual API/prod grants.
 * Owner principal MUST be resolved by a trusted server-side identity provider, not by caller payload.
 * This is a safe integration contract, not proof that real owner IAM is connected.
 */
import {randomUUID,createHash} from 'node:crypto';
import {routeDirective,candidatePrivilege,replacementGate} from '../governance/universal-excellence-lab-v0.mjs';

const CAPABILITY='cerebro.universal-excellence.owner-proposal.v0';
const TYPES=new Set(['STRATEGY','REWARD_PRIVILEGE','SUSPENSION_OVERRIDE','REPLACEMENT','API_ACCESS']);
const REWARDS=new Set(['EXPANDED_AUTONOMY_WITHIN_APPROVED_SCOPE','HIGHER_JOB_PRIORITY_LIMIT',
 'EXTRA_EXISTING_API_ACCESS','NEW_COMPETENCY_OR_SUPERVISOR_CANDIDACY']);
const fixedContext=(company_id)=>({company_id,engine_id:'ACTGW-001',environment:'PREPROD',version:'0.1.0'});
const valid=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{2,90}$/.test(s);
const hash=x=>createHash('sha256').update(x).digest('hex');
const forbidden=c=>({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',
 detail:c,executed:false,prod_authorized:false,owner_verified:false,external_writes:0});
const grantDenied=(request_type)=>({status:'EXCELLENCE_OWNER_PROPOSAL_NOT_GRANTED',
 request_type,api_token_issued:false,permissions_changed:false,award_applied:false,
 replacement_executed:false,prod_authorized:false,external_writes:0,additional_eur:0});
export function installUniversalOwnerGatewayLab({actionGateway,verifyTrustedOwnerSession}={}){
 if(typeof actionGateway?.registerCapability!=='function'||typeof actionGateway?.execute!=='function')
  throw Error('OWNER_GATEWAY_REQUIRED');
 if(actionGateway.contract()?.environment!=='PREPROD')throw Error('OWNER_PREPROD_ONLY');
 if(typeof verifyTrustedOwnerSession!=='function')throw Error('TRUSTED_OWNER_VERIFIER_REQUIRED');
 const pending=new Map();
 actionGateway.registerCapability(CAPABILITY,async ({context,payload})=>{
  const ticket=pending.get(payload.ticket);
  if(!ticket||ticket.used||context.company_id!==ticket.company_id||
   context.environment!=='PREPROD'||context.engine_id!=='ACTGW-001'||payload.request_digest!==ticket.request_digest)
   return forbidden('UNTRUSTED_GATEWAY_DIRECT_CALL');
  ticket.used=true;pending.delete(payload.ticket);
  // Authentication happened server-side before minting this one-time internal ticket.
  if(!ticket.owner_identity_verified)return forbidden('OWNER_IDENTITY_UNVERIFIED');
  const decision=routeDirective({source:'OWNER_IAM',request_type:ticket.request_type,
   owner_proof:{trusted:true},verifyOwner:x=>x.trusted===true});
  if(decision.decision!=='OWNER_COMMAND_ACCEPTED_FOR_POLICY_GATE_ONLY')
   return forbidden('OWNER_POLICY_BLOCKED');
  const base=grantDenied(ticket.request_type);
  return {status:'OWNER_DIRECTIVE_FOR_POLICY_REVIEW_LAB',request_type:ticket.request_type,
   owner_authority_verified_by_trusted_bootstrap:true,policy_decision:decision.decision,
   capability_requested:ticket.capability_requested||null,
   stage:'PROPOSAL_ONLY_NOT_EXECUTED',...base, status:'OWNER_DIRECTIVE_FOR_POLICY_REVIEW_LAB',
   binding_scope:'PREPROD_LAB_ONLY'};
 });
 return Object.freeze({
  capability:CAPABILITY,environment:'PREPROD',iam_connected_in_production:false,
  async request({session_ref,company_id='fenix',request_type,capability_requested=null,
   request_id}={}){
   if(!valid(company_id)||!valid(request_id)||!TYPES.has(request_type))
    return forbidden('REQUEST_CONTEXT_INVALID');
   if(typeof session_ref!=='string'||session_ref.length<12)
    return forbidden('AUTHENTICATED_SESSION_REQUIRED');
   if(capability_requested!==null&&!REWARDS.has(capability_requested))
    return forbidden('REWARD_SCOPE_INVALID');
   if(capability_requested!==null&&request_type!=='REWARD_PRIVILEGE'&&request_type!=='API_ACCESS')
    return forbidden('REWARD_REQUEST_TYPE_MISMATCH');
   let trusted=null;
   try{trusted=await verifyTrustedOwnerSession({session_ref,company_id,required_role:'OWNER'});}
   catch{return forbidden('OWNER_IAM_UNAVAILABLE')}
   if(trusted?.verified!==true||trusted.company_id!==company_id||trusted.role!=='OWNER'||
      trusted.session_active!==true||trusted.assurance!=='SERVER_VERIFIED')
    return forbidden('OWNER_IDENTITY_UNVERIFIED');
   const ticket=randomUUID();
   const request_digest=hash(JSON.stringify([company_id,request_id,request_type,capability_requested]));
   pending.set(ticket,{company_id,request_type,capability_requested,request_digest,
    owner_identity_verified:true,used:false});
   try{
    return await actionGateway.execute({context:fixedContext(company_id),authorized:true,
      capability:CAPABILITY,idempotency_key:'excellence-owner-'+request_id,
      payload:{ticket,request_digest},risk:'LOW',
      trading_access:false,requires_prod_write:false,signature_required:false,
      estimated_additional_cost_eur:0});
   }finally{pending.delete(ticket)}
  },
  limits:Object.freeze({actual_iam_binding_unverified:true,no_secrets_saved:true,
   no_permissions_granted:true,no_prod_writes:true,no_paid_spend:true})
 });
}
