const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()};
const PAPER_BASE='https://paper-api.alpaca.markets';
const LIVE_BASE='https://api.alpaca.markets';
export function planAlpacaPaperConnection(i={}){
  const c=i.context;if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('context required');
  for(const k of ['company_id','engine_id','environment','version'])req(c[k],`context.${k}`);
  if(c.environment!=='PREPROD'&&c.environment!=='LAB')return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',connect:false});
  if(i.trading_live===true||i.base_url===LIVE_BASE)return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',connect:false});
  if(i.additional_cost_eur!=null&&Number(i.additional_cost_eur)>0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',connect:false});
  const keyRef=req(i.key_ref,'key_ref'),secretRef=req(i.secret_ref,'secret_ref');
  if(!/^secret-ref:\/\/[A-Za-z0-9._~:/@+-]+$/.test(keyRef)||!/^secret-ref:\/\/[A-Za-z0-9._~:/@+-]+$/.test(secretRef))return Object.freeze({status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',connect:false});
  return Object.freeze({status:'READY',connect:false,mode:'ALPACA_PAPER_ONLY',base_url:PAPER_BASE,key_ref:keyRef,secret_ref:secretRef,live_endpoint_blocked:true,credential_payload_forbidden:true,audit_required:true,rollback_required:true,additional_cost_target_eur:0});
}
export function buildPaperAuthHeaders({apiKey,apiSecret}={}){
  req(apiKey,'apiKey');req(apiSecret,'apiSecret');
  return Object.freeze({'APCA-API-KEY-ID':apiKey,'APCA-API-SECRET-KEY':apiSecret});
}
export function validatePaperAccountResponse(account={}){
  if(!account||typeof account!=='object'||Array.isArray(account))throw new Error('account object required');
  const status=req(String(account.status||''),'account.status');
  const tradingBlocked=Boolean(account.trading_blocked);
  return Object.freeze({status:'VERIFIED',paper_only:true,account_status:status,trading_blocked:tradingBlocked,real_money_forbidden:true});
}
