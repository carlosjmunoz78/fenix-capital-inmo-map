/**
 * NIA read-only discovery binding for CEREBRO ACTGW-001.
 * No AI sessions, credential writes, API endpoints, Workers, cron or paid fallback.
 */
export const NIA_SKILL_ID = '41a81b1a-756d-815a-b877-f0d264a6a0d4';
export const NIA_CAPABILITY = 'notion.nia.discover.read';
const NIA_TITLE = 'NIA · Uso responsable de Notion Business en CEREBRO';
const TOPICS = new Set(['documentation','knowledge','research','meeting-notes','notion-skills','notion-events']);
const FIELDS = new Set(['topic','already_handled']);

function reqFn(v,label) { if(typeof v!=='function') throw new TypeError(label+' must be a function'); return v; }
function reqStr(v,label) { if(typeof v!=='string'||!v.trim())throw new TypeError(label+' must be a non-empty string'); return v.trim(); }
function obj(v,label) { if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)throw new TypeError(label+' must be a plain object'); return v; }
const normId = value => typeof value==='string'?value.replace(/-/g,'').toLowerCase():'';
function titleOfPage(page) {
  if(typeof page?.title==='string')return page.title;
  const props=page?.properties||{};
  const title=props.title?.title||Object.values(props).find(v=>v?.type==='title')?.title;
  return Array.isArray(title)?title.map(t=>t?.plain_text||t?.text?.content||'').join(''):'';
}

/**
 * Uses an already-authorized read-only provider, supplied by the host runtime.
 * - readSkillPage(id): existing Notion API integration, page GET response.
 * - getEnabledSkills(): personal Notion MCP clients; fallback for legacy callers.
 * Page sharing does NOT prove that the server token can read it.
 */
export function bindNiaDiscoveryToActionGatewayV0({
  actionGateway,notionProvider,expectedCompanyId='fenix',capability=NIA_CAPABILITY
}={}){
  if(!actionGateway||typeof actionGateway!=='object')throw new TypeError('actionGateway required');
  if(!notionProvider||typeof notionProvider!=='object')throw new TypeError('notionProvider required');
  const register=reqFn(actionGateway.registerCapability?.bind(actionGateway),'actionGateway.registerCapability');
  const pageReader=typeof notionProvider.readSkillPage==='function'
    ? notionProvider.readSkillPage.bind(notionProvider):null;
  const enabledReader=typeof notionProvider.getEnabledSkills==='function'
    ? notionProvider.getEnabledSkills.bind(notionProvider):null;
  if(!pageReader&&!enabledReader)throw new TypeError('notionProvider requires readSkillPage or getEnabledSkills');
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

    let verified=false, mode='';
    try{
      if(pageReader){
        // Standard Notion API path for the existing service integration.
        const page=await pageReader(NIA_SKILL_ID);
        verified=!!page&&normId(page.id)===normId(NIA_SKILL_ID)
          &&titleOfPage(page)===NIA_TITLE
          &&page.archived!==true&&page.in_trash!==true;
        mode='NOTION_PAGE_READONLY';
      }else{
        // Optional personal Notion MCP client path. This is NOT an auth check
        // for another server or the user's server-side integration token.
        const response=await enabledReader();
        const skills=Array.isArray(response)?response:response?.skills;
        if(!Array.isArray(skills))throw new TypeError('invalid enabled skills response');
        verified=skills.some(s=>s&&normId(s.id)===normId(NIA_SKILL_ID)&&s.name===NIA_TITLE);
        mode='NOTION_MCP_READONLY';
      }
    }catch{
      return {status:'NIA_UNAVAILABLE',reason:'PROVIDER_READ_FAILED',executed:false};
    }
    if(!verified)return {status:'NIA_UNAVAILABLE',reason:'SKILL_PAGE_NOT_VERIFIED',executed:false};
    return {status:'NIA_DISCOVERED',provider:mode,skill_id:NIA_SKILL_ID,
      capability:name,topic,authority:'EXISTING_CEREBRO_GATEWAY',
      skill_content_loaded:false,requires_external_execution:true,ai_session_started:false,
      estimated_additional_cost_eur:0,executed:false};
  });
  return Object.freeze({status:'BOUND',gateway_engine_id:'ACTGW-001',environment:'PREPROD',
    capability:name,skill_id:NIA_SKILL_ID,mode:'READ_ONLY_METADATA',
    auto_discovery_on_relevant_requests:'CALLER_DISPATCH_REQUIRED',
    ai_execution:false,external_cost_eur:0,prod_write:false,trading:false});
}
