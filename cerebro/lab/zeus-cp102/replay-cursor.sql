CREATE TABLE IF NOT EXISTS zeus_lrn_replay_cursor_v1 (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='fenix:LRN-001:PREPROD:daily'),
 position INTEGER NOT NULL CHECK(position>=0)
);
INSERT INTO zeus_lrn_replay_cursor_v1 VALUES ('fenix:LRN-001:PREPROD:daily',0)
ON CONFLICT(id) DO NOTHING;
