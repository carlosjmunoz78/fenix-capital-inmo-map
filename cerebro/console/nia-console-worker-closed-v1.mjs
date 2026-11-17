/**
 * Private CEREBRO Console/NIA LAB transport adapter.
 * Reuses original CerebroGatewayV0 logic and the registered Console command.
 * HTTP always 404; service RPC requires separate server-only secret.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {CerebroGatewayV0} from './console-gateway-cloudflare-lab-v1.mjs';
import {bindConsoleNiaToFactQueueLabV1,CONSOLE_NIA_COMMAND} from './nia-console-command-binding-v1.mjs';
const TEST_QUEUE='cerebro-console-nia-once-test-eu';
const denied=reason=>({status:'DENIED',reason,executed:false});
async function sameToken(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<40||b.length<40||
    a.length>256||b.length>256)return false;
 const e=new TextEncoder();
 const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',e.encode(a)),crypto.subtle.digest('SHA-256',e.encode(b))]);
 const l=new Uint8Array(x),r=new Uint8Array(y);let diff=0;
 for(let i=0;i<l.length;i++)diff|=l[i]^r[i];
 return diff===0;
}
async function executeAuthorized(env,input,{audit=()=>{},producer=env.NIA_FACT_QUEUE,hostAuthenticated=false}={}){
 if(env.CONSOLE_NIA_ENABLED!=='true')return denied('CONSOLE_NIA_OFF');
 if(!hostAuthenticated)return denied('CALLER_NOT_AUTHENTICATED');
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!['company_id','environment','topic','already_handled'].includes(k)))
    return denied('CONSOLE_COMMAND_SCOPE');
 const gateway=new CerebroGatewayV0({environment:'PREPROD',version:'0.1.0'});
 const sid=crypto.randomUUID();
 try{
  gateway.createSession({session_id:sid,company_id:input.company_id,context:{engine_id:'CONSOLE-001'}});
  bindConsoleNiaToFactQueueLabV1({consoleGateway:gateway,queueProducer:producer,
   authorize:async()=>hostAuthenticated,auditSink:audit});
  const r=await gateway.execute({session_id:sid,command:CONSOLE_NIA_COMMAND,
   payload:{topic:input.topic, ...(input.already_handled===undefined?{}:{already_handled:input.already_handled})}});
  return {status:r.status,reason:r.reason??null,capability:CONSOLE_NIA_COMMAND,
   asynchronous:r.asynchronous===true,executed:false,notion_ai_invoked:false,
   audited:gateway.auditLog().length>=2,cost_eur:0};
 }catch{
  await audit({type:'CONSOLE_NIA_TRANSPORT_FAILURE',environment:'PREPROD'});
  return denied('CONSOLE_RUNTIME_ERROR');
 }
}
export class CerebroConsoleNiaLab extends WorkerEntrypoint{
 async dispatchNiaCommand(input,callerToken){
  if(!await sameToken(callerToken,this.env.CONSOLE_NIA_CALLER_TOKEN)){
   console.log('CONSOLE_NIA_CALLER_GATE=DENIED');
   return denied('CALLER_NOT_AUTHENTICATED');
  }
  const result=await executeAuthorized(this.env,input,{hostAuthenticated:true,
   audit:event=>console.log('CONSOLE_NIA_AUDIT='+event.type)});
  console.log('CONSOLE_NIA_GATE='+ (result.status==='PRIVATE_QUEUE_ACCEPTED'?'PASS':'DENIED'));
  return result;
 }
}
export default{
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})},
 async scheduled(){return},

};
