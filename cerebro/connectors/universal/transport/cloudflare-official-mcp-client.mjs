// FACT-001 · Official Cloudflare MCP backend transport. Additive; read-only protocol bootstrap.
// The Cloudflare token is injected by a TRUSTED server-side token provider, never by the model.
const ENDPOINT='https://mcp.cloudflare.com/mcp';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const PROTOCOL='2025-06-18';
const ALLOWED_TOOLS=new Set(['search','execute','docs']);
const clean=(s)=>typeof s==='string'&&s.length>0&&s.length<160;
function limitedResponseText(text,max=262144){if(typeof text!=='string'||text.length>max)throw Error('MCP_RESPONSE_TOO_LARGE');return text;}
function decodeMcpResponse(body,ct){
 const raw=limitedResponseText(body);
 if(ct.includes('text/event-stream')){
  const eventData=raw.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim());
  for(const data of eventData){if(data==='[DONE]')continue;try{const msg=JSON.parse(data);if(msg && typeof msg==='object' && (msg.result||msg.error))return msg;}catch{continue;}}
  throw Error('MCP_SSE_MISSING_JSONRPC');
 }
 try{return JSON.parse(raw);}catch{throw Error('MCP_JSON_INVALID');}
}
export class CloudflareOfficialMcpClient {
 #tokenProvider;#fetch;#seq=0;#endpoint;
 constructor({tokenProvider,http=fetch,endpoint=ENDPOINT}={}) {
  if(endpoint!==ENDPOINT)throw Error('OFFICIAL_ENDPOINT_REQUIRED');
  if(typeof tokenProvider!=='function'||typeof http!=='function')throw Error('TRUSTED_BACKEND_REQUIRED');
  this.#tokenProvider=tokenProvider;this.#fetch=http;this.#endpoint=endpoint;
 }
 async #send(method,params,scope,{notification=false}={}) {
  if(!scope||scope.account_id!==ACCOUNT||scope.client_id!=='cerebro'||scope.environment!=='LAB') throw Error('SCOPE_DENIED');
  if(!['initialize','notifications/initialized','tools/list'].includes(method))throw Error('MCP_METHOD_DENIED');
  const token=await this.#tokenProvider({account_id:ACCOUNT,client_id:'cerebro',environment:'LAB',purpose:'mcp_readonly_handshake'});
  if(!clean(token))throw Error('TOKEN_NOT_AVAILABLE');
  const payload={jsonrpc:'2.0',method,...(notification?{}:{id:++this.#seq}),...(params?{params}:{})};
  let response;
  try{response=await this.#fetch(this.#endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':PROTOCOL},body:JSON.stringify(payload)});}
  catch{throw Error('MCP_NETWORK_OR_REDIRECT_ERROR');}
  if(notification && response.status===202)return {result:{accepted:true}};
  if(!response.ok)throw Error(`MCP_HTTP_${response.status}`);
  const ct=(response.headers?.get?.('content-type')||'').toLowerCase();
  const data=decodeMcpResponse(await response.text(),ct);
  if(data?.error)throw Error('MCP_PROTOCOL_ERROR');
  if(!notification && data?.id!==payload.id)throw Error('MCP_RESPONSE_ID_MISMATCH');
  return data;
 }
 async verifyReadOnly(scope){
  const init=await this.#send('initialize',{protocolVersion:PROTOCOL,capabilities:{},clientInfo:{name:'cerebro-fact001-readonly',version:'0.1.0'}},scope);
  if(typeof init.result?.protocolVersion!=='string'||!init.result?.serverInfo?.name)throw Error('MCP_INIT_INVALID');
  await this.#send('notifications/initialized',null,scope,{notification:true});
  const list=await this.#send('tools/list',{},scope);
  if(!Array.isArray(list.result?.tools)||!list.result.tools.every(t=>clean(t.name)))throw Error('MCP_TOOLS_INVALID');
  const names=list.result.tools.map(t=>t.name);
  // Do not run execute(), even if listed: it can invoke mutating Cloudflare APIs.
  return Object.freeze({status:'READ_ONLY_MCP_VERIFIED',account_id:ACCOUNT,client_id:'cerebro',endpoint_host:'mcp.cloudflare.com',protocol_version:init.result.protocolVersion,available_known_tools:names.filter(x=>ALLOWED_TOOLS.has(x)),tool_count:names.length,methods_executed:['initialize','notifications/initialized','tools/list'],mutations:0});
 }
}

export function bindCloudflareOfficialReadOnlyToGateway({actionGateway,client,resolvePrincipal}={}) {
 if(typeof actionGateway?.registerCapability!=='function'||typeof client?.verifyReadOnly!=='function'||typeof resolvePrincipal!=='function')throw Error('GATEWAY_DEPENDENCIES_REQUIRED');
 actionGateway.registerCapability('cloudflare.official.mcp.probe',async({context,payload})=>{
  if(context?.environment!=='PREPROD'||context?.engine_id!=='ACTGW-001'||!context?.company_id)throw Error('GATEWAY_SCOPE_DENIED');
  if(payload===null||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==0)throw Error('EMPTY_PROBE_PAYLOAD_REQUIRED');
  const who=await resolvePrincipal(context);
  if(who?.client_id!=='cerebro'||who?.account_id!==ACCOUNT||who?.approved_lab_probe!==true)throw Error('GATEWAY_IDENTITY_DENIED');
  const result=await client.verifyReadOnly({account_id:ACCOUNT,client_id:'cerebro',environment:'LAB'});
  return {status:'COMPLETED',verified_endpoint:result.endpoint_host,tool_count:result.tool_count,mutations:0};
 });
 return Object.freeze({status:'REGISTERED_LAB_READONLY',capability:'cloudflare.official.mcp.probe',production_deployed:false,cost_additional_eur:0});
}