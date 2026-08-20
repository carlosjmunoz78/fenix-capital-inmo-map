const SUPABASE_URL = 'https://hnqlnvakzaywtafeiybt.supabase.co';
const LEGACY_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucWxudmFremF5d3RhZmVpeWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTI0MjAsImV4cCI6MjA4NDU4ODQyMH0.kkAkDRTA3ZhFD1AVieoUdf4R54V2CoTzyXCtJ_S48Nk';
const TOKEN = 'fpre-20260820-71d9c4a8';
const STORAGE_KEY = 'fenix-preprod-dirtest-email-fix-v1';

export async function runPreprodBootstrapOnce() {
  if (sessionStorage.getItem(STORAGE_KEY) === 'done') return;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fenix-auth-email-fix-once`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${LEGACY_ANON}`
      },
      body: JSON.stringify({ mode: 'PREPROD_TEST', token: TOKEN })
    });
    if (response.ok) sessionStorage.setItem(STORAGE_KEY, 'done');
  } catch {
    // PRE-PROD one-shot: silently retry on next page load until completed.
  }
}
