package com.jaeseok614.winagainfootball;

import android.graphics.Bitmap;
import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.os.Build;
import android.view.MotionEvent;
import android.view.ViewTreeObserver;
import android.webkit.WebView;
import androidx.webkit.WebViewFeature;
import androidx.test.espresso.intent.Intents;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;

@RunWith(AndroidJUnit4.class)
public final class GameSmokeTest {
    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        CountDownLatch ready = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>("null");
        scenario.onActivity(activity -> {
            if (activity.gameViewForTest() == null) { ready.countDown(); return; }
            activity.gameViewForTest().evaluateJavascript(script, result -> { value.set(result); ready.countDown(); });
        });
        assertTrue("WebView did not respond to verification", ready.await(15, TimeUnit.SECONDS));
        return value.get();
    }
    private void awaitReady(ActivityScenario<MainActivity> scenario) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
        while (System.nanoTime() < until) {
            if ("true".equals(evaluate(scenario, "!!(window.WinAgainAndroid && typeof season !== 'undefined' && document.getElementById('primary'))"))) return;
            Thread.sleep(100);
        }
        fail("Bundled offline game did not initialize");
    }
    private void awaitTrue(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        while (System.nanoTime() < until) {
            if ("true".equals(evaluate(scenario, script))) return;
            Thread.sleep(100);
        }
        fail("Timed out verifying: " + script);
    }
    private void awaitAppWindowFocus(ActivityScenario<MainActivity> scenario) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < until) {
            AtomicReference<Boolean> focused = new AtomicReference<>(false);
            scenario.onActivity(activity -> focused.set(activity.hasWindowFocus()));
            if (focused.get()) return;
            Thread.sleep(100);
        }
        android.view.accessibility.AccessibilityNodeInfo window = InstrumentationRegistry.getInstrumentation()
            .getUiAutomation().getRootInActiveWindow();
        fail("App window was covered or unfocused; active package: " + (window == null ? "unknown" : window.getPackageName()));
    }
    private void awaitWebViewFrame(ActivityScenario<MainActivity> scenario) throws Exception {
        CountDownLatch drawn = new CountDownLatch(1);
        scenario.onActivity(activity -> {
            WebView web = activity.gameViewForTest();
            assertNotNull(web);
            assertTrue("WebView cannot synchronize its rendered DOM", WebViewFeature.isFeatureSupported(WebViewFeature.VISUAL_STATE_CALLBACK));
            web.postVisualStateCallback(1000, new WebView.VisualStateCallback() {
                @Override public void onComplete(long requestId) {
                    if (Build.VERSION.SDK_INT >= 29 && web.isHardwareAccelerated()) {
                        // onDraw starts before rendering; commit waits for the submitted frame.
                        web.getViewTreeObserver().registerFrameCommitCallback(drawn::countDown);
                        web.invalidate();
                        return;
                    }
                    web.getViewTreeObserver().addOnDrawListener(new ViewTreeObserver.OnDrawListener() {
                        private boolean done;
                        @Override public void onDraw() {
                            if (done) return; done = true;
                            web.post(() -> web.getViewTreeObserver().removeOnDrawListener(this));
                            drawn.countDown();
                        }
                    });
                    web.invalidate();
                }
            });
        });
        assertTrue("The updated WebView frame was never drawn", drawn.await(15, TimeUnit.SECONDS));
    }
    private void assertVisibleWebText(ActivityScenario<MainActivity> scenario, String selector, String text) throws Exception {
        assertEquals("Requested screen text must be visible: " + text, "true", evaluate(scenario,
            "(()=>{const element=document.querySelector('" + selector + "');if(!element)return false;const r=element.getBoundingClientRect();" +
            "return element.textContent.includes('" + text + "')&&r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;})()"));
    }
    private File verificationFolder() {
        String additional = InstrumentationRegistry.getArguments().getString("additionalTestOutputDir");
        File folder = additional != null && !additional.isEmpty() ? new File(additional)
            : new File(InstrumentationRegistry.getInstrumentation().getTargetContext()
                .getExternalFilesDir(Environment.DIRECTORY_PICTURES), "verification");
        assertTrue(folder.isDirectory() || folder.mkdirs());
        return folder;
    }
    private JSONObject screenState(ActivityScenario<MainActivity> scenario, String stage) throws Exception {
        String encoded = evaluate(scenario,
            "(()=>{const bounds=id=>{const e=document.getElementById(id);if(!e)return null;const r=e.getBoundingClientRect();" +
            "return {text:e.textContent,left:r.left,top:r.top,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(e).display}};" +
            "return JSON.stringify({view,expanded:mobileDashboardExpanded,clubClass:document.getElementById('club-pane').className," +
            "panelDisplay:getComputedStyle(document.getElementById('club-life-panel')).display,heading:bounds('life-club-heading')," +
            "coach:bounds('staff-heading'),scrollY,innerHeight,activeElement:document.activeElement?.id,hidden:document.hidden});})()");
        JSONObject state = new JSONObject(new JSONTokener(encoded).nextValue().toString());
        state.put("stage", stage);
        scenario.onActivity(activity -> {
            try {
                state.put("nativeScrollY", activity.gameViewForTest().getScrollY());
                state.put("nativeFocus", activity.hasWindowFocus());
            } catch (org.json.JSONException error) { throw new AssertionError(error); }
        });
        return state;
    }
    private void tapWebElement(ActivityScenario<MainActivity> scenario, String selector) throws Exception {
        evaluate(scenario, "document.querySelector('" + selector + "').scrollIntoView({block:'center',behavior:'instant'});true");
        awaitWebViewFrame(scenario); awaitAppWindowFocus(scenario);
        String pointJson = evaluate(scenario,
            "(()=>{const r=document.querySelector('" + selector + "').getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,devicePixelRatio])})()");
        JSONArray point = new JSONArray(new JSONTokener(pointJson).nextValue().toString());
        int[] origin = new int[2]; int[] size = new int[2];
        scenario.onActivity(activity -> {
            activity.gameViewForTest().getLocationOnScreen(origin);
            size[0] = activity.gameViewForTest().getWidth(); size[1] = activity.gameViewForTest().getHeight();
        });
        float x = origin[0] + (float)(point.getDouble(0) * point.getDouble(2));
        float y = origin[1] + (float)(point.getDouble(1) * point.getDouble(2));
        assertTrue("Touch must be inside the visible WebView: " + pointJson,
            x >= origin[0] && x < origin[0] + size[0] && y >= origin[1] && y < origin[1] + size[1]);
        long now = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
        MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, x, y, 0);
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        instrumentation.sendPointerSync(down); instrumentation.sendPointerSync(up);
        down.recycle(); up.recycle();
    }
    private void screenshot(ActivityScenario<MainActivity> scenario, String filename) throws Exception {
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        awaitAppWindowFocus(scenario);
        boolean webScreen = !filename.startsWith("android-loading-");
        JSONArray metadata = new JSONArray();
        if (webScreen) {
            metadata.put(screenState(scenario, "beforeFrame"));
            awaitWebViewFrame(scenario);
            metadata.put(screenState(scenario, "afterFirstCommit"));
            awaitWebViewFrame(scenario);
            metadata.put(screenState(scenario, "afterSecondCommit"));
        }
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
        Thread.sleep(200); // Allow the submitted frame to reach the system compositor.
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull("Emulator screenshot was unavailable", bitmap);
        File folder = verificationFolder();
        try (FileOutputStream stream = new FileOutputStream(new File(folder, filename))) {
            assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream));
        } finally { bitmap.recycle(); }
        if (webScreen) {
            metadata.put(screenState(scenario, "afterPng"));
            try (FileOutputStream stream = new FileOutputStream(new File(folder, filename.replace(".png", ".json")))) {
                stream.write(metadata.toString(2).getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    @Test public void offlineGameSaveImportPauseBackAndRelaunch() throws Exception {
        String fingerprint;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            assertEquals("true", evaluate(scenario, "WinAgainAndroid.available"));
            assertEquals("The rendered coach and player portraits must have real image backgrounds", "true", evaluate(scenario,
                "(()=>{window.androidPortraitsReady=false;setView('squad');squadTab='health';render();" +
                "const backgroundUrl=selector=>{const element=document.querySelector(selector);if(!element)return null;" +
                "const background=getComputedStyle(element).backgroundImage;if(!background.startsWith('url(')||!background.endsWith(')'))return null;" +
                "let url=background.slice(4,-1);if((url[0]===String.fromCharCode(34)&&url.at(-1)===String.fromCharCode(34))" +
                "||(url[0]===String.fromCharCode(39)&&url.at(-1)===String.fromCharCode(39)))url=url.slice(1,-1);return url};" +
                "const urls=[backgroundUrl('.staff-portrait'),backgroundUrl('.player-portrait')];" +
                "if(urls.some(url=>!url||!url.startsWith('data:image/')))return 'Missing rendered portrait background';let loaded=0;" +
                "urls.forEach(url=>{const image=new Image();image.onload=()=>{if(image.naturalWidth>0&&++loaded===2)androidPortraitsReady=true};image.src=url});return true;})()"));
            awaitTrue(scenario, "window.androidPortraitsReady===true");
            assertEquals("Coach screen must select the squad and display its faces", "true", evaluate(scenario,
                "(()=>{document.querySelector('[data-staff-role]').open=true;const panel=document.getElementById('staff-panel');" +
                "panel.scrollIntoView({block:'start',behavior:'instant'});const face=panel.querySelector('.staff-portrait').getBoundingClientRect();" +
                "return view==='squad'&&!document.getElementById('squad-pane').hidden&&" +
                "document.querySelector('[data-view=squad]').getAttribute('aria-current')==='page'&&face.width>0&&face.height>0&&face.top>=0&&face.bottom<innerHeight;})()"));
            assertVisibleWebText(scenario, "#staff-heading", "코치 계약");
            screenshot(scenario, "android-coaches.png");
            assertEquals("true", evaluate(scenario,
                "(()=>{save();const original=JSON.stringify(currentCampaignPayload());const file=CampaignFile.stringify(currentCampaignPayload());" +
                "previewCampaignText(file);const restored=applyCampaignImport();return restored&&JSON.stringify(currentCampaignPayload())===original;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{const raw=localStorage.getItem('win-again-season-v17');let rejected=false;" +
                "try{CampaignFile.read('{\\\"broken\\\":true}')}catch{rejected=true}return rejected&&localStorage.getItem('win-again-season-v17')===raw;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{setView('match');document.getElementById('primary').click();WinAgainAndroid.pause();return state.paused&&!!localStorage.getItem('win-again-season-v17');})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{openPortability();const consumed=WinAgainAndroid.handleBack();return consumed&&!document.getElementById('portability-dialog').open;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{setView('squad');return WinAgainAndroid.handleBack()&&view==='club';})()"));
            fingerprint = evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,phase:state.phase,minute:state.minute,rng:state.rng})");
            scenario.onActivity(activity -> assertTrue("Game emitted JavaScript console errors: " + activity.consoleErrorsForTest(), activity.consoleErrorsForTest().isEmpty()));
            evaluate(scenario, "window.scrollTo(0,0);true");
            screenshot(scenario, "android-game.png");
            assertEquals("The journal is visible without an expansion click", "true", evaluate(scenario,
                "(()=>{const panel=document.getElementById('club-life-panel');" +
                "panel.scrollIntoView({block:'start',behavior:'instant'});return view==='club'&&!mobileDashboardExpanded&&" +
                "getComputedStyle(panel).display!=='none'&&panel.querySelectorAll('.media-review').length===3&&" +
                "!panel.querySelector('details.life-newspaper');})()"));
            assertVisibleWebText(scenario, "#life-club-heading", "오늘의 축구 헤드라인");
            screenshot(scenario, "android-interviews.png");
            assertVisibleWebText(scenario, "#life-club-heading", "오늘의 축구 헤드라인");
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals(fingerprint, evaluate(reopened, "JSON.stringify({year:season.year,round:season.round,phase:state.phase,minute:state.minute,rng:state.rng})"));
            assertEquals("true", evaluate(reopened, "state.paused"));
            reopened.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void titleMenuHomeAndCompactLiveMatch() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            assertEquals("true", evaluate(scenario, "!appSessionStarted&&!document.getElementById('launch-screen').hidden&&document.querySelector('.app').hidden"));
            String before = evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})");
            screenshot(scenario, "android-title-menu.png");
            tapWebElement(scenario, "#launch-continue");
            awaitTrue(scenario, "appSessionStarted&&view==='club'&&document.getElementById('launch-screen').hidden");
            assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
            assertEquals("true", evaluate(scenario, "getComputedStyle(document.getElementById('club-life-panel')).display!=='none'&&document.querySelectorAll('.media-review').length===3"));
            screenshot(scenario, "android-home-media.png");
            tapWebElement(scenario, "#mobile-match-action");
            awaitTrue(scenario, "view==='match'&&!document.getElementById('match-pane').hidden");
            awaitTrue(scenario, "!document.getElementById('opposition-report').hidden&&document.querySelectorAll('.opposition-roster tbody tr').length===11");
            assertEquals("true", evaluate(scenario, "document.getElementById('opposition-report').textContent.includes('전술 성향')&&document.getElementById('opposition-report').textContent.includes('체력')"));
            screenshot(scenario, "android-opposition-report.png");
            tapWebElement(scenario, "#matchday-tab-live");
            assertEquals("Score, pitch and main action must share the phone viewport", "true", evaluate(scenario,
                "(()=>{const p=document.getElementById('pitch').getBoundingClientRect(),b=document.getElementById('primary').getBoundingClientRect(),s=document.querySelector('.scoreboard').getBoundingClientRect();return s.top>=0&&p.top>=0&&p.bottom<=b.top&&b.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;})()"));
            screenshot(scenario, "android-compact-match.png");
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void nativeOriginValidationRejectsConfusableAndFileUrls() {
        assertTrue(MainActivity.isGameDocument(Uri.parse(MainActivity.GAME_URL + "#match")));
        assertFalse(MainActivity.isGameDocument(Uri.parse("https://appassets.androidplatform.net.evil.test/assets/game/index.html")));
        assertFalse(MainActivity.isGameDocument(Uri.parse("https://evil.test@appassets.androidplatform.net/assets/game/index.html")));
        assertFalse(MainActivity.isGameDocument(Uri.parse("http://appassets.androidplatform.net/assets/game/index.html")));
        assertFalse(MainActivity.isGameDocument(Uri.parse("file:///android_asset/game/index.html")));
        assertFalse(MainActivity.isGameDocument(Uri.parse(MainActivity.GAME_URL + "?untrusted=1")));
        assertFalse(MainActivity.isGameAsset(Uri.parse("https://appassets.androidplatform.net/assets/game/../other/file")));
        assertTrue(MainActivity.isInlineImage(Uri.parse("data:image/png;base64,AA==")));
        assertTrue(MainActivity.isInlineImage(Uri.parse("data:image/webp;base64,AA==")));
        assertTrue(MainActivity.isInlineImage(Uri.parse("data:image/jpeg;base64,AA==")));
        assertFalse(MainActivity.isInlineImage(Uri.parse("data:text/html;base64,AA==")));
        assertFalse(MainActivity.isInlineImage(Uri.parse("data:image/svg+xml;base64,AA==")));
    }
    private void awaitOrientation(ActivityScenario<MainActivity> scenario, int orientation) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(20);
        while (System.nanoTime() < until) {
            AtomicReference<Boolean> correct = new AtomicReference<>(false);
            scenario.onActivity(activity -> correct.set(activity.getResources().getConfiguration().orientation == orientation));
            if (correct.get()) return;
            Thread.sleep(100);
        }
        fail("Activity did not change orientation");
    }
    @Test public void brandedLoadingFitsPortraitAndLandscape() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            scenario.onActivity(activity -> activity.showLoadingPreviewForTest());
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            scenario.onActivity(activity -> assertTrue("Portrait title or gauge was clipped", activity.loadingBrandFitsForTest()));
            screenshot(scenario, "android-loading-portrait.png");
            scenario.onActivity(activity -> activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            awaitOrientation(scenario, Configuration.ORIENTATION_LANDSCAPE); awaitReady(scenario);
            scenario.onActivity(activity -> activity.showLoadingPreviewForTest());
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            scenario.onActivity(activity -> assertTrue("Landscape title or gauge was clipped", activity.loadingBrandFitsForTest()));
            screenshot(scenario, "android-loading-landscape.png");
            scenario.onActivity(activity -> { activity.hideLoadingPreviewForTest(); activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT); });
            awaitOrientation(scenario, Configuration.ORIENTATION_PORTRAIT);
        }
    }

    @Test public void storageAccessFrameworkExportAndFileInputImportRoundTrip() throws Exception {
        Intents.init();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            Intent document = new Intent().setData(CampaignTestProvider.URI)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            Intents.intending(hasAction(Intent.ACTION_CREATE_DOCUMENT))
                .respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK, document));
            evaluate(scenario, "openPortability();exportCampaign();true");
            awaitTrue(scenario, "portabilityStatus.includes('저장했습니다')");
            String campaign;
            try (InputStream input = InstrumentationRegistry.getInstrumentation().getTargetContext()
                    .getContentResolver().openInputStream(CampaignTestProvider.URI);
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                assertNotNull(input); byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                campaign = new String(output.toByteArray(), StandardCharsets.UTF_8);
            }
            assertTrue("Native document writer did not create a campaign", campaign.contains("win-again"));
            String before = evaluate(scenario, "JSON.stringify(currentCampaignPayload())");
            Intents.intending(hasAction(Intent.ACTION_OPEN_DOCUMENT))
                .respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK, document));
            evaluate(scenario, "document.getElementById('campaign-import-file').scrollIntoView({block:'center'});true");
            Thread.sleep(150);
            String pointJson = evaluate(scenario,
                "(()=>{const r=document.getElementById('campaign-import-file').getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,devicePixelRatio])})()");
            JSONArray point = new JSONArray(new JSONTokener(pointJson).nextValue().toString());
            awaitAppWindowFocus(scenario);
            int[] origin = new int[2]; int[] size = new int[2];
            scenario.onActivity(activity -> {
                activity.gameViewForTest().getLocationOnScreen(origin);
                size[0] = activity.gameViewForTest().getWidth(); size[1] = activity.gameViewForTest().getHeight();
            });
            float x = origin[0] + (float)(point.getDouble(0) * point.getDouble(2));
            float y = origin[1] + (float)(point.getDouble(1) * point.getDouble(2));
            assertTrue("Import picker touch must be inside the visible WebView: " + pointJson,
                x >= origin[0] && x < origin[0] + size[0] && y >= origin[1] && y < origin[1] + size[1]);
            Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
            long now = SystemClock.uptimeMillis();
            MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
            MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, x, y, 0);
            instrumentation.sendPointerSync(down); instrumentation.sendPointerSync(up);
            down.recycle(); up.recycle();
            awaitTrue(scenario, "!!pendingImport && !portabilityError");
            assertEquals("true", evaluate(scenario, "applyCampaignImport()"));
            assertEquals(before, evaluate(scenario, "JSON.stringify(currentCampaignPayload())"));
            scenario.onActivity(activity -> assertTrue("Native import caused console errors: " + activity.consoleErrorsForTest(), activity.consoleErrorsForTest().isEmpty()));
        } finally { Intents.release(); }
    }
}
