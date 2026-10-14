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
    private void assertManagerArrivalFits(ActivityScenario<MainActivity> scenario) throws Exception {
        assertEquals("Manager image, complete prose and next action fit the actual phone", "true", evaluate(scenario,
            "(()=>{const d=document.getElementById('manager-guide'),copy=document.getElementById('manager-guide-copy'),art=d.querySelector('#manager-guide-art>.manager-art,#manager-guide-art>.memory-art'),next=document.getElementById('manager-guide-next'),a=art?.getBoundingClientRect(),b=next.getBoundingClientRect();return !!art&& d.open&&!document.getElementById('manager-guide-art').hidden&&getComputedStyle(art).backgroundImage.includes('data:image/webp')&&a.height>=120&&d.scrollHeight<=d.clientHeight+1&&copy.scrollHeight<=copy.clientHeight+1&&b.height>=44&&b.bottom<=innerHeight;})()"));
    }
    private void reachStoryQuestion(ActivityScenario<MainActivity> scenario) throws Exception {
        for (int page = 0; page < 16 && !"true".equals(evaluate(scenario,"!document.querySelector('#club-story-dialog .story-choices').hidden")); page++) {
            assertEquals("Every story card and navigation must fit without scrolling", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('club-story-dialog'),b=d.querySelector('.story-reading'),r=d.getBoundingClientRect();return d.open&&r.top>=0&&r.bottom<=innerHeight&&d.scrollHeight<=d.clientHeight+1&&b.scrollHeight<=b.clientHeight+1;})()"));
            tapWebElement(scenario,"#club-story-dialog [data-story-page='next']");
        }
        awaitTrue(scenario,"clubStoryPage===clubStoryPages(ClubStory.scene(season,clubStoryEvent)).length-1&&!document.querySelector('#club-story-dialog .story-choices').hidden");
    }
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
        android.util.Log.i("GameSmoke", "offline-game:await-ready");
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
        while (System.nanoTime() < until) {
            if ("true".equals(evaluate(scenario, "!!(window.WinAgainAndroid && typeof season !== 'undefined' && document.getElementById('primary'))"))) {
                AtomicReference<Boolean> nativeReady = new AtomicReference<>(false);
                scenario.onActivity(activity -> nativeReady.set(activity.gameReadyForTest()));
                if (nativeReady.get()) {
                    android.util.Log.i("GameSmoke", "offline-game:ready");
                    return;
                }
            }
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
    private void awaitLoadingLayout(ActivityScenario<MainActivity> scenario) throws Exception {
        long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < until) {
            AtomicReference<Boolean> laidOut = new AtomicReference<>(false);
            scenario.onActivity(activity -> laidOut.set(activity.loadingBrandLaidOutForTest()));
            if (laidOut.get()) return;
            Thread.sleep(50);
        }
        fail("Loading preview never reached a measured native layout");
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
        android.util.Log.i("GameSmoke", "web-frame:await");
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
        android.util.Log.i("GameSmoke", "web-frame:drawn");
    }
    private void assertVisibleWebText(ActivityScenario<MainActivity> scenario, String selector, String text) throws Exception {
        assertEquals("Requested screen text must be visible: " + text, "true", evaluate(scenario,
            "(()=>{const element=document.querySelector('" + selector + "');if(!element)return false;const r=element.getBoundingClientRect();" +
            "return element.textContent.includes('" + text + "')&&r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight;})()"));
    }
    private void dragTacticalForward(ActivityScenario<MainActivity> scenario) throws Exception {
        evaluate(scenario, "document.querySelector('.tactical-pitch').scrollIntoView({block:'center',behavior:'instant'});true");
        awaitWebViewFrame(scenario); awaitAppWindowFocus(scenario);
        String encoded = evaluate(scenario, "(()=>{const a=document.querySelector('[data-tactical-player=f1]').getBoundingClientRect(),p=document.querySelector('.tactical-pitch').getBoundingClientRect();return JSON.stringify([a.x+a.width/2,a.y+a.height/2,p.x+p.width*.5,p.y+p.height*.49,devicePixelRatio]);})()");
        JSONArray points = new JSONArray(new JSONTokener(encoded).nextValue().toString());
        int[] origin = new int[2];scenario.onActivity(activity -> activity.gameViewForTest().getLocationOnScreen(origin));
        float sx=origin[0]+(float)(points.getDouble(0)*points.getDouble(4)),sy=origin[1]+(float)(points.getDouble(1)*points.getDouble(4));
        float tx=origin[0]+(float)(points.getDouble(2)*points.getDouble(4)),ty=origin[1]+(float)(points.getDouble(3)*points.getDouble(4));
        Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();long start=SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(start,start,MotionEvent.ACTION_DOWN,sx,sy,0);instrumentation.sendPointerSync(down);down.recycle();
        for(int step=1;step<=10;step++){SystemClock.sleep(20);MotionEvent move=MotionEvent.obtain(start,SystemClock.uptimeMillis(),MotionEvent.ACTION_MOVE,sx+(tx-sx)*step/10,sy+(ty-sy)*step/10,0);instrumentation.sendPointerSync(move);move.recycle();}
        MotionEvent up=MotionEvent.obtain(start,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,tx,ty,0);instrumentation.sendPointerSync(up);up.recycle();
        // Native pointer drag targets the exact CM slot; occupied positions now swap.
        awaitTrue(scenario,"(()=>{const p=customPositions[state.players.f1.identity];return p&&p[0]===50&&p[1]===49&&document.querySelector('[data-tactical-player=f1] em').textContent==='CM';})()");
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
        android.util.Log.i("GameSmoke", "tap:" + selector);
        String quotedSelector = JSONObject.quote(selector);
        awaitTrue(scenario,"(()=>{const element=document.querySelector("+quotedSelector+");if(!element)return false;const r=element.getBoundingClientRect();return r.width>0&&r.height>0;})()");
        evaluate(scenario, "document.querySelector(" + quotedSelector + ").scrollIntoView({block:'center',behavior:'instant'});true");
        awaitWebViewFrame(scenario); awaitAppWindowFocus(scenario);
        String pointJson = "null";
        // A DOM node can be replaced while the software-rendered frame commits.
        // Reacquire the actual visible element; do not retry or simulate a click.
        for (int attempt = 0; attempt < 3 && "null".equals(pointJson); attempt++) {
            awaitTrue(scenario,"(()=>{const e=document.querySelector("+quotedSelector+");if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;})()");
            pointJson = evaluate(scenario,
                "(()=>{const e=document.querySelector(" + quotedSelector + ");if(!e)return null;const r=e.getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,devicePixelRatio])})()");
            if ("null".equals(pointJson)) awaitWebViewFrame(scenario);
        }
        assertNotEquals("Tap target disappeared before dispatch: " + selector, "null", pointJson);
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
            // Other smoke tests deliberately save full-time matches. This round-trip
            // needs its own preparation fixture so test order cannot replace kickoff
            // with result confirmation. The production import/save path is unchanged.
            assertEquals("true", evaluate(scenario,
                "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());" +
                "season=S.create(4091);state=season.match;appSessionStarted=true;view='club';render();save();return state.phase==='prep';})()"));
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
            tapWebElement(scenario, "[data-management-open='staff-panel']");
            assertEquals("Coach screen must select the squad and display its faces", "true", evaluate(scenario,
                "(()=>{document.querySelector('[data-staff-role]').open=true;const panel=document.getElementById('staff-panel');" +
                "panel.scrollIntoView({block:'start',behavior:'instant'});const face=panel.querySelector('.staff-portrait').getBoundingClientRect();" +
                "return view==='squad'&&!document.getElementById('squad-pane').hidden&&" +
                "document.querySelector('[data-view=squad]').getAttribute('aria-current')==='page'&&face.width>0&&face.height>0&&face.top>=0&&face.bottom<innerHeight;})()"));
            assertVisibleWebText(scenario, "#staff-heading", "코치 계약");
            screenshot(scenario, "android-coaches.png");
            tapWebElement(scenario, "#management-close");
            assertEquals("true", evaluate(scenario,
                "(()=>{save();const original=JSON.stringify(currentCampaignPayload());const file=CampaignFile.stringify(currentCampaignPayload());" +
                "previewCampaignText(file);const restored=applyCampaignImport();return restored&&JSON.stringify(currentCampaignPayload())===original;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{const raw=localStorage.getItem('win-again-season-v17');let rejected=false;" +
                "try{CampaignFile.read('{\\\"broken\\\":true}')}catch{rejected=true}return rejected&&localStorage.getItem('win-again-season-v17')===raw;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{setView('match');document.getElementById('primary').click();const d=document.getElementById('match-ceremony');if(state.phase!=='prep'||!d.open||d.dataset.kind!=='preview')return false;document.getElementById('ceremony-ready').click();if(d.dataset.kind!=='kickoff'||!state.stoppage)return false;document.getElementById('ceremony-ready').click();WinAgainAndroid.pause();return F.running(state)&&state.paused&&!!localStorage.getItem('win-again-season-v17');})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{openPortability();const consumed=WinAgainAndroid.handleBack();return consumed&&!document.getElementById('portability-dialog').open;})()"));
            assertEquals("true", evaluate(scenario,
                "(()=>{setView('squad');return WinAgainAndroid.handleBack()&&view==='club';})()"));
            fingerprint = evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,phase:state.phase,minute:state.minute,rng:state.rng})");
            scenario.onActivity(activity -> assertTrue("Game emitted JavaScript console errors: " + activity.consoleErrorsForTest(), activity.consoleErrorsForTest().isEmpty()));
            evaluate(scenario, "window.scrollTo(0,0);true");
            screenshot(scenario, "android-game.png");
            tapWebElement(scenario, "[data-management-open='club-life-panel']");
            assertEquals("The journal opens inside the management dialog", "true", evaluate(scenario,
                "(()=>{const panel=document.getElementById('club-life-panel');" +
                "panel.scrollIntoView({block:'start',behavior:'instant'});return view==='club'&&!mobileDashboardExpanded&&" +
                "document.getElementById('management-dialog').open&&document.getElementById('management-content').contains(panel)&&getComputedStyle(panel).display!=='none'&&panel.querySelectorAll('.voice-article').length===3&&" +
                "!panel.querySelector('details.life-newspaper');})()"));
            assertVisibleWebText(scenario, "#life-club-heading", "기자실");
            screenshot(scenario, "android-interviews.png");
            assertVisibleWebText(scenario, "#life-club-heading", "기자실");
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals(fingerprint, evaluate(reopened, "JSON.stringify({year:season.year,round:season.round,phase:state.phase,minute:state.minute,rng:state.rng})"));
            assertEquals("true", evaluate(reopened, "state.paused"));
            reopened.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void titleMenuHomeAndCompactLiveMatch() throws Exception {
        android.util.Log.i("GameSmoke", "title-test:launch");
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            android.util.Log.i("GameSmoke", "title-test:activity-launched");
            awaitReady(scenario);
            // Independently exercise first arrival even when another test saved a campaign.
            evaluate(scenario, "(()=>{season=S.create(4092);state=season.match;managerIntroBypass=false;localStorage.removeItem(managerGuideKey);render();return true;})()");
            assertEquals("true", evaluate(scenario, "!appSessionStarted&&!document.getElementById('launch-screen').hidden&&document.querySelector('.app').hidden"));
            String before = evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})");
            screenshot(scenario, "android-title-menu.png");
            tapWebElement(scenario, "#launch-continue");
            awaitTrue(scenario, "appSessionStarted||document.getElementById('manager-guide').open");
            if ("true".equals(evaluate(scenario, "document.getElementById('manager-guide').open"))) {
                assertEquals("First arrival introduces the contract before the club's fall", "true", evaluate(scenario,
                    "managerGuideStep===0&&document.getElementById('manager-guide-copy').textContent.includes('계약서')"));
                evaluate(scenario, "(()=>{window.managerArtDecoded=false;const image=new Image();image.src=ClubArt.managerAsset;image.decode().then(()=>window.managerArtDecoded=image.naturalWidth===1536&&image.naturalHeight===1024);return true;})()");
                awaitTrue(scenario, "window.managerArtDecoded===true");
                assertManagerArrivalFits(scenario);
                screenshot(scenario, "android-manager-first-arrival.png");
                assertEquals("true", evaluate(scenario, "document.getElementById('manager-guide-skip').hidden"));
                tapWebElement(scenario, "#manager-guide-next");
                assertEquals("Second arrival explains the actual fifth-tier challenge before the owner meeting", "true", evaluate(scenario,
                    "managerGuideStep===1&&(document.getElementById('manager-guide-title').textContent+document.getElementById('manager-guide-copy').textContent).includes('토투넘')&&document.getElementById('manager-guide-copy').textContent.includes('24팀, 46경기')&&document.getElementById('manager-guide-skip').hidden"));
                assertManagerArrivalFits(scenario);
                tapWebElement(scenario, "#manager-guide-next");
                awaitTrue(scenario, "document.getElementById('club-story-dialog').open&&clubStoryRequired");
                evaluate(scenario, "WinAgainAndroid.handleBack()");
                assertEquals("true", evaluate(scenario, "document.getElementById('club-story-dialog').open"));
                screenshot(scenario, "android-first-owner-meeting.png");
                reachStoryQuestion(scenario);
                awaitTrue(scenario, "ClubStory.scene(season,clubStoryEvent).step===0");
                tapWebElement(scenario, "#club-story-dialog [data-story-choice]");
                awaitTrue(scenario, "ClubStory.scene(season,clubStoryEvent).step===1&&clubStoryPage===0");
                reachStoryQuestion(scenario);
                awaitTrue(scenario, "ClubStory.scene(season,clubStoryEvent).step===1");
                tapWebElement(scenario, "#club-story-dialog [data-story-choice]");
                awaitTrue(scenario, "ClubStory.scene(season,clubStoryEvent).step===2&&!!document.querySelector('#club-story-dialog .story-complete')");
                tapWebElement(scenario, "#club-story-dialog footer [data-story-close]");
                awaitTrue(scenario, "document.getElementById('manager-guide').open&&managerGuideStep===2");
                tapWebElement(scenario, "#manager-guide-skip");
            }
            awaitTrue(scenario, "appSessionStarted&&view==='club'&&document.getElementById('launch-screen').hidden");
            assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
            assertEquals("true", evaluate(scenario, "getComputedStyle(document.getElementById('club-life-panel')).display==='none'&&document.querySelectorAll('#club-press-desk .voice-article').length===3&&!!document.querySelector('#club-press-desk .voice-interview')"));
            assertEquals("New stadium illustration must be visible on the default home", "true", evaluate(scenario,
                "(()=>{const art=document.querySelector('#mobile-command-center .club-growth-picture');return !!art&&art.getBoundingClientRect().width>0&&getComputedStyle(art).backgroundImage.includes('data:image/webp');})()"));
            evaluate(scenario, "(()=>{window.newArtDecoded=false;Promise.all([Portraits.expandedAsset,ClubArt.asset,ClubArt.promotionAsset,Portraits.extraAsset,ClubGrowth.asset,ClubArt.storyAsset,ClubArt.momentAsset,ClubArt.deadballAsset,ClubArt.memoryAsset,ClubArt.voiceAsset].map(src=>{const image=new Image();image.src=src;return image.decode().then(()=>image.naturalWidth);})).then(widths=>window.newArtDecoded=widths[0]===1254&&widths[1]===2048&&widths[2]===1672&&widths[3]===1254&&widths[4]===2048&&widths[5]===2048&&widths[6]===1672&&widths[7]===960&&widths[8]===1536&&widths[9]===768).catch(()=>window.newArtDecoded=false);return true;})()");
            awaitTrue(scenario, "window.newArtDecoded===true");
            assertEquals("Opponent lineup must retain eleven distinct faces in the expanded atlas", "true", evaluate(scenario,
                "(()=>{const rows=Opposition.roster(S.opponentFor(season)),indices=rows.map(p=>Portraits.index(p));return new Set(indices).size===11&&rows.every(p=>Portraits.html(p).includes('--portrait-size:800% 800%'));})()"));
            screenshot(scenario, "android-home-media.png");
            tapWebElement(scenario, "[data-management-open='club-story-panel']");
            awaitTrue(scenario, "document.getElementById('manager-notebook').open&&!!notebookRows");
            tapWebElement(scenario, "#manager-notebook [data-notebook-tab='complete']");
            tapWebElement(scenario, "#manager-notebook [data-notebook-event='1:arrival']");
            awaitTrue(scenario, "document.getElementById('club-story-dialog').open&&clubStoryEvent==='1:arrival'");
            String storyBefore = evaluate(scenario, "JSON.stringify(season)");
            int storyPages = Integer.parseInt(evaluate(scenario, "clubStoryPages(ClubStory.scene(season,clubStoryEvent)).length"));
            while (!"true".equals(evaluate(scenario, "document.querySelector('[data-story-page=previous]').disabled"))) {
                int fromPage = Integer.parseInt(evaluate(scenario, "clubStoryPage"));
                tapWebElement(scenario, "#club-story-dialog [data-story-page=previous]");
                awaitTrue(scenario, "document.getElementById('club-story-dialog').open&&clubStoryPage===" + (fromPage - 1));
            }
            for (int page = 0; page < storyPages; page++) {
                assertEquals("The physical touch must reach the requested story page", String.valueOf(page), evaluate(scenario, "clubStoryPage"));
                assertEquals("Narrative page " + page + " must stay inside the phone dialog", "true", evaluate(scenario,
                    "(()=>{const d=document.getElementById('club-story-dialog'),buttons=[...d.querySelectorAll('button')].filter(b=>b.getClientRects().length);return d.open&&ClubStory.scene(season,clubStoryEvent).step===2&&d.scrollHeight<=d.clientHeight+1&&buttons.length>=3&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight;})&&getComputedStyle(d.querySelector('.story-art,.memory-art')).backgroundImage.includes('data:image/webp');})()"));
                if (page < storyPages - 1) {
                    tapWebElement(scenario, "#club-story-dialog [data-story-page=next]");
                    awaitTrue(scenario, "document.getElementById('club-story-dialog').open&&clubStoryPage===" + (page + 1));
                }
            }
            assertEquals("Reading every story page must preserve the campaign", storyBefore, evaluate(scenario, "JSON.stringify(season)"));
            screenshot(scenario, "android-story-chapter.png");
            tapWebElement(scenario, "#club-story-dialog footer [data-story-close]");
            awaitTrue(scenario, "!document.getElementById('club-story-dialog').open&&!document.getElementById('manager-notebook').open");

            tapWebElement(scenario, "#mobile-match-action");
            awaitTrue(scenario, "view==='match'&&!document.getElementById('match-pane').hidden");
            assertEquals("Visible speed picker must have four choices and preserve match state", "true", evaluate(scenario,
                "(()=>{const e=document.getElementById('pause'),before=JSON.stringify(season);if(e.tagName!=='SELECT'||e.options.length!==4)return false;e.value='rapid';e.dispatchEvent(new Event('change',{bubbles:true}));return playbackPrefs.speed==='rapid'&&JSON.stringify(season)===before;})()"));

            assertEquals("true", evaluate(scenario, "document.querySelectorAll('#players button:disabled').length===11"));
            assertEquals("true", evaluate(scenario, "!document.getElementById('match-popup').open&&document.getElementById('matchday-live').hidden===false"));
            assertEquals("Preparation HUD waits for real recorded match statistics", "true", evaluate(scenario,
                "(()=>{const h=document.getElementById('match-live-stats').textContent;return h.includes('기록 대기')&&h.includes('기대 득점')&&h.includes('선발 체력')&&h.includes('공 점유율')&&document.querySelectorAll('#match-live-stats .live-stat-row').length===12;})()"));
            assertEquals("Preparation offers lineup and opponent directly", "true", evaluate(scenario,
                "document.getElementById('matchday-roster').textContent==='선발 · 후보'&&document.getElementById('match-open-details').dataset.matchPopup==='opponent'"));
            tapWebElement(scenario, "#match-open-details");
            awaitTrue(scenario, "document.getElementById('match-popup').open");
            awaitTrue(scenario, "!document.getElementById('opposition-report').hidden&&document.querySelectorAll('.opposition-roster tbody tr').length===11");
            assertEquals("true", evaluate(scenario, "document.getElementById('opposition-report').textContent.includes('전술 성향')&&document.getElementById('opposition-report').textContent.includes('체력')"));
            assertEquals("Readable opponent summary and roster must precede detailed analysis", "true", evaluate(scenario,
                "(()=>{const host=document.getElementById('opposition-report'),roster=host.querySelector('.opposition-roster'),coach=host.querySelector('.opposition-coach-analysis'),name=host.querySelector('.opposition-player-name');return host.querySelectorAll('.opposition-snapshot dd').length===4&&!!(roster.compareDocumentPosition(coach)&Node.DOCUMENT_POSITION_FOLLOWING)&&parseFloat(getComputedStyle(name).fontSize)>=12;})()"));
            screenshot(scenario, "android-opposition-report.png");
            tapWebElement(scenario, ".opposition-player-button");
            awaitTrue(scenario, "document.getElementById('opponent-detail-dialog').open");
            assertEquals("Rival detail retains exact abilities and a full original portrait inside its popup", "true", evaluate(scenario,
                "(()=>{const d=OpponentDetails.read(season,opponentDetailIdentity),dialog=document.getElementById('opponent-detail-dialog'),r=dialog.getBoundingClientRect();return d.valid&&d.rows.length===6&&dialog.querySelectorAll('tbody tr').length===6&&dialog.querySelector('.portrait-large').dataset.portraitIndex===String(Portraits.index(d.person))&&dialog.querySelector('select').getBoundingClientRect().height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.width<=innerWidth;})()"));
            screenshot(scenario, "android-opponent-player.png");
            evaluate(scenario, "WinAgainAndroid.handleBack()");
            awaitTrue(scenario, "!document.getElementById('opponent-detail-dialog').open&&document.getElementById('match-popup').open&&matchPopupActive==='opponent'");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            tapWebElement(scenario, "#matchday-roster");
            awaitTrue(scenario, "document.querySelectorAll('#match-popup-roster [data-matchday-player]').length===11");
            assertEquals("Starter and bench comparison must show ability, fitness and condition", "true", evaluate(scenario,
                "(()=>{const first=document.querySelector('#match-popup-roster [data-matchday-player]'),bench=document.getElementById('bench'),chooser=document.getElementById('match-popup-select');return first.textContent.includes('종합')&&first.textContent.includes('체력')&&bench.textContent.includes('컨디션')&&chooser.value==='roster'&&first.getBoundingClientRect().height>=44;})()"));
            assertEquals("Generic substitution starts without a selected player and keeps all eighteen choices visible", "true", evaluate(scenario,
                "(()=>{const root=document.getElementById('match-popup-roster'),rows=[...root.querySelectorAll('[data-matchday-player],[data-bench]')],r=root.getBoundingClientRect();return selected===null&&rows.length===18&&rows.every(e=>{const b=e.getBoundingClientRect();return b.height>=44&&b.top>=r.top&&b.bottom<=r.bottom+1;});})()"));
            screenshot(scenario, "android-starter-comparison.png");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            awaitTrue(scenario, "!document.getElementById('match-popup').open");
            assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
            assertEquals("Score, pitch and main action must share the phone viewport", "true", evaluate(scenario,
                "(()=>{const p=document.getElementById('pitch').getBoundingClientRect(),b=document.getElementById('primary').getBoundingClientRect(),s=document.querySelector('.scoreboard').getBoundingClientRect();return s.top>=0&&p.top>=0&&(p.right<=b.left+1||p.bottom<=b.top+1)&&b.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1;})()"));
            assertEquals("All twelve match facts remain inside the side panel", "true", evaluate(scenario,
                "(()=>{const h=document.getElementById('match-live-stats'),r=h.getBoundingClientRect();return h.scrollHeight<=h.clientHeight+1&&h.scrollWidth<=h.clientWidth+1&&[...h.querySelectorAll('.live-stat-row')].every(e=>{const b=e.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;});})()"));
            screenshot(scenario, "android-compact-match.png");
            evaluate(scenario, "openMatchPopup('setpieces');true");
            awaitTrue(scenario, "matchPopupActive==='setpieces'&&document.querySelectorAll('[data-deadball-role]').length===3");
            assertEquals("Three specialist roles and their portraits fit without scrolling", "true", evaluate(scenario,
                "(()=>{const host=document.getElementById('match-popup-setpieces'),body=host.closest('.match-popup-body');return body.scrollHeight<=body.clientHeight+1&&host.querySelectorAll('.player-portrait').length===3&&[...host.querySelectorAll('select')].every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight;});})()"));
            assertEquals("Role selection persists the actual identity without consuming RNG", "true", evaluate(scenario,
                "(()=>{const rng=state.rng,e=document.querySelector('[data-deadball-role=freeKick]');e.value='m1';e.dispatchEvent(new Event('change',{bubbles:true}));return season.plan.setPieces.freeKick===state.players.m1.identity&&state.rng===rng&&JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))===JSON.stringify(season);})()"));
            screenshot(scenario, "android-set-piece-room.png");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");

            evaluate(scenario, "openMatchPopup('brief');true");
            awaitTrue(scenario, "matchPopupActive==='brief'&&document.querySelectorAll('.brief-flow ol li').length===6");
            assertEquals("The match brief must fit without scrolling and retain real counters", "true", evaluate(scenario,
                "(()=>{const body=document.querySelector('#match-popup .match-popup-body'),buttons=[...document.querySelectorAll('[data-brief-target]')];return body.scrollHeight<=body.clientHeight+1&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight;})&&MatchBrief.read(state).score.join(':')===state.score.join(':');})()"));
            screenshot(scenario, "android-match-brief.png");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            tapWebElement(scenario, "#match-bench-events");
            awaitTrue(scenario, "matchPopupActive==='talk'&&document.querySelectorAll('[data-life-talk]').length===4");
            tapWebElement(scenario, "[data-life-talk='encourage']");
            awaitTrue(scenario, "document.querySelectorAll('.life-reaction-card').length===11");
            assertEquals("All saved player reactions and faces fit the phone", "true", evaluate(scenario,
                "(()=>{const cards=[...document.querySelectorAll('.life-reaction-card')];return cards.length===11&&cards.every(e=>{const r=e.getBoundingClientRect(),face=e.querySelector('.player-portrait');return r.top>=0&&r.bottom<=innerHeight&&face.getBoundingClientRect().width>0;})&&JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))===JSON.stringify(season);})()"));
            screenshot(scenario, "android-player-reactions.png");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            if ("true".equals(evaluate(scenario, "state.phase!=='full'"))) {
                tapWebElement(scenario, ".match-quick-menu [data-match-popup='tactics']");
                awaitTrue(scenario, "document.querySelectorAll('#tactical-editor input[type=range]').length===0&&document.querySelector('#formation').options.length===12&&document.querySelectorAll('.formation-quick-orders [data-instruction-select]').length===2");
                dragTacticalForward(scenario);
                screenshot(scenario, "android-drag-position.png");
                assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
                assertEquals("tactics", new JSONTokener(evaluate(scenario, "view")).nextValue().toString());
                tapWebElement(scenario, ".view-nav [data-view=match]");
            }

            evaluate(scenario, "(()=>{while(state.phase!=='full'){if(!F.running(state))F.begin(state);state.paused=false;F.finishSegment(state);}render();openMatchPopup('stats');return true;})()");
            awaitTrue(scenario, "document.getElementById('match-replay-open')&&!document.getElementById('match-replay-entry').hidden");
            String replayBefore = evaluate(scenario, "JSON.stringify(season)");
            assertEquals("Every compact match report page keeps full names, records and controls inside the phone", "[]", evaluate(scenario,
                "(()=>{const failures=[],select=document.getElementById('match-report-select'),body=document.querySelector('.match-popup-body');for(const tab of ['핵심 기록','코치의 복기','팀 비교','선수 평점','주요 장면']){select.value=tab;select.dispatchEvent(new Event('change'));do{if(body.scrollHeight>body.clientHeight+1||body.scrollWidth>body.clientWidth+1)failures.push(tab+':'+matchReportPage);const next=document.querySelector('[data-match-report-page=\"1\"]');if(!next||next.disabled)break;next.click();}while(true);}select.value='핵심 기록';select.dispatchEvent(new Event('change'));return failures;})()"));
            assertEquals(replayBefore, evaluate(scenario, "JSON.stringify(season)"));
            screenshot(scenario, "android-compact-match-report.png");
            tapWebElement(scenario, "#match-replay-open");
            awaitTrue(scenario, "document.getElementById('match-replay-dialog').open");
            assertEquals("Actual event replay fits with a visible ball and touch controls", "true", evaluate(scenario,
                "(()=>{const dialog=document.getElementById('match-replay-dialog'),r=dialog.getBoundingClientRect(),canvas=document.getElementById('match-replay-field'),v=MatchReplay.frame(matchReplayClip,3700);return dialog.querySelector('select').options.length===MatchReplay.read(season).scenes.length&&canvas.width>0&&v.own.length>=7&&v.opponent.length>=7&&Number.isFinite(v.ball.x)&&r.top>=0&&r.bottom<=innerHeight&&r.width<=innerWidth&&[...dialog.querySelectorAll('button,select,input')].every(e=>e.getBoundingClientRect().height>=44);})()"));
            tapWebElement(scenario, "#match-replay-play");
            awaitTrue(scenario, "matchReplayAge>250");
            evaluate(scenario, "stopMatchReplay();true");
            screenshot(scenario, "android-match-replay.png");
            evaluate(scenario, "WinAgainAndroid.handleBack()");
            awaitTrue(scenario, "!document.getElementById('match-replay-dialog').open&&document.getElementById('match-popup').open&&matchReplayRAF===null");
            assertEquals(replayBefore, evaluate(scenario, "JSON.stringify(season)"));
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void wholeSquadGuideAndKeywordFreeMarket() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());season=S.create(4088);state=season.match;appSessionStarted=true;view='club';render();openManagerGuide(2);return true;})()");
            tapWebElement(scenario, "#manager-guide-open");
            awaitTrue(scenario, "document.getElementById('squad-overview-dialog').open&&document.querySelectorAll('[data-squad-detail]').length===18");
            assertEquals("true", evaluate(scenario, "(()=>{const d=document.getElementById('squad-overview-dialog').getBoundingClientRect(),list=document.querySelector('.squad-overview-list');return d.top>=0&&d.bottom<=innerHeight&&d.width<=innerWidth&&list.clientHeight>80&&list.scrollHeight<=list.clientHeight+1;})()"));
            screenshot(scenario, "android-whole-squad.png");
            tapWebElement(scenario, "[data-squad-detail='sp_f1']");
            awaitTrue(scenario, "squadOverviewSelectedIdentity==='sp_f1'&&document.getElementById('squad-overview-preview').textContent.includes('손헝민')&&!document.getElementById('player-detail-dialog').open");
            tapWebElement(scenario, "#squad-overview-detail");
            awaitTrue(scenario, "document.getElementById('player-detail-dialog').open&&document.getElementById('player-detail-name').textContent==='손헝민'");
            assertEquals("New starter portrait must show Son's dedicated cell and bundled offline atlas", "true", evaluate(scenario, "document.querySelector('.detail-hero .player-portrait').dataset.portraitIndex==='14'&&Portraits.index('sp_f1')===14&&getComputedStyle(document.querySelector('.detail-hero .player-portrait')).backgroundImage.includes('data:image/webp')"));
            evaluate(scenario, "WinAgainAndroid.handleBack()");
            awaitTrue(scenario, "!document.getElementById('player-detail-dialog').open&&document.getElementById('squad-overview-dialog').open&&managerGuideStep===2");
            tapWebElement(scenario, "#squad-overview-close");
            awaitTrue(scenario, "document.getElementById('manager-guide').open&&managerGuideStep===2");
            tapWebElement(scenario, "#manager-guide-open");
            awaitTrue(scenario, "document.getElementById('squad-overview-dialog').open&&!!document.querySelector('[data-guide-forward]')");
            tapWebElement(scenario, "[data-guide-forward]");
            awaitTrue(scenario, "document.getElementById('manager-guide').open&&managerGuideStep===3");
            tapWebElement(scenario, "#manager-guide-open");
            awaitTrue(scenario, "document.getElementById('match-popup').open&&matchPopupActive==='tactics'");
            assertEquals("Guided tactics reserve space for the pitch and navigation", "true", evaluate(scenario,
                "(()=>{const pitch=document.querySelector('.tactical-pitch').getBoundingClientRect(),buttons=[...document.querySelectorAll('#match-popup .manager-guide-rail button')];return pitch.height>100&&buttons.length===3&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.top>=pitch.bottom&&r.bottom<=innerHeight;});})()"));
            tapWebElement(scenario, "#match-popup [data-guide-forward]");
            awaitTrue(scenario, "document.getElementById('manager-guide').open&&managerGuideStep===4");

            evaluate(scenario, "(()=>{managerGuideActive=false;managerGuideWaiting=null;document.getElementById('manager-guide').close();setView('market');return true;})()");
            tapWebElement(scenario, "[data-management-open='transfer-search-panel']");
            assertEquals("true", evaluate(scenario, "document.getElementById('management-dialog').open&&document.getElementById('management-content').contains(document.getElementById('market-overview'))"));
            assertEquals("8", evaluate(scenario, "document.querySelectorAll('.market-card').length"));
            evaluate(scenario, "(()=>{const p=document.getElementById('transfer-position');p.value='FW';p.dispatchEvent(new Event('change'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===8&&document.getElementById('transfer-query').value===''");
            evaluate(scenario, "(()=>{const q=document.getElementById('transfer-query');q.value='없는 이름';q.dispatchEvent(new Event('input'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===0");
            evaluate(scenario, "(()=>{const q=document.getElementById('transfer-query');q.value='';q.dispatchEvent(new Event('input'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===8");
            assertEquals("All four recruitment comparisons stay above the fixed review button", "true", evaluate(scenario,
                "(()=>{const body=document.querySelector('.market-card:not([hidden]) .market-card-content'),last=body.querySelector('.market-quick-comparison>div:last-child');return last.getBoundingClientRect().bottom<=body.getBoundingClientRect().bottom+1;})()"));
            screenshot(scenario, "android-keyword-free-market.png");
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void pagedPlayerAndTacticsReportsFitWithoutChangingTheCampaign() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());season=S.create(4095);state=season.match;appSessionStarted=true;view='match';render();return true;})()");
            String before = evaluate(scenario, "JSON.stringify(season)");
            assertEquals("Complete biography, all abilities and every report fit the actual landscape phone", "[]", evaluate(scenario,
                "(()=>{const failures=[];for(const id of ['sp_f1',Object.values(season.squad).find(p=>p.pos==='GK').identity]){openPlayerDetails(id);const d=document.getElementById('player-detail-dialog'),s=d.querySelector('.report-page-select'),b=d.querySelector('.report-page-body');for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));if(b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1||b.getBoundingClientRect().bottom>d.getBoundingClientRect().bottom)failures.push(id+':'+o.value);}const actual=[...d.querySelectorAll('[data-scout-attribute]')].map(e=>e.dataset.scoutAttribute).sort(),expected=PlayerDetails.read(season,id).attributes.flatMap(g=>g.items.map(i=>i.key)).sort();if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push(id+':missing attributes');const bio=d.querySelector('.player-identity-panel');if(bio.scrollHeight>bio.clientHeight+1||!['주발','선호 포지션','키','나이','주급'].every(t=>bio.textContent.includes(t)))failures.push(id+':incomplete biography');closePlayerDetails();}return failures;})()"));
            evaluate(scenario, "openPlayerDetails('sp_f1');document.querySelector('#player-detail-dialog .report-page-select').value='전체 능력';document.querySelector('#player-detail-dialog .report-page-select').dispatchEvent(new Event('change'));true");
            screenshot(scenario, "android-paged-player.png");
            evaluate(scenario, "closePlayerDetails();openMatchPopup('tactics');true");
            assertEquals("Tactical pages must keep all eleven players and controls in the viewport", "[]", evaluate(scenario,
                "(()=>{const failures=[],b=document.querySelector('.match-popup-body');selected='f1';render();for(const tab of ['overview','roles','support']){landscapeTacticsTab=tab;applyLandscapeTactics();if(b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1)failures.push(tab);}landscapeTacticsTab='overview';applyLandscapeTactics();const pitch=document.querySelector('.tactical-pitch').getBoundingClientRect(),profile=document.querySelector('.tactical-selected-profile').getBoundingClientRect();if(pitch.right>profile.left||!profile.height)failures.push('simultaneous pitch and profile');if(document.querySelectorAll('[data-tactical-player]').length!==11)failures.push('missing starters');if(document.getElementById('match-popup-select').getClientRects().length)failures.push('native menu shown');return failures;})()"));
            screenshot(scenario, "android-paged-tactics.png");
            evaluate(scenario, "openMatchPopup('analysis');true");
            assertEquals("Analysis pages must not hide overflow below the dialog", "[]", evaluate(scenario,
                "(()=>{const failures=[],s=document.querySelector('#tactics-board .report-page-select'),b=document.querySelector('#tactics-board .report-page-body'),outer=document.querySelector('.match-popup-body');for(const o of s.options){s.value=o.value;s.dispatchEvent(new Event('change'));if(b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1||b.getBoundingClientRect().bottom>outer.getBoundingClientRect().bottom)failures.push(o.value);}return failures;})()"));
            assertEquals(before, evaluate(scenario, "JSON.stringify(season)"));
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void lifeReviewRetainsTheActualPromiseAndEveryRecordPage() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());season=S.create(82,{rebirth:true});while(season.round<9){if(Rebirth.read(season).pending)season=Rebirth.choose(season,'bold');state=season.match;while(state.phase!=='full'){if(!F.running(state))F.begin(state);F.finishSegment(state);}season=S.settle(season);}state=season.match;appSessionStarted=true;view='club';render();openRebirth();return true;})()");
            String before = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "[data-rebirth='review']");
            awaitTrue(scenario, "document.getElementById('life-review-tab')&&document.getElementById('rebirth-title').textContent.includes('돌아보기')");
            assertEquals("Actual promise and every review page must fit without changing the campaign", "[]", evaluate(scenario,
                "(()=>{const failures=[],choose=tab=>{const select=document.getElementById('life-review-tab');select.value=tab;select.dispatchEvent(new Event('change'));};for(const tab of ['성적표','약속','경기']){choose(tab);let pages=0;do{const body=document.querySelector('#rebirth-dialog .rebirth-body');if(body.scrollHeight>body.clientHeight+1||body.scrollWidth>body.clientWidth+1)failures.push(tab+':'+rebirthReviewPage);const next=document.querySelector('[data-life-review-page=\"1\"]');if(!next||next.disabled)break;if(++pages>100){failures.push('unbounded review');break;}next.click();}while(true);}choose('약속');const promise=RebirthReview.read(season).promises.at(-1),body=document.querySelector('#rebirth-dialog .rebirth-body'),goals=promise&&promise.games.reduce((n,g)=>n+g.score[0],0);if(!promise||promise.metric!=='goals'||promise.success||promise.value!==goals||!body.textContent.includes(promise.target)||!body.textContent.includes('실제 '+goals+' 득점')||!body.textContent.includes('미달성')||!promise.games.every(g=>body.textContent.includes(g.year+'시즌 '+g.round+'R · '+g.score.join(' : '))))failures.push('actual missed promise');return failures;})()"));
            screenshot(scenario, "android-life-review.png");
            assertEquals(before, evaluate(scenario, "JSON.stringify(season)"));
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }


    @Test public void directSquadMarketFormationsAndFullArticlesFitLandscape() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;setView('club');window.denseBefore=JSON.stringify(season);return true;})()");
            assertEquals("Three article images are visible with their summaries", "true", evaluate(scenario, "(()=>{const rows=[...document.querySelectorAll('#club-press-desk .newsroom-thumb>div')];return rows.length===3&&rows.every(e=>e.getBoundingClientRect().height>10&&getComputedStyle(e).backgroundImage.startsWith('url('));})()"));
            tapWebElement(scenario, "#club-press-desk [data-news-article]");
            awaitTrue(scenario, "!!document.querySelector('#news-article-dialog:modal')&&document.querySelector('.news-article-copy').textContent.includes(articleSnapshot.paragraphs[0])&&JSON.stringify(season)===denseBefore");
            screenshot(scenario, "android-full-article.png");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario, "!document.getElementById('news-article-dialog').open");
            tapWebElement(scenario, ".view-nav [data-view=squad]");
            awaitTrue(scenario, "view==='squad'&&!document.querySelector(':modal')&&document.querySelectorAll('#squad-overview-dialog [data-squad-detail]').length===18");
            assertEquals("The full squad, all six preview attributes and lower actions fit", "true", evaluate(scenario, "(()=>{const list=document.querySelector('.squad-overview-list'),facts=document.querySelector('.squad-preview-body'),nav=document.querySelector('.view-nav').getBoundingClientRect();return list.scrollHeight<=list.clientHeight+1&&facts.scrollHeight<=facts.clientHeight+1&&facts.querySelectorAll('dl>div').length===6&&[...document.querySelectorAll('#squad-overview-dialog footer button')].every(b=>b.getBoundingClientRect().bottom<=nav.top)&&JSON.stringify(season)===denseBefore;})()"));
            screenshot(scenario, "android-inline-squad.png");
            tapWebElement(scenario, "#squad-overview-detail");
            awaitTrue(scenario, "!!document.querySelector('#player-detail-dialog:modal')");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario, "view==='squad'&&!document.querySelector(':modal')&&document.getElementById('squad-overview-dialog').open");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario, "view==='club'&&!document.querySelector(':modal')");
            tapWebElement(scenario, ".view-nav [data-view=tactics]");
            awaitTrue(scenario, "view==='tactics'&&!document.querySelector(':modal')&&document.querySelectorAll('[data-workspace-formation]').length===12&&document.querySelectorAll('[data-workspace-position]').length===23&&document.querySelectorAll('.workspace-takers select').length===3");
            assertEquals("Formation choices, player cards, numeric attributes and position chips fit internally", "true", evaluate(scenario, "(()=>{const nav=document.querySelector('.view-nav').getBoundingClientRect();return [...document.querySelectorAll('.workspace-formation-rail,.workspace-formations button,.workspace-orders button,.tactical-pitch,.tactical-pitch>button,.tactical-selected-profile,.placement-attributes,.workspace-position-picker,.workspace-position-picker button,.workspace-takers label')].every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=nav.top&&r.left>=0&&r.right<=innerWidth&&e.scrollHeight<=e.clientHeight+2&&e.scrollWidth<=e.clientWidth+2;});})()"));
            tapWebElement(scenario, "[data-workspace-formation='433']");
            awaitTrue(scenario, "state.formation==='433'&&!document.querySelector(':modal')");
            tapWebElement(scenario, "[data-workspace-formation='442']");
            evaluate(scenario, "(()=>{const a=positions().filter(r=>r.p.pos==='FW');window.denseSlots=a.map(r=>({id:r.id,identity:r.p.identity,x:r.x,y:r.y,code:tacticalPosition(r.x,r.y,r.p.pos).code}));window.denseRegistrations=JSON.stringify(Object.values(state.players).map(p=>[p.identity,p.pos]));return true;})()");
            String selectedId = new JSONTokener(evaluate(scenario, "denseSlots[0].id")).nextValue().toString();
            String targetCode = new JSONTokener(evaluate(scenario, "denseSlots[1].code")).nextValue().toString();
            tapWebElement(scenario, "[data-tactical-player='"+selectedId+"']");
            tapWebElement(scenario, "[data-workspace-position='"+targetCode+"']");
            assertEquals("Occupied positions swap actual coordinates and preserve registered identities", "true", evaluate(scenario, "(()=>{const a=denseSlots,p=positions(),one=p.find(r=>r.p.identity===a[0].identity),two=p.find(r=>r.p.identity===a[1].identity);return one.x===a[1].x&&one.y===a[1].y&&two.x===a[0].x&&two.y===a[0].y&&JSON.stringify(Object.values(state.players).map(p=>[p.identity,p.pos]))===denseRegistrations&&JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))===JSON.stringify(season);})()"));
            screenshot(scenario, "android-inline-tactics.png");
            tapWebElement(scenario, ".view-nav [data-view=market]");
            awaitTrue(scenario, "view==='market'&&!document.querySelector(':modal')&&document.querySelectorAll('[data-market-select]').length===8&&document.querySelectorAll('[data-workspace-filter]').length===5");
            String beforeFilters = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "[data-workspace-filter=FW]");
            awaitTrue(scenario, "transferFilters.position==='FW'&&document.getElementById('transfer-query').value===''&&document.querySelectorAll('[data-market-select]').length>0&&document.querySelectorAll('[data-workspace-filter]').length===5");
            assertEquals(beforeFilters, evaluate(scenario, "JSON.stringify(season)"));
            screenshot(scenario, "android-inline-market.png");
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void managerInnerVoiceAndHomeInterviewsKeepRealAnswers() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;setView('club');return true;})()");
            assertEquals("Home exposes the three recorded-fact articles and the actual reporter", "true", evaluate(scenario, "(()=>{const h=document.getElementById('club-press-desk'),n=document.querySelector('.view-nav').getBoundingClientRect();return h.querySelectorAll('.voice-article').length===3&&h.querySelectorAll('[data-life-answer]').length===3&&h.textContent.includes('(속마음)')&&h.getBoundingClientRect().bottom<=n.top;})()"));
            assertEquals("0", evaluate(scenario, "season.clubLife.press.length"));
            screenshot(scenario, "android-manager-press-home.png");
            tapWebElement(scenario, "#club-press-desk [data-life-answer='protect']");
            awaitTrue(scenario, "season.clubLife.press.length===1&&season.clubLife.press[0].choice==='protect'&&!!document.querySelector('#club-press-desk .voice-saved')");
            evaluate(scenario, "openClubStory('1:arrival');true");
            awaitTrue(scenario, "document.getElementById('club-story-dialog').open&&document.querySelectorAll('#club-story-dialog .story-block').length===3");
            assertEquals("The whole opening beat and inner thought fit together", "true", evaluate(scenario, "(()=>{const r=document.querySelector('#club-story-dialog .story-reading');return r.textContent.includes('(속마음)')&&r.textContent.includes('자네는')&&r.scrollHeight<=r.clientHeight+1&&!document.querySelector('#club-story-dialog .story-choices').hidden&&ClubStory.scene(season,'1:arrival').step===0;})()"));
            screenshot(scenario, "android-manager-inner-voice.png");
            tapWebElement(scenario, "#club-story-dialog [data-story-choice='listen']");
            awaitTrue(scenario, "ClubStory.scene(season,'1:arrival').step===1&&document.querySelector('#club-story-dialog .story-reading').textContent.includes('도망가진')");
            tapWebElement(scenario, "#club-story-dialog [data-story-choice='honest']");
            awaitTrue(scenario, "ClubStory.scene(season,'1:arrival').step===2");
            assertEquals("Canonical answers and saves survive the expanded prose", "true", evaluate(scenario, "(()=>{const copy=S.restore(JSON.parse(JSON.stringify(season)));return JSON.stringify(copy)===JSON.stringify(season)&&ClubStory.scene(copy,'1:arrival').answered.map(r=>r.choice).join(',')==='listen,honest';})()"));
            evaluate(scenario, "(()=>{storyDialog.close();F.begin(state);state.paused=true;setView('club');openManagementPanel('club-life-panel');return true;})()");
            assertEquals("Unavailable interviews have a named disabled waiting filter", "true", evaluate(scenario, "(()=>{const q=document.getElementById('voice-press-phase');return q.disabled&&q.options.length===1&&q.options[0].textContent==='다음 인터뷰 대기'&&!!document.querySelector('.voice-press-side .voice-empty')&&!document.querySelector('.voice-press-side [data-life-answer]');})()"));
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void wholeLeagueAcademyAndAutomaticGoalsFitLandscape() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeGoalScene();managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;competitionTab='league';leagueCentreRound=null;leagueCentreClub='all';setView('cup');return true;})()");
            String before = evaluate(scenario, "JSON.stringify(season)");
            assertEquals("Every league club and current fixture fit together", "true", evaluate(scenario,
                "(()=>{const h=document.getElementById('competition-centre'),r=h.getBoundingClientRect(),rows=[...h.querySelectorAll('[data-league-row]')],games=[...h.querySelectorAll('.league-fixture-score')];return rows.length===24&&games.length===12&&[...rows,...games,...h.querySelectorAll('.competition-links button')].every(e=>{const b=e.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom+1;});})()"));
            screenshot(scenario, "android-whole-league.png");
            evaluate(scenario, "(()=>{const e=document.getElementById('competition-league-round');e.value='46';e.dispatchEvent(new Event('change'));return true;})()");
            assertEquals("Later rounds do not expose invented scores", "true", evaluate(scenario, "[...document.querySelectorAll('#competition-centre .league-fixture-score b')].every(e=>e.textContent==='—')"));
            assertEquals(before, evaluate(scenario, "JSON.stringify(season)"));
            evaluate(scenario, "(()=>{season=S.scout(season,'FW');state=season.match;setView('academy');return true;})()");
            assertEquals("All three actual prospect comparisons and costs remain above the actions", "true", evaluate(scenario,
                "(()=>{const cards=[...document.querySelectorAll('.academy-candidate')];return cards.length===3&&cards.every(c=>{const body=c.querySelector('.market-card-content'),r=body.getBoundingClientRect(),q=E.quote(season,c.dataset.marketCandidate,outgoingChoices[c.dataset.marketCandidate]);return c.querySelectorAll('.market-quick-comparison>div').length===5&&[...body.querySelectorAll('.market-quick-comparison>div,.market-terms>span')].every(e=>e.getBoundingClientRect().bottom<=r.bottom+1)&&c.querySelector('.market-terms').textContent.includes(signedMoney(q.cost))&&c.querySelectorAll('button').length===2;});})()"));
            screenshot(scenario, "android-whole-academy.png");
            evaluate(scenario, "(()=>{setView('match');const pre=Opposition.preview(season);F.enableContinuous(state,{opponentFormation:pre.teams[1].formation,opponentPlayers:pre.teams[1].players,positions:positions()});F.begin(state);while(!state.logs.some(e=>e.type==='goal')&&F.running(state)&&state.minute<44)F.advanceContinuous(state,300);state.paused=true;mediaPrefs.effects=true;render();const e=state.logs.findLast(e=>e.type==='goal');if(!e)return false;showGoalScene({kind:e.team===0?'goal':'concede',minute:e.minute,player:'득점 선수',label:e.minute+'분'});return goalSceneHold;})()");
            awaitTrue(scenario, "goalSceneHold");
            screenshot(scenario, "android-auto-goal.png");
            awaitTrue(scenario, "!goalSceneHold");
            assertEquals("Dismissing a goal never resumes a manual pause", "true", evaluate(scenario, "state.paused"));
            assertEquals("Pitch has more width than the statistics", "true", evaluate(scenario, "document.getElementById('pitch').getBoundingClientRect().width>document.getElementById('match-live-stats').getBoundingClientRect().width*1.4"));
            scenario.onActivity(activity -> assertTrue(activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void continuousKickoffAndPhysicalReplaySurviveNativeRelaunch() throws Exception {
        String physical;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeGoalScene();matchCeremonyHold=false;ceremonyPending=null;managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;customPositions={};tacticalRoles={};setView('match');return true;})()");
            tapWebElement(scenario, "#primary");
            tapWebElement(scenario, "#ceremony-ready");
            awaitTrue(scenario, "state.continuousSetup?.version===9 && state.continuous.tick>20");
            assertEquals("The native live field uses the actual ball and all 22 names", "true", evaluate(scenario,
                "(()=>{state.paused=true;drawField();return document.getElementById('match-names')._labels.length===22 && Math.hypot(lastMotionFrame.ball.x-F.continuousFrame(state).ball.x,lastMotionFrame.ball.y-F.continuousFrame(state).ball.y)<0.01 && document.documentElement.scrollHeight<=innerHeight+1;})()"));
            String replayProof = evaluate(scenario,
                "(()=>{state.paused=false;for(let i=0;i<45&&!state.logs.some(e=>['goal','shot','chance'].includes(e.type));i++)F.advanceContinuous(state,600);state.paused=true;const e=state.logs.find(e=>['goal','shot','chance'].includes(e.type));if(!e)return {found:false,minute:state.minute,tick:state.continuous.tick};const before=JSON.stringify(state),clip=MatchReplay.prepare(season,state.logs.indexOf(e));save();return {found:true,minute:e.minute,tick:e.tick,valid:clip.valid,frames:clip.physical?.frames?.length||0,unchanged:JSON.stringify(state)===before};})()");
            JSONObject proof = new JSONObject(replayProof);
            assertTrue("A real first-half event must exist: " + replayProof, proof.optBoolean("found"));
            assertTrue("The recorded replay must be valid: " + replayProof, proof.optBoolean("valid"));
            assertTrue("The recorded physical replay must contain its lead-in: " + replayProof, proof.optInt("frames") > 20);
            assertTrue("Reading and saving the replay must preserve the live world: " + replayProof, proof.optBoolean("unchanged"));
            physical=evaluate(scenario, "JSON.stringify({world:state.continuous,logs:state.logs,commands:state.continuousCommands})");
            SystemClock.sleep(300);
            assertEquals(physical,evaluate(scenario,"JSON.stringify({world:state.continuous,logs:state.logs,commands:state.continuousCommands})"));
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals("A resumed native match must stay paused", "true", evaluate(reopened,"state.paused===true"));
            assertEquals(physical,evaluate(reopened,"JSON.stringify({world:state.continuous,logs:state.logs,commands:state.continuousCommands})"));
        }
    }

    @Test public void notebookAnswersAndOriginalArtSurviveNativeRelaunch() throws Exception {
        String receipt;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(734,{startingClub:true});while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);state=season.match;setView('club');save();openManagerNotebook();return true;})()");
            awaitTrue(scenario, "!!notebookRows&&notebookRows.some(d=>d.id==='1:notebook-first')");
            String selector = "#manager-notebook [data-notebook-event='1:notebook-first']";
            for (int page = 0; page < 12 && !"true".equals(evaluate(scenario, "!!document.querySelector(\"" + selector + "\")")); page++) {
                tapWebElement(scenario, "#manager-notebook [data-notebook-page='1']");
            }
            String facts = evaluate(scenario,"JSON.stringify({statistics:season.statistics,finance:season.finance,year:season.year,round:season.round})");
            tapWebElement(scenario, selector);
            assertEquals("Original offline scene and player's actual identity appear together", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('club-story-dialog'),art=d.querySelector('.memory-art'),r=d.getBoundingClientRect();return d.open&&!!art&&getComputedStyle(art).backgroundImage.includes('data:image/webp')&&!!d.querySelector('.player-portrait')&&r.top>=0&&r.bottom<=innerHeight;})()"));
            for (int step = 0; step < 2; step++) {
                for (int page = 0; page < 12 && !"true".equals(evaluate(scenario,"!document.querySelector('#club-story-dialog .story-choices').hidden")); page++) {
                    assertEquals("The entire current prose and navigation fit without scrolling", "true", evaluate(scenario,
                        "(()=>{const d=document.getElementById('club-story-dialog'),b=d.querySelector('.story-reading');return d.scrollHeight<=d.clientHeight+1&&b.scrollHeight<=b.clientHeight+1;})()"));
                    tapWebElement(scenario,"#club-story-dialog [data-story-page='next']");
                }
                tapWebElement(scenario, step == 0 ? "#club-story-dialog [data-story-choice='practical']" : "#club-story-dialog [data-story-choice='honest']");
                awaitTrue(scenario,"ClubStory.scene(season,'1:notebook-first').step==="+(step+1));
            }
            assertEquals(facts,evaluate(scenario,"JSON.stringify({statistics:season.statistics,finance:season.finance,year:season.year,round:season.round})"));
            receipt=evaluate(scenario,"JSON.stringify(season.clubStory.records.filter(r=>r.event==='1:notebook-first'))");
            assertNotEquals("Both explicit dialogue choices must have a validated receipt", "null", receipt);
            screenshot(scenario,"android-notebook-answer.png");
            scenario.onActivity(activity -> assertTrue("Notebook generated JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals(receipt,evaluate(reopened,"JSON.stringify(season.clubStory.records.filter(r=>r.event==='1:notebook-first'))"));
            assertEquals("The same explicit answers restore into the completed scene", "true", evaluate(reopened,
                "(()=>{const d=ClubStory.scene(season,'1:notebook-first');return d.step===2&&d.answered[0].choice==='practical'&&d.answered[1].choice==='honest'&&!!d.reply;})()"));
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
    @Test public void brandedLoadingFitsBothLandscapeDirections() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            awaitOrientation(scenario, Configuration.ORIENTATION_LANDSCAPE);
            scenario.onActivity(activity -> activity.showLoadingPreviewForTest());
            awaitLoadingLayout(scenario);
            scenario.onActivity(activity -> assertTrue("Initial landscape title or gauge was clipped", activity.loadingBrandFitsForTest()));
            screenshot(scenario, "android-loading-landscape-default.png");
            // A 180-degree rotation can retain the Activity, so dismiss the test-only loader first.
            scenario.onActivity(activity -> { activity.hideLoadingPreviewForTest(); activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE); });
            awaitOrientation(scenario, Configuration.ORIENTATION_LANDSCAPE); awaitReady(scenario);
            scenario.onActivity(activity -> activity.showLoadingPreviewForTest());
            awaitLoadingLayout(scenario);
            scenario.onActivity(activity -> assertTrue("Landscape title or gauge was clipped", activity.loadingBrandFitsForTest()));
            screenshot(scenario, "android-loading-landscape.png");
            scenario.onActivity(activity -> { activity.hideLoadingPreviewForTest(); activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE); });
            awaitOrientation(scenario, Configuration.ORIENTATION_LANDSCAPE);
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
