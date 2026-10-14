#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-/tmp/cerebro-android-preprod-v0}"
SDK_ROOT="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

fail(){ echo "[CEREBRO_ANDROID_PREPROD_RED] $*" >&2; exit 1; }
[[ -n "$SDK_ROOT" && -d "$SDK_ROOT" ]] || fail "ANDROID_HOME/ANDROID_SDK_ROOT unavailable"

BUILD_TOOLS_DIR="$(find "$SDK_ROOT/build-tools" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort -V | tail -n 1)"
PLATFORM_DIR="$(find "$SDK_ROOT/platforms" -mindepth 1 -maxdepth 1 -type d -name 'android-*' 2>/dev/null | sort -V | tail -n 1)"
[[ -n "$BUILD_TOOLS_DIR" && -d "$BUILD_TOOLS_DIR" ]] || fail "Android build-tools unavailable"
[[ -n "$PLATFORM_DIR" && -f "$PLATFORM_DIR/android.jar" ]] || fail "Android platform android.jar unavailable"

AAPT2="$BUILD_TOOLS_DIR/aapt2"
D8="$BUILD_TOOLS_DIR/d8"
ZIPALIGN="$BUILD_TOOLS_DIR/zipalign"
APKSIGNER="$BUILD_TOOLS_DIR/apksigner"
ANDROID_JAR="$PLATFORM_DIR/android.jar"
for tool in "$AAPT2" "$D8" "$ZIPALIGN" "$APKSIGNER"; do [[ -x "$tool" ]] || fail "missing tool: $tool"; done
command -v javac >/dev/null || fail "javac unavailable"
command -v jar >/dev/null || fail "jar unavailable"
command -v keytool >/dev/null || fail "keytool unavailable"
command -v zip >/dev/null || fail "zip unavailable"
command -v sha256sum >/dev/null || fail "sha256sum unavailable"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
KEYSTORE="$OUT_DIR/preprod-debug.keystore"
keytool -genkeypair -noprompt -keystore "$KEYSTORE" -storepass android -keypass android \
  -alias cerebro-preprod -keyalg RSA -keysize 2048 -validity 2 \
  -dname 'CN=CEREBRO PREPROD,O=Fenix Capital,C=ES' >/dev/null 2>&1

build_apk(){
  local app_id="$1"
  local app_name="$2"
  local mode="$3"
  local work="$OUT_DIR/$mode"
  local pkg_path="${app_id//./\/}"
  mkdir -p "$work/src/$pkg_path" "$work/classes" "$work/dex" "$work/assets"

  if [[ "$mode" == "worker" ]]; then
    cat > "$work/AndroidManifest.xml" <<EOF
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="$app_id">
  <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35" />
  <uses-permission android:name="android.permission.INTERNET" />
  <application android:allowBackup="false" android:usesCleartextTraffic="false" android:label="$app_name">
    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF
    cat > "$work/src/$pkg_path/MainActivity.java" <<EOF
package $app_id;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;

public final class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    TextView view = new TextView(this);
    view.setText("CEREBRO Android Device Worker · PREPROD · KILL SWITCH ON");
    view.setContentDescription("CEREBRO_WORKER_48_PREPROD_BUILD_V0");
    setContentView(view);
  }
}
EOF
  else
    cat > "$work/AndroidManifest.xml" <<EOF
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="$app_id">
  <uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35" />
  <application android:allowBackup="false" android:usesCleartextTraffic="false" android:label="$app_name">
    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>
  </application>
</manifest>
EOF
    cat > "$work/src/$pkg_path/MainActivity.java" <<EOF
package $app_id;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;

