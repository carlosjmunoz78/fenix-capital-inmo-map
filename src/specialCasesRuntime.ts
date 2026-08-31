import {SUPABASE_URL,supabase} from './supabase';
import {demoDetail,demoRows,isDemoSpecialCase} from './specialCasesDemo';

export async function fetchSpecialCasesRuntime<T>(path:string){
 const clean=path.split('?')[0];
 const detail=clean.match(/^\/(herencias|obras-nuevas)\/([^/]+)$/);
 if(detail&&isDemoSpecialCase(decodeURIComponent(detail[2]))){
  const demo=demoDetail(detail[1],decodeURIComponent(detail[2]));
  return demo?{status:200,data:demo as T}:{status:404,data:null as T|null};
 }
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-special-cases-runtime-test${path}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
 let data:any=null;try{data=await r.json()}catch{}
 if(r.status===200&&(clean==='/herencias'||clean==='/obras-nuevas')){
  const existing=Array.isArray(data?.items)?data.items:[];
  const demos=demoRows(clean);
  data={...(data||{}),items:[...demos,...existing.filter((row:any)=>!demos.some(d=>d.id===row?.id))],demo_records:demos.length};
 }
 return{status:r.status,data:data as T|null};
}

export type SpecialCaseCreatePayload={
 nombre:string;
 estado:string;
 fase:string;
 siguiente_accion:string;
};

export async function createSpecialCaseRuntime<T>(path:'/herencias'|'/obras-nuevas',payload:SpecialCaseCreatePayload){
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null as T|null};
 const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-special-cases-runtime-test${path}`,{
  method:'POST',
  headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
 let data:any=null;try{data=await r.json()}catch{}
 return{status:r.status,data:data as T|null};
}
