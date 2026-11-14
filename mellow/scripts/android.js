#!/usr/bin/env node
// Builds and installs the app on a connected Android phone with `expo run:android`,
// after making sure the build environment is ready:
//  1. finds the Android SDK (ANDROID_HOME, or the default Android Studio location) and writes android/local.properties
//  2. uses Android Studio's bundled JDK if JAVA_HOME isn't set
//  3. installs any SDK platform / build-tools / NDK / CMake version this React Native release needs (via sdkmanager)
//  4. builds only for the connected phone's CPU (much faster than all four architectures)
//  5. on Windows, if the project path is long or has spaces, builds from a short copy (C:\mellow-build)
//     because the C++ build breaks past 260-character paths. MELLOW_NO_MIRROR=1 turns this off.
// Usage: node scripts/android.js [--variant release]   (MELLOW_DRY_RUN=1 prints what it would do)
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WIN = process.platform === 'win32';
const DRY = !!process.env.MELLOW_DRY_RUN;
const log = (m) => console.log('\x1b[36m[mellow]\x1b[0m ' + m);
const fail = (m) => { console.error('\x1b[31m[mellow]\x1b[0m ' + m); process.exit(1); };

function findSdk() {
  for (const v of [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT]) if (v && fs.existsSync(v)) return v;
  const home = os.homedir();
  const candidates = WIN
    ? [path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Android', 'Sdk')]
    : process.platform === 'darwin' ? [path.join(home, 'Library', 'Android', 'sdk')] : [path.join(home, 'Android', 'Sdk'), path.join(home, 'Android', 'sdk')];
  return candidates.find((p) => fs.existsSync(p));
}

function findJdk() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const c = WIN ? ['C:\\Program Files\\Android\\Android Studio\\jbr']
    : process.platform === 'darwin' ? ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'] : ['/opt/android-studio/jbr', path.join(os.homedir(), 'android-studio', 'jbr')];
  return c.find((p) => fs.existsSync(p));
}

// The versions React Native asks for (android/build.gradle reads the same catalog).
function requiredPackages() {
  const toml = path.join(ROOT, 'node_modules', 'react-native', 'gradle', 'libs.versions.toml');
  if (!fs.existsSync(toml)) fail('node_modules missing. Run `npm install` first.');
  const txt = fs.readFileSync(toml, 'utf8');
  const get = (k) => { const m = txt.match(new RegExp('^' + k + '\\s*=\\s*"([^"]+)"', 'm')); return m && m[1]; };
  // Each entry: [folders that count as installed, sdkmanager package name].
  const out = [];
  const api = get('compileSdk');
  // From Android 17 (API 37) Google ships platforms with a minor version: `platforms;android-37.0`.
  if (api) out.push([['platforms/android-' + api, 'platforms/android-' + api + '.0'], 'platforms;android-' + (Number(api) >= 37 ? api + '.0' : api)]);
  if (get('buildTools')) out.push([['build-tools/' + get('buildTools')], 'build-tools;' + get('buildTools')]);
  if (get('ndkVersion')) out.push([['ndk/' + get('ndkVersion')], 'ndk;' + get('ndkVersion')]);
  out.push([['cmake/3.22.1'], 'cmake;3.22.1']);
  return out;
}

// Windows: React Native's C++ build (CMake + ninja) fails once paths pass 260 characters, and the
// object-file paths are roughly the project path plus ~200 characters. A long project folder (or one
// with spaces) therefore breaks the build, so we build from a short copy instead, e.g. C:\mellow-build.
const needsMirror = (WIN || process.env.MELLOW_FORCE_MIRROR) && !process.env.MELLOW_IN_MIRROR && !process.env.MELLOW_NO_MIRROR
  && (ROOT.length > 40 || /\s/.test(ROOT) || process.env.MELLOW_FORCE_MIRROR);
