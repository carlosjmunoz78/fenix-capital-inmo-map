import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildStudioCampaignV1 } from '../runtime/creative-studio-campaign-v1.mjs';
import { upgradeStudioCampaignNativeV2 } from '../runtime/creative-studio-native-cut-v2.mjs';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeSocialAudioV5 } from '../runtime/creative-social-audio-v5.mjs';
import { finishCreativeSocialV5 } from '../runtime/creative-social-finisher-v5.mjs';
import { assertCreativeCinematicV1 } from '../runtime/creative-cinematic-quality-v1.mjs';
import { assertPrimaryCastGovernanceV2 } from '../runtime/creative-primary-cast-governance-v2.mjs';

const out=process.env.CEREBRO_NATIVE_STUDIO_OUT||'/tmp/cerebro-creative-studio-v26';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const photos=[
'https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-haciendo-numeros-para-comprar-vivienda-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-revision-vivienda-asesor-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-firma-documentos-vivienda-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/huelva-llaves-compra-vivienda-scaled-1-cerebro.webp'];
const vids=['PEXELS:4307346','PEXELS:3769951','PEXELS:6780089','PEXELS:27860328','PEXELS:31568471','PEXELS:8293019'];
const brand={logo_url:'https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png',primary:'#ffffff',accent:'#f47b20',background:'#111111'};
const brief={objective:'Crear una campaña social que detenga scroll, dramatice la tensión real de reservar una vivienda y convierta con energía cinematográfica.',audience:'Personas que han encontrado una vivienda que les encanta y sienten presión por reservar.',desire:'Ves la casa, ves la cocina y ya sabes dónde va el sofá',pressure:'hay que reservar hoy',truth:'primero conviene comprobar que la operación encaja contigo y con la vivienda',benefit:'puedes decidir con ilusión, sin ir a ciegas y sin matar el momento',cta:'Cuéntanos tu caso y lo miramos contigo'};
const base=buildStudioCampaignV1({company_id:'fenix',environment:'PREPROD',brief,assets:{visual_sources:photos,video_sources:vids}});
const campaign=upgradeStudioCampaignNativeV2(base);
const manifest={schema_version:'2.6.0',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',studio_mode:campaign.studio_mode,campaign_id:campaign.campaign_id,publish_authorized:false,additional_cost_eur:0,promotion_eligible:false,human_creative_review_required:true,human_creative_gate:'PENDING_REVIEW',human_rejection_parent:'V2.5_PHYSICAL_REJECTED_GENERIC_STOCK_CAST',source_policy:'NO_IDENTIFIABLE_STOCK_HUMANS',audio_delivery:'AAC_256K_48KHZ_STEREO',legacy_prerender_voice_mode:'HOOK_ONLY_REPLACED_BY_V5',native_pipeline_order:'LEGACY_RENDER_THEN_NATIVE_RECUT_THEN_FINAL_AUDIO_MASTER',captions_mode:'REAL_DIALOGUE_SRT_SIDECAR',productions:[]};
function baseJob(plan){
  const hook=String(plan.narration_blocks?.[0]?.text||'Fénix Capital.').trim();
  const prerenderScenes=plan.scenes.map((scene,i)=>({...scene,voiceover:i===0?hook:''}));
  return {job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',version:'v2.6',output_type:plan.output_type,channel:plan.channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.05,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,scenes:prerenderScenes,audio:{voice_enabled:true,voice_id:'ES_FEMALE',music_enabled:true,ducking:true,captions:true}}}};
}
function srtStamp(sec){const ms=Math.max(0,Math.round(Number(sec||0)*1000)),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000),r=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(r).padStart(3,'0')}`}
async function writeDialogueSrt(label,plan,evidence){
  const blocks=Array.isArray(plan.narration_blocks)?plan.narration_blocks:[],starts=Array.isArray(evidence.voice_planned_starts_sec)?evidence.voice_planned_starts_sec:blocks.map(x=>Number(x.start_sec||0));
  const total=Number(evidence.video_duration_sec||plan.expected_final_duration_sec||0),lines=[];
  for(let i=0;i<blocks.length;i++){
    const start=Number(starts[i]??blocks[i].start_sec??0),next=i<blocks.length-1?Number(starts[i+1]??blocks[i+1].start_sec??start+2.2):Math.min(total,start+3.2),end=Math.max(start+0.65,Math.min(total,next-0.08));
    lines.push(`${i+1}\n${srtStamp(start)} --> ${srtStamp(end)}\n${String(blocks[i].text||'').replace(/\s+/g,' ').trim()}\n`);
  }
  const file=path.join(out,`${label}.srt`);await fs.writeFile(file,lines.join('\n'),'utf8');return path.basename(file);
}
const configs=[{key:'story',label:'story-v26',music:'ACTION_TECHNO',sibling:'reel'},{key:'reel',label:'reel-v26',music:'NIGHT_DRIVING',sibling:'story'},{key:'long',label:'video-largo-v26',music:'ACTION_TECHNO',sibling:null}];
const primaryRefs=new Set();
for(const cfg of configs){
  const production=campaign.video_productions[cfg.key],plan=production.selected_plan,cast=assertPrimaryCastGovernanceV2({scenes:plan.scenes,primary_cast_asset:plan.primary_cast_asset});
  for(const ref of cast.primary_asset_refs)primaryRefs.add(ref);
  if(cast.identifiable_stock_human_context_forbidden!==true)throw new Error(`IDENTIFIABLE_STOCK_HUMAN_GATE_MISSING:${cfg.label}`);
  const r=await renderCreativeJobV2Live(baseJob(plan));
  try{
    const art=r.artifacts.find(x=>x.mime==='video/mp4');if(!art)throw new Error(`NATIVE_VIDEO_MISSING:${cfg.label}`);
    const finished=await finishCreativeSocialV5({videoFile:art.local_path,scenes:plan.scenes,temp:r.temp,transitionOverlapSec:.55});
    const mastered=await masterCreativeSocialAudioV5({videoFile:finished.file,narrationBlocks:plan.narration_blocks,scenes:plan.scenes,temp:r.temp,musicTrackId:cfg.music,transitionOverlapSec:.55});
    const captions=await writeDialogueSrt(cfg.label,plan,mastered.evidence);
    const evidence={...(art.physical_evidence||{}),...finished.evidence,...mastered.evidence,primary_cast_governance:cast,legacy_prerender_audio_replaced_by_v5:true,legacy_prerender_voice_hook_only:true,audio_mastered_after_native_recut:true,real_dialogue_caption_sidecar:true,caption_sidecar_file:captions};
    const sibling=cfg.sibling?campaign.video_productions[cfg.sibling].selected_plan:null;
    const cinematic=assertCreativeCinematicV1({plan,physical_evidence:evidence,sibling_plan:sibling});
    const target=path.join(out,`${cfg.label}.mp4`);await fs.copyFile(mastered.file,target);
    manifest.productions.push({key:cfg.key,label:cfg.label,output_type:plan.output_type,channel:plan.channel,native_format_signature:plan.native_format_signature,scene_count:plan.scenes.length,technical_cinematic_qa:cinematic,primary_cast_governance:cast,physical_evidence:evidence,human_creative_gate:'PENDING_REVIEW',promotion_eligible:false,caption_sidecar:captions,artifact:{filename:path.basename(target),bytes:(await fs.stat(target)).size}});
  }finally{await fs.rm(r.temp,{recursive:true,force:true})}
}
if(primaryRefs.size!==1)throw new Error(`NATIVE_PRIMARY_CAST_SOURCE_DRIFT:${[...primaryRefs].join(',')}`);
manifest.cross_format_primary_cast_source=[...primaryRefs][0];
await fs.writeFile(path.join(out,'NATIVE_CINEMATIC_MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,technical_candidate:true,human_creative_gate:'PENDING_REVIEW',promotion_eligible:false,version:'v2.6',out,source_policy:manifest.source_policy,audio_delivery:manifest.audio_delivery,primary_cast:manifest.cross_format_primary_cast_source,captions_mode:manifest.captions_mode,pipeline_order:manifest.native_pipeline_order,productions:manifest.productions.map(x=>({label:x.label,scene_count:x.scene_count,music:x.physical_evidence.music_track_id,music_license_provenance:x.physical_evidence.music_license_provenance_url,voices:x.physical_evidence.distinct_voice_count,audio_rate:x.physical_evidence.audio_sample_rate_hz,audio_channels:x.physical_evidence.audio_channels,voice_wpm:x.physical_evidence.voice_wpm,max_voice_gap_sec:x.physical_evidence.max_voice_gap_sec,avg_shot_sec:x.physical_evidence.avg_shot_sec,max_shot_sec:x.physical_evidence.max_shot_sec,camera_profiles:x.physical_evidence.camera_motion_profile_count,vfx_profiles:x.physical_evidence.vfx_profile_count,captions:x.caption_sidecar}))}));