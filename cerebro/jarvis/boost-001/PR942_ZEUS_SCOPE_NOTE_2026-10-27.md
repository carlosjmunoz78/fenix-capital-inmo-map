# PR #942 · ZEUS scope correction

Owner clarification: the master project/system umbrella is **ZEUS**. **CEREBRO OS** is a fundamental subsystem inside ZEUS. **JARVIS** is the primary executive interface to ZEUS.

Canonical W23/W24 files are now ZEUS-scoped. Legacy CEREBRO-named W23/W24 files are compatibility pointers only.

All tomorrow audit/build work must respect this hierarchy and must not infer that CEREBRO == ZEUS.
