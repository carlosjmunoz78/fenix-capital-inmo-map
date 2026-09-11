import {loadAlpacaPaperSecrets} from './alpaca-paper-probe.mjs';
import {buildPaperAuthHeaders} from './alpaca-paper-connector.mjs';

const PAPER_BASE='https://paper-api.alpaca.markets';
const ALLOWED=Object.freeze({
  account:'/v2/account',
  positions:'/v2/positions',
  clock:'/v2/clock',
  orders:'/v2/orders?status=all&limit=50'
});

function sanitizeAccount(x={}){
  return Object.freeze({status:String(x.status||''),currency:String(x.currency||''),cash:String(x.cash||''),equity:String(x.equity||''),buying_power:String(x.buying_power||''),trading_blocked:Boolean(x.trading_blocked),account_blocked:Boolean(x.account_blocked)});
}
function sanitizePositions(xs){
  if(!Array.isArray(xs))throw new Error('positions response must be array');
  return xs.map(x=>Object.freeze({symbol:String(x.symbol||''),qty:String(x.qty||''),side:String(x.side||''),market_value:String(x.market_value||''),avg_entry_price:String(x.avg_entry_price||''),unrealized_pl:String(x.unrealized_pl||'')}));
}
function sanitizeClock(x={}){
  return Object.freeze({is_open:Boolean(x.is_open),timestamp:String(x.timestamp||''),next_open:String(x.next_open||''),next_close:String(x.next_close||'')});
}
function sanitizeOrders(xs){
  if(!Array.isArray(xs))throw new Error('orders response must be array');
  return xs.map(x=>Object.freeze({symbol:String(x.symbol||''),side:String(x.side||''),type:String(x.type||''),status:String(x.status||''),qty:String(x.qty||''),notional:String(x.notional||''),submitted_at:String(x.submitted_at||'')}));
}

export async function readAlpacaPaper(resource,{file,fetchImpl=globalThis.fetch}={}){
  if(!Object.hasOwn(ALLOWED,resource))throw new Error('read-only resource not allowed');
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const {apiKey,apiSecret,baseUrl}=loadAlpacaPaperSecrets(file);
  if(baseUrl!==PAPER_BASE)throw new Error('only Alpaca Paper endpoint is allowed');
  const res=await fetchImpl(`${baseUrl}${ALLOWED[resource]}`,{method:'GET',headers:buildPaperAuthHeaders({apiKey,apiSecret})});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`Alpaca Paper HTTP ${res.status}: ${String(body?.message||'request failed')}`);
  const data=resource==='account'?sanitizeAccount(body):resource==='positions'?sanitizePositions(body):resource==='clock'?sanitizeClock(body):sanitizeOrders(body);
  return Object.freeze({status:'GREEN',mode:'ALPACA_PAPER_READ_ONLY',resource,paper_only:true,method:'GET',live_endpoint_blocked:true,order_mutation_forbidden:true,credential_payload_logged:false,data});
}

export const ALPACA_PAPER_READONLY_CONTRACT=Object.freeze({environment:['LAB','PREPROD'],paper_only:true,methods:['GET'],resources:Object.keys(ALLOWED),live_endpoint_blocked:true,order_mutation_forbidden:true,additional_cost_target_eur:0});
