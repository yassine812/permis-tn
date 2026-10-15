#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'Run this script on macOS with Xcode, or use the Build iPhone IPA GitHub workflow.' >&2
  exit 1
fi

mkdir -p artifacts
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/permis-tn-ios.XXXXXX")"
xcodebuild -version
xcodebuild \
  -workspace ios/PermisTN.xcworkspace \
  -scheme PermisTN \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$build_dir/DerivedData" \
  -jobs 2 \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  build 2>&1 | tee artifacts/ios-build.log

app_path="$build_dir/DerivedData/Build/Products/Release-iphoneos/PermisTN.app"
test -s "$app_path/PermisTN"
test -s "$app_path/main.jsbundle"
test -f "$app_path/Info.plist"

mkdir -p "$build_dir/package/Payload"
ditto "$app_path" "$build_dir/package/Payload/PermisTN.app"
# An IPA is a ZIP with Payload at its root. AltStore signs it on installation.
ditto -c -k --keepParent "$build_dir/package/Payload" artifacts/PermisTN-unsigned.ipa
unzip -tq artifacts/PermisTN-unsigned.ipa
(cd artifacts && shasum -a 256 PermisTN-unsigned.ipa > PermisTN-unsigned.ipa.sha256)
echo 'Created artifacts/PermisTN-unsigned.ipa. Install through AltStore Classic; it is not App Store signed.'
