package com.paulaygafe.mansion;

import android.app.Activity;
import android.content.res.AssetManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Envoltorio del juego. Todo se sirve desde los assets del APK (nada sale de
 * la tablet: no hay permiso de Internet ni de micrófono).
 */
public class MainActivity extends Activity {
    private static final String LOCAL_HOST = "paula.local";

    private WebView webView;

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
        setContentView(webView);
        webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
    }

    // Al salir de la app (botón de inicio, otra app) el juego se pausa de verdad:
    // guarda la partida, calla el sonido y deja de gastar batería.
    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
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
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
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
