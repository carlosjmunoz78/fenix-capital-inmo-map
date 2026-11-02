import {foundationContext,foundationManifest} from './foundation-context-v1.mjs';

export const manifest=foundationManifest({
  engine_id:'NOTIF-001',
  name:'Notification Engine Interno · Foundation Wrapper',
  wrapped_existing_paths:['cerebro/communication/notif-native-v1.mjs','cerebro/runtime/lote3-com-notif-c360-real-v1.mjs']
});

export function planInternalNotifications(input={}){
  const context=foundationContext(manifest.engine_id,input);
  const events=Array.isArray(input.events)?input.events:[];
  const seen=new Set();
  const notifications=[];
  for(const event of events){
    const type=String(event?.type||'UNSPECIFIED').trim().toUpperCase();
    const record_id=String(event?.record_id||'').trim();
    const key=`${type}|${record_id}`;
    if(seen.has(key)) continue;
    seen.add(key);
    notifications.push({key,type,record_id,channel:'INTERNAL_ONLY',delivery:'PLANNED_NOT_SENT'});
  }
  return {status:'FOUNDATION_OK',context,notifications,deduplicated_count:events.length-notifications.length,external_delivery:false,prod_write:false,cost_eur:0};
}
