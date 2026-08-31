import {supabase} from './supabase';

export async function logoutOperationalSession(){
  const {data:{session}}=await supabase.auth.getSession();
  const uid=session?.user?.id;
  if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
  sessionStorage.removeItem('fenix-session-active');
  await supabase.auth.signOut();
  window.location.href=import.meta.env.BASE_URL;
}
