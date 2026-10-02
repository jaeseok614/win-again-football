package com.jaeseok614.winagainfootball;

import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline game host. Only the bundled top-level origin can request JSON export. */
public final class MainActivity extends ComponentActivity {
    static final String GAME_ORIGIN = "https://appassets.androidplatform.net";
    static final String GAME_URL = GAME_ORIGIN + "/assets/game/index.html";
    static final int MAX_FILE_BYTES = 2 * 1024 * 1024;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final List<String> consoleErrors = new CopyOnWriteArrayList<>();
    private FrameLayout root;
    private FrameLayout loading;
    private LinearLayout loadingContent;
    private ImageView loadingBackdrop;
    private ImageView loadingBall;
    private TextView loadingTitle;
    private TextView loadingSubtitle;
    private Boolean compactLoading;
    private TextView loadingText;
    private ProgressBar progress;
    private Button retry;
    private WebView gameView;
    private ValueCallback<Uri[]> importCallback;
    private JavaScriptReplyProxy exportReply;
    private String pendingExportId;
    private String pendingExportName;
    private boolean destroyed;
    private boolean verificationRunning;

    private final ActivityResultLauncher<Intent> importPicker = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(), result -> {
            ValueCallback<Uri[]> callback = importCallback;
            importCallback = null;
            if (callback == null) return;
            Uri uri = result.getResultCode() == RESULT_OK && result.getData() != null
                ? result.getData().getData() : null;
            if (uri == null) { callback.onReceiveValue(null); return; }
            if (!"content".equals(uri.getScheme())) {
                callback.onReceiveValue(null); toast("문서 선택기에서 JSON 저장 파일을 선택해 주세요."); return;
            }
            // Read metadata away from the UI thread. The web importer performs the
            // canonical campaign validation before the player confirms replacement.
            showLoading("저장 파일을 확인하는 중…", true);
            io.execute(() -> {
                boolean allowed = true;
                try (Cursor cursor = getContentResolver().query(uri,
                        new String[]{OpenableColumns.SIZE}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0))
                        allowed = cursor.getLong(0) <= MAX_FILE_BYTES;
                } catch (Exception error) { allowed = false; }
                final boolean accepted = allowed;
                runOnUiThread(() -> {
                    if (destroyed) return;
                    loading.setVisibility(View.GONE);
                    callback.onReceiveValue(accepted ? new Uri[]{uri} : null);
                    if (!accepted) toast("저장 파일은 2MB 이하만 불러올 수 있어요.");
                });
            });
        });

    private final ActivityResultLauncher<Intent> exportPicker = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(), result -> {
            if (pendingExportId == null) return;
            Uri uri = result.getResultCode() == RESULT_OK && result.getData() != null
                ? result.getData().getData() : null;
            if (uri == null) { finishExport("cancelled", "저장을 취소했습니다."); return; }
            if (!"content".equals(uri.getScheme())) {
                finishExport("error", "문서 선택기에서 저장 위치를 선택해 주세요."); return;
            }
            showLoading("구단 저장 파일을 쓰는 중…", true);
            io.execute(() -> {
                String status = "saved", message = "구단 저장 파일을 저장했습니다.";
                try (InputStream input = new FileInputStream(exportCache());
                     OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new IllegalStateException("No output stream");
                    byte[] buffer = new byte[16384]; int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    output.flush();
                } catch (Exception error) {
                    status = "error"; message = "파일을 저장하지 못했어요. 다른 위치로 다시 저장해 주세요.";
                }
                final String finalStatus = status, finalMessage = message;
                runOnUiThread(() -> { if (!destroyed) finishExport(finalStatus, finalMessage); });
            });
        });

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16, 27, 35));
        loading = new FrameLayout(this);
        loading.setBackgroundColor(Color.rgb(16, 27, 35));
        loadingBackdrop = new ImageView(this);
        loadingBackdrop.setImageResource(R.drawable.launch_stadium);
        loadingBackdrop.setScaleType(ImageView.ScaleType.MATRIX);
        loadingBackdrop.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        loading.addView(loadingBackdrop, new FrameLayout.LayoutParams(-1, -1));
        View shade = new View(this);
        shade.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            new int[]{0xB8071420, 0xCC091A20, 0xDD07151D}));
        loading.addView(shade, new FrameLayout.LayoutParams(-1, -1));
        loadingContent = new LinearLayout(this);
        loadingContent.setOrientation(LinearLayout.VERTICAL);
        loadingContent.setGravity(Gravity.CENTER);
        loadingContent.setPadding(dp(24), dp(24), dp(24), dp(24));
        loadingBall = new ImageView(this);
        loadingBall.setImageResource(R.drawable.football_icon);
        loadingBall.setScaleType(ImageView.ScaleType.FIT_CENTER);
        loadingBall.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        loadingContent.addView(loadingBall, new LinearLayout.LayoutParams(dp(88), dp(88)));
        loadingTitle = new TextView(this);
        loadingTitle.setText(R.string.loading_title);
        loadingTitle.setTextColor(Color.WHITE);
        loadingTitle.setTextSize(24);
        loadingTitle.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        loadingTitle.setGravity(Gravity.CENTER);
        loadingTitle.setLineSpacing(dp(5), 1);
        loadingTitle.setPadding(0, dp(12), 0, dp(10));
        loadingContent.addView(loadingTitle);
        loadingSubtitle = new TextView(this);
        loadingSubtitle.setText(R.string.loading_subtitle);
        loadingSubtitle.setTextColor(0xFFE1ECD8);
        loadingSubtitle.setTextSize(14);
        loadingSubtitle.setGravity(Gravity.CENTER);
        loadingSubtitle.setPadding(0, 0, 0, dp(24));
        loadingContent.addView(loadingSubtitle);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        loadingContent.addView(progress, new LinearLayout.LayoutParams(dp(250), dp(12)));
        loadingText = new TextView(this);
        loadingText.setTextColor(Color.WHITE);
        loadingText.setTextSize(17);
        loadingText.setGravity(Gravity.CENTER);
        loadingText.setPadding(0, dp(20), 0, dp(12));
        loadingContent.addView(loadingText);
        retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setMinHeight(dp(48));
        retry.setOnClickListener(view -> verifyAndLoad());
        loadingContent.addView(retry);
        loading.addView(loadingContent, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
        loading.addOnLayoutChangeListener((view, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) ->
            layoutLoadingBrand(right - left, bottom - top));
        root.addView(loading, new FrameLayout.LayoutParams(-1, -1));
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return insets;
        });
        setContentView(root);
        if (state != null && state.containsKey("pendingExportId") && exportCache().isFile()) {
            pendingExportId = state.getString("pendingExportId");
            pendingExportName = state.getString("pendingExportName");
        } else { exportCache().delete(); }
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (gameView == null || loading.getVisibility() == View.VISIBLE) { confirmExit(); return; }
                gameView.evaluateJavascript("window.WinAgainAndroid ? WinAgainAndroid.handleBack() : false",
                    result -> { if (!"true".equals(result) && !destroyed) confirmExit(); });
            }
        });
        // Let the native loading view paint before creating a potentially cold WebView.
        root.post(this::verifyAndLoad);
    }

    private void verifyAndLoad() {
        if (verificationRunning || destroyed) return;
        verificationRunning = true;
        showLoading("게임 파일을 확인하는 중…", true);
        io.execute(() -> {
            boolean valid = false;
            try (InputStream info = getAssets().open("game/build-info.json");
                 InputStream game = getAssets().open("game/index.html")) {
                ByteArrayOutputStream infoBytes = new ByteArrayOutputStream();
                byte[] infoBuffer = new byte[4096]; int infoCount;
                while ((infoCount = info.read(infoBuffer)) != -1) {
                    if (infoBytes.size() + infoCount > 65536) throw new IllegalStateException("Oversized build metadata");
                    infoBytes.write(infoBuffer, 0, infoCount);
                }
                JSONObject metadata = new JSONObject(new String(infoBytes.toByteArray(), StandardCharsets.UTF_8));
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] buffer = new byte[16384]; int count;
                while ((count = game.read(buffer)) != -1) digest.update(buffer, 0, count);
                StringBuilder actual = new StringBuilder();
                for (byte value : digest.digest()) actual.append(String.format("%02x", value & 0xff));
                valid = actual.toString().equals(metadata.getString("sha256"));
            } catch (Exception error) { /* Preserve the existing local campaign on asset failure. */ }
            final boolean verified = valid;
            runOnUiThread(() -> {
                verificationRunning = false;
                if (destroyed) return;
                if (!verified) { showFailure("게임 파일을 확인하지 못했어요. 앱을 업데이트하거나 다시 시도해 주세요."); return; }
                createGameView();
            });
        });
    }

    private void createGameView() {
        if (gameView != null) { root.removeView(gameView); gameView.destroy(); }
        gameView = new WebView(this);
        gameView.setId(View.generateViewId());
        gameView.setBackgroundColor(Color.rgb(16, 27, 35));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = gameView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        gameView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Portrait atlases are embedded raster data URLs in the offline HTML.
                // Let WebView decode those images; never allow data documents/scripts.
                if (!request.isForMainFrame() && isInlineImage(uri)) return null;
                if (isGameAsset(uri)) {
                    WebResourceResponse response = loader.shouldInterceptRequest(uri);
                    return response != null ? response : blockedResponse();
                }
                return blockedResponse();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isGameDocument(uri)) return false;
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme())
                        && uri.getHost() != null && !uri.getHost().equals("appassets.androidplatform.net")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException error) { toast("링크를 열 브라우저가 없어요."); }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!isGameDocument(Uri.parse(url))) return;
                view.evaluateJavascript("!!(window.WinAgainAndroid && document.getElementById('primary'))", value -> {
                    if (destroyed || view != gameView) return;
                    if ("true".equals(value)) loading.setVisibility(View.GONE);
                    else showFailure("게임을 시작하지 못했어요. 다시 시도해 주세요.");
                });
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showFailure("게임을 불러오지 못했어요. 다시 시도해 주세요.");
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                root.removeView(view); view.destroy();
                if (view == gameView) gameView = null;
                showFailure("게임 화면이 멈췄어요. 저장한 구단으로 다시 시작할 수 있습니다.");
                return true;
            }
        });
        gameView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                if (pendingExportId != null) return;
                progress.setIndeterminate(false); progress.setProgress(value);
                loadingText.setText(getString(R.string.loading_progress, value));
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG && message.messageLevel() == ConsoleMessage.MessageLevel.ERROR)
                    consoleErrors.add(message.message());
                return super.onConsoleMessage(message);
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (!isGameDocument(Uri.parse(url))) { result.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("확인", (dialog, which) -> result.confirm())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (!isGameDocument(Uri.parse(url))) { result.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this).setMessage(message)
                    .setPositiveButton("확인", (dialog, which) -> result.confirm())
                    .setNegativeButton("취소", (dialog, which) -> result.cancel())
                    .setOnCancelListener(dialog -> result.cancel()).show();
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (!isCurrentGame() || params.getMode() != FileChooserParams.MODE_OPEN || pendingExportId != null) {
                    callback.onReceiveValue(null); return true;
                }
                if (importCallback != null) importCallback.onReceiveValue(null);
                importCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*").putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain"});
                try { importPicker.launch(intent); }
                catch (ActivityNotFoundException error) { importCallback = null; callback.onReceiveValue(null); toast("문서 선택기를 열 수 없어요."); }
                return true;
            }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            showFailure("Android System WebView를 최신 버전으로 업데이트해 주세요."); return;
        }
        WebViewCompat.addWebMessageListener(gameView, "WinAgainNative", Collections.singleton(GAME_ORIGIN),
            (view, message, sourceOrigin, isMainFrame, reply) -> {
                if (view != gameView || !isMainFrame || !isCurrentGame()
                        || !isGameOrigin(sourceOrigin) || message.getType() != WebMessageCompat.TYPE_STRING) return;
                receiveExport(message.getData(), reply);
            });
        root.addView(gameView, 0, new FrameLayout.LayoutParams(-1, -1));
        showLoading("게임을 불러오는 중…", false);
        gameView.loadUrl(GAME_URL);
    }

    private void receiveExport(String message, JavaScriptReplyProxy reply) {
        String id = "";
        try {
            if (message == null || message.length() > MAX_FILE_BYTES * 6 + 2048) throw new IllegalArgumentException();
            JSONObject request = new JSONObject(message);
            id = request.getString("id");
            if (!id.matches("[a-zA-Z0-9-]{1,64}") || !"export".equals(request.getString("type"))) return;
            if (pendingExportId != null || importCallback != null) { sendReply(reply, id, "error", "먼저 열린 문서 선택기를 마쳐 주세요."); return; }
            String name = request.getString("name"), text = request.getString("text");
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            if (!name.matches("[a-zA-Z0-9._-]{1,100}\\.json") || bytes.length == 0 || bytes.length > MAX_FILE_BYTES)
                throw new IllegalArgumentException();
            pendingExportId = id; pendingExportName = name; exportReply = reply;
            showLoading("저장 파일을 준비하는 중…", true);
            io.execute(() -> {
                boolean written = false;
                try (FileOutputStream output = new FileOutputStream(exportCache())) {
                    output.write(bytes); output.getFD().sync(); written = true;
                } catch (Exception error) { /* Report failure without replacing game storage. */ }
                final boolean prepared = written;
                runOnUiThread(() -> {
                    if (destroyed) return;
                    loading.setVisibility(View.GONE);
                    if (!prepared) { finishExport("error", "저장 파일을 준비하지 못했어요. 다시 시도해 주세요."); return; }
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/json").putExtra(Intent.EXTRA_TITLE, pendingExportName);
                    try { exportPicker.launch(intent); }
                    catch (ActivityNotFoundException error) { finishExport("error", "문서 선택기를 열 수 없어요."); }
                });
            });
        } catch (Exception error) { if (!id.isEmpty()) sendReply(reply, id, "error", "저장 파일 형식이나 크기를 확인해 주세요."); }
    }

    private void finishExport(String status, String message) {
        if (exportReply != null && isCurrentGame()) sendReply(exportReply, pendingExportId, status, message);
        else toast(message);
        pendingExportId = null; pendingExportName = null; exportReply = null;
        exportCache().delete();
        loading.setVisibility(View.GONE);
    }
    private void sendReply(JavaScriptReplyProxy reply, String id, String status, String message) {
        try { reply.postMessage(new JSONObject().put("id", id).put("status", status).put("message", message).toString()); }
        catch (Exception ignored) { toast(message); }
    }
    private File exportCache() { return new File(getCacheDir(), "campaign-export-pending.json"); }
    static boolean isGameDocument(Uri uri) {
        return isGameOrigin(uri) && "/assets/game/index.html".equals(uri.getPath()) && uri.getQuery() == null;
    }
    static boolean isGameAsset(Uri uri) {
        return isGameOrigin(uri) && uri.getPath() != null && uri.getPath().startsWith("/assets/game/")
            && !uri.getPath().contains("..") && uri.getQuery() == null;
    }
    static boolean isInlineImage(Uri uri) {
        if (uri == null || !"data".equals(uri.getScheme())) return false;
        String value = uri.toString();
        return value.startsWith("data:image/png;base64,") || value.startsWith("data:image/webp;base64,")
            || value.startsWith("data:image/jpeg;base64,");
    }
    private static boolean isGameOrigin(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && uri.getPort() == -1 && uri.getUserInfo() == null;
    }
    private boolean isCurrentGame() { return gameView != null && isGameDocument(Uri.parse(gameView.getUrl() == null ? "" : gameView.getUrl())); }
    private static WebResourceResponse blockedResponse() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void showLoading(String text, boolean indeterminate) {
        loadingText.setText(text); progress.setIndeterminate(indeterminate);
        progress.setVisibility(View.VISIBLE); retry.setVisibility(View.GONE); loading.setVisibility(View.VISIBLE);
    }
    private void showFailure(String text) {
        loadingText.setText(text); progress.setVisibility(View.GONE);
        retry.setVisibility(View.VISIBLE); loading.setVisibility(View.VISIBLE);
    }
    private void layoutLoadingBrand(int width, int height) {
        if (width <= 0 || height <= 0) return;
        boolean compact = width > height || height < dp(420);
        // Keep the ball visible when a portrait background is cropped on a wide screen.
        float scale = Math.max((float) width / loadingBackdrop.getDrawable().getIntrinsicWidth(),
            (float) height / loadingBackdrop.getDrawable().getIntrinsicHeight());
        float scaledWidth = loadingBackdrop.getDrawable().getIntrinsicWidth() * scale;
        float scaledHeight = loadingBackdrop.getDrawable().getIntrinsicHeight() * scale;
        float focus = compact ? 0.70f : 0.50f;
        float offsetY = Math.max(height - scaledHeight, Math.min(0, height * 0.5f - scaledHeight * focus));
        Matrix matrix = new Matrix(); matrix.setScale(scale, scale);
        matrix.postTranslate((width - scaledWidth) / 2, offsetY); loadingBackdrop.setImageMatrix(matrix);
        int side = Math.max(dp(24), (width - dp(660)) / 2);
        loadingContent.setPadding(side, dp(compact ? 10 : 24), side, dp(compact ? 10 : 24));
        if (compactLoading == null || compactLoading != compact) {
            compactLoading = compact;
            loadingBall.setLayoutParams(new LinearLayout.LayoutParams(dp(compact ? 44 : 88), dp(compact ? 44 : 88)));
            loadingTitle.setTextSize(compact ? 20 : 24);
            loadingTitle.setPadding(0, dp(compact ? 5 : 12), 0, dp(compact ? 5 : 10));
            loadingSubtitle.setTextSize(compact ? 12 : 14);
            loadingSubtitle.setPadding(0, 0, 0, dp(compact ? 12 : 24));
            loadingText.setPadding(0, dp(compact ? 10 : 20), 0, dp(compact ? 6 : 12));
        }
    }
    private void confirmExit() {
        pauseGame();
        new AlertDialog.Builder(this).setMessage("게임을 닫을까요? 구단은 이 기기에 저장됩니다.")
            .setPositiveButton("닫기", (dialog, which) -> finish())
            .setNegativeButton("계속하기", null).show();
    }
    private void pauseGame() { if (isCurrentGame()) gameView.evaluateJavascript("window.WinAgainAndroid && WinAgainAndroid.pause()", null); }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    private int dp(int pixels) { return Math.round(pixels * getResources().getDisplayMetrics().density); }
    @Override protected void onPause() { pauseGame(); super.onPause(); if (gameView != null) gameView.onPause(); }
    @Override protected void onResume() { super.onResume(); if (gameView != null) gameView.onResume(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        pauseGame();
        if (pendingExportId != null) { state.putString("pendingExportId", pendingExportId); state.putString("pendingExportName", pendingExportName); }
        super.onSaveInstanceState(state);
    }
    @Override protected void onDestroy() {
        destroyed = true;
        if (importCallback != null) importCallback.onReceiveValue(null);
        if (gameView != null) { root.removeView(gameView); gameView.destroy(); gameView = null; }
        io.shutdown(); super.onDestroy();
    }
    WebView gameViewForTest() { return gameView; }
    List<String> consoleErrorsForTest() { return consoleErrors; }
    // Instrumentation can preview the real loading layout without delaying startup
    // or inventing a progress percentage. These methods do nothing in release builds.
    void showLoadingPreviewForTest() { if (BuildConfig.DEBUG) showLoading("게임 파일을 확인하는 중…", true); }
    void hideLoadingPreviewForTest() { if (BuildConfig.DEBUG) loading.setVisibility(View.GONE); }
    boolean loadingBrandFitsForTest() {
        return loading.getVisibility() == View.VISIBLE && progress.isIndeterminate()
            && loadingTitle.getText().toString().equals(getString(R.string.loading_title))
            && loadingContent.getTop() >= 0 && loadingContent.getBottom() <= loading.getHeight();
    }
}
