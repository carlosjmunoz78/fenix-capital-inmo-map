import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
function secureRoot(root){
 const real=fs.realpathSync(root);
 if(!real.startsWith(path.resolve(os.tmpdir())+path.sep)||!path.basename(real).startsWith('cerebro-universal-v0-evidence-'))throw Error('EVIDENCE_LAB_DIRECTORY_REQUIRED');
 return real;
}
export class EphemeralLabEvidenceV0{
 #file;#prev='GENESIS';#seq=0;
 constructor({directory}){
  this.#file=path.join(secureRoot(directory),'evidence.jsonl');
  if(fs.existsSync(this.#file)){
   const rows=fs.readFileSync(this.#file,'utf8').trim().split('\n').filter(Boolean);
   for(const row of rows){
    const item=JSON.parse(row);
    const digest=crypto.createHash('sha256').update(item.previous_hash+JSON.stringify(item.event)).digest('hex');
    if(item.previous_hash!==this.#prev||item.sha256!==digest||item.sequence!==this.#seq+1)throw Error('EVIDENCE_CHAIN_INVALID');
    this.#seq=item.sequence;this.#prev=item.sha256;
   }
  }
 }
 append({action,outcome,request_id,company_id}){
  const event={request_id:String(request_id||'').slice(0,80),action:String(action||'').slice(0,60),outcome:String(outcome||'').slice(0,80),company_id:String(company_id||'').slice(0,80),source:'LAB_LOOPBACK'};
  const sha256=crypto.createHash('sha256').update(this.#prev+JSON.stringify(event)).digest('hex');
  const item={sequence:++this.#seq,previous_hash:this.#prev,sha256,event};
  const fd=fs.openSync(this.#file,'a',0o600);
  try{fs.writeSync(fd,JSON.stringify(item)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  this.#prev=sha256;
  return{sequence:item.sequence,sha256};
 }
 read(){return fs.existsSync(this.#file)?fs.readFileSync(this.#file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];}
}
function send(res,status,data){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));}
export async function startLoopbackUniversalLabV0({gateway,evidence}={}){
 if(!gateway||typeof gateway.handle!=='function'||gateway.contract?.().environment!=='LAB')throw Error('LAB_GATEWAY_REQUIRED');
 if(!evidence||typeof evidence.append!=='function')throw Error('EVIDENCE_REQUIRED');
 const server=http.createServer(async(req,res)=>{
  const id=crypto.randomUUID(),url=new URL(req.url||'/', 'http://127.0.0.1'),auth=req.headers.authorization||'';
  let action='UNKNOWN',company_id='';
  try{
   if(req.socket.remoteAddress!=='127.0.0.1'&&req.socket.remoteAddress!=='::1')throw Error('LOOPBACK_ONLY');
   if(req.method!=='POST'||url.pathname!=='/universal/v0')throw Error('METHOD_NOT_ALLOWED');
   if(req.headers.origin)throw Error('BROWSER_ORIGIN_CLOSED');
   if(req.headers['content-type']?.split(';')[0].toLowerCase()!=='application/json')throw Error('JSON_REQUIRED');
   if(!/^Bearer [^\s]{20,8192}$/.test(auth))throw Error('AUTH_REQUIRED');
   let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)throw Error('REQUEST_TOO_LARGE');}
   const input=JSON.parse(body);action=typeof input.action==='string'?input.action:'UNKNOWN';
   company_id=typeof input?.params?.company_id==='string'?input.params.company_id:'';
   const result=await gateway.handle({session_token:auth.slice(7),action,params:input.params});
   const evidenceRef=evidence.append({request_id:id,action,outcome:result.status,company_id});
   send(res,200,{...result,evidence_ref:evidenceRef});
  }catch(error){
   const allowed=['AUTH_DENIED','AUTH_REQUIRED','AUTH_UPSTREAM_UNAVAILABLE','COMPANY_SCOPE_DENIED','SCOPE_DENIED','ENVIRONMENT_LAB_ONLY','METHOD_NOT_ALLOWED','BROWSER_ORIGIN_CLOSED','REQUEST_TOO_LARGE','JSON_REQUIRED','PAYLOAD_SCHEMA_DENIED','CAPABILITY_UNAVAILABLE','LAB_WRITES_DISABLED'];
   const reason=allowed.includes(error?.message)?error.message:'DENIED';
   evidence.append({request_id:id,action,outcome:reason,company_id});
   send(res,reason.startsWith('AUTH')?401:403,{status:'DENIED',reason});
  }
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const addr=server.address();
 return Object.freeze({url:'http://127.0.0.1:'+addr.port+'/universal/v0',address:'127.0.0.1',port:addr.port,close:()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))});
}
