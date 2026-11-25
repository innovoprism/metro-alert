# Metro Alert – Dubai Metro & Bus stop alarm

Pick your **RTA Metro station** (Red / Green Line) or your **bus number and stop**, press **Start**, and put your phone away. The phone **vibrates and plays an alarm** 1 or 2 stops before yours (or when you get close), and shows **"next stop · N stops to go"** while you ride.

One codebase (`www/`) runs as:

| Platform | How | Works with screen off? |
|---|---|---|
| Web app (PWA) | Host `www/` on any HTTPS site | No. Keep the screen on (the app holds it awake for you) |
| Android APK | Capacitor (GitHub Actions builds it for you) | **Yes**, runs as a background location service |
| iOS app | Capacitor + Xcode on a Mac | **Yes**, uses background location mode |

## Features
- **Metro tab:** Red Line (→ Life Pharmacy / → Expo 2020) and Green Line, all 53 stations in line order with current names (e.g. Garmin, Al Garhoud, Life Pharmacy, National Paints, e&). Old names still work in search, e.g. "ONPASSIVE" or "GGICO".
- **Bus tab:** type a route number (8, F12, C01, X28…) → choose a direction → tap your stop from the ordered stop list. You can also search any bus stop by name.
- **Map tab:** drop a pin anywhere (works for any place, not just stations).
- **One search bar** for stations, bus numbers, bus stops and places.
- **Wake me:** 2 stops early / 1 stop early / on approach, plus a distance alarm that is always on as a backup.
- **While riding:** next stop name and stops to go.
- **Map follows you** while tracking and keeps you centred above the panel. Drag to look around; tap ◎ to re-centre.
- **North up / Heading up** (compass button): in Heading up, the map turns so your direction of travel points up. Your position is an arrow.
- **Version** is shown at the bottom of the panel (e.g. `Metro Alert v1.3.0`).
- Alarm distance from 200 m to 3 km (default 600 m), shown as a red circle.
- Optional heads-up buzz at 2× the distance (orange circle), useful before underground stretches.
- Live distance, ETA, speed and a progress bar.
- Full-screen flashing alarm with **continuous vibration** (non-stop until you tap "I'm getting off", safety stop after 5 min), alarm sound and a system notification. In the Android app the vibration and the phone's alarm tone run natively, so they keep going with the screen off and on silent mode (code in `native/android/AlarmVibePlugin.java`).
- Saved places (⭐) for your regular stops.
- 🔔 button to test the alarm.
- Offline-ready: the app files are cached, and map tiles are cached as you view them.

---

## 1. Web app (fastest)
GPS only works on **https://** (or `localhost`).

- **Netlify Drop:** go to app.netlify.com/drop and drag the `www` folder (or unzip `metro-alert-vX.Y.Z-web.zip`) onto it. You get an https link right away.
- **GitHub Pages:** push this repo, then go to Settings → Pages → deploy from branch, folder `/www` (or copy `www/` to `docs/`).
- **Local test:** run `npm run serve`, then open http://localhost:8080.

On your phone, open the link, then **Add to Home Screen** (Safari: Share button → Add to Home Screen; Chrome: menu → Install app).

> Web limits: browsers pause GPS when the screen locks, so leave the app open. iPhone Safari cannot vibrate from a web page, and its silent switch mutes the alarm. Use the iOS app for both.

## Versions
The version lives in one place, `package.json`. To release a new one:
```bash
npm version patch     # 1.3.0 -> 1.3.1   (or: minor -> 1.4.0, major -> 2.0.0)
```
This stamps the new number into the app screen, the offline cache (so phones pick up the update), Android `versionCode`/`versionName` (1.3.1 → 10301), the iOS build number, and the file names: `metro-alert-v1.3.1.apk`, `metro-alert-v1.3.1-web.zip`. Add a line to `CHANGELOG.md` for each release.
Android only installs an update over an older build when the versionCode is higher, so always bump the version before building.

## 2. Android APK (no Android Studio needed)
1. Create a GitHub repository and upload this whole folder.
2. Open the **Actions** tab. The *Build Android APK* workflow runs automatically (or press **Run workflow**).
3. After about 5 minutes the APK appears in two places: the **Releases** section of the repo (`metro-alert-v1.3.0.apk`, tagged `v1.3.0`) and the workflow run's downloads.
4. Copy it to your phone, open it, and allow "Install unknown apps".
5. On first start, allow **Location → Allow all the time** (or "While using" plus the ongoing notification) and **Notifications**.

To build locally instead (needs Android Studio and JDK 21):
```bash
npm install
npm run android
npx cap open android   # then Build → Build APK(s)
```
For the Play Store you'll need a signed release build (Build → Generate Signed Bundle) and a Google Play developer account.

## 3. iOS app (needs a Mac with Xcode 16+)
```bash
npm install
npm run ios
npx cap open ios
```
In Xcode: select the **App** target → *Signing & Capabilities* → choose your Team (a free Apple ID works for your own phone). Then plug in your iPhone and press ▶ Run.
For the App Store / TestFlight you need an Apple Developer account ($99/year).

When the app asks, allow **Location: Always** and **Notifications**. Background location and audio are already set up by `scripts/patch-native.js`.

## After changing the web code
```bash
npm run sync      # copies www/ into the Android and iOS projects
```

