import {inflateSync} from 'node:zlib';
import {learningBinding,validateLearningBinding,POLICY_SHA256} from './skill-universal-learning-contract-v1.mjs';
const project='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu',team='team_qnh6u1Ofy2WPp0MGEKlyMA50',deployment='dpl_3LB2ZnP1RYpa89oxvcqtfGXGvUY6';
const require=(v,c)=>{if(!v)throw Error(c)};
async function get(path){
 const r=await fetch('https://api.vercel.com'+path+'?teamId='+team,{headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN},redirect:'error',signal:AbortSignal.timeout(20000)});
 require(r.ok,'VERCEL_HTTP_'+r.status);return r;
}
try{
 require(typeof process.env.VERCEL_TOKEN==='string'&&process.env.VERCEL_TOKEN.length>0,'NO_EXISTING_TOKEN');
 const p=await(await get('/v9/projects/'+project)).json();
 const scope={id:p.id===project,account:p.accountId===team,all:p.ssoProtection?.deploymentType==='all',not_disabled:p.ssoProtection?.enabled!==false};console.log('FACT_LRN_SCOPE_GATES '+JSON.stringify(scope));require(Object.values(scope).every(Boolean),'SCOPE');
 const d=await(await get('/v13/deployments/'+deployment)).json();
 require(d.id===deployment&&d.projectId===project&&d.readyState==='READY'&&d.target!=='production','DEPLOYMENT_SCOPE');
 const tree=await(await get('/v6/deployments/'+deployment+'/files')).json();
 const entries=[];
 const walk=(items,prefix='')=>{if(!Array.isArray(items))return;for(const x of items){const path=x.path??[prefix,x.name].filter(Boolean).join('/');entries.push({path,uid:x.uid});walk(x.children,path);}};
 walk(Array.isArray(tree)?tree:tree.files);
 const matched=entries.filter(x=>/(^|\/)inventory\.b64$/.test(x.path??'')&&/^[0-9a-f]{40}$/.test(x.uid??''));
 require(matched.length===1,'FILE_SCOPE');
 const res=await get('/v8/deployments/'+deployment+'/files/'+matched[0].uid);
 const rawText=await res.text();require(rawText.length<=30000,'SIZE');
 let payload;try{const x=JSON.parse(rawText);require(typeof x.data==='string','RESPONSE_SCHEMA');payload=Buffer.from(x.data,'base64').toString('utf8')}catch(e){if(/^[A-Za-z0-9+/=]+$/.test(rawText.trim()))payload=rawText.trim();else throw Error('RESPONSE_SCHEMA')}
 require(typeof payload==='string'&&payload.length===5392&&/^[A-Za-z0-9+/=]+$/.test(payload),'PAYLOAD_FORMAT');
 const rows=JSON.parse(inflateSync(Buffer.from(payload,'base64'),{maxOutputLength:100000}));require(Array.isArray(rows)&&rows.length===82,'REVISION_COUNT');
 const names=new Set(),keys=new Set(),counts={};let total=0;
 for(const row of rows){
 require(Array.isArray(row)&&row.length===4,'ROW');
 const [name,rev,sha,base]=row;require(typeof name==='string'&&/^cerebro-[a-z0-9-]+$/.test(name)&&['CHAMPION','CHALLENGER','NEW','EXTENSION'].includes(rev),'IDENTITY');
 require(typeof sha==='string'&&/^[0-9a-f]{64}$/.test(sha),'HASH');const key=JSON.stringify([name,rev,sha]);require(!keys.has(key),'DUPLICATE');keys.add(key);names.add(name);counts[rev]=(counts[rev]??0)+1;
 if(['CHALLENGER','EXTENSION'].includes(rev))require(rows.some(x=>x[0]===name&&x[1]==='CHAMPION'&&x[2]===base),'BASELINE');else require(base===null,'BASELINE_UNEXPECTED');
 const binding=learningBinding({identity:name,revision_sha256:sha});validateLearningBinding(binding);total+=Object.keys(binding.mechanisms).length;
 }
 require(names.size===42&&counts.CHAMPION===37&&counts.CHALLENGER===37&&counts.NEW===5&&counts.EXTENSION===3&&total===984,'COVERAGE');
 console.log('FACT_LRN_PRIVATE_INVENTORY_RECEIPT '+JSON.stringify({status:'MACHINE_AUTHENTICATED_READ_AND_BIND',skills:names.size,revisions:rows.length,associations:total,policy_sha256:POLICY_SHA256,provider_calls:0,execution_completed:false,promotion_authorized:false}));
}catch(e){console.log('FACT_LRN_PRIVATE_INVENTORY_HOLD '+(/^[A-Z_0-9]+$/.test(e?.message??'')?e.message:'NETWORK_OR_SCHEMA'));process.exitCode=1;}
