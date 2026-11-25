package com.metroalert.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.core.app.NotificationCompat;

/**
 * The wake-up alarm, rung like a clock alarm: a foreground service loops the alarm tune on the
 * ALARM volume (works on silent), vibrates continuously, turns the screen on and opens the alarm
 * screen over the lock screen. It keeps ringing until "I'm getting off" (or 5 minutes), whether the
 * app is open, in the background or the phone is locked.
 */
public class AlarmService extends Service {
    public static final String ACTION_START = "com.metroalert.app.ALARM_START";
    public static final String ACTION_STOP = "com.metroalert.app.ALARM_STOP";
    static final String CHANNEL = "alarm_ringing";
    public static volatile boolean ringing = false;

    private MediaPlayer player;
    private int savedVolume = -1;
    private PowerManager.WakeLock cpuLock, screenLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoStop = this::stopSelfNow;

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent i, int flags, int startId) {
        if (i == null || ACTION_STOP.equals(i.getAction())) { stopSelfNow(); return START_NOT_STICKY; }
        String title = i.getStringExtra("title"), body = i.getStringExtra("body"), tune = i.getStringExtra("tune");
        boolean sound = i.getBooleanExtra("sound", true);
        Notification n = buildNotification(this, title, body);
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(AlarmReceiver.NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(AlarmReceiver.NOTIF_ID, n);
        } catch (Exception e) {
            // could not run as a foreground service: fall back to the repeating alarm notification
            AlarmReceiver.ringNotificationOnly(this, title, body, tune, sound);
            stopSelf();
            return START_NOT_STICKY;
        }
        stopMedia();
        ringing = true;
        AlarmReceiver.ringing = true;
        AlarmReceiver.lastRung = System.currentTimeMillis();
        wakeUp();
        vibrate();
        if (sound) playTune(tune);
        handler.removeCallbacks(autoStop);
        handler.postDelayed(autoStop, 5 * 60 * 1000L);
        return START_NOT_STICKY;
    }

    static Notification buildNotification(Context ctx, String title, String body) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Alarm ringing", NotificationManager.IMPORTANCE_HIGH);
                ch.setSound(null, null);              // the service plays the sound itself
                ch.enableVibration(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                ch.setBypassDnd(true);
                nm.createNotificationChannel(ch);
            }
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open == null) open = new Intent();
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("metroAlarm", true);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent full = PendingIntent.getActivity(ctx, 41, open, fl);
        PendingIntent stop = PendingIntent.getBroadcast(ctx, 42, new Intent(ctx, AlarmReceiver.class).setAction(AlarmReceiver.ACTION_STOP), fl);
        return new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title != null ? title : "Your stop is coming up!")
                .setContentText(body != null ? body : "Get ready to exit.")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(full, true)
                .setContentIntent(full)
                .setOngoing(true)
                .setAutoCancel(false)
                .addAction(0, "I'm getting off", stop)
                .build();
    }

    @SuppressWarnings("deprecation")
    private void wakeUp() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            cpuLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MetroAlert:ring");
            cpuLock.acquire(5 * 60 * 1000L + 5000);
            // turn the screen on, like a clock alarm
            screenLock = pm.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP, "MetroAlert:screen");
            screenLock.acquire(30 * 1000L);
        } catch (Exception ignored) { }
    }

    private Vibrator vibrator() {
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        }
        return (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    }

    private void vibrate() {
        long[] pattern = {0, 1200, 300};
        Vibrator v = vibrator();
        if (v == null || !v.hasVibrator()) return;
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

    private void playTune(String tune) {
        AudioAttributes attrs = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM), cur = am.getStreamVolume(AudioManager.STREAM_ALARM);
            int want = (int) Math.ceil(max * 0.8);
            if (cur < want) { savedVolume = cur; am.setStreamVolume(AudioManager.STREAM_ALARM, want, 0); }
        } catch (Exception ignored) { }
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(attrs);
            int res = 0;
            if (tune != null && !tune.isEmpty() && !"system".equals(tune)) {
                String base = tune.substring(tune.lastIndexOf('/') + 1);
                if (base.contains(".")) base = base.substring(0, base.lastIndexOf('.'));
                res = getResources().getIdentifier("tune_" + base, "raw", getPackageName());
            }
            if (res != 0) {
                AssetFileDescriptor fd = getResources().openRawResourceFd(res);
                player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
                fd.close();
            } else {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                player.setDataSource(this, uri);
            }
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            if (player != null) { try { player.release(); } catch (Exception ignored) { } player = null; }
        }
    }

    private void stopMedia() {
        handler.removeCallbacks(autoStop);
        if (player != null) { try { player.stop(); player.release(); } catch (Exception ignored) { } player = null; }
        Vibrator v = vibrator();
        if (v != null) v.cancel();
        if (savedVolume >= 0) {
            try { ((AudioManager) getSystemService(Context.AUDIO_SERVICE)).setStreamVolume(AudioManager.STREAM_ALARM, savedVolume, 0); } catch (Exception ignored) { }
            savedVolume = -1;
        }
        if (cpuLock != null && cpuLock.isHeld()) { try { cpuLock.release(); } catch (Exception ignored) { } }
        if (screenLock != null && screenLock.isHeld()) { try { screenLock.release(); } catch (Exception ignored) { } }
        cpuLock = null; screenLock = null;
    }

    private void stopSelfNow() {
        stopMedia();
        ringing = false;
        AlarmReceiver.ringing = false;
        try { if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true); } catch (Exception ignored) { }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopMedia();
        ringing = false;
        AlarmReceiver.ringing = false;
        super.onDestroy();
    }
}
