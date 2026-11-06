/**
 * JARVIS LAB DeepSeek prepaid safety gate.
 * 50 EUR is the owner's cumulative permission ceiling, never a spending target.
 * This runner enforces an EXTRA conservative 40 USD lifetime ceiling; it is not
 * a provider-wide billing limit or proof of a EUR/USD exchange-rate guarantee.
 * Store the ledger on persistent private storage, never GitHub/GitHub Actions artifacts.
 */
import {readFileSync,writeFileSync,renameSync,mkdirSync,openSync,closeSync,unlinkSync,existsSync} from 'node:fs';
import {join} from 'node:path';

export const JARVIS_DEEPSEEK_BUDGET=Object.freeze({
 authorized_eur:50,
 conservative_runtime_cap_usd:40,
 per_run_cap_usd:5,
 scope:'company=fenix;engine=JARVIS;environment=LAB',
 stop_on_unverifiable_balance:true,
 auto_recharge:false,
 autopromote:false
});
const ledgerName='deepseek-lab-lifetime-budget.json';
const schema='jarvis.deepseek.lifetime_bounded_budget.v1';
const money=x=>Math.round(x*1_000_000)/1_000_000;
function validateLedger(x){
 if(x?.schema!==schema||x?.scope!==JARVIS_DEEPSEEK_BUDGET.scope||
    x?.authorized_eur!==50||x?.runtime_cap_usd!==40||
    !Number.isFinite(x.reserved_usd)||x.reserved_usd<0||
    x.reserved_usd>40||!Number.isInteger(x.calls_reserved)||x.calls_reserved<0)
  throw Error('BUDGET_LEDGER_MISSING_OR_INVALID');
}
export function openLifetimeBudget(dir){
 mkdirSync(dir,{recursive:true,mode:0o700});
 const file=join(dir,ledgerName);
 const lockFile=join(dir,'deepseek-lab-lifetime-budget.active.lock');
 // Fail closed for simultaneous runners and after unclean termination.
 const lockFd=openSync(lockFile,'wx',0o600);
 try{
  if(!existsSync(file)){
   const fresh={schema,scope:JARVIS_DEEPSEEK_BUDGET.scope,authorized_eur:50,
    runtime_cap_usd:40,reserved_usd:0,calls_reserved:0};
   try{writeFileSync(file,JSON.stringify(fresh,null,2)+'\n',
    {flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e}
  }
  const row=JSON.parse(readFileSync(file,'utf8'));
  validateLedger(row);
  return {dir,file,lockFile,lockFd,record:row,closed:false};
 }catch(e){closeSync(lockFd);unlinkSync(lockFile);throw e}
}
export function reserveLifetimeBudget(handle,usd){
 if(!handle||handle.closed)throw Error('LEDGER_NOT_OPEN');
 if(!Number.isFinite(usd)||usd<=0||usd>5)throw Error('INVALID_RESERVATION');
 const next=money(handle.record.reserved_usd+usd);
 if(next>40)throw Error('CUMULATIVE_50_EUR_POLICY_STOP_USD_40_SUBCAP');
 const record={...handle.record,reserved_usd:next,
  calls_reserved:handle.record.calls_reserved+1};
 validateLedger(record);
 // Reserve BEFORE the payable request. No refunds if a request fails, times out,
 // or the provider reports usage late. Prevent undercount on uncertainty.
 const pending=handle.file+'.pending';
 writeFileSync(pending,JSON.stringify(record,null,2)+'\n',{mode:0o600});
 renameSync(pending,handle.file);
 handle.record=record;
 return next;
}
export function closeLifetimeBudget(handle){
 if(!handle||handle.closed)return;
 handle.closed=true;
 closeSync(handle.lockFd);
 unlinkSync(handle.lockFile);
}
