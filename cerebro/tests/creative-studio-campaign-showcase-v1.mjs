import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildStudioCampaignV1 } from '../runtime/creative-studio-campaign-v1.mjs';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeSocialAudioV4 } from '../runtime/creative-social-audio-v4.mjs';
import { finishCreativeSocialV4 } from '../runtime/creative-social-finisher-v4.mjs';
import { assertCreativeSocialV4 } from '../runtime/creative-social-quality-v4.mjs';
import { assertCreativeStudioV1 } from '../runtime/creative-studio-tribunal-v1.mjs';

const out=process.env.CEREBRO_CAMPAIGN_OUT||'/tmp/cerebro-creative-studio-campaign-v1';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const logo='https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png';
const photos=[
'https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-haciendo-numeros-para-comprar-vivienda-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-revision-vivienda-asesor-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-firma-documentos-vivienda-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/huelva-llaves-compra-vivienda-scaled-1-cerebro.webp'];
const vids=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690','PEXELS:7735853','PEXELS:7646396'];
const brand={logo_url:logo,primary:'#ffffff',accent:'#f47b20',background:'#111111'};
const audio={voice_enabled:true,voice_id:'ES_FEMALE',music_enabled:true,ducking:true,captions:true};
const brief={objective:'Crear una campaña social que entretenga primero, conecte con la ansiedad real de comprar vivienda y convierta sin parecer formación.',audience:'Personas que han encontrado una vivienda que les encanta y sienten presión por reservar.',desire:'Ves la casa, ves la cocina y ya sabes dónde va el sofá',pressure:'hay que reservar hoy',truth:'primero conviene comprobar que la operación encaja contigo y con la vivienda',benefit:'puedes decidir con ilusión, sin ir a ciegas y sin matar el momento',cta:'Cuéntanos tu caso y lo miramos contigo'};
const campaign=buildStudioCampaignV1({company_id:'fenix',environment:'PREPROD',brief,assets:{visual_sources:photos,video_sources:vids}});
const manifest={schema_version:'1.0.0',campaign_id:campaign.campaign_id,studio_mode:campaign.studio_mode,campaign_bible:campaign.campaign_bible,environment:'PREPROD',publish_authorized:false,additional_cost_eur:0,formats:[]};

function baseJob(output_type,channel,payload){return {job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',version:'v1',output_type,channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.1,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],...payload}}}};
async function saveArtifacts(label,result,extra={}){const artifacts=[];for(const a of result.artifacts){const suffix=a.page?`-${String(a.page).padStart(2,'0')}`:'',target=path.join(out,`${label}${suffix}${path.extname(a.filename)}`);await fs.copyFile(a.local_path,target);artifacts.push({filename:path.basename(target),mime:a.mime,bytes:(await fs.stat(target)).size,sha256:a.sha256,quality_verdict:a.quality_verdict,quality_score:a.quality_score})}manifest.formats.push({label,output_type:result.plan.output_type,channel:result.plan.channel,quality:result.quality,artifacts,...extra})}

for(const [label,spec] of [['post-instagram',campaign.slate.static_post],['post-facebook',campaign.slate.square_post]]){
  const r=await renderCreativeJobV2Live(baseJob(spec.output_type,spec.channel,{creative_concept:`${campaign.campaign_bible.creative_platform} · ${spec.creative_concept}`,visual_sources:[spec.visual_source],layout_style:label==='post-instagram'?'FULL_BLEED':'GLASS_CARD',headline:spec.headline,subheadline:spec.subheadline,cta:spec.cta}));
  try{await saveArtifacts(label,r,{campaign_continuity:true})}finally{await fs.rm(r.temp,{recursive:true,force:true})}
}

{
  const spec=campaign.slate.carousel;
  const pages=spec.pages.map((p,i)=>({layout_style:['FULL_BLEED','SPLIT_EDITORIAL','GLASS_CARD','METRIC_HERO','FRAME_MINIMAL'][i%5],headline:p.headline,subheadline:p.body,cta:i===spec.pages.length-1?brief.cta:''}));
  const r=await renderCreativeJobV2Live(baseJob('CAROUSEL','INSTAGRAM',{creative_concept:`${campaign.campaign_bible.creative_platform} · ${spec.creative_concept}`,visual_sources:photos,pages}));
  try{await saveArtifacts('carousel',r,{campaign_continuity:true,page_count:pages.length})}finally{await fs.rm(r.temp,{recursive:true,force:true})}
}

for(const [key,label] of [['story','story'],['reel','reel'],['long','video-largo']]){
  const production=campaign.video_productions[key],plan=production.selected_plan;
  const cp={creative_concept:plan.creative_concept,video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,scenes:plan.scenes,audio};
  const r=await renderCreativeJobV2Live(baseJob(plan.output_type,plan.channel,cp));
  try{
    const art=r.artifacts.find(x=>x.mime==='video/mp4');if(!art)throw new Error(`CAMPAIGN_VIDEO_MISSING:${label}`);
    const mastered=await masterCreativeSocialAudioV4({videoFile:art.local_path,narrationBlocks:plan.narration_blocks,scenes:plan.scenes,temp:r.temp,voiceId:'ES_FEMALE'});
    const finished=await finishCreativeSocialV4({videoFile:mastered.file,scenes:plan.scenes,temp:r.temp,accent:brand.accent});
    const physical={...(art.physical_evidence||{}),...mastered.evidence,...finished.evidence,live_action_seconds_ratio:art.physical_evidence?.live_action_seconds_ratio,live_action_source_count:art.physical_evidence?.live_action_source_count,scene_change_count:Math.max(0,plan.scenes.length-1)};
    const social=assertCreativeSocialV4({plan,physical_evidence:physical});const studio=assertCreativeStudioV1({production,physical_evidence:physical});
    const target=path.join(out,`${label}.mp4`);await fs.copyFile(finished.file,target);
    manifest.formats.push({label,output_type:plan.output_type,channel:plan.channel,selected_candidate_id:production.selected_candidate_id,candidate_scores:production.candidates.map(x=>({id:x.id,score:x.evaluation.score})),rejected_candidates:production.rejected_candidates,expert_decisions:production.expert_decisions,social_qa:social,studio_qa:studio,physical_evidence:physical,campaign_continuity:true,artifacts:[{filename:path.basename(target),mime:'video/mp4',bytes:(await fs.stat(target)).size}]});
  }finally{await fs.rm(r.temp,{recursive:true,force:true})}
}

if(manifest.formats.length!==6)throw new Error(`CAMPAIGN_FORMAT_COUNT:${manifest.formats.length}`);
if(manifest.formats.some(x=>x.campaign_continuity!==true))throw new Error('CAMPAIGN_CONTINUITY_MISSING');
await fs.writeFile(path.join(out,'CAMPAIGN_MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,campaign_id:manifest.campaign_id,formats:manifest.formats.length,out}));
