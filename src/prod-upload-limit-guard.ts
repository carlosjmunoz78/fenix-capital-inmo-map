const PROD_MAX_BYTES=50*1024*1024;
const isProd=typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if(isProd){
  const originalFetch=window.fetch.bind(window);

  async function canonicalizeEvidencePrepare(args:Parameters<typeof fetch>):Promise<Parameters<typeof fetch>>{
    try{
      const input=args[0];
      const init=args[1];
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(!url.includes('/functions/v1/fenix-evidence-api/prepare')||!init?.body||typeof init.body!=='string')return args;
      const payload=JSON.parse(init.body) as Record<string,unknown>;
      const originType=String(payload.origin_type??'');
      const originCode=String(payload.origin_code??'');
      if(originType!=='expediente'||!UUID_RE.test(originCode))return args;

      const gatewayUrl=url.replace('/functions/v1/fenix-evidence-api/prepare',`/functions/v1/fenix-app-gateway/expedientes/${encodeURIComponent(originCode)}`);
      const lookup=await originalFetch(gatewayUrl,{method:'GET',headers:init.headers});
      if(!lookup.ok)return args;
      const data=await lookup.json().catch(()=>null) as Record<string,unknown>|null;
      const expediente=(data?.expediente&&typeof data.expediente==='object'?data.expediente:data?.item&&typeof data.item==='object'?data.item:null) as Record<string,unknown>|null;
      const canonical=String(expediente?.expediente_code??expediente?.expediente??'').trim();
      if(!canonical||canonical===originCode)return args;
      payload.origin_code=canonical;
      return [input,{...init,body:JSON.stringify(payload)}];
    }catch{return args;}
  }

  window.fetch=async (...rawArgs:Parameters<typeof fetch>)=>{
    const args=await canonicalizeEvidencePrepare(rawArgs);
    const response=await originalFetch(...args);
    try{
      const input=args[0];
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(url.includes('/functions/v1/fenix-evidence-api/prepare')&&response.ok){
        const cloned=response.clone();
        const data=await cloned.json().catch(()=>null) as Record<string,unknown>|null;
        if(data&&typeof data==='object'){
          data.max_bytes=PROD_MAX_BYTES;
          return new Response(JSON.stringify(data),{
            status:response.status,
            statusText:response.statusText,
            headers:response.headers
          });
        }
      }
    }catch{}
    return response;
  };

  document.addEventListener('change',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=='file'||!input.files?.length)return;
    const normalized=[...input.files].map(file=>{
      const isPdf=/\.pdf$/i.test(file.name);
      if(!isPdf||file.type==='application/pdf')return file;
      return new File([file],file.name,{type:'application/pdf',lastModified:file.lastModified});
    });
    const changed=normalized.some((file,index)=>file!==input.files?.item(index));
    if(!changed)return;
    try{
      const transfer=new DataTransfer();
      normalized.forEach(file=>transfer.items.add(file));
      input.files=transfer.files;
    }catch{}
  },true);

  const rewriteLimitCopy=(root:ParentNode=document)=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node:Node|null;
    while((node=walker.nextNode())){
      const text=node.nodeValue??'';
      if(text.includes('12 MB'))node.nodeValue=text.replaceAll('12 MB','50 MB');
      if(text.includes('12 megas'))node.nodeValue=(node.nodeValue??'').replaceAll('12 megas','50 megas');
    }
  };
  const run=()=>rewriteLimitCopy(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
}

export {};
