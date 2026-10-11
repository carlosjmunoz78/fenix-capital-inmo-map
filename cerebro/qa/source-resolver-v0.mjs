const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const APP_PATHS={
  accessibility_semantics:['src/App.tsx'],
  accessibility_names:['src/App.tsx'],
  form_accessibility:['src/App.tsx'],
  image_accessibility:['src/App.tsx'],
  mobile_usability:['src/App.tsx','src/direction.css','src/logo.css'],
  responsive:['src/App.tsx','src/direction.css','src/logo.css'],
  perceived_performance:['src/App.tsx']
};

export function resolveQaSource({target='GLOBAL',dimension='unknown',owner_engine='QA-001'}={}){
  const surface=String(target).split(':',1)[0].toUpperCase();
  if(surface==='APP'){
    return {
      status:'SOURCE_HINT_VERIFIED',
      surface:'APP',
      owner_engine,
      repository:REPO,
      repository_ref:'main',
      file_hints:APP_PATHS[dimension]??['src/App.tsx'],
      mutation_surface:'GIT_PREPROD_BRANCH_ONLY',
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
      repository_ref:null,
      file_hints:[],
      external_target:'https://fenixcapital.es',
      mutation_surface:'WORDPRESS_PREPROD_ONLY',
      exact_symbol:'NO_APLICA_HASTA_MAPEO_WORDPRESS',
      prod_write_authorized:false
    };
  }
  if(surface==='PRODUCT'){
    return {status:'POR_AUDITAR_PREPROD_TARGET',surface:'PRODUCT',owner_engine,repository:null,repository_ref:null,file_hints:[],mutation_surface:'NONE',exact_symbol:null,prod_write_authorized:false};
  }
  return {status:'POR_AUDITAR',surface,owner_engine,repository:null,repository_ref:null,file_hints:[],mutation_surface:'NONE',exact_symbol:null,prod_write_authorized:false};
}
