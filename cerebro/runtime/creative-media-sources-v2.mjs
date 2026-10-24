const PEXELS_LICENSE='https://www.pexels.com/license/';
const CHECKED_AT='2026-10-24';

export const GOVERNED_VIDEO_SOURCES_V2=Object.freeze({
  'PEXELS:7817205':Object.freeze({provider:'PEXELS',asset_id:'7817205',page_url:'https://www.pexels.com/video/couple-planning-with-the-realtor-7817205/',download_url:'https://www.pexels.com/download/video/7817205/',license_url:PEXELS_LICENSE,license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:true,orientation:'VERTICAL',duration_sec:30.32,width:1080,height:1920}),
  'PEXELS:7816382':Object.freeze({provider:'PEXELS',asset_id:'7816382',page_url:'https://www.pexels.com/video/realtor-giving-the-key-of-new-house-to-clients-7816382/',download_url:'https://www.pexels.com/download/video/7816382/',license_url:PEXELS_LICENSE,license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:true,orientation:'LANDSCAPE',duration_sec:21.36,width:1920,height:1080}),
  'PEXELS:7646690':Object.freeze({provider:'PEXELS',asset_id:'7646690',page_url:'https://www.pexels.com/video/a-realtor-explaining-a-documents-to-a-couple-7646690/',download_url:'https://www.pexels.com/download/video/7646690/',license_url:PEXELS_LICENSE,license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:true,orientation:'LANDSCAPE',duration_sec:10.36,width:3840,height:2160}),
  'PEXELS:7735853':Object.freeze({provider:'PEXELS',asset_id:'7735853',page_url:'https://www.pexels.com/video/a-couple-working-7735853/',download_url:'https://www.pexels.com/download/video/7735853/',license_url:PEXELS_LICENSE,license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:true,orientation:'LANDSCAPE',duration_sec:14,width:1920,height:1080}),
  'PEXELS:7646396':Object.freeze({provider:'PEXELS',asset_id:'7646396',page_url:'https://www.pexels.com/video/couple-buying-a-house-7646396/',download_url:'https://www.pexels.com/download/video/7646396/',license_url:PEXELS_LICENSE,license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:true,orientation:'LANDSCAPE',duration_sec:9.32,width:3840,height:2160}),
  'FENIX_OWNED:CORP_B2B_2026':Object.freeze({provider:'FENIX_OWNED',asset_id:'CORP_B2B_2026',page_url:'https://fenixcapital.es/',download_url:'https://fenixcapital.es/wp-content/uploads/2026/05/Fenix-Capital-para-inmobiliarias_1080p-1.mp4',license_url:'INTERNAL_OWNED_MEDIA',license_checked_at:CHECKED_AT,commercial_use:true,modification_allowed:true,attribution_required:false,endorsement_implication_forbidden:false,orientation:'LANDSCAPE',duration_sec:45.013,width:1920,height:1080,notes:'Existing corporate video contains baked-in legacy text; use only explicitly audited clean/cropped segments.'})
});

export function resolveGovernedVideoSourceV2(ref){
  const key=String(ref||'').toUpperCase();
  const source=GOVERNED_VIDEO_SOURCES_V2[key];
  if(!source)throw new Error(`VIDEO_SOURCE_NOT_GOVERNED:${key}`);
  if(source.commercial_use!==true||source.modification_allowed!==true)throw new Error(`VIDEO_SOURCE_LICENSE_DENIED:${key}`);
  if(source.provider==='PEXELS'&&source.license_url!==PEXELS_LICENSE)throw new Error(`VIDEO_SOURCE_LICENSE_MISMATCH:${key}`);
  return source;
}

export function sourceProvenanceV2(ref){
  const s=resolveGovernedVideoSourceV2(ref);
  return Object.freeze({provider:s.provider,asset_id:s.asset_id,page_url:s.page_url,license_url:s.license_url,license_checked_at:s.license_checked_at,commercial_use:s.commercial_use,modification_allowed:s.modification_allowed,attribution_required:s.attribution_required,endorsement_implication_forbidden:s.endorsement_implication_forbidden});
}

export const CREATIVE_MEDIA_SOURCE_REGISTRY_V2_CONTRACT=Object.freeze({schema_version:'2.0.0',allowed_providers:['PEXELS','FENIX_OWNED'],pexels_license_checked_at:CHECKED_AT,arbitrary_remote_video_urls:false,commercial_use_required:true,modification_allowed_required:true,endorsement_implication_forbidden_for_stock:true,additional_cost_eur:0});
