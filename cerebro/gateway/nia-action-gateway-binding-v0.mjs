/**
 * NIA metadata-only resolver for existing CEREBRO ACTGW-001 (PREPROD).
 * No AI sessions, credentials, API endpoint, cron, worker or paid fallback.
 */
export const NIA_SKILL_ID = '41a81b1a-756d-815a-b877-f0d264a6a0d4';
export const NIA_CAPABILITY = 'notion.nia.discover.read';
const TOPICS = new Set(['documentation','knowledge','research','meeting-notes','notion-skills','notion-events']);
const FIELDS = new Set(['topic','already_handled']);
function reqFn(v,label){if(typeof v!=='function') throw new TypeError(label+' must be a function');return v;}
function reqStr(v,label){if(typeof v!=='string'||!v.trim())throw new TypeError(label+' must be a non-empty string');return v.trim();}
function obj(v,label){if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)throw new TypeError(label+' must be a plain object');return v;}
/**
 * Adapter is dependency-injected; it must be an already-authorized read-only
 * Notion MCP client implementing getEnabledSkills(): {skills:[{id,name}]}.
 * The dispatch owner must still invoke this capability on eligible requests.
 */
export function bindNiaDiscoveryToActionGatewayV0({
  actionGateway,notionProvider,expectedCompanyId='fenix',capability=NIA_CAPABILITY
}={}){
  if(!actionGateway||typeof actionGateway!=='object')throw new TypeError('actionGateway required');
  if(!notionProvider||typeof notionProvider!=='object')throw new TypeError('notionProvider required');
  const register=reqFn(actionGateway.registerCapability?.bind(actionGateway),'actionGateway.registerCapability');
  const getEnabledSkills=reqFn(notionProvider.getEnabledSkills?.bind(notionProvider),'notionProvider.getEnabledSkills');
  const company=reqStr(expectedCompanyId,'expectedCompanyId');
  const name=reqStr(capability,'capability');
  if(name!==NIA_CAPABILITY)throw new Error('NIA_CAPABILITY_NAME_FIXED');
  register(name,async({context,payload})=>{
    obj(context,'context');obj(payload,'payload');
    if(context.company_id!==company||context.engine_id!=='ACTGW-001'||context.environment!=='PREPROD')
      return {status:'NIA_DENIED',reason:'TENANT_OR_ENVIRONMENT_MISMATCH',executed:false};
    if(Object.keys(payload).some(k=>!FIELDS.has(k)))
      return {status:'NIA_DENIED',reason:'PAYLOAD_FIELDS_FORBIDDEN',executed:false};
    if(payload.already_handled!==undefined&&typeof payload.already_handled!=='boolean')
      return {status:'NIA_DENIED',reason:'INVALID_ALREADY_HANDLED',executed:false};
    const topic=typeof payload.topic==='string'?payload.topic.trim().toLowerCase():'';
    if(payload.already_handled===true||!TOPICS.has(topic))
      return {status:'NOOP',reason:payload.already_handled===true?'OWNED_BY_EXISTING_ENGINE':'OUT_OF_SCOPE',executed:false};
    let list;
    try{
      const result=await getEnabledSkills();
      list=Array.isArray(result)?result:result?.skills;
      if(!Array.isArray(list))throw new TypeError('invalid enabled skill list');
    }catch{
      return {status:'NIA_UNAVAILABLE',reason:'PROVIDER_READ_FAILED',executed:false};
    }
    const skill=list.find(s=>s&&typeof s==='object'&&s.id===NIA_SKILL_ID);
    if(!skill)return {status:'NIA_UNAVAILABLE',reason:'SKILL_NOT_ENABLED_OR_INACCESSIBLE',executed:false};
    if(skill.name!=='NIA · Uso responsable de Notion Business en CEREBRO')
      return {status:'NIA_UNAVAILABLE',reason:'SKILL_IDENTITY_MISMATCH',executed:false};
    return {status:'NIA_DISCOVERED',provider:'NOTION_MCP_READONLY',skill_id:NIA_SKILL_ID,
      capability:name,topic,authority:'EXISTING_CEREBRO_GATEWAY',
      requires_external_execution:true,ai_session_started:false,
      estimated_additional_cost_eur:0,executed:false};
  });
  return Object.freeze({status:'BOUND',gateway_engine_id:'ACTGW-001',environment:'PREPROD',
    capability:name,skill_id:NIA_SKILL_ID,mode:'READ_ONLY_METADATA',
    auto_discovery_on_relevant_requests:'CALLER_DISPATCH_REQUIRED',
    ai_execution:false,external_cost_eur:0,prod_write:false,trading:false});
}
