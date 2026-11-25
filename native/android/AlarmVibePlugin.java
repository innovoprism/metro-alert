package com.metroalert.app;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Wake-up alarm: continuous vibration (and optionally the phone's alarm tone on loop)
 * until stop() is called. Uses the ALARM audio/vibration channel so it still works
 * when the phone is on silent, and keeps going while the screen is off.
 */
@CapacitorPlugin(name = "AlarmVibe")
public class AlarmVibePlugin extends Plugin {
    private Ringtone ringtone;
    private MediaPlayer player;
    private int savedAlarmVolume = -1;
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private static AlarmVibePlugin instance;

    @Override
    public void load() { instance = this; }

    /** "I'm getting off" on the notification: stop the in-app vibration/sound too */
    static void stopFromOutside() {
        AlarmVibePlugin p = instance;
        if (p != null) p.handler.post(p::stopAll);
    }

    @PluginMethod
    public void ring(PluginCall call) {
        AlarmReceiver.ring(getContext(), call.getString("title"), call.getString("body"),
                call.getString("tune", "classic"), call.getBoolean("sound", true));
        call.resolve();
    }

    @PluginMethod
    public void cancelRing(PluginCall call) {
        AlarmReceiver.stopRing(getContext());
        call.resolve();
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        long at = (long) (double) call.getDouble("at", 0.0);
        AlarmReceiver.schedule(getContext(), at, call.getString("title"), call.getString("body"),
                call.getString("tune", "classic"), call.getBoolean("sound", true));
        call.resolve();
    }

    @PluginMethod
    public void cancelSchedule(PluginCall call) {
        AlarmReceiver.cancelSchedule(getContext());
        call.resolve();
    }

    /** What the phone allows for a real alarm (Settings → "Alarm reliability"). */
    @PluginMethod
    public void checkAlarm(PluginCall call) {
        Context c = getContext();
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        boolean fsi = true, exact = true, battery = true, notif = true;
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 34) fsi = nm.canUseFullScreenIntent();
            if (Build.VERSION.SDK_INT >= 24) notif = nm.areNotificationsEnabled();
            if (Build.VERSION.SDK_INT >= 31) exact = ((android.app.AlarmManager) c.getSystemService(Context.ALARM_SERVICE)).canScheduleExactAlarms();
            if (Build.VERSION.SDK_INT >= 23) battery = ((PowerManager) c.getSystemService(Context.POWER_SERVICE)).isIgnoringBatteryOptimizations(c.getPackageName());
        } catch (Exception ignored) { }
        r.put("fullScreen", fsi); r.put("exactAlarm", exact); r.put("battery", battery); r.put("notifications", notif);
        call.resolve(r);
    }

    @PluginMethod
    public void openAlarmSetting(PluginCall call) {
        String which = call.getString("which", "app");
        Context c = getContext();
        Uri pkg = Uri.parse("package:" + c.getPackageName());
        android.content.Intent i;
        if ("fullScreen".equals(which) && Build.VERSION.SDK_INT >= 34) i = new android.content.Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", pkg);
        else if ("exactAlarm".equals(which) && Build.VERSION.SDK_INT >= 31) i = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pkg);
        else if ("battery".equals(which) && Build.VERSION.SDK_INT >= 23) i = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg);
        else if ("notifications".equals(which) && Build.VERSION.SDK_INT >= 26) i = new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        else i = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg);
        i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        try { c.startActivity(i); } catch (Exception e) {
            try { c.startActivity(new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, pkg).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { }
        }
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        r.put("ringing", AlarmReceiver.ringing || AlarmService.ringing);
        r.put("lastDismissed", AlarmReceiver.lastDismissed);
        r.put("lastRung", AlarmReceiver.lastRung);
        call.resolve(r);
    }
    private final Runnable autoStop = this::stopAll;
    private final Runnable keepRinging = new Runnable() {
        @Override public void run() {
            // Android < 9 cannot loop a Ringtone, so restart it when it ends
            if (ringtone != null && !ringtone.isPlaying()) ringtone.play();
            if (ringtone != null) handler.postDelayed(this, 1000);
        }
    };

    private Vibrator vibrator() {
        Context c = getContext();
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager vm = (VibratorManager) c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        }
        return (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        boolean sound = call.getBoolean("sound", true);
        String tune = call.getString("tune", "system");   // "system" = phone's alarm tone, else a file in the app (e.g. tunes/chime.wav)
        int maxSeconds = call.getInt("maxSeconds", 300);
        stopAll();

        // vibrate 1.2 s, pause 0.3 s, repeat forever
        long[] pattern = {0, 1200, 300};
        Vibrator v = call.getBoolean("vibrate", true) ? vibrator() : null;   // tune preview: sound only
        if (v != null && v.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= 33) {
                v.vibrate(VibrationEffect.createWaveform(pattern, 1),
                        new VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_ALARM).build());
            } else if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createWaveform(pattern, 1),
                        new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
            } else {
                v.vibrate(pattern, 1);
            }
        }

        // the alarm plays on the ALARM volume: if it is turned (almost) down, raise it while ringing
        if (sound) {
            try {
                AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
                int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM), cur = am.getStreamVolume(AudioManager.STREAM_ALARM);
                int want = (int) Math.ceil(max * 0.7);
                if (cur < want) { savedAlarmVolume = cur; am.setStreamVolume(AudioManager.STREAM_ALARM, want, 0); }
            } catch (Exception ignored) { }
        }
        if (sound && tune != null && !"system".equals(tune)) {
            try {
                // tunes are bundled uncompressed in res/raw as tune_<name> (see scripts/patch-native.js)
                String base = tune.substring(tune.lastIndexOf('/') + 1);
                if (base.contains(".")) base = base.substring(0, base.lastIndexOf('.'));
                int resId = getContext().getResources().getIdentifier("tune_" + base, "raw", getContext().getPackageName());
                AssetFileDescriptor fd = resId != 0 ? getContext().getResources().openRawResourceFd(resId)
                                                    : getContext().getAssets().openFd("public/" + tune);
                player = new MediaPlayer();
                player.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
                fd.close();
                player.setLooping(true);
                player.prepare();
                player.start();
                sound = false;          // custom tune is playing, skip the system tone
            } catch (Exception e) {
                if (player != null) { try { player.release(); } catch (Exception ignored) { } player = null; }
            }
        }
        if (sound) {
            try {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                ringtone = RingtoneManager.getRingtone(getContext(), uri);
                if (ringtone != null) {
                    ringtone.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                    if (Build.VERSION.SDK_INT >= 28) ringtone.setLooping(true);
                    ringtone.play();
                    handler.postDelayed(keepRinging, 1000);
                }
            } catch (Exception ignored) { }
        }

        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MetroAlert:alarm");
            wakeLock.acquire(maxSeconds * 1000L);
        } catch (Exception ignored) { }

        handler.postDelayed(autoStop, maxSeconds * 1000L);   // safety: never ring forever
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopAll();
        call.resolve();
    }

    private void stopAll() {
        handler.removeCallbacks(autoStop);
        handler.removeCallbacks(keepRinging);
        Vibrator v = vibrator();
        if (v != null) v.cancel();
        if (ringtone != null) { try { ringtone.stop(); } catch (Exception ignored) { } ringtone = null; }
        if (player != null) { try { player.stop(); player.release(); } catch (Exception ignored) { } player = null; }
        if (savedAlarmVolume >= 0) {
            try { ((AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE)).setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVolume, 0); } catch (Exception ignored) { }
            savedAlarmVolume = -1;
        }
        if (wakeLock != null && wakeLock.isHeld()) { try { wakeLock.release(); } catch (Exception ignored) { } }
        wakeLock = null;
    }

    @Override
    protected void handleOnDestroy() { stopAll(); }
}
