const REQUIRED_CONTEXT = ['company_id','engine_id','environment','version'];
const HUMAN_REQUIRED = new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function nonEmpty(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function contextOf(input){const c=input?.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');for(const k of REQUIRED_CONTEXT)nonEmpty(c[k],`context.${k}`);if(c.engine_id!=='SCAN-001')throw new Error('engine_id must be SCAN-001');if(c.environment!=='SCAFFOLD')throw new Error('environment must be SCAFFOLD');return structuredClone(c);}
function human(reason,ctx){if(!HUMAN_REQUIRED.has(reason))throw new Error('invalid HUMAN_REQUIRED');return Object.freeze({status:'HUMAN_REQUIRED',reason,context:ctx,executed:false});}

export function planDigitalFootprintScan(input){
  const ctx=contextOf(input);
  const domain=nonEmpty(input?.domain,'domain').toLowerCase();
  if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw new Error('invalid domain');
  if(input?.authorized!==true)return human('POLICY_CONFLICT',ctx);
  if(input?.requires_prod_write===true)return human('HIGH_RISK',ctx);
  const cost=Number(input?.estimated_additional_cost_eur??0);if(!Number.isFinite(cost)||cost<0)throw new Error('invalid cost');if(cost>0)return human('MONEY_LIMIT',ctx);
  const surfaces=['website','dns_metadata','robots_sitemap','search_presence','social_links','local_presence','technology_hints'];
  return Object.freeze({status:'PLAN_READY',engine_id:'SCAN-001',context:ctx,domain,surfaces,mode:'READ_ONLY_PUBLIC_DISCOVERY',executed:false,prod_writes:false,trading_access:false,additional_cost_target_eur:0});
}
