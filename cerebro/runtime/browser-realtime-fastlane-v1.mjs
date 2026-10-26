import {createClient} from '@supabase/supabase-js';
import crypto from 'node:crypto';

export function browserRealtimeTopic(sessionId){return`cerebro-browser-human-v1:${String(sessionId||'')}`;}
export function browserInputDedupeKey(commandType,ciphertext,iv){return crypto.createHash('sha256').update(`${String(commandType||'')}|${String(ciphertext||'')}|${String(iv||'')}`).digest('hex');}

export async function createBrowserRealtimeFastlane({url,key,sessionId,onInput}={}){
 if(!url||!key||!sessionId||typeof onInput!=='function')return{enabled:false,broadcastFrame:async()=>false,close:async()=>{}};
 const client=createClient(String(url),String(key),{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:120}}});
 const channel=client.channel(browserRealtimeTopic(sessionId),{config:{broadcast:{self:false,ack:true}}});
 let subscribed=false;
 channel.on('broadcast',{event:'input'},({payload})=>{void(async()=>{
  const commandType=String(payload?.command_type||''),ciphertext=String(payload?.payload_ciphertext||''),iv=String(payload?.payload_iv||'');
  const dedupe=String(payload?.dedupe_key||browserInputDedupeKey(commandType,ciphertext,iv));
  let result={ok:false,errorCode:'REALTIME_INPUT_REJECTED'};
  try{result=await onInput({...payload,command_type:commandType,payload_ciphertext:ciphertext,payload_iv:iv,dedupe_key:dedupe});}catch(error){result={ok:false,errorCode:String(error?.message||error).slice(0,120)};}
  await channel.send({type:'broadcast',event:'ack',payload:{dedupe_key:dedupe,ok:result?.ok===true,error:result?.ok===true?null:result?.errorCode||'REALTIME_INPUT_REJECTED'}}).catch(()=>null);
 })();});
 await new Promise(resolve=>{let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;resolve(false);}},1600);channel.subscribe(status=>{if(settled)return;if(status==='SUBSCRIBED'){subscribed=true;settled=true;clearTimeout(timer);resolve(true);}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){settled=true;clearTimeout(timer);resolve(false);}});});
 return{
  enabled:subscribed,
  broadcastFrame:async payload=>{if(!subscribed)return false;return(await channel.send({type:'broadcast',event:'frame',payload}).catch(()=>null))==='ok';},
  close:async()=>{subscribed=false;await client.removeChannel(channel).catch(()=>null);}
 };
}
