/**
 * SEO-001 durable delivery ledger adapter. Server-side service_role only.
 * Requires PREPROD RLS table public.cerebro_seo_checklist_delivery_v0.
 * No keys, connection, scheduled jobs, customer email or PDF content here.
 */
const TABLE='cerebro_seo_checklist_delivery_v0';
const DIGEST=/^[0-9a-f]{64}$/;
const KEY=/^[0-9a-f]{48}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const check=(value,regex,label)=>{if(typeof value!=='string'||!regex.test(value))throw Error('LEDGER_INVALID_'+label);};
function validateClient(client){
 if(!client||typeof client.from!=='function')throw Error('SUPABASE_SERVICE_ROLE_CLIENT_REQUIRED');
 if(client.delivery_project_ref!=='hnqlnvakzaywtafeiybt')throw Error('PREPROD_PROJECT_BINDING_REQUIRED');
 if(client.delivery_server_verified!==true)throw Error('SERVER_VERIFIED_CLIENT_REQUIRED');
 return client;
}
async function changed(query){
 const {data,error}=await query.select('idempotency_key').maybeSingle();
 if(error)throw Error('LEDGER_OPERATION_FAILED');
 return Boolean(data?.idempotency_key);
}
export function createChecklistDeliveryLedgerV0({client}={}){
 const db=validateClient(client);
 return Object.freeze({
  async reserve(key,detail){
    check(key,KEY,'KEY');
    for(const field of ['recipient_sha256','attachment_sha256'])check(detail?.[field],DIGEST,field.toUpperCase());
    for(const field of ['request_id','lead_event_id'])check(detail?.[field],UUID,field.toUpperCase());
    if(detail.attachment_sha256!=='59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6')
      throw Error('LEDGER_ASSET_SHA_DENIED');
    if(typeof detail.consent_marketing!=='boolean'||typeof detail.consent_privacy_at!=='string'||
      typeof detail.privacy_notice_version!=='string')throw Error('LEDGER_CONSENT_EVIDENCE_REQUIRED');
    const {data,error}=await db.from(TABLE).insert({
      idempotency_key:key,company_id:'fenix',engine_id:'SEO-001',
      environment:'PREPROD',asset_id:'SEO-MAGNET-52656-CHECKLIST-V1',
      lead_event_id:detail.lead_event_id,request_id:detail.request_id,
      recipient_sha256:detail.recipient_sha256,
      attachment_sha256:detail.attachment_sha256,
      consent_privacy_at:detail.consent_privacy_at,
      privacy_notice_version:detail.privacy_notice_version,
      consent_marketing:detail.consent_marketing,
      status:'RESERVED'
    }).select('idempotency_key').maybeSingle();
    if(error?.code==='23505')return false;
    if(error)throw Error('LEDGER_RESERVE_FAILED');
    if(data?.idempotency_key!==key)throw Error('LEDGER_RESERVE_NO_ACK');
    return true;
  },
  async complete(key,{message_id_sha256,http_status}={}){
    check(key,KEY,'KEY');check(message_id_sha256,DIGEST,'MESSAGE_ID_SHA256');
    if(http_status!==201)throw Error('BREVO_201_REQUIRED');
    return changed(db.from(TABLE).update({
      status:'ACCEPTED',message_id_sha256,completed_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }).eq('idempotency_key',key).eq('status','RESERVED'));
  },
  async markUnknown(key,{reason}={}){
    check(key,KEY,'KEY');
    if(reason!=='TRANSPORT_OR_PERSISTENCE_UNCERTAIN')throw Error('UNKNOWN_REASON_DENIED');
    return changed(db.from(TABLE).update({
      status:'UNKNOWN',last_error_code:reason,updated_at:new Date().toISOString()
    }).eq('idempotency_key',key).eq('status','RESERVED'));
  }
 });
}
export const LEDGER_PREPROD_CONTRACT_V0=Object.freeze({
 table:TABLE,environment:'PREPROD',project_ref:'hnqlnvakzaywtafeiybt',
 service_role_only:true,public_api_read:false,store_email_in_plaintext:false,
 auto_resend_after_unknown:false,production_authorized:false
});
