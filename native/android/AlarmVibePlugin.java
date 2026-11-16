package com.metroalert.app;

import android.content.Context;
import android.media.AudioAttributes;
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
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
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
        int maxSeconds = call.getInt("maxSeconds", 300);
        stopAll();

        // vibrate 1.2 s, pause 0.3 s, repeat forever
        long[] pattern = {0, 1200, 300};
        Vibrator v = vibrator();
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
        if (wakeLock != null && wakeLock.isHeld()) { try { wakeLock.release(); } catch (Exception ignored) { } }
        wakeLock = null;
    }

    @Override
    protected void handleOnDestroy() { stopAll(); }
}
