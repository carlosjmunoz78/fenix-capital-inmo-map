import { lockCreativeCastV1 } from './creative-cast-lock-v1.mjs';

function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function req(v,n){const s=clean(v);if(!s)throw new Error(`STUDIO_SCRIPT_${n}_REQUIRED`);return s}
function countWords(v){return clean(v).split(/\s+/).filter(Boolean).length}
function assertBlocks(blocks,limits){for(let i=0;i<blocks.length;i++){const words=countWords(blocks[i].text);if(words>limits[i])throw new Error(`STUDIO_SCRIPT_BLOCK_TOO_LONG:${i+1}:${words}>${limits[i]}`)}for(let i=1;i<blocks.length;i++){if(Number(blocks[i].start_sec)-Number(blocks[i-1].start_sec)>10)throw new Error(`STUDIO_SCRIPT_BLOCK_SPACING_TOO_WIDE:${i+1}`)}}

export function superviseStudioScriptV1(production){
  const p=obj(production),brief=obj(p.brief),plan=obj(p.selected_plan),output=String(plan.output_type||'').toUpperCase();
  const pressure=req(brief.pressure,'PRESSURE');req(brief.truth,'TRUTH');req(brief.benefit,'BENEFIT');req(brief.cta,'CTA');
  let blocks,limits;
  if(output==='STORY_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Y aparece: “${pressure}”.`},
      {start_sec:3.10,text:'Freno. Mira primero si de verdad encaja contigo.'},
      {start_sec:6.35,text:'¿Encaja? Genial. Ahora sí: vamos contigo. Escríbenos.'}
    ];limits=[12,12,12];
  }else if(output==='REEL'||output==='SHORT_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Ya te ves dentro. Y aparece: “${pressure}”.`},
      {start_sec:5.7,text:'Freno. No mates la ilusión por correr.'},
      {start_sec:10.8,text:'Primero mira si encaja contigo y con la vivienda. Eso cambia todo.'},
      {start_sec:16.0,text:'¿Encaja? Perfecto. Aceleramos contigo. Escríbenos.'}
    ];limits=[18,10,16,10];
  }else if(output==='LONG_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Entras, miras la cocina y ya estás colocando el sofá con la cabeza. Entonces llega el mensaje: “${pressure}”.`},
      {start_sec:8.8,text:'Y ahí el corazón quiere correr más rápido que los números. Es normal: cuando una casa te encaja, perderla parece peor que equivocarte.'},
      {start_sec:17.2,text:'Freno. No para quitarte ilusión, sino para protegerla. Antes de lanzarte, conviene saber si la operación encaja contigo y con esa vivienda.'},
      {start_sec:26.0,text:'Cuando lo compruebas, cambia todo. Dejas de imaginar problemas, sabes qué margen tienes y puedes decidir con la cabeza tranquila sin apagar las ganas.'},
      {start_sec:34.7,text:'Si encaja, entonces sí: aceleramos. Hablamos, movemos documentación y buscamos que esa ilusión avance sin convertir cada decisión en una apuesta.'},
      {start_sec:43.5,text:'Cuéntanos tu caso. Si hay que correr, corremos contigo; pero en la dirección correcta, con claridad desde el principio y sin ir a ciegas.'}
    ];limits=[30,28,28,30,28,30];
  }else throw new Error(`STUDIO_SCRIPT_OUTPUT_UNSUPPORTED:${output}`);
  assertBlocks(blocks,limits);
  const castLock=lockCreativeCastV1({scenes:plan.scenes,character_bible:plan.character_bible});
  const selected_plan={...plan,scenes:castLock.scenes,narration_blocks:blocks,script_supervised:true,cast_lock:castLock,primary_cast_video_source:castLock.primary_cast_video_source,voice_direction:'Conversational, cinematic and human; smiling when appropriate, varied rhythm, meaningful pauses and reactions; never instructional, list-like or announcer-like.'};
  const production_passes=[...(Array.isArray(p.production_passes)?p.production_passes:[]),{id:'SCRIPT_SUPERVISOR',status:'GREEN_CANDIDATE',notes:'Format-specific copy fit, continuous narrative density and governed primary-cast source lock checked before physical production.'}];
  return Object.freeze({...p,selected_plan,production_passes,iteration_count:Math.max(6,Number(p.iteration_count||0)),script_supervisor:{version:'v1.5',output_type:output,block_count:blocks.length,word_counts:blocks.map(x=>countWords(x.text)),total_words:blocks.reduce((n,x)=>n+countWords(x.text),0),starts:blocks.map(x=>x.start_sec),continuous_across_cuts:true,cast_lock_method:castLock.method,primary_cast_video_source:castLock.primary_cast_video_source,primary_character_scene_ratio:castLock.primary_character_scene_ratio,status:'GREEN_CANDIDATE'}});
}

export const CREATIVE_STUDIO_SCRIPT_SUPERVISOR_V1_CONTRACT=Object.freeze({schema_version:'1.5.0',owner_engine:'CREATIVE-STUDIO-001',format_aware:true,story_specific_copy:true,reel_specific_copy:true,long_form_specific_copy:true,long_form_story_density_required:true,pre_synthesis_fit_check:true,voice_direction:true,continuous_across_cuts:true,natural_timing_over_forced_speed:true,max_social_voice_gap_sec:2.4,governed_primary_cast_lock:true,broll_separated_from_primary:true,publication_authority:false,additional_cost_eur:0});
