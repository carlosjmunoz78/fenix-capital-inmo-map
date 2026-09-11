import {captureAlpacaPaperSnapshot} from './alpaca-paper-snapshot.mjs';
import {executeAlpacaPaperOrder} from './alpaca-paper-order-executor.mjs';

export const ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT=Object.freeze({
  paper_only:true,
  live_endpoint_blocked:true,
  environment:['LAB','PREPROD'],
  smoke_notional_usd:1,
  requires_symbol:true,
  requires_market_open:true,
  requires_risk_gate:true,
  requires_kill_switch_clear:true,
  single_order_per_run:true,
  dry_run_default:true,
  poll_interval_seconds_min:60,
  continuous_runtime_deployed:false,
  additional_cost_target_eur:0
});

export async function runPaperMarketOpenSmoke({symbol,context={company_id:'fenix-capital',engine_id:'LAB-TRD',environment:'LAB',version:'0.1.0'},file,fetchImpl=globalThis.fetch,execute=false,kill_switch=false,client_order_id}={}){
  if(typeof symbol!=='string'||!symbol.trim()) throw new Error('symbol required');
  const snapshot=await captureAlpacaPaperSnapshot({file,fetchImpl});
  if(snapshot.data.clock?.is_open!==true){
    return Object.freeze({status:'WAITING',mode:'ALPACA_PAPER_MARKET_OPEN_SMOKE',decision:'MARKET_CLOSED_NO_ACTION',paper_only:true,live_endpoint_blocked:true,market_open:false,next_open:snapshot.data.clock?.next_open||null,execution_requested:false,execution_attempted:false});
  }
  const order={symbol:symbol.trim().toUpperCase(),side:'buy',notional_usd:ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.smoke_notional_usd,type:'market',time_in_force:'day',client_order_id:client_order_id||`cerebro-paper-smoke-${Date.now()}`};
  const result=await executeAlpacaPaperOrder({context,account:snapshot.data.account,clock:snapshot.data.clock,positions:snapshot.data.positions,order,kill_switch,execute,file,fetchImpl});
  return Object.freeze({status:result.status,mode:'ALPACA_PAPER_MARKET_OPEN_SMOKE',paper_only:true,live_endpoint_blocked:true,market_open:true,symbol:order.symbol,notional_usd:order.notional_usd,execution_requested:execute===true,result});
}

export async function waitForPaperMarketOpen({symbol,file,fetchImpl=globalThis.fetch,execute=false,kill_switch=false,poll_interval_ms=60000,max_checks=1,sleep=(ms)=>new Promise(r=>setTimeout(r,ms))}={}){
  if(!Number.isInteger(max_checks)||max_checks<1) throw new Error('max_checks must be positive integer');
  if(!Number.isFinite(poll_interval_ms)||poll_interval_ms<60000) throw new Error('poll interval must be >= 60000 ms');
  for(let check=1;check<=max_checks;check++){
    const result=await runPaperMarketOpenSmoke({symbol,file,fetchImpl,execute,kill_switch});
    if(result.status!=='WAITING') return Object.freeze({...result,checks:check});
    if(check<max_checks) await sleep(poll_interval_ms);
  }
  return Object.freeze({status:'WAITING',mode:'ALPACA_PAPER_MARKET_OPEN_WAIT',paper_only:true,live_endpoint_blocked:true,execution_attempted:false,checks:max_checks});
}
