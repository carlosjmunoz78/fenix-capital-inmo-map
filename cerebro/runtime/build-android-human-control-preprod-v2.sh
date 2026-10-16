#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${2:-cerebro/android-worker-preprod-v1}"
V2_DIR="${3:-cerebro/android-worker-preprod-v2}"
OUT_DIR="${1:-/tmp/cerebro-android-human-control-preprod-v2}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
fail(){ echo "[CEREBRO_ANDROID_V2_RED] $*" >&2; exit 1; }
[[ -n "$SDK_ROOT" && -d "$SDK_ROOT" ]] || fail "ANDROID SDK unavailable"
BT="$(find "$SDK_ROOT/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PF="$(find "$SDK_ROOT/platforms" -mindepth 1 -maxdepth 1 -type d -name 'android-*' | sort -V | tail -1)"
[[ -x "$BT/aapt2" && -x "$BT/d8" && -x "$BT/zipalign" && -x "$BT/apksigner" && -f "$PF/android.jar" ]] || fail "required Android tools unavailable"
for x in javac jar keytool zip sha256sum node; do command -v "$x" >/dev/null || fail "$x unavailable"; done
[[ -f "$V2_DIR/AndroidManifest.xml" ]] || fail "V2 manifest unavailable"
rm -rf "$OUT_DIR"; mkdir -p "$OUT_DIR/classes" "$OUT_DIR/dex"

javac -source 8 -target 8 -classpath "$PF/android.jar" -d "$OUT_DIR/classes" $(find "$SRC_DIR/src" -name '*.java' -type f | sort)
jar cf "$OUT_DIR/classes.jar" -C "$OUT_DIR/classes" .
"$BT/d8" --lib "$PF/android.jar" --min-api 26 --output "$OUT_DIR/dex" "$OUT_DIR/classes.jar"
"$BT/aapt2" compile --dir "$SRC_DIR/res" -o "$OUT_DIR/resources.zip"
"$BT/aapt2" link -I "$PF/android.jar" --manifest "$V2_DIR/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 --version-code 200 --version-name 2.0.0 -o "$OUT_DIR/base.apk" "$OUT_DIR/resources.zip"
(cd "$OUT_DIR/dex" && zip -q -j "$OUT_DIR/base.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT_DIR/base.apk" "$OUT_DIR/aligned.apk"
keytool -genkeypair -noprompt -keystore "$OUT_DIR/preprod-v2-install.keystore" -storepass android -keypass android -alias cerebro-preprod-v2 -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=CEREBRO Android PREPROD V2,O=Fenix Capital,C=ES' >/dev/null 2>&1
"$BT/apksigner" sign --ks "$OUT_DIR/preprod-v2-install.keystore" --ks-key-alias cerebro-preprod-v2 --ks-pass pass:android --key-pass pass:android --out "$OUT_DIR/cerebro-android-worker-preprod-v2.apk" "$OUT_DIR/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs "$OUT_DIR/cerebro-android-worker-preprod-v2.apk" > "$OUT_DIR/apksigner-verify.txt"
SHA="$(sha256sum "$OUT_DIR/cerebro-android-worker-preprod-v2.apk" | awk '{print $1}')"
cat > "$OUT_DIR/android-human-control-preprod-v2-evidence.json" <<EOF
{"schema_version":"1.0.0","state_type":"CEREBRO_ANDROID_HUMAN_CONTROL_PREPROD_V2_BUILD","company_id":"fenix","engine_id":"FACT-001","environment":"PREPROD","version":"android-human-control-v2","status":"SIDE_BY_SIDE_SIGNED_APK_BUILD_GREEN","package":"es.cerebro.worker.preprod.v2","rollback_package":"es.cerebro.worker.preprod","apk_sha256":"$SHA","capabilities":["BROAD_ORDINARY_APP_UI_CONTROL","WHATSAPP_UI_CONTROL","ACCESSIBILITY_UI_CONTROL","GESTURE_TAP","TEXT_SET","APP_LAUNCH","HTTPS_URL_OPEN","SANITIZED_SCREEN_TREE","CANONICAL_DEVICE_GATEWAY_POLL","IDEMPOTENT_LOCAL_RECEIPTS","OWNER_APPROVED_ENROLLMENT","LOCAL_KILL_SWITCH","HUMAN_EXCEPTION_HIGH_RISK"],"sensitive_scope_policy":"HUMAN_REQUIRED_HIGH_RISK","prod_authorized":false,"trading_access":false,"payment_automation":false,"credential_automation":false,"additional_cost_eur":0,"physical_device_attested":false,"signing_continuity":"INITIAL_V2_INSTALL_KEY_EPHEMERAL_BUILD_ONLY","remaining_gate":"PHYSICAL_V2_INSTALL_ACCESSIBILITY_ENROLLMENT_AND_WHATSAPP_E2E"}
EOF
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1]));if(p.environment!=='PREPROD'||p.package!=='es.cerebro.worker.preprod.v2'||p.rollback_package!=='es.cerebro.worker.preprod'||p.prod_authorized||p.trading_access||p.payment_automation||p.credential_automation||p.additional_cost_eur!==0||p.physical_device_attested||!/^([a-f0-9]{64})$/.test(p.apk_sha256))process.exit(1)" "$OUT_DIR/android-human-control-preprod-v2-evidence.json"
echo "CEREBRO_ANDROID_HUMAN_CONTROL_PREPROD_V2_GREEN sha256=$SHA"
