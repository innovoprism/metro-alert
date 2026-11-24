# Changelog

## v2.0.0 (2026-11-24)
- **Fix: beeping right after Start.** If you started a trip already inside the alarm circle (or with a poor first GPS fix), the alarm could ring at once and keep going. Now each alarm only arms after a good fix shows you clearly outside its circle; the timetable backup alarm waits until the trip has settled (a minute and a few fixes); and the fallback beeps always stop with the alarm.
- **🚆 Etihad Rail:** Fujairah, Al Dhaid, Dubai Al Yalayis (walk about 400 m from Jumeirah Golf Estates Metro) and Abu Dhabi MBZ City, shown as a dashed line. Track a train trip with the ETA taken from the published timetable, a 2.5 km alarm distance, and a "next trains" board for every station (weekday and weekend timetables).
- **🧭 Go tab:** type any station, bus stop or place and get the best options from your location (or the map centre): Metro, bus, Etihad Rail and walking, each with the modes used, total time, arrival time and live bus and train times. Walking is always offered for trips under 3.5 km.
- **Arrival times at upcoming stops** while tracking (Metro, bus and train): tap "Upcoming stops & arrival times".
- **Bus stops on the map:** zoom in and every bus stop shows as a dot; tap one for the next buses arriving there. The bus board now says "Arrives at this stop".
- Station coordinates for Etihad Rail are approximate; the alarm distance for train trips is wide to allow for this.

## v1.9.0 (2026-11-24)
- **Alarm with the app in the background (Android):** the wake-up alarm is now a real alarm notification that repeats its sound and vibration until you tap "I'm getting off", opens the alarm screen over the lock screen, and works with the screen off. The timetable backup alarm is rung by Android itself, so it still goes off if the app was put to sleep.
- **iPhone in the background:** the alarm notification repeats every 5 seconds for 2 minutes (each one buzzes and plays the tune), then every 30 seconds. iOS doesn't allow apps to vibrate non-stop in the background.
- **🪙 Coins:** earn coins for opening the app each day, trips, waking up at your stop, planning journeys, sharing your ETA and helping learn train times (with daily limits), plus a welcome and sign-up bonus. Levels and your rank among all riders in Settings and Profile. Coins earned before signing up move to your account.
- **Admin page:** coins and level for every registered user, total coins earned, today's coins by reason, top riders without an account.
- Fix: the Stop button was invisible in dark mode.
- Fix: the speed in the box and in the status line now always show the same value.
- Reinstall the APK/IPA once for the alarm changes.

## v1.8.0 (2026-11-22)
- **🧭 How to get there (journey planner):** after choosing a destination, tap "How to get there" for up to 3 routes combining walking, buses and the Metro (fastest, fewer changes, more Metro / bus only). Each shows the total time, arrival time, every step, Metro frequency and the real next scheduled buses at the time you reach each stop. Night buses are only used at night, and the Metro's closing hours are respected.
- **Trips with changes:** "Start trip with alarms" wakes you at every stop where you change ("Change to Bus 20 at Rashidiya Bus Station") and at your final stop, then continues with the next part automatically.
- **Bus times in the route view:** opening a bus route shows the next buses at its stop nearest to you.
- **Live status before boarding:** "Go to InsuranceMarket to board the Red Line".
- **Share my ETA** (📤 while tracking), **dark mode** (Settings → Appearance: Auto / Light / Dark), **recent trips** row.
- Fix: tune previews play through the app's media player, so you can hear them even when the phone is on silent or the alarm volume is low. *iPhone: reinstall the app for this part.*

## v1.7.0 (2026-11-22)
- **Live train status:** "Waiting for the train", "Departing … accelerating", "On the way to …", "Arriving at …", "Stopped at … 0:25", "Arrived" – with the current speed. Departure is recognised within seconds, so the ETA reacts faster when the train leaves.
- **Bus times per stop:** "🕒 Next buses near me" in the Bus tab, and a 🕒 button on every bus stop, show the next departures of each route (RTA timetable, weekday/weekend). Bus trips include the wait for the next scheduled bus in the ETA.
- **Admin page:** list of registered users (name, email, sign-up date, last seen, devices and platforms, logged in now, trips, alarms) with search.
- Fix: tune previews no longer overlap on the web app; tap ■ to stop a preview.
- Fix (Android app): tunes play from the app's sound resources, and the alarm volume is raised while the alarm rings if it was turned down. Previews don't vibrate. *Reinstall the APK/IPA to get this part; everything else arrives as an in-app update.*