## ETA (estimated arrival)
For Metro and bus routes the ETA is: time to the next stop (its distance ÷ your current speed, or the timetable when the train is stopped) + the RTA timetable time for every remaining stop, including dwell time at each station. Each finished stop-to-stop time is compared with the timetable, so a late or early train adjusts the rest of the estimate. Underground, without GPS, the ETA keeps counting on the timetable and the alarm still rings.

## Server (user counts, learned timings, web hosting)
The `server/` folder is a Cloudflare Worker with a D1 database (free plan is enough). It:
- counts users anonymously (random install id): total, active today / 7 / 30 days, new users, versions, per web / Android / iOS
- collects measured stop-to-stop times from rides and returns the learned times per time of day
- tells the apps about new versions (`/api/version`)
- hosts the web app itself, and a password-protected stats page at `/stats`

One-time setup:
1. Create a free account at https://dash.cloudflare.com/sign-up and open **Workers & Pages** once (this creates your `*.workers.dev` address).
2. Copy your **Account ID** (Workers & Pages page, right side).
3. **My Profile → API Tokens → Create Token →** template **Edit Cloudflare Workers**, add the permission **Account · D1 · Edit**, create it and copy the token.
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `CLOUDFLARE_API_TOKEN` (the token), `CLOUDFLARE_ACCOUNT_ID` (the ID)
   - `STATS_KEY`: a password of your choice for the stats page
5. **Actions → Deploy server (Cloudflare) → Run workflow.** The run summary shows the server address.
6. Put that address in `www/config.js` (`api: 'https://metro-alert.<you>.workers.dev'`) and push, so the phone apps use it.

Stats: open `https://metro-alert.<you>.workers.dev/stats` and enter your STATS_KEY.

## Site layout

`/` is the landing page (`server/src/landing.js`), `/app/` is the web app (files from `www/`), `/stats` the admin page, `/api/*` the API.

## Coins

Coins are given by the server only for a verified trip (`/api/trip/start` and `/api/trip/end`): it must end within 700 m of the stop (3 km for Etihad Rail), be at least 700 m long, take a believable time and show real movement from GPS. 10 coins + 2 per km, max 40, up to 4 a day. The admin page lists every trip and why it did or didn't earn coins.

## Accounts
Optional email + password accounts (server `/api/auth/*`, `/api/me`). Passwords are stored as salted PBKDF2-SHA256 hashes; 10 wrong passwords lock the account for 15 minutes. Saved stops sync between devices. There is no password-reset email yet (it needs an email-sending service). Collecting emails means you should publish a short privacy policy before listing the app in a store.

## Alarm tunes
`scripts/make-tunes.py` generates the tunes in `www/tunes/` (original synthesized sounds). Android copies them to `res/raw` for notification channels; iOS plays them from the app bundle.

## Updates
- **Web:** the app checks for a new version and offers a reload.
- **Phone apps:** new screens/logic (`www/`) are downloaded over the air and used on the next start. A release that changes native code must raise `nativeMin` in `package.json`; installed apps then offer the new APK (Android) or ask to reinstall (iPhone).

## Usage statistics (old GoatCounter option, replaced by the server)
1. Create a free account at https://www.goatcounter.com and add a site, e.g. code `metroalert`.
2. Put the code in `www/config.js`: `goatcounter: 'metroalert'`, then push (new APK/IPA builds automatically).
3. Open https://metroalert.goatcounter.com to see:
   - `/open/web`, `/open/android`, `/open/ios`: app opens and unique visitors per day, per platform
   - `install/<platform>`: first launches (new users)
   - `trip-metro/<platform>`, `trip-bus/...`, `alarm/<platform>`: trips started and alarms rung
Nothing personal is sent: no name, location, phone number or device ID. APK/IPA download counts are also on the GitHub Releases page.

## Transit data

Etihad Rail passenger stations and the published weekday/weekend timetable are in `scripts/rail.py` (writes `www/data/rail.json`). Update the timetable there when Etihad Rail changes it, then run `python3 scripts/rail.py`.
`www/data/transit.json` is built from RTA's official GTFS feed (the public timetable data RTA publishes on Dubai Pulse):
- **Metro:** stations and line order are up to date; renamed stations are listed in `scripts/build-transit.py` → `STATION_RENAMES` (latest: ONPASSIVE → Garmin, Sep 2026).
- **Bus:** 156 routes / 2,432 stops from RTA's 2021 feed, the newest copy that could be downloaded here. Some routes have changed since. To refresh, download the current GTFS from Dubai Pulse ("RTA Public Transports", free account) and run:
  ```bash
  python3 scripts/build-transit.py path/to/gtfs.zip
  npm run sync
  ```
When RTA renames a station again, add one line to `STATION_RENAMES` and re-run the script.

## Accuracy tips
- GPS is accurate on elevated or above-ground lines. **Underground, the signal drops**, so the app keeps your last position and fires the alarm as soon as the signal returns. On underground sections, set a larger distance (about 1–1.5 km, roughly one station ahead) and keep the heads-up buzz on.
- Put the pin on the station itself, not your final destination outside.

## Project layout
```
www/                  the app (HTML/JS/CSS, PWA manifest, service worker, icons, vendored Leaflet)
scripts/build-transit.py  builds www/data/transit.json from RTA GTFS
scripts/vendor.js     copies Leaflet + Capacitor core into www/vendor
scripts/patch-native.js  adds location/background/notification permissions to native projects
capacitor.config.json native app id/name (change appId before publishing)
.github/workflows/    cloud APK build
assets/icon.png       1024px icon used to generate native app icons
```
Maps © OpenStreetMap contributors. Search uses OpenStreetMap Nominatim (light personal use).
