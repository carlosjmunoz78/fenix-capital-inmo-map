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

  let raw: unknown = null;
  try { raw = await response.json(); } catch { raw = null; }

  // The real session endpoint returns { ok: true, context: {...} }.
  // Normalize it here so the app always receives the actual actor/role object.
  const normalized = path === '/session/context'
    && raw
    && typeof raw === 'object'
    && 'context' in raw
      ? (raw as { context?: unknown }).context ?? null
      : raw;

  return { status: response.status, data: normalized as T | null };
}