if (needsMirror) {
  const writable = (d) => { try { fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); return true; } catch { return false; } };
  const short = [process.env.MELLOW_MIRROR_DIR, WIN ? 'C:\\mellow-build' : null, path.join(os.homedir(), 'mellow-build')]
    .filter(Boolean).find((d) => !/\s/.test(d) && writable(d));
  if (!short) fail('This folder\'s path is too long for the Android C++ build on Windows. Copy the mellow folder to a short path without spaces (e.g. C:\\mellow-build), run `npm ci` there, then `npm run android:release` there.');
  log('This folder\'s path is too long for the Android C++ build on Windows (' + ROOT.length + ' characters' + (/\s/.test(ROOT) ? ', with spaces' : '') + ').');
  log('Building from a short copy instead: ' + short + '  (your files here stay the source; the copy is refreshed on every run)');
  // Plain recursive copy (fs.cpSync's filter misbehaves on some Windows/Node versions). Only changed files are copied.
  const skip = new Set(['node_modules', 'android', 'ios', '.expo', 'dist', 'web-build', '.git']);
  let copied = 0;
  const copyIfChanged = (s, d) => {
    const a = fs.statSync(s);
    let same = false;
    try { const b = fs.statSync(d); same = b.size === a.size && b.mtimeMs >= a.mtimeMs; } catch {}
    if (!same) { fs.copyFileSync(s, d); copied++; }
  };
  const copyTree = (src, dst) => {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, e.name), d = path.join(dst, e.name);
      if (e.isDirectory()) copyTree(s, d);
      else if (e.isFile()) copyIfChanged(s, d);
    }
  };
  log('Copying the app files (not node_modules) ...');
  if (!DRY) {
    try {
      for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const s = path.join(ROOT, e.name), d = path.join(short, e.name);
        if (e.isDirectory()) copyTree(s, d);
        else if (e.isFile()) copyIfChanged(s, d);
      }
    } catch (err) { fail('Could not copy the project to ' + short + ': ' + err.message); }
  }
  log('Copied ' + copied + ' changed file(s).');
  // Reinstall dependencies in the copy only when package-lock.json changed.
  const lock = fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
  const stamp = path.join(short, 'node_modules', '.mellow-lock');
  const fresh = fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === lock;
  if (!fresh) {
    log('Installing dependencies in the copy (npm ci, first time only, a few minutes)...');
    if (!DRY) {
      const n = spawnSync(process.env.MELLOW_NPM || 'npm', ['ci', '--no-audit', '--no-fund'], { stdio: 'inherit', cwd: short, shell: WIN });
      if (n.status !== 0) fail('npm ci failed in ' + short + '. Check your internet connection and run this again.');
      fs.writeFileSync(stamp, lock);
    }
  } else log('Dependencies in the copy are up to date.');
  const args = process.argv.slice(2);
  const release = args.join(' ').indexOf('release') !== -1;
  // Debug builds load JavaScript from Metro. Build the native app in the copy, then run Metro from THIS
  // folder, so saving a file here updates the app instantly (Fast Refresh).
  const childArgs = release || args.includes('--no-bundler') ? args : [...args, '--no-bundler'];
  if (DRY) { log('Would run: node ' + path.join(short, 'scripts', 'android.js') + ' ' + childArgs.join(' ')); process.exit(0); }
  const r = spawnSync(process.execPath, [path.join(short, 'scripts', 'android.js'), ...childArgs], { stdio: 'inherit', cwd: short, env: { ...process.env, MELLOW_IN_MIRROR: '1' } });
  if (r.status !== 0 || release || args.includes('--no-bundler')) process.exit(r.status === null ? 1 : r.status);
  const sdkDir = findSdk();
  const devEnv = sdkDir ? { ...process.env, ANDROID_HOME: sdkDir, ANDROID_SDK_ROOT: sdkDir } : process.env;
  const adbPath = sdkDir && path.join(sdkDir, 'platform-tools', WIN ? 'adb.exe' : 'adb');
  let appId = 'com.mellow.app';
  try { appId = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo.android.package || appId; } catch {}
  if (adbPath && fs.existsSync(adbPath)) spawnSync(adbPath, ['shell', 'am', 'force-stop', appId], { timeout: 8000 });
  log('App installed. Starting Metro from your folder: save a file and the app updates by itself. Press r to reload, Ctrl+C to stop.');
  log('Next time, if you only changed JavaScript/TypeScript, skip the build: npm run dev');
  const m = spawnSync(process.env.MELLOW_NPX || 'npx', ['expo', 'start', '--dev-client', '--android'], { stdio: 'inherit', cwd: ROOT, env: devEnv, shell: WIN });
  process.exit(m.status === null ? 1 : m.status);
}

