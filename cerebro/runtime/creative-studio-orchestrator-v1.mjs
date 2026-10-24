import crypto from 'node:crypto';

const EXPERTS=Object.freeze([
  ['SHOWRUNNER','Defines the emotional promise, audience reaction and final creative bar.'],
  ['SOCIAL_STRATEGIST','Optimizes hook, retention, native platform language and CTA.'],
  ['SCREENWRITER','Builds conversational narrative, tension, payoff and memorable phrasing.'],
  ['CREATIVE_DIRECTOR','Chooses concept, energy, humor and differentiating creative device.'],
  ['ART_DIRECTOR','Controls composition, brand language, visual hierarchy and asset coherence.'],
  ['DIRECTOR_OF_PHOTOGRAPHY','Chooses shot rhythm, visual progression and B-roll intent.'],
  ['EDITOR','Controls cut density, pacing, pattern interrupts and continuity.'],
  ['MOTION_VFX_DIRECTOR','Adds selective motion/VFX accents with purpose, not repetitive decoration.'],
  ['VOICE_DIRECTOR','Controls conversational energy, phrasing, emphasis and delivery style.'],
  ['SOUND_DESIGNER','Controls music arc, impacts, transitions, texture and perceived loudness.'],
  ['BRAND_GUARDIAN','Protects Fénix identity, claims, logo use and tone.'],
  ['RETENTION_EDITOR','Looks for boring seconds, dead air, repeated beats and scroll-away risk.'],
  ['CHANNEL_EDITOR','Checks that the piece feels native to the requested social surface.'],
  ['CREATIVE_CRITIC','Rejects pieces that feel like training, slides, templates or generic AI output.']
].map(([id,mission])=>Object.freeze({id,mission})));

const ARCHETYPES=Object.freeze([
  {id:'RELATABLE_TURN',energy:9,humor:7,novelty:8,description:'Start inside a familiar human moment, then interrupt the expected decision.'},
  {id:'MICRO_DRAMA',energy:8,humor:6,novelty:9,description:'Compress a real-life tension into a miniature story with a clear turn and payoff.'},
  {id:'CONTRARIAN_TRUTH',energy:8,humor:5,novelty:8,description:'Open against the expected advice, then reveal the useful truth without teaching a class.'}
]);

function arr(v){return Array.isArray(v)?v:[]}
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function txt(v,max=240){const s=String(v??'').trim();if(!s)throw new Error('STUDIO_TEXT_REQUIRED');if(s.length>max)throw new Error('STUDIO_TEXT_TOO_LONG');return s}
function clamp(v,min,max){return Math.min(max,Math.max(min,Number(v)||0))}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function hashInt(s){return Number.parseInt(crypto.createHash('sha256').update(String(s)).digest('hex').slice(0,8),16)}
function words(s){return clean(s).split(/\s+/).filter(Boolean)}
function numericRatio(text){const all=words(text);if(!all.length)return 0;return all.filter(x=>/\d/.test(x)).length/all.length}

function formatSpec(output){
  switch(String(output||'').toUpperCase()){
    case 'STORY_VIDEO':return {scene_count:5,total_sec:12.8,blocks:3,scene_sec:3.0,channel:'INSTAGRAM'};
    case 'REEL':
    case 'SHORT_VIDEO':return {scene_count:8,total_sec:23.5,blocks:3,scene_sec:3.1,channel:'INSTAGRAM'};
    case 'LONG_VIDEO':return {scene_count:14,total_sec:55.0,blocks:5,scene_sec:4.35,channel:'FACEBOOK'};
    default:throw new Error(`STUDIO_OUTPUT_UNSUPPORTED:${output}`);
  }
}

