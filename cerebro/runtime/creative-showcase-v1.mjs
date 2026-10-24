import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderCreativeJob } from './creative-job-runner-v1.mjs';

const environment=String(process.env.CEREBRO_SHOWCASE_ENV||'PREPROD').toUpperCase();
if(!['PREPROD','PROD'].includes(environment))throw new Error('SHOWCASE_ENV_DENIED');
const outDir=path.resolve(process.env.CEREBRO_SHOWCASE_DIR||'./creative-showcase-output');
await fs.rm(outDir,{recursive:true,force:true});await fs.mkdir(outDir,{recursive:true});
const photo='https://fenixcapital.es/wp-content/uploads/2026/10/Fenix-C2B7-Pareja-en-casa-revisando-su-compra-1.jpg';
const brand={background:'#141414',primary:'#ffffff',accent:'#8a1d63'};
const base={company_id:'fenix',engine_id:'SOC-001',department_id:'creative',environment,version:'v1',channel:'REVIEW_ONLY'};
const mk=(output_type,creative_payload,request={})=>({...base,job_id:crypto.randomUUID(),output_type,request:{...request,creative_payload:{brand,brand_label:'Fénix Capital',...creative_payload},publish_requested:false,expected_cost_eur:0}});

const jobs=[
  ['01-post-fotografico',mk('STATIC_POST',{visual_style:'PHOTO',background_image_url:photo,headline:'Antes de reservar, mira la operación completa',subheadline:'Vivienda, ingresos, ahorro, gastos y plazos tienen que encajar juntos.',cta:'Estudia tu caso antes de comprometerte'})],
  ['02-post-editorial',mk('SQUARE_POST',{visual_style:'EDITORIAL',headline:'Comprar vivienda no empieza en el banco',subheadline:'Empieza sabiendo qué puedes sostener de verdad y qué documentación necesitarás.',cta:'Decide con datos'})],
  ['03-post-datos',mk('STATIC_POST',{visual_style:'DATA',metric:'24–48 h',metric_label:'Objetivo operativo para el preestudio hipotecario',headline:'Velocidad con criterio',subheadline:'La rapidez sirve cuando el expediente llega ordenado, documentado y con alertas claras.',cta:'Prepara bien el expediente'})],
  ['04-carrusel',mk('CAROUSEL',{visual_style:'DATA',headline:'Antes de reservar',pages:[
    {metric:'1',metric_label:'Ingresos y estabilidad',headline:'¿La cuota cabe con margen?',subheadline:'No mires solo la cuota: revisa también deudas, gastos y colchón mensual.'},
    {metric:'2',metric_label:'Ahorro y gastos',headline:'¿Qué dinero necesitas realmente?',subheadline:'Entrada, impuestos, tasación y otros gastos cambian la operación.'},
    {metric:'3',metric_label:'Vivienda y tasación',headline:'La casa también tiene que ser financiable',subheadline:'Registro, estado, valor y tipología pueden condicionar al banco.'},
    {metric:'4',metric_label:'Plazos',headline:'Reserva solo con calendario realista',subheadline:'Estudio, tasación, FEIN y notaría necesitan margen.'},
    {metric:'5',metric_label:'Decisión',headline:'Primero viabilidad. Después compromiso.',subheadline:'Cuanto antes detectes un bloqueo, más margen tendrás para resolverlo.',cta:'Fénix Capital'}
  ]})],
  ['05-story',mk('STORY',{visual_style:'PHOTO',background_image_url:photo,headline:'¿Has visto una vivienda y te urge reservar?',subheadline:'Comprueba primero si comprador, inmueble y calendario encajan.',cta:'Preestudio antes de reservar'})],
  ['06-video-corto',mk('SHORT_VIDEO',{visual_style:'PHOTO',background_image_url:photo,headline:'Antes de reservar',timeline:[
    {duration_sec:5,headline:'Has encontrado la vivienda',subheadline:'Y ahora todo parece urgente.',voiceover:'Has encontrado una vivienda que te encaja y, de repente, todo parece urgente.'},
    {duration_sec:5,headline:'No mires solo la cuota',subheadline:'Ingresos, deudas, ahorro y gastos importan.',voiceover:'Antes de reservar, revisa ingresos, deudas, ahorro disponible y todos los gastos de la compra.'},
    {duration_sec:5,headline:'La vivienda también cuenta',subheadline:'Tasación, registro y tipología pueden cambiar la financiación.',voiceover:'La vivienda también tiene que encajar: tasación, registro y tipología pueden cambiar la financiación.'},
    {duration_sec:5,headline:'Primero viabilidad',subheadline:'Después, compromiso.',cta:'Fénix Capital',voiceover:'La idea es sencilla: primero viabilidad real; después, compromiso.'}
  ],audio:{voice_enabled:true,voice_id:'ES_FEMALE',music_enabled:true}})],
  ['07-video-largo',mk('LONG_VIDEO',{visual_style:'DATA',headline:'Cómo preparar una compra antes de reservar',timeline:[
    {duration_sec:12,metric:'01',metric_label:'Punto de partida',headline:'Empieza por tu presupuesto real',subheadline:'La cuota es solo una parte de la decisión.',voiceover:'Antes de mirar bancos, calcula cuánto puedes destinar cada mes sin quedarte sin margen. La cuota es importante, pero también lo son tus gastos fijos, tus deudas y el colchón que quieres conservar.'},
    {duration_sec:12,metric:'02',metric_label:'Estabilidad',headline:'Demuestra cómo entra el dinero',subheadline:'Antigüedad, contrato y continuidad ayudan a explicar el perfil.',voiceover:'Después revisa la estabilidad de los ingresos. El banco necesita entender de dónde viene el dinero, desde cuándo, y si existe continuidad suficiente para sostener la operación.'},
    {duration_sec:12,metric:'03',metric_label:'Ahorro',headline:'Cuenta todos los gastos de compra',subheadline:'No presupuestes solo la entrada.',voiceover:'El siguiente paso es calcular el ahorro disponible. No presupuestes solo la entrada. Incluye impuestos, tasación y los demás gastos para saber qué financiación necesitas de verdad.'},
    {duration_sec:12,metric:'04',metric_label:'Inmueble',headline:'Comprueba que la vivienda encaja',subheadline:'Registro, estado, uso y tasación pueden condicionar el préstamo.',voiceover:'La vivienda también forma parte del riesgo. Su situación registral, su estado, su uso y la tasación pueden condicionar el porcentaje financiable y los plazos.'},
    {duration_sec:12,metric:'05',metric_label:'Calendario',headline:'Pon fechas realistas',subheadline:'Estudio, tasación, FEIN y notaría necesitan margen.',voiceover:'Ahora coloca el calendario. Un expediente necesita estudio, documentación, tasación, condiciones, FEIN y notaría. Reservar con un plazo imposible crea un problema que se podía evitar.'},
    {duration_sec:12,metric:'06',metric_label:'Decisión',headline:'Reserva cuando conozcas los riesgos',subheadline:'La velocidad funciona mejor cuando hay método.',cta:'Fénix Capital',voiceover:'Cuando comprador, vivienda, dinero y calendario encajan, ya puedes decidir con mucha más información. La velocidad funciona mejor cuando existe método y cada riesgo se detecta antes de firmar.'}
  ],audio:{voice_enabled:true,voice_id:'ES_MALE',music_enabled:true}})]
];

