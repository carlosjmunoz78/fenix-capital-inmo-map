/**
 * CEREBRO FACT-001 / SOC-001 · Autonomous social image creative brief compiler V0.
 * Input is an authenticated CEREBRO work order, never hand-authored ChatGPT output.
 * Pure code: compiles a photographic AI scene prompt, stable composition copy,
 * brand obligations and evaluation gates. No API, publishing, or costs.
 */
import { createHash } from 'node:crypto';

const HOST='fenixcapital.es';
const PALETTE=Object.freeze({
  orange:'#FF5F00',yellow:'#FFB71B',dark:'#222222',white:'#FFFFFF',purple:'#870064'
});
const VALID_STAGES=new Set(['TOFU','MOFU','BOFU']);
const VALID_PERSONAS=new Set(['particulares','inmobiliarias']);
const FONT_GUIDE='geometric contemporary sans serif with excellent small mobile legibility';
const OFFICIAL_LOGO='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const URL_WORDS=/https?:\/\/[^\s"']+/g;

export function validateProductionUrl(raw){
  if(typeof raw!=='string'||!raw.trim())throw Error('PRODUCTION_URL_MISSING');
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.hostname!==HOST||u.username||u.password||u.port||u.hash)throw Error('PRODUCTION_HOST_ONLY');
  if(u.pathname.startsWith('//')||u.pathname.includes('..'))throw Error('URL_PATH_DENIED');
  return u.toString();
}

function field(value,label,max=400){
  if(typeof value!=='string'||value.trim().length<3||value.length>max)throw Error('INVALID_'+label);
  return value.trim();
}
function exactSha256(s){return createHash('sha256').update(s).digest('hex');}

export function buildCerebroCreativeOrder(input){
  if(!input||typeof input!=='object')throw Error('BRIEF_REQUIRED');
  const companyId=field(input.company_id,'COMPANY',70);
  if(companyId!=='fenix-capital')throw Error('BRAND_PROFILE_NOT_BOUND_FOR_COMPANY');
  const engineId=field(input.engine_id,'ENGINE',70);
  if(engineId!=='SOC-001')throw Error('SOCIAL_ENGINE_DENIED');
  const env=field(input.environment,'ENVIRONMENT',20).toUpperCase();
  if(env!=='LAB'&&env!=='PREPROD')throw Error('PROD_NOT_AUTHORIZED');
  if(!VALID_STAGES.has(input.funnel_stage))throw Error('FUNNEL_STAGE_REQUIRED');
  if(!VALID_PERSONAS.has(input.audience))throw Error('AUDIENCE_UNSUPPORTED');
  if(input.audience==='inmobiliarias'&&!input.destination_url.includes('/inmobiliarias/'))throw Error('B2B_DESTINATION_MISMATCH');
  if(input.audience==='particulares'&&input.destination_url.includes('/inmobiliarias/'))throw Error('B2C_DESTINATION_MISMATCH');
  const topic=field(input.topic,'TOPIC',140);
  const hook=field(input.hook,'HOOK',170);
  const headline=field(input.headline,'IMAGE_HEADLINE',78);
  const subtitle=field(input.subtitle,'IMAGE_SUBTITLE',90);
  const cta=field(input.cta,'CTA',95);
  const photoDescription=field(input.photo_description,'PHOTO_DESCRIPTION',600);
  const key=field(input.content_key,'CONTENT_KEY',110);
  if(!/^[a-z0-9][a-z0-9-]{9,109}$/.test(key))throw Error('CONTENT_KEY_UNSAFE');
  const destination=validateProductionUrl(input.destination_url);
  const imageText='No typography, no captions, no logos, no phoenix bird, no watermarks, no UI cards, no fake signs, no fake reviews, no people with visible faces.';
  const prompt=[
    'Create a top-tier photorealistic editorial real-estate photograph for an authentic Spanish residential advisory brand.',
    'Frame: premium modern Mediterranean residential architecture in southern Spain, believable and inviting, natural warm afternoon light, well composed architectural photography, authentic materials, tasteful visual storytelling.',
    'Scene: '+photoDescription+'.',
    'Purpose: '+topic+'. Target audience: '+(input.audience==='inmobiliarias'?'real-estate agency professionals':'home buyers')+'.',
    'Magazine-quality photography, realistic perspective, coherent building geometry, elegant landscaping, warm natural highlights, space for clean editorial text overlay in the LOWER HALF, clear negative space near top-right corner for later logo composition.',
    'Avoid sensational claims, invented recognisable Córdoba landmarks, misleading documentary evidence or claims that a depicted property is for sale.',
    'ABSOLUTE: '+imageText,
    'Output ONLY a photographic background. The authoritative CEREBRO compositor adds REAL Fénix branding, text and CTA from the approved work order after image generation. No AI-rendered text or logo.',
  ].join('\n');
  const copyForGraphic={headline,subtitle,cta,brand_label:'FÉNIX CAPITAL',font_guide:FONT_GUIDE};
  const identity={
    company_id:companyId,engine_id:engineId,environment:env,version:'v0',
    source:'CEREBRO_FACT001_WORK_ORDER',
    request_key:key,channel:'FACEBOOK',output_type:'SQUARE_POST',
    visual_department:'PRODUCTORA_AUDIOVISUAL',
    requesting_department:'SOC001_FACEBOOK',
    creative_owner:'CEREBRO_FACT001',
    audience:input.audience,funnel_stage:input.funnel_stage,
    destination_url:destination,topic,hook,
    copy:copyForGraphic,brand:{
      official_logo_url:OFFICIAL_LOGO,palette:PALETTE,
      orange_first:true,purple_microaccent_only:true,logo_on_light_surface:true,
      official_logo_must_be_composited_from_source:true
    },
    ai_scene_request:{model:'gpt-image-2.5-flare',size:'1024x1024',quality:'high',output_format:'png',n:1,prompt},
    policy:{
      publish_authorized:false,buffer_authorized:false,wordpress_prod_write:false,
      tool_is_not_director:true,independent_qa_required:true,
      third_party_media_forbidden:true,synthetic_property_not_actual_listing:true,
      default_additional_cost_eur:0,paid_execution_requires_MONEY_LIMIT_clearance:true,
      never_publish_staging_url:true,never_generate_fake_logo:true
    },
    gates:['CREATIVE_PROMPT_REVIEW','OPENAI_IMAGE_GENERATION_COST_APPROVAL',
      'IMAGE_NOT_SLIDE_VISUAL_QUALITY','PHOTO_REALISM','LOGO_REAL_ALPHA','LOGO_ON_LIGHT_SURFACE',
      'ORANGE_DOMINANT_PURPLE_MINIMAL','COPY_HOOK_CTA','FUNNEL_MATCH','ACCESSIBILITY',
      'RIGHTS_AND_PROVENANCE','EVA001_INDEPENDENT','SOC001_AUTHORIZATION','NATIVE_POST_PROOF']
  };
  return Object.freeze({...identity,prompt_sha256:exactSha256(prompt),work_order_sha256:exactSha256(JSON.stringify(identity))});
}
export const CEREBRO_IMAGE_BRIDGE_V0=Object.freeze({
  owner_engine:'FACT-001',consumer_engine:'SOC-001',version:'v0',
  independent_visual_department:'PRODUCTORA_AUDIOVISUAL',
  prompt_origin:'CEREBRO_AUTHENTICATED_WORK_ORDER',model:'gpt-image-2.5-flare',
  api_spend_default_eur:0,publish_authorized:false
});
