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
  single_order_per_run:true,
  continuous_loop:false,
  additional_cost_target_eur:0
});

export async function runPaperMarketOpenSmoke({symbol,context={company_id:'fenix-capital',engine_id:'LAB-TRD',environment:'LAB',version:'0.1.0'},file,fetchImpl=globalThis.fetch,execute=false,kill_switch=false}={}){
  if(typeof symbol!=='string'||!symbol.trim()) throw new Error('symbol required');
  const snapshot=await captureAlpacaPaperSnapshot({file,fetchImpl});
  const order={symbol:symbol.trim().toUpperCase(),side:'buy',notional_usd:ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.smoke_notional_usd,client_order_id:`cerebro-paper-smoke-${Date.now()}`};
  const result=await executeAlpacaPaperOrder({context,account:snapshot.data.account,clock:snapshot.data.clock,positions:snapshot.data.positions,order,kill_switch,execute,file,fetchImpl});
  return Object.freeze({status:result.status,mode:'ALPACA_PAPER_MARKET_OPEN_SMOKE',paper_only:true,live_endpoint_blocked:true,market_open:snapshot.data.clock?.is_open===true,symbol:order.symbol,notional_usd:order.notional_usd,execution_requested:execute===true,result});
}
