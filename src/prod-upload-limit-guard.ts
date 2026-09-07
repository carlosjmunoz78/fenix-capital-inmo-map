const PROD_MAX_BYTES=50*1024*1024;
const isProd=typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es';

if(isProd){
  const originalFetch=window.fetch.bind(window);
  window.fetch=async (...args:Parameters<typeof fetch>)=>{
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
