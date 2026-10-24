import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCreativeJobV2Live } from '../runtime/creative-job-runner-v2-live.mjs';

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
const base=(output_type,channel,cp)=>({job_id:crypto.randomUUID(),company_id:'fenix',engine_id:'SOC-001',environment:'PREPROD',version:'v2-live',output_type,channel,request:{publish_requested:false,expected_cost_eur:0,creative_payload:{brand,creative_concept:'Fénix Capital · decidir antes de reservar',channel_fit:true,accessibility_checked:true,layer_count:10,layout_variants:5,motion_design:true,broll_required:true,scene_text_only_ratio:0,text_only_page_ratio:.15,motion_profiles:['KEN_BURNS_IN','PAN_RIGHT','PUSH_IN','PAN_LEFT'],transitions:['CROSSFADE','DIP_TO_BLACK','PUSH','WIPE'],...cp}}});
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
['05-story-video',base('STORY_VIDEO','INSTAGRAM',{video_mode:'LIVE_ACTION_MIXED',visual_sources:[photos[0],photos[2]],video_sources:[vids[0],vids[1]],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:2,duration_sec:4,headline:'¿Te urge reservar?',subheadline:'Que la prisa no decida por ti.',voiceover:'Si has encontrado una vivienda y te urge reservar, que la prisa no decida por ti.'},
{source_kind:'PHOTO',duration_sec:4,headline:'Comprueba tres cosas',subheadline:'Tu perfil, la vivienda y el calendario.',voiceover:'Comprueba primero tu perfil, la vivienda y el calendario real de la operación.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:3,duration_sec:4,headline:'Después, decide',subheadline:'Con datos y margen.',voiceover:'Después decide con datos, margen y una operación que tenga sentido.'}],audio})],
['06-reel',base('REEL','INSTAGRAM',{video_mode:'LIVE_ACTION_MIXED',visual_sources:[photos[0],photos[2]],video_sources:[vids[0],vids[2],vids[1]],scenes:[
{source_kind:'VIDEO',video_source:vids[0],source_start_sec:5,duration_sec:5,headline:'La vivienda te encaja',subheadline:'Y todo parece urgente.',voiceover:'Has encontrado una vivienda que te encaja y todo parece urgente.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:5,headline:'Mira los documentos',subheadline:'No solo la cuota.',voiceover:'No mires solo la cuota. Revisa documentación, deudas, ahorro disponible y los gastos.'},
{source_kind:'PHOTO',duration_sec:5,headline:'Mira también la vivienda',subheadline:'Registro y tasación pueden cambiar la financiación.',voiceover:'La vivienda también cuenta. Registro, estado y tasación pueden cambiar la financiación.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:8,duration_sec:5,headline:'Primero viabilidad',subheadline:'Después compromiso.',voiceover:'Primero viabilidad real. Después compromiso.'}],audio})],
['07-video-largo',base('LONG_VIDEO','FACEBOOK',{video_mode:'LIVE_ACTION_MIXED',visual_sources:photos,video_sources:[vids[3],vids[2],vids[1],vids[4]],scenes:[
{source_kind:'VIDEO',video_source:vids[3],source_start_sec:1,duration_sec:8,metric:'01',metric_label:'PRESUPUESTO',headline:'Empieza por tu presupuesto real',subheadline:'La cuota es solo una parte.',voiceover:'Antes de mirar bancos, calcula cuánto puedes destinar cada mes sin quedarte sin margen.'},
{source_kind:'PHOTO',duration_sec:8,metric:'02',metric_label:'ESTABILIDAD',headline:'Explica bien cómo entra el dinero',subheadline:'Antigüedad y continuidad importan.',voiceover:'Revisa la estabilidad de tus ingresos y la continuidad suficiente para sostener la operación.'},
{source_kind:'VIDEO',video_source:vids[2],source_start_sec:1,duration_sec:8,metric:'03',metric_label:'DOCUMENTOS',headline:'Ordena el expediente',subheadline:'Lo que presentas tiene que contar una historia coherente.',voiceover:'Ordena el expediente para que ingresos, deudas, ahorro y objetivo de compra se entiendan con claridad.'},
{source_kind:'PHOTO',duration_sec:8,metric:'04',metric_label:'AHORRO',headline:'Cuenta todos los gastos',subheadline:'No presupuestes solo la entrada.',voiceover:'Calcula entrada, impuestos, tasación y demás gastos para saber qué financiación necesitas.'},
{source_kind:'VIDEO',video_source:vids[1],source_start_sec:5,duration_sec:8,metric:'05',metric_label:'VIVIENDA',headline:'La casa también forma parte del riesgo',subheadline:'Registro, estado y tasación condicionan.',voiceover:'La vivienda también forma parte del riesgo y puede condicionar el porcentaje financiable.'},
{source_kind:'PHOTO',duration_sec:8,metric:'06',metric_label:'CALENDARIO',headline:'Pon fechas realistas',subheadline:'Estudio, tasación, FEIN y notaría necesitan margen.',voiceover:'Coloca un calendario realista para estudio, documentación, tasación, FEIN y notaría.'},
{source_kind:'VIDEO',video_source:vids[4],source_start_sec:1,duration_sec:8,metric:'07',metric_label:'DECISIÓN',headline:'Decide cuando conozcas los riesgos',subheadline:'La velocidad funciona mejor cuando hay método.',voiceover:'Cuando comprador, vivienda, dinero y calendario encajan, puedes decidir con mucha más información.'},
{source_kind:'PHOTO',duration_sec:8,metric:'08',metric_label:'FÉNIX CAPITAL',headline:'Primero viabilidad. Después compromiso.',subheadline:'Método antes de prisa.',voiceover:'Primero viabilidad. Después compromiso. Ese es el método.'}],audio:{...audio,voice_id:'ES_MALE'}})]
];
const manifest={schema_version:'2.2.0',environment:'PREPROD',publish_authorized:false,additional_cost_eur:0,items:[]};
for(const [label,job] of jobs){const r=await renderCreativeJobV2Live(job);try{const item={label,output_type:job.output_type,quality:r.quality,video_source_provenance:r.video_source_provenance,artifacts:[]};for(const a of r.artifacts){const ext=path.extname(a.filename),suffix=a.page?`-${String(a.page).padStart(2,'0')}`:'',target=path.join(out,`${label}${suffix}${ext}`);await fs.copyFile(a.local_path,target);item.artifacts.push({...a,local_path:undefined,filename:path.basename(target)})}manifest.items.push(item)}finally{await fs.rm(r.temp,{recursive:true,force:true})}}
await fs.writeFile(path.join(out,'MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,items:manifest.items.length,artifacts:manifest.items.reduce((n,x)=>n+x.artifacts.length,0),out}));