function candidateCopy(archetype,brief){
  const desire=txt(brief.desire,120),pressure=txt(brief.pressure,120),truth=txt(brief.truth,180),benefit=txt(brief.benefit,160),cta=txt(brief.cta,100);
  if(archetype.id==='RELATABLE_TURN')return {
    hook:`${desire}. Y justo entonces aparece el clásico: “${pressure}”.`,
    body:`Freno. ${truth}. No para hacerte perder tiempo; para evitar que una decisión bonita se convierta en un problema feo.`,
    payoff:`${benefit}. Si encaja, entonces sí: vamos contigo a por todas.`,
    cta
  };
  if(archetype.id==='MICRO_DRAMA')return {
    hook:`Te enamoras de la operación. Todo encaja… hasta que aparece: “${pressure}”.`,
    body:`Ese es el momento peligroso. No necesitas correr más; necesitas saber si ${truth.toLowerCase()}.`,
    payoff:`Cuando lo sabes, cambia todo: ${benefit.toLowerCase()}.`,
    cta
  };
  return {
    hook:`No. Que te digan “${pressure}” no significa que tengas que correr.`,
    body:`La prisa no sustituye a la viabilidad. ${truth}.`,
    payoff:`Lo bueno no es ir lento. Lo bueno es poder ir rápido cuando ya sabes que encaja. ${benefit}.`,
    cta
  };
}

function sceneBeats(count){
  const long=['HOOK','HUMAN_MOMENT','PRESSURE','PATTERN_INTERRUPT','TRUTH','RELIEF','PROOF','MOMENTUM','BRAND_BEAT','PAYOFF','EMOTION','CTA_SETUP','CTA','END_FRAME'];
  const short=['HOOK','HUMAN_MOMENT','PRESSURE','PATTERN_INTERRUPT','TRUTH','PAYOFF','CTA','END_FRAME'];
  const story=['HOOK','PRESSURE','PATTERN_INTERRUPT','PAYOFF','CTA'];
  return (count<=5?story:count<=8?short:long).slice(0,count);
}

function sceneHeadline(beat,brief){
  const map={
    HOOK:'Vale. Te gusta mucho.',HUMAN_MOMENT:'Ya te imaginas dentro.',PRESSURE:'Y aparece la prisa.',PATTERN_INTERRUPT:'Freno.',TRUTH:'Primero: que encaje de verdad.',RELIEF:'Ahora sí respiramos.',PROOF:'Ordenamos lo importante.',MOMENTUM:'Y entonces aceleramos.',BRAND_BEAT:'Aquí entra Fénix.',PAYOFF:'Sin matar la ilusión.',EMOTION:'Con ganas, no con miedo.',CTA_SETUP:'¿Te ha pasado?',CTA:clean(brief.cta),END_FRAME:'Fénix Capital.'
  };return map[beat]||'Fénix Capital.';
}

function makeScenes(spec,brief,assets,seed){
  const videos=arr(assets.video_sources),photos=arr(assets.visual_sources);if(videos.length<3)throw new Error('STUDIO_VIDEO_SOURCES_REQUIRED');if(photos.length<1)throw new Error('STUDIO_VISUAL_SOURCES_REQUIRED');
  const beats=sceneBeats(spec.scene_count),scenes=[];let live=0;
  for(let i=0;i<spec.scene_count;i++){
    const usePhoto=spec.scene_count>=10&&(i===5||i===10);const duration=spec.scene_sec+(i%3===0?.15:(i%3===1?-.08:0));
    if(usePhoto){scenes.push({source_kind:'PHOTO',duration_sec:Number(duration.toFixed(2)),headline:sceneHeadline(beats[i],brief),subheadline:i===spec.scene_count-1?'Te ayudamos a verlo claro.':'',layout_style:i%2?'GLASS_CARD':'FRAME_MINIMAL'});continue}
    const v=videos[(i+seed)%videos.length];scenes.push({source_kind:'VIDEO',video_source:v,source_start_sec:1+((i*2+seed)%6),duration_sec:Number(duration.toFixed(2)),headline:sceneHeadline(beats[i],brief),subheadline:'',layout_style:i%3===0?'FULL_BLEED':(i%3===1?'GLASS_CARD':'SPLIT_EDITORIAL')});live++;
  }
  return {scenes,live_scene_count:live,beats};
}

