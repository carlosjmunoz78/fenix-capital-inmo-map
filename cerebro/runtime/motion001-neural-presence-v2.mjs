const ENGINE_ID='MOTION-001';
const ALLOWED_ENVS=new Set(['LAB','PREPROD']);
const STATES=new Set(['IDLE','LISTENING','PROCESSING','SPEAKING','HUMAN_REQUIRED','DEGRADED','ERROR']);

export const NEURAL_PRESENCE_PALETTE=Object.freeze({
  base:Object.freeze(['DEEP_NAVY_BLACK','ELECTRIC_BLUE','CYAN','WHITE']),
  human_required:'AMBER_FOCAL_ONLY',
  error:'RED_FOCAL_ONLY',
  rainbow_per_engine:false
});

export const NEURAL_PRESENCE_STATE_PROFILE=Object.freeze({
  IDLE:Object.freeze({density:1.00,links:.20,pulse:.16,energy:.46,rotation:.00032,breathing:.012,mode:'NORMAL'}),
  LISTENING:Object.freeze({density:1.00,links:.28,pulse:.42,energy:.62,rotation:.00022,breathing:.018,mode:'INBOUND'}),
  PROCESSING:Object.freeze({density:1.00,links:.42,pulse:.78,energy:.78,rotation:.00048,breathing:.020,mode:'DISTRIBUTED'}),
  SPEAKING:Object.freeze({density:1.00,links:.32,pulse:.70,energy:.72,rotation:.00026,breathing:.024,mode:'OUTBOUND'}),
  HUMAN_REQUIRED:Object.freeze({density:1.00,links:.26,pulse:.48,energy:.68,rotation:.00016,breathing:.012,mode:'HUMAN_FOCAL'}),
  DEGRADED:Object.freeze({density:.48,links:.10,pulse:.10,energy:.30,rotation:.00012,breathing:.006,mode:'DEGRADED'}),
  ERROR:Object.freeze({density:.82,links:.14,pulse:.26,energy:.42,rotation:.00010,breathing:.006,mode:'ERROR_FOCAL'})
});

const HUMAN_REASONS=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function text(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim()}
function state(v){const s=text(v,'state').toUpperCase();if(!STATES.has(s))throw new Error('unsupported neural presence state');return s}
function env(v){const e=text(v,'environment').toUpperCase();if(!ALLOWED_ENVS.has(e))throw new Error('neural presence V2 refuses non-LAB/PREPROD environment');return e}

export function buildNeuralPresencePlan({company_id,state:rawState,environment='PREPROD',version='v2',reduced_motion=false,device_class='AUTO',human_required_reason=null}={}){
  const s=state(rawState);const e=env(environment);const company=text(company_id,'company_id');const device=text(device_class,'device_class').toUpperCase();
  if(!['AUTO','FULL','CONSERVE'].includes(device))throw new Error('device_class unsupported');
  if(s==='HUMAN_REQUIRED'&&!HUMAN_REASONS.has(human_required_reason??''))throw new Error('noncanonical HUMAN_REQUIRED reason');
  let p={...NEURAL_PRESENCE_STATE_PROFILE[s]};
  if(reduced_motion){p={...p,rotation:0,breathing:0,pulse:0,links:Math.min(p.links,.12)};}
  if(device==='CONSERVE'){p={...p,density:Math.min(p.density,.58),links:Math.min(p.links,.12),energy:Math.min(p.energy,.46)};}
  return Object.freeze({
    schema_version:'2.0.0',state_type:'CEREBRO_NEURAL_PRESENCE_PLAN',company_id:company,engine_id:ENGINE_ID,environment:e,version:text(version,'version'),state:s,
    renderer:'SELF_CONTAINED_PROCEDURAL_PARTICLE_GRAPH',geometry:'EMERGENT_BRAIN_FROM_PARTICLE_DENSITY_AND_NEGATIVE_SPACE',node_budget:device==='CONSERVE'?650:1250,
    parameters:Object.freeze(p),palette:NEURAL_PRESENCE_PALETTE,reduced_motion:Boolean(reduced_motion),device_class:device,
    human_required_reason:s==='HUMAN_REQUIRED'?human_required_reason:null,
    raw_content_required:false,customer_pii_required:false,secret_payload_required:false,
    prod_authorized:false,prod_write_authorized:false,automatic_promotion:false,trading_access:false,additional_cost_eur:0
  });
}

export function buildNeuralRegionActivity({state:rawState,region_id,intensity=.5,exception=false}={}){
  const s=state(rawState);const region=text(region_id,'region_id');const n=Number(intensity);if(!Number.isFinite(n)||n<0||n>1)throw new Error('intensity invalid');
  let accent='BASE_BLUE_CYAN_WHITE';
  if(s==='HUMAN_REQUIRED'&&exception)accent='AMBER_FOCAL_ONLY';
  if(s==='ERROR'&&exception)accent='RED_FOCAL_ONLY';
  return Object.freeze({engine_id:ENGINE_ID,state:s,region_id:region,intensity:Math.round(n*1000)/1000,accent,whole_brain_recolor:false,flashing:false});
}

export function phase1V2AcceptanceSummary(){
  return Object.freeze({
    engine_id:ENGINE_ID,version:'v2',status:'PROCEDURAL_PROTOTYPE_USABLE_NOT_LIVE_CONNECTED',
    requirements:Object.freeze({procedural_nodes:true,procedural_links:true,travelling_pulses:true,depth_projection:true,pointer_parallax:true,state_driven_behavior:true,reduced_motion:true,external_dependencies:0}),
    preserves_phase1_v1_as_old_and_fallback:true,prod_authorized:false,additional_cost_eur:0
  });
}
