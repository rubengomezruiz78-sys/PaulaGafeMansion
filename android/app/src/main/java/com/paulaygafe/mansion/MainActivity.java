package com.paulaygafe.mansion;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Envoltorio del juego. Todo se sirve desde los assets del APK (no hay permiso
 * de Internet). Voz de los personajes con el motor de voz del sistema (se
 * eligen voces sin conexión) y, si Paula quiere, respuestas por micrófono
 * (se pide reconocimiento sin conexión).
 */
public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "paula.local";
    private static final int MICROPHONE_PERMISSION_REQUEST = 41;

    private WebView webView;
    private SpeechBridge speech;
    private VoiceBridge voice;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterImmersiveMode();
        // La pantalla no se apaga mientras Paula piensa un puzzle.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Los botones de volumen suben y bajan el sonido del juego (no el del timbre).
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF050608);
        configureWebView(webView);
        speech = new SpeechBridge();
        voice = new VoiceBridge();
        webView.addJavascriptInterface(speech, "AndroidTTS");
        webView.addJavascriptInterface(voice, "AndroidVoice");
        setContentView(webView);
        webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
    }

    // Al salir de la app (botón de inicio, otra app) el juego se pausa de verdad:
    // guarda la partida, calla el sonido y deja de gastar batería.
    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        if (speech != null) speech.stop();
        if (voice != null) voice.cancelListening();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        enterImmersiveMode();
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // Nada de zoom ni de menú/vibración al dejar el dedo apretado.
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        view.setLongClickable(false);
        view.setOnLongClickListener(v -> true);
        view.setHapticFeedbackEnabled(false);
        view.setOverScrollMode(View.OVER_SCROLL_NEVER);
        view.setWebViewClient(new LocalAssetClient(getAssets()));
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveMode();
    }

    // El juego ya decide que hace Atras en cada capa (cerrar puzzle, volver de sala,
    // salir en la portada), pero nadie llamaba a __onAndroidBack: toda esa navegacion
    // era codigo muerto. Interceptamos la tecla antes que el WebView para que llegue.
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() != KeyEvent.KEYCODE_BACK) return super.dispatchKeyEvent(event);
        if (event.getAction() == KeyEvent.ACTION_UP && event.getRepeatCount() == 0) askGameAboutBack();
        return true;
    }

    private void askGameAboutBack() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
            "(function(){try{return (window.__onAndroidBack&&window.__onAndroidBack())||'exit';}"
                + "catch(error){return 'exit';}})()",
            value -> {
                if (value == null || !value.contains("handled")) finish();
            }
        );
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MICROPHONE_PERMISSION_REQUEST) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) voice.beginListening();
        else voice.sendError("sin-permiso");
    }

    @Override
    protected void onDestroy() {
        if (speech != null) speech.shutdown();
        if (voice != null) voice.destroy();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidTTS");
            webView.removeJavascriptInterface("AndroidVoice");
            webView.destroy();
        }
        super.onDestroy();
    }

    private void js(String code) {
        runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript(code, null);
        });
    }

    /** Los personajes hablan: motor de voz del sistema, en español y sin conexión si se puede. */
    private final class SpeechBridge {
        private TextToSpeech tts;
        private volatile boolean ready = false;

        SpeechBridge() {
            tts = new TextToSpeech(MainActivity.this, status -> {
                if (status != TextToSpeech.SUCCESS) return;
                Locale es = new Locale("es", "ES");
                int r = tts.setLanguage(es);
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) r = tts.setLanguage(new Locale("es"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) return;
                try {
                    // Una voz de España (antes que la de otros países), ya descargada y
                    // que no necesite Internet: nada sale de la tablet.
                    Voice best = null;
                    int bestScore = -1;
                    for (Voice v : tts.getVoices()) {
                        if (!"es".equals(v.getLocale().getLanguage()) || v.isNetworkConnectionRequired()) continue;
                        if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                        int score = ("ES".equals(v.getLocale().getCountry()) ? 10000 : 0) + v.getQuality();
                        if (score > bestScore) {
                            best = v;
                            bestScore = score;
                        }
                    }
                    if (best != null) tts.setVoice(best);
                } catch (Exception ignored) {
                    // Algunos motores no listan voces: se queda la de por defecto.
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {}
                    @Override public void onDone(String id) { js("window.__onTtsDone&&window.__onTtsDone(" + JSONObject.quote(id) + ")"); }
                    @Override public void onError(String id) { js("window.__onTtsDone&&window.__onTtsDone(" + JSONObject.quote(id) + ")"); }
                    // Una frase cortada por la siguiente (QUEUE_FLUSH) no avisa con onDone:
                    // sin esto, el juego esperaba unos segundos de más a que «terminara».
                    @Override public void onStop(String id, boolean interrupted) { js("window.__onTtsDone&&window.__onTtsDone(" + JSONObject.quote(id) + ")"); }
                });
                ready = true;
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            return ready;
        }

        /** Qué voz se está usando (para comprobarlo desde el juego). */
        @JavascriptInterface
        public String voiceName() {
            try {
                Voice v = tts.getVoice();
                return v == null ? "" : v.getName() + " " + v.getLocale();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void speak(String text, float pitch, float rate, String id) {
            if (!ready) {
                js("window.__onTtsDone&&window.__onTtsDone(" + JSONObject.quote(id) + ")");
                return;
            }
            tts.setPitch(Math.max(0.5f, Math.min(2f, pitch)));
            tts.setSpeechRate(Math.max(0.5f, Math.min(2f, rate)));
            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1f);
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null && ready) tts.stop();
        }

        void shutdown() {
            if (tts != null) tts.shutdown();
            tts = null;
            ready = false;
        }
    }

    /** Respuestas con la voz: reconocimiento del sistema, pidiendo que sea sin conexión. */
    private final class VoiceBridge implements RecognitionListener {
        private SpeechRecognizer recognizer;

        @JavascriptInterface
        public boolean isAvailable() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }

        @JavascriptInterface
        public void startListening() {
            runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                    return;
                }
                beginListening();
            });
        }

        @JavascriptInterface
        public void cancelListening() {
            runOnUiThread(() -> {
                if (recognizer != null) recognizer.cancel();
            });
        }

        void beginListening() {
            if (!SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                sendError("no-disponible");
                return;
            }
            destroy();
            recognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
            recognizer.setRecognitionListener(this);
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            recognizer.startListening(intent);
            js("window.__onAndroidVoiceStart&&window.__onAndroidVoiceStart()");
        }

        void sendResult(ArrayList<String> matches) {
            StringBuilder arr = new StringBuilder("[");
            for (int i = 0; i < matches.size(); i++) arr.append(i > 0 ? "," : "").append(JSONObject.quote(matches.get(i)));
            arr.append("]");
            js("window.__onAndroidVoiceResult&&window.__onAndroidVoiceResult(" + arr + ")");
        }

        void sendError(String code) {
            js("window.__onAndroidVoiceError&&window.__onAndroidVoiceError(" + JSONObject.quote(code) + ")");
        }

        void destroy() {
            if (recognizer != null) {
                recognizer.destroy();
                recognizer = null;
            }
        }

        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onPartialResults(Bundle partialResults) {}
        @Override public void onEvent(int eventType, Bundle params) {}

        @Override
        public void onError(int error) {
            String code;
            switch (error) {
                case SpeechRecognizer.ERROR_NO_MATCH:
                case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: code = "no-entendido"; break;
                case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: code = "sin-permiso"; break;
                case SpeechRecognizer.ERROR_NETWORK:
                case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: code = "sin-conexion"; break;
                default: code = "fallo";
            }
            sendError(code);
            destroy();
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches == null || matches.isEmpty()) sendError("no-entendido");
            else sendResult(matches);
            destroy();
        }
    }

    private static final class LocalAssetClient extends WebViewClient {
        private final AssetManager assets;

        LocalAssetClient(AssetManager assets) {
            this.assets = assets;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return responseFor(request.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return responseFor(Uri.parse(url));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !LOCAL_HOST.equals(request.getUrl().getHost());
        }

        private WebResourceResponse responseFor(Uri uri) {
            if (!LOCAL_HOST.equals(uri.getHost())) return emptyResponse(403, "Blocked");
            String path = Uri.decode(uri.getPath() == null ? "" : uri.getPath());
            while (path.startsWith("/")) path = path.substring(1);
            if (path.isEmpty()) path = "index.html";
            if (path.contains("..")) return emptyResponse(400, "Invalid path");
            try {
                InputStream stream = assets.open(path, AssetManager.ACCESS_STREAMING);
                String mime = URLConnection.guessContentTypeFromName(path);
                if (mime == null && path.endsWith(".webmanifest")) mime = "application/manifest+json";
                if (mime == null && path.endsWith(".js")) mime = "application/javascript";
                if (mime == null && path.endsWith(".css")) mime = "text/css";
                if (mime == null && path.endsWith(".webp")) mime = "image/webp";
                if (mime == null && path.endsWith(".json")) mime = "application/json";
                if (mime == null && path.endsWith(".ttf")) mime = "font/ttf";
                if (mime == null && path.endsWith(".woff2")) mime = "font/woff2";
                if (mime == null) mime = "application/octet-stream";
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-cache");
                headers.put("Access-Control-Allow-Origin", "https://" + LOCAL_HOST);
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream);
            } catch (IOException error) {
                return emptyResponse(404, "Not found");
            }
        }

        private static WebResourceResponse emptyResponse(int status, String reason) {
            return new WebResourceResponse(
                "text/plain", "UTF-8", status, reason, new HashMap<>(),
                new ByteArrayInputStream(reason.getBytes(StandardCharsets.UTF_8))
            );
        }
    }
}
