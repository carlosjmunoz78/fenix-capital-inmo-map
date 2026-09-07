import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

const PROD_MAX_BYTES=50*1024*1024;
const isProd=typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if(isProd){
  const originalFetch=window.fetch.bind(window);

  async function canonicalFromGateway(url:string,headers:HeadersInit|undefined,originCode:string){
    const detailUrl=url.replace('/functions/v1/fenix-evidence-api/prepare',`/functions/v1/fenix-app-gateway/expedientes/${encodeURIComponent(originCode)}`);
    const detail=await originalFetch(detailUrl,{method:'GET',headers});
    if(detail.ok){
      const data=await detail.json().catch(()=>null) as Record<string,unknown>|null;
      const expediente=(data?.expediente&&typeof data.expediente==='object'?data.expediente:data?.item&&typeof data.item==='object'?data.item:null) as Record<string,unknown>|null;
      const canonical=String(expediente?.expediente_code??expediente?.expediente??'').trim();
      if(canonical&&canonical!==originCode)return canonical;
    }

    const listUrl=url.replace('/functions/v1/fenix-evidence-api/prepare','/functions/v1/fenix-app-gateway/expedientes');
    const list=await originalFetch(listUrl,{method:'GET',headers});
    if(!list.ok)return '';
    const data=await list.json().catch(()=>null) as Record<string,unknown>|null;
    const items=Array.isArray(data?.items)?data.items:[];
    const wanted=originCode.replaceAll('-','').toLowerCase();
    for(const raw of items){
      if(!raw||typeof raw!=='object')continue;
      const row=raw as Record<string,unknown>;
      const candidates=[row.id,row.internal_id,row.expediente_code,row.expediente]
        .filter(value=>typeof value==='string')
        .map(value=>String(value).replaceAll('-','').toLowerCase());
      if(!candidates.includes(wanted))continue;
      const canonical=String(row.expediente_code??row.expediente??'').trim();
      if(canonical)return canonical;
    }
    return '';
  }

  async function canonicalizeEvidencePrepare(args:Parameters<typeof fetch>):Promise<Parameters<typeof fetch>>{
    try{
      const input=args[0];
      const init=args[1];
      const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      if(!url.includes('/functions/v1/fenix-evidence-api/prepare')||!init?.body||typeof init.body!=='string')return args;
      const payload=JSON.parse(init.body) as Record<string,unknown>;
      const originType=String(payload.origin_type??'');
      const originCode=String(payload.origin_code??'');
      if(originType!=='expediente'||originCode.startsWith('exp-legado-'))return args;
      if(!UUID_RE.test(originCode)&&originCode.length<20)return args;

      const canonical=await canonicalFromGateway(url,init.headers,originCode);
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

  function currentDocumentCode(){
    const m=window.location.pathname.match(/^\/documentos\/([^/?#]+)$/);
    return m?.[1]?decodeURIComponent(m[1]):'';
  }

  function rereadStatus(message:string,kind:'working'|'ok'|'error'='working'){
    let box=document.getElementById('fenix-reread-status');
    if(!box){
      box=document.createElement('div');
      box.id='fenix-reread-status';
      box.setAttribute('role','status');
      box.style.position='fixed';
      box.style.right='18px';
      box.style.bottom='18px';
      box.style.zIndex='12050';
      box.style.maxWidth='420px';
      box.style.padding='12px 14px';
      box.style.borderRadius='12px';
      box.style.background='var(--surface,#202023)';
      box.style.color='var(--text,#fff)';
      box.style.border='1px solid var(--border,#444)';
      box.style.boxShadow='0 16px 46px rgba(0,0,0,.28)';
      box.style.fontWeight='700';
      document.body.appendChild(box);
    }
    box.dataset.kind=kind;
    box.textContent=message;
  }

  async function rereadCurrentDocument(trigger?:Element){
    const documentCode=currentDocumentCode();
    if(!documentCode){rereadStatus('No se ha podido identificar el documento abierto.','error');return;}
    const button=trigger instanceof HTMLButtonElement?trigger:null;
    const previous=button?.textContent||'';
    if(button){button.disabled=true;button.textContent='Releyendo con IA…';}
    try{
      rereadStatus('Ana está releyendo el original completo y rellenando su ficha…');
      const {data:{session}}=await supabase.auth.getSession();
      const token=session?.access_token;
      if(!token)throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      const headers={Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'};
      const detail=await originalFetch(`${SUPABASE_URL}/functions/v1/fenix-app-gateway/documentos/${encodeURIComponent(documentCode)}`,{method:'GET',headers});
      const detailData=await detail.json().catch(()=>null) as Record<string,unknown>|null;
      const documentRow=(detailData?.document&&typeof detailData.document==='object'?detailData.document:null) as Record<string,unknown>|null;
      const uploadId=String(documentRow?.upload_id??detailData?.upload_id??'').trim();
      if(!detail.ok||!uploadId)throw new Error('No se ha encontrado el original conservado para releerlo.');
      const family=String(documentRow?.tipo??documentRow?.title??'').trim();
      const response=await originalFetch(`${SUPABASE_URL}/functions/v1/fenix-document-reread`,{
        method:'POST',headers,
        body:JSON.stringify({upload_id:uploadId,document_family:family,declared_document_type:family})
      });
      const data=await response.json().catch(()=>null) as Record<string,unknown>|null;
      if(!response.ok||data?.ok!==true){
        const error=String(data?.error??`reread_${response.status}`);
        throw new Error(`No se pudo completar la relectura (${error}).`);
      }
      rereadStatus('Relectura terminada. Actualizando la ficha con los datos extraídos…','ok');
      window.setTimeout(()=>window.location.reload(),550);
    }catch(error){
      rereadStatus(error instanceof Error?error.message:'No se pudo releer el original.','error');
      if(button){button.disabled=false;button.textContent=previous||'Releer original existente';}
    }
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('button,a'):null;
    if(!target)return;
    const label=(target.textContent||'').trim();
    if(!/releer\s+original/i.test(label))return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void rereadCurrentDocument(target);
  },true);

  const ensureRereadAction=()=>{
    if(!currentDocumentCode())return;
    const actions=document.querySelector<HTMLElement>('.doc-view-actions');
    if(!actions)return;
    const existing=[...actions.querySelectorAll('button,a')].some(el=>/releer\s+original/i.test(el.textContent||''));
    if(existing)return;
    const button=document.createElement('button');
    button.type='button';
    button.className='doc-view-original';
    button.dataset.secondary='true';
    button.dataset.testid='document-reread-original';
    button.textContent='Releer original existente';
    actions.appendChild(button);
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
  const run=()=>{rewriteLimitCopy(document);ensureRereadAction();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
}

export {};
