import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://hnqlnvakzaywtafeiybt.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uvtiidkBBkFRt2K34so27g_JpCbMUZw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'fenix-preprod-auth'
  }
});

const NAV_LABELS:Record<string,string>={
 '/inicio':'Inicio','/expedientes':'Expedientes','/bancos':'Bancos','/contactos':'Contactos','/inmobiliarias':'Inmobiliarias','/tasaciones':'Tasaciones','/firmas':'Firmas','/documentacion':'Documentación','/financieros':'Financieros','/visitadores':'Visitadores','/agenda':'Agenda','/economia':'Economía','/informes':'Informes','/notarias':'Notarías','/notificaciones':'Avisos','/comunicaciones':'Comunicaciones','/visitas':'Visitas','/buscar':'Buscar'
};
function normalizeNavigation(raw:unknown){
 if(!raw||typeof raw!=='object')return raw;
 const obj=raw as Record<string,unknown>,items=Array.isArray(obj.items)?obj.items:null;
 if(!items)return raw;
 const normalized=items.map((item:any)=>{
  if(typeof item==='string')return{route:item,label:NAV_LABELS[item]??item.replace(/^\//,'')};
  if(item&&typeof item==='object'&&typeof item.route==='string')return{...item,label:typeof item.label==='string'&&item.label.trim()?item.label:(NAV_LABELS[item.route]??item.route.replace(/^\//,''))};
  return null;
 }).filter(Boolean);
 return{...obj,items:normalized};
}

export async function fetchAppApi<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/fenix-app-gateway-test${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  let raw: unknown = null;
  try { raw = await response.json(); } catch { raw = null; }

  const normalized = path === '/session/context'
    && raw
    && typeof raw === 'object'
    && 'context' in raw
      ? (raw as { context?: unknown }).context ?? null
      : path === '/navigation'
        ? normalizeNavigation(raw)
        : raw;

  return { status: response.status, data: normalized as T | null };
}
