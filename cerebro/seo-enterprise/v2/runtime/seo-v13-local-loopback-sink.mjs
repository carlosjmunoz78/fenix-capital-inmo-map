/**
 * SEO-001 V13: actual loopback HTTP, isolated dummy persistence and rollback.
 * Not connected to WordPress or real CRM; no APIs, emails, secrets, or real PII.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const PORT=34381;
export function createLocalSink(dir){
 if(!path.isAbsolute(dir)||dir.includes('..')||
    ![os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).some(p=>path.resolve(dir).startsWith(path.resolve(p)+path.sep))||
    fs.existsSync(dir))throw Error('SEO001_V13_UNSAFE_OUTPUT_DIR');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,'dummy-store.json'),receipt=path.join(dir,'receipt.json');
 let state={},attempts=0,duplicates=0,rolledBack=false;
 const answer=(res,status,payload)=>{
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});
  res.end(JSON.stringify(payload));
 };
 const server=http.createServer(async(req,res)=>{
  if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))
    return answer(res,403,{ok:false});
  const u=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&u.pathname==='/health')return answer(res,200,{ok:true});
  if(req.method==='GET'&&u.pathname==='/status'){
   const disk=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
   return answer(res,200,{ok:true,stored:Object.keys(disk).length,attempts,duplicates,rolled_back:rolledBack});
  }
  if(req.method==='POST'&&u.pathname==='/rollback'){
   const disk=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
   if(Object.keys(disk).length!==1||attempts!==2||duplicates!==1)return answer(res,409,{ok:false});
   fs.rmSync(file);state={};rolledBack=true;
   if(fs.existsSync(file))throw Error('SEO001_V13_ROLLBACK_FAILED');
   fs.writeFileSync(receipt,JSON.stringify({
    status:'LOCAL_HTTP_DURABLE_IDEMPOTENT_ROLLBACK_PASS_REAL_CRM_HOLD',
    company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
    requests:2,unique_synthetic_records_before_rollback:1,duplicates:1,
    durable_disk_readback:true,physical_rollback_file_deleted:true,
    real_crm_positive_e2e:false,real_leads_created:0,external_emails:0,
    wordpress_writes:0,supabase_writes:0,paid_calls:0,publish_allowed:false
   },null,2)+'\n',{flag:'wx',mode:0o600});
   return answer(res,200,{ok:true,rollback:true,stored:0});
  }
  if(req.method!=='POST'||u.pathname!=='/ingest'||rolledBack)return answer(res,404,{ok:false});
  if(req.headers['x-fenix-idempotency-key']!=='LAB-V13-FIXED-001')
    return answer(res,403,{ok:false});
  let raw='';
  for await(const chunk of req){raw+=String(chunk);if(raw.length>10000)return answer(res,413,{ok:false});}
  let b;try{b=JSON.parse(raw)}catch{return answer(res,400,{ok:false});}
  if(b.agency!=='Agencia de prueba'||b.name!=='Persona ficticia'||
    b.email!=='synthetic@example.invalid'||b.funnel!=='PARTNER'||b.landing_id!==52716||
    b.consent_privacy!==true||b.consent_marketing!==false||b.website)
    return answer(res,422,{ok:false});
  attempts++;
  if(state['LAB-V13-FIXED-001']){duplicates++;return answer(res,200,{ok:true,lead_created:false,deduplicated:true,lead_id:'LAB-LOCAL-ONLY'});}
  state['LAB-V13-FIXED-001']={id:'LAB-LOCAL-ONLY',synthetic:true};
  fs.writeFileSync(file,JSON.stringify(state),{flag:'wx',mode:0o600});
  const reopened=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!reopened['LAB-V13-FIXED-001'])throw Error('SEO001_V13_PERSISTENCE_FAILED');
  return answer(res,201,{ok:true,lead_created:true,lead_id:'LAB-LOCAL-ONLY'});
 });
 server.listen(PORT,'127.0.0.1',()=>process.stdout.write('SEO001_V13_LOCAL_READY\n'));
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 if(process.argv.length!==3)throw Error('SEO001_V13_ARGS');
 createLocalSink(path.resolve(process.argv[2]));
}
