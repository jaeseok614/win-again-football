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
    private void dragTacticalForward(ActivityScenario<MainActivity> scenario) throws Exception {
        evaluate(scenario, "document.querySelector('.tactical-pitch').scrollIntoView({block:'center',behavior:'instant'});true");
        awaitWebViewFrame(scenario); awaitAppWindowFocus(scenario);
        String encoded = evaluate(scenario, "(()=>{const a=document.querySelector('[data-tactical-player=f1]').getBoundingClientRect(),p=document.querySelector('.tactical-pitch').getBoundingClientRect();return JSON.stringify([a.x+a.width/2,a.y+a.height/2,p.x+p.width*.5,p.y+p.height*.34,devicePixelRatio]);})()");
        JSONArray points = new JSONArray(new JSONTokener(encoded).nextValue().toString());
        int[] origin = new int[2];scenario.onActivity(activity -> activity.gameViewForTest().getLocationOnScreen(origin));
        float sx=origin[0]+(float)(points.getDouble(0)*points.getDouble(4)),sy=origin[1]+(float)(points.getDouble(1)*points.getDouble(4));
        float tx=origin[0]+(float)(points.getDouble(2)*points.getDouble(4)),ty=origin[1]+(float)(points.getDouble(3)*points.getDouble(4));
        Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();long start=SystemClock.uptimeMillis();
        MotionEvent down=MotionEvent.obtain(start,start,MotionEvent.ACTION_DOWN,sx,sy,0);instrumentation.sendPointerSync(down);down.recycle();
        for(int step=1;step<=10;step++){SystemClock.sleep(20);MotionEvent move=MotionEvent.obtain(start,SystemClock.uptimeMillis(),MotionEvent.ACTION_MOVE,sx+(tx-sx)*step/10,sy+(ty-sy)*step/10,0);instrumentation.sendPointerSync(move);move.recycle();}
        MotionEvent up=MotionEvent.obtain(start,SystemClock.uptimeMillis(),MotionEvent.ACTION_UP,tx,ty,0);instrumentation.sendPointerSync(up);up.recycle();
        awaitTrue(scenario,"document.querySelector('[data-tactical-player=f1] em').textContent==='AM'&&customPositions[state.players.f1.identity][1]===34");
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
        String quotedSelector = JSONObject.quote(selector);
        evaluate(scenario, "document.querySelector(" + quotedSelector + ").scrollIntoView({block:'center',behavior:'instant'});true");
        awaitWebViewFrame(scenario); awaitAppWindowFocus(scenario);
        String pointJson = evaluate(scenario,
            "(()=>{const r=document.querySelector(" + quotedSelector + ").getBoundingClientRect();return JSON.stringify([r.x+r.width/2,r.y+r.height/2,devicePixelRatio])})()");
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
            awaitTrue(scenario, "appSessionStarted||document.getElementById('manager-guide').open");
            if ("true".equals(evaluate(scenario, "document.getElementById('manager-guide').open"))) {
                assertEquals("true", evaluate(scenario, "document.getElementById('manager-guide-copy').textContent.includes('토투넘')"));
                tapWebElement(scenario, "#manager-guide-skip");
            }
            awaitTrue(scenario, "appSessionStarted&&view==='club'&&document.getElementById('launch-screen').hidden");
            assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
            assertEquals("true", evaluate(scenario, "getComputedStyle(document.getElementById('club-life-panel')).display!=='none'&&document.querySelectorAll('.media-review').length===3"));
            assertEquals("New stadium illustration must be visible on the default home", "true", evaluate(scenario,
                "(()=>{const art=document.querySelector('#mobile-command-center .club-growth-picture');return !!art&&art.getBoundingClientRect().width>0&&getComputedStyle(art).backgroundImage.includes('data:image/webp');})()"));
            evaluate(scenario, "(()=>{window.newArtDecoded=false;Promise.all([Portraits.expandedAsset,ClubArt.asset,ClubArt.promotionAsset,Portraits.extraAsset,ClubGrowth.asset,ClubArt.storyAsset,ClubArt.momentAsset,ClubArt.deadballAsset].map(src=>{const image=new Image();image.src=src;return image.decode().then(()=>image.naturalWidth);})).then(widths=>window.newArtDecoded=widths[0]===1254&&widths[1]===2048&&widths[2]===1672&&widths[3]===1254&&widths[4]===2048&&widths[5]===2048&&widths[6]===1672&&widths[7]===960).catch(()=>window.newArtDecoded=false);return true;})()");
            awaitTrue(scenario, "window.newArtDecoded===true");
            assertEquals("Opponent lineup must retain eleven distinct faces in the expanded atlas", "true", evaluate(scenario,
                "(()=>{const rows=Opposition.roster(S.opponentFor(season)),indices=rows.map(p=>Portraits.index(p));return new Set(indices).size===11&&rows.every(p=>Portraits.html(p).includes('--portrait-size:800% 800%'));})()"));
            screenshot(scenario, "android-home-media.png");
            tapWebElement(scenario, "#club-story-open");
            assertEquals("Narrative replies must stay inside the phone dialog", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('club-story-dialog'),buttons=[...d.querySelectorAll('button')];return d.open&&d.scrollHeight<=d.clientHeight+1&&buttons.length>=4&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight;})&&getComputedStyle(d.querySelector('.story-art')).backgroundImage.includes('data:image/webp');})()"));
            screenshot(scenario, "android-story-chapter.png");
            tapWebElement(scenario, "#club-story-dialog [data-story-close]");

            tapWebElement(scenario, "#mobile-match-action");
            awaitTrue(scenario, "view==='match'&&!document.getElementById('match-pane').hidden");
            assertEquals("Visible speed picker must have four choices and preserve match state", "true", evaluate(scenario,
                "(()=>{const e=document.getElementById('pause'),before=JSON.stringify(season);if(e.tagName!=='SELECT'||e.options.length!==4)return false;e.value='rapid';e.dispatchEvent(new Event('change',{bubbles:true}));return playbackPrefs.speed==='rapid'&&JSON.stringify(season)===before;})()"));

            assertEquals("true", evaluate(scenario, "document.querySelectorAll('#players button:disabled').length===11"));
            assertEquals("true", evaluate(scenario, "!document.getElementById('match-popup').open&&document.getElementById('matchday-live').hidden===false"));
            assertEquals("Preparation HUD must compare actual starter abilities", "true", evaluate(scenario,
                "(()=>{const h=document.getElementById('match-live-stats').textContent;return h.includes('우리 종합')&&h.includes('상대 종합')&&h.includes('선발 체력')&&!h.includes('점유율');})()"));
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
            screenshot(scenario, "android-starter-comparison.png");
            tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            awaitTrue(scenario, "!document.getElementById('match-popup').open");
            assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
            assertEquals("Score, pitch and main action must share the phone viewport", "true", evaluate(scenario,
                "(()=>{const p=document.getElementById('pitch').getBoundingClientRect(),b=document.getElementById('primary').getBoundingClientRect(),s=document.querySelector('.scoreboard').getBoundingClientRect();return s.top>=0&&p.top>=0&&p.bottom<=b.top&&b.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1;})()"));
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
                awaitTrue(scenario, "document.querySelectorAll('#tactical-editor input[type=range]').length===0&&document.querySelectorAll('[data-mobile-formation]').length===12");
                dragTacticalForward(scenario);
                screenshot(scenario, "android-drag-position.png");
                assertEquals(before, evaluate(scenario, "JSON.stringify({year:season.year,round:season.round,minute:state.minute,rng:state.rng})"));
                tapWebElement(scenario, "#match-popup [aria-label='경기 메뉴 닫기']");
            }

            evaluate(scenario, "(()=>{while(state.phase!=='full'){if(!F.running(state))F.begin(state);state.paused=false;F.finishSegment(state);}render();openMatchPopup('stats');return true;})()");
            awaitTrue(scenario, "document.getElementById('match-replay-open')&&!document.getElementById('match-replay-entry').hidden");
            String replayBefore = evaluate(scenario, "JSON.stringify(season)");
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
            tapWebElement(scenario, "#manager-guide-next");
            awaitTrue(scenario, "document.getElementById('squad-overview-dialog').open&&document.querySelectorAll('[data-squad-detail]').length===18");
            assertEquals("true", evaluate(scenario, "(()=>{const d=document.getElementById('squad-overview-dialog').getBoundingClientRect(),list=document.querySelector('.squad-overview-list');return d.top>=0&&d.bottom<=innerHeight&&d.width<=innerWidth&&list.clientHeight>80;})()"));
            screenshot(scenario, "android-whole-squad.png");
            tapWebElement(scenario, "[data-squad-detail='sp_f1']");
            awaitTrue(scenario, "document.getElementById('player-detail-dialog').open&&document.getElementById('player-detail-name').textContent==='손헝민'");
            assertEquals("New starter portrait must show Son's dedicated cell and bundled offline atlas", "true", evaluate(scenario, "document.querySelector('.detail-hero .player-portrait').dataset.portraitIndex==='14'&&Portraits.index('sp_f1')===14&&getComputedStyle(document.querySelector('.detail-hero .player-portrait')).backgroundImage.includes('data:image/webp')"));
            evaluate(scenario, "WinAgainAndroid.handleBack()");
            awaitTrue(scenario, "!document.getElementById('player-detail-dialog').open&&document.getElementById('squad-overview-dialog').open&&managerGuideStep===2");
            tapWebElement(scenario, "#squad-overview-close");
            awaitTrue(scenario, "managerGuideStep===3");
            evaluate(scenario, "(()=>{managerGuideActive=false;managerGuideWaiting=null;document.getElementById('manager-guide').close();setView('market');return true;})()");
            assertEquals("8", evaluate(scenario, "document.querySelectorAll('.market-card').length"));
            evaluate(scenario, "(()=>{const p=document.getElementById('transfer-position');p.value='FW';p.dispatchEvent(new Event('change'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===8&&document.getElementById('transfer-query').value===''");
            evaluate(scenario, "(()=>{const q=document.getElementById('transfer-query');q.value='없는 이름';q.dispatchEvent(new Event('input'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===0");
            evaluate(scenario, "(()=>{const q=document.getElementById('transfer-query');q.value='';q.dispatchEvent(new Event('input'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.market-card').length===8");
            screenshot(scenario, "android-keyword-free-market.png");
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
