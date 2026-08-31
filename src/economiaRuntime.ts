import {IS_PRODUCTION,SUPABASE_URL,supabase} from './supabase';

type ApiResult<T>={status:number;data:T|null};

export async function fetchEconomiaRuntime<T=unknown>():Promise<ApiResult<T>>{
  if(!IS_PRODUCTION)return {status:200,data:{ok:true,status:200,items:[],kpis:{total_movimientos:0,importe_base:0,iva:0,total:0}} as T};
  const{data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return{status:401,data:null};
  const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-economia-api/economia`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  let data:T|null=null;
  try{data=await r.json() as T}catch{}
  return{status:r.status,data};
}
