import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const LIMITS=Object.freeze({total:50,minute:20,operativa:30,research:10,learning:5,incident:5});
const DAY=86400000,MIN=60000;
const validId=x=>typeof x==='string'&&/^[a-z0-9_.:-]{1,128}$/i.test(x);
export function reserve(state,{id,bucket,now}){
 if(state?.version!==1||!Array.isArray(state.attempts)||!Number.isSafeInteger(state.last_seen)||state.halted!==false||!validId(id)||!['learning','operativa','research','incident'].includes(bucket)||!Number.isSafeInteger(now)||now<state.last_seen)return{status:'HOLD_STATE_OR_INPUT'};
 const ids=new Set();
 for(const a of state.attempts){if(!validId(a.id)||ids.has(a.id)||!['learning','operativa','research','incident'].includes(a.bucket)||!Number.isSafeInteger(a.ts)||a.ts>state.last_seen)return{status:'HOLD_CORRUPT_LEDGER'};ids.add(a.id)}
 if(ids.has(id))return{status:'HOLD_DUPLICATE'};
 const day=state.attempts.filter(a=>a.ts>now-DAY);
 if(day.length>=LIMITS.total)return{status:'HOLD_GLOBAL_LIMIT'};
 if(day.filter(a=>a.ts>now-MIN).length>=LIMITS.minute)return{status:'HOLD_MINUTE_LIMIT'};
 if(day.filter(a=>a.bucket===bucket).length>=LIMITS[bucket])return{status:'HOLD_BUCKET_LIMIT'};
 return{status:'RESERVED',state:{...state,last_seen:now,attempts:[...state.attempts,{id,bucket,ts:now}]},remaining_bucket:LIMITS[bucket]-day.filter(a=>a.bucket===bucket).length-1,remaining_total:LIMITS.total-day.length-1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const p=new URL('./quota-state.json',import.meta.url);
 const r=reserve(JSON.parse(fs.readFileSync(p,'utf8')),{id:process.env.CEREBRO_RESERVATION_ID,bucket:'learning',now:Date.now()});
 console.log(JSON.stringify({status:r.status,remaining_bucket:r.remaining_bucket,remaining_total:r.remaining_total}));
 if(r.status!=='RESERVED')process.exit(3);
 fs.writeFileSync(p,JSON.stringify(r.state,null,2)+'\n');
}
