package com.jgarciamat.moneymanager;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NotificationCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
