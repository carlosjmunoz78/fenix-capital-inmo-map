alter table public.cerebro_browser_session_v3
  drop constraint if exists cerebro_browser_session_v3_state_check;

alter table public.cerebro_browser_session_v3
  add constraint cerebro_browser_session_v3_state_check
  check (state = any (array[
    'CONNECTING'::text,
    'CEREBRO_CONTROLLED'::text,
    'HUMAN_REQUIRED'::text,
    'TAKEOVER_PENDING'::text,
    'HUMAN_CONTROLLED'::text,
    'HANDBACK_PENDING'::text,
    'AI_RESUMING'::text,
    'HIBERNATE_PENDING'::text,
    'STOPPED'::text,
    'ERROR'::text,
    'CLOSED'::text
  ]));
