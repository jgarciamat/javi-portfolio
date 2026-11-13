package com.jgarciamat.moneymanager;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONException;

/** Bridge between the web app and {@link NotificationCaptureService}. */
@CapacitorPlugin(name = "NotificationCapture")
public class NotificationCapturePlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(NotificationCaptureService.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
            "listenerEnabled",
            NotificationManagerCompat.getEnabledListenerPackages(getContext())
                .contains(getContext().getPackageName())
        );
        result.put("enabled", prefs().getBoolean(NotificationCaptureService.KEY_ENABLED, false));
        call.resolve(result);
    }

    /** Opens the system screen where the person gives the app access to notifications. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Set<String> packages = new HashSet<>();
        JSArray list = call.getArray("packages");
        if (list != null) {
            try {
                for (String name : list.<String>toList()) packages.add(name);
            } catch (JSONException e) {
                call.reject("Invalid packages");
                return;
            }
        }
        SharedPreferences.Editor editor = prefs().edit();
        editor.putBoolean(NotificationCaptureService.KEY_ENABLED, enabled);
        editor.putStringSet(NotificationCaptureService.KEY_PACKAGES, packages);
        // The notices: older versions of the app do not send them and keep the daily one.
        String alert = call.getString("alert");
        if (alert != null) editor.putString(CaptureAlerts.KEY_ALERT, alert);
        JSObject texts = call.getObject("texts");
        if (texts != null) editor.putString(CaptureAlerts.KEY_TEXTS, texts.toString());
        // Turning it off also forgets what was waiting.
        if (!enabled) {
            editor.remove(NotificationCaptureService.KEY_PENDING);
            editor.remove(CaptureAlerts.KEY_DETECTED);
            editor.remove(CaptureAlerts.KEY_WAITING);
        }
        editor.apply();
        if (!enabled || !"daily".equals(prefs().getString(CaptureAlerts.KEY_ALERT, "daily"))) {
            CaptureAlerts.clear(getContext());
        }
        call.resolve();
    }

    /** How many payments wait in «Para revisar»: tonight's reminder is planned while some wait. */
    @PluginMethod
    public void review(PluginCall call) {
        int waiting = Math.max(0, call.getInt("waiting", 0));
        SharedPreferences prefs = prefs();
        prefs.edit().putInt(CaptureAlerts.KEY_WAITING, waiting).apply();
        boolean daily = "daily".equals(prefs.getString(CaptureAlerts.KEY_ALERT, "daily"));
        if (CaptureAlerts.waiting(prefs) == 0) CaptureAlerts.clear(getContext());
        else if (daily && prefs.getBoolean(NotificationCaptureService.KEY_ENABLED, false)) {
            CaptureAlerts.scheduleReminder(getContext());
        }
        call.resolve();
    }

    /** The notifications kept so far; they are removed from the service. */
    @PluginMethod
    public void drain(PluginCall call) {
        JSObject result = new JSObject();
        synchronized (NotificationCaptureService.LOCK) {
            SharedPreferences prefs = prefs();
            String raw = prefs.getString(NotificationCaptureService.KEY_PENDING, "[]");
            // The app counts them from now on (it says how many wait with review()).
            prefs.edit().remove(NotificationCaptureService.KEY_PENDING).remove(CaptureAlerts.KEY_DETECTED).apply();
            try {
                result.put("notifications", new JSArray(raw));
            } catch (JSONException e) {
                result.put("notifications", new JSArray());
            }
        }
        CaptureAlerts.dismiss(getContext());
        call.resolve(result);
    }
}
