function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
function sum(a){return a.reduce((x,y)=>x+y,0)}

function projectBounded(target,mins,maxs,total){
  const out=target.map((v,i)=>clamp(n(v,mins[i]),mins[i],maxs[i]));
  const minTotal=sum(mins),maxTotal=sum(maxs);
  if(total<minTotal-1e-6)throw new Error(`VOICE_TIMELINE_TOO_DENSE:${total.toFixed(3)}<${minTotal.toFixed(3)}`);
  if(total>maxTotal+1e-6)throw new Error(`VOICE_TIMELINE_TOO_SPARSE:${total.toFixed(3)}>${maxTotal.toFixed(3)}`);
  let diff=total-sum(out),guard=0;
  while(Math.abs(diff)>1e-7&&guard++<24){
    const grow=diff>0;
    const idx=[];let capacity=0;
    for(let i=0;i<out.length;i++){
      const c=grow?maxs[i]-out[i]:out[i]-mins[i];
      if(c>1e-9){idx.push([i,c]);capacity+=c}
    }
    if(!idx.length||capacity<=1e-9)break;
    const amount=Math.min(Math.abs(diff),capacity);
    for(const [i,c] of idx){
      const delta=amount*(c/capacity)*(grow?1:-1);
      out[i]+=delta;
    }
    diff=total-sum(out);
  }
  if(Math.abs(total-sum(out))>1e-5)throw new Error('VOICE_TIMELINE_PROJECTION_FAILED');
  return out;
}

export function planCreativeVoiceTimelineV1(input={}){
  const durations=(Array.isArray(input.durations_sec)?input.durations_sec:[]).map(x=>n(x,-1));
  if(durations.length<2||durations.some(x=>x<=0))throw new Error('VOICE_TIMELINE_DURATIONS_REQUIRED');
  const total=n(input.total_sec,-1),maxGap=n(input.max_gap_sec,2.4),hookMax=n(input.hook_deadline_sec,1.2),initialTarget=n(input.initial_target_sec,.05),endTarget=n(input.end_target_sec,.18),minInternal=n(input.min_internal_gap_sec,.08);
  if(total<=0||maxGap<=0)throw new Error('VOICE_TIMELINE_TOTAL_REQUIRED');
  const voiceTotal=sum(durations),silence=total-voiceTotal;
  const count=durations.length;
  const mins=[Math.min(initialTarget,hookMax),...Array(Math.max(0,count-1)).fill(Math.max(0,minInternal)),Math.max(0,endTarget)];
  const maxs=[Math.min(hookMax,maxGap),...Array(Math.max(0,count-1)).fill(maxGap),maxGap];
  const preferred=Array.isArray(input.preferred_starts_sec)?input.preferred_starts_sec.map(x=>n(x,0)):[];
  const target=[];
  target.push(preferred.length?preferred[0]:initialTarget);
  for(let i=1;i<count;i++){
    const gap=preferred.length===count?preferred[i]-(preferred[i-1]+durations[i-1]):Math.min(maxGap,Math.max(minInternal,(silence-initialTarget-endTarget)/Math.max(1,count-1)));
    target.push(gap);
  }
  const preferredEndGap=preferred.length===count?total-(preferred[count-1]+durations[count-1]):endTarget;
  target.push(preferredEndGap);
  const gaps=projectBounded(target,mins,maxs,silence);
  const starts=[];let cursor=gaps[0];
  for(let i=0;i<count;i++){
    starts.push(cursor);
    cursor+=durations[i];
    if(i<count-1)cursor+=gaps[i+1];
  }
  const finalEnd=starts[count-1]+durations[count-1];
  const computed=[starts[0]];
  for(let i=0;i<count-1;i++)computed.push(starts[i+1]-(starts[i]+durations[i]));
  computed.push(total-finalEnd);
  const maxComputed=Math.max(...computed);
  if(starts[0]>hookMax+1e-6)throw new Error(`VOICE_TIMELINE_HOOK_LATE:${starts[0].toFixed(3)}`);
  if(maxComputed>maxGap+1e-6)throw new Error(`VOICE_TIMELINE_GAP_TOO_LONG:${maxComputed.toFixed(3)}`);
  const ctaStart=starts[count-1],ctaEnd=ctaStart+durations[count-1];
  return Object.freeze({schema_version:'1.0.0',starts_sec:starts.map(x=>Number(x.toFixed(3))),gaps_sec:computed.map(x=>Number(x.toFixed(3))),max_gap_sec:Number(maxComputed.toFixed(3)),voice_total_sec:Number(voiceTotal.toFixed(3)),silence_total_sec:Number(silence.toFixed(3)),cta_start_sec:Number(ctaStart.toFixed(3)),cta_end_sec:Number(ctaEnd.toFixed(3)),end_margin_sec:Number((total-ctaEnd).toFixed(3)),hook_start_sec:Number(starts[0].toFixed(3)),preferred_starts_used:preferred.length===count});
}

export const CREATIVE_VOICE_TIMELINE_PLANNER_V1_CONTRACT=Object.freeze({schema_version:'1.0.0',owner_engine:'CREATIVE-STUDIO-001',measures_real_voice_duration:true,hard_max_gap_sec:2.4,hook_deadline_sec:1.2,deterministic:true,publication_authority:false,additional_cost_eur:0});
