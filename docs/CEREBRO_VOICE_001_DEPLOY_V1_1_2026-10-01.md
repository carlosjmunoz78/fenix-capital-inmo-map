# CEREBRO VOICE-001 V1.1 · PROD deployment marker

Source contains PR #456, validated by:
- CEREBRO Session Context Regression Guard #117: SUCCESS
- App Restoration Build Gate #369: SUCCESS

Changes:
- better full-utterance capture using up to 3 alternatives per recognition segment;
- optional browser-supported contextual vocabulary hints;
- explicit “Parar respuesta y hablar” control that cancels TTS and resumes listening;
- existing confirmation safety preserved.

Previous live rollback source: 79e0440e9d5615b4cbd8a6b7a5d2de32bfea3e4e.