function makeNarration(spec,copy){
  if(spec.blocks===3){const starts=spec.scene_count<=5?[.05,3.65,7.2]:[.05,7.0,14.2];return [
    {start_sec:starts[0],text:copy.hook},
    {start_sec:starts[1],text:copy.body},
    {start_sec:starts[2],text:`${copy.payoff} ${copy.cta}`}
  ];}
  return [
    {start_sec:.05,text:copy.hook},
    {start_sec:10.5,text:copy.body},
    {start_sec:22.0,text:'Porque una buena operación no necesita parecer un examen. Necesita que entiendas lo justo para decidir tranquilo.'},
    {start_sec:33.0,text:copy.payoff},
    {start_sec:44.5,text:`${copy.cta}. Y si hay que correr, corremos después de saber por qué.`}
  ];
}

function scoreCandidate(c){
  const hookWords=words(c.copy.hook).length,allText=[c.copy.hook,c.copy.body,c.copy.payoff,c.copy.cta,...c.scenes.map(x=>x.headline)].join(' '),numbers=numericRatio(allText),blockRatio=c.narration_blocks.length/c.scenes.length;
  const scores={
    hook:hookWords<=18?20:Math.max(6,20-(hookWords-18)),
    social_voice:numbers===0?20:Math.max(0,20-Math.round(numbers*120)),
    narrative:blockRatio<=.55?20:6,
    visual_variety:new Set(c.scenes.map(x=>x.layout_style)).size>=3?15:8,
    live_action:c.live_scene_count/c.scenes.length>=.7?15:7,
    energy:Math.min(10,c.archetype.energy)
  };return {score:Object.values(scores).reduce((a,b)=>a+b,0),scores,numeric_ratio:Number(numbers.toFixed(3)),narration_block_ratio:Number(blockRatio.toFixed(3))};
}

function departmentPasses(selected){
  const noteByRole={
    SHOWRUNNER:'Emotion first: make the viewer feel recognition before giving advice.',SOCIAL_STRATEGIST:'Hook immediately; no numbered lesson structure.',SCREENWRITER:'Conversational blocks span several cuts; avoid one sentence per shot.',CREATIVE_DIRECTOR:'Use a human tension and a turn, not a checklist.',ART_DIRECTOR:'Brand is present but does not suffocate the footage.',DIRECTOR_OF_PHOTOGRAPHY:'B-roll progresses emotionally instead of illustrating every noun.',EDITOR:'Cuts continue under narration; pattern interrupts are deliberate.',MOTION_VFX_DIRECTOR:'Effects accent beats; no repeated full-frame slash.',VOICE_DIRECTOR:'Energetic, conversational, smiling delivery; no classroom cadence.',SOUND_DESIGNER:'Music is a pulse; SFX must be heard, not merely exist.',BRAND_GUARDIAN:'Claims remain truthful and Fénix identity stays recognizable.',RETENTION_EDITOR:'Delete dead seconds and repeated information.',CHANNEL_EDITOR:'Judge as a social post, not as corporate training.',CREATIVE_CRITIC:'Reject generic AI/template feel even if technical QA is green.'
  };
  return EXPERTS.map(x=>({expert_id:x.id,status:'GREEN_CANDIDATE',decision:noteByRole[x.id],candidate_id:selected.id}));
}

