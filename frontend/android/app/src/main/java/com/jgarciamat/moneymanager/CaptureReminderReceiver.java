package com.jgarciamat.moneymanager;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/** 21:00: the daily reminder of the payments waiting in «Para revisar», if any still wait. */
public class CaptureReminderReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences(NotificationCaptureService.PREFS, Context.MODE_PRIVATE);
        CaptureAlerts.remind(context, prefs);
    }
}
