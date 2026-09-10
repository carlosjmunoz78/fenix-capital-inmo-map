import {fetchEnvironmentApi} from './supabase';

export async function fetchSpecialCasesRuntime<T>(path:string){
 return fetchEnvironmentApi<T>('fenix-special-cases-api',path);
}

export type SpecialCaseCreatePayload={
 nombre:string;
 estado:string;
 fase:string;
 siguiente_accion:string;
};

export async function createSpecialCaseRuntime<T>(path:'/herencias'|'/obras-nuevas',payload:SpecialCaseCreatePayload){
 return fetchEnvironmentApi<T>('fenix-special-cases-api',path,{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
}
