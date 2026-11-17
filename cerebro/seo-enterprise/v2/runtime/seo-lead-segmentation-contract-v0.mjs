/**
 * SEO-001: PREPROD-only logical source/funnel/consent contract for the
 * EXISTING WordPress → Fénix CEREBRO Leads → fenix-web-lead adapter.
 * No CRM, WP, newsletter, email or DB mutation. Source evidence from
 * WP Montilla posts 49114 B2C, 49128 B2B and draft 52656 B2C.
 */
const ROOT='https://fenixcapital.es';
const SPECS=Object.freeze({
  LOCAL_B2C:Object.freeze({
    persona:'PARTICULARES',form_contract:'HIPOTECA_CASO_POR_PERFIL',
    funnel:'B2C_HIPOTECA_STUDY',source:'web_mortgage_study',
    newsletter_line:'PARTICULARES',resource_prefix:'study_b2c',
    lead_delivery:'FENIX_CEREBRO_EXISTING_INGEST'
  }),
  LOCAL_B2B:Object.freeze({
    persona:'INMOBILIARIAS',form_contract:'INMOBILIARIA_PARTNERS',
    funnel:'B2B_INMOBILIARIAS_PARTNERS',source:'web_partner_financing',
    newsletter_line:'INMOBILIARIAS',resource_prefix:'partner_b2b',
    lead_delivery:'FENIX_CEREBRO_EXISTING_INGEST'
  }),
  CHECKLIST_B2C:Object.freeze({
    persona:'PARTICULARES',form_contract:'CHECKLIST_CORDOBA_VISITA_VIVIENDA',
    funnel:'B2C_CHECKLIST_PREESTUDIO',source:'web_lead_magnet_native',
    newsletter_line:'PARTICULARES',resource_prefix:'checklist_b2c',
    lead_delivery:'FENIX_CEREBRO_EXISTING_INGEST'
  })
});
const FALLBACK_DENY={ok:false,status:'NO_MATCH_HUMAN_REVIEW',publish_authorized:false};
const CITY=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_TYPES=new Set(['LOCAL_B2C','LOCAL_B2B','CHECKLIST_B2C']);

export function classifyFenixSeoLanding({url,company_id='fenix',environment='PREPROD'}={}){
  if(company_id!=='fenix'||environment!=='PREPROD'||typeof url!=='string')throw Error('FENIX_SEO_TENANT_ENV_DENIED');
  let parsed;try{parsed=new URL(url)}catch{throw Error('INVALID_LANDING_URL')}
  if(parsed.origin!==ROOT||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error('NON_CANONICAL_LANDING_DENIED');
  const p=parsed.pathname;
  let type=null,city=null,post_id=null;
  if(p==='/asesor-hipotecario-montilla/'){type='LOCAL_B2C';city='montilla';post_id=49114;}
  if(p==='/financiacion-compradores-inmobiliarias-montilla/'){type='LOCAL_B2B';city='montilla';post_id=49128;}
  if(p==='/checklist-visitar-piso-cordoba-antes-hipoteca/'){type='CHECKLIST_B2C';city='cordoba';post_id=52656;}
  if(!type)return {...FALLBACK_DENY,url:p};
  if(!VALID_TYPES.has(type)||!CITY.test(city))throw Error('CONTRACT_INVALID');
  const x=SPECS[type];
  const suffix=type==='CHECKLIST_B2C'?'visita-vivienda-cordoba':city;
  return {
    ok:true,company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',
    version:'v0',landing_url:url,post_id,city,
    segment:type,persona:x.persona,funnel:x.funnel,form_contract:x.form_contract,
    source:x.source,newsletter_line:x.newsletter_line,
    resource:x.resource_prefix+'_'+suffix,
    customer_data_used:false,publish_authorized:false,delivery_verified:false,
    crm_storage_verified:false,newsletter_verified:false,lead_delivery:x.lead_delivery
  };
}
export function prepareSeoFunnelRouting({url,privacy_consent,marketing_consent=false,company_id='fenix',environment='PREPROD'}={}){
  if(typeof privacy_consent!=='boolean'||typeof marketing_consent!=='boolean')throw Error('CONSENT_BOOLEAN_REQUIRED');
  const r=classifyFenixSeoLanding({url,company_id,environment});
  if(!r.ok)return r;
  if(!privacy_consent) return {ok:false,status:'PRIVACY_CONSENT_REQUIRED',
    post_id:r.post_id,persona:r.persona,publish_authorized:false};
  // This is a CONTRACT/QA receipt only; never send actual PII to PROD.
  return {...r,consent_privacy:true,consent_marketing:marketing_consent,
    newsletter_opt_in_allowed:marketing_consent,
    newsletter_send_authorized:false,
    lead_send_authorized:false,
    asset_delivery_authorized:false,
    status:'PREPROD_ROUTING_ONLY'};
}
export function analyzeLegacyMontillaForms(legacyRecords){
  if(!Array.isArray(legacyRecords)||legacyRecords.length!==2)throw Error('EXACT_TWO_LEGACY_RECORDS_REQUIRED');
  const a=legacyRecords.find(x=>x.post_id===49114),b=legacyRecords.find(x=>x.post_id===49128);
  if(!a||!b||a.shortcode!=='[fenix_seo001_city_form city="Montilla" funnel="STUDY"]'||
      b.shortcode!=='[fenix_seo001_city_form city="Montilla" funnel="STUDY"]')
    throw Error('LEGACY_EVIDENCE_DOES_NOT_MATCH');
  const x=classifyFenixSeoLanding({url:a.url}),y=classifyFenixSeoLanding({url:b.url});
  if(x.persona===y.persona||x.resource===y.resource)throw Error('ISOLATION_NOT_ENFORCED');
  return {status:'LEGACY_COLLISION_IDENTIFIED_REPLACEMENT_CONTRACT_TESTED',
    legacy_shared_resource:'study_montilla',
    existing_wp_shortcode_preserved:true,existing_lead_ingest_preserved:true,
    source_payload_retains_landing_url:true,
    proposed:{b2c:x,b2b:y},
    physical_crm_segregation_verified:false,newsletter_delivery_verified:false,
    publish_authorized:false};
}
