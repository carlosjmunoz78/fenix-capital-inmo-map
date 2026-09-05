import {IS_PRODUCTION,fetchEnvironmentApi} from './supabase';
import {demoDetail,demoRows,isDemoSpecialCase} from './specialCasesDemo';

export async function fetchSpecialCasesRuntime<T>(path:string){
 if(IS_PRODUCTION)return fetchEnvironmentApi<T>('fenix-special-cases-api',path);
 const clean=path.split('?')[0];
 const detail=clean.match(/^\/(herencias|obras-nuevas)\/([^/]+)$/);
 if(detail&&isDemoSpecialCase(decodeURIComponent(detail[2]))){
  const demo=demoDetail(detail[1],decodeURIComponent(detail[2]));
  return demo?{status:200,data:demo as T}:{status:404,data:null as T|null};
 }
 const r=await fetchEnvironmentApi<any>('fenix-special-cases-runtime',path,undefined,{productionAvailable:false});
 let data=r.data;
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
 const api=IS_PRODUCTION?'fenix-special-cases-api':'fenix-special-cases-runtime';
 return fetchEnvironmentApi<T>(api,path,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
}
