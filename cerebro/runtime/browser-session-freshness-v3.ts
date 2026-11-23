/** Only a fresh browser session can block the owner from starting another. */
const TERMINAL_STATES=new Set(['STOPPED','ERROR','CLOSED','HIBERNATED']);
const MAX_SESSION_FRESHNESS_MS=16*60*1000;

type BrowserSessionFreshness={
 state:string;
 expires_at?:string|null;
 last_heartbeat_at:string|null;
 updated_at:string;
 opened_at:string;
};

export function isActionableBrowserSession(session:BrowserSessionFreshness,nowMs=Date.now()):boolean{
 if(TERMINAL_STATES.has(session.state))return false;
 // The owner backend already uses expires_at to reject stale sessions.
 // Keep the previous heartbeat fallback only for deployments whose list API
 // has not yet exposed the expiry; never treat an explicitly expired value as live.
 if(session.expires_at!=null){
  const expiryMs=Date.parse(session.expires_at);
  if(!Number.isFinite(expiryMs)||expiryMs<=nowMs)return false;
 }
 const lastMs=Date.parse(session.last_heartbeat_at||session.updated_at||session.opened_at||'');
 return Number.isFinite(lastMs)&&lastMs<=nowMs+60_000&&nowMs-lastMs<=MAX_SESSION_FRESHNESS_MS;
}
