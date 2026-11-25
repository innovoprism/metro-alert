package com.metroalert.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * Background wake-up alarm that does not depend on the app's screen being alive:
 *  - ring(): an "insistent" alarm notification. Android repeats its sound and vibration until
 *    "I'm getting off" is tapped, and opens the alarm screen over the lock screen.
 *  - schedule(): Android's AlarmManager rings it at a set time (timetable backup), even if the
 *    app is asleep or was closed by the system.
 */
public class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_RING = "com.metroalert.app.RING_ALARM";
    public static final String ACTION_STOP = "com.metroalert.app.STOP_ALARM";
    public static final int NOTIF_ID = 4242;
    public static volatile boolean ringing = false;
    public static volatile long lastDismissed = 0;
    public static volatile long lastRung = 0;
    private static final long[] PATTERN = {0, 1200, 300, 1200, 300, 1200, 300};

    @Override
    public void onReceive(Context ctx, Intent i) {
        if (ACTION_STOP.equals(i.getAction())) {
            stopRing(ctx);
            lastDismissed = System.currentTimeMillis();
            AlarmVibePlugin.stopFromOutside();
        } else if (ACTION_RING.equals(i.getAction())) {
            // fired by AlarmManager.setAlarmClock: Android allows starting the ringing service from here
            startService(ctx, i.getStringExtra("title"), i.getStringExtra("body"), i.getStringExtra("tune"), i.getBooleanExtra("sound", true), true);
        }
    }

    private static String channel(Context ctx, String tune, boolean sound) {
        String id = sound ? "wake_" + tune : "wake_vibrate";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(id) == null) {
                NotificationChannel ch = new NotificationChannel(id,
                        sound ? "Wake-up alarm (" + tune + ")" : "Wake-up alarm (vibrate only)", NotificationManager.IMPORTANCE_HIGH);
                ch.enableVibration(true);
                ch.setVibrationPattern(PATTERN);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                ch.setBypassDnd(true);
                if (sound) {
                    int res = ctx.getResources().getIdentifier("tune_" + tune, "raw", ctx.getPackageName());
                    Uri uri = res != 0 ? Uri.parse("android.resource://" + ctx.getPackageName() + "/" + res)
                                       : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    ch.setSound(uri, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                } else {
                    ch.setSound(null, null);
                }
                nm.createNotificationChannel(ch);
            }
        }
        return id;
    }

    /** Ring now: the foreground alarm service (loops sound + vibration, screen on, alarm screen). */
    public static void ring(Context ctx, String title, String body, String tune, boolean sound) {
        startService(ctx, title, body, tune, sound, false);
    }

    static void startService(Context ctx, String title, String body, String tune, boolean sound, boolean fromAlarm) {
        Intent s = new Intent(ctx, AlarmService.class).setAction(AlarmService.ACTION_START)
                .putExtra("title", title).putExtra("body", body).putExtra("tune", tune).putExtra("sound", sound);
        try {
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(s); else ctx.startService(s);
            ringing = true;
            lastRung = System.currentTimeMillis();
        } catch (Exception e) {
            // Android 12+ blocks starting it from the background; an alarm-clock alarm 0.3 s from now is allowed to
            if (!fromAlarm && scheduleAt(ctx, System.currentTimeMillis() + 300, title, body, tune, sound, 44)) return;
            ringNotificationOnly(ctx, title, body, tune, sound);
        }
    }

    /** Fallback: the repeating ("insistent") alarm notification. */
    static void ringNotificationOnly(Context ctx, String title, String body, String tune, boolean sound) {
        if (tune == null || tune.isEmpty()) tune = "classic";
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open == null) open = new Intent();
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("metroAlarm", true);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent full = PendingIntent.getActivity(ctx, 41, open, fl);
        PendingIntent stop = PendingIntent.getBroadcast(ctx, 42, new Intent(ctx, AlarmReceiver.class).setAction(ACTION_STOP), fl);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, channel(ctx, tune, sound))
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
                .setVibrate(PATTERN)
                .addAction(0, "I'm getting off", stop);
        if (sound && Build.VERSION.SDK_INT < 26) b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;      // repeat sound + vibration until cancelled
        try {
            ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).notify(NOTIF_ID, n);
            ringing = true;
            lastRung = System.currentTimeMillis();
        } catch (SecurityException ignored) { }
    }

    public static void stopRing(Context ctx) {
        try { ctx.stopService(new Intent(ctx, AlarmService.class)); } catch (Exception ignored) { }
        AlarmService.ringing = false;
        try { ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).cancel(schedulePi(ctx, null, 44)); } catch (Exception ignored) { }
        try { ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(NOTIF_ID); } catch (Exception ignored) { }
        ringing = false;
    }

    private static PendingIntent schedulePi(Context ctx, Intent extras) { return schedulePi(ctx, extras, 43); }
    private static PendingIntent schedulePi(Context ctx, Intent extras, int code) {
        Intent i = new Intent(ctx, AlarmReceiver.class).setAction(ACTION_RING);
        if (extras != null) i.putExtras(extras);
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(ctx, code, i, fl);
    }

    public static void schedule(Context ctx, long at, String title, String body, String tune, boolean sound) {
        scheduleAt(ctx, at, title, body, tune, sound, 43);
    }

    /** setAlarmClock: Android's real alarm-clock alarm (exact, works in Doze, shows the alarm icon). */
    static boolean scheduleAt(Context ctx, long at, String title, String body, String tune, boolean sound, int code) {
        Intent ex = new Intent();
        ex.putExtra("title", title); ex.putExtra("body", body); ex.putExtra("tune", tune); ex.putExtra("sound", sound);
        PendingIntent pi = schedulePi(ctx, ex, code);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi); return false; }
            Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            PendingIntent show = PendingIntent.getActivity(ctx, 45, open != null ? open : new Intent(), fl);
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
            return true;
        } catch (Exception e) {
            try { am.set(AlarmManager.RTC_WAKEUP, at, pi); } catch (Exception ignored) { }
            return false;
        }
    }

    public static void cancelSchedule(Context ctx) {
        ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).cancel(schedulePi(ctx, null));
    }
}
