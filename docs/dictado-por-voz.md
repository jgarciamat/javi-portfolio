# Dictado de gastos por voz

Botón de micrófono en «Registrar transacción rápida». El audio nunca sale del dispositivo hacia Finanverso: solo se usa el texto reconocido.

- Web/PWA: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) del navegador. Sin soporte (p. ej. Firefox) el botón se oculta.
- App Android/iOS (Capacitor): plugin `@capacitor-community/speech-recognition` (MIT, sin claves ni coste), que usa el reconocedor del sistema.
- Código: `frontend/src/modules/finances/application/hooks/useSpeechDictation.ts` (dos backends), `domain/voiceEntry.ts` (analizador) y `ui/components/QuickVoice.tsx`.
- Cabecera `Permissions-Policy` en `deploy/Caddyfile`: `microphone=(self)`.

## Pasos nativos reproducibles (Android)

1. `cd frontend && npm install` (el plugin está en `package.json`).
2. En `frontend/android/app/src/main/AndroidManifest.xml`: permiso `android.permission.RECORD_AUDIO` y, para Android 11+, `<queries><intent><action android:name="android.speech.RecognitionService"/></intent></queries>`.
3. `npm run build:android:prod` (aplica `scripts/patch-plugins.mjs`, que corrige el `proguard-android.txt` del plugin para AGP 9, y hace `npx cap sync android`).
4. Para un APK de prueba: `cd android && JAVA_HOME=<temurin-17> ./gradlew assembleDebug`.
5. Un AAB nuevo (versionCode superior) es necesario para que los usuarios reciban el micrófono.
