import {fetchAppApi,IS_PRODUCTION,supabase,SUPABASE_URL} from './supabase';

type Row=Record<string,unknown>;
type Envelope=Record<string,unknown>&{items?:Row[]};

function asEnvelope(data:unknown):Envelope|null{
  return data&&typeof data==='object'?data as Envelope:null;
}

function normalizeProdRows(path:string,data:unknown):unknown{
  const envelope=asEnvelope(data);
  if(!envelope||!Array.isArray(envelope.items))return data;

  if(path==='/expedientes'){
    return {...envelope,items:envelope.items.map(row=>({
      ...row,
      fase:row.fase??row.phase??row.stage,
      estado:row.estado??row.status??row.stage,
      cliente:row.cliente??row.cliente_alias,
      expediente:row.expediente??row.expediente_code
    }))};
  }

  if(path==='/inmobiliarias'){
    return {...envelope,items:envelope.items.map(row=>{
      const code=typeof row.inmobiliaria_code==='string'?row.inmobiliaria_code:'';
      const locality=code.includes('|')?code.split('|').slice(1).join('|').replaceAll('-',' '):'';
      return {
        ...row,
        id:row.id??row.inmobiliaria_code,
        nombre:row.nombre??row.nombre_alias,
        inmobiliaria:row.inmobiliaria??row.nombre_alias,
        localidad:row.localidad??row.municipio??locality
      };
    })};
  }

  return data;
}

async function fetchProdCompatibility<T>(path:string):Promise<{status:number;data:T|null}>{
  const contactMode=path==='/clientes'?'Cliente':path==='/contactos-inmobiliaria'?'Contacto inmobiliaria':null;
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
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-notion-runtime-test${path}`,{
    headers:{Authorization:`Bearer ${session.access_token}`}
  });
  let data:T|null=null;
  try{data=await r.json()}catch{data=null}
  return {status:r.status,data};
}
