import crypto from 'node:crypto';
export const CTX001_CONTRACT_V1=Object.freeze({engine_id:'CTX-001',name:'Context Loader',layer:'L9',version:'1.0.0',environment:'LAB_PREPROD',company_scope:'MULTI_COMPANY',required:['company_id','engine_id','permissions'],optional:['context_type','context_id','history'],max_history_items:20,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clean=s=>typeof s==='string'&&s.trim()?s.trim():null;
export class Ctx001ContextLoaderV1{
  load({session,context_type=null,context_id=null,permissions=[]}){
    if(!session?.context?.company_id||!session?.context?.engine_id)throw new Error('CTX001_INVALID_SESSION');
    if(session.context.environment!=='PREPROD')throw new Error('CTX001_PREPROD_ONLY');
    if(!Array.isArray(permissions))throw new Error('CTX001_INVALID_PERMISSIONS');
    const history=Array.isArray(session.history)?session.history.slice(-CTX001_CONTRACT_V1.max_history_items).map((h,i)=>({index:i,kind:String(h?.kind||'UNKNOWN'),engine_id:h?.context?.engine_id||null})):[];
    const pkg={schema_version:'1.0.0',engine_id:'CTX-001',company_id:session.context.company_id,target_engine_id:session.context.engine_id,environment:'PREPROD',version:'1.0.0',context_type:clean(context_type),context_id:clean(context_id),permissions:[...new Set(permissions.map(String))].sort(),history,history_count:history.length,source:'CEREBRO_GATEWAY_SESSION',read_only:true};
    return {...pkg,correlation_id:`ctx-${hash(pkg).slice(0,24)}`};
  }
}
