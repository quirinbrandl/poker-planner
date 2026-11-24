#!/usr/bin/env node
// Build the release app and put it on the Android phone that is plugged in by USB.
//
//   npm run phone                     the one phone attached by USB
//   npm run phone -- --device <id>    a specific device from `adb devices` (an emulator works too)
//   npm run phone -- --no-build       install the last built APK again
//
// The phone needs USB debugging switched on (Settings → Developer options) and has to trust this
// computer. The release build carries its own JavaScript, so the app then runs without the
// computer. Installing again keeps the games already on the phone.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const wanted = args.includes('--device') ? args[args.indexOf('--device') + 1] : undefined;

function fail(message) {
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

const sdk = androidSdk();
const adb = join(sdk, 'platform-tools', 'adb');
const env = { ...process.env, ANDROID_HOME: sdk };
const jdk = javaHome();
if (jdk) env.JAVA_HOME = jdk;

function attached() {
  return execFileSync(adb, ['devices'], { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({ serial, state }));
}

function pickDevice() {
  const all = attached();
  let device;
  if (wanted) {
    device = all.find((d) => d.serial === wanted);
    if (!device) fail(`No device "${wanted}". Attached: ${all.map((d) => d.serial).join(', ') || 'none'}.`);
  } else {
    const phones = all.filter((d) => !d.serial.startsWith('emulator-'));
    if (phones.length === 0) {
      fail(
        'No phone found. Plug it in by USB, unlock it and switch on USB debugging:\n' +
          'Settings → About phone → tap "Build number" seven times, then Settings → Developer options → USB debugging.',
      );
    }
    if (phones.length > 1) {
      const list = phones.map((d) => `  ${d.serial}`).join('\n');
      fail(`More than one phone is attached:\n${list}\nChoose one: npm run phone -- --device <id>`);
    }
    device = phones[0];
  }
  if (device.state === 'unauthorized') {
    fail('The phone does not trust this computer yet. Unlock it, tap "Allow" on "Allow USB debugging?", then run this again.');
  }
  if (device.state !== 'device') fail(`The phone is "${device.state}". Unplug it, plug it in again and run this again.`);
  return device.serial;
}

function run(what, command, commandArgs, cwd = root) {
  console.log(`\n› ${what}`);
  const result = spawnSync(command, commandArgs, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) fail(`${what} failed.`);
}

const serial = pickDevice();
const prop = (name) => execFileSync(adb, ['-s', serial, 'shell', 'getprop', name], { encoding: 'utf8' }).trim();
const model = prop('ro.product.model') || serial;
const appId = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.android.package;
const apk = join(root, 'android/app/build/outputs/apk/release/app-release.apk');

if (!noBuild) {
  // Only the phone's own processor architecture is built: faster, and a smaller APK.
  const abi = prop('ro.product.cpu.abi');
  run('Prepare the Android project', 'npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
  run(
    `Build the release app (${abi})`,
    './gradlew',
    ['assembleRelease', `-PreactNativeArchitectures=${abi}`, '--console=plain', '--quiet'],
    join(root, 'android'),
  );
}
if (!existsSync(apk)) fail('There is no built app yet. Run it without --no-build.');

console.log(`\n› Install on ${model}`);
const install = spawnSync(adb, ['-s', serial, 'install', '-r', apk], { encoding: 'utf8' });
const installOutput = `${install.stdout ?? ''}${install.stderr ?? ''}`;
if (install.status !== 0) {
  console.error(installOutput.trim());
  if (installOutput.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
    fail(
      'The phone already has a Poker Planner signed with another key, so it cannot be updated in place.\n' +
        `Removing it deletes its games. If that is fine: "${adb}" -s ${serial} uninstall ${appId}`,
    );
  }
  if (installOutput.includes('INSTALL_FAILED_USER_RESTRICTED')) {
    fail('The phone refused the install. Allow "Install via USB" in Developer options, or confirm the prompt on the phone.');
  }
  fail('Install failed.');
}

// Start it, so the new build is on the screen.
spawnSync(adb, ['-s', serial, 'shell', 'monkey', '-p', appId, '-c', 'android.intent.category.LAUNCHER', '1'], {
  stdio: 'ignore',
});
console.log(`\nPoker Planner is on ${model}.`);
