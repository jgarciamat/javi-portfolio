package com.jgarciamat.moneymanager;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Home-screen widget with two buttons: add an expense or an income. Each one opens the app
 * on the new-movement form through the moneymanager://add/... link.
 */
public class QuickAddWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);
            views.setOnClickPendingIntent(R.id.widget_expense, open(context, "expense", 1));
            views.setOnClickPendingIntent(R.id.widget_income, open(context, "income", 2));
            manager.updateAppWidget(id, views);
        }
    }

    private static PendingIntent open(Context context, String type, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("moneymanager://add/" + type));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
