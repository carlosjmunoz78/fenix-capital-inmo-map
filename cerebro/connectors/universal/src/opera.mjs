// FACT-001 wrapper around the ALREADY CONNECTED ChatGPT Opera tool surface.
// Never installs or replaces CEREBRO BROWSER-1. Wiring a server-side Browser-1 runner is a separate physical gate.
// The browser instance comes from an authenticated, fresh and server-owned resolver, not the model's arguments.
const BROWSER_OPERATIONS=Object.freeze({
  'opera.tabs.list': 'list_tabs',
  'opera.tabs.read': 'tab_content',
  'opera.tabs.history': 'history',
  'opera.tabs.screenshot': 'screenshot',
  'opera.tabs.navigate': 'go_to_page',
  'opera.tabs.close': 'close_tab'
});
const CREDENTIAL_FIELD=/^(password|passwd|secret|token|access_token|refresh_token|id_token|cookie|cookies|storage_state|authorization|session_bundle|browser_id|profile_id)$/i;
const isPlain=x=>x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
function noCredentialField(obj){
 if(!isPlain(obj))throw Object.assign(new Error('OPERA_INPUT_INVALID'),{code:'OPERA_INPUT_INVALID'});
 for(const [key,value] of Object.entries(obj)) {
  if(CREDENTIAL_FIELD.test(key))throw Object.assign(new Error('OPERA_SECRET_OR_BROWSER_ID_IN_MODEL_PAYLOAD'),{code:'OPERA_PAYLOAD_DENIED'});
  if(isPlain(value))noCredentialField(value);
  if(Array.isArray(value)) for(const x of value)if(isPlain(x))noCredentialField(x);
 }
}
function tabId(value) {
 if(!Number.isSafeInteger(value)||value<1)throw Object.assign(new Error('OPERA_TAB_ID_INVALID'),{code:'OPERA_TAB_ID_INVALID'});
 return value;
}
function urlAllowed(value,origins){
 if(typeof value!=='string'||value.length>3000)throw Object.assign(new Error('OPERA_URL_INVALID'),{code:'OPERA_URL_INVALID'});
 let u;try{u=new URL(value)}catch{throw Object.assign(new Error('OPERA_URL_INVALID'),{code:'OPERA_URL_INVALID'})}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||!origins.includes(u.origin))throw Object.assign(new Error('OPERA_ORIGIN_DENIED'),{code:'OPERA_ORIGIN_DENIED'});
 return u.href;
}
export class OperaGovernedProvider {
 constructor({toolkit,resolveBrowserBinding,now=()=>Date.now()}={}) {
  if(typeof resolveBrowserBinding!=='function')throw new Error('trusted browser binding resolver required');
  if(!toolkit||typeof toolkit!=='object')throw new Error('Opera toolkit required');
  this.toolkit=toolkit;this.resolveBrowserBinding=resolveBrowserBinding;this.now=now;
 }
 async perform({action,scope,identity,input={}}={}){
  noCredentialField(input);
  const method=BROWSER_OPERATIONS[action?.id];
  if(!method)throw Object.assign(new Error('OPERA_CAPABILITY_NOT_READY'),{code:'OPERA_CAPABILITY_NOT_READY'});
  if(typeof this.toolkit[method]!=='function')throw Object.assign(new Error('OPERA_PHYSICAL_TOOL_NOT_CONNECTED'),{code:'OPERA_PHYSICAL_TOOL_NOT_CONNECTED'});
  const binding=await this.resolveBrowserBinding({scope,identity,capability:action.id});
  if(!isPlain(binding)||typeof binding.browser_id!=='string'||!binding.browser_id ||
    binding.company_id!==scope.company_id||binding.environment!==scope.environment||
    binding.client_id!==identity.client_id||binding.identity_ref!==identity.identity_ref||
    binding.attested!==true || !Number.isFinite(Date.parse(binding.expires_at)) || Date.parse(binding.expires_at)<=this.now() ||
    !Array.isArray(binding.allowed_origins)){
   throw Object.assign(new Error('OPERA_BROWSER_BINDING_DENIED'),{code:'OPERA_BROWSER_BINDING_DENIED'});
  }
  const opts={browser_id:binding.browser_id};
  if(['opera.tabs.read','opera.tabs.screenshot','opera.tabs.close'].includes(action.id)) opts.tabId=tabId(input.tab_id);
  if(action.id==='opera.tabs.navigate'){
   opts.url=urlAllowed(input.url,binding.allowed_origins);
   if(input.tab_id!==undefined)opts.tabId=tabId(input.tab_id);
  }
  if(action.id==='opera.tabs.history'){
   for(const key of ['startDaysAgo','endDaysAgo'])if(input[key]!==undefined){
    if(!Number.isSafeInteger(input[key])||input[key]<0||input[key]>30)throw Object.assign(new Error('OPERA_HISTORY_SCOPE_DENIED'),{code:'OPERA_HISTORY_SCOPE_DENIED'});
    opts[key]=input[key];
   }
  }
  // Read/navigation results are supplied to the caller, but raw page contents must NEVER enter the audit sink.
  const result=await this.toolkit[method](opts);
  return {status:'COMPLETED',capability:action.id,data:result};
 }
}