import fs from 'node:fs';

const runtime='cerebro/runtime/browser-interactive-session-v3.mjs';
const cloudWorker='cerebro/runtime/cloud-browser-worker-v0.mjs';
const supabaseSource='src/supabase.ts';
let source=fs.readFileSync(runtime,'utf8');

function replaceOnce(from,to,label){
 if(!source.includes(from))throw new Error(`REALTIME_PATCH_ANCHOR_MISSING:${label}`);
 source=source.replace(from,to);
}

replaceOnce(
 "import {decryptWorkspaceSnapshot,encryptWorkspaceSnapshot,exportProfileStorageState,restoreProfileStorageState} from './browser-session-bundle-v1.mjs';",
 "import {decryptWorkspaceSnapshot,encryptWorkspaceSnapshot,exportProfileStorageState,restoreProfileStorageState} from './browser-session-bundle-v1.mjs';\nimport {browserInputDedupeKey,createBrowserRealtimeFastlane} from './browser-realtime-fastlane-v1.mjs';",
 'IMPORT'
);
replaceOnce(
 "const MAX_SESSION_MS=Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_MAX_MS||780000),780000);",
 "const MAX_SESSION_MS=Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_MAX_MS||2400000),2400000);",
 'MAX_SESSION'
);
replaceOnce(
 "const FRAME_INTERVAL_MS=Math.max(900,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_FRAME_MS||1400));\nconst POLL_INTERVAL_MS=Math.max(25,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_MS||35));",
 "const FRAME_INTERVAL_MS=Math.max(900,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_FRAME_MS||1400));\nconst HUMAN_FRAME_INTERVAL_MS=Math.max(120,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_HUMAN_FRAME_MS||220));\nconst REALTIME_URL=String(process.env.CEREBRO_BROWSER_REALTIME_URL||'').trim();\nconst REALTIME_KEY=String(process.env.CEREBRO_BROWSER_REALTIME_PUBLISHABLE_KEY||'').trim();\nconst POLL_INTERVAL_MS=Math.max(25,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_MS||35));",
 'CONSTANTS'
);
replaceOnce(
 "async function captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl){",
 "async function captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl,persist=true){",
 'CAPTURE_SIGNATURE'
);
replaceOnce(
 "  await callInteractive(endpoint,'worker/frame',tokenProvider,{session_id:sessionId,frame_ciphertext:encrypted.ciphertext,frame_iv:encrypted.iv,frame_seq:seq,frame_mime:'image/png',current_url:url,current_title:String(result.current_title||'').slice(0,240),tabs,active_tab_index:activeTabIndex,viewport_width:Number(result.viewport_width||1440),viewport_height:Number(result.viewport_height||1000)},fetch_impl);\n  return{final_url:url,frame_seq:seq,private_tabs:privateTabs,active_tab_index:activeTabIndex};",
 "  const currentTitle=String(result.current_title||'').slice(0,240),viewportWidth=Number(result.viewport_width||1440),viewportHeight=Number(result.viewport_height||1000);\n  if(persist)await callInteractive(endpoint,'worker/frame',tokenProvider,{session_id:sessionId,frame_ciphertext:encrypted.ciphertext,frame_iv:encrypted.iv,frame_seq:seq,frame_mime:'image/png',current_url:url,current_title:currentTitle,tabs,active_tab_index:activeTabIndex,viewport_width:viewportWidth,viewport_height:viewportHeight},fetch_impl);\n  return{final_url:url,current_title:currentTitle,frame_seq:seq,frame_ciphertext:encrypted.ciphertext,frame_iv:encrypted.iv,frame_mime:'image/png',private_tabs:privateTabs,tabs,active_tab_index:activeTabIndex,viewport_width:viewportWidth,viewport_height:viewportHeight};",
 'CAPTURE_RETURN'
);
replaceOnce(
 "  const startedAt=Date.now();let seq=0,lastFrameAt=0,lastUrl='';let opened=false,closed=false,stopRequested=false,hibernateRequested=false;let lastPrivateTabs=[],lastActiveTabIndex=0;let identityVerification={status:'NOT_APPLICABLE'};\n  const publishFrame=async key=>{seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl);lastUrl=frame.final_url||lastUrl;lastPrivateTabs=frame.private_tabs;lastActiveTabIndex=frame.active_tab_index;lastFrameAt=Date.now();return frame;};",
 "  const startedAt=Date.now();let seq=0,lastFrameAt=0,lastRealtimeFrameAt=0,lastUrl='';let opened=false,closed=false,stopRequested=false,hibernateRequested=false;let lastPrivateTabs=[],lastActiveTabIndex=0;let identityVerification={status:'NOT_APPLICABLE'};let fastlane=null;let frameDirty=false;let lastControl={state:'',control_owner:'',human_lease_id:null};\n  const broadcastFrame=async frame=>{if(!fastlane?.enabled)return false;return fastlane.broadcastFrame({session_id:sessionId,frame_ciphertext:frame.frame_ciphertext,frame_iv:frame.frame_iv,frame_mime:frame.frame_mime,frame_seq:frame.frame_seq,viewport_width:frame.viewport_width,viewport_height:frame.viewport_height,current_url:frame.final_url,current_title:frame.current_title,tabs:frame.tabs,active_tab_index:frame.active_tab_index});};\n  const publishFrame=async key=>{seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl,true);lastUrl=frame.final_url||lastUrl;lastPrivateTabs=frame.private_tabs;lastActiveTabIndex=frame.active_tab_index;lastFrameAt=Date.now();lastRealtimeFrameAt=lastFrameAt;frameDirty=false;void broadcastFrame(frame);return frame;};\n  const publishRealtimeFrame=async key=>{seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl,false);lastUrl=frame.final_url||lastUrl;lastPrivateTabs=frame.private_tabs;lastActiveTabIndex=frame.active_tab_index;lastRealtimeFrameAt=Date.now();frameDirty=false;await broadcastFrame(frame);return frame;};",
 'SESSION_STATE'
);
replaceOnce(
 "    const keyResult=await callInteractive(endpoint,'worker/key',tokenProvider,{session_id:sessionId},fetch_impl);const key=b64ToBuffer(keyResult.key_b64);if(key.length!==32)throw new Error('INTERACTIVE_KEY_INVALID');\n    if(workspaceEnabled(job))identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastUrl,endpoint,tokenProvider,fetch_impl);",
 "    const keyResult=await callInteractive(endpoint,'worker/key',tokenProvider,{session_id:sessionId},fetch_impl);const key=b64ToBuffer(keyResult.key_b64);if(key.length!==32)throw new Error('INTERACTIVE_KEY_INVALID');\n    const executedDedupe=new Set(),executedOrder=[];let actionChain=Promise.resolve({ok:true,errorCode:null,deduped:false});\n    const rememberDedupe=dedupe=>{if(!dedupe||executedDedupe.has(dedupe))return;executedDedupe.add(dedupe);executedOrder.push(dedupe);while(executedOrder.length>500){const old=executedOrder.shift();if(old)executedDedupe.delete(old);}};\n    const executeEncryptedInput=input=>{const dedupe=String(input?.dedupe_key||browserInputDedupeKey(input?.command_type,input?.payload_ciphertext,input?.payload_iv));const run=async()=>{if(executedDedupe.has(dedupe))return{ok:true,errorCode:null,deduped:true};let ok=false,errorCode=null;try{const payload=decryptJson(input.payload_ciphertext,input.payload_iv,key);const action=humanAction(input.command_type,payload);const result=await worker.execute({...base,actions:[action],keep_session_open:true,capture_final_evidence:false});ok=result?.ok===true;lastUrl=scrubUrl(result?.final_url||lastUrl);lastPrivateTabs=normalizePrivateTabs(result?.tabs||lastPrivateTabs);lastActiveTabIndex=Number.isInteger(result?.active_tab_index)?result.active_tab_index:lastActiveTabIndex;if(!ok)errorCode=result?.authorization?.status||'HUMAN_ACTION_NOT_AUTHORIZED';if(ok){rememberDedupe(dedupe);frameDirty=true;}}catch(error){errorCode=String(error?.message||error).slice(0,120);}return{ok,errorCode,deduped:false};};actionChain=actionChain.then(run,run);return actionChain;};\n    fastlane=await createBrowserRealtimeFastlane({url:REALTIME_URL,key:REALTIME_KEY,sessionId,onInput:async input=>{const lease=String(input?.lease_id||'');if(lastControl.state!=='HUMAN_CONTROLLED'||lastControl.control_owner!=='HUMAN'||!lease||lease!==String(lastControl.human_lease_id||''))return{ok:false,errorCode:'REALTIME_HUMAN_LEASE_INVALID'};return executeEncryptedInput(input);}});\n    if(workspaceEnabled(job))identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastUrl,endpoint,tokenProvider,fetch_impl);",
 'FASTLANE_SETUP'
);
replaceOnce(
 "      const poll=await callInteractive(endpoint,'worker/poll',tokenProvider,{session_id:sessionId},fetch_impl);\n      if(poll.stop===true||poll.state==='STOPPED'){stopRequested=true;break;}",
 "      const poll=await callInteractive(endpoint,'worker/poll',tokenProvider,{session_id:sessionId},fetch_impl);\n      lastControl={state:String(poll.state||lastControl.state||''),control_owner:String(poll.control_owner||lastControl.control_owner||''),human_lease_id:poll.human_lease_id??lastControl.human_lease_id};\n      if(poll.stop===true||poll.state==='STOPPED'){stopRequested=true;break;}",
 'CONTROL_STATE'
);
replaceOnce(
 "      if(poll.command){\n        processedCommand=true;\n        let ok=false,errorCode=null;\n        try{\n          const payload=decryptJson(poll.command.payload_ciphertext,poll.command.payload_iv,key);\n          const action=humanAction(poll.command.command_type,payload);\n          const result=await worker.execute({...base,actions:[action],keep_session_open:true,capture_final_evidence:false});\n          ok=result?.ok===true;lastUrl=scrubUrl(result?.final_url||lastUrl);lastPrivateTabs=normalizePrivateTabs(result?.tabs||lastPrivateTabs);lastActiveTabIndex=Number.isInteger(result?.active_tab_index)?result.active_tab_index:lastActiveTabIndex;if(!ok)errorCode=result?.authorization?.status||'HUMAN_ACTION_NOT_AUTHORIZED';\n        }catch(error){errorCode=String(error?.message||error).slice(0,120);}\n        await callInteractive(endpoint,'worker/complete',tokenProvider,{session_id:sessionId,command_id:poll.command.command_id,ok,error_code:errorCode},fetch_impl);\n      }",
 "      if(poll.command){\n        processedCommand=true;\n        const dedupe=browserInputDedupeKey(poll.command.command_type,poll.command.payload_ciphertext,poll.command.payload_iv);\n        const result=await executeEncryptedInput({...poll.command,dedupe_key:dedupe});\n        await callInteractive(endpoint,'worker/complete',tokenProvider,{session_id:sessionId,command_id:poll.command.command_id,ok:result.ok,error_code:result.errorCode},fetch_impl);\n      }",
 'COMMAND_EXECUTION'
);
replaceOnce(
 "      if(poll.handback===true){\n        identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastUrl,endpoint,tokenProvider,fetch_impl);\n        await publishFrame(key);\n        await callInteractive(endpoint,'worker/handback-complete',tokenProvider,{session_id:sessionId},fetch_impl);\n      }else if(!processedCommand&&Date.now()-lastFrameAt>=FRAME_INTERVAL_MS){\n        await publishFrame(key);\n      }\n      if(processedCommand)continue;",
 "      if(poll.handback===true){\n        await actionChain.catch(()=>null);\n        identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastUrl,endpoint,tokenProvider,fetch_impl);\n        await publishFrame(key);\n        await callInteractive(endpoint,'worker/handback-complete',tokenProvider,{session_id:sessionId},fetch_impl);\n        lastControl={state:'CEREBRO_CONTROLLED',control_owner:'CEREBRO',human_lease_id:null};\n      }else{\n        const now=Date.now();\n        if(now-lastFrameAt>=FRAME_INTERVAL_MS)await publishFrame(key);\n        else if(fastlane?.enabled&&lastControl.state==='HUMAN_CONTROLLED'&&now-lastRealtimeFrameAt>=HUMAN_FRAME_INTERVAL_MS&&(frameDirty||!processedCommand)){await actionChain.catch(()=>null);await publishRealtimeFrame(key);}\n      }\n      if(processedCommand)continue;",
 'FRAME_SCHEDULING'
);
replaceOnce(
 "    await worker.stop(stopRequested?'INTERACTIVE_SESSION_STOPPED':hibernateRequested?'INTERACTIVE_SESSION_HIBERNATE_REQUESTED':'INTERACTIVE_SESSION_AUTO_HIBERNATE');",
 "    await actionChain.catch(()=>null);\n    await worker.stop(stopRequested?'INTERACTIVE_SESSION_STOPPED':hibernateRequested?'INTERACTIVE_SESSION_HIBERNATE_REQUESTED':'INTERACTIVE_SESSION_AUTO_HIBERNATE');\n    await fastlane?.close?.().catch(()=>null);",
 'FASTLANE_CLOSE'
);
replaceOnce(
 "  }catch(error){\n    await worker.stop('INTERACTIVE_SESSION_FAILED').catch(()=>{});",
 "  }catch(error){\n    await fastlane?.close?.().catch(()=>null);\n    await worker.stop('INTERACTIVE_SESSION_FAILED').catch(()=>{});",
 'FASTLANE_ERROR_CLOSE'
);
replaceOnce(
 "export const BROWSER_INTERACTIVE_V3_CONTRACT=Object.freeze({schema_version:'3.5.4'",
 "export const BROWSER_INTERACTIVE_V3_CONTRACT=Object.freeze({schema_version:'3.6.0',realtime_human_input_fastlane:true,durable_queue_fallback:true,realtime_input_dedupe:true,human_frame_interval_ms:HUMAN_FRAME_INTERVAL_MS",
 'CONTRACT'
);
fs.writeFileSync(runtime,source);

let workerSource=fs.readFileSync(cloudWorker,'utf8');
const oldMask="mask: [activePage.locator(SENSITIVE_FIELD_SELECTOR)],";
const newMask="mask: String(label).startsWith('live-') ? [] : [activePage.locator(SENSITIVE_FIELD_SELECTOR)],";
if(!workerSource.includes(oldMask))throw new Error('REALTIME_PATCH_ANCHOR_MISSING:LIVE_MASK');
workerSource=workerSource.replace(oldMask,newMask);
fs.writeFileSync(cloudWorker,workerSource);

const supabaseText=fs.readFileSync(supabaseSource,'utf8');
const match=supabaseText.match(/const PROD_SUPABASE_PUBLISHABLE_KEY='([^']+)'/);
if(!match?.[1])throw new Error('REALTIME_PUBLISHABLE_KEY_SOURCE_MISSING');
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`CEREBRO_BROWSER_REALTIME_PUBLISHABLE_KEY=${match[1]}\n`);
console.log(JSON.stringify({ok:true,patch:'browser-realtime-fastlane-v1',realtime_input:true,durable_fallback:true,dedupe:true,human_frame_ms:Number(process.env.CEREBRO_BROWSER_INTERACTIVE_HUMAN_FRAME_MS||220),max_session_ms:Number(process.env.CEREBRO_BROWSER_INTERACTIVE_MAX_MS||2400000),secret_material_logged:false}));