const sdk = findSdk();
if (!sdk) fail('Android SDK not found. Install Android Studio, open it once so it downloads the SDK, then run this again (or set ANDROID_HOME).');
log('Android SDK: ' + sdk);

const androidDir = path.join(ROOT, 'android');
const props = path.join(androidDir, 'local.properties');
const line = 'sdk.dir=' + sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:') + '\n';
// local.properties wins over ANDROID_HOME in Gradle, so keep its sdk.dir pointing at the SDK we found.
if (fs.existsSync(androidDir)) {
  const cur = fs.existsSync(props) ? fs.readFileSync(props, 'utf8') : '';
  const next = /^sdk\.dir=.*$/m.test(cur) ? cur.replace(/^sdk\.dir=.*\r?\n?/m, line) : line + cur;
  if (next !== cur) {
    if (!DRY) fs.writeFileSync(props, next);
    log('Wrote android/local.properties');
  }
}

const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
// Windows: Expo raises CMAKE_OBJECT_PATH_MAX to 1024, which only works with Windows long paths enabled AND a
// CMake whose Ninja supports them (the default CMake 3.22.1 doesn't). Keeping the limit under 260 makes CMake
// shorten deep object-file paths with a hash instead, so the C++ build fits in Windows' path limit.
if (WIN || process.env.MELLOW_FORCE_WINFIX) {
  const prop = 'expo.android.cmakeObjectPathMax';
  env['ORG_GRADLE_PROJECT_' + prop] = '240';
  const gp = path.join(androidDir, 'gradle.properties');
  if (fs.existsSync(gp) && !/^expo\.android\.cmakeObjectPathMax=/m.test(fs.readFileSync(gp, 'utf8'))) {
    if (!DRY) fs.appendFileSync(gp, '\n# Added by scripts/android.js: keep C++ object paths under the Windows 260-character limit\n' + prop + '=240\n');
    log('Set ' + prop + '=240 (short C++ paths for Windows)');
  }
  // One-time cleanup of C++ build folders configured with the old limit.
  const cxx = path.join(androidDir, 'app', '.cxx');
  const stamp = path.join(androidDir, 'app', '.mellow-objpath-240');
  if (fs.existsSync(path.join(androidDir, 'app')) && !fs.existsSync(stamp)) {
    if (!DRY) {
      try { fs.rmSync(cxx, { recursive: true, force: true }); } catch (e) { log('Could not clean ' + cxx + ' (' + e.message + '), continuing.'); }
      fs.writeFileSync(stamp, 'cmakeObjectPathMax=240\n');
    }
    log('Cleaned the old C++ build folder');
  }
}

// More memory for Gradle when the machine has it: the template's 2 GB heap makes React Native builds slow.
const gprops = path.join(androidDir, "gradle.properties");
if (fs.existsSync(gprops) && os.totalmem() >= 12 * 1024 ** 3) {
  const cur = fs.readFileSync(gprops, "utf8");
  if (/^org\.gradle\.jvmargs=-Xmx2048m/m.test(cur)) {
    if (!DRY) fs.writeFileSync(gprops, cur.replace(/^org\.gradle\.jvmargs=-Xmx2048m/m, 'org.gradle.jvmargs=-Xmx4096m'));
    log('Gave Gradle 4 GB of memory (was 2 GB)');
  }
}

