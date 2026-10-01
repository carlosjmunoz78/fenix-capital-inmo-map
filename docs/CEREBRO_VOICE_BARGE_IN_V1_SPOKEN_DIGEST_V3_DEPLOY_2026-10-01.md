# CEREBRO Voice Barge-in V1 + Spoken Digest V3 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Owner physical feedback driving this release:
- Spoken Summary V2 was perceived as materially unchanged.
- While CEREBRO was speaking, saying "para", "stop" or "calla" did not interrupt speech; only the visible stop/end control worked.

Changes:
- dedicated SpeechRecognition listener runs while TTS is active;
- exact verbal interruption commands include para, para ya, CEREBRO para, stop, calla, cállate, silencio, basta and detente;
- exact matching avoids false interruption for ordinary phrases such as "para Belén";
- verbal interruption cancels speech synthesis and resumes normal listening immediately;
- spoken output is materially shorter for ordinary prose;
- domain-specific spoken digests added for SEO, finance, marketing, social, newsletter, autonomy, platform, trading and multi-company answers;
- full written answer remains unchanged;
- no permission or execution-policy expansion.

Evidence before promotion:
- PR #467 exact head: c9a5d7283379a0d01eb0dc1d15306a35e3e4e12b
- CEREBRO Session Context Regression Guard #134: SUCCESS
- App Restoration Build Gate #381: SUCCESS
- verbal interruption + spoken digest behavioral corpus: GREEN
- merge: dd1ff3ddca304e46502880ed5def625a1a9933da
- previous exact frontend rollback source: f670d65136b8a09630ab5183d23961fea098af24

Physical acceptance of verbal barge-in and Spoken Digest V3 remains pending after production deployment.
