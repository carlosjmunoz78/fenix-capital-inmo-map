import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCreativeSocialV4, assertCreativeSocialV4 } from '../runtime/creative-social-quality-v4.mjs';

const scenes=Array.from({length:7},(_,i)=>({headline:`Escena ${i+1}`,duration_sec:2.8}));
const base={output_type:'REEL',channel:'INSTAGRAM',social_narrative:true,hook_within_sec:.2,voice_style:'SOCIAL_ENERGETIC',social_arc:['HOOK','TENSION','RELIEF','PAYOFF','CTA'],scenes,narration_blocks:[{start_sec:.1,text:'Hook social'},{start_sec:5,text:'Desarrollo'},{start_sec:11,text:'Cierre'}]};
const physical={continuous_narration:true,scene_locked_narration:false,voice_coverage_ratio:.64,max_voice_gap_sec:1.3,voice_wpm:164,sfx_peak_db:-7.5,sfx_event_count:7,fast_transition_accents:true,repetitive_full_frame_sweeps:false};

test('professional social reel passes narrative-first gate',()=>{const r=assertCreativeSocialV4({plan:base,physical_evidence:physical});assert.equal(r.verdict,'SOCIAL_QA_GREEN')});
test('one phrase per shot telegram pacing is rejected',()=>{const plan={...base,narration_blocks:scenes.map((_,i)=>({start_sec:i*2.2,text:'Frase'}))};const r=evaluateCreativeSocialV4({plan,physical_evidence:{...physical,scene_locked_narration:true}});assert.equal(r.passed,false);assert.ok(r.failures.some(x=>x.code==='TELEGRAM_NARRATION_REJECTED'));assert.ok(r.failures.some(x=>x.code==='SCENE_LOCKED_NARRATION_REJECTED'))});
test('training-like numeric density is rejected on social video',()=>{const numbered=scenes.map((s,i)=>({...s,metric:String(i+1).padStart(2,'0')}));const r=evaluateCreativeSocialV4({plan:{...base,scenes:numbered},physical_evidence:physical});assert.equal(r.passed,false);assert.ok(r.failures.some(x=>x.code==='SOCIAL_NUMBER_DENSITY_TOO_HIGH'))});
test('inaudible sfx are rejected even if events exist',()=>{const r=evaluateCreativeSocialV4({plan:base,physical_evidence:{...physical,sfx_peak_db:-30}});assert.equal(r.passed,false);assert.ok(r.failures.some(x=>x.code==='SOCIAL_SFX_NOT_AUDIBLE'))});
test('slow repetitive slash/sweep treatment is rejected',()=>{const r=evaluateCreativeSocialV4({plan:base,physical_evidence:{...physical,repetitive_full_frame_sweeps:true}});assert.equal(r.passed,false);assert.ok(r.failures.some(x=>x.code==='REPETITIVE_SLASH_EFFECT_REJECTED'))});
