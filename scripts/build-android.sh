#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sdk="${ANDROID_HOME:-/opt/android-sdk}"
bt="$sdk/build-tools/${BUILD_TOOLS_VERSION:-35.0.0}"
platform="$sdk/platforms/android-35/android.jar"
out="$PWD/build/android"
mkdir -p "$out"
stage=$(mktemp -d "$out/staging.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
assets="$stage/assets"
mkdir -p "$assets" "$stage/classes" "$stage/dex"
npm run build
cp -r dist "$assets/public"
npm run build:engine
cp build/engine/engine.js android/host.html "$assets/"
cp -r licenses "$assets/"
cp node_modules/react/LICENSE "$assets/licenses/react-MIT.txt"
cp node_modules/react-dom/LICENSE "$assets/licenses/react-dom-MIT.txt"
cp node_modules/scheduler/LICENSE "$assets/licenses/scheduler-MIT.txt"
"$bt/aapt" package -f -M android/AndroidManifest.xml -S android/res -A "$assets" -I "$platform" -F "$stage/resources.apk"
javac --release 8 -classpath "$platform" -d "$stage/classes" android/src/games/majlis/*.java
jar cf "$stage/classes.jar" -C "$stage/classes" .
"$bt/d8" --min-api 26 --lib "$platform" --output "$stage/dex" "$stage/classes.jar"
cp "$stage/resources.apk" "$stage/unsigned.apk"
(cd "$stage/dex" && zip -q "$stage/unsigned.apk" classes.dex)
"$bt/zipalign" -f 4 "$stage/unsigned.apk" "$stage/aligned.apk"
key="$out/debug.keystore"
if [[ ! -f "$key" ]]; then
 keytool -genkeypair -keystore "$key" -storepass android -keypass android -alias majlis -dname CN=MajlisDevelopment -keyalg RSA -validity 3650
fi
"$bt/apksigner" sign --ks "$key" --ks-pass pass:android --out "$out/majlis.apk" "$stage/aligned.apk"
"$bt/apksigner" verify "$out/majlis.apk"
"$bt/zipalign" -c 4 "$out/majlis.apk"
