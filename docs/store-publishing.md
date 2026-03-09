# 📱 Publicar Money Manager en tiendas de apps

La app es una **PWA (Progressive Web App)** empaquetada con [Capacitor](https://capacitorjs.com/)
para generar builds nativos de Android e iOS desde el mismo código React/Vite.

---

## Índice

1. [Requisitos previos](#requisitos-previos)
2. [Flujo de trabajo general](#flujo-de-trabajo-general)
3. [Google Play Store (Android)](#google-play-store-android)
4. [Apple App Store (iOS)](#apple-app-store-ios)
5. [Microsoft Store (Windows)](#microsoft-store-windows)
6. [Iconos y capturas necesarias](#iconos-y-capturas-necesarias)
7. [Checklist antes de publicar](#checklist-antes-de-publicar)

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | 18+ | |
| Android Studio | Ladybug (2024.2) | Para build Android |
| Xcode | 15+ | Solo macOS, para build iOS |
| Java JDK | 17+ | Requerido por Gradle |
| Cuenta Google Play | — | 25 USD pago único |
| Cuenta Apple Developer | — | 99 USD/año |

---

## Flujo de trabajo general

```
┌─────────────────┐
│  npm run build  │  ← Vite compila a dist/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  npx cap sync   │  ← Copia dist/ a android/ e ios/
└────────┬────────┘
         │
    ┌────┴─────┐
    ▼          ▼
Android       iOS
Studio      Xcode
    │          │
    ▼          ▼
  .aab       .ipa
    │          │
    ▼          ▼
Google     App Store
 Play      Connect
```

### Comandos disponibles

```bash
# Construir y abrir Android Studio
npm run build:android

# Construir y abrir Xcode
npm run build:ios

# Solo sincronizar sin abrir el IDE
npm run cap:sync

# Solo copiar assets (sin actualizar plugins)
npm run cap:copy
```

---

## Google Play Store (Android)

### 1. Configurar `capacitor.config.ts` para producción

Antes de generar el `.aab`, **elimina o comenta** el bloque `server` del `capacitor.config.ts`
para que la app cargue el `dist/` embebido en lugar de conectar al servidor de desarrollo:

```typescript
// ❌ Eliminar en producción:
server: {
  url: 'http://10.0.2.2:5173',
  cleartext: true,
},
```

### 2. Generar el build firmado

```bash
npm run build:android
# → Abre Android Studio
```

En Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Selecciona **Android App Bundle (.aab)** ← preferido por Google
3. Crea o selecciona un **keystore** (guárdalo en lugar seguro, sin subir a git)
4. Elige `release` como Build Variant
5. Haz clic en **Finish**

El `.aab` se genera en `android/app/build/outputs/bundle/release/`.

### 3. Crear la ficha en Google Play Console

1. Accede a [play.google.com/console](https://play.google.com/console)
2. **Crear aplicación** → introduce nombre, idioma, tipo (app), gratuita/pago
3. Rellena **Ficha de Play Store**:
   - Descripción corta (80 chars) y larga (4000 chars)
   - Capturas de pantalla: mínimo 2 de teléfono (ver [Iconos y capturas](#iconos-y-capturas-necesarias))
   - Icono de alta resolución: **512×512 px PNG**
   - Imagen de cabecera: **1024×500 px**
4. En **Versiones → Producción → Crear nueva versión**, sube el `.aab`
5. Rellena **Política de privacidad** (URL obligatoria)
6. En **Configuración de la app → Acceso a la app**: indica si requiere login y crea credenciales de prueba
7. Envía para revisión (~3 días para la primera publicación)

### 4. Actualizaciones

```bash
# 1. Incrementa versionCode en android/app/build.gradle
#    versionCode 2
#    versionName "1.1.0"

# 2. Genera nuevo .aab firmado con el mismo keystore
npm run build:android

# 3. Sube el .aab en Play Console → Producción → Nueva versión
```

---

## Apple App Store (iOS)

> Requiere macOS con Xcode 15+ y cuenta de Apple Developer activa.

### 1. Configurar `capacitor.config.ts` para producción

Igual que en Android, elimina el bloque `server` antes de generar el build.

### 2. Configurar el proyecto en Xcode

```bash
npm run build:ios
# → Abre Xcode
```

En Xcode:
1. Selecciona el target **App**
2. En **Signing & Capabilities**:
   - Marca **Automatically manage signing**
   - Selecciona tu **Team** (Apple Developer account)
   - Bundle Identifier: `com.jgarciamat.moneymanager` (debe coincidir con `capacitor.config.ts`)
3. En **General → Identity**:
   - Version: `1.0.0`
   - Build: `1` (incrementar en cada subida)

### 3. Generar el archivo `.ipa`

1. Conecta un dispositivo real o selecciona **Any iOS Device** como destino
2. **Product → Archive**
3. En el **Organizer** que se abre: **Distribute App → App Store Connect**
4. Sigue el asistente → genera y sube directamente a App Store Connect

### 4. Crear la ficha en App Store Connect

1. Accede a [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Mis Apps → +** → Nueva app → iOS
3. Rellena:
   - Nombre (30 chars máx)
   - Subtítulo (30 chars)
   - Descripción (4000 chars)
   - Palabras clave (100 chars)
   - Capturas: **6,5"** (iPhone 14 Pro Max) obligatorio, **12,9"** (iPad) recomendado
   - Icono: se toma del build (Assets.xcassets), no se sube por separado
4. Política de privacidad (URL obligatoria)
5. **Preguntas de privacidad**: declara qué datos recopila la app
6. En **Compilaciones**, selecciona el build subido desde Xcode
7. Envía para revisión (~24-48h para la primera publicación)

### 5. Actualizaciones

1. Incrementa el **Build number** en Xcode antes de archivar
2. Sube el nuevo archivo desde el Organizer
3. En App Store Connect, crea una nueva versión y selecciona el build

---

## Microsoft Store (Windows)

La Microsoft Store acepta PWAs directamente sin Capacitor, mediante el
[**PWA Builder**](https://www.pwabuilder.com/).

### 1. Generar el paquete MSIX con PWA Builder

1. Ve a [pwabuilder.com](https://www.pwabuilder.com)
2. Introduce la URL de tu PWA desplegada (ej. `https://moneymanager.tudominio.com`)
3. PWA Builder analiza el `site.webmanifest` y el Service Worker automáticamente
4. Haz clic en **Package for stores → Windows**
5. Descarga el paquete `.msix` / `.msixbundle`

### 2. Publicar en el Partner Center

1. Crea una cuenta en [partner.microsoft.com](https://partner.microsoft.com) (gratuito para individuos)
2. **Apps y juegos → Crear una nueva aplicación**
3. Reserva el nombre de la app
4. Sube el `.msixbundle`
5. Rellena la ficha: descripción, capturas (mínimo 1 de escritorio), icono 300×300
6. Envía para revisión (~3-5 días)

### 3. Requisitos del webmanifest para Microsoft Store

El `site.webmanifest` ya incluye todos los campos necesarios:
- `id` ✅
- `name` + `short_name` ✅
- `description` ✅
- `icons` con 512×512 ✅
- `screenshots` ✅
- `categories` ✅

---

## Iconos y capturas necesarias

### Iconos (ya disponibles en `public/`)

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon-192.png` | 192×192 | PWA / Android |
| `icon-512.png` | 512×512 | PWA / Google Play / Microsoft Store |
| `apple-touch-icon.png` | 180×180 | iOS home screen |

Para **Google Play** necesitarás además un icono de **512×512** sin transparencia (fondo sólido).
Para **App Store** los iconos van dentro del proyecto Xcode en `Assets.xcassets`.

### Capturas de pantalla

Crea la carpeta `frontend/public/screenshots/` y añade:

| Archivo | Tamaño | Tienda |
|---|---|---|
| `mobile-dashboard.png` | 390×844 | PWA (referenciado en webmanifest) |
| `mobile-transactions.png` | 390×844 | PWA |
| `play-phone-1.png` | mín. 320×568, máx. 3840×2160 | Google Play |
| `play-phone-2.png` | igual | Google Play (mín. 2) |
| `appstore-65inch.png` | 1290×2796 | App Store (iPhone 6,5") obligatorio |

---

## Checklist antes de publicar

### General
- [ ] URL de **política de privacidad** publicada y accesible
- [ ] El `appId` en `capacitor.config.ts` es único y tuyo (`com.tudominio.moneymanager`)
- [ ] Bloque `server` **eliminado** de `capacitor.config.ts` (solo dev)
- [ ] La app funciona sin conexión (Service Worker activo)
- [ ] No hay `console.log` sensibles en producción

### Android
- [ ] `versionCode` incrementado respecto a la versión anterior
- [ ] Keystore guardado en lugar seguro (fuera del repo)
- [ ] Build generado en modo `release`, no `debug`
- [ ] Probado en dispositivo físico o emulador

### iOS
- [ ] Bundle ID coincide con el registrado en App Store Connect
- [ ] Build number incrementado
- [ ] Probado en dispositivo físico (los simuladores no pueden subirse)
- [ ] Configurado **App Privacy** en App Store Connect

### Microsoft Store
- [ ] PWA desplegada en HTTPS con dominio propio
- [ ] Service Worker registrado y funcional en producción
- [ ] `site.webmanifest` accesible en la raíz del dominio
