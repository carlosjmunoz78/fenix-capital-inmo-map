import fs from 'node:fs';
import {evaluateAlpacaPaperOrder} from './alpaca-paper-risk-gate.mjs';

const PAPER_BASE='https://paper-api.alpaca.markets';
const LIVE_BASE='https://api.alpaca.markets';

export const ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT=Object.freeze({
  environment:['LAB','PREPROD'],
  paper_only:true,
  paper_base_url:PAPER_BASE,
  live_endpoint_blocked:true,
  live_base_url:LIVE_BASE,
  additional_cost_target_eur:0,
  requires_risk_gate:true,
  requires_market_open:true,
  requires_kill_switch_clear:true,
  default_execution:false,
  allowed_order_types:['market'],
  allowed_time_in_force:['day'],
  shorting_allowed:false,
  audit_required:true
});

function parseEnvFile(file){
  const st=fs.statSync(file);
  if((st.mode&0o077)!==0) throw new Error('secret file permissions must be 600');
  const raw=fs.readFileSync(file,'utf8');
  const out={};
  for(const line of raw.split(/\r?\n/)){
    if(!line||line.trim().startsWith('#')) continue;
    const i=line.indexOf('='); if(i<1) continue;
    out[line.slice(0,i).trim()]=line.slice(i+1).trim();
  }
  if(out.ALPACA_PAPER_BASE_URL!==PAPER_BASE) throw new Error('Paper endpoint required');
  if(!out.ALPACA_PAPER_API_KEY||!out.ALPACA_PAPER_API_SECRET) throw new Error('missing Paper credentials');
  return out;
}

function sanitizeOrderResponse(x={}){
  return Object.freeze({
    id: typeof x.id==='string'?x.id:null,
    client_order_id: typeof x.client_order_id==='string'?x.client_order_id:null,
    symbol: typeof x.symbol==='string'?x.symbol:null,
    side: typeof x.side==='string'?x.side:null,
    type: typeof x.type==='string'?x.type:null,
    time_in_force: typeof x.time_in_force==='string'?x.time_in_force:null,
    status: typeof x.status==='string'?x.status:null,
    notional: x.notional==null?null:String(x.notional),
    qty: x.qty==null?null:String(x.qty),
    submitted_at: typeof x.submitted_at==='string'?x.submitted_at:null
  });
}

export async function executeAlpacaPaperOrder({
  context,
  account,
  clock,
  positions=[],
  order,
  kill_switch=false,
  execute=false,
  file=`${process.env.HOME}/.config/cerebro/secrets/alpaca-paper.env`,
  fetchImpl=globalThis.fetch
}={}){
  const decision=evaluateAlpacaPaperOrder({context,account,clock,positions,order,kill_switch,base_url:PAPER_BASE});
  if(decision.status!=='GREEN') return Object.freeze({...decision,execution_attempted:false});
  if(execute!==true) return Object.freeze({...decision,status:'GREEN',decision:'PAPER_ORDER_READY',execution_authorized:false,execution_attempted:false});
  if(order.type&&order.type!=='market') throw new Error('only market orders allowed');
  if(order.time_in_force&&order.time_in_force!=='day') throw new Error('only day time_in_force allowed');

  const env=parseEnvFile(file);
  const payload={
    symbol:order.symbol.trim().toUpperCase(),
    side:order.side,
    type:'market',
    time_in_force:'day',
    notional:String(order.notional_usd),
    client_order_id:String(order.client_order_id||`cerebro-paper-${Date.now()}`)
  };

  const res=await fetchImpl(`${PAPER_BASE}/v2/orders`,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'APCA-API-KEY-ID':env.ALPACA_PAPER_API_KEY,
      'APCA-API-SECRET-KEY':env.ALPACA_PAPER_API_SECRET
    },
    body:JSON.stringify(payload)
  });
  const body=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(`Alpaca Paper HTTP ${res.status}`);
  return Object.freeze({
    status:'GREEN',
    decision:'PAPER_ORDER_SUBMITTED',
    paper_only:true,
    live_endpoint_blocked:true,
    execution_authorized:true,
    execution_attempted:true,
    audit_required:true,
    order:sanitizeOrderResponse(body),
    credential_payload_logged:false
  });
}
