import crypto from 'node:crypto';

const VERSION='1.0.0';
const SAFE_MODES=new Set(['ADVISE','ANALYZE','REVIEW','PLAN','TRANSFORM','GENERATE','VALIDATE','SIMULATE','INTERNAL_BUILD','EXECUTE_INTERNAL']);
const SAFE_TASKS=new Set(['PRODUCT_VIEWER','SCROLL_HERO','PERFORMANCE_AUDIT','3D_TEXT_OVERLAY','GENERIC_SCENE_PLAN']);

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function clean(value,max=2000){return typeof value==='string'?value.trim().slice(0,max):'';}
function bool(v,d=false){return typeof v==='boolean'?v:d;}

function patternFor(task,options={}){
  if(task==='PRODUCT_VIEWER')return {
    components:['Stage','Environment','OrbitControls','ContactShadows','Preload'],
    rationale:['Use staged lighting for a fast product baseline','Keep reflections/environment explicit','Keep navigation constrained for product inspection','Use lightweight grounding shadows','Preload scene assets before presentation'],
    scaffold:`<Stage environment="city" shadows adjustCamera>\n  <Model />\n</Stage>\n<Environment preset="city" />\n<OrbitControls enablePan={false}${bool(options.auto_rotate,true)?' autoRotate':''} />\n<ContactShadows opacity={0.45} blur={2} />\n<Preload all />`
  };
  if(task==='SCROLL_HERO')return {
    components:['ScrollControls','Float','Environment','Preload'],
    rationale:['Drive scene progression from normalized scroll state','Keep hero motion subtle rather than continuous heavy animation','Use an environment layer for readable PBR materials','Preload assets to avoid visible pop-in'],
    scaffold:`<ScrollControls pages={3} damping={0.25}>\n  <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.6}>\n    <HeroScene />\n  </Float>\n</ScrollControls>\n<Environment preset="city" />\n<Preload all />`
  };
  if(task==='PERFORMANCE_AUDIT')return {
    components:['AdaptiveDpr','PerformanceMonitor','Instances','Detailed','Preload'],
    rationale:['Adapt pixel density under pressure','Observe performance before changing quality','Use instancing for repeated geometry','Use level-of-detail for distance-based complexity','Preload known assets'],
    scaffold:`<AdaptiveDpr pixelated />\n<PerformanceMonitor />\n{/* Prefer <Instances> for repeated meshes and <Detailed> for LOD where profiling justifies it. */}\n<Preload all />`
  };
  if(task==='3D_TEXT_OVERLAY')return {
    components:['Text','Html','Billboard'],
    rationale:['Use scene-native text when it belongs in 3D','Use DOM overlay only when real UI semantics are needed','Use billboard behavior for always-facing labels'],
    scaffold:`<Billboard>\n  <Text fontSize={0.5}>Label</Text>\n</Billboard>\n<Html center>\n  <div role="note">Context</div>\n</Html>`
  };
  return {
    components:['Environment','Preload'],
    rationale:['Start with a minimal environment and asset-loading contract','Add helpers only after the scene requirement is explicit'],
    scaffold:`<Environment preset="city" />\n<Preload all />`
  };
}

export function executeDreiInternalCapability({mode='PLAN',request={},context={}}={}){
  if(!SAFE_MODES.has(mode))throw new Error('DREI_MODE_NOT_SAFE_INTERNAL');
  const task=String(request?.task??'GENERIC_SCENE_PLAN').toUpperCase();
  if(!SAFE_TASKS.has(task))throw new Error('DREI_TASK_NOT_SUPPORTED');
  if(/TRAD|TRADING/i.test(String(context?.engine_id??'')))throw new Error('TRADING_BINDING_DENIED');
  const pattern=patternFor(task,request?.options??{});
  const goal=clean(request?.goal,800);
  const result={
    schema_version:'1.0.0',
    state_type:'CEREBRO_INTERNAL_SKILL_EXECUTION_RESULT',
    wrapper_id:'skillwrap:drei-internal-v1',
    wrapper_version:VERSION,
    candidate_id:'repo:fc81dac4018cb6cdf3b2e98a901f',
    technical_name:'drei',
    company_id:String(context?.company_id??'fenix'),
    engine_id:String(context?.engine_id??'WEB-001'),
    environment:'PROD_CAPABILITY',
    mode,
    task,
    goal,
    output:{
      recommended_components:pattern.components,
      rationale:pattern.rationale,
      generated_scaffold:pattern.scaffold,
      requires_dependency_install:false,
      requires_external_execution:false,
      requires_external_side_effect:false
    },
    provenance:{
      implementation_kind:'CEREBRO_INTERNAL_REIMPLEMENTATION_FROM_LICENSED_KNOWLEDGE',
      source_name:'drei',
      source_license:'Apache-2.0',
      source_pinned_sha:'6edcf94159d9f46b0759d2e1b59dd545cfaca254',
      raw_external_skill_code_executed:false
    },
    authority:{
      prod_capability_internal_execution:true,
      prod_write_authorized:false,
      prod_mutation_authorized:false,
      external_side_effects_authorized:false,
      external_skill_code_execution:false,
      dependency_install_authorized:false,
      trading_access:false,
      spend_authorized:false,
      additional_cost_eur:0
    }
  };
  return Object.freeze({...result,result_hash:hash(result)});
}
