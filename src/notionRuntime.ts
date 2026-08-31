import {fetchAppApi,IS_PRODUCTION,supabase,SUPABASE_URL} from './supabase';

type Row=Record<string,unknown>;
type Envelope=Record<string,unknown>&{items?:Row[]};

function asEnvelope(data:unknown):Envelope|null{
  return data&&typeof data==='object'?data as Envelope:null;
}
function rowObject(value:unknown):Row|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Row:null;}

function normalizeProdRows(path:string,data:unknown):unknown{
  const envelope=asEnvelope(data);
  if(!envelope)return data;

  if(path==='/expedientes'&&Array.isArray(envelope.items)){
    return {...envelope,items:envelope.items.map(row=>({
      ...row,
      id:row.id??row.expediente_code,
      fase:row.fase??row.phase??row.stage,
      estado:row.estado??row.status??row.stage,
      cliente:row.cliente??row.cliente_alias,
      expediente:row.expediente??row.expediente_code
    }))};
  }

  if(/^\/expedientes\/[^/]+$/.test(path)){
    const raw=rowObject(envelope.expediente);
    if(!raw)return data;
    const item={...raw,id:raw.id??raw.expediente_code,expediente:raw.expediente??raw.expediente_code,cliente:raw.cliente??raw.cliente_alias,fase:raw.fase??raw.stage,estado:raw.estado??raw.stage};
    return {...envelope,source:'prod_canonical',item,expediente:item};
  }

  if(path==='/inmobiliarias'&&Array.isArray(envelope.items)){
    return {...envelope,items:envelope.items.map(row=>{
      const code=typeof row.inmobiliaria_code==='string'?row.inmobiliaria_code:'';
      const locality=code.includes('|')?code.split('|').slice(1).join('|').replaceAll('-',' '):'';
      return {...row,id:row.id??row.inmobiliaria_code,nombre:row.nombre??row.nombre_alias,inmobiliaria:row.inmobiliaria??row.nombre_alias,localidad:row.localidad??row.municipio??locality};
    })};
  }

  if(/^\/inmobiliarias\/[^/]+$/.test(path)){
    const raw=rowObject(envelope.inmobiliaria);
    if(!raw)return data;
    const item={...raw,id:raw.id??raw.inmobiliaria_code,nombre:raw.nombre??raw.nombre_alias,inmobiliaria:raw.inmobiliaria??raw.nombre_alias};
    return {...envelope,item};
  }

  if(path==='/firmas'){
    const firmas=Array.isArray(envelope.firmas)?envelope.firmas:envelope.items;
    return Array.isArray(firmas)?{...envelope,items:firmas}:data;
  }

  if(/^\/firmas\/[^/]+$/.test(path)){
    const raw=rowObject(envelope.firma);
    return raw?{...envelope,item:raw}:data;
  }

  return data;
}

async function fetchProdCompatibility<T>(path:string):Promise<{status:number;data:T|null}>{
  const contactMode=path==='/clientes'?'Cliente':path==='/contactos-inmobiliaria'?'Contacto inmobiliaria':null;
  const contactDetail=path.match(/^\/(clientes|contactos-inmobiliaria)\/([^/]+)$/);
  const documentDetail=path.match(/^\/documentos\/([^/]+)$/);

  if(contactDetail){
    const id=decodeURIComponent(contactDetail[2]);
    const result=await fetchAppApi<Record<string,unknown>>(`/contactos/${encodeURIComponent(id)}`);
    if(result.status!==200||!result.data)return {status:result.status,data:result.data as T|null};
    const envelope=asEnvelope(result.data);
    const contacto=rowObject(envelope?.contacto);
    return contacto?{status:200,data:{...result.data,item:contacto} as T}:{status:404,data:null};
  }

  if(documentDetail){
    const detail=await fetchAppApi<Record<string,unknown>>(path);
    if(detail.status!==200||!detail.data)return {status:detail.status,data:detail.data as T|null};
    const envelope=asEnvelope(detail.data);
    const document=rowObject(envelope?.document);
    if(!document)return {status:404,data:null};
    const view=await fetchAppApi<Record<string,unknown>>(`${path}/view`);
    const signedUrl=view.status===200&&view.data&&typeof view.data.signed_url==='string'?view.data.signed_url:'';
    return {status:200,data:{...detail.data,item:{...document,...(signedUrl?{url:signedUrl}: {})}} as T};
  }

  const gatewayPath=contactMode?'/contactos':path;
  const result=await fetchAppApi<unknown>(gatewayPath);
  if(result.status!==200||!result.data)return {status:result.status,data:result.data as T|null};

  if(contactMode){
    const envelope=asEnvelope(result.data);
    if(!envelope||!Array.isArray(envelope.items))return {status:200,data:result.data as T};
    const items=envelope.items.filter(row=>row.tipo===contactMode);
    return {status:200,data:{...envelope,items,kpis:{total:items.length}} as T};
  }

  return {status:200,data:normalizeProdRows(path,result.data) as T};
}

export async function fetchNotionRuntime<T=unknown>(path:string):Promise<{status:number;data:T|null}>{
  if(IS_PRODUCTION)return fetchProdCompatibility<T>(path);

  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return {status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-runtime-test${path}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  let data:T|null=null;
  try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}
