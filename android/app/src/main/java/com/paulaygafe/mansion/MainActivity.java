package com.paulaygafe.mansion;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.KeyEvent;
import android.view.View;
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

public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "paula.local";
    private static final int MICROPHONE_PERMISSION_REQUEST = 41;

    private WebView webView;
    private VoiceBridge voiceBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterImmersiveMode();

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF080A0C);
        configureWebView(webView);
        voiceBridge = new VoiceBridge();
        webView.addJavascriptInterface(voiceBridge, "AndroidVoice");
        setContentView(webView);
        webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
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
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            voiceBridge.beginListening();
        } else {
            voiceBridge.sendError("Permiso de micrófono denegado");
        }
    }

    @Override
    protected void onDestroy() {
        if (voiceBridge != null) voiceBridge.destroy();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidVoice");
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class VoiceBridge implements RecognitionListener {
        private SpeechRecognizer recognizer;

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

        @JavascriptInterface
        public boolean isAvailable() {
            return SpeechRecognizer.isRecognitionAvailable(MainActivity.this);
        }

        void beginListening() {
            if (!SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                sendError("El reconocimiento de voz no está disponible en esta tablet");
                return;
            }
            destroy();
            recognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
            recognizer.setRecognitionListener(this);
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            recognizer.startListening(intent);
        }

        void sendResult(String text) {
            runOnUiThread(() -> webView.evaluateJavascript(
                "window.__onAndroidVoiceResult&&window.__onAndroidVoiceResult(" + JSONObject.quote(text) + ")", null
            ));
        }

        void sendError(String message) {
            runOnUiThread(() -> webView.evaluateJavascript(
                "window.__onAndroidVoiceError&&window.__onAndroidVoiceError(" + JSONObject.quote(message) + ")", null
            ));
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
            String message;
            switch (error) {
                case SpeechRecognizer.ERROR_NO_MATCH:
                case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                    message = "No he podido entenderte. Vuelve a intentarlo o escribe la respuesta.";
                    break;
                case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                    message = "Falta el permiso de micrófono. Puedes escribir la respuesta.";
                    break;
                case SpeechRecognizer.ERROR_NETWORK:
                case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                    message = "El reconocimiento de voz necesita conexión y no la encuentra. Escribe la respuesta.";
                    break;
                default:
                    message = "El micrófono no ha podido escuchar bien. Escribe la respuesta si prefieres.";
            }
            sendError(message);
            destroy();
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches == null || matches.isEmpty()) sendError("No he podido oír la respuesta");
            else sendResult(matches.get(0));
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
