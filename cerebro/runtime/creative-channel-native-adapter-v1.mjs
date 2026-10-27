import fs from 'node:fs';
import crypto from 'node:crypto';

const MATRIX=JSON.parse(fs.readFileSync(new URL('../registry/creative-mass-marketing-channel-matrix-v1.json',import.meta.url),'utf8'));
const PROFILES=Object.freeze({
  INSTAGRAM:{aspect:'9:16',hook:'VISUAL_PATTERN_INTERRUPT',cta:'DM_OR_PROFILE',tone:'HUMAN_PREMIUM_FAST',asset_role:'ENTERTAINMENT_CONVERSION'},
  FACEBOOK:{aspect:'4:5_OR_16:9',hook:'RELATABLE_SITUATION',cta:'MESSAGE_OR_SITE',tone:'HUMAN_CONTEXTUAL',asset_role:'TRUST_CONVERSION'},
  LINKEDIN_COMPANY:{aspect:'1:1_OR_16:9',hook:'BUSINESS_CONSEQUENCE',cta:'PARTNER_CONVERSATION',tone:'B2B_EVIDENCE_FIRST',asset_role:'B2B_PARTNERSHIP'},
  YOUTUBE_SHORTS:{aspect:'9:16',hook:'COLD_OPEN_PAYOFF_PROMISE',cta:'WATCH_MORE_OR_SITE',tone:'STORY_DISCOVERY',asset_role:'AWARENESS'},
  YOUTUBE_LONG:{aspect:'16:9',hook:'CINEMATIC_COLD_OPEN',cta:'NEXT_VIDEO_OR_CASE',tone:'STORY_PROOF_RETENTION',asset_role:'TRUST_CONSIDERATION'},
  TIKTOK:{aspect:'9:16',hook:'NATIVE_FIRST_3S',cta:'COMMENT_DM_OR_PROFILE',tone:'HUMAN_NATIVE_SOUND_ON',asset_role:'ENTERTAINMENT_AWARENESS'},
  THREADS:{aspect:'TEXT_FIRST',hook:'OPINION_OR_TENSION',cta:'CONVERSATION',tone:'CONVERSATIONAL_UNPOLISHED',asset_role:'COMMUNITY'},
  PINTEREST:{aspect:'9:16',hook:'SEARCHABLE_VISUAL_DESIRE',cta:'SAVE_OR_SITE',tone:'EVERGREEN_ASPIRATIONAL',asset_role:'DISCOVERY'},
  GOOGLE_BUSINESS_PROFILE:{aspect:'LOCAL_MEDIA',hook:'LOCAL_PROOF',cta:'CALL_MESSAGE_SITE',tone:'REAL_LOCAL_TRUST',asset_role:'LOCAL_TRUST'},
  NEWSLETTER_B2C:{aspect:'EMAIL',hook:'EDITORIAL_SUBJECT_PROMISE',cta:'REPLY_OR_CASE',tone:'HUMAN_EDITORIAL',asset_role:'RETENTION_CONVERSION'},
  NEWSLETTER_B2B:{aspect:'EMAIL',hook:'PARTNER_OUTCOME',cta:'REPLY_OR_MEETING',tone:'PARTNER_EVIDENCE',asset_role:'B2B_PARTNERSHIP'},
  WHATSAPP_BUSINESS:{aspect:'CONVERSATION',hook:'OPTED_IN_CONTEXT',cta:'REPLY',tone:'DIRECT_HUMAN',asset_role:'RETENTION'}
});
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function clean(v,max=420){const s=String(v??'').replace(/\s+/g,' ').trim();if(s.length>max)throw new Error('CHANNEL_NATIVE_TEXT_TOO_LONG');return s}
function channelRecord(id){const x=MATRIX.channels.find(c=>c.id===id);if(!x)throw new Error(`CHANNEL_NOT_REGISTERED:${id}`);return x}
function fingerprint(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,16)}
export function planNativeChannelAssetV1(input={}){
  const channel=String(input.channel||'').toUpperCase(),profile=PROFILES[channel];
  if(!profile)throw new Error(`CHANNEL_NATIVE_PROFILE_MISSING:${channel}`);
  const registry=channelRecord(channel),campaign=obj(input.campaign),brief=obj(campaign.brief||input.brief),bible=obj(campaign.campaign_bible||input.campaign_bible);
  const platform=clean(bible.creative_platform||campaign.creative_platform||'ILUSION_SIN_IR_A_CIEGAS',120);
  const truth=clean(brief.truth||campaign.truth||'',280),benefit=clean(brief.benefit||campaign.benefit||'',280),pressure=clean(brief.pressure||campaign.pressure||'',180),cta=clean(brief.cta||campaign.cta||'',180);
  if(!truth||!benefit||!cta)throw new Error('CHANNEL_NATIVE_CAMPAIGN_CONTEXT_REQUIRED');
  const audience=registry.audience||((channel==='NEWSLETTER_B2B'||channel==='LINKEDIN_COMPANY')?'B2B_INMOBILIARIAS_PROFESIONALES':'B2C_HOME_BUYERS');
  const hold=registry.status.includes('NOT_ACTIVE')||registry.status.includes('PREP_ONLY');
  const plan={schema_version:'1.0.0',channel,status:hold?'PLANNED_NOT_ACTIVE':'PREPROD_PLAN_ONLY',campaign_platform:platform,audience,format_options:registry.formats,creative_rule:registry.creative_rule,aspect:profile.aspect,hook_strategy:profile.hook,cta_strategy:profile.cta,tone:profile.tone,asset_role:profile.asset_role,narrative_inputs:{pressure,truth,benefit,cta},native_rewrite_required:true,reuse_master_campaign_bible:true,reuse_core_cast_bible:true,reuse_brand_signature:true,reuse_sonic_motif:!['THREADS','NEWSLETTER_B2C','NEWSLETTER_B2B'].includes(channel),cross_channel_pixel_copy_forbidden:true,platform_constraints:registry.platform_constraints||{},spec_reference:registry.spec_reference||null,requires_core_green:true,requires_human_visual_review_green:true,requires_soc001_adapter_audit:true,publish_requested:false,publish_authorized:false,paid_media_authorized:false,additional_cost_eur:0};
  return Object.freeze({...plan,native_fingerprint:fingerprint({channel,audience,aspect:profile.aspect,hook:profile.hook,cta:profile.cta,tone:profile.tone,role:profile.asset_role})});
}
export function buildNativeCampaignSlateV1(input={}){
  const requested=(Array.isArray(input.channels)&&input.channels.length?input.channels:MATRIX.channels.map(x=>x.id)).map(x=>String(x).toUpperCase());
  const plans=requested.map(channel=>planNativeChannelAssetV1({...input,channel}));
  const unique=new Set(plans.map(x=>x.native_fingerprint));
  if(unique.size!==plans.length)throw new Error('CHANNEL_NATIVE_DUPLICATION_DETECTED');
  return Object.freeze({schema_version:'1.0.0',strategy:MATRIX.strategy.name,status:'PLANNED_NOT_ACTIVE',channel_count:plans.length,plans,studio_never_publishes_directly:true,distribution_route:MATRIX.governance.route,publish_authorized:false,paid_media_authorized:false,additional_cost_eur:0});
}
export const CREATIVE_CHANNEL_NATIVE_ADAPTER_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'SOC-001',creative_source:'CREATIVE-STUDIO-001',action_gateway:'ACTGW-001',channel_count:Object.keys(PROFILES).length,native_rewrite_required:true,cross_channel_pixel_copy_forbidden:true,core_green_required_before_activation:true,human_visual_review_required_before_activation:true,publication_authority:false,paid_media_authority:false,additional_cost_eur:0});
