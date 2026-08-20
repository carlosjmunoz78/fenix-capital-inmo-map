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
  let data: T | null = null;
  try { data = await response.json() as T; } catch { data = null; }
  return { status: response.status, data };
}
