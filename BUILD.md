# Building the Android app

## Every build

```
npm run build:debug
```

That syncs the game into `www/`, runs `cap sync android`, and builds the APK.
The result lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Run it from a normal terminal, not from an agent session.** Gradle needs a
loopback socket to talk to its own daemon, and in an agent-launched process that
fails with `java.io.IOException: Unable to establish loopback connection` before
any compilation starts. It is not a sandbox or a permissions problem and there
is no flag that works around it — the same failure appeared on Gatestorm.

## Never edit `www/` by hand

It is deleted and rebuilt by `scripts/sync-www.js` on every build. Edit
`game.js`, `index.html` and `art/` at the repo root.

The reason it is chained into the build script rather than left as a step to
remember: the APK is built from `www/`, so a forgotten copy ships yesterday's
code and the bug you just fixed is still on the phone. That cost two build
cycles on Gatestorm before it was automated.

## Art

Drop a generated PNG into `art/`, then:

```
npm run art
```

It keeps your PNG as the master in `art/original/`, strips the background,
trims, resizes and writes the `.webp` the game loads. See `art/ASSETS.md`.

## Icon and launch screen

Generated from `resources/icon.png` and `resources/splash.png`:

```
npm run assets
```

Keep the launch image a flat background with artwork on it. A full-bleed
photographic one was 4 MB per density and 23 MB of generated resources; the flat
version is 0.23 MB and 7.7 MB for the whole set.

## For a Play release

1. Create your own keystore — this is yours to make, because it means choosing
   passwords, and losing it means never updating the app again.
2. Put the details in `android/keystore.properties`. It is gitignored, along
   with `*.jks` and `*.keystore`, and must stay that way.
3. `npm run build:release` produces the AAB Play wants.

`targetSdkVersion` is already 35 in `android/variables.gradle`. Gatestorm was
turned back for shipping under Play's minimum target; check the current minimum
before you submit, because it rises every year.
