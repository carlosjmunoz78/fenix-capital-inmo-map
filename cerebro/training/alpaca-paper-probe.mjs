import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planAlpacaPaperConnection,buildPaperAuthHeaders,validatePaperAccountResponse} from './alpaca-paper-connector.mjs';

const DEFAULT_SECRET_FILE=path.join(os.homedir(),'.config','cerebro','secrets','alpaca-paper.env');
const PAPER_BASE='https://paper-api.alpaca.markets';
const LIVE_BASE='https://api.alpaca.markets';

function parseEnv(text){
  const out={};
  for(const raw of String(text).split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const i=line.indexOf('=');
    if(i<1)throw new Error('invalid env line');
    const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();
    if(!/^[A-Z0-9_]+$/.test(k))throw new Error('invalid env key');
    out[k]=v;
  }
  return out;
}

export function loadAlpacaPaperSecrets(file=DEFAULT_SECRET_FILE){
  const stat=fs.statSync(file);
  const mode=stat.mode&0o777;
  if((mode&0o077)!==0)throw new Error('secret file permissions must not allow group/other access');
  const env=parseEnv(fs.readFileSync(file,'utf8'));
  const apiKey=env.ALPACA_PAPER_API_KEY;
  const apiSecret=env.ALPACA_PAPER_API_SECRET;
  const baseUrl=env.ALPACA_PAPER_BASE_URL||PAPER_BASE;
  if(baseUrl!==PAPER_BASE||baseUrl===LIVE_BASE)throw new Error('only Alpaca Paper endpoint is allowed');
  if(!apiKey||!apiSecret)throw new Error('Alpaca Paper credentials missing');
  return Object.freeze({apiKey,apiSecret,baseUrl});
}

export async function probeAlpacaPaper({file=DEFAULT_SECRET_FILE,fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=='function')throw new Error('fetch implementation required');
  const context={company_id:'fenix',engine_id:'TRN-001',environment:'LAB',version:'0.1.0'};
  const plan=planAlpacaPaperConnection({context,base_url:PAPER_BASE,key_ref:'secret-ref://local/alpaca-paper/api-key',secret_ref:'secret-ref://local/alpaca-paper/api-secret',trading_live:false,additional_cost_eur:0});
  if(plan.status!=='READY'||plan.live_endpoint_blocked!==true)throw new Error('paper connection plan rejected');
  const {apiKey,apiSecret,baseUrl}=loadAlpacaPaperSecrets(file);
  const res=await fetchImpl(`${baseUrl}/v2/account`,{method:'GET',headers:buildPaperAuthHeaders({apiKey,apiSecret})});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(`Alpaca Paper HTTP ${res.status}: ${String(body?.message||'request failed')}`);
  const verified=validatePaperAccountResponse(body);
  if(verified.account_status!=='ACTIVE')throw new Error(`unexpected Alpaca account status: ${verified.account_status}`);
  return Object.freeze({status:'GREEN',mode:'ALPACA_PAPER_ONLY',paper_only:true,live_endpoint_blocked:true,account_status:verified.account_status,trading_blocked:verified.trading_blocked,account_blocked:Boolean(body.account_blocked),currency:String(body.currency||''),cash:String(body.cash||''),equity:String(body.equity||''),buying_power:String(body.buying_power||''),credential_payload_logged:false,audit_required:true});
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const out=await probeAlpacaPaper();
    process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
  }catch(e){
    process.stderr.write(`RED: ${e.message}\n`);
    process.exitCode=1;
  }
}
