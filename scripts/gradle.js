#!/usr/bin/env node
/* Run a Gradle task through the wrapper, whatever shell npm happens to use.

   `cd android && gradlew assembleDebug` in an npm script is not portable: cmd.exe
   resolves a bare `gradlew` from the current directory via PATHEXT, but if npm
   picks a POSIX shell (Git Bash is on this machine) it does not, and the build
   dies with "'gradlew' is not recognized". Spawning the right wrapper by absolute
   path removes the shell from the equation entirely.

   Usage:  node scripts/gradle.js assembleDebug [...more gradle args] */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ANDROID = path.join(__dirname, '..', 'android');
const wrapper = path.join(ANDROID, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

if (!fs.existsSync(wrapper)) {
  console.error(`\nGradle wrapper not found at ${wrapper}`);
  console.error('The android/ project may be missing — run `npx cap add android` first.\n');
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('\nUsage: node scripts/gradle.js <task> [gradle args]\n');
  process.exit(1);
}

console.log(`\n> ${path.basename(wrapper)} ${args.join(' ')}   (in android/)\n`);

// A .bat needs a shell to be executable on Windows, but a shell re-splits the
// command on spaces -- and this project lives under "D:\Claude ai\...", so an
// unquoted absolute path dies with "'D:\Claude' is not recognized". Quote it.
const win = process.platform === 'win32';
const res = spawnSync(win ? `"${wrapper}"` : wrapper, args, {
  cwd: ANDROID,
  stdio: 'inherit',
  shell: win,
});

if (res.error) {
  console.error(`\nCould not start Gradle: ${res.error.message}\n`);
  process.exit(1);
}
process.exit(res.status === null ? 1 : res.status);
