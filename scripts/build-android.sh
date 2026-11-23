#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sdk="${ANDROID_HOME:-/opt/android-sdk}"
bt="$sdk/build-tools/${BUILD_TOOLS_VERSION:-35.0.0}"
platform="$sdk/platforms/android-35/android.jar"
out="$PWD/build/android"
mkdir -p "$out"/{assets,classes,dex}
cp -r public core android/host.html "$out/assets/"
"$bt/aapt" package -f -M android/AndroidManifest.xml -S android/res -A "$out/assets" -I "$platform" -F "$out/resources.apk"
javac --release 8 -classpath "$platform" -d "$out/classes" android/src/games/majlis/*.java
jar cf "$out/classes.jar" -C "$out/classes" .
"$bt/d8" --min-api 26 --lib "$platform" --output "$out/dex" "$out/classes.jar"
cp "$out/resources.apk" "$out/unsigned.apk"
(cd "$out/dex" && zip -q "$out/unsigned.apk" classes.dex)
"$bt/zipalign" -f 4 "$out/unsigned.apk" "$out/aligned.apk"
key="$out/debug.keystore"
if [[ ! -f "$key" ]]; then
 keytool -genkeypair -keystore "$key" -storepass android -keypass android -alias majlis -dname CN=MajlisDevelopment -keyalg RSA -validity 3650
fi
"$bt/apksigner" sign --ks "$key" --ks-pass pass:android --out "$out/majlis.apk" "$out/aligned.apk"
"$bt/apksigner" verify "$out/majlis.apk"
