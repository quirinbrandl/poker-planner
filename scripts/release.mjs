#!/usr/bin/env node
// Build the signed Android app and publish it as a GitHub release, where anyone can download it.
//
//   npm run release                   publish release v<version> with poker-planner-<version>.apk
//   npm run release -- --build-only   build, sign and check the APK in dist/, publish nothing
//
// Before a new release: raise "version" in app.json and package.json and "android.versionCode" in
// app.json (a phone only accepts an update with a higher versionCode), commit, and push main.
//
// The release key proves that an update comes from the same maker. It lives outside the
// repository, described by ~/.android/poker-planner-release.properties:
//   storeFile=/path/to/poker-planner-release.jks
//   storePassword=…
//   keyAlias=poker-planner
//   keyPassword=…
// Keep a backup of that file and the keystore: without them no update can be installed over a
// published version. POKER_PLANNER_SIGNING names another properties file.
// Publishing uses the GitHub CLI (`gh`), signed in.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { buildReleaseApk, buildTool, env, fail, root, run } from './android-build.mjs';

const buildOnly = process.argv.slice(2).includes('--build-only');
const { version } = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const tag = `v${version}`;

function releaseKey() {
  const file = process.env.POKER_PLANNER_SIGNING ?? join(homedir(), '.android/poker-planner-release.properties');
  if (!existsSync(file)) {
    fail(
      `No release key: ${file} is missing.\n` +
        'Create a key once (and keep a backup of it), then write the properties file described in scripts/release.mjs:\n' +
        '  keytool -genkeypair -storetype PKCS12 -keystore ~/.android/poker-planner-release.jks \\\n' +
        '    -alias poker-planner -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Poker Planner"',
    );
  }
  const key = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const at = line.indexOf('=');
    if (at > 0 && !line.trimStart().startsWith('#')) key[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  for (const name of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    if (!key[name]) fail(`${file} has no ${name}.`);
  }
  if (!existsSync(key.storeFile)) fail(`The keystore ${key.storeFile} named in ${file} does not exist.`);
  return key;
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).trim();

const key = releaseKey();
if (!buildOnly) {
  if (spawnSync('gh', ['--version'], { stdio: 'ignore' }).status !== 0) fail('The GitHub CLI (gh) is needed to publish.');
  // The published APK has to be exactly what is on GitHub's main.
  if (git('status', '--porcelain', '--untracked-files=no')) fail('There are uncommitted changes. Commit them first.');
  git('fetch', '--quiet', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
    fail('This is not the main branch as it is on GitHub. Check out main and push it first.');
  }
  if (spawnSync('gh', ['release', 'view', tag], { cwd: root, stdio: 'ignore' }).status === 0) {
    fail(`Release ${tag} already exists. Raise the version in app.json and package.json first.`);
  }
}

// 64-bit phones and the older 32-bit ones.
const built = buildReleaseApk(['armeabi-v7a', 'arm64-v8a']);

const apksigner = buildTool('apksigner');
const apk = join(root, 'dist', `poker-planner-${version}.apk`);
mkdirSync(join(root, 'dist'), { recursive: true });
rmSync(apk, { force: true });
// The passwords travel in the environment, not on the command line.
run(
  'Sign with the release key',
  apksigner,
  ['sign', '--ks', key.storeFile, '--ks-key-alias', key.keyAlias, '--ks-pass', 'env:RELEASE_STORE_PASSWORD',
    '--key-pass', 'env:RELEASE_KEY_PASSWORD', '--v4-signing-enabled', 'false', '--out', apk, built],
  { extraEnv: { RELEASE_STORE_PASSWORD: key.storePassword, RELEASE_KEY_PASSWORD: key.keyPassword } },
);
const signer = execFileSync(apksigner, ['verify', '--print-certs', apk], { env, encoding: 'utf8' });
const signers = signer.split('\n').filter((line) => line.includes('certificate DN:'));
if (signers.length === 0 || signers.some((line) => line.includes('CN=Android Debug'))) {
  fail('The APK is not signed with the release key.');
}
console.log(`\nSigned: ${apk}`);
console.log(signer.split('\n').filter((line) => /certificate (DN|SHA-256 digest):/.test(line)).join('\n'));

if (buildOnly) process.exit(0);

const notes = [
  `Poker Planner ${version} for Android.`,
  '',
  `**Install:** open this page on the phone, download \`poker-planner-${version}.apk\`, open it and allow the installation when Android asks. Android 7 or newer.`,
  '',
  'The app works offline and keeps its games on the phone.',
].join('\n');
run(`Publish ${tag} on GitHub`, 'gh', [
  'release', 'create', tag, apk, '--target', git('rev-parse', 'HEAD'), '--title', `Poker Planner ${version}`, '--notes', notes,
]);
