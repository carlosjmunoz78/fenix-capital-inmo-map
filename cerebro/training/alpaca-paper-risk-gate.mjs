const PAPER_BASE='https://paper-api.alpaca.markets';

export const ALPACA_PAPER_RISK_CONTRACT=Object.freeze({
  environment:['LAB','PREPROD'],
  paper_only:true,
  live_endpoint_blocked:true,
  additional_cost_target_eur:0,
  max_order_notional_usd:100,
  max_total_exposure_usd:1000,
  shorting_allowed:false,
  requires_market_open:true,
  requires_active_account:true,
  requires_unblocked_account:true,
  requires_kill_switch_clear:true
});

function fail(reason,detail){return Object.freeze({status:'HUMAN_REQUIRED',reason,detail,paper_only:true,live_endpoint_blocked:true});}

export function evaluateAlpacaPaperOrder({context,account,clock,positions=[],order,kill_switch=false,base_url=PAPER_BASE}={}){
  if(!context||!['LAB','PREPROD'].includes(context.environment)) return fail('HIGH_RISK','environment_not_allowed');
  if(base_url!==PAPER_BASE) return fail('POLICY_CONFLICT','live_endpoint_forbidden');
  if(kill_switch===true) return fail('SECURITY_INCIDENT','kill_switch_active');
  if(!account||account.status!=='ACTIVE'||account.trading_blocked===true||account.account_blocked===true) return fail('HIGH_RISK','account_not_tradeable');
  if(!clock||clock.is_open!==true) return fail('HIGH_RISK','market_closed');
  if(!order||typeof order.symbol!=='string'||!order.symbol.trim()) return fail('POLICY_CONFLICT','invalid_symbol');
  if(order.side!=='buy'&&order.side!=='sell') return fail('POLICY_CONFLICT','invalid_side');
  if(order.side==='sell'){
    const held=positions.find(p=>p.symbol===order.symbol);
    const heldQty=Number(held?.qty||0), qty=Number(order.qty||0);
    if(!Number.isFinite(qty)||qty<=0||qty>heldQty) return fail('HIGH_RISK','shorting_forbidden');
  }
  const notional=Number(order.notional_usd);
  if(!Number.isFinite(notional)||notional<=0) return fail('POLICY_CONFLICT','invalid_notional');
  if(notional>ALPACA_PAPER_RISK_CONTRACT.max_order_notional_usd) return fail('MONEY_LIMIT','order_notional_limit');
  const exposure=positions.reduce((sum,p)=>sum+Math.abs(Number(p.market_value||0)||0),0);
  if(exposure+notional>ALPACA_PAPER_RISK_CONTRACT.max_total_exposure_usd) return fail('HIGH_RISK','exposure_limit');
  return Object.freeze({status:'GREEN',decision:'ALLOW_PAPER_ORDER_PLAN',paper_only:true,live_endpoint_blocked:true,symbol:order.symbol,side:order.side,notional_usd:notional,max_order_notional_usd:ALPACA_PAPER_RISK_CONTRACT.max_order_notional_usd,max_total_exposure_usd:ALPACA_PAPER_RISK_CONTRACT.max_total_exposure_usd,execution_authorized:false,audit_required:true});
}
