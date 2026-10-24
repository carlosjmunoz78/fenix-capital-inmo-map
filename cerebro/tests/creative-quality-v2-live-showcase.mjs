import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';
import { masterCreativeVideoAudioV3 } from '../runtime/creative-audio-master-v3.mjs';
import { assertCreativePlanV2 } from '../runtime/creative-quality-tribunal-v2.mjs';

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
const base=(output_type,channel,cp)=>({job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'SOC-001',environment:'PREPROD',version:'v2.3-live',output_type,channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,creative_concept:'Fénix Capital · decidir antes de reservar',channel_fit:true,accessibility_checked:true,layer_count:12,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.15,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT','PULL_OUT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE','ZOOM_CUT'],...cp}}});
const jobs=[
['01-post-fotografico',base('STATIC_POST','INSTAGRAM',{visual_sources:[photos[0]],layout_style:'FULL_BLEED',headline:'La casa te encanta. Ahora comprueba la operación.',subheadline:'Antes de reservar, revisa números, vivienda y calendario.',cta:'Primero viabilidad · Después compromiso'})],
['02-post-editorial',base('SQUARE_POST','FACEBOOK',{visual_sources:[photos[1]],layout_style:'SPLIT_EDITORIAL',headline:'Un “sí” del banco empieza mucho antes del banco',subheadline:'Ordenar bien el expediente cambia la claridad de la decisión.',cta:'Prepara el caso con criterio'})],
['03-post-conversion',base('STATIC_POST','LINKEDIN',{visual_sources:[photos[3]],layout_style:'GLASS_CARD',headline:'Llegar a firma sin sorpresas evitables',subheadline:'Ese es el objetivo real de una operación bien preparada.',cta:'Método · documentación · seguimiento'})],
['04-carrusel',base('CAROUSEL','INSTAGRAM',{visual_sources:photos,pages:[
{layout_style:'FULL_BLEED',metric:'01',metric_label:'PRESUPUESTO',headline:'Empieza por lo que puedes sostener',subheadline:'Cuota, deudas y margen mensual.'},
{layout_style:'SPLIT_EDITORIAL',metric:'02',metric_label:'AHORRO',headline:'Cuenta el dinero que necesitas de verdad',subheadline:'Entrada, impuestos, tasación y gastos.'},
{layout_style:'GLASS_CARD',metric:'03',metric_label:'VIVIENDA',headline:'La casa también debe ser financiable',subheadline:'Registro, estado y tasación importan.'},
{layout_style:'METRIC_HERO',metric:'04',metric_label:'PLAZOS',headline:'No reserves con un calendario imposible',subheadline:'Estudio, tasación, FEIN y notaría necesitan margen.'},
{layout_style:'FRAME_MINIMAL',metric:'05',metric_label:'DECISIÓN',headline:'Cuando todo encaja, entonces sí',subheadline:'Detecta riesgos antes de comprometerte.',cta:'Fénix Capital'}]})],
['05-story-video',base('STORY_VIDEO','INSTAGRAM',{video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:[vids[0],vids[1],vids[2]],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:2,duration_sec:2.5,headline:'¿Te urge reservar?',subheadline:'No decidas por presión.',voiceover:'¿Te urge reservar? Espera.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:2.5,headline:'Primero tu perfil',subheadline:'Ingresos, deudas y ahorro.',voiceover:'Revisa ingresos y ahorro.'},
{source_kind:'PHOTO',duration_sec:2.5,headline:'Después la vivienda',subheadline:'Registro, estado y tasación.',voiceover:'Comprueba vivienda y tasación.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:3,duration_sec:2.5,headline:'Pon fechas reales',subheadline:'La operación necesita margen.',voiceover:'Pon fechas con margen.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:7,duration_sec:2.5,headline:'Decide con datos',subheadline:'Viabilidad antes que compromiso.',voiceover:'Decide con datos.'}],audio})],
['06-reel',base('REEL','INSTAGRAM',{video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:[vids[0],vids[2],vids[1],vids[4]],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:5,duration_sec:3,headline:'La casa te encaja',subheadline:'Todo parece urgente.',voiceover:'Te gusta. No corras.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:3,headline:'No mires solo cuota',subheadline:'Hay más variables.',voiceover:'No mires solo cuota.'},
{source_kind:'PHOTO',duration_sec:3,headline:'Mira tu ahorro',subheadline:'Y todos los gastos.',voiceover:'Cuenta ahorro y gastos.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:7,duration_sec:3,headline:'Ordena documentos',subheadline:'Que todo sea coherente.',voiceover:'Ordena los documentos.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:1,duration_sec:3,headline:'Revisa la vivienda',subheadline:'También condiciona.',voiceover:'Revisa la vivienda.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:5,duration_sec:3,headline:'Pon fechas reales',subheadline:'Sin calendarios imposibles.',voiceover:'Pon fechas reales.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:10,duration_sec:3,headline:'Primero viabilidad',subheadline:'Después compromiso.',voiceover:'Viabilidad. Después compromiso.'}],audio})],
['07-video-largo',base('LONG_VIDEO','FACEBOOK',{video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:vids,scenes:[
{source_kind:'VIDEO',video_source:vids[3],source_start_sec:1,duration_sec:4.8,metric:'01',metric_label:'PRESUPUESTO',headline:'Empieza por tu presupuesto real',subheadline:'La cuota es solo una parte.',voiceover:'Empieza por un presupuesto sostenible.'},
{source_kind:'VIDEO',video_source:vids[3],source_start_sec:7,duration_sec:4.8,metric:'02',metric_label:'MARGEN',headline:'Deja aire cada mes',subheadline:'No vivas al límite.',voiceover:'Deja margen cada mes.'},
{source_kind:'PHOTO',duration_sec:4.8,metric:'03',metric_label:'AHORRO',headline:'Cuenta el dinero real',subheadline:'Entrada, impuestos y gastos.',voiceover:'Cuenta entrada, impuestos y gastos.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:4.8,metric:'04',metric_label:'DOCUMENTOS',headline:'Ordena el expediente',subheadline:'Que todo tenga sentido.',voiceover:'Ordena el expediente antes de enviarlo.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:7,duration_sec:4.8,metric:'05',metric_label:'INGRESOS',headline:'Explica de dónde viene el dinero',subheadline:'Estabilidad y continuidad.',voiceover:'Aclara ingresos, antigüedad y continuidad.'},
{source_kind:'PHOTO',duration_sec:4.8,metric:'06',metric_label:'DEUDAS',headline:'No escondas el ratio',subheadline:'Mide la carga completa.',voiceover:'Mide todas tus deudas.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:1,duration_sec:4.8,metric:'07',metric_label:'VIVIENDA',headline:'La casa también se analiza',subheadline:'Registro, estado y tasación.',voiceover:'La vivienda también condiciona financiación.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:7,duration_sec:4.8,metric:'08',metric_label:'RIESGO',headline:'Detecta problemas antes',subheadline:'No después de reservar.',voiceover:'Detecta riesgos antes de reservar.'},
{source_kind:'PHOTO',duration_sec:4.8,metric:'09',metric_label:'PLAZOS',headline:'Pon un calendario realista',subheadline:'Cada paso necesita margen.',voiceover:'Pon fechas realistas.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:2,duration_sec:4.8,metric:'10',metric_label:'ESTUDIO',headline:'Haz primero la viabilidad',subheadline:'Antes de correr.',voiceover:'Primero estudia viabilidad.'},
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:8,duration_sec:4.8,metric:'11',metric_label:'DECISIÓN',headline:'Compara escenarios',subheadline:'No solo una cuota.',voiceover:'Compara varios escenarios.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:3,duration_sec:4.8,metric:'12',metric_label:'COMPROMISO',headline:'Reserva cuando tenga sentido',subheadline:'Con datos y margen.',voiceover:'Reserva cuando todo encaje.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:9,duration_sec:4.8,metric:'13',metric_label:'CIERRE',headline:'Llega preparado a firma',subheadline:'Sin sorpresas evitables.',voiceover:'Llega preparado a firma.'},
{source_kind:'PHOTO',duration_sec:4.8,metric:'14',metric_label:'FÉNIX CAPITAL',headline:'Primero viabilidad. Después compromiso.',subheadline:'Método antes que prisa.',voiceover:'Primero viabilidad. Después compromiso.'}],audio:{...audio,voice_id:'ES_MALE'}})]
];
const manifest={schema_version:'2.3.0',environment:'PREPROD',publish_authorized:false,additional_cost_eur:0,items:[]};
for(const [label,job] of jobs){const r=await renderCreativeJobV2Live(job);try{const item={label,output_type:job.output_type,quality:r.quality,video_source_provenance:r.video_source_provenance,artifacts:[]};for(const a of r.artifacts){let local=a.local_path,physical={...(a.physical_evidence||{})};if(a.mime==='video/mp4'){const cp=job.request.creative_payload;const mastered=await masterCreativeVideoAudioV3({videoFile:a.local_path,scenes:cp.scenes,temp:r.temp,voiceId:cp.audio?.voice_id||'ES_FEMALE'});local=mastered.file;Object.assign(physical,mastered.evidence,{scene_change_count:cp.scenes.length-1,video_duration_sec:mastered.evidence.video_duration_sec});item.quality=assertCreativePlanV2({plan:r.plan,physical_evidence:physical});}
const ext=path.extname(a.filename),suffix=a.page?`-${String(a.page).padStart(2,'0')}`:'',target=path.join(out,`${label}${suffix}${ext}`);await fs.copyFile(local,target);item.artifacts.push({...a,local_path:undefined,filename:path.basename(target),physical_evidence:physical,quality_verdict:item.quality.verdict,quality_score:item.quality.score})}manifest.items.push(item)}finally{await fs.rm(r.temp,{recursive:true,force:true})}}
await fs.writeFile(path.join(out,'MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,items:manifest.items.length,artifacts:manifest.items.reduce((n,x)=>n+x.artifacts.length,0),out}));
