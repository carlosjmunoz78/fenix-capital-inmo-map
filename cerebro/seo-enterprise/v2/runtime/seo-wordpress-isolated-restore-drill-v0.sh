#!/usr/bin/env bash
# SEO001 physical MariaDB backup/restore of synthetic WP-like rows only.
# Networkless disposable container. NEVER connects to WordPress production.
set -euo pipefail
[[ "$GITHUB_ACTIONS" == "true" && "$SEO_ISOLATED_RESTORE_AUTH" == "FIXTURE_ONLY_NO_PROD" ]] || exit 2
[[ -n "$GITHUB_RUN_ID" && -n "$RUNNER_TEMP" ]] || exit 2
NAME="seo001-mariadb-fixture-$GITHUB_RUN_ID"
DB="seo_restore_lab"
PASS="synthetic-fixture-password-no-user-secrets"
OUTPUT="$RUNNER_TEMP/seo001-restore-drill-$GITHUB_RUN_ID"
[[ "$NAME" =~ ^seo001-mariadb-fixture-[0-9]+$ ]] || exit 2
[[ ! -e "$OUTPUT" ]] || exit 2
mkdir -m 700 -p "$OUTPUT"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
STAGE='CONTAINER_BOOT'
trap 'exitcode=$?; echo "ISOLATED_DRILL_FAILED_STAGE=$STAGE EXIT=$exitcode"; exit "$exitcode"' ERR

docker run -d --rm --name "$NAME" --network none \
 -e MARIADB_ROOT_PASSWORD="$PASS" -e MARIADB_DATABASE="$DB" \
 --label "cerebro.environment=LAB" mariadb:11.8 >/dev/null
READY=0
for i in $(seq 1 60); do
 if docker exec "$NAME" mariadb -N -B -u root --password="$PASS" "$DB" -e "SELECT 1" >/dev/null 2>&1; then READY=1; break; fi
 sleep 1
done
[[ "$READY" == 1 ]] || { echo "ISOLATED_DB_NOT_READY"; exit 3; }
STAGE="CREATE_SYNTHETIC_WP_TABLES"
cat > "$OUTPUT/fixture.sql" <<'SQL'
CREATE TABLE wp_posts(
 ID BIGINT UNSIGNED PRIMARY KEY,
 post_author BIGINT UNSIGNED NOT NULL DEFAULT 0,
 post_date DATETIME NOT NULL,
 post_content LONGTEXT NOT NULL,
 post_title TEXT NOT NULL,
 post_status VARCHAR(20) NOT NULL,
 post_name VARCHAR(200) NOT NULL,
 post_type VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE wp_postmeta(
 meta_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 post_id BIGINT UNSIGNED NOT NULL,
 meta_key VARCHAR(255) NOT NULL,
 meta_value LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO wp_posts VALUES
(101,1,'2026-11-06 10:00:00','<p>Protected published fixture</p>','Existing live original','publish','existing-protected-post','post'),
(201,1,'2026-11-06 10:00:00','<h1>Fixture only</h1>','Cordoba buyers LAB test','draft','comparar-dos-pisos-despues-visita-cordoba','post'),
(202,1,'2026-11-06 10:00:00','<h1>Fixture only</h1>','Cordoba agencies LAB test','draft','derivacion-hipotecaria-comprador-inmobiliaria-cordoba','post');
INSERT INTO wp_postmeta(post_id,meta_key,meta_value) VALUES
(201,'_seo_sha256','96b340eba8d97d56fd9e2ce9644df9d2b8855759301180fbf0351630e351d88d'),
(202,'_seo_sha256','ffc9d8d4f32dbc8e77ec9d9f4e7ba2bfb98a35141a91a85f1b420e27bed00583');
SQL
docker exec -i "$NAME" mariadb -u root --password="$PASS" "$DB" < "$OUTPUT/fixture.sql" 2>/dev/null
STAGE="READ_FIRST_FIXTURE"
read_rows(){ docker exec "$NAME" mariadb -N -B -u root --password="$PASS" "$DB" -e "SELECT ID,post_type,post_status,post_name,post_title FROM wp_posts ORDER BY ID" 2>/dev/null; }
read_meta(){ docker exec "$NAME" mariadb -N -B -u root --password="$PASS" "$DB" -e "SELECT post_id,meta_key,meta_value FROM wp_postmeta ORDER BY post_id,meta_key" 2>/dev/null; }
read_rows > "$OUTPUT/before.tsv"
read_meta > "$OUTPUT/meta-before.tsv"
[[ $(wc -l < "$OUTPUT/before.tsv") -eq 3 ]] || exit 4
STAGE="CREATE_PHYSICAL_BACKUP"
docker exec "$NAME" mariadb-dump -u root --password="$PASS" \
 --single-transaction --databases "$DB" > "$OUTPUT/fixture-backup.sql" 2>/dev/null
[[ -s "$OUTPUT/fixture-backup.sql" ]] || exit 5
STAGE="MUTATE_SYNTHETIC_FIXTURE"
docker exec "$NAME" mariadb -u root --password="$PASS" "$DB" -e \
"UPDATE wp_posts SET post_title='Unsafe overwritten draft' WHERE ID=201;
DELETE FROM wp_posts WHERE ID=101;
UPDATE wp_postmeta SET meta_value='WRONG' WHERE post_id=202;
INSERT INTO wp_posts VALUES (203,1,NOW(),'Rogue','Unintended','publish','rogue','post');" 2>/dev/null
read_rows > "$OUTPUT/mutated.tsv"
cmp -s "$OUTPUT/before.tsv" "$OUTPUT/mutated.tsv" && exit 6
STAGE="FIRST_PHYSICAL_RESTORE"
docker exec -i "$NAME" mariadb -u root --password="$PASS" < "$OUTPUT/fixture-backup.sql" 2>/dev/null
read_rows > "$OUTPUT/after.tsv"
read_meta > "$OUTPUT/meta-after.tsv"
cmp -s "$OUTPUT/before.tsv" "$OUTPUT/after.tsv" || exit 7
cmp -s "$OUTPUT/meta-before.tsv" "$OUTPUT/meta-after.tsv" || exit 8
STAGE="SECOND_PHYSICAL_RESTORE"
docker exec -i "$NAME" mariadb -u root --password="$PASS" < "$OUTPUT/fixture-backup.sql" 2>/dev/null
read_rows > "$OUTPUT/after-again.tsv"
cmp -s "$OUTPUT/before.tsv" "$OUTPUT/after-again.tsv" || exit 9
[[ $(grep -c $'\tdraft\t' "$OUTPUT/after.tsv") -eq 2 ]] || exit 10
[[ $(grep -c $'\tpublish\t' "$OUTPUT/after.tsv") -eq 1 ]] || exit 11
node --input-type=module - "$OUTPUT" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=process.argv[2];
const sum=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex');
const receipt={
 schema_version:'1.0.0',company_id:'fenix',engine_id:'SEO-001',
 environment:'ISOLATED_EPHEMERAL_LAB',version:'0.1.0',
 status:'SYNTHETIC_MARIADB_PHYSICAL_BACKUP_RESTORE_PASS',
 based_on_real_wordpress_database:false,real_production_snapshot_imported:false,
 wordpress_core_full_schema_tested:false,plugins_restored:false,media_restored:false,
 run_id:process.env.GITHUB_RUN_ID,network:'none',schema_tables:['wp_posts','wp_postmeta'],
 draft_fixture_rows:2,published_fixture_rows:1,restore_attempts:2,
 backup_bytes:fs.statSync(path.join(dir,'fixture-backup.sql')).size,
 backup_sha256:sum('fixture-backup.sql'),baseline_sha256:sum('before.tsv'),
 restored_sha256:sum('after.tsv'),meta_before_sha256:sum('meta-before.tsv'),
 meta_after_sha256:sum('meta-after.tsv'),restored_exactly:true,
 production_credentials_injected:false,real_prod_restored:false,
 wordpress_live_writes:0,wordpress_live_restores:0,
 model_calls:0,paid_provider_calls:0,production_release_authorized:false,
 real_prod_wp_restore_gate_passed:false
};
fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:receipt.status,restore_attempts:2,
 backup_bytes:receipt.backup_bytes,fixture_only:true,prod_writes:0}));
NODE
rm "$OUTPUT/fixture.sql" "$OUTPUT/before.tsv" "$OUTPUT/meta-before.tsv" "$OUTPUT/mutated.tsv" "$OUTPUT/after.tsv" "$OUTPUT/meta-after.tsv" "$OUTPUT/after-again.tsv"
