import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    // ─── App identity ─────────────────────────────────────────────────────────
    // appId must be a unique reverse-domain identifier.
    // Change "com.jgarciamat" to your own domain before publishing.
    appId: 'com.jgarciamat.moneymanager',
    appName: 'Money Manager',

    // ─── Web assets ───────────────────────────────────────────────────────────
    // Points to Vite's output directory so `cap sync` copies the latest build.
    webDir: 'dist',

    // ─── Server (development only) ────────────────────────────────────────────
    // Uncomment ONLY for local development with a real device.
    // MUST be commented out for Play Store builds.
    // server: {
    //     url: 'http://10.0.2.2:5173', // Android emulator → host loopback
    //     cleartext: true,             // Allow plain HTTP in dev (Android only)
    // },

    // ─── Android overrides ────────────────────────────────────────────────────
    android: {
        // Allows network requests to localhost during development
        allowMixedContent: true,
        // minSdkVersion is set in android/app/build.gradle → defaultConfig.minSdkVersion
    },

    // ─── iOS overrides ────────────────────────────────────────────────────────
    ios: {
        // contentInset controls how the web content is inset from safe areas
        contentInset: 'automatic',
    },

    // ─── Plugins ──────────────────────────────────────────────────────────────
    plugins: {
        // SplashScreen config — shown while the WebView loads on cold start
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0f172a', // matches theme_color in site.webmanifest
            showSpinner: false,
        },
    },
};

export default config;