const jdk = findJdk();
if (jdk) { env.JAVA_HOME = jdk; log('JDK: ' + jdk); } else log('No JAVA_HOME and no Android Studio JDK found; Gradle will try to download one.');

const missing = requiredPackages().filter(([dirs]) => !dirs.some((d) => fs.existsSync(path.join(sdk, ...d.split('/')))));
if (missing.length) {
  const names = missing.map((m) => m[1]);
  log('Missing SDK packages: ' + names.join(', '));
  const sm = ['latest', ...(fs.existsSync(path.join(sdk, 'cmdline-tools')) ? fs.readdirSync(path.join(sdk, 'cmdline-tools')) : [])]
    .map((d) => path.join(sdk, 'cmdline-tools', d, 'bin', WIN ? 'sdkmanager.bat' : 'sdkmanager')).find((p) => fs.existsSync(p));
  if (!sm) fail('Install them in Android Studio: Settings > Languages & Frameworks > Android SDK. SDK Platforms: ' + names.filter((n) => n.startsWith('platforms')).join(', ') + '. SDK Tools (tick "Show Package Details"): ' + names.filter((n) => !n.startsWith('platforms')).join(', ') + '.');
  log('Installing with sdkmanager (accept the licence if it asks, by typing y)...');
  if (!DRY) {
    const q = (s) => (WIN ? '"' + s + '"' : s); // cmd.exe needs quotes around `platforms;android-37`
    // One package at a time, so one unknown name doesn't block the others.
    const failed = names.filter((n) => {
      log('Installing ' + n + ' ...');
      const r = spawnSync(WIN ? q(sm) : sm, [q('--sdk_root=' + sdk), q(n)], { stdio: 'inherit', env, shell: WIN });
      return r.status !== 0 || !missing.find((m) => m[1] === n)[0].some((d) => fs.existsSync(path.join(sdk, ...d.split('/'))));
    });
    if (failed.length) fail('sdkmanager could not install: ' + failed.join(', ') + '. Install them in Android Studio > Settings > Languages & Frameworks > Android SDK (SDK Platforms: Android 17 / API 37; SDK Tools with "Show Package Details": Build-Tools 37.0.0 and NDK 27.1.12297006), then run this again.');
  }
} else log('SDK packages: all present');

// Build only for the connected phone's CPU, unless the user already chose.
if (!env.ORG_GRADLE_PROJECT_reactNativeArchitectures) {
  const adb = path.join(sdk, 'platform-tools', WIN ? 'adb.exe' : 'adb');
  if (fs.existsSync(adb)) {
    const r = spawnSync(adb, ['shell', 'getprop', 'ro.product.cpu.abi'], { encoding: 'utf8', timeout: 8000 });
    const abi = (r.stdout || '').trim();
    if (r.status === 0 && /^(arm64-v8a|armeabi-v7a|x86|x86_64)$/.test(abi)) {
      env.ORG_GRADLE_PROJECT_reactNativeArchitectures = abi;
      const prop = (k) => (spawnSync(adb, ['shell', 'getprop', k], { encoding: 'utf8', timeout: 8000 }).stdout || '').trim();
      const emu = prop('ro.kernel.qemu') === '1' || /^x86/.test(abi);
      log('Device: ' + (prop('ro.product.model') || 'unknown') + (emu ? ' (emulator)' : '') + '. Building only for its CPU: ' + abi);
    }
    else log('No single phone detected over USB; building for all architectures (slower). Check `adb devices`.');
  }
}

const args = ['expo', 'run:android', ...process.argv.slice(2)];
log('Running: npx ' + args.join(' '));
if (DRY) process.exit(0);
const r = spawnSync(process.env.MELLOW_NPX || 'npx', args, { stdio: 'inherit', env, cwd: ROOT, shell: WIN });
process.exit(r.status === null ? 1 : r.status);
