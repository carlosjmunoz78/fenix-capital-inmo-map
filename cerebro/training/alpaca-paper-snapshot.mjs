import {readAlpacaPaper} from './alpaca-paper-readonly.mjs';

export async function captureAlpacaPaperSnapshot({file,fetchImpl=globalThis.fetch,now=()=>new Date().toISOString()}={}){
  const resources=['account','positions','clock','orders'];
  const out={};
  for(const resource of resources){
    const r=await readAlpacaPaper(resource,{file,fetchImpl});
    if(r.status!=='GREEN'||r.paper_only!==true||r.method!=='GET'||r.order_mutation_forbidden!==true)throw new Error(`unsafe ${resource} snapshot result`);
    out[resource]=r.data;
  }
  return Object.freeze({status:'GREEN',mode:'ALPACA_PAPER_SNAPSHOT',paper_only:true,read_only:true,live_endpoint_blocked:true,order_mutation_forbidden:true,captured_at:String(now()),resources:Object.freeze(resources.slice()),data:Object.freeze(out)});
}

export const ALPACA_PAPER_SNAPSHOT_CONTRACT=Object.freeze({environment:['LAB','PREPROD'],paper_only:true,read_only:true,resources:['account','positions','clock','orders'],live_endpoint_blocked:true,order_mutation_forbidden:true,external_writes:false,additional_cost_target_eur:0});
