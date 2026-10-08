#!/usr/bin/env node
/* The Android wrapper says a handful of things the JavaScript battery cannot
   see, and one of them is what the player looks at first.

   The launch screen is the app's face for the second before the game paints,
   and it is set in XML that nothing else reads. It was WHITE: the theme
   inherits androidx Theme.SplashScreen, whose values-v31 maps the platform
   attribute onto the compat one and leaves the compat one at
   ?android:colorBackground -- which resolves, through
   Base.Theme.SplashScreen.DayNight, to the LIGHT theme. A white flash into a
   dark teal game.

   Fixing it puts the colour in a fourth place. It is already in
   capacitor.config.json for the WebView, in index.html for the letterbox
   round the canvas, and painted into the splash art; none of the four can
   read the others. So they are checked against each other here, and this runs
   as part of npm run sync -- the same command that copies the game into www,
   so it cannot be forgotten before a build.

   Run on its own:  node scripts/check-android.js  */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const fails = [];
const say = (what, got, want, where) => {
  if (got !== want) fails.push(what + ': ' + (got === null ? 'not found' : got)
    + ', expected ' + want + (where ? '  (' + where + ')' : ''));
};

/* The colour the game opens in, taken from the WebView's own setting, because
   that is the one the running app actually shows. */
const cap = JSON.parse(read('capacitor.config.json'));
const want = String((cap.android && cap.android.backgroundColor) || '').toLowerCase();
if (!/^#[0-9a-f]{6}$/.test(want)) {
  fails.push('capacitor.config.json has no android.backgroundColor to check the rest against');
} else {
  const styles = read('android/app/src/main/res/values/styles.xml');
  const launch = /<style name="AppTheme.NoActionBarLaunch"[\s\S]*?<\/style>/.exec(styles);
  if (!launch) fails.push('styles.xml has no AppTheme.NoActionBarLaunch to launch with');
  else {
    const attr = /<item name="windowSplashScreenBackground">([^<]+)<\/item>/.exec(launch[0]);
    if (!attr) fails.push('the launch theme does not set windowSplashScreenBackground, '
      + 'so Android 12 and up opens the app in ?android:colorBackground -- white');
    else {
      const ref = attr[1].trim();
      const named = /^@color\/(\w+)$/.exec(ref);
      let colour = named ? null : ref.toLowerCase();
      if (named) {
        const colours = read('android/app/src/main/res/values/colors.xml');
        const m = new RegExp('<color name="' + named[1] + '">([^<]+)</color>').exec(colours);
        colour = m ? m[1].trim().toLowerCase() : null;
        if (!m) fails.push('the launch theme points at @color/' + named[1] + ', which colors.xml does not define');
      }
      if (colour) say('the launch screen colour', colour, want, 'styles.xml + colors.xml');
    }
  }

  const html = read('index.html');
  const bg = /background:(#[0-9a-fA-F]{6})/.exec(html);
  say('the page background', bg ? bg[1].toLowerCase() : null, want, 'index.html');
}

/* The splash images that are never drawn.

   capacitor-assets generates twenty-six of them and points the launch theme
   at them with android:background -- which is not where a window gets its
   background from, so they were shown on no version of Android. They were
   5.51 MB on disk and 47% of a 10.78 MB debug APK. Running npm run assets
   brings both back without a word, so the build stops here instead. */
const splashes = [];
const res = path.join(root, 'android/app/src/main/res');
for (const dir of fs.readdirSync(res)) {
  const f = path.join(res, dir, 'splash.png');
  if (fs.existsSync(f)) splashes.push({ dir, bytes: fs.statSync(f).size });
}
if (splashes.length) {
  const mb = (splashes.reduce((a2, s2) => a2 + s2.bytes, 0) / 1048576).toFixed(2);
  fails.push(splashes.length + ' splash images are back (' + mb + ' MB) -- capacitor-assets regenerates them,'
    + ' and nothing draws them. Delete res/drawable*/splash.png; the launch colour is'
    + ' windowSplashScreenBackground, set above');
}
/* Written without escapes on purpose: backslashes have been eaten three times
   now on the way into a file, and a pattern that quietly stops matching turns
   a guard into something that always passes. [^] is any character, newlines
   included, so the comment above does not count as a reference. */
const themeCode = read('android/app/src/main/res/values/styles.xml')
  .replace(new RegExp('<!--[^]*?-->', 'g'), '');
if (themeCode.includes('@drawable' + '/' + 'splash'))
  fails.push('the launch theme points at @drawable/splash again -- android:background is not a window'
    + ' background, so it would ship the images without ever showing them');

/* What actually gets packaged.

   The APK is built from www/, and www/ is filled by a script with a list of
   files typed into it. Nothing has ever checked that the list is complete or
   that the copies are current, which leaves two ways to ship a broken game
   with every other check in this project passing.

   A stale copy is the first. "Editing game.js and running a Gradle build is
   not enough" is the comment at the top of sync-www.js, and it cost two
   build cycles on another project before it was learned. npm run sync copies
   first and so cannot be stale -- but a build started from Android Studio, or
   a bare cap sync, does not run it, and then the phone gets yesterday.

   A missing one is the second, and it is worse because it is silent. The page
   asks for what it needs by name; a name the list does not carry resolves to
   nothing, and a WebView with no script in it is a blank screen with no error
   anywhere a developer would look.

   So: everything the shipped page asks for is in www/, everything in www/
   matches the copy it came from, and nothing reaches outside it -- an
   absolute path or a ../ works against a dev server rooted at the repository
   and does not work in an APK rooted at www/. */
{
  const www = path.join(root, 'www');
  if (!fs.existsSync(www)) {
    fails.push('there is no www/ at all, so there is nothing to package -- run npm run sync:www');
  } else {
    /* Current. Compared byte for byte against what it was copied from. */
    for (const name of ['index.html', 'game.js']) {
      const from = path.join(root, name), to = path.join(www, name);
      if (!fs.existsSync(to)) { fails.push(name + ' is missing from www/, so the APK ships without it');
        continue; }
      if (!fs.readFileSync(from).equals(fs.readFileSync(to)))
        fails.push('www/' + name + ' is not the ' + name + ' in this folder -- the APK would ship an older game. Run npm run sync:www');
    }
    /* Complete. Every name the page asks for is a file that is there. */
    const page = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
    const refs = [...page.matchAll(new RegExp('(?:src|href)="([^"]+)"', 'g'))].map(m => m[1]);
    if (!refs.length) fails.push('the shipped page asks for nothing at all, which cannot be right');
    for (const r of refs) {
      if (/^(https?:|data:|#)/.test(r)) continue;          // not ours to find
      if (r.startsWith('/') || r.includes('..'))
        fails.push('the shipped page reaches outside www/ for ' + r + ', which works against a dev server and not inside an APK');
      else if (!fs.existsSync(path.join(www, r)))
        fails.push('the shipped page asks for ' + r + ' and www/ does not have it, so the phone gets a blank screen');
    }
    /* And the pictures, which the game asks for by name at run time rather
       than through the page, so nothing above would miss one. */
    const from = path.join(root, 'art'), to = path.join(www, 'art');
    if (fs.existsSync(from)) {
      const want = fs.readdirSync(from, { withFileTypes: true })
        .filter(e => e.isFile() && !e.name.endsWith('.md')).map(e => e.name);
      const have = new Set(fs.existsSync(to) ? fs.readdirSync(to) : []);
      const lost = want.filter(n => !have.has(n));
      if (lost.length)
        fails.push(lost.length + ' of the ' + want.length + ' pictures are not in www/art/ (' +
          lost.slice(0, 4).join(', ') + (lost.length > 4 ? ', ...' : '') + '), and a missing one is drawn as a plain shape with no error anywhere');
    }
  }
}

/* And the wrapper's own settings, which are easy to lose to a cap sync. */
const man = read('android/app/src/main/AndroidManifest.xml');
if (!/android:screenOrientation="portrait"/.test(man))
  fails.push('the activity is no longer locked to portrait, which the whole layout assumes');

if (fails.length) {
  console.error('android/  ' + fails.length + ' problem' + (fails.length > 1 ? 's' : '') + ':');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('android/  launch screen ' + want + ', portrait locked, www/ current and complete');
