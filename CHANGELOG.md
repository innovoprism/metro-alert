# Changelog

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
