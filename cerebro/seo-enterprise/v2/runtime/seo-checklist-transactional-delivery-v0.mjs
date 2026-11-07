/**
 * SEO-001 / FENIX · Checklist transactional delivery contract V0.
 * PRIVATE PREPROD integration; no production endpoints or automatic dispatch.
 * Delivers the requested PDF as a Brevo transactional attachment, NEVER opts
 * recipients into marketing, never generates a public storage link.
 * A durable reserve/complete/unknown ledger MUST be provided by host runtime.
 * No migration, email, subscription, CRM or WordPress write in this module.
 */
import {createHash,timingSafeEqual} from 'node:crypto';

const sha=value=>createHash('sha256').update(value).digest('hex');
export const CHECKLIST_DELIVERY_V0=Object.freeze({
  schema_version:'0.1.0',company_id:'fenix',engine_id:'SEO-001',
  environment:'PREPROD',version:'v0',
  asset_id:'SEO-MAGNET-52656-CHECKLIST-V1',
  source_post_id:52656,
  source_url:'https://fenixcapital.es/checklist-visitar-piso-cordoba-antes-hipoteca/',
  persona:'PARTICULARES',
  newsletter_line:'PARTICULARES',
  storage_bucket:'seo-preprod-assets',
  storage_path:'fenix/seo-001/checklist-visita-vivienda-cordoba/v1/checklist.pdf',
  filename:'FENIX_CHECKLIST_VISITA_PISO_CORDOBA_V1.pdf',
  expected_sha256:'59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6',
  expected_bytes:99419,expected_pages:2,
  min_bytes:90000,max_bytes:110000,
  sender:{name:'Fénix Capital',email:'hipotecas@fenixcapital.es'},
  publish_authorized:false,newsletter_subscription_authorized:false,
  expected_additional_eur:0,live_delivery_enabled:false
});
function deny(condition,error){if(condition)throw new Error(error);}
function exactValue(value,label,expected){deny(value!==expected,'DELIVERY_SCOPE_DENIED_'+label);}
function cleanEmail(value){
  deny(typeof value!=='string','DELIVERY_EMAIL_REQUIRED');
  const email=value.trim().toLowerCase();
  deny(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'DELIVERY_EMAIL_INVALID');
  return email;
}
function isUuid(value){return typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
function validTime(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));}

