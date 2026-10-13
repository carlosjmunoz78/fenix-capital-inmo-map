-- Exact rollback for PREPROD multichannel contract parity V1.
-- Additive-only rollback: removes only the three PREPROD test-contract functions introduced by this block.

drop function if exists public.preprod_test_multichannel_contract_v1(text,text,jsonb);
drop function if exists public.preprod_test_apply_conversation_overlay_v1(text,text,jsonb);
drop function if exists public.preprod_test_channel_access_decision_v1(text,text);
