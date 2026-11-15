# Running Mellow locally

The app and the website, for developers. What Mellow is: see the [main README](../README.md).

## Run the app on an Android phone

All commands run inside `mellow/`. First time: `npm install`.

### Option A — Expo Go (fastest, live reload)

1. Install **Expo Go** from the Play Store.
2. `npm start` and scan the QR code with Expo Go (phone and PC on the same Wi-Fi).
   With the phone plugged in via USB, press `a` instead.
   If the network blocks it: `npm run start:tunnel`.

Needs the PC running the dev server.

### Option B — native build on your phone (Android Studio toolchain)

Needs Android Studio installed (it brings the Android SDK and a JDK) and the phone plugged in with USB debugging on.

| Command | What you get |
|---|---|
| `npm run android:dev` | Debug build installed on the phone/emulator, then the dev server starts from your folder: save a file and the app updates instantly (Fast Refresh). Keep the terminal running. |
| `npm run dev` | Day-to-day: skips the native build and just starts the dev server and opens the installed debug app. Use it when you only changed JavaScript/TypeScript. |
| `npm run android:release` | Standalone release build with the JavaScript bundled in. Runs on the phone without the PC — use this for the demo. |

`android:dev` and `android:release` go through `scripts/android.js`, which first finds the Android SDK and writes `android/local.properties`, uses Android Studio's JDK, installs any missing SDK platform / build-tools / NDK with `sdkmanager` (type `y` if it asks you to accept a licence), and builds only for your phone's CPU. The first build takes a while; later ones are much faster.

On Windows, React Native's C++ build breaks when paths pass 260 characters. If the project folder is long or has spaces (like `Desktop\Beyond the clinic\...`), the script copies the app to `C:\mellow-build`, installs dependencies there once, and builds from that copy. Your files stay the source: every run re-syncs the copy. Set `MELLOW_NO_MIRROR=1` to turn this off.

`mellow/android/` is generated and git-ignored; never edit it by hand. Open it in Android Studio if you want Logcat or the debugger.

If something breaks: `npx expo-doctor`, then `npx expo install --fix`. Add libraries with `npx expo install <package>`, not `npm install`.

## The website (app + clinician portal)

One website for everyone. Inside `mellow/`:

```bash
npx expo start --web
```

Open http://localhost:8081. Patients sign in (or use the demo account on the log-in screen); clinicians and therapists click **"Part of a care team?"** or open http://localhost:8081/care/login.
Demo accounts (password `123123123`): `laura.aalto@pinehollow.fi` for the care team, `aino.virtanen@mellow.test`
and the other patients for the app. More in `mellow/src/care/README.md`.
