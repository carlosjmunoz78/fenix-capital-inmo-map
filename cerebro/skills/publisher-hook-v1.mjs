// Preserve the historical LRN publisher response and its own authorization. The private
// service receives the original authenticated publication only after the old write succeeds.
export function wrapLrnPublisher(old){
 if(typeof old?.fetch!=='function')throw Error('OLD_REQUIRED');
 return {async fetch(request,env,ctx){
  const permitted=env.FACT_REGISTRY_LINK_ENABLED==='true'&&typeof env.FACT_SKILL_REGISTRY?.reconcile==='function'&&typeof ctx?.waitUntil==='function'&&request.method==='POST'&&new URL(request.url).pathname==='/v1/publication'&&request.headers.get('Content-Type')==='application/json'&&request.headers.get('Authorization')?.startsWith('Bearer ');
  const copy=permitted?request.clone():null;
  const response=await old.fetch(request,env,ctx);
  if(copy&&response.status===200){
   ctx.waitUntil((async()=>{try{const oldResult=await response.clone().json();const manifest=await copy.text();const auth=copy.headers.get('Authorization');if(oldResult.ok!==true||manifest.length>8192||!auth||auth.length>12288)throw Error('OLD_DENIED');const result=await env.FACT_SKILL_REGISTRY.reconcile(auth,manifest);if(result?.status!=='LRN_FACT_REGISTRY_RECONCILED'||result?.added!==0||result?.promotion_authorized!==false||result?.provider_calls!==0)throw Error('LINK_RESULT');console.log('FACT_LRN_LINK_'+(result.write==='EXISTING'?'EXISTING':'RECORDED'));}catch{console.log('FACT_LRN_LINK_HOLD');}})());
  }else if(copy){void copy.body?.cancel().catch(()=>{});}
  return response;
 }};
}
