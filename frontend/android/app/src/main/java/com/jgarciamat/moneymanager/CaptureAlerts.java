package com.jgarciamat.moneymanager;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.text.Normalizer;
import java.util.Calendar;
import java.util.Locale;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The phone's notices of payments waiting in «Para revisar»: one as they are detected ("each"),
 * or one at 21:00 while some wait ("daily", the default). Their texts come from the app in the
 * person's language, and they never carry amounts or shops (also hidden on the lock screen).
 * A tap opens moneymanager://review.
 */
final class CaptureAlerts {

    static final String KEY_ALERT = "alert";
    static final String KEY_TEXTS = "alertTexts";
    /** Notifications that look like a payment, kept since the app last collected them. */
    static final String KEY_DETECTED = "detected";
    /** Payments the app has waiting in «Para revisar» (it tells after each change). */
    static final String KEY_WAITING = "waiting";

    private static final String CHANNEL = "capture";
    private static final int NOTICE_ID = 4201;
    private static final int REMINDER_HOUR = 21;

    /**
     * A first look at a notification of the bank apps: an amount with a currency and a payment
     * word, and nothing that says it is a code, a balance or a payment that did not happen. The app
     * reads it properly later; this only decides whether to tell the person now.
     */
    private static final Pattern AMOUNT = Pattern.compile("\\d\\s?(€|eur\\b|euros?\\b)|(€|eur\\b)\\s?\\d");
    private static final Pattern PAYMENT = Pattern.compile(
        "\\b(pago|pagado|pagaste|compra|cargo|adeudo|recibo|retirada|enviado|recibido|ingreso|abono|"
            + "nomina|devolucion|reembolso|payment|purchase|paid|spent|received|deposit)\\b"
    );
    private static final Pattern NOT_A_PAYMENT = Pattern.compile(
        "\\b(saldo|codigo|clave|verificacion|contrasena|pin|otp|oferta|promocion|limite|denegad[ao]s?|"
            + "rechazad[ao]s?|anulad[ao]s?|cancelad[ao]s?|no autorizad[ao]s?|no se ha podido|no se pudo|"
            + "pre-?autorizacion(es)?|pre-?autorizad[ao]s?|retencion(es)?|retenid[ao]s?|declined|rejected|"
            + "cancell?ed|pre-?authori[sz]ation|on hold)\\b"
    );

    private CaptureAlerts() {}

    static boolean looksLikePayment(String text) {
        String plain = Normalizer.normalize(text, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT);
        return AMOUNT.matcher(plain).find() && PAYMENT.matcher(plain).find() && !NOT_A_PAYMENT.matcher(plain).find();
    }

    /** A new notification that looks like a payment: tell now, or plan tonight's reminder. */
    static void onDetected(Context context, SharedPreferences prefs) {
        int detected = prefs.getInt(KEY_DETECTED, 0) + 1;
        prefs.edit().putInt(KEY_DETECTED, detected).apply();
        String alert = prefs.getString(KEY_ALERT, "daily");
        if ("each".equals(alert)) {
            int count = detected + prefs.getInt(KEY_WAITING, 0);
            JSONObject texts = texts(prefs);
            String title = count == 1
                ? texts.optString("eachTitle", "")
                : texts.optString("manyTitle", "").replace("{count}", String.valueOf(count));
            post(context, prefs, title, texts.optString("eachBody", ""));
        } else if ("daily".equals(alert)) {
            scheduleReminder(context);
        }
    }

    /** Payments waiting, as far as the phone knows (the app's and the ones not collected yet). */
    static int waiting(SharedPreferences prefs) {
        return prefs.getInt(KEY_DETECTED, 0) + prefs.getInt(KEY_WAITING, 0);
    }

    /** Tonight's reminder, when it is still due (21:00 has to be ahead and something waiting). */
    static void remind(Context context, SharedPreferences prefs) {
        if (!prefs.getBoolean(NotificationCaptureService.KEY_ENABLED, false)) return;
        if (!"daily".equals(prefs.getString(KEY_ALERT, "daily")) || waiting(prefs) == 0) return;
        JSONObject texts = texts(prefs);
        post(context, prefs, texts.optString("dailyTitle", ""), texts.optString("dailyBody", ""));
    }

    /** The next 21:00 (inexact, so no special permission): a single alarm, replaced each time. */
    static void scheduleReminder(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Calendar at = Calendar.getInstance();
        at.set(Calendar.HOUR_OF_DAY, REMINDER_HOUR);
        at.set(Calendar.MINUTE, 0);
        at.set(Calendar.SECOND, 0);
        at.set(Calendar.MILLISECOND, 0);
        if (at.getTimeInMillis() <= System.currentTimeMillis()) at.add(Calendar.DAY_OF_YEAR, 1);
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.getTimeInMillis(), reminderIntent(context));
    }

    /** Nothing waits any more (or the person turned it off): no reminder and no notice. */
    static void clear(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(reminderIntent(context));
        NotificationManagerCompat.from(context).cancel(NOTICE_ID);
    }

    /** The notice already shown, once the app is open (it shows them itself). */
    static void dismiss(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTICE_ID);
    }

    private static PendingIntent reminderIntent(Context context) {
        Intent intent = new Intent(context, CaptureReminderReceiver.class);
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static JSONObject texts(SharedPreferences prefs) {
        try {
            return new JSONObject(prefs.getString(KEY_TEXTS, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    private static void post(Context context, SharedPreferences prefs, String title, String body) {
        if (title.isEmpty()) return;
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return;
        }
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager system = context.getSystemService(NotificationManager.class);
            String name = texts(prefs).optString("channel", "Finanverso");
            system.createNotificationChannel(
                new NotificationChannel(CHANNEL, name, NotificationManager.IMPORTANCE_DEFAULT)
            );
        }
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("moneymanager://review"));
        open.setPackage(context.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(
            context,
            NOTICE_ID,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        // On a locked screen only the app name shows, unless the person allows private content.
        NotificationCompat.Builder hidden = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_capture)
            .setContentTitle(context.getString(R.string.app_name));
        NotificationCompat.Builder notice = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_capture)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(hidden.build());
        manager.notify(NOTICE_ID, notice.build());
    }
}
