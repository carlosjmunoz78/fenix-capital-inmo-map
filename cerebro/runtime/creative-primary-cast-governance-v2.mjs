function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function refHost(ref){try{return new URL(String(ref||'')).hostname.toLowerCase()}catch{return ''}}
function isStockVideoRef(ref){return /^(PEXELS|PIXABAY|MIXKIT|COVERr|VIDEVO):/i.test(String(ref||''))}
function isOwnedFenixImage(ref){const h=refHost(ref);return h==='fenixcapital.es'||h.endsWith('.fenixcapital.es')}

export function evaluatePrimaryCastGovernanceV2({scenes,primary_cast_asset}={}){
  const list=arr(scenes).map(obj),primary=list.filter(s=>String(obj(s.continuity).character_intent||'').toUpperCase()==='PRIMARY_CAST'),failures=[];
  if(primary.length<2)failures.push({code:'PRIMARY_CAST_TOO_SPARSE',detail:String(primary.length)});
  for(const s of primary){
    const kind=String(s.source_kind||'').toUpperCase();
    if(kind==='VIDEO'&&isStockVideoRef(s.video_source))failures.push({code:'STOCK_PRIMARY_CAST_FORBIDDEN',detail:String(s.video_source)});
    if(kind==='PHOTO'&&!isOwnedFenixImage(s.visual_source||primary_cast_asset))failures.push({code:'PRIMARY_CAST_IMAGE_NOT_FENIX_GOVERNED',detail:String(s.visual_source||primary_cast_asset||'')});
    if(!['PHOTO','VIDEO'].includes(kind))failures.push({code:'PRIMARY_CAST_SOURCE_KIND_INVALID',detail:kind});
  }
  const primaryRefs=[...new Set(primary.map(s=>String(s.visual_source||s.video_source||primary_cast_asset||'')).filter(Boolean))];
  if(primaryRefs.length!==1)failures.push({code:'PRIMARY_CAST_SOURCE_DRIFT',detail:primaryRefs.join(',')});
  for(const s of list){
    if(String(s.source_kind||'').toUpperCase()==='VIDEO'&&isStockVideoRef(s.video_source)&&String(obj(s.continuity).character_intent||'').toUpperCase()!=='CONTEXT_BROLL')failures.push({code:'STOCK_VIDEO_MUST_BE_CONTEXT_BROLL',detail:String(s.video_source)});
  }
  const passed=failures.length===0;
  return Object.freeze({schema_version:'2.0.0',passed,hard_fail:!passed,primary_scene_count:primary.length,primary_asset_refs:primaryRefs,stock_primary_forbidden:true,stock_video_context_only:true,failures,verdict:passed?'PRIMARY_CAST_GOVERNED':'PRIMARY_CAST_REJECTED'});
}
export function assertPrimaryCastGovernanceV2(input){const r=evaluatePrimaryCastGovernanceV2(input);if(!r.passed){const e=new Error(`PRIMARY_CAST_QA_REJECTED:${r.failures.map(x=>x.code).join(',')}`);e.tribunal=r;throw e}return r}
export const CREATIVE_PRIMARY_CAST_GOVERNANCE_V2_CONTRACT=Object.freeze({schema_version:'2.0.0',owner_engine:'CREATIVE-STUDIO-001',stock_primary_cast_forbidden:true,stock_video_context_only:true,fenix_owned_primary_image_supported:true,single_primary_asset_lock:true,biometric_face_recognition:false,publication_authority:false,additional_cost_eur:0});