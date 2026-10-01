# CEREBRO Natural Spoken Conversation V4 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Goals:
- keep voice conversations continuous with no application-level turn cap;
- make spoken replies sound more like a real conversation and less like a text summary;
- preserve the full written answer as the detailed record;
- keep the user's chosen base speaking rhythm;
- prefer a warm Spanish female-leaning system voice when the device provides one, without introducing a paid TTS dependency;
- keep Local VAD barge-in, action confirmation safety, memory, and permissions unchanged.

Changes:
- source user question is passed to the spoken layer for conversational phrasing;
- intent-specific spoken digests are warmer and less formal;
- repetitive written-detail boilerplate is removed from ordinary spoken prose;
- generic oral replies usually speak one useful idea rather than reading several sentences;
- URLs, emails, hashes and technical ceremony remain written;
- Spanish voice selection prefers es-ES and female/natural system voices when available;
- warm_close_caring tone adds only slight pitch shaping and does not slow the base rhythm;
- unbounded voice-session regression guard remains active.

Evidence before promotion:
- PR #473 exact head: d4b4b9097a7eb639d57cf0ae0e61bb0f913f22cf
- CEREBRO Session Context Regression Guard #144: SUCCESS
- App Restoration Build Gate #388: SUCCESS
- Natural Spoken V4 behavioral corpus: GREEN
- merge: 1f0ee1593388e4c0bcbcfceade4f7528675bdcd0
- previous exact frontend rollback source: 96eb6effb4ab4077ccdc6158858c5158e3be825e

Physical listening acceptance remains mandatory after deployment.
