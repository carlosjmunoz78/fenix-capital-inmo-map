import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { orchestrateCreativeStudioV1 } from '../runtime/creative-studio-orchestrator-v1.mjs';
import { superviseStudioScriptV1 } from '../runtime/creative-studio-script-supervisor-v1.mjs';
import { assertCreativeStudioV1 } from '../runtime/creative-studio-tribunal-v1.mjs';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeSocialAudioV4 } from '../runtime/creative-social-audio-v4.mjs';
import { finishCreativeSocialV4 } from '../runtime/creative-social-finisher-v4.mjs';
import { assertCreativeSocialV4 } from '../runtime/creative-social-quality-v4.mjs';
import { evaluatePhysicalCharacterContinuityV1 } from '../runtime/creative-character-continuity-physical-v1.mjs';

const out=process.env.CEREBRO_STUDIO_OUT||'/tmp/cerebro-creative-studio-v1';
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
const baseBrief={objective:'Crear una pieza social que entretenga primero, conecte con la ansiedad real de comprar vivienda y convierta sin parecer formación.',audience:'Personas que han encontrado una vivienda que les encanta y sienten presión por reservar.',desire:'Ves la casa, ves la cocina y ya sabes hasta dónde va el sofá',pressure:'hay que reservar hoy',truth:'primero conviene comprobar que la operación encaja contigo y con la vivienda',benefit:'puedes decidir con ilusión, sin ir a ciegas y sin matar el momento',cta:'Cuéntanos tu caso y lo miramos contigo'};
const formats=[['story','STORY_VIDEO','INSTAGRAM'],['reel','REEL','INSTAGRAM'],['video-largo','LONG_VIDEO','FACEBOOK']];
const manifest={schema_version:'1.1.0',environment:'PREPROD',studio_mode:'CEREBRO_STUDIO_GRADE',publish_authorized:false,additional_cost_eur:0,productions:[]};

for(const [label,output_type,channel] of formats){
  let production=orchestrateCreativeStudioV1({company_id:'fenix',environment:'PREPROD',brief:{...baseBrief,output_type,channel},assets:{visual_sources:photos,video_sources:vids}});
  production=superviseStudioScriptV1(production);
  const studioArchitecture=assertCreativeStudioV1({production});
  const cp={brand,creative_concept:production.selected_plan.creative_concept,channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.1,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,scenes:production.selected_plan.scenes,audio};
  const job={job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'CREATIVE-STUDIO-001',environment:'PREPROD',version:'v1',output_type,channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:cp}};
  const rendered=await renderCreativeJobV2Live(job);
  try{
    const art=rendered.artifacts.find(x=>x.mime==='video/mp4');if(!art)throw new Error(`STUDIO_VIDEO_ARTIFACT_MISSING:${label}`);
    const mastered=await masterCreativeSocialAudioV4({videoFile:art.local_path,narrationBlocks:production.selected_plan.narration_blocks,scenes:production.selected_plan.scenes,temp:rendered.temp,voiceId:'ES_FEMALE'});
    const finished=await finishCreativeSocialV4({videoFile:mastered.file,scenes:production.selected_plan.scenes,temp:rendered.temp,accent:brand.accent});
    const character_continuity=evaluatePhysicalCharacterContinuityV1({scenes:production.selected_plan.scenes,character_bible:production.selected_plan.character_bible,voice_id:'ES_FEMALE'});
    const physical={...(art.physical_evidence||{}),...mastered.evidence,...finished.evidence,character_continuity,live_action_seconds_ratio:art.physical_evidence?.live_action_seconds_ratio,live_action_source_count:art.physical_evidence?.live_action_source_count,scene_change_count:Math.max(0,production.selected_plan.scenes.length-1)};
    const social=assertCreativeSocialV4({plan:production.selected_plan,physical_evidence:physical});
    const studio=assertCreativeStudioV1({production,physical_evidence:physical});
    const target=path.join(out,`${label}.mp4`);await fs.copyFile(finished.file,target);
    manifest.productions.push({label,output_type,channel,character_mode:production.selected_plan.character_bible?.mode||null,selected_candidate_id:production.selected_candidate_id,candidate_scores:production.candidates.map(x=>({id:x.id,score:x.evaluation.score})),rejected_candidates:production.rejected_candidates,expert_decisions:production.expert_decisions,production_passes:production.production_passes,script_supervisor:production.script_supervisor,architecture_qa:studioArchitecture,studio_qa:studio,social_qa:social,physical_evidence:physical,artifact:{filename:path.basename(target),bytes:(await fs.stat(target)).size},publish_authorized:false,additional_cost_eur:0});
  } finally {await fs.rm(rendered.temp,{recursive:true,force:true})}
}
await fs.writeFile(path.join(out,'STUDIO_MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,studio_mode:manifest.studio_mode,productions:manifest.productions.length,out}));
