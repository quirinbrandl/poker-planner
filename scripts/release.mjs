#!/usr/bin/env node
// Releases of the Android app. A release is the tag v<version> on main: GitHub Actions
// (.github/workflows/release.yml) builds the APK for it, signs it and publishes it as a GitHub
// release, where anyone can download it.
//
//   npm run release                   tag main as v<version> and push the tag: starts the release
//   npm run release -- --build-only   build, sign and check the APK in dist/ here, publish nothing
//   node scripts/release.mjs --publish    what GitHub Actions runs for a pushed tag
//
// Before a new release: raise "version" in app.json and package.json and "android.versionCode" in
// app.json (a phone only accepts an update with a higher versionCode) and merge that into main.
//
// The release key proves that an update comes from the same maker. It is not in the repository.
// GitHub Actions gets it from the repository secrets RELEASE_KEYSTORE_BASE64, RELEASE_STORE_PASSWORD,
// RELEASE_KEY_ALIAS and RELEASE_KEY_PASSWORD; a build here reads
// ~/.android/poker-planner-release.properties (or the file named by POKER_PLANNER_SIGNING):
//   storeFile=/path/to/poker-planner-release.jks
//   storePassword=…
//   keyAlias=poker-planner
//   keyPassword=…
// Keep a backup of the keystore and its password: without them no update can be installed over a
// published version.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { buildReleaseApk, buildTool, env, fail, root, run } from './android-build.mjs';

const args = process.argv.slice(2);
const mode = args.includes('--publish') ? 'publish' : args.includes('--build-only') ? 'build' : 'tag';
const { version } = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const tag = `v${version}`;

const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).trim();
const gitSucceeds = (...gitArgs) => spawnSync('git', gitArgs, { cwd: root, stdio: 'ignore' }).status === 0;

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

/** Tags main as it is on GitHub; the pushed tag starts the Release workflow. */
function tagMain() {
  if (git('status', '--porcelain', '--untracked-files=no')) fail('There are uncommitted changes. Commit and merge them first.');
  git('fetch', '--quiet', '--tags', 'origin', 'main');
  if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
    fail('This is not the main branch as it is on GitHub. Check out main and pull first.');
  }
  if (gitSucceeds('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`)) {
    fail(`${tag} is already released. Raise the version in app.json and package.json first.`);
  }
  git('tag', tag);
  run(`Push the tag ${tag}`, 'git', ['push', 'origin', tag]);
  console.log(`\nGitHub Actions now builds and publishes Poker Planner ${version}: see the repository's Actions tab.`);
}

/** Builds the APK for 64-bit phones and the older 32-bit ones and signs it. Returns its path. */
function signedApk() {
  const key = releaseKey();
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
  return apk;
}

/** In GitHub Actions, for the pushed tag: checks it, then builds, signs and publishes. */
function publish() {
  const pushed = process.env.GITHUB_REF_NAME;
  if (pushed !== tag) fail(`The tag ${pushed} does not match the version ${version} in app.json.`);
  if (!gitSucceeds('merge-base', '--is-ancestor', 'HEAD', 'origin/main')) fail(`${tag} is not a commit of main.`);
  const apk = signedApk();
  const notes = [
    `Poker Planner ${version} for Android.`,
    '',
    `**Install:** open this page on the phone, download \`poker-planner-${version}.apk\`, open it and allow the installation when Android asks. Android 7 or newer.`,
    '',
    'The app works offline and keeps its games on the phone.',
  ].join('\n');
  run(`Publish ${tag} on GitHub`, 'gh', [
    'release', 'create', tag, apk, '--verify-tag', '--title', `Poker Planner ${version}`, '--notes', notes,
  ]);
}

if (mode === 'tag') tagMain();
else if (mode === 'build') signedApk();
else publish();
