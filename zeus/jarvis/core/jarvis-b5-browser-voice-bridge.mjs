/** B5 non-invasive bridge contract for existing src/cerebroVoice.ts.
 * Expects a finalized Web Speech result from the existing UI. Does not
 * initialize SpeechRecognition, synthesize sound, change UI or execute actions.
 * Browser transcript/claims are untrusted; B2/B3 gating must happen server-side.
 */
import {compileJarvisB5Intent} from './jarvis-b5-intent.mjs';
const CONFIRM_MIN=0.85; // Existing src/cerebroVoice.ts VOICE_CONFIRMATION_CONFIDENCE_MIN
const QUERY_MIN=0.60;   // Existing src/cerebroVoice.ts VOICE_QUERY_CONFIDENCE_MIN
const confirmations=new Set(['si','sí','si adelante','sí adelante','adelante','confirmo','activalo','actívalo','hazlo','procede']);
const normalized=s=>s.toLocaleLowerCase('es-ES').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[¿?¡!.,;:]/g,'').replace(/\s+/g,' ').trim();
const output=(state,reason,intent=null)=>Object.freeze({state,reason,intent,mayExecute:false,requiresB3Authorization:true});
export function adaptJarvisB5BrowserVoice({transcript,confidence=null,isFinal=true,pendingAction=false,companyId,projectId,missionId=null}={}){
 if(isFinal!==true)return output('INTERIM_IGNORED','AWAIT_FINAL_TRANSCRIPT');
 if(typeof transcript!=='string'||transcript.length===0||transcript.length>2000)throw Error('VOICE_TRANSCRIPT_INVALID');
 if(confidence!==null&&(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1))
  throw Error('VOICE_CONFIDENCE_INVALID');
 const intent=compileJarvisB5Intent({text:transcript,channel:'VOICE_STT',companyId,projectId,missionId});
 if(intent.kind==='INTERRUPT')return output('STOP_AUDIO_LOCAL','USER_INTERRUPTION',intent);
 if(intent.kind==='REJECTED')return output('REJECTED','SENSITIVE_VOICE_TEXT',intent);
 if(intent.requiresHuman)return output('HUMAN_REQUIRED','HIGH_RISK',intent);
 const isConfirmation=confirmations.has(normalized(transcript.replace(/^(?:oye\s+)?(?:jarvis|cerebro)[,:]?\s*/i,'')));
 if(pendingAction&&isConfirmation)
  return output('CONFIRMATION_REQUIRED',
    confidence===null||confidence<CONFIRM_MIN?'LOW_STT_CONFIDENCE':'B3_MANDATORY_APPROVAL',intent);
 if(confidence===null)return output('CLARIFY','NO_STT_CONFIDENCE',intent);
 if(confidence!==null&&confidence<QUERY_MIN)return output('CLARIFY','LOW_STT_CONFIDENCE',intent);
 if(intent.needsClarification)return output('CLARIFY',intent.clarification,intent);
 return output('INTENT_READY','REQUIRES_SERVER_AUTH_AND_EXECUTION_GATE',intent);
}
