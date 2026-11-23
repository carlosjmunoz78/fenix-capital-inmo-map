CREATE TABLE IF NOT EXISTS zeus_lrn_provenance_v1 (
 lock_key TEXT PRIMARY KEY NOT NULL CHECK(length(lock_key)=64 AND lock_key NOT GLOB '*[^0-9a-f]*'),
 manifest TEXT NOT NULL CHECK(json_valid(manifest) AND json_extract(manifest,'$.lock_key')=lock_key)
);
