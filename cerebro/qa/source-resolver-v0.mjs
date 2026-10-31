const REPO='fenix-cerebro/fenix-capital-inmo-map';
const LEGACY_REPO_ALIASES=Object.freeze(['carlosjmunoz78/fenix-capital-inmo-map']);
const APP_PATHS={
  accessibility_semantics:['src/App.tsx'],
  accessibility_names:['src/App.tsx'],
  form_accessibility:['src/App.tsx'],
  image_accessibility:['src/App.tsx'],
  mobile_usability:['src/App.tsx','src/direction.css','src/logo.css'],
  responsive:['src/App.tsx','src/direction.css','src/logo.css'],
  perceived_performance:['src/App.tsx']
};

function boundedLocalizationEvidence(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,15).map(sample=>({
    tag:String(sample?.tag??'').slice(0,24),
    role:String(sample?.role??'').slice(0,48),
    type:String(sample?.type??'').slice(0,48),
    classes:String(sample?.classes??'').slice(0,240),
    selector:String(sample?.selector??'').slice(0,320),
    href:String(sample?.href??'').slice(0,240),
    text:String(sample?.text??'').slice(0,160),
    ariaLabel:String(sample?.ariaLabel??'').slice(0,160),
    title:String(sample?.title??'').slice(0,160),
    width:Number.isFinite(Number(sample?.width))?Number(sample.width):null,
    height:Number.isFinite(Number(sample?.height))?Number(sample.height):null
  })).filter(sample=>sample.selector||sample.classes||sample.tag);
}

export function resolveQaSource({target='GLOBAL',dimension='unknown',owner_engine='QA-001',localization_evidence=[]}={}){
  const surface=String(target).split(':',1)[0].toUpperCase();
  if(surface==='APP'){
    const samples=boundedLocalizationEvidence(localization_evidence);
    return {
      status:'SOURCE_HINT_VERIFIED',
      surface:'APP',
      owner_engine,
      repository:REPO,
      repository_aliases:[...LEGACY_REPO_ALIASES],
      repository_ref:'main',
      file_hints:APP_PATHS[dimension]??['src/App.tsx'],
      mutation_surface:'GIT_PREPROD_BRANCH_ONLY',
      localization_status:samples.length?'OBSERVED_ELEMENT_SAMPLES_AVAILABLE':'FILE_HINTS_ONLY',
      localization_evidence:samples,
      exact_symbol:'POR_LOCALIZAR_CON_EVIDENCIA',
      prod_write_authorized:false
    };
  }
  if(surface==='WEB'){
    return {
      status:'EXTERNAL_SURFACE_OWNER_VERIFIED',
      surface:'WEB',
      owner_engine,
      repository:null,
      repository_aliases:[],
      repository_ref:null,
      file_hints:[],
      external_target:'https://fenixcapital.es',
      mutation_surface:'WORDPRESS_PREPROD_ONLY',
      localization_status:'EXTERNAL_SURFACE_REQUIRES_WORDPRESS_MAPPING',
      localization_evidence:boundedLocalizationEvidence(localization_evidence),
      exact_symbol:'NO_APLICA_HASTA_MAPEO_WORDPRESS',
      prod_write_authorized:false
    };
  }
  if(surface==='PRODUCT'){
    return {status:'POR_AUDITAR_PREPROD_TARGET',surface:'PRODUCT',owner_engine,repository:null,repository_aliases:[],repository_ref:null,file_hints:[],mutation_surface:'NONE',localization_status:'POR_AUDITAR',localization_evidence:[],exact_symbol:null,prod_write_authorized:false};
  }
  return {status:'POR_AUDITAR',surface,owner_engine,repository:null,repository_aliases:[],repository_ref:null,file_hints:[],mutation_surface:'NONE',localization_status:'POR_AUDITAR',localization_evidence:[],exact_symbol:null,prod_write_authorized:false};
}
