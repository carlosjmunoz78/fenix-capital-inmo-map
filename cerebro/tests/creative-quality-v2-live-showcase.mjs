import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeSocialAudioV4 } from '../runtime/creative-social-audio-v4.mjs';
import { finishCreativeSocialV4 } from '../runtime/creative-social-finisher-v4.mjs';
import { assertCreativePlanV2 } from '../runtime/creative-quality-tribunal-v2.mjs';
import { assertCreativeSocialV4 } from '../runtime/creative-social-quality-v4.mjs';

const out=process.env.CEREBRO_SHOWCASE_OUT||'/tmp/cerebro-creative-quality-v2-live';
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
const base=(output_type,channel,cp)=>({job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'SOC-001',environment:'PREPROD',version:'v2.4-social',output_type,channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,creative_concept:'Fénix Capital · social first · vivienda sin sustos',channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.15,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],...cp}}});
const social=(extra={})=>({social_narrative:true,hook_within_sec:.2,voice_style:'SOCIAL_ENERGETIC',social_arc:['HOOK','TENSION','RELIEF','PAYOFF','CTA'],...extra});
const jobs=[
['01-post-fotografico',base('STATIC_POST','INSTAGRAM',{visual_sources:[photos[0]],layout_style:'FULL_BLEED',headline:'La casa te ha hecho ojitos. Vale.',subheadline:'Ahora falta que la operación también te los haga.',cta:'Primero viabilidad · después flechazo'})],
['02-post-editorial',base('SQUARE_POST','FACEBOOK',{visual_sources:[photos[1]],layout_style:'SPLIT_EDITORIAL',headline:'Reservar con prisas sale caro',subheadline:'La ilusión está bien. Las sorpresas, mejor antes de firmar nada.',cta:'Míralo antes de correr'})],
['03-post-conversion',base('STATIC_POST','LINKEDIN',{visual_sources:[photos[3]],layout_style:'GLASS_CARD',headline:'Las llaves molan más que los sustos',subheadline:'Preparar bien la operación es llegar a firma con la cabeza tranquila.',cta:'Fénix Capital'})],
['04-carrusel',base('CAROUSEL','INSTAGRAM',{visual_sources:photos,pages:[
{layout_style:'FULL_BLEED',headline:'Te encanta la casa',subheadline:'Perfecto. Esa parte ya la tenemos.'},
{layout_style:'SPLIT_EDITORIAL',headline:'Ahora no corras',subheadline:'La reserva no necesita adrenalina.'},
{layout_style:'GLASS_CARD',headline:'¿La operación respira?',subheadline:'Eso es lo que miramos primero.'},
{layout_style:'METRIC_HERO',headline:'Si algo chirría…',subheadline:'Mejor descubrirlo ahora que después.'},
{layout_style:'FRAME_MINIMAL',headline:'Si encaja, a por las llaves',subheadline:'Tú disfruta la casa. Nosotros vigilamos la operación.',cta:'Fénix Capital'}]})],
['05-story-video',base('STORY_VIDEO','INSTAGRAM',{...social(),video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:[vids[0],vids[1],vids[2]],narration_blocks:[
{start_sec:.1,text:'¿Te ha enamorado la casa? Genial. No te cases con la reserva todavía.'},
{start_sec:5.0,text:'Primero vemos si la operación respira. Si respira, ahora sí: llaves.'}],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:2,duration_sec:2.4,headline:'¿LA casa?',subheadline:'Vale. Respira.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:2.4,headline:'No te cases aún',subheadline:'Con la reserva, queremos decir.'},
{source_kind:'PHOTO',duration_sec:2.4,headline:'Primero una cosa',subheadline:'¿La operación respira?'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:3,duration_sec:2.4,headline:'Si encaja…',subheadline:'Ahora sí.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:7,duration_sec:2.4,headline:'A por las llaves',subheadline:'Sin sustos evitables.'}],audio})],
['06-reel',base('REEL','INSTAGRAM',{...social(),video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:[vids[0],vids[2],vids[1],vids[4]],narration_blocks:[
{start_sec:.1,text:'Ves la casa, ves la cocina... y ya sabes dónde va el sofá. Normal.'},
{start_sec:5.4,text:'Y llega el “hay que reservar hoy”. Ahí, freno. Primero miramos si encaja.'},
{start_sec:11.0,text:'Si encaja, corremos contigo. Si no, mejor descubrirlo antes de soltar dinero.'}],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:5,duration_sec:2.8,headline:'Te has enamorado',subheadline:'Sí, se te nota.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:2.8,headline:'Ya ves el sofá',subheadline:'Y hasta la lámpara.'},
{source_kind:'PHOTO',duration_sec:2.8,headline:'“Hay que reservar hoy”',subheadline:'Momento dramático.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:7,duration_sec:2.8,headline:'Freno',subheadline:'Primero: ¿encaja?'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:1,duration_sec:2.8,headline:'Banco + casa + tú',subheadline:'Que se lleven bien.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:5,duration_sec:2.8,headline:'¿Todo bien?',subheadline:'Entonces corremos.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:10,duration_sec:2.8,headline:'Ahora sí',subheadline:'A por las llaves.'}],audio})],
['07-video-largo',base('LONG_VIDEO','FACEBOOK',{...social(),video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,narration_blocks:[
{start_sec:.1,text:'Entras en una casa y en diez segundos ya has colocado el sofá. A todos nos pasa.'},
{start_sec:7.2,text:'El problema es querer colocar también la hipoteca en diez segundos. Ahí empiezan los sustos.'},
{start_sec:14.6,text:'Nosotros hacemos justo lo contrario: miramos si tú, el banco y esa vivienda se llevan bien.'},
{start_sec:22.3,text:'Si algo chirría, mejor verlo antes de reservar. Y si todo encaja, entonces sí: a correr.'},
{start_sec:30.0,text:'Tú piensa en las llaves. Nosotros vigilamos que la operación no se tuerza. ¿La vemos?'}],scenes:[
{source_kind:'VIDEO',video_source:vids[3],source_start_sec:1,duration_sec:3.2,headline:'Entras y…',subheadline:'Ya estás decorando.'},
{source_kind:'VIDEO',video_source:vids[3],source_start_sec:5,duration_sec:3.2,headline:'El sofá aquí',subheadline:'La tele allí.'},
{source_kind:'PHOTO',duration_sec:3.2,headline:'Y la hipoteca…',subheadline:'Bueno. Esa mejor la miramos.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:3.2,headline:'No hace falta un máster',subheadline:'Hace falta saber si encaja.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:2,duration_sec:3.2,headline:'Tú',subheadline:'Tu situación real.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:7,duration_sec:3.2,headline:'El banco',subheadline:'Lo que acepta de verdad.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:1,duration_sec:3.2,headline:'La casa',subheadline:'Sí, ella también cuenta.'},
{source_kind:'PHOTO',duration_sec:3.2,headline:'¿Algo chirría?',subheadline:'Mejor ahora.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:7,duration_sec:3.2,headline:'¿Todo encaja?',subheadline:'Perfecto.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:8,duration_sec:3.2,headline:'Entonces sí',subheadline:'Nos movemos.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:3,duration_sec:3.2,headline:'Papeles',subheadline:'Sin convertirlo en un drama.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:8,duration_sec:3.2,headline:'Firma',subheadline:'Cada cosa a su tiempo.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:11,duration_sec:3.2,headline:'Tú',subheadline:'Pensando en las llaves.'},
{source_kind:'PHOTO',duration_sec:3.2,headline:'Nosotros',subheadline:'Vigilando que no se tuerza.',cta:'¿La vemos?'}],audio:{...audio,voice_id:'ES_FEMALE'}})]
];
const manifest={schema_version:'2.4.0',environment:'PREPROD',publish_authorized:false,additional_cost_eur:0,items:[]};
for(const [label,job] of jobs){const r=await renderCreativeJobV2Live(job);try{const cp=job.request.creative_payload,item={label,output_type:job.output_type,quality:r.quality,social_quality:null,video_source_provenance:r.video_source_provenance,artifacts:[]};for(const a of r.artifacts){let local=a.local_path,physical={...(a.physical_evidence||{})};if(a.mime==='video/mp4'){const mastered=await masterCreativeSocialAudioV4({videoFile:a.local_path,narrationBlocks:cp.narration_blocks,scenes:cp.scenes,temp:r.temp,voiceId:cp.audio?.voice_id||'ES_FEMALE'});const finished=await finishCreativeSocialV4({videoFile:mastered.file,scenes:cp.scenes,temp:r.temp,accent:cp.brand?.accent||'#f47b20'});local=finished.file;Object.assign(physical,mastered.evidence,finished.evidence,{scene_change_count:cp.scenes.length-1,video_duration_sec:mastered.evidence.video_duration_sec});item.quality=assertCreativePlanV2({plan:r.plan,physical_evidence:physical});const socialPlan={...r.plan,social_narrative:cp.social_narrative,hook_within_sec:cp.hook_within_sec,voice_style:cp.voice_style,social_arc:cp.social_arc,narration_blocks:cp.narration_blocks};item.social_quality=assertCreativeSocialV4({plan:socialPlan,physical_evidence:physical});}
const ext=path.extname(a.filename),suffix=a.page?`-${String(a.page).padStart(2,'0')}`:'',target=path.join(out,`${label}${suffix}${ext}`);await fs.copyFile(local,target);item.artifacts.push({...a,local_path:undefined,filename:path.basename(target),physical_evidence:physical,quality_verdict:item.quality.verdict,quality_score:item.quality.score,social_quality_verdict:item.social_quality?.verdict||null,social_quality_score:item.social_quality?.score||null})}manifest.items.push(item)}finally{await fs.rm(r.temp,{recursive:true,force:true})}}
await fs.writeFile(path.join(out,'MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,items:manifest.items.length,artifacts:manifest.items.reduce((n,x)=>n+x.artifacts.length,0),out}));
