import { blocked } from './core.mjs';
// Trusted identity MUST originate outside tool input (OAuth / service-to-service gateway), never from LLM arguments.
export function makeChatGPTAdapter({core,authenticate}) {
 if(typeof authenticate!=='function')throw new Error('OAuth/MCP identity verifier required');
 return {
  listTools(){return core.capabilities().filter(c=>c.status==='IMPLEMENTED_LAB').map(c=>({name:c.id,description:`CEREBRO universal connector ${c.id}; ${c.permission}; requires explicit scoped authorization`,inputSchema:{type:'object',properties:{company_id:{type:'string'},engine_id:{type:'string'},environment:{type:'string'},version:{type:'string'},idempotency_key:{type:'string'},input:{type:'object'}},required:['company_id','engine_id','environment','version']}}));},
  async callTool({name,arguments:args={}},authContext){
   const principal=await authenticate(authContext);
   if(!principal)return blocked('POLICY_CONFLICT','ChatGPT OAuth session not verified');
   return core.execute({trustedPrincipal:{...principal,client_id:'chatgpt'},context:{company_id:args.company_id,engine_id:args.engine_id,environment:args.environment,version:args.version},capability:name,input:args.input??{},idempotency_key:args.idempotency_key});
  }
 };
}
export function makeCerebroAdapter({core,authenticate}) {
 if(typeof authenticate!=='function')throw new Error('CEREBRO Gateway verifier required');
 return {
  async execute(command,gatewayContext){
   const principal=await authenticate(gatewayContext);
   if(!principal)return blocked('POLICY_CONFLICT','CEREBRO Gateway identity not verified');
   return core.execute({trustedPrincipal:{...principal,client_id:'cerebro'},context:command.context,capability:command.capability,input:command.input??{},idempotency_key:command.idempotency_key});
  }
 };
}