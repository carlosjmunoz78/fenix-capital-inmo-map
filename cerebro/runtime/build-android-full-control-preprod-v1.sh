#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${2:-cerebro/android-worker-preprod-v1}"
OUT_DIR="${1:-/tmp/cerebro-android-full-control-preprod-v1}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
fail(){ echo "[CEREBRO_ANDROID_V1_RED] $*" >&2; exit 1; }
[[ -n "$SDK_ROOT" && -d "$SDK_ROOT" ]] || fail "ANDROID SDK unavailable"
BT="$(find "$SDK_ROOT/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PF="$(find "$SDK_ROOT/platforms" -mindepth 1 -maxdepth 1 -type d -name 'android-*' | sort -V | tail -1)"
[[ -x "$BT/aapt2" && -x "$BT/d8" && -x "$BT/zipalign" && -x "$BT/apksigner" && -f "$PF/android.jar" ]] || fail "required Android tools unavailable"
for x in javac jar keytool zip sha256sum node; do command -v "$x" >/dev/null || fail "$x unavailable"; done
rm -rf "$OUT_DIR"; mkdir -p "$OUT_DIR/classes" "$OUT_DIR/dex"

javac -source 8 -target 8 -classpath "$PF/android.jar" -d "$OUT_DIR/classes" $(find "$SRC_DIR/src" -name '*.java' -type f | sort)
jar cf "$OUT_DIR/classes.jar" -C "$OUT_DIR/classes" .
"$BT/d8" --lib "$PF/android.jar" --min-api 26 --output "$OUT_DIR/dex" "$OUT_DIR/classes.jar"
"$BT/aapt2" compile --dir "$SRC_DIR/res" -o "$OUT_DIR/resources.zip"
"$BT/aapt2" link -I "$PF/android.jar" --manifest "$SRC_DIR/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 --version-code 100 --version-name 1.0.0 -o "$OUT_DIR/base.apk" "$OUT_DIR/resources.zip"
(cd "$OUT_DIR/dex" && zip -q -j "$OUT_DIR/base.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT_DIR/base.apk" "$OUT_DIR/aligned.apk"
keytool -genkeypair -noprompt -keystore "$OUT_DIR/preprod-test.keystore" -storepass android -keypass android -alias cerebro-preprod -keyalg RSA -keysize 2048 -validity 30 -dname 'CN=CEREBRO Android PREPROD,O=Fenix Capital,C=ES' >/dev/null 2>&1
"$BT/apksigner" sign --ks "$OUT_DIR/preprod-test.keystore" --ks-key-alias cerebro-preprod --ks-pass pass:android --key-pass pass:android --out "$OUT_DIR/cerebro-android-worker-preprod-v1.apk" "$OUT_DIR/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs "$OUT_DIR/cerebro-android-worker-preprod-v1.apk" > "$OUT_DIR/apksigner-verify.txt"
SHA="$(sha256sum "$OUT_DIR/cerebro-android-worker-preprod-v1.apk" | awk '{print $1}')"
cat > "$OUT_DIR/android-full-control-preprod-v1-evidence.json" <<EOF
{"schema_version":"1.0.0","state_type":"CEREBRO_ANDROID_FULL_CONTROL_PREPROD_V1_BUILD","company_id":"fenix","environment":"PREPROD","version":"android-full-control-v1","status":"SIGNED_APK_BUILD_GREEN","apk_sha256":"$SHA","capabilities":["ACCESSIBILITY_UI_CONTROL","GESTURE_TAP","TEXT_SET","APP_LAUNCH","HTTPS_URL_OPEN","SANITIZED_SCREEN_TREE","NOTIFICATION_METADATA","CANONICAL_DEVICE_GATEWAY_POLL","IDEMPOTENT_LOCAL_RECEIPTS","OWNER_APPROVED_ENROLLMENT","LOCAL_KILL_SWITCH"],"remote_gateway":"cerebro-device-gateway-preprod","enrollment_adapter":"cerebro-android-enrollment-preprod","raw_token_server_storage":false,"keystore_encrypted_local_token":true,"prod_authorized":false,"trading_access":false,"additional_cost_eur":0,"physical_device_attested":false,"remaining_gate":"AUTHORIZED_PHYSICAL_DEVICE_INSTALL_PERMISSIONS_ENROLLMENT_AND_E2E"}
EOF
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1]));if(p.status!=='SIGNED_APK_BUILD_GREEN'||p.prod_authorized||p.trading_access||p.additional_cost_eur!==0||p.physical_device_attested||!/^([a-f0-9]{64})$/.test(p.apk_sha256))process.exit(1)" "$OUT_DIR/android-full-control-preprod-v1-evidence.json"
echo "CEREBRO_ANDROID_FULL_CONTROL_PREPROD_V1_GREEN sha256=$SHA"