const manifest={schema_version:'1.0.0',environment,company_id:'fenix',engine_id:'SOC-001',publish_authorized:false,additional_cost_eur:0,generated_at:new Date().toISOString(),items:[]};
for(const [label,job] of jobs){
  const rendered=await renderCreativeJob(job);
  try{
    const item={label,output_type:job.output_type,job_id:job.job_id,artifacts:[]};
    for(const artifact of rendered.artifacts){
      const ext=path.extname(artifact.filename);const target=path.join(outDir,`${label}${artifact.page?`-${String(artifact.page).padStart(2,'0')}`:''}${artifact.mime==='application/pdf'?'-deck':''}${ext}`);
      await fs.copyFile(artifact.local_path,target);
      item.artifacts.push({filename:path.basename(target),mime:artifact.mime,bytes:artifact.bytes,sha256:artifact.sha256,width:artifact.width??null,height:artifact.height??null,duration_sec:artifact.duration_sec??null,pages:artifact.pages??null,visual_style:artifact.visual_style??null,audio:artifact.audio??null,source_attribution:artifact.source_attribution??null});
    }
    manifest.items.push(item);
  } finally {await fs.rm(rendered.temp,{recursive:true,force:true});}
}
await fs.writeFile(path.join(outDir,'MANIFEST.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ok:true,environment,item_count:manifest.items.length,artifact_count:manifest.items.reduce((n,x)=>n+x.artifacts.length,0),out_dir:outDir,publish_authorized:false,additional_cost_eur:0}));