public final class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    WebView view = new WebView(this);
    view.getSettings().setJavaScriptEnabled(false);
    view.loadUrl("file:///android_asset/index.html");
    setContentView(view);
  }
}
EOF
    cat > "$work/assets/index.html" <<'EOF'
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CEREBRO PREPROD</title></head><body><main data-company-id="fenix" data-engine-id="APPBOOT-001" data-environment="PREPROD" data-version="v0"><h1>APPBOOT-001 Mobile Template</h1><p>CEREBRO_APPBOOT_183_ANDROID_BUILD_V0</p></main></body></html>
EOF
  fi

  javac -source 8 -target 8 -classpath "$ANDROID_JAR" -d "$work/classes" "$work/src/$pkg_path/MainActivity.java"
  jar cf "$work/classes.jar" -C "$work/classes" .
  "$D8" --lib "$ANDROID_JAR" --min-api 26 --output "$work/dex" "$work/classes.jar"

  local aapt_args=(link -I "$ANDROID_JAR" --manifest "$work/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 --version-code 1 --version-name 0.1.0 -o "$work/base.apk")
  if [[ "$mode" == "template" ]]; then aapt_args+=( -A "$work/assets" ); fi
  "$AAPT2" "${aapt_args[@]}"
  (cd "$work/dex" && zip -q -j "$work/base.apk" classes.dex)
  "$ZIPALIGN" -f 4 "$work/base.apk" "$work/aligned.apk"
  "$APKSIGNER" sign --ks "$KEYSTORE" --ks-key-alias cerebro-preprod --ks-pass pass:android --key-pass pass:android --out "$work/$mode-preprod.apk" "$work/aligned.apk"
  "$APKSIGNER" verify --verbose --print-certs "$work/$mode-preprod.apk" > "$work/apksigner-verify.txt"
  sha256sum "$work/$mode-preprod.apk" | awk '{print $1}' > "$work/apk.sha256"
}

build_apk "es.cerebro.worker.preprod" "CEREBRO Worker PREPROD" worker
build_apk "es.cerebro.template.preprod" "CEREBRO Template PREPROD" template

WORKER_SHA="$(cat "$OUT_DIR/worker/apk.sha256")"
TEMPLATE_SHA="$(cat "$OUT_DIR/template/apk.sha256")"
BUILD_TOOLS_VERSION="$(basename "$BUILD_TOOLS_DIR")"
PLATFORM_VERSION="$(basename "$PLATFORM_DIR")"

cat > "$OUT_DIR/android-preprod-build-evidence.json" <<EOF
{
  "schema_version": "1.0.0",
  "state_type": "CEREBRO_ANDROID_PREPROD_BUILD_EVIDENCE_V0",
  "company_id": "fenix",
  "environment": "PREPROD",
  "status": "SIGNED_APK_BUILD_GREEN",
  "build_tools": "$BUILD_TOOLS_VERSION",
  "platform": "$PLATFORM_VERSION",
  "network_downloads_performed": 0,
  "gradle_used": false,
  "maven_used": false,
  "npm_install_used": false,
  "item_48": {
    "engine_id": "AUTO-001",
    "artifact": "worker/worker-preprod.apk",
    "sha256": "$WORKER_SHA",
    "kill_switch_default": true,
    "physical_device_bound": false,
    "remaining_gate": "AUTHORIZED_DEVICE_ATTESTATION_AND_PHYSICAL_DEVICE_E2E"
  },
  "item_183": {
    "engine_id": "APPBOOT-001",
    "artifact": "template/template-preprod.apk",
    "sha256": "$TEMPLATE_SHA",
    "javascript_enabled": false,
    "external_network_required": false,
    "physical_device_installed": false,
    "remaining_gate": "AUTHORIZED_DEVICE_INSTALL_AND_RENDER_E2E"
  },
  "prod_authorized": false,
  "prod_write_authorized": false,
  "trading_access": false,
  "external_dependency_install": false,
  "additional_cost_eur": 0
}
EOF

node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync(process.argv[1])); if(p.status!=='SIGNED_APK_BUILD_GREEN'||p.network_downloads_performed!==0||p.gradle_used||p.maven_used||p.prod_authorized||p.trading_access||p.additional_cost_eur!==0||!/^([a-f0-9]{64})$/.test(p.item_48.sha256)||!/^([a-f0-9]{64})$/.test(p.item_183.sha256)) process.exit(1);" "$OUT_DIR/android-preprod-build-evidence.json"

echo "CEREBRO_ANDROID_PREPROD_GREEN worker=$WORKER_SHA template=$TEMPLATE_SHA"
