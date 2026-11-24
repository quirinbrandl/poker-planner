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
//
// This build is signed with the Android debug key, the published one (release.mjs) with the
// release key, so the two cannot replace each other on a phone without removing the app first.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { adb, buildReleaseApk, builtApk, fail, root } from './android-build.mjs';

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const wanted = args.includes('--device') ? args[args.indexOf('--device') + 1] : undefined;

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

const serial = pickDevice();
const prop = (name) => execFileSync(adb, ['-s', serial, 'shell', 'getprop', name], { encoding: 'utf8' }).trim();
const model = prop('ro.product.model') || serial;
const appId = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.android.package;

// Only the phone's own processor architecture is built: faster, and a smaller APK.
const apk = noBuild ? builtApk : buildReleaseApk([prop('ro.product.cpu.abi')]);
if (!existsSync(apk)) fail('There is no built app yet. Run it without --no-build.');

// Play Protect may ask on the phone before it lets the app in, so the phone has to be unlocked.
console.log(`\n› Install on ${model} (keep the phone unlocked; confirm if it asks)`);
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
