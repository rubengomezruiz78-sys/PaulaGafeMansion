# Paula, Gafe y el misterio de la mansión encantada

Carpeta de trabajo **propia e independiente** para compilar el APK de Android del
juego. No depende de la carpeta original de ChatGPT
(`Documents\Codex\2026-07-22\q`): aquí hay una copia limpia del código fuente y su
propia cadena de compilación.

## Qué es

Aventura gráfica point-and-click 2D (React) empaquetada en un WebView Android
(`com.paulaygafe.mansion`). El juego es 100% cliente y funciona offline. La voz
usa el reconocimiento nativo de Android (`SpeechRecognizer`, es-ES) a través de un
puente JS (`AndroidVoice`), con teclado siempre como alternativa.

## Estructura

| Ruta | Qué es |
|------|--------|
| `app/MansionGame.tsx` | Todo el juego (componente React). **Aquí se edita el contenido.** |
| `app/globals.css` | Estilos del juego. |
| `android-web/` | Punto de entrada Vite que monta el juego como app standalone. |
| `public/` | Imágenes, iconos, service worker, manifest. |
| `vite.android.config.ts` | Compila el juego a `android/app/src/main/assets/`. |
| `android/` | Proyecto Android (WebView) que genera el APK. |
| `android/app/src/main/java/.../MainActivity.java` | WebView + puente de voz nativo. |
| `android/keystore/paula-gafe-release.jks` | Clave de firma (no se sube a git). |
| `work/android-signing.properties` | Contraseñas de firma (no se sube a git). |
| `build-apk.ps1` | Compila juego web + APK firmado de un clic. |

## Requisitos (ya presentes en este equipo)

- **Node.js** (para el bundle web).
- **JDK 17+** — se usa el que trae Android Studio (`...\Android Studio\jbr`).
- **Android SDK** — `C:\Users\ruben\AppData\Local\Android\Sdk` (ver `android/local.properties`).
- **Gradle** — incluido vía wrapper (`android/gradlew`); no hace falta instalarlo aparte.

## Compilar el APK

```powershell
npm install            # solo la primera vez
powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
```

Resultado: `Paula-Gafe-Mansion-release.apk` en la raíz (≈35 MB, firmado).

### Pasos por separado

```powershell
npm run build:apk-web                       # 1) juego web -> android/.../assets
cd android; .\gradlew.bat assembleRelease   # 2) APK firmado
```
El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

## Iterar el juego rápido (sin recompilar el APK)

```powershell
npm run dev:web        # servidor de desarrollo con recarga en caliente
```

## Instalar en la tablet

```powershell
$adb = "C:\Users\ruben\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb install -r .\Paula-Gafe-Mansion-release.apk
```

## Actualizaciones automáticas (OTA) — desde la v2.3.0

La tablet no necesita reinstalar el APK para recibir cambios del juego web:

1. Se sube un cambio a `master` en GitHub.
2. El workflow **Actualización OTA** (`.github/workflows/ota.yml`) pasa las pruebas,
   compila el juego, lo empaqueta (`juego-v<N>.zip` + `manifest.json` con su
   SHA-256) y lo publica en Firebase Hosting (`https://<sitio>.web.app/mansion/`).
3. Al abrir el juego, la app (`Actualizador.java`) lo descarga en segundo plano,
   lo verifica y lo usa en el siguiente arranque.

`<N>` es el número de commits de la rama. Si un cambio necesita algo nuevo en la
parte Android (Java), sube `versionCode` y `MIN_APK` en el workflow: las tablets
con un APK anterior no instalarán esa actualización hasta tener el APK nuevo.

**Configuración:** proyecto de Firebase `paula-gafe`, sitio de Hosting `paula-mansion`
(manifiesto en `https://paula-mansion.web.app/mansion/manifest.json`, también en
`android/app/src/main/res/values/ota.xml`). Solo hace falta el secreto del
repositorio `FIREBASE_SERVICE_ACCOUNT` (clave JSON de una cuenta de servicio);
sin él, todo se comprueba igual pero no se publica.
Opcional: secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD` para que GitHub genere también el APK
firmado con la clave de verdad.

## Notas

- App independiente de Google Play; se instala como APK. `versionCode`/`versionName`
  están en `android/app/build.gradle`: súbelos en cada versión nueva.
- La firma es la misma que la del APK v1.0 original, así que las actualizaciones se
  instalan encima sin desinstalar.
