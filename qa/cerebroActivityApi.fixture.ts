export type CerebroActivityStatus='queued'|'in_progress'|'completed'|'waiting'|'requested'|'pending'|string;
export type CerebroProgressProvenance='REAL_GITHUB_JOBS'|'TERMINAL_STATUS'|'UNAVAILABLE';

export type CerebroActivityRun={
  run_id:number;
  workflow_name:string;
  workflow_alias:string;
  workflow_path:string;
  status:CerebroActivityStatus;
  conclusion:string|null;
  event:string;
  html_url:string;
  created_at:string;
  run_started_at:string|null;
  updated_at:string;
  engine_id:string|null;
  company_id:string;
  environment:string;
  version:string;
  source:'GITHUB_ACTIONS';
  provenance:'REAL';
  company_provenance:'DERIVED_REPOSITORY_SCOPE';
  alias_provenance:'ENGINE_ID'|'DERIVED_WORKFLOW_NAME';
  progress_percent:number|null;
  progress_completed_steps:number|null;
  progress_total_steps:number|null;
  current_step:string|null;
  next_step:string|null;
  progress_provenance:CerebroProgressProvenance;
};

export type CerebroActivityResponse={
  status:'OK'|'ERROR';
  observed_at:string;
  source:'GITHUB_ACTIONS';
  source_status:'LIVE'|'CACHED'|'UNAVAILABLE';
  repository:string;
  runs:CerebroActivityRun[];
  reason?:string;
};

const ago=(minutes:number)=>new Date(Date.now()-minutes*60_000).toISOString();

function fixtureRuns():CerebroActivityRun[]{
  return [
    {
      run_id:910001,
      workflow_name:'CEREBRO FACT-001 Engine Factory PREPROD',
      workflow_alias:'FACT-001',
      workflow_path:'.github/workflows/cerebro-fact001-autofactory-v1.yml',
      status:'in_progress',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions',
      created_at:ago(19),run_started_at:ago(18),updated_at:ago(1),engine_id:'FACT-001',company_id:'fenix-capital',environment:'PREPROD',version:'v1',
      source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',
      progress_percent:58,progress_completed_steps:7,progress_total_steps:12,current_step:'Ejecutar pruebas estructurales',next_step:'Generar evidencia de aceptación',progress_provenance:'REAL_GITHUB_JOBS'
    },
    {
      run_id:910002,
      workflow_name:'CEREBRO SEO-001 City Complete Verification',
      workflow_alias:'SEO-001',
      workflow_path:'.github/workflows/cerebro-seo-city-complete.yml',
      status:'queued',conclusion:null,event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions',
      created_at:ago(6),run_started_at:null,updated_at:ago(6),engine_id:'SEO-001',company_id:'fenix-capital',environment:'PREPROD',version:'v2',
      source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',
      progress_percent:null,progress_completed_steps:null,progress_total_steps:null,current_step:null,next_step:'Esperando worker disponible',progress_provenance:'UNAVAILABLE'
    },
    {
      run_id:910003,
      workflow_name:'CEREBRO APP-001 Console Contract Build',
      workflow_alias:'APP-001',
      workflow_path:'.github/workflows/cerebro-console-ui-v3-ci.yml',
      status:'completed',conclusion:'success',event:'push',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions',
      created_at:ago(31),run_started_at:ago(30),updated_at:ago(22),engine_id:'APP-001',company_id:'fenix-capital',environment:'PREPROD',version:'v0.3',
      source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',
      progress_percent:100,progress_completed_steps:5,progress_total_steps:5,current_step:'Build validado',next_step:null,progress_provenance:'TERMINAL_STATUS'
    },
    {
      run_id:910004,
      workflow_name:'CEREBRO Gateway Smoke QA',
      workflow_alias:'GATEWAY-QA',
      workflow_path:'.github/workflows/cerebro-gateway-smoke.yml',
      status:'completed',conclusion:'failure',event:'workflow_dispatch',html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions',
      created_at:ago(48),run_started_at:ago(47),updated_at:ago(44),engine_id:'GW-001',company_id:'fenix-capital',environment:'PREPROD',version:'v0',
      source:'GITHUB_ACTIONS',provenance:'REAL',company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',
      progress_percent:100,progress_completed_steps:3,progress_total_steps:4,current_step:'Smoke finalizado con incidencia',next_step:'Revisar evidencia antes de reintento',progress_provenance:'TERMINAL_STATUS'
    }
  ];
}

export async function fetchCerebroActivity():Promise<{status:number;data:CerebroActivityResponse|null}>{
  return {
    status:200,
    data:{
      status:'OK',
      observed_at:new Date().toISOString(),
      source:'GITHUB_ACTIONS',
      source_status:'CACHED',
      repository:'VISUAL_QA_FIXTURE_ONLY',
      runs:fixtureRuns()
    }
  };
}
