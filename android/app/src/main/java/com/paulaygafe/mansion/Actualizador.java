package com.paulaygafe.mansion;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Actualizaciones del juego sin reinstalar el APK (OTA).
 *
 * El juego web va dentro del APK. Al abrir la app, en segundo plano, se mira un
 * manifiesto en {@code R.string.ota_manifest_url}; si hay una versión más nueva
 * se descarga el .zip, se comprueba su SHA-256, se descomprime en
 * {@code files/web/v<N>} y se marca como activa. Se usa en el siguiente
 * arranque (nunca se cambia el juego a mitad de partida). La partida guardada
 * no se toca: el juego sigue sirviéndose desde https://paula.local.
 *
 * Solo esta clase usa Internet, y solo para descargar: no se envía nada.
 * Si algo falla (sin conexión, archivo dañado...) se sigue con lo que había.
 */
final class Actualizador {
    private static final String TAG = "Actualizador";
    private static final long TAMANO_MAXIMO = 300L * 1024 * 1024;
    private static final int ENTRADAS_MAXIMAS = 20000;

    private final Context contexto;
    private final File base;

    Actualizador(Context contexto) {
        this.contexto = contexto.getApplicationContext();
        this.base = new File(this.contexto.getFilesDir(), "web");
    }

    /** Versión del juego que trae el propio APK (assets/version-web.json). */
    int versionIncluida() {
        try (InputStream in = contexto.getAssets().open("version-web.json")) {
            return new JSONObject(leer(in, 4096)).optInt("version", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    /** Versión descargada y lista para usar (0 si no hay ninguna válida). */
    private int versionDescargada() {
        try (InputStream in = new FileInputStream(new File(base, "activa.txt"))) {
            int n = Integer.parseInt(leer(in, 64).trim());
            return new File(new File(base, "v" + n), "index.html").isFile() ? n : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Carpeta con el juego descargado, o null si hay que usar el del APK (no hay
     * descarga, o el APK es más nuevo: por ejemplo tras instalar uno a mano).
     */
    File carpetaActiva() {
        int n = versionDescargada();
        return n > versionIncluida() ? new File(base, "v" + n) : null;
    }

    /** Borra descargas a medias y versiones viejas (la activa se conserva). */
    void limpiar() {
        File[] hijos = base.listFiles();
        if (hijos == null) return;
        File activa = carpetaActiva();
        for (File f : hijos) {
            if (f.getName().equals("activa.txt")) continue;
            if (activa != null && f.equals(activa)) continue;
            borrar(f);
        }
    }

    void comprobarEnSegundoPlano() {
        Thread hilo = new Thread(() -> {
            try {
                comprobar();
            } catch (Exception e) {
                Log.w(TAG, "No se pudo actualizar: " + e);
            }
        }, "actualizador");
        hilo.setPriority(Thread.MIN_PRIORITY);
        hilo.setDaemon(true);
        hilo.start();
    }

    private void comprobar() throws Exception {
        String direccion = contexto.getString(R.string.ota_manifest_url).trim();
        if (!direccion.startsWith("https://")) return;   // sin configurar: nada que hacer
        JSONObject manifiesto = new JSONObject(descargarTexto(direccion));
        int version = manifiesto.getInt("version");
        int apkMinimo = manifiesto.optInt("min_apk", 0);
        int actual = Math.max(versionIncluida(), versionDescargada());
        if (version <= actual) return;
        if (versionDelApk() < apkMinimo) {
            // Esa versión necesita un APK más nuevo (algo nativo cambió).
            Log.i(TAG, "La versión " + version + " necesita el APK " + apkMinimo);
            return;
        }
        String zip = manifiesto.getString("url");
        String sha = manifiesto.getString("sha256").trim().toLowerCase();
        if (!zip.startsWith("https://") || sha.length() != 64) return;

        if (!base.isDirectory() && !base.mkdirs()) throw new IOException("sin carpeta");
        File parte = new File(base, "descarga.part");
        String obtenido = descargarArchivo(zip, parte);
        if (!obtenido.equals(sha)) {
            borrar(parte);
            throw new IOException("SHA-256 no coincide");
        }
        File temporal = new File(base, "v" + version + ".tmp");
        borrar(temporal);
        descomprimir(parte, temporal);
        borrar(parte);
        if (!new File(temporal, "index.html").isFile()) {
            borrar(temporal);
            throw new IOException("el paquete no trae index.html");
        }
        File destino = new File(base, "v" + version);
        borrar(destino);
        if (!temporal.renameTo(destino)) throw new IOException("no se pudo colocar la versión");
        // El puntero se cambia de golpe (renombrando) para no dejarlo a medias.
        File puntero = new File(base, "activa.txt.tmp");
        try (OutputStream out = new FileOutputStream(puntero)) {
            out.write(String.valueOf(version).getBytes(StandardCharsets.UTF_8));
        }
        if (!puntero.renameTo(new File(base, "activa.txt"))) throw new IOException("no se pudo activar");
        Log.i(TAG, "Versión " + version + " lista para el próximo arranque");
    }

    private long versionDelApk() {
        try {
            PackageInfo info = contexto.getPackageManager().getPackageInfo(contexto.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return info.getLongVersionCode();
            return info.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    private static HttpURLConnection abrir(String direccion) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(direccion).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        if (c.getResponseCode() != 200) {
            c.disconnect();
            throw new IOException("HTTP " + c.getResponseCode() + " en " + direccion);
        }
        return c;
    }

    private static String descargarTexto(String direccion) throws IOException {
        HttpURLConnection c = abrir(direccion);
        try (InputStream in = c.getInputStream()) {
            return leer(in, 64 * 1024);
        } finally {
            c.disconnect();
        }
    }

    /** Descarga a un archivo y devuelve su SHA-256 en hexadecimal. */
    private static String descargarArchivo(String direccion, File destino) throws Exception {
        HttpURLConnection c = abrir(direccion);
        MessageDigest resumen = MessageDigest.getInstance("SHA-256");
        long total = 0;
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(destino)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > TAMANO_MAXIMO) throw new IOException("paquete demasiado grande");
                resumen.update(buf, 0, n);
                out.write(buf, 0, n);
            }
        } finally {
            c.disconnect();
        }
        StringBuilder hex = new StringBuilder();
        for (byte b : resumen.digest()) hex.append(String.format("%02x", b));
        return hex.toString();
    }

    private static void descomprimir(File zip, File destino) throws IOException {
        if (!destino.mkdirs()) throw new IOException("sin carpeta de destino");
        String raiz = destino.getCanonicalPath() + File.separator;
        int entradas = 0;
        try (ZipInputStream in = new ZipInputStream(new FileInputStream(zip))) {
            ZipEntry e;
            byte[] buf = new byte[64 * 1024];
            while ((e = in.getNextEntry()) != null) {
                if (++entradas > ENTRADAS_MAXIMAS) throw new IOException("demasiados archivos");
                File f = new File(destino, e.getName());
                // Nada puede escribirse fuera de la carpeta (rutas con "..")
                if (!f.getCanonicalPath().startsWith(raiz)) throw new IOException("ruta no válida: " + e.getName());
                if (e.isDirectory()) {
                    if (!f.isDirectory() && !f.mkdirs()) throw new IOException("sin carpeta " + e.getName());
                    continue;
                }
                File padre = f.getParentFile();
                if (padre != null && !padre.isDirectory() && !padre.mkdirs()) throw new IOException("sin carpeta");
                try (OutputStream out = new FileOutputStream(f)) {
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
            }
        }
    }

    private static String leer(InputStream in, int maximo) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            if (out.size() > maximo) throw new IOException("respuesta demasiado grande");
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static void borrar(File f) {
        if (f == null || !f.exists()) return;
        File[] hijos = f.listFiles();
        if (hijos != null) for (File h : hijos) borrar(h);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
