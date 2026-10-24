import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildStudioCampaignV1 } from '../runtime/creative-studio-campaign-v1.mjs';
import { upgradeStudioCampaignNativeV2 } from '../runtime/creative-studio-native-cut-v2.mjs';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeSocialAudioV5 } from '../runtime/creative-social-audio-v5.mjs';
import { finishCreativeSocialV5 } from '../runtime/creative-social-finisher-v5.mjs';
import { assertCreativeCinematicV1 } from '../runtime/creative-cinematic-quality-v1.mjs';
import { evaluatePhysicalCharacterContinuityV1 } from '../runtime/creative-character-continuity-physical-v1.mjs';

const out=process.env.CEREBRO_NATIVE_STUDIO_OUT||'/tmp/cerebro-creative-studio-v25';
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const photos=[
'https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-haciendo-numeros-para-comprar-vivienda-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-revision-vivienda-asesor-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/cadiz-firma-documentos-vivienda-scaled-1-cerebro.webp',
'https://fenixcapital.es/wp-content/uploads/2026/10/huelva-llaves-compra-vivienda-scaled-1-cerebro.webp'];
const vids=['PEXELS:7817205','PEXELS:7816382','PEXELS:7646690','PEXELS:7735853','PEXELS:7646396'];
const brand={logo_url:'https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png',primary:'#ffffff',accent:'#f47b20',background:'#111111'};
const brief={objective:'Crear una campaña social que detenga scroll, dramatice la tensión real de reservar una vivienda y convierta con energía cinematográfica.',audience:'Personas que han encontrado una vivienda que les encanta y sienten presión por reservar.',desire:'Ves la casa, ves la cocina y ya sabes dónde va el sofá',pressure:'hay que reservar hoy',truth:'primero conviene comprobar que la operación encaja contigo y con la vivienda',benefit:'puedes decidir con ilusión, sin ir a ciegas y sin matar el momento',cta:'Cuéntanos tu caso y lo miramos contigo'};
const base=buildStudioCampaignV1({company_id:'fenix',environment:'PREPROD',brief,assets:{visual_sources:photos,video_sources:vids}});
const campaign=upgradeStudioCampaignNativeV2(base);
const manifest={schema_version:'2.5.0',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',studio_mode:campaign.studio_mode,campaign_id:campaign.campaign_id,publish_authorized:false,additional_cost_eur:0,promotion_eligible:false,human_creative_review_required:true,human_creative_gate:'PENDING_REVIEW',productions:[]};
function baseJob(plan){return {job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',version:'v2.5',output_type:plan.output_type,channel:plan.channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.05,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,scenes:plan.scenes,audio:{voice_enabled:false,music_enabled:false,captions:false}}}}}
const configs=[
  {key:'story',label:'story-v25',music:'STARCourt',sibling:'reel'},
  {key:'reel',label:'reel-v25',music:'NIGHT_DRIVING',sibling:'story'},
  {key:'long',label:'video-largo-v25',music:'BLOOD_EAGLE',sibling:null}
];
const primaryRefs=new Set();
for(const cfg of configs){
  const production=campaign.video_productions[cfg.key],plan=production.selected_plan,r=await renderCreativeJobV2Live(baseJob(plan));
  try{
    const art=r.artifacts.find(x=>x.mime==='video/mp4');if(!art)throw new Error(`NATIVE_VIDEO_MISSING:${cfg.label}`);
    const mastered=await masterCreativeSocialAudioV5({videoFile:art.local_path,narrationBlocks:plan.narration_blocks,scenes:plan.scenes,temp:r.temp,musicTrackId:cfg.music,transitionOverlapSec:.55});
    const finished=await finishCreativeSocialV5({videoFile:mastered.file,scenes:plan.scenes,temp:r.temp,transitionOverlapSec:.55});
    const continuity=evaluatePhysicalCharacterContinuityV1({scenes:plan.scenes,character_bible:plan.character_bible,voice_id:'MULTI'});for(const ref of continuity.primary_asset_refs)primaryRefs.add(ref);
    const evidence={...(art.physical_evidence||{}),...mastered.evidence,...finished.evidence,character_continuity:continuity};
    const sibling=cfg.sibling?campaign.video_productions[cfg.sibling].selected_plan:null;
    const cinematic=assertCreativeCinematicV1({plan,physical_evidence:evidence,sibling_plan:sibling});
    const target=path.join(out,`${cfg.label}.mp4`);await fs.copyFile(finished.file,target);
    manifest.productions.push({key:cfg.key,label:cfg.label,output_type:plan.output_type,channel:plan.channel,native_format_signature:plan.native_format_signature,scene_count:plan.scenes.length,technical_cinematic_qa:cinematic,physical_evidence:evidence,human_creative_gate:'PENDING_REVIEW',promotion_eligible:false,artifact:{filename:path.basename(target),bytes:(await fs.stat(target)).size}});
  }finally{await fs.rm(r.temp,{recursive:true,force:true})}
}
if(primaryRefs.size!==1)throw new Error(`NATIVE_PRIMARY_CAST_SOURCE_DRIFT:${[...primaryRefs].join(',')}`);
manifest.cross_format_primary_cast_source=[...primaryRefs][0];
await fs.writeFile(path.join(out,'NATIVE_CINEMATIC_MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,technical_candidate:true,human_creative_gate:'PENDING_REVIEW',promotion_eligible:false,out,productions:manifest.productions.map(x=>({label:x.label,scene_count:x.scene_count,music:x.physical_evidence.music_track_id,voices:x.physical_evidence.distinct_voice_count,avg_shot_sec:x.physical_evidence.avg_shot_sec,camera_profiles:x.physical_evidence.camera_motion_profile_count,vfx_profiles:x.physical_evidence.vfx_profile_count}))}));