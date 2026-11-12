import {SCOPE} from './auth.mjs';
export const SEAL_ORDER=Object.freeze({...SCOPE,client_id:'cerebro',source:'owner_order',operation:'cloudflare.d1.recovery_backup.seal_once_lab',request_id:'FACT001-D1-BACKUP-ONCE-20261112-001'});
export const VERIFY_ORDER=Object.freeze({...SCOPE,client_id:'cerebro',source:'owner_order',operation:'cloudflare.d1.recovery_backup.verify_once_lab',request_id:'FACT001-D1-BACKUP-VERIFY-20261112-001'});
export function assertOrder(input,type){
 const e=type==='seal'?SEAL_ORDER:type==='verify'?VERIFY_ORDER:null;
 if(!e||!input||typeof input!=='object'||Array.isArray(input)||JSON.stringify(Object.keys(input).sort())!==JSON.stringify(Object.keys(e).sort())||Object.entries(e).some(([k,v])=>input[k]!==v))throw Error('D1_BACKUP_ORDER_DENIED');
 return true;
}