## v1.6.0 (2026-11-19)
- **Fix: the alarm kept going after "I'm getting off".** Tapping it right after the alarm started could leave the native alarm running; alarm notifications also kept playing their sound. Now everything stops at once: vibration, sound, repeat reminders and notifications on screen.
- **"I'm getting off" button on the notification**, so you can stop the alarm without opening the app.
- **Alarm tunes:** Classic beeps, Chime, Digital watch, Rising alert, Marimba, Pulse (and the phone's own alarm tone on Android), with a ▶ preview. The heads-up uses a short chime.
- **Settings screen** (⚙ button on the map): account, alert mode, tune, default wake-up and alarm distance, heads-up, map orientation, follow-me, saved stops, version and **Check for updates**.
- **Accounts (optional):** sign up / log in with email and password. Your saved stops are kept on your account and appear on all your phones. Profile shows your trips, alarms and saved stops; you can change your name, log out or delete the account.
- Needs a one-time reinstall (new native alarm player). Updates after this arrive in the app.

## v1.5.1 (2026-11-19)
- The apps are now connected to the Metro Alert server (metro-alert.innovoprism.workers.dev): user counts, learned train timings and update checks go through it.
- Arrives as an in-app update for v1.5.0 (no reinstall needed).

## v1.5.0 (2026-11-19)
- **Smarter ETA:** each stop-to-stop run follows a realistic speed profile (accelerate, cruise up to ~80 km/h, brake), so slow and fast parts of the ride no longer throw the estimate off. The app notices when the train stops at a station and when it departs, uses the real dwell time, and compares the time since departure with the profile to see whether this train is running late or early.
- **Waiting for the train:** when you start on the platform, the ETA includes the expected wait (Metro trains every 3-10 min depending on the hour, from the RTA timetable).
- **Learns from all riders:** every ride uploads its measured stop-to-stop times (anonymous) to the Metro Alert server. Times are learned separately for weekdays/weekends and time of day (early, morning peak, midday, evening peak, evening, night), and the app uses them instead of the timetable once at least 3 rides have been measured.
- **Own server:** user counts (total, daily/weekly/monthly active per platform, new users, app versions), trips and alarms are counted on your own server (Cloudflare Worker + database), with a stats page at /stats. The server also hosts the web app.
- **In-app updates:** the apps check for new versions. Phone apps download new versions over the air and use them on the next start; when a release needs a new app binary, Android offers the APK download and iPhone shows how to reinstall. The web app offers a one-tap reload.
- **Map no longer gets stuck:** the map doesn't move under your fingers while you drag or pinch-zoom, follow-me works in the phone apps before you press Start, and heading-up no longer jitters when standing still.
- Requires reinstalling the phone apps once (new update component). After this, most updates arrive automatically.

## v1.4.0 (2026-11-19)
- **Timetable ETA:** arrival time is estimated from the RTA timetable (stop-to-stop times including dwell at each station), the live distance to the next stop and your current speed. It learns from the ride: if the train runs late or early, the rest of the estimate adjusts. Shows the minutes left, the arrival clock time and a countdown to the next stop.
- **Works underground:** when GPS drops, the ETA keeps counting on the timetable and the alarm still rings on time ("GPS lost, by the RTA timetable...").
- **Background alarm:** the phone apps vibrate continuously and play the alarm sound even when the app is in the background or the screen is off (new native iOS alarm; Android already had one). Alarm notifications now carry the alarm sound and repeat every 30 s until dismissed. A timetable-timed backup notification is scheduled in case the phone pauses the app.
- **Alert setting:** choose "Vibrate + sound" or "Vibrate only".
- **Usage statistics:** anonymous counts of app opens, first installs, trips and alarms for web, Android and iOS (GoatCounter, set in `www/config.js`).
- Fix: the live panel (next stop, distance, ETA, speed) was not shown while tracking.

## v1.3.2 (2026-11-16)
- Fix: on first launch (and when tapping ◎) the map now zooms in and centres on you in the visible part of the map. Before, overlapping animations could leave you hidden behind the bottom panel (found in the iPhone Simulator test).

## v1.3.1 (2026-11-16)
- iOS app now built automatically (iPhone Simulator build + unsigned .ipa) and tested in the iPhone 17 Pro Max simulator.
- Phone apps: finding your location uses the app's own location service, so iOS no longer shows a second "localhost would like to use your location" prompt.

## v1.3.0 (2026-11-16)
- Continuous wake-up vibration: when the alarm goes off, the phone keeps vibrating (1.2 s buzz, 0.3 s pause) non-stop until you tap "I'm getting off" (safety stop after 5 minutes).
- Android app: vibration and the phone's own alarm tone run natively on the alarm channel, so they keep going with the screen off and also when the phone is on silent.

## v1.2.0 (2026-11-16)
- Map follows you while tracking and keeps you centred above the bottom panel. Drag the map to stop following; tap ◎ to re-centre.
- North up / Heading up button (compass). In Heading up, the map turns so your direction of travel points up.
- Your position shows as an arrow pointing the way you're moving.
- Version numbers on the app (shown at the bottom of the panel), offline cache, Android build (versionCode 10200) and iOS build, and on files: `metro-alert-v1.2.0.apk`, `metro-alert-v1.2.0-web.zip`.
- Android cloud build publishes a GitHub Release named after the version.

## v1.1.0 (2026-11-15)
- RTA Metro: Red Line (→ Life Pharmacy / → Expo 2020) and Green Line with current station names.
- RTA Bus: 156 routes by number, direction and ordered stop list; bus stop search.
- Alarm 1 or 2 stops early, "next stop · N stops to go" while riding.

## v1.0.0 (2026-11-15)
- GPS destination alarm with vibration, sound and notification. Web app, Android and iOS (Capacitor).
