import crypto from 'node:crypto';

const VARIANTS=new Set([
  'NORMAL_COOPERATIVE',
  'AMBIGUOUS_INCOMPLETE',
  'FRICTION_HIGH_LOAD',
  'ADVERSARIAL_CONTRADICTORY'
]);

function reqString(value,label,{max=2000}={}){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const out=value.trim();
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}
function arr(value,label,{maxItems=30,maxLen=1000}={}){
  const input=value==null?[]:value;
  if(!Array.isArray(input)||input.length>maxItems) throw new Error(`${label} invalid`);
  return input.map((item,index)=>reqString(item,`${label}[${index}]`,{max:maxLen}));
}
function stableHash(value){
  return crypto.createHash('sha256').update(JSON.stringify(value),'utf8').digest('hex');
}

export function buildHumanProfile({scenario,variant,seed}){
  if(!scenario||typeof scenario!=='object'||Array.isArray(scenario)) throw new Error('scenario object required');
  const scenario_id=reqString(scenario.scenario_id,'scenario_id',{max:160});
  const role=reqString(scenario.role,'role',{max:160});
  const objective=reqString(scenario.objective,'objective');
  const channel=reqString(scenario.channel??'CONSOLE','channel',{max:40}).toUpperCase();
  const variantId=reqString(variant,'variant',{max:80}).toUpperCase();
  if(!VARIANTS.has(variantId)) throw new Error(`unsupported variant:${variantId}`);
  const stableSeed=reqString(seed,'seed',{max:160});
  const initial_message=reqString(scenario.initial_message,'initial_message');

  const known_information=arr(scenario.known_information,'known_information');
  const hidden_until_asked=arr(scenario.hidden_until_asked,'hidden_until_asked');
  const objections=arr(scenario.objections,'objections');
  const boundaries=arr(scenario.boundaries,'boundaries');
  const completion_condition=reqString(scenario.completion_condition,'completion_condition');
  const knowledge_level=reqString(scenario.knowledge_level??'MEDIUM','knowledge_level',{max:40}).toUpperCase();
  const urgency=reqString(scenario.urgency??'NORMAL','urgency',{max:40}).toUpperCase();
  const communication_style=reqString(scenario.communication_style??'NEUTRAL','communication_style',{max:80}).toUpperCase();

  const hidden_state={
    objective,
    known_information,
    hidden_until_asked,
    objections,
    boundaries,
    completion_condition,
    knowledge_level,
    urgency,
    communication_style,
    variant:variantId,
    seed:stableSeed
  };
  const hidden_state_hash=stableHash(hidden_state);

  const simulator_state=Object.freeze({
    schema_version:'1.0.0',
    scenario_id,
    role,
    channel,
    initial_message,
    hidden_state,
    hidden_state_hash,
    variant:variantId,
    seed:stableSeed,
    environment:'LAB',
    contains_customer_data:false,
    contains_secrets:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  });

  // Actor view intentionally excludes objective, hidden info, objections, completion rubric and seed.
  const actor_view=Object.freeze({
    schema_version:'1.0.0',
    scenario_id,
    role,
    channel,
    initial_message,
    environment:'LAB'
  });

  return Object.freeze({simulator_state,actor_view});
}

export function assertActorViewNoLeak(profile){
  if(!profile?.simulator_state||!profile?.actor_view) throw new Error('profile required');
  const actorJson=JSON.stringify(profile.actor_view);
  const hidden=profile.simulator_state.hidden_state;
  const forbidden=[
    hidden.objective,
    hidden.completion_condition,
    ...hidden.hidden_until_asked,
    ...hidden.objections,
    ...hidden.boundaries
  ].filter(Boolean);
  for(const value of forbidden){
    if(actorJson.includes(String(value))) throw new Error('HUMAN_PROFILE_HIDDEN_STATE_LEAK');
  }
  if('hidden_state' in profile.actor_view||'hidden_state_hash' in profile.actor_view||'seed' in profile.actor_view){
    throw new Error('HUMAN_PROFILE_PRIVATE_FIELD_LEAK');
  }
  return true;
}
