#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${2:-cerebro/android-worker-final-v2}"
OUT_DIR="${1:-/tmp/cerebro-android-device-agent-final-v2}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
VERSION_CODE="210"
VERSION_NAME="2.1.0"
fail(){ echo "[CEREBRO_ANDROID_FINAL_V2_RED] $*" >&2; exit 1; }

[[ -n "$SDK_ROOT" && -d "$SDK_ROOT" ]] || fail "ANDROID SDK unavailable"
BT="$(find "$SDK_ROOT/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PF="$(find "$SDK_ROOT/platforms" -mindepth 1 -maxdepth 1 -type d -name 'android-*' | sort -V | tail -1)"
[[ -x "$BT/aapt2" && -x "$BT/d8" && -x "$BT/zipalign" && -x "$BT/apksigner" && -f "$PF/android.jar" ]] || fail "required Android tools unavailable"
for x in javac jar keytool zip sha256sum node; do command -v "$x" >/dev/null || fail "$x unavailable"; done
[[ -f "$SRC_DIR/AndroidManifest.xml" ]] || fail "Final V2 manifest unavailable"
[[ -d "$SRC_DIR/src" && -d "$SRC_DIR/res" ]] || fail "Final V2 source/resources unavailable"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/classes" "$OUT_DIR/dex"

mapfile -t JAVA_FILES < <(find "$SRC_DIR/src" -name '*.java' -type f | sort)
[[ ${#JAVA_FILES[@]} -gt 0 ]] || fail "no Java sources"

javac -source 8 -target 8 -classpath "$PF/android.jar" -d "$OUT_DIR/classes" "${JAVA_FILES[@]}"
jar cf "$OUT_DIR/classes.jar" -C "$OUT_DIR/classes" .
"$BT/d8" --lib "$PF/android.jar" --min-api 26 --output "$OUT_DIR/dex" "$OUT_DIR/classes.jar"
"$BT/aapt2" compile --dir "$SRC_DIR/res" -o "$OUT_DIR/resources.zip"
"$BT/aapt2" link -I "$PF/android.jar" --manifest "$SRC_DIR/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" -o "$OUT_DIR/base.apk" "$OUT_DIR/resources.zip"
(cd "$OUT_DIR/dex" && zip -q -j "$OUT_DIR/base.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT_DIR/base.apk" "$OUT_DIR/aligned.apk"

# CI signer is intentionally disposable. Physical installation MUST use the permanent local CEREBRO signing key.
keytool -genkeypair -noprompt -keystore "$OUT_DIR/ci-only.keystore" -storepass android -keypass android -alias cerebro-final-v2-ci -keyalg RSA -keysize 2048 -validity 30 -dname 'CN=CEREBRO Final V2 CI ONLY,O=CEREBRO OS,C=ES' >/dev/null 2>&1
"$BT/apksigner" sign --ks "$OUT_DIR/ci-only.keystore" --ks-key-alias cerebro-final-v2-ci --ks-pass pass:android --key-pass pass:android --out "$OUT_DIR/cerebro-android-agent-final-v2-ci.apk" "$OUT_DIR/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs "$OUT_DIR/cerebro-android-agent-final-v2-ci.apk" > "$OUT_DIR/apksigner-verify.txt"
APK_SHA="$(sha256sum "$OUT_DIR/cerebro-android-agent-final-v2-ci.apk" | awk '{print $1}')"

cat > "$OUT_DIR/evidence.json" <<EOF
{"schema_version":"1.0.0","company_id":"fenix","engine_id":"ACTGW-001","environment":"PREPROD","version":"android-device-agent-final-v2","agent_version":"android-agent-2.1.0","package":"es.cerebro.agent","version_code":210,"version_name":"2.1.0","status":"CI_COMPILE_SIGN_VERIFY_GREEN","signing_mode":"CI_EPHEMERAL_NON_INSTALL","physical_signing_required":true,"permanent_certificate_sha256":"9B:F8:AB:CA:93:80:8F:17:08:3D:29:6A:2D:6B:B5:06:D6:34:A9:98:9A:25:2A:DC:03:26:A0:93:C2:B8:E8:C3","apk_sha256":"$APK_SHA","physical_device_attested":false,"prod_authorized":false,"additional_cost_eur":0}
EOF
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1]));if(p.environment!=='PREPROD'||p.package!=='es.cerebro.agent'||p.signing_mode!=='CI_EPHEMERAL_NON_INSTALL'||!p.physical_signing_required||p.physical_device_attested||p.prod_authorized||p.additional_cost_eur!==0||!/^([a-f0-9]{64})$/.test(p.apk_sha256))process.exit(1)" "$OUT_DIR/evidence.json"

echo "CEREBRO_ANDROID_DEVICE_AGENT_FINAL_V2_CI_GREEN sha256=$APK_SHA"