export function validateServerVerifiedRequest(request){
  deny(!request||typeof request!=='object'||Array.isArray(request),'DELIVERY_SERVER_REQUEST_REQUIRED');
  for(const key of ['company_id','engine_id','environment','version','asset_id','source_post_id','source_url','persona'])
    exactValue(request[key],key.toUpperCase(),CHECKLIST_DELIVERY_V0[key]);
  exactValue(request.origin,'ORIGIN','FENIX_WEB_LEAD_VERIFIED_EVENT');
  exactValue(request.server_verified,'SERVER_VERIFIED',true);
  exactValue(request.consent_privacy,'PRIVACY_CONSENT',true);
  deny(typeof request.consent_marketing!=='boolean','MARKETING_CONSENT_BOOLEAN_REQUIRED');
  deny(!isUuid(request.lead_event_id)||!isUuid(request.request_id),'VERIFIED_EVENT_ID_REQUIRED');
  deny(!validTime(request.consent_privacy_at),'CONSENT_TIMESTAMP_REQUIRED');
  deny(typeof request.privacy_notice_version!=='string'||!/^fenix-privacy-[0-9]{4}-[0-9]{2}$/.test(request.privacy_notice_version),'PRIVACY_NOTICE_VERSION_REQUIRED');
  const email=cleanEmail(request.email);
  return Object.freeze({
    company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
    asset_id:CHECKLIST_DELIVERY_V0.asset_id,
    source_post_id:52656,lead_event_id:request.lead_event_id.toLowerCase(),
    request_id:request.request_id.toLowerCase(),email,
    consent_privacy_at:request.consent_privacy_at,
    privacy_notice_version:request.privacy_notice_version,
    consent_marketing:request.consent_marketing,
    newsletter_line:'PARTICULARES',
    subscription_requested:false,newsletter_subscription_authorized:false
  });
}
export function validateSourcePdf(bytes,{expected_sha256=CHECKLIST_DELIVERY_V0.expected_sha256,expected_bytes=CHECKLIST_DELIVERY_V0.expected_bytes}={}){
  deny(!Buffer.isBuffer(bytes),'PDF_BUFFER_REQUIRED');
  deny(bytes.length!==expected_bytes||bytes.length<CHECKLIST_DELIVERY_V0.min_bytes||
    bytes.length>CHECKLIST_DELIVERY_V0.max_bytes,'PDF_SIZE_MISMATCH');
  deny(bytes.subarray(0,5).toString('ascii')!=='%PDF-','PDF_MAGIC_INVALID');
  deny(!bytes.subarray(-256).toString('ascii').includes('%%EOF'),'PDF_EOF_INVALID');
  const actual=sha(bytes);
  deny(!/^[a-f0-9]{64}$/.test(expected_sha256),'PDF_EXPECTED_DIGEST_INVALID');
  deny(!timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected_sha256,'hex')),'PDF_SHA256_MISMATCH');
  return Object.freeze({asset_id:CHECKLIST_DELIVERY_V0.asset_id,
    bytes:bytes.length,sha256:actual,filename:CHECKLIST_DELIVERY_V0.filename,
    private_bucket:CHECKLIST_DELIVERY_V0.storage_bucket,
    private_path:CHECKLIST_DELIVERY_V0.storage_path});
}
function idempotencyKey(receipt){
  return sha(['fenix','seo-001','checklist-v1',receipt.lead_event_id,receipt.email].join('|')).slice(0,48);
}
function safeHtml(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function createTransactionalEmail({request,pdfBytes,assetVerifier=validateSourcePdf}){
  const v=validateServerVerifiedRequest(request);
  const asset=assetVerifier(pdfBytes);
  deny(asset?.sha256!=='59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6' && assetVerifier===validateSourcePdf,
    'PDF_DIGEST_NOT_CANONICAL');
  const subject='Tu checklist para visitar un piso en Córdoba | Fénix Capital';
  const body='<p>Hola,</p><p>Te enviamos el checklist de visita que has solicitado. Lo encontrarás adjunto en PDF.</p>'+
    '<p>Antes de reservar una vivienda, revisa su estado y la documentación necesaria.</p>'+
    '<p>Si deseas consultar tu financiación, puedes escribirnos desde <a href="https://fenixcapital.es/contacto/">Fénix Capital</a>.</p>'+
    '<p><small>Este correo corresponde únicamente a tu solicitud del recurso. No implica suscripción a comunicaciones comerciales.</small></p>';
  const text='Hola. Te enviamos adjunto el checklist para visitar un piso en Córdoba que has solicitado. '+
    'Puedes contactar con Fénix Capital en https://fenixcapital.es/contacto/. '+
    'Este mensaje no te suscribe a comunicaciones comerciales.';
  const key=idempotencyKey(v);
  return Object.freeze({
    receipt:{status:'READY_FOR_PREPROD_TEST_ONLY',company_id:v.company_id,
      engine_id:v.engine_id,asset_id:v.asset_id,recipient_sha256:sha(v.email),
      lead_event_id:v.lead_event_id,idempotency_key:key,
      attachment_sha256:asset.sha256,attachment_bytes:asset.bytes,
      consent_privacy_at:v.consent_privacy_at,privacy_notice_version:v.privacy_notice_version,
      marketing_consent_stored:v.consent_marketing,
      newsletter_subscription_authorized:false,publish_authorized:false},
    // This body contains recipient PII and PDF bytes; NEVER log it.
    brevo_request:{
      sender:CHECKLIST_DELIVERY_V0.sender,
      to:[{email:v.email}],subject,
      htmlContent:body,textContent:text,
      attachment:[{name:CHECKLIST_DELIVERY_V0.filename,content:pdfBytes.toString('base64')}],
      headers:{idempotencyKey:key}
    }
  });
}
export async function sendChecklistPreprodTest({
  request,pdfBytes,ledger,fetch_impl=fetch,
  testRecipient,apiKey,explicitTestSend=false,
  assetVerifier=validateSourcePdf
}={}){
  // Fixture validators are safe only in dry runs. Live tests must verify the pinned original PDF.
  deny(explicitTestSend&&assetVerifier!==validateSourcePdf,'LIVE_TEST_REQUIRES_CANONICAL_PDF_VERIFIER');
  const x=createTransactionalEmail({request,pdfBytes,assetVerifier});
  if(!explicitTestSend)return {...x.receipt,status:'DRY_RUN_ONLY_NO_EMAIL_SENT'};
  deny(!testRecipient||!apiKey||apiKey.length<12,'PREPROD_BREVO_KEY_OR_ALLOWLIST_MISSING');
  deny(cleanEmail(testRecipient)!==x.brevo_request.to[0].email,'TEST_MAILBOX_ALLOWLIST_DENIED');
  deny(!ledger||typeof ledger.reserve!=='function'||typeof ledger.complete!=='function'||
    typeof ledger.markUnknown!=='function','DURABLE_DELIVERY_LEDGER_REQUIRED');
  // Caller ledger must atomically reject replay, even after Brevo's 30 minute TTL.
  const claim=await ledger.reserve(x.receipt.idempotency_key,{
    request_id:request.request_id,lead_event_id:request.lead_event_id,
    recipient_sha256:x.receipt.recipient_sha256,
    attachment_sha256:x.receipt.attachment_sha256,
    consent_privacy_at:request.consent_privacy_at,
    privacy_notice_version:request.privacy_notice_version,
    consent_marketing:request.consent_marketing});
  if(claim!==true)return {...x.receipt,status:'ALREADY_RESERVED_NO_EMAIL_SENT'};
  try{
    const response=await fetch_impl('https://api.brevo.com/v3/smtp/email',{
      method:'POST',redirect:'error',
      headers:{'api-key':apiKey,'accept':'application/json','content-type':'application/json'},
      body:JSON.stringify(x.brevo_request),signal:AbortSignal.timeout(20000)
    });
    // Never auto-retry an uncertain transport outcome.
    const data=await response.json().catch(()=>null);
    if(response.status!==201||!data?.messageId)throw Error('BREVO_ACCEPTANCE_UNVERIFIED');
    await ledger.complete(x.receipt.idempotency_key,{message_id_sha256:sha(data.messageId),http_status:201});
    return {...x.receipt,status:'BREVO_ACCEPTED_PREPROD_TEST_NOT_DELIVERY_CONFIRMED',
      http_status:201,message_id_sha256:sha(data.messageId)};
  }catch(e){
    try{await ledger.markUnknown(x.receipt.idempotency_key,{reason:'TRANSPORT_OR_PERSISTENCE_UNCERTAIN'});}catch{}
    return {...x.receipt,status:'UNKNOWN_RECONCILIATION_REQUIRED_NO_AUTO_RETRY',
      error_code:'BREVO_OR_LEDGER_UNVERIFIED'};
  }
}
