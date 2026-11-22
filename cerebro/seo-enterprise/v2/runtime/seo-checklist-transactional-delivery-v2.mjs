/**
 * SEO-001 CHECKLIST V2 — additive PREPROD-only asset/event contract.
 * No browser-supplied server_verified flag; require HMAC from trusted lead server.
 * Never writes WordPress, CRM, Storage or Brevo. V1 remains unchanged.
 */
import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
export const V2=Object.freeze({
 company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'v2',
 asset_id:'SEO-MAGNET-52656-CHECKLIST-V2',source_post_id:52656,
 source_url:'https://fenixcapital.es/checklist-visitar-piso-cordoba-antes-hipoteca/',
 persona:'PARTICULARES',origin:'FENIX_WEB_LEAD_SERVER',
 bucket:'seo-preprod-assets',
 path:'fenix/seo-001/checklist-visita-vivienda-cordoba/v2/FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf',
 filename:'FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf',
 bytes:113703,sha256:'82a96dc9b1c64bf8972e44358cd5bdc121182a09aa3832b71162efc7bea7e660',
 ledger_table:'cerebro_seo_checklist_delivery_v2',newsletter_subscription_authorized:false,
 live_delivery_enabled:false,publish_authorized:false
});
const hash=b=>createHash('sha256').update(b).digest('hex');
const requireThat=(v,err)=>{if(!v)throw Error(err);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hex64=/^[0-9a-f]{64}$/;
const fields=['company_id','engine_id','environment','version','asset_id','source_post_id',
 'source_url','persona','origin','lead_event_id','request_id','email','consent_privacy',
 'consent_privacy_at','privacy_notice_version','consent_marketing','issued_at'];
export function validateV2Pdf(bytes){
 requireThat(Buffer.isBuffer(bytes),'V2_PDF_BUFFER_REQUIRED');
 requireThat(bytes.length===V2.bytes,'V2_PDF_SIZE_MISMATCH');
 requireThat(bytes.subarray(0,5).toString('ascii')==='%PDF-','V2_PDF_MAGIC_INVALID');
 requireThat(bytes.subarray(-256).toString('ascii').includes('%%EOF'),'V2_PDF_EOF_INVALID');
 const digest=hash(bytes);
 requireThat(timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(V2.sha256,'hex')),'V2_PDF_SHA256_MISMATCH');
 return Object.freeze({asset_id:V2.asset_id,bytes:V2.bytes,sha256:digest,bucket:V2.bucket,path:V2.path});
}
export function canonicalSignedEvent(event){
 requireThat(event&&typeof event==='object'&&!Array.isArray(event),'V2_EVENT_REQUIRED');
 for(const k of fields)requireThat(Object.hasOwn(event,k),'V2_EVENT_MISSING_'+k);
 for(const k of Object.keys(event))requireThat(fields.includes(k),'V2_EVENT_UNKNOWN_'+k);
 for(const k of ['company_id','engine_id','environment','version','asset_id','source_post_id','source_url','persona','origin'])
  requireThat(event[k]===V2[k],'V2_SCOPE_DENIED_'+k);
 requireThat(uuid.test(event.lead_event_id)&&uuid.test(event.request_id),'V2_UUID_DENIED');
 requireThat(event.consent_privacy===true,'V2_PRIVACY_CONSENT_REQUIRED');
 requireThat(typeof event.consent_marketing==='boolean','V2_MARKETING_CONSENT_BOOLEAN_REQUIRED');
 requireThat(typeof event.email==='string'&&event.email===event.email.trim().toLowerCase()&&
  event.email.length<=254&&emailRe.test(event.email),'V2_EMAIL_INVALID');
 requireThat(typeof event.privacy_notice_version==='string'&&
  /^fenix-privacy-\d{4}-\d{2}$/.test(event.privacy_notice_version),'V2_NOTICE_VERSION_INVALID');
 for(const k of ['consent_privacy_at','issued_at'])
  requireThat(typeof event[k]==='string'&&Number.isFinite(Date.parse(event[k])),'V2_DATE_INVALID_'+k);
 return JSON.stringify(fields.map(k=>event[k]));
}
export function verifyV2ServerEvent({event,signature,serverSecret,now=Date.now()}={}){
 const canonical=canonicalSignedEvent(event);
 requireThat(typeof serverSecret==='string'&&Buffer.byteLength(serverSecret)>=32,'V2_SERVER_SECRET_REQUIRED');
 requireThat(typeof signature==='string'&&hex64.test(signature),'V2_SIGNATURE_REQUIRED');
 const digest=createHmac('sha256',serverSecret).update(canonical).digest('hex');
 requireThat(timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(signature,'hex')),'V2_SERVER_SIGNATURE_INVALID');
 const issued=Date.parse(event.issued_at),consented=Date.parse(event.consent_privacy_at);
 requireThat(Number.isFinite(now)&&issued<=now+60000&&now-issued<=600000,'V2_EVENT_EXPIRED_OR_FUTURE');
 requireThat(consented<=issued&&issued-consented<=86400000,'V2_CONSENT_TIMING_INVALID');
 return Object.freeze({...event,email:event.email});
}
export function makeV2DryRun({event,signature,serverSecret,pdfBytes,now}={}){
 const v=verifyV2ServerEvent({event,signature,serverSecret,now});
 const asset=validateV2Pdf(pdfBytes);
 const recipient_sha256=hash(v.email);
 const idempotency_key=hash(['fenix','seo-001','checklist-v2',v.lead_event_id,
  recipient_sha256].join('|')).slice(0,48);
 return Object.freeze({status:'V2_DRY_RUN_NO_EMAIL_SENT',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',asset_id:V2.asset_id,lead_event_id:v.lead_event_id,
  request_id:v.request_id,recipient_sha256,attachment_sha256:asset.sha256,
  idempotency_key,consent_privacy_at:v.consent_privacy_at,
  privacy_notice_version:v.privacy_notice_version,consent_marketing:v.consent_marketing,
  newsletter_subscription_authorized:false,storage_upload_performed:false,
  brevo_message_sent:false,publish_authorized:false});
}
