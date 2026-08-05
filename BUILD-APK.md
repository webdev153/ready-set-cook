# Building the APK

The Capacitor project lives in `mobile/`. The web app (game.js/style.css/index.html + assets)
is copied into `mobile/www` by `scripts/sync-www.js`, then `cap sync` pushes it into the
Android project.

## Prerequisites (your machine)
- **JDK 17** (`java -version`)
- **Android SDK** — easiest: install Android Studio, then set `ANDROID_HOME`
  (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`)

## Build the APK (command line)
```powershell
cd mobile
npm install            # once — fetches @capacitor/* (6.x)
npm run build          # sync:www → cap sync → ./gradlew assembleDebug
```
Output: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Install on a device over USB:
```powershell
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```
(Enable Developer options → USB debugging on the phone first. Or copy the APK to the phone
and tap it — allow "install unknown apps".)

## Or build from Android Studio
1. Open `mobile/android` in Android Studio (it will import the Gradle project).
2. Menu: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
3. Wait for the Gradle sync + build; the APK appears in the output folder with a "locate"
   popup.

## Release (signed) APK
Debug APKs install fine for testing. For a store release you'd add signing config in
`mobile/android/app/build.gradle` (keystore) and run `assembleRelease`.

## What's wired up already
- App icon + splash: generated from `assets/sorceress/icon-512.png` by
  `scripts/android-assets.js` (rerun it if you change the icon, then `npm run sync`)
- Back button: pauses during play, resumes when paused, exits from menus (game.js)
- Screen wake lock during levels; safe-area-aware corner buttons
- Fonts self-hosted — works fully offline
- Assets are lazy-loaded at runtime; source MP4s are excluded from the bundle