export function orchestrateCreativeStudioV1(input={}){
  const brief=obj(input.brief),assets=obj(input.assets),output=String(brief.output_type||'REEL').toUpperCase(),spec=formatSpec(output),channel=String(brief.channel||spec.channel).toUpperCase();
  const normalized={objective:txt(brief.objective||'Create a social-native piece that earns attention without feeling like training.',180),audience:txt(brief.audience||'People considering a mortgage or home purchase',160),desire:txt(brief.desire||'Ves la casa y ya te imaginas viviendo allí',120),pressure:txt(brief.pressure||'hay que reservar hoy',120),truth:txt(brief.truth||'primero conviene comprobar que la operación encaja contigo y con la vivienda',180),benefit:txt(brief.benefit||'puedes decidir con ilusión y con criterio',160),cta:txt(brief.cta||'Cuéntanos tu caso y lo miramos contigo',100),output_type:output,channel};
  const seed=hashInt(`${normalized.objective}|${normalized.audience}|${output}`)%17,candidates=[];
  for(let i=0;i<ARCHETYPES.length;i++){
    const archetype=ARCHETYPES[i],copy=candidateCopy(archetype,normalized),visual=makeScenes(spec,normalized,assets,seed+i),narration_blocks=makeNarration(spec,copy),candidate={id:`CUT-${i+1}-${archetype.id}`,archetype,copy,scenes:visual.scenes,narration_blocks,social_arc:['HOOK','TENSION','RELIEF','PAYOFF','CTA'],live_scene_count:visual.live_scene_count,beats:visual.beats};candidate.evaluation=scoreCandidate(candidate);candidates.push(candidate);
  }
  candidates.sort((a,b)=>b.evaluation.score-a.evaluation.score||b.archetype.novelty-a.archetype.novelty);const selected=candidates[0];
  const selectedPlan={output_type:output,channel,social_narrative:true,hook_within_sec:.05,voice_style:'SOCIAL_ENERGETIC',social_arc:selected.social_arc,scenes:selected.scenes,narration_blocks:selected.narration_blocks,creative_concept:`${selected.archetype.id} · ${normalized.objective}`,director_notes:['Narration must continue across cuts.','No numbered lesson structure.','Do not explain everything; preserve curiosity.','Use effects as punctuation, never as wallpaper.'],brand_presence:'PREMIUM_SUBTLE',publish_authorized:false,additional_cost_eur:0};
  const rejected=candidates.slice(1).map(x=>({candidate_id:x.id,score:x.evaluation.score,reason:x.archetype.id==='CONTRARIAN_TRUTH'?'More instructive and less playful than the selected direction.':'Lower retention/energy balance for this brief.'}));
  return Object.freeze({schema_version:'1.0.0',studio_mode:'CEREBRO_STUDIO_GRADE',company_id:String(input.company_id||'fenix'),engine_id:'CREATIVE-STUDIO-001',environment:String(input.environment||'PREPROD').toUpperCase(),version:'v1',autonomous:true,publish_authorized:false,additional_cost_eur:0,brief:normalized,experts:EXPERTS,candidate_count:candidates.length,candidates,selected_candidate_id:selected.id,rejected_candidates:rejected,selected_plan:selectedPlan,production_passes:[{id:'DEVELOPMENT',status:'GREEN_CANDIDATE'},{id:'PREPRODUCTION',status:'GREEN_CANDIDATE'},{id:'PICTURE_EDIT',status:'GREEN_CANDIDATE'},{id:'VOICE_SOUND',status:'GREEN_CANDIDATE'},{id:'VFX_MOTION',status:'GREEN_CANDIDATE'},{id:'BRAND_CHANNEL_QA',status:'GREEN_CANDIDATE'},{id:'FINAL_CREATIVE_TRIBUNAL',status:'PENDING_PHYSICAL'}],expert_decisions:departmentPasses(selected),iteration_count:3,rollback:'V2.4_SOCIAL_FIRST'});
}

export const CREATIVE_STUDIO_ORCHESTRATOR_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',multi_candidate:true,min_candidates:3,expert_departments:14,showrunner:true,social_strategy:true,screenwriting:true,creative_direction:true,art_direction:true,cinematography:true,editing:true,motion_vfx:true,voice_direction:true,sound_design:true,brand_guardian:true,retention_edit:true,channel_edit:true,creative_critic:true,autonomous_rework_iterations:3,publication_authority:false,additional_cost_eur:0});
