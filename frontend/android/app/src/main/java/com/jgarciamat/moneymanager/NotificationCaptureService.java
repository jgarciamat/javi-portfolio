package com.jgarciamat.moneymanager;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.Collections;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Keeps the notifications of the bank and payment apps the person chose, so the app can suggest
 * the payments they contain. It only runs when the person gave access in the system settings and
 * turned the feature on; anything from other apps is ignored, and nothing leaves the phone from here.
 */
public class NotificationCaptureService extends NotificationListenerService {

    static final String PREFS = "mm_capture";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_PACKAGES = "packages";
    static final String KEY_PENDING = "pending";
    static final Object LOCK = new Object();
    private static final int MAX_PENDING = 50;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_ENABLED, false)) return;
        Set<String> packages = prefs.getStringSet(KEY_PACKAGES, Collections.<String>emptySet());
        if (!packages.contains(sbn.getPackageName())) return;

        Bundle extras = sbn.getNotification().extras;
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = extras.getCharSequence(Notification.EXTRA_TEXT);
        if (text == null) return;

        try {
            JSONObject item = new JSONObject();
            item.put("packageName", sbn.getPackageName());
            item.put("title", title == null ? "" : title.toString());
            item.put("text", text.toString());
            item.put("postedAt", sbn.getPostTime());
            synchronized (LOCK) {
                JSONArray list = new JSONArray(prefs.getString(KEY_PENDING, "[]"));
                list.put(item);
                // Keep the latest ones if the app is not opened for a long time.
                JSONArray kept = new JSONArray();
                for (int i = Math.max(0, list.length() - MAX_PENDING); i < list.length(); i++) {
                    kept.put(list.get(i));
                }
                prefs.edit().putString(KEY_PENDING, kept.toString()).apply();
            }
        } catch (JSONException ignored) {
            // A notification that cannot be stored is simply skipped.
        }
    }
}
