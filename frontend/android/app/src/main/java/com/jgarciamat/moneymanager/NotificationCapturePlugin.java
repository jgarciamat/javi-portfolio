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
        // Turning it off also forgets what was waiting.
        if (!enabled) editor.remove(NotificationCaptureService.KEY_PENDING);
        editor.apply();
        call.resolve();
    }

    /** The notifications kept so far; they are removed from the service. */
    @PluginMethod
    public void drain(PluginCall call) {
        JSObject result = new JSObject();
        synchronized (NotificationCaptureService.LOCK) {
            SharedPreferences prefs = prefs();
            String raw = prefs.getString(NotificationCaptureService.KEY_PENDING, "[]");
            prefs.edit().remove(NotificationCaptureService.KEY_PENDING).apply();
            try {
                result.put("notifications", new JSArray(raw));
            } catch (JSONException e) {
                result.put("notifications", new JSArray());
            }
        }
        call.resolve(result);
    }
}
