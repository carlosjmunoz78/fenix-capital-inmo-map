/**
 * Additive CEREBRO Console V0 command -> existing FACT-001 private Queue.
 * No browser/client credentials, direct Notion API, model or PROD writes.
 * A trusted host MUST independently authenticate the actor before enabling authorize.
 */
export const CONSOLE_NIA_COMMAND='notion.nia.discover.read';
export const CONSOLE_NIA_FACT_EVENT='NIA_FACT_PRIVATE_DISCOVERY_V1';
export const CONSOLE_NIA_QUEUE='cerebro-fact001-nia-request-lab-eu';
const TOPICS=new Set(['documentation','knowledge','research','meeting-notes','notion-skills','notion-events']);
const safeObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const requiredKeys=new Set(['topic','already_handled']);
const human=(reason,detail)=>({status:'HUMAN_REQUIRED',reason,detail,executed:false});
export function bindConsoleNiaToFactQueueLabV1({consoleGateway,queueProducer,authorize,auditSink=()=>{}}={}) {
 if(!consoleGateway||typeof consoleGateway.registerCommand!=='function'||consoleGateway.environment!=='PREPROD')
  throw Error('CONSOLE_PREPROD_GATEWAY_REQUIRED');
 if(!queueProducer||typeof queueProducer.send!=='function')throw Error('PRIVATE_QUEUE_PRODUCER_REQUIRED');
 if(typeof authorize!=='function'||typeof auditSink!=='function')
  throw Error('TRUSTED_HOST_AUTHORIZE_AND_AUDIT_REQUIRED');
 consoleGateway.registerCommand(CONSOLE_NIA_COMMAND,async ({context,payload})=>{
  const rejection=async(reason,detail)=>{
   await auditSink({type:'CONSOLE_NIA_DENIED',reason,company_id:context.company_id,environment:context.environment});
   return human(reason,detail);
  };
  if(context.environment!=='PREPROD'||context.company_id!=='fenix'||context.engine_id!=='CONSOLE-001')
   return rejection('POLICY_CONFLICT','LAB tenant/context scope');
  if(!safeObj(payload)||Object.keys(payload).some(k=>!requiredKeys.has(k))||
     !TOPICS.has(payload.topic)||(payload.already_handled!==undefined&&typeof payload.already_handled!=='boolean'))
   return rejection('POLICY_CONFLICT','NIA read-only command scope');
  // The host's callback must prove the current caller, not accept payload.authorized.
  const allowed=await authorize({company_id:context.company_id,environment:context.environment,command:CONSOLE_NIA_COMMAND});
  if(allowed!==true)return rejection('POLICY_CONFLICT','Trusted Console host authorization missing');
  const message={type:CONSOLE_NIA_FACT_EVENT,company_id:'fenix',engine_id:'ACTGW-001',
   topic:payload.topic};
  if(payload.already_handled!==undefined)message.already_handled=payload.already_handled;
  await queueProducer.send(message);
  await auditSink({type:'CONSOLE_NIA_QUEUED',company_id:'fenix',command:CONSOLE_NIA_COMMAND,environment:'PREPROD'});
  return {status:'PRIVATE_QUEUE_ACCEPTED',capability:CONSOLE_NIA_COMMAND,environment:'PREPROD',
   executed:false,asynchronous:true,notion_ai_invoked:false,additional_cost_eur:0};
 });
 return Object.freeze({status:'BOUND',command:CONSOLE_NIA_COMMAND,transport:'CLOUDFLARE_PRIVATE_QUEUE',
  production_enabled:false});
}
