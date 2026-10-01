# CEREBRO Spoken Summary V1 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Requirement:
- keep the complete written response on screen;
- speak a concise conversational summary instead of reading the text literally;
- never read raw URLs aloud; say that the link is left in writing;
- strip numbered/bullet markers from TTS so CEREBRO does not say "uno punto";
- keep action confirmations verbally clear and explicit.

Evidence before promotion:
- PR #463 exact head: 90e5cd71dc8c2b71ef0962fd012835054831f0b7
- CEREBRO Session Context Regression Guard #128: SUCCESS
- App Restoration Build Gate #377: SUCCESS
- merge: 1da8c6523c344257969fe7304ccdac900b0618e3
- previous exact frontend rollback source: 374bd89d7e8ee97a26b3bdcf1bb5249a613489be

Implementation:
- written UI response remains unchanged;
- spoken output uses a separate deterministic spoken-response transformer;
- raw URLs are removed from TTS and replaced by a short cue;
- normal spoken output is capped to the first relevant units plus a written-detail cue;
- action mode preserves the final confirmation question;
- existing voice prosody remains active after summarization.

Physical acceptance of the earlier cross-session conversational memory test was confirmed by the owner on 2026-10-01.
Physical acceptance of Spoken Summary V1 remains pending until heard in the real browser.
