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

## Notas

- App independiente de Google Play; se instala como APK. `versionCode`/`versionName`
  están en `android/app/build.gradle`: súbelos en cada versión nueva.
- La firma es la misma que la del APK v1.0 original, así que las actualizaciones se
  instalan encima sin desinstalar.
