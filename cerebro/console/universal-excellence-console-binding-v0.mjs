/** Additive Console V0 bridge to ACTGW-001 owner's verified-proposal-only LAB capability.
 * Console session ids are NOT IAM proof. A separate trusted identity verifier remains mandatory.
 * No actual rewards, API secrets, PROD permissions or autonomous promotion.
 */
const COMMAND='governance.excellence.owner-proposal.v0';
export function bindUniversalExcellenceConsoleLab({consoleGateway,ownerBinding}={}){
 if(!consoleGateway||typeof consoleGateway.registerCommand!=='function'||
    consoleGateway.environment!=='PREPROD')throw Error('EXCELLENCE_CONSOLE_PREPROD_REQUIRED');
 if(!ownerBinding||typeof ownerBinding.request!=='function'||
    ownerBinding.iam_connected_in_production!==false)throw Error('EXCELLENCE_OWNER_AUTH_BINDING_REQUIRED');
 consoleGateway.registerCommand(COMMAND,async ({context,payload})=>{
  if(context.environment!=='PREPROD'||typeof context.company_id!=='string')
   return {status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',
    detail:'EXCELLENCE_CONSOLE_CONTEXT_DENIED',executed:false};
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
   return {status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',
    detail:'EXCELLENCE_CONSOLE_REQUEST_INVALID',executed:false};
  // The current Console V0 has no authenticated principal field; NEVER trust 'authorized' or 'owner' flags.
  return ownerBinding.request({
   session_ref:payload.session_ref,
   company_id:context.company_id,
   request_type:payload.request_type,
   capability_requested:payload.capability_requested??null,
   request_id:payload.request_id
  });
 });
 return Object.freeze({status:'LAB_COMMAND_BOUND_NOT_PROD',
  command:COMMAND,console_environment:'PREPROD',
  requires_server_verified_owner_identity:true,
  input_owner_flags_authoritative:false,actual_privileges_granted:false,
  external_writes:0});
}
