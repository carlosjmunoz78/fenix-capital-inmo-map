import crypto from 'node:crypto';
import { orchestrateCreativeStudioV1 } from './creative-studio-orchestrator-v1.mjs';
import { superviseStudioScriptV1 } from './creative-studio-script-supervisor-v1.mjs';

function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function arr(v){return Array.isArray(v)?v:[]}
function req(v,n,max=220){const s=String(v??'').replace(/\s+/g,' ').trim();if(!s)throw new Error(`CAMPAIGN_${n}_REQUIRED`);if(s.length>max)throw new Error(`CAMPAIGN_${n}_TOO_LONG`);return s}
function id(seed){return crypto.createHash('sha256').update(seed).digest('hex').slice(0,12)}

export function buildStudioCampaignV1(input={}){
  const brief=obj(input.brief),assets=obj(input.assets),company_id=String(input.company_id||'fenix'),environment=String(input.environment||'PREPROD').toUpperCase();
  const objective=req(brief.objective||'Earn attention and convert without sounding like training','OBJECTIVE'),audience=req(brief.audience||'People considering buying a home','AUDIENCE'),desire=req(brief.desire||'Ves la casa y ya te imaginas viviendo allí','DESIRE'),pressure=req(brief.pressure||'hay que reservar hoy','PRESSURE'),truth=req(brief.truth||'primero conviene comprobar que la operación encaja contigo y con la vivienda','TRUTH'),benefit=req(brief.benefit||'puedes decidir con ilusión y sin ir a ciegas','BENEFIT'),cta=req(brief.cta||'Cuéntanos tu caso y lo miramos contigo','CTA',120);
  if(arr(assets.visual_sources).length<3)throw new Error('CAMPAIGN_VISUAL_DIVERSITY_REQUIRED');if(arr(assets.video_sources).length<3)throw new Error('CAMPAIGN_VIDEO_DIVERSITY_REQUIRED');
  const seed=[company_id,objective,audience,desire,pressure,truth,benefit,cta].join('|'),campaign_id=`CMP-${id(seed)}`;
  const bible=Object.freeze({campaign_id,company_id,environment,version:'v1',creative_platform:'ILUSION_SIN_IR_A_CIEGAS',human_tension:`${desire}. Pero aparece la presión: “${pressure}”.`,promise:benefit,truth,cta,tone:['HUMANO','ENERGICO','CERCANO','CONFIADO','NO_DIDACTICO'],forbidden_tone:['CURSO','CHECKLIST_NUMERADO','CORPORATE_STIFF','GENERIC_AI'],visual_language:['LIVE_ACTION_FIRST','PREMIUM_SUBTLE_BRAND','FAST_PATTERN_INTERRUPTS','HUMAN_REACTIONS','NO_REPEATED_SLASH'],audio_language:['CONVERSATIONAL_VOICE','MUSIC_WITH_PULSE','AUDIBLE_SFX','SILENCE_ONLY_FOR_INTENT'],continuity_rules:['Same human tension across formats','Same payoff and CTA family','No format contradicts another','Long form may explain more but must remain narrative'],publish_authorized:false,additional_cost_eur:0});
  const base={objective,audience,desire,pressure,truth,benefit,cta};
  const videos={};for(const [key,output_type,channel] of [['story','STORY_VIDEO','INSTAGRAM'],['reel','REEL','INSTAGRAM'],['long','LONG_VIDEO','FACEBOOK']]){let p=orchestrateCreativeStudioV1({company_id,environment,brief:{...base,output_type,channel},assets});p=superviseStudioScriptV1(p);videos[key]=p;}
  const staticPost={output_type:'STATIC_POST',channel:'INSTAGRAM',creative_concept:'RELATABLE_TURN',headline:'Te encanta. Perfecto. Ahora que también encaje contigo.',subheadline:'La ilusión no está reñida con mirar la operación con cabeza.',cta,visual_source:arr(assets.visual_sources)[0],brand_presence:'PREMIUM_SUBTLE'};
  const squarePost={output_type:'SQUARE_POST',channel:'FACEBOOK',creative_concept:'MICRO_DRAMA',headline:`“${pressure}” no decide por ti`,subheadline:'Primero comprueba que la operación encaja. Si encaja, entonces sí: a por ella.',cta,visual_source:arr(assets.visual_sources)[1],brand_presence:'PREMIUM_SUBTLE'};
  const carousel={output_type:'CAROUSEL',channel:'INSTAGRAM',creative_concept:'STORY_CAROUSEL',pages:[
    {beat:'HOOK',headline:'La ves. Te encanta. Ya estás dentro.',body:'Hasta aquí, todo bien.'},
    {beat:'PRESSURE',headline:`Y aparece: “${pressure}”.`,body:'Aquí es donde la prisa quiere decidir por ti.'},
    {beat:'TURN',headline:'Freno. No mates la ilusión.',body:'Solo comprueba que la operación encaja de verdad.'},
    {beat:'PAYOFF',headline:'¿Encaja?',body:'Entonces sí: aceleramos contigo.'},
    {beat:'CTA',headline:'Que la emoción siga siendo emoción.',body:cta}
  ],visual_sources:arr(assets.visual_sources).slice(0,4),brand_presence:'PREMIUM_SUBTLE'};
  const slate=Object.freeze({static_post:staticPost,square_post:squarePost,carousel,story:videos.story.selected_plan,reel:videos.reel.selected_plan,long_video:videos.long.selected_plan});
  return Object.freeze({schema_version:'1.0.0',campaign_id,company_id,engine_id:'CREATIVE-STUDIO-001',environment,version:'v1',studio_mode:'CEREBRO_STUDIO_GRADE',campaign_bible:bible,slate,video_productions:videos,format_count:6,autonomous:true,publish_authorized:false,additional_cost_eur:0,rollback:'V2.4_SOCIAL_FIRST'});
}

export const CREATIVE_STUDIO_CAMPAIGN_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',single_campaign_bible:true,formats:['STATIC_POST','SQUARE_POST','CAROUSEL','STORY_VIDEO','REEL','LONG_VIDEO'],cross_format_continuity:true,video_showrunner:true,script_supervision:true,publication_authority:false,additional_cost_eur:0});
