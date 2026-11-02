import crypto from 'node:crypto';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {classifyCmd001} from './cmd001-command-router-v1.mjs';

export const CHAT001_CONTRACT_V1=Object.freeze({engine_id:'CHAT-001',name:'Conversational Gateway',layer:'L9',version:'1.0.0',environment:'LAB_PREPROD',company_scope:'MULTI_COMPANY',inputs:['text','attachment_metadata','voice_transcript'],required:['user_id','company_id','context','permissions'],delegates_to:'CMD-001',direct_model_access:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const cleanList=v=>Array.isArray(v)?v.map(String).filter(Boolean):[];

export class Chat001ConversationalGatewayV1{
  constructor(){this.gateway=new CerebroGatewayV0({environment:'PREPROD',version:'1.0.0'});}
  async normalizeAndRoute({session_id,user_id,company_id,context={},message='',attachments=[],voice_transcript=null,permissions=[]}){
    if(!session_id||!user_id||!company_id)throw new Error('CHAT001_REQUIRED_IDENTITY');
    const normalizedText=String(voice_transcript||message||'').trim();
    if(!normalizedText)throw new Error('CHAT001_EMPTY_INPUT');
    const safeAttachments=cleanList(attachments.map?.(x=>typeof x==='string'?x:(x?.name||''))||[]);
    const engine_id=context.engine_id||'CHAT-001';
    try{this.gateway.createSession({session_id,company_id,context:{engine_id}});}catch(e){if(!/already exists/.test(String(e)))throw e;}
    const envelope={schema_version:'1.0.0',user_id,company_id,context:{company_id,engine_id:'CMD-001',environment:'PREPROD',version:'1.0.0'},message:normalizedText,attachments:safeAttachments,permissions:cleanList(permissions).sort(),input_mode:voice_transcript?'VOICE_TRANSCRIPT':safeAttachments.length?'TEXT_WITH_ATTACHMENTS':'TEXT'};
    const command=classifyCmd001({message:envelope.message,context:envelope.context,user_id,permissions:envelope.permissions});
    const out={status:command.human_required?'HUMAN_REQUIRED':'ROUTED',reason:command.human_required||null,engine_id:'CHAT-001',company_id,user_id,input_mode:envelope.input_mode,attachments:envelope.attachments,permissions:envelope.permissions,route:command,execute:false};
    return {...out,correlation_id:`chat-${hash(out).slice(0,24)}`};
  }
  contract(){return CHAT001_CONTRACT_V1;}
}
