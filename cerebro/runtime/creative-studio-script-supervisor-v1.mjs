function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function req(v,n){const s=clean(v);if(!s)throw new Error(`STUDIO_SCRIPT_${n}_REQUIRED`);return s}
function countWords(v){return clean(v).split(/\s+/).filter(Boolean).length}
function assertBlocks(blocks,limits){for(let i=0;i<blocks.length;i++){const words=countWords(blocks[i].text);if(words>limits[i])throw new Error(`STUDIO_SCRIPT_BLOCK_TOO_LONG:${i+1}:${words}>${limits[i]}`)}}

export function superviseStudioScriptV1(production){
  const p=obj(production),brief=obj(p.brief),plan=obj(p.selected_plan),output=String(plan.output_type||'').toUpperCase();
  const pressure=req(brief.pressure,'PRESSURE'),truth=req(brief.truth,'TRUTH'),benefit=req(brief.benefit,'BENEFIT'),cta=req(brief.cta,'CTA');
  let blocks,limits;
  if(output==='STORY_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Y aparece: “${pressure}”.`},
      {start_sec:4.0,text:'Freno. Primero, que encaje contigo.'},
      {start_sec:8.0,text:`Si encaja, vamos contigo. ${cta}.`}
    ];limits=[12,10,16];
  }else if(output==='REEL'||output==='SHORT_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Ya te ves dentro. Y aparece: “${pressure}”.`},
      {start_sec:7.0,text:`Freno. ${truth}. No es perder tiempo; es no comprar un problema.`},
      {start_sec:14.2,text:`${benefit}. Si encaja, aceleramos contigo. ${cta}.`}
    ];limits=[18,30,25];
  }else if(output==='LONG_VIDEO'){
    blocks=[
      {start_sec:.05,text:`Te encanta. Ya estás colocando el sofá con la mirada. Y entonces llega el mensaje: “${pressure}”.`},
      {start_sec:10.5,text:`Freno. No porque queramos quitarte la ilusión. Al revés: ${truth}.`},
      {start_sec:22.0,text:'Porque comprar casa no debería sentirse como un examen. Necesitas entender lo justo para decidir tranquilo y seguir disfrutando del momento.'},
      {start_sec:33.0,text:`Cuando encaja, cambia el ritmo: ${benefit}. Ahí sí tiene sentido acelerar.`},
      {start_sec:44.5,text:`${cta}. Y si hay que correr, corremos contigo después de saber que vamos en la dirección correcta.`}
    ];limits=[32,34,34,30,34];
  }else throw new Error(`STUDIO_SCRIPT_OUTPUT_UNSUPPORTED:${output}`);
  assertBlocks(blocks,limits);
  const selected_plan={...plan,narration_blocks:blocks,script_supervised:true,voice_direction:'Conversational, smiling, quick reactions; never instructional or announcer-like.'};
  const production_passes=[...(Array.isArray(p.production_passes)?p.production_passes:[]),{id:'SCRIPT_SUPERVISOR',status:'GREEN_CANDIDATE',notes:'Format-specific copy fit checked before voice synthesis.'}];
  return Object.freeze({...p,selected_plan,production_passes,iteration_count:Math.max(4,Number(p.iteration_count||0)),script_supervisor:{version:'v1',output_type:output,block_count:blocks.length,word_counts:blocks.map(x=>countWords(x.text)),status:'GREEN_CANDIDATE'}});
}

export const CREATIVE_STUDIO_SCRIPT_SUPERVISOR_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',format_aware:true,story_specific_copy:true,reel_specific_copy:true,long_form_specific_copy:true,pre_synthesis_fit_check:true,voice_direction:true,publication_authority:false,additional_cost_eur:0});
