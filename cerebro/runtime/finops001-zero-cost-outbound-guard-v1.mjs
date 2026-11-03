import {Finops001CostLedgerV1} from './foundation-holds-v1.mjs';
const scope=x=>['company_id','engine_id','environment','version'].map(k=>{if(typeof x?.[k]!=='string'||!x[k])throw Error('FINOPS001_SCOPE_REQUIRED:'+k);return x[k];});
export function authorizeFinops001OutboundV1({ledger,context,expected_cost_eur=0,budget_eur=0,provider,resource_type}){
 if(!(ledger instanceof Finops001CostLedgerV1))throw Error('FINOPS001_LEDGER_REQUIRED');
 const [company_id,engine_id,environment,version]=scope(context);
 if(!['LAB','PREPROD'].includes(environment))return Object.freeze({authorized:false,reason:'PROD_DENIED'});
 if(/TRADING|LAB-TRD/i.test(engine_id))return Object.freeze({authorized:false,reason:'TRADING_DENIED'});
 if(typeof provider!=='string'||!provider||typeof resource_type!=='string'||!resource_type)throw Error('FINOPS001_PROVIDER_RESOURCE_REQUIRED');
 if(!Number.isFinite(expected_cost_eur)||expected_cost_eur<0||!Number.isFinite(budget_eur)||budget_eur<0)throw Error('FINOPS001_COST_INVALID');
 const used=ledger.usage({company_id,engine_id,environment,version}).cost_eur;
 const authorized=expected_cost_eur===0&&used+expected_cost_eur<=budget_eur;
 return Object.freeze({authorized,reason:authorized?'ZERO_COST_ONLY_APPROVED':'ZERO_COST_LIMIT_REACHED',company_id,engine_id,environment,version,provider,resource_type,expected_cost_eur,spent_eur:used,budget_eur,prod_authorized:false,additional_subscription_eur:0});
}
export const FINOPS001_OUTBOUND_GUARD_CONTRACT_V1=Object.freeze({pre_call_authorization:true,zero_cost_limit:true,deny_positive_spend:true,prod_authorized:false,trading_access:false,external_write:false});
