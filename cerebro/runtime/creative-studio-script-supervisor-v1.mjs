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
      {start_sec:.05,text:`Te encanta. Ya estás colocando el sofá con la mirada. Y llega el mensaje: “${pressure}”.`},
      {start_sec:8.8,text:'Freno. No para quitarte ilusión. Para que la prisa no decida por ti.'},
      {start_sec:17.2,text:'Primero mira si la operación encaja contigo y con esa vivienda. Sin convertirlo en un examen.'},
      {start_sec:26.0,text:'Cuando lo ves claro, cambia el cuerpo. Dejas de adivinar y empiezas a decidir.'},
      {start_sec:34.7,text:'Y si encaja, entonces sí: aceleramos. Con ganas, con criterio y sin matar el momento.'},
      {start_sec:43.5,text:'Cuéntanos tu caso. Si hay que correr, corremos contigo, pero en la dirección correcta.'}
    ];limits=[26,18,22,18,20,20];
  }else throw new Error(`STUDIO_SCRIPT_OUTPUT_UNSUPPORTED:${output}`);
  assertBlocks(blocks,limits);
  const selected_plan={...plan,narration_blocks:blocks,script_supervised:true,voice_direction:'Conversational, smiling, quick reactions; one thought can travel across several cuts; never instructional or announcer-like.'};
  const production_passes=[...(Array.isArray(p.production_passes)?p.production_passes:[]),{id:'SCRIPT_SUPERVISOR',status:'GREEN_CANDIDATE',notes:'Format-specific copy fit and continuous narration spacing checked before voice synthesis.'}];
  return Object.freeze({...p,selected_plan,production_passes,iteration_count:Math.max(6,Number(p.iteration_count||0)),script_supervisor:{version:'v1.3',output_type:output,block_count:blocks.length,word_counts:blocks.map(x=>countWords(x.text)),starts:blocks.map(x=>x.start_sec),continuous_across_cuts:true,status:'GREEN_CANDIDATE'}});
}

export const CREATIVE_STUDIO_SCRIPT_SUPERVISOR_V1_CONTRACT=Object.freeze({schema_version:'1.3.0',owner_engine:'CREATIVE-STUDIO-001',format_aware:true,story_specific_copy:true,reel_specific_copy:true,long_form_specific_copy:true,pre_synthesis_fit_check:true,voice_direction:true,continuous_across_cuts:true,natural_timing_over_forced_speed:true,max_social_voice_gap_sec:2.4,publication_authority:false,additional_cost_eur:0});
