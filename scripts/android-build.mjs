// Shared by phone.mjs and release.mjs: finds the Android SDK and JDK and builds the release APK.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function androidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'Library/Android/sdk'),
    join(homedir(), 'Android/Sdk'),
  ];
  const sdk = candidates.find((dir) => dir && existsSync(join(dir, 'platform-tools')));
  if (!sdk) fail('Android SDK not found. Install it with Android Studio, or set ANDROID_HOME.');
  return sdk;
}

/** JDK 17 is the one the Android build is known to work with; a set JAVA_HOME is respected. */
function javaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  if (process.platform !== 'darwin') return undefined;
  try {
    const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    return execFileSync('/usr/libexec/java_home', ['-v', '17'], options).trim();
  } catch {
    return undefined; // no JDK 17: Gradle uses the default Java
  }
}

export const sdk = androidSdk();
export const adb = join(sdk, 'platform-tools', 'adb');
export const env = { ...process.env, ANDROID_HOME: sdk };
const jdk = javaHome();
if (jdk) env.JAVA_HOME = jdk;

/** A tool from the newest installed Android build-tools, e.g. `apksigner`. */
export function buildTool(name) {
  const directory = join(sdk, 'build-tools');
  const versions = existsSync(directory) ? readdirSync(directory).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : [];
  const tool = versions.map((version) => join(directory, version, name)).findLast((path) => existsSync(path));
  if (!tool) fail(`Android build-tools (${name}) not found. Install them with Android Studio's SDK Manager.`);
  return tool;
}

/** Runs a step with its output on the terminal and stops everything if it fails. */
export function run(what, command, commandArgs, { cwd = root, extraEnv = {} } = {}) {
  console.log(`\n› ${what}`);
  const result = spawnSync(command, commandArgs, { cwd, env: { ...env, ...extraEnv }, stdio: 'inherit' });
  if (result.status !== 0) fail(`${what} failed.`);
}

/**
 * Builds the release APK for the given processor architectures (e.g. `['arm64-v8a']`) and returns
 * its path. It carries its own JavaScript and is signed with the Android debug key, like every
 * local build; release.mjs signs the published copy with the release key.
 */
export function buildReleaseApk(abis) {
  run('Prepare the Android project', 'npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
  run(
    `Build the release app (${abis.join(', ')})`,
    './gradlew',
    ['assembleRelease', `-PreactNativeArchitectures=${abis.join(',')}`, '--console=plain', '--quiet'],
    { cwd: join(root, 'android') },
  );
  return builtApk;
}

/** Where the last build left the APK. */
export const builtApk = join(root, 'android/app/build/outputs/apk/release/app-release.apk');
