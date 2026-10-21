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
            // A navigation can discard a JavaScript callback. Wait for the real
            // native page/integrity/loader readiness before probing its document.
            AtomicReference<Boolean> nativeReady = new AtomicReference<>(false);
            scenario.onActivity(activity -> nativeReady.set(activity.gameReadyForTest()));
            if (nativeReady.get() && "true".equals(evaluate(scenario, "!!(window.WinAgainAndroid && typeof season !== 'undefined' && document.getElementById('primary'))"))) {
                android.util.Log.i("GameSmoke", "offline-game:ready");
                return;
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
        // A real Android configuration change can recreate the Activity between
        // drawing the PNG and reading its metadata. Probe the new document with
        // the existing bounded readiness check before reading game globals.
        awaitTrue(scenario,"typeof view!=='undefined'&&typeof mobileDashboardExpanded!=='undefined'&&!!window.WinAgainAndroid&&!!document.getElementById('club-life-panel')");
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
        assertEquals("A physical touch must hit the visible control, not an overlying dialog: " + selector, "true", evaluate(scenario,
            "(()=>{const e=document.querySelector("+quotedSelector+"),r=e?.getBoundingClientRect();if(!r)return false;const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!top&&(top===e||e.contains(top));})()"));
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

    private void assertOperationsFits(ActivityScenario<MainActivity> scenario, String label) throws Exception {
        assertEquals(label + " complete text/image/control bounds", "[]", evaluate(scenario,
            "(()=>{const issues=[],d=document.getElementById('management-dialog');for(const e of [d,...d.querySelectorAll('*')]){" +
            "if(!e.checkVisibility()||e.closest('.sr-only')||!e.getBoundingClientRect().height||['OPTION','PROGRESS'].includes(e.tagName))continue;const r=e.getBoundingClientRect(),s=getComputedStyle(e),name=e.id||e.className||e.tagName;" +
            "if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)issues.push(name+':viewport');" +
            "if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)issues.push(name+':scroll:'+JSON.stringify([e.scrollWidth,e.clientWidth,e.scrollHeight,e.clientHeight])+':'+e.textContent.slice(0,30)+':'+s.fontSize+'/'+s.lineHeight);" +
            "for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){if(!a.clientHeight||getComputedStyle(a).display==='contents')continue;const q=a.getBoundingClientRect(),style=getComputedStyle(a);if(['hidden','auto','scroll','clip'].includes(style.overflowY)&&(r.top<q.top-1||r.bottom>q.bottom+1)||['hidden','auto','scroll','clip'].includes(style.overflowX)&&(r.left<q.left-1||r.right>q.right+1)){issues.push(name+':clipped');break;}}" +
            "if(['BUTTON','STRONG','SMALL','H2','H3','DD','DT','P','B','SPAN'].includes(e.tagName)&&!e.children.length&&e.textContent.trim()){const range=document.createRange();range.selectNodeContents(e);for(const t of range.getClientRects())if(t.left<r.left-1||t.right>r.right+1||t.top<r.top-1||t.bottom>r.bottom+1){issues.push(name+':text:'+e.textContent.slice(0,30)+':'+JSON.stringify({font:s.fontSize,line:s.lineHeight,box:[r.width,r.height],offset:[t.x-r.x,t.y-r.y],glyph:[t.width,t.height]}));break;}}}" +
            "if(document.querySelector(':modal'))issues.push('unexpected modal');if(document.documentElement.scrollHeight>innerHeight+1)issues.push('outer scroll');return issues;})()"));
    }
    @Test public void landscapeTrainingAndClubOperationsUseActualSinglePages() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            assertEquals("true", evaluate(scenario,
                "(()=>{closeOperationsPage();document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;season.squad.f4.energy=52;state.players.f4.energy=52;state.players.f4.initialEnergy=52;trainingCentreFilters={position:'all',query:'',sort:'recommended'};individualTrainingNote='';operationsStaffChoice='';staffNote='';rotationPreview=null;squadPlanPreview=null;setView('club');return true;})()"));
            String original = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "#management-hub-club [data-management-open=training-card]");
            String[] screens = {"training-card", "individual-training", "staff-panel", "owner-board-panel", "squad-health", "squad-plans-panel", "finance-detail", "finance-plan-panel", "club-overview", "suspensions-panel"};
            for (String screen : screens) {
                if (!screen.equals("training-card")) tapWebElement(scenario, "[data-operations-section='" + screen + "']");
                awaitTrue(scenario, "operationsSection==='" + screen + "'&&document.getElementById('management-dialog').open");
                assertEquals("Opening an operation must not focus an editable field", "true", evaluate(scenario, "!document.activeElement.closest('input,textarea')"));
                assertOperationsFits(scenario, screen);
                assertEquals("Reading management pages must not alter the campaign", original, evaluate(scenario, "JSON.stringify(season)"));
                screenshot(scenario, "android-operations-" + screen + ".png");
            }
            tapWebElement(scenario, "[data-operations-section=individual-training]");
            assertEquals("18", evaluate(scenario, "document.querySelectorAll('[data-training-slot]').length"));
            tapWebElement(scenario, "[data-training-slot=f4]");
            tapWebElement(scenario, "#individual-training [data-player-detail]");
            awaitTrue(scenario, "document.getElementById('player-detail-dialog').open");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario, "!document.getElementById('player-detail-dialog').open&&operationsSection==='individual-training'");
            assertOperationsFits(scenario, "player report returns to training page");
            tapWebElement(scenario, "[data-training-focus=recovery]");
            assertEquals(original, evaluate(scenario, "JSON.stringify(season)"));
            tapWebElement(scenario, "#train-individual");
            assertOperationsFits(scenario, "completed individual training");
            assertEquals("true", evaluate(scenario, "document.getElementById('train-individual').disabled&&!!season.trained"));
            tapWebElement(scenario, "[data-operations-section=training-card]");
            assertEquals("true", evaluate(scenario, "document.getElementById('train').disabled&&document.querySelectorAll('.operations-team-current li').length===18"));
            assertOperationsFits(scenario, "weekly training already used");
            screenshot(scenario, "android-operations-trained.png");
            tapWebElement(scenario, "[data-operations-section=staff-panel]");
            assertEquals("true", evaluate(scenario, "(()=>{window.operationsContractBefore={balance:season.finance.balance,q:Staff.quote(season,'hire',operationsStaffChoice)};return operationsContractBefore.q.available;})()"));
            tapWebElement(scenario, "[data-staff-action=hire]");
            assertEquals("true", evaluate(scenario, "season.finance.balance===operationsContractBefore.balance-operationsContractBefore.q.cost&&Staff.active(season,operationsContractBefore.q.role)!==null"));
            tapWebElement(scenario, "[data-ops-staff-choice='active:GK']");
            assertOperationsFits(scenario, "actual contracted coach");
            screenshot(scenario, "android-operations-contract.png");
            tapWebElement(scenario, "[data-operations-section=owner-board-panel]");
            tapWebElement(scenario, "[data-owner-choice=results]");
            assertOperationsFits(scenario, "active owner promise");
            screenshot(scenario, "android-operations-promise.png");
            tapWebElement(scenario, "[data-operations-section=squad-plans-panel]");
            tapWebElement(scenario, "#save-squad-plan");
            String saved = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "#preview-squad-plan");
            assertEquals("11", evaluate(scenario, "document.querySelectorAll('.squad-plan-eleven li').length"));
            assertOperationsFits(scenario, "all eleven plan preview");
            assertEquals(saved, evaluate(scenario, "JSON.stringify(season)"));
            screenshot(scenario, "android-operations-plan.png");
            tapWebElement(scenario, "#cancel-squad-plan");
            tapWebElement(scenario, "[data-operations-section=training-card]");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario, "view==='club'&&operationsSection===null&&!document.getElementById('management-dialog').open");
            assertEquals("true", evaluate(scenario, "(()=>{let closed=S.create(41,{startingClub:true,suspensions:true});while(!S.ready(closed)){while(closed.match.phase!=='full'){if(!F.running(closed.match))F.begin(closed.match);F.finishSegment(closed.match);}closed=S.settle(closed);}season=S.restore(closed);state=season.match;managementMeetingKey=season.seed+':'+season.year+':'+season.round;setView('club');openManagementPanel('training-card');return season.round===46&&document.querySelectorAll('.operations-team-current li').length===18&&document.getElementById('train').disabled;})()"));
            assertOperationsFits(scenario, "completed season training preserves current eighteen");
            screenshot(scenario, "android-operations-completed.png");
            tapWebElement(scenario, "[data-operations-section=club-overview]");
            assertOperationsFits(scenario, "completed season preparation facts");
            assertEquals("true", evaluate(scenario, "PreparationDesk.read(season).finished&&PreparationDesk.read(season).fixture===null"));
            screenshot(scenario, "android-preparation-completed.png");
            tapWebElement(scenario, "[data-preparation-view=cup]");
            awaitTrue(scenario, "view==='cup'&&operationsSection===null&&season.year===1&&season.round===46");
            assertEquals("true", evaluate(scenario, "(()=>{closeOperationsPage();season=S.create(41,{startingClub:true,suspensions:true});state=season.match;managementMeetingKey=season.seed+':'+season.year+':'+season.round;setView('club');openManagementPanel('training-card');window.preparationBefore=JSON.stringify(season);window.preparationQuote=S.trainingPreview(season,'pace');return document.querySelectorAll('[data-team-focus]').length===4;})()"));
            tapWebElement(scenario, "[data-team-focus=pace]");
            assertEquals("Selecting team training is readonly", "true", evaluate(scenario, "JSON.stringify(season)===preparationBefore&&document.getElementById('training-focus').value==='pace'"));
            tapWebElement(scenario, "#train");
            assertEquals("true", evaluate(scenario, "season.trained==='pace'&&document.querySelectorAll('.preparation-training-receipt li').length===18&&preparationQuote.rows.every(p=>season.squad[p.id].speed===p.after&&season.squad[p.id].energy===p.energyAfter)"));
            assertOperationsFits(scenario, "real team training receipt");
            screenshot(scenario, "android-preparation-team-receipt.png");
            tapWebElement(scenario, "[data-operations-section=club-overview]");
            assertOperationsFits(scenario, "preparation reflects training completion");
            tapWebElement(scenario, "[data-preparation-target=training-card]");
            assertEquals("18", evaluate(scenario, "document.querySelectorAll('.preparation-training-receipt li').length"));
            assertOperationsFits(scenario, "receipt returns after real preparation navigation");
            scenario.onActivity(activity -> assertTrue("Operations emitted JavaScript errors: " + activity.consoleErrorsForTest(), activity.consoleErrorsForTest().isEmpty()));
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
            tapWebElement(scenario, "[data-workspace-report='staff-panel']");
            assertEquals("Coach screen must select the squad and display its faces", "true", evaluate(scenario,
                "(()=>{const panel=document.getElementById('staff-panel');" +
                "panel.scrollIntoView({block:'start',behavior:'instant'});const face=panel.querySelector('.staff-portrait').getBoundingClientRect();" +
                "return view==='squad'&&!document.getElementById('squad-pane').hidden&&" +
                "document.querySelector('[data-view=squad]').getAttribute('aria-current')==='page'&&face.width>0&&face.height>0&&face.top>=0&&face.bottom<innerHeight;})()"));
            assertVisibleWebText(scenario, ".operations-staff h2", "코치 계약");
            screenshot(scenario, "android-coaches.png");
            tapWebElement(scenario, "[data-operations-view=club]");
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
            evaluate(scenario, "(()=>{window.newArtDecoded=false;Promise.all([Portraits.expandedAsset,ClubArt.asset,ClubArt.promotionAsset,Portraits.extraAsset,ClubGrowth.asset,ClubArt.storyAsset,ClubArt.momentAsset,ClubArt.deadballAsset,ClubArt.memoryAsset,ClubArt.voiceAsset,ClubArt.dramaAsset,ClubArt.resolutionAsset].map(src=>{const image=new Image();image.src=src;return image.decode().then(()=>image.naturalWidth);})).then(widths=>window.newArtDecoded=widths[0]===1254&&widths[1]===2048&&widths[2]===1672&&widths[3]===1254&&widths[4]===2048&&widths[5]===2048&&widths[6]===1672&&widths[7]===960&&widths[8]===1536&&widths[9]===768&&widths[10]===1536&&widths[11]===1536).catch(()=>window.newArtDecoded=false);return true;})()");
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
            awaitTrue(scenario, "!document.getElementById('club-story-dialog').open&&document.getElementById('manager-notebook').open&&!!notebookRows&&notebookTab==='complete'");
            assertEquals("Returning to the same notebook does not answer or change the campaign", storyBefore, evaluate(scenario,"JSON.stringify(season)"));
            tapWebElement(scenario,"#manager-notebook [data-notebook-close]");
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
            awaitTrue(scenario, "view==='market'&&!document.querySelector(':modal')&&document.getElementById('management-dialog').dataset.inlineWorkspace==='market'");
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
            awaitTrue(scenario, "!!document.querySelector('.team-shape-board')&&document.querySelectorAll('[data-shape-name]').length===22");
            for (String tactic : new String[]{"balanced", "press", "counter", "lowBlock"}) {
                tapWebElement(scenario, "[data-tactics-preview='"+tactic+"']");
                awaitTrue(scenario, "document.querySelector('[data-tactics-preview=\""+tactic+"\"]').getAttribute('aria-pressed')==='true'&&document.querySelectorAll('[data-shape-name]').length===22");
                assertEquals("The complete physical analysis must fit for "+tactic, "[]", evaluate(scenario,
                    "(()=>{const failures=[],b=document.querySelector('.match-popup-body'),outer=b.getBoundingClientRect();if(b.scrollHeight>b.clientHeight+1||b.scrollWidth>b.clientWidth+1)failures.push('dialog overflow');if(document.querySelectorAll('[data-shape-player]').length!==22||document.querySelectorAll('[data-shape-name]').length!==22)failures.push('missing players or names');for(const e of document.querySelectorAll('.team-shape-board,.shape-orders,.shape-field,.shape-report,.team-shape-board button,.team-shape-board select,.team-shape-board p,.team-shape-board th,.team-shape-board td,.team-shape-board caption,.shape-field figcaption')){if(!e.checkVisibility())continue;const r=e.getBoundingClientRect();if(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2||r.left<outer.left-1||r.right>outer.right+1||r.top<outer.top-1||r.bottom>outer.bottom+1)failures.push(e.className||e.tagName);if(e.tagName==='BUTTON'&&r.height<43.9)failures.push('small control');if(['P','TH','TD','CAPTION','BUTTON','FIGCAPTION'].includes(e.tagName)){const range=document.createRange();range.selectNodeContents(e);for(const q of range.getClientRects())if(q.width&&q.height&&(q.left<r.left-1||q.right>r.right+1||q.top<r.top-1||q.bottom>r.bottom+1))failures.push('clipped text:'+e.textContent);}}return failures;})()"));
            }
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
            assertEquals("Squad heading text stays inside its header", "true", evaluate(scenario, "(()=>{const e=document.querySelector('#squad-overview-dialog>header h2'),r=e.getBoundingClientRect(),h=e.closest('header').getBoundingClientRect();return r.top>=h.top&&r.bottom<=h.bottom&&e.scrollWidth<=e.clientWidth+1;})()"));
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
            assertEquals("Selected face and six numeric ability colors are visible", "true", evaluate(scenario, "(()=>{const face=document.querySelector('.tactical-selected-profile .player-portrait'),colors={elite:'rgb(141, 229, 175)',strong:'rgb(237, 229, 146)',steady:'rgb(185, 212, 235)',developing:'rgb(239, 176, 164)'};return face.getBoundingClientRect().width>=20&&getComputedStyle(face).backgroundImage.startsWith('url(')&&[...document.querySelectorAll('.placement-attributes>div')].every(e=>getComputedStyle(e.querySelector('b')).color===colors[e.dataset.abilityBand]);})()"));
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
            String filterMetrics=evaluate(scenario, "JSON.stringify([...document.querySelectorAll('.transfer-filter-toggles button')].map(e=>({text:e.textContent,rect:[e.getBoundingClientRect().left,e.getBoundingClientRect().right],parent:[e.parentElement.getBoundingClientRect().left,e.parentElement.getBoundingClientRect().right],scroll:[e.scrollWidth,e.scrollHeight],client:[e.clientWidth,e.clientHeight],font:getComputedStyle(e).fontSize})))");
            assertEquals("Every inline filter action keeps text inside its own button: "+filterMetrics, "true", evaluate(scenario, "(()=>{const g=document.querySelector('.transfer-filter-toggles').getBoundingClientRect();return [...document.querySelectorAll('.transfer-filter-toggles button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=g.left&&r.right<=g.right&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1;});})()"));
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
            awaitTrue(scenario, "state.continuousSetup?.version===14 && state.continuous.tick>20");
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
            evaluate(reopened,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41);for(let y=0;y<2;y++){while(!S.ready(season)){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}season=S.nextSeason(season);}state=season.match;managementMeetingKey=season.seed+':'+season.year+':'+season.round;setView('club');openManagerNotebook();return true;})()");
            awaitTrue(reopened,"!!notebookRows");
            tapWebElement(reopened,"#manager-notebook [data-notebook-tab=history]");
            String historical=evaluate(reopened,"JSON.stringify(season)");
            assertEquals("The inline season filter is a visible 44px control inside its header","true",evaluate(reopened,"(()=>{const e=document.querySelector('[data-notebook-year]'),r=e?.getBoundingClientRect(),h=e?.parentElement.getBoundingClientRect();return !!r&&r.height>=44&&r.left>=h.left&&r.right<=h.right&&r.top>=h.top&&r.bottom<=h.bottom;})()"));
            evaluate(reopened,"(()=>{const e=document.querySelector('[data-notebook-year]');e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
            awaitTrue(reopened,"notebookYear==='1'&&notebookPage===0&&[...document.querySelectorAll('[data-notebook-event]')].every(e=>e.dataset.notebookEvent.startsWith('1:'))");
            tapWebElement(reopened,"#manager-notebook [data-notebook-page='1']");
            tapWebElement(reopened,"#manager-notebook [data-notebook-event^='1:']");
            awaitTrue(reopened,"document.getElementById('club-story-dialog').open&&ClubStory.scene(season,clubStoryEvent).readOnly");
            assertEquals("Historical conversations expose no new choice","0",evaluate(reopened,"document.querySelectorAll('#club-story-dialog [data-story-choice]').length"));
            reopened.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(reopened,"document.getElementById('manager-notebook').open&&!!notebookRows&&notebookTab==='history'&&notebookYear==='1'&&notebookPage===1");
            assertEquals("Filtering, reading and returning must preserve every campaign byte",historical,evaluate(reopened,"JSON.stringify(season)"));
            screenshot(reopened,"android-notebook-season-filter.png");
            reopened.onActivity(activity -> assertTrue("Season filter generated JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));

        }
    }

    @Test public void playerThreadsUseConfirmedFactsAndInlineSelection() throws Exception {
        String saved;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(50,{suspensions:true});while(season.round<12){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;setView('club');openManagerNotebook(null,{tab:'series'});return true;})()");
            awaitTrue(scenario,"!!notebookRows");
            String before=evaluate(scenario,"JSON.stringify(season)");
            assertEquals("All six story names fit beside a single selected report","true",evaluate(scenario,"notebookSeriesRead().length===6&&document.querySelectorAll('[data-notebook-series]').length===6&&document.querySelectorAll('.serial-card').length===1"));
            for(String kind : new String[]{"link-v1","red-v1"}) {
                tapWebElement(scenario,"[data-notebook-series='"+kind+"']");
                assertEquals("Every story selector and episode action has a visible 44px target","true",evaluate(scenario,"(()=>{const d=document.getElementById('manager-notebook');return d.scrollHeight<=d.clientHeight+1&&[...d.querySelectorAll('.serial-selector button,.serial-card,.serial-card h3,.serial-card small,.serial-report-evidence dt,.serial-report-evidence dd,.serial-stages button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1&&(e.tagName!=='BUTTON'||r.height>=44);});})()"));
                assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
                tapWebElement(scenario,"[data-notebook-event='1:thread-"+kind+"-1']");
                assertEquals("The actual player's identity and all confirmed evidence are visible","true",evaluate(scenario,"(()=>{const d=ClubStory.scene(season,clubStoryEvent);return !!F.identityProfile(d.actor)&&d.serial.facts.length===3&&document.querySelectorAll('.story-evidence dd').length===3;})()"));
                while("true".equals(evaluate(scenario,"document.querySelector('.story-choices').hidden")))tapWebElement(scenario,"[data-story-page=next]");
                tapWebElement(scenario,"[data-story-choice=practical]");
                tapWebElement(scenario,"[data-story-choice=honest]");
                assertEquals("The final answer is shown immediately","true",evaluate(scenario,"ClubStory.scene(season,clubStoryEvent).step===2&&clubStoryPages(ClubStory.scene(season,clubStoryEvent))[clubStoryPage].kind==='complete-reply'"));
                screenshot(scenario,"android-thread-"+kind+".png");
                tapWebElement(scenario,"#club-story-dialog footer [data-story-close]");
                awaitTrue(scenario,"notebookDialog.open&&!!notebookRows");
                assertEquals("The same inline story selection returns",kind,new JSONTokener(evaluate(scenario,"notebookSeriesSelection")).nextValue().toString());
                before=evaluate(scenario,"JSON.stringify(season)");
            }
            screenshot(scenario,"android-six-story-workspace.png");
            evaluate(scenario,"(()=>{notebookDialog.close();while(season.round<14){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;render();setView('club');save();return true;})()");
            assertEquals("Later replies echo both exact answers and the two actual league results","true",evaluate(scenario,"StoryThreads.events(season).filter(e=>e.serial.episode===2).length===2&&StoryThreads.events(season).filter(e=>e.serial.episode===2).every(e=>{const old=StoryThreads.events(season).find(p=>p.serial.id===e.serial.id&&p.serial.episode===1);return old.actor===e.actor&&e.scene.includes(old.options[2])&&e.scene.includes(old.turns[0][1][1])&&season.statistics.records.filter(g=>g.competition==='league'&&g.round>12&&g.round<=14).every(g=>e.scene.includes(g.round+'R '+g.score.join(' : ')));})"));
            saved=evaluate(scenario,"JSON.stringify(season)");
            scenario.onActivity(activity -> assertTrue("New player stories generated JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
        try(ActivityScenario<MainActivity> reopened=ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals("Both explicit player dialogues reload byte for byte",saved,evaluate(reopened,"JSON.stringify(season)"));
        }
    }

    @Test public void serialMeetingsUseRealLaterGamesAndPersistExplicitAnswers() throws Exception {
        String answers;
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{suspensions:true});for(let i=0;i<6;i++){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;setView('club');save();openManagerNotebook();return true;})()");
            awaitTrue(scenario, "!!notebookRows");
            String before = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "#manager-notebook [data-notebook-tab='series']");
            assertEquals("All available story arcs and actual episode actions fit the landscape screen", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('manager-notebook');return document.querySelectorAll('.serial-card').length===(notebookSeriesRead().length>2?1:notebookSeriesRead().length)&&document.querySelectorAll('[data-notebook-series]').length===(notebookSeriesRead().length>2?notebookSeriesRead().length:0)&&d.scrollHeight<=d.clientHeight+1&&[...d.querySelectorAll('.serial-card,.serial-stages button')].every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1;});})()"));
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            if ("true".equals(evaluate(scenario,"!!document.querySelector('[data-notebook-series=board]')"))) tapWebElement(scenario,"[data-notebook-series=board]");
            tapWebElement(scenario, "#manager-notebook [data-notebook-event='1:serial-board-1']");
            assertEquals("The original scene and all three confirmed evidence facts remain visible", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('club-story-dialog'),art=d.querySelector('.drama-art'),facts=d.querySelector('.story-evidence'),r=facts.getBoundingClientRect();return d.open&&getComputedStyle(art).backgroundImage.includes('data:image/webp')&&facts.querySelectorAll('dd').length===3&&r.top>=0&&r.bottom<=innerHeight&&facts.scrollHeight<=facts.clientHeight+1;})()"));
            reachStoryQuestion(scenario);
            tapWebElement(scenario, "#club-story-dialog [data-story-choice='practical']");
            reachStoryQuestion(scenario);
            tapWebElement(scenario, "#club-story-dialog [data-story-choice='honest']");
            awaitTrue(scenario,"ClubStory.scene(season,'1:serial-board-1').step===2");
            answers=evaluate(scenario,"JSON.stringify(season.clubStory.records.filter(r=>r.event==='1:serial-board-1'))");
            scenario.onActivity(activity -> activity.getOnBackPressedDispatcher().onBackPressed());
            awaitTrue(scenario,"document.getElementById('manager-notebook').open&&!!notebookRows&&notebookTab==='series'");
            assertEquals("A follow-up cannot appear before two later confirmed league games", "true", evaluate(scenario,"ClubStory.scene(season,'1:serial-board-2')===null"));
        }
        try (ActivityScenario<MainActivity> reopened = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(reopened);
            assertEquals(answers,evaluate(reopened,"JSON.stringify(season.clubStory.records.filter(r=>r.event==='1:serial-board-1'))"));
            evaluate(reopened,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;for(let i=0;i<2;i++){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;render();setView('club');openClubStory('1:serial-board-2');return true;})()");
            reachStoryQuestion(reopened);
            assertEquals("Follow-up remembers the actual earlier answer and both later scores", "true", evaluate(reopened,
                "(()=>{const d=ClubStory.scene(season,'1:serial-board-2'),rows=season.statistics.records.filter(g=>g.competition==='league'&&g.round>6&&g.round<=8),body=document.querySelector('#club-story-dialog .story-reading');return d.serial.episode===2&&d.scene.includes('현재 자금·주급')&&rows.length===2&&rows.every(g=>d.scene.includes(g.round+'R '+g.score.join(' : ')))&&body.scrollHeight<=body.clientHeight+1;})()"));
            screenshot(reopened,"android-serial-followup.png");
            reopened.onActivity(activity -> assertTrue("Serial narrative generated JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void contextualPressRetainsTheReplyAndOpensTheNextRealQuestion() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(614,{suspensions:true});for(let i=0;i<3;i++){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;voiceHomeAnswered=null;voiceHomeKey='';setView('club');return true;})()");
            awaitTrue(scenario,"document.getElementById('club-story-dialog').open&&!clubStoryRequired");
            String untouched=evaluate(scenario,"JSON.stringify(season)");
            tapWebElement(scenario,"#club-story-dialog footer [data-story-close]");
            awaitTrue(scenario,"!document.getElementById('club-story-dialog').open&&!document.getElementById('manager-notebook').open");
            assertEquals("Closing the automatically delivered story is not an answer",untouched,evaluate(scenario,"JSON.stringify(season)"));
            tapWebElement(scenario, "#club-press-desk [data-life-press='after'][data-life-answer='protect']");
            awaitTrue(scenario,"!!document.querySelector('#club-press-desk [data-voice-review=after] .voice-saved')");
            assertEquals("The post-match answer and journalist reaction stay on home", "true", evaluate(scenario,
                "(()=>{const card=document.querySelector('#club-press-desk [data-voice-review=after]'),raw=ClubLife.pressStatus(season).after,q=ManagerVoice.press(season,raw);return card.textContent.includes(q.spoken)&&card.textContent.includes(q.reaction)&&raw.choice==='protect'&&voiceHomeAnswered.id===raw.id;})()"));
            String saved=evaluate(scenario,"JSON.stringify(season)");
            tapWebElement(scenario,"#club-press-desk [data-voice-review=after]");
            awaitTrue(scenario,"document.getElementById('management-dialog').open&&document.getElementById('voice-press-phase').value==='before'");
            assertEquals(saved,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("The exact confirmed context, all prose and three answers fit the actual phone", "true", evaluate(scenario,
                "(()=>{const side=document.querySelector('.voice-press-side .voice-interview'),context=ManagerVoice.press(season,ClubLife.pressStatus(season).before).context;return side.textContent.includes(context.question)&&side.textContent.includes(context.fact)&&side.scrollHeight<=side.clientHeight+1&&[...side.querySelectorAll('h3,p,button')].every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1;});})()"));
            tapWebElement(scenario,"#management-close");
            tapWebElement(scenario,"#club-press-desk [data-news-article='review:analysis']");
            awaitTrue(scenario,"document.getElementById('news-article-dialog').open");
            assertEquals("Original full article and added factual paragraphs remain available", "true", evaluate(scenario,
                "(()=>{const d=document.getElementById('news-article-dialog'),copy=d.querySelector('.news-article-copy'),close=document.getElementById('news-article-close'),back=document.getElementById('news-article-return');return copy.querySelectorAll(':scope>p').length===6&&d.scrollHeight<=d.clientHeight+1&&[close,back].every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight;});})()"));
            assertEquals(saved,evaluate(scenario,"JSON.stringify(season)"));
            screenshot(scenario,"android-contextual-press-article.png");
            scenario.onActivity(activity -> assertTrue("Contextual press generated JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void physicalShapePreviewAndRecentAppearancesFitLandscape() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeGoalScene();matchCeremonyHold=false;ceremonyPending=null;managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;customPositions={};tacticalRoles={};setView('match');openMatchPopup('analysis');return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('[data-shape-player]').length===22&&document.querySelectorAll('[data-shape-name]').length===22");
            String before = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "[data-tactics-preview=press]");
            if ("true".equals(evaluate(scenario, "document.querySelector('[data-tactics-owner=theirs]').checkVisibility()"))) {
                tapWebElement(scenario, "[data-tactics-owner=theirs]");
                tapWebElement(scenario, "[data-tactics-zone=wide]");
            } else {
                evaluate(scenario, "(()=>{for(const [kind,value] of [['owner','theirs'],['zone','wide']]){const c=document.querySelector('[data-shape-filter='+kind+']');c.value=value;c.dispatchEvent(new Event('change'));}return true;})()");
            }
            assertEquals("Reading the actual solver must not write the campaign", before, evaluate(scenario, "JSON.stringify(season)"));
            tapWebElement(scenario, ".shape-apply");
            awaitTrue(scenario, "state.tactic==='press'&&state.phase==='prep'&&!state.continuousSetup");
            tapWebElement(scenario, ".match-popup-header [data-match-popup-close]");
            evaluate(scenario, "(()=>{const r=Opposition.preview(season);F.enableStoppage(state);F.enableContinuous(state,{opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(state);F.advanceContinuous(state,723);state.paused=true;render();openMatchPopup('analysis');return true;})()");
            before = evaluate(scenario, "JSON.stringify(season)");
            tapWebElement(scenario, "[data-shape-mode=current]");
            awaitTrue(scenario, "teamShapeMode==='current'&&document.querySelectorAll('[data-shape-name]').length===22");
            assertEquals(before, evaluate(scenario, "JSON.stringify(season)"));
            assertEquals("The native report must keep all primary controls inside the viewport", "true", evaluate(scenario, "[...document.querySelectorAll('.team-shape-board button')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.height>=43.9&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})&&document.documentElement.scrollHeight<=innerHeight+1"));
            screenshot(scenario, "android-physical-shape.png");
            tapWebElement(scenario, ".match-popup-header [data-match-popup-close]");
            evaluate(scenario, "(()=>{season=S.create(41);for(let i=0;i<6;i++){while(season.match.phase!=='full'){if(!F.running(season.match))F.begin(season.match);F.finishSegment(season.match);}season=S.settle(season);}state=season.match;setView('squad');openPlayerDetails('sp_f1');const c=document.querySelector('#player-detail-dialog .report-page-select');c.value='최근 출전';c.dispatchEvent(new Event('change'));return true;})()");
            awaitTrue(scenario, "document.querySelectorAll('.player-recent-report tbody tr').length===5");
            assertEquals("The new candidate portraits keep identity-specific cells", "true", evaluate(scenario, "MarketRoster.players.every((p,i)=>Portraits.index(p)===156+i&&Portraits.html(p).includes('data-portrait-atlas=\"4\"'))"));
            screenshot(scenario, "android-player-recent.png");
        }
    }

    @Test public void completedPhysicalShotsFitLandscapeWithoutAdvancingTheMatch() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario, "(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeGoalScene();matchCeremonyHold=false;ceremonyPending=null;managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{suspensions:true});state=season.match;customPositions={};tacticalRoles={};setView('club');const r=Opposition.preview(season);F.enableStoppage(state);F.enableContinuous(state,{ruleVersion:11,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(state);window.shotQaReady=false;window.shotQaError=null;const pump=()=>{try{if(!F.running(state)&&state.phase!=='full')F.begin(state);F.advanceContinuous(state,600);if(ShotReport.read(state).rows.length>=3||state.phase==='full'){state.paused=true;setView('match');openMatchPopup('stats');matchReportTab='슈팅 위치';renderCompactMatchReport();window.shotQaReady=true;}else setTimeout(pump,0);}catch(e){window.shotQaError=String(e);}};setTimeout(pump,0);return true;})()");
            awaitTrue(scenario, "window.shotQaReady||!!window.shotQaError");
            assertEquals("Real physical shot generation failed", "null", evaluate(scenario,"window.shotQaError"));
            awaitTrue(scenario,"document.querySelectorAll('[data-shot-mark]').length>=2&&state.paused");
            String before=evaluate(scenario,"JSON.stringify(season)");
            for (String team : new String[]{"ours","theirs","all"}) {
                evaluate(scenario,"(()=>{const s=document.getElementById('shot-report-team');s.value='"+team+"';s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
                assertEquals("The native selection reaches the delegated report control", "true", evaluate(scenario,"shotReportFilter==='"+team+"'"));
                assertEquals("Every marker is a completed visible physical shot", "true", evaluate(scenario,"document.querySelectorAll('[data-shot-mark]').length===ShotReport.read(visibleMatchForReports(),{team:'"+team+"'}).rows.length"));
                assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            }
            assertEquals("Actual shot names, outcomes, text and 44px controls fit the native viewport", "true", evaluate(scenario,
                "(()=>{const d=ShotReport.read(visibleMatchForReports(),{team:shotReportFilter,selected:shotReportSelection}),person=document.querySelector('.shot-person');if(!d.selected||!person.textContent.includes(d.selected.name)||!person.textContent.includes(d.selected.label))return false;return [...document.querySelectorAll('.shot-workspace,.shot-body,.shot-diagram,.shot-detail,.shot-person,.shot-person b,.shot-person span,.shot-measures,.shot-note,.shot-filter-row select,#match-report-confirm')].filter(e=>e.checkVisibility()&&e.clientHeight).every(e=>{const r=e.getBoundingClientRect();if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5||e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2||(['SELECT','BUTTON'].includes(e.tagName)&&r.height<43.9))return false;return true;});})()"));
            screenshot(scenario,"android-shot-report.png");
            tapWebElement(scenario,"#match-replay-open");
            awaitTrue(scenario,"matchReplayClip?.physical&&matchReplayClip.scene.id===MatchReplay.sceneForShot(season,ShotReport.read(visibleMatchForReports(),{team:shotReportFilter,selected:shotReportSelection}).selected).id");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("The real replay keeps both complete teams named", "true",evaluate(scenario,"matchReplayNames.length===22"));
            screenshot(scenario,"android-horizontal-replay.png");
            tapWebElement(scenario,"#match-replay-close");
            awaitTrue(scenario,"document.getElementById('match-popup').open&&document.getElementById('shot-report-select').value===shotReportSelection");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            tapWebElement(scenario,".match-popup-header [data-match-popup-close]");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("Reading and closing the report keeps the real match paused", "true",evaluate(scenario,"state.paused&&!document.getElementById('match-popup').open"));
            evaluate(scenario,"drawField();true");
            assertEquals("The live ball and all22 names share the same horizontal projection", "true",evaluate(scenario,"(()=>{const c=document.getElementById('match-names'),raw=F.continuousFrame(state),v=MatchPitch.frame(raw),r=document.getElementById('field').getBoundingClientRect(),xy=document.getElementById('match-ball').style.transform.match(/translate\\(([-.0-9]+)px,\\s*([-.0-9]+)px\\)/);return c._labels.length===22&&v.own.every(p=>p.x>=6&&p.x<=94&&p.y>=6&&p.y<=94)&&xy&&Math.abs(+xy[1]-(r.width*v.ball.x/100-6))<1;})()"));
            screenshot(scenario,"android-horizontal-pitch.png");
            scenario.onActivity(activity -> assertTrue("Shot report caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void rule11PartialSaveMatchesTheCanonicalSourceFingerprint() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            String encodedSnapshot=evaluate(scenario,"(()=>{const s=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:11,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);s.match.paused=true;return JSON.stringify(s);})()");
            String snapshot=(String)new JSONTokener(encodedSnapshot).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(snapshot.getBytes(StandardCharsets.UTF_8));
            StringBuilder actual=new StringBuilder();for(byte value:digest){actual.append(Character.forDigit((value>>>4)&15,16));actual.append(Character.forDigit(value&15,16));}
            assertEquals("Node source and the actual Android WebView must serialize the identical paused rule11 world", "6099b8a618922a6c6d8606237fe45051ba8564fd587ecbe04cca76d9aa512748", actual.toString());
        }
    }

    @Test public void landscapePracticeKeepsCanonicalStartAndUsesExistingSubstitutionControls() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;setView('club');openPractice('comeback');return true;})()");
            awaitTrue(scenario,"!!document.getElementById('practice-workspace-pane')&&practiceSession?.continuousVersion===14");
            String campaign=evaluate(scenario,"JSON.stringify(season)");
            String encodedInitial=evaluate(scenario,"JSON.stringify(Practice.createContinuous('comeback',{ruleVersion:13}))");
            String initial=(String)new JSONTokener(encodedInitial).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(initial.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("The entire75-minute natural practice must match the source runtime", "9a1980b1a23bfb806f0f98039cbefac6f17c46440289977f692fb70bbf5c7d37",hash.toString());
            evaluate(scenario,"(()=>{const p=document.getElementById('practice-workspace-pane');p.value='subs';p.dispatchEvent(new Event('change'));return true;})()");
            assertEquals("Practice controls fit one actual landscape viewport", "true",evaluate(scenario,"[...document.querySelectorAll('#practice-dialog button,#practice-dialog select')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.height>=43.9&&r.top>=0&&r.bottom<=innerHeight+1;})"));
            int subs=Integer.parseInt(evaluate(scenario,"practiceSession.match.subs"));
            tapWebElement(scenario,"#practice-dialog [data-practice=sub]");
            assertEquals(Integer.toString(subs+1),evaluate(scenario,"practiceSession.match.subs"));
            assertEquals(campaign,evaluate(scenario,"JSON.stringify(season)"));
            screenshot(scenario,"android-landscape-practice.png");
            tapWebElement(scenario,"#practice-dialog .practice-close");
            assertEquals(campaign,evaluate(scenario,"JSON.stringify(season)"));
            scenario.onActivity(activity -> assertTrue("Practice workspace caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }


    @Test public void rule12PartialSaveMatchesTheCanonicalSourceFingerprint() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            String encoded=evaluate(scenario,"(()=>{const s=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:12,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);s.match.paused=true;return JSON.stringify(s);})()");
            String raw=(String)new JSONTokener(encoded).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("Rule12 physical state, contact RNG and journal must agree with Node", "2389cb3ff18f3647de83bd811ff3a24912c0b878060244f9a234fac2a8513d76",hash.toString());
        }
    }

    @Test public void strongerAvailableBenchPlayerNeedsExplicitApplicationAndReturnsToTactics() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeOperationsPage();managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{suspensions:true});state=season.match;F.swap(state,'g1','g2');customPositions={};tacticalRoles={};setView('club');openManagementPanel('club-overview');return true;})()");
            String before=evaluate(scenario,"JSON.stringify(season)");
            assertEquals("true",evaluate(scenario,"LineupReadiness.read(season).recommendations.some(r=>r.incoming.id==='g1'&&r.difference===8)"));
            screenshot(scenario,"android-lineup-readiness.png");
            tapWebElement(scenario,"[data-preparation-coach]");
            awaitTrue(scenario,"matchPopupActive==='lineup'&&document.querySelectorAll('[data-coach-ability]').length===11");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("Actual skills, placement values and44px comparison actions fit landscape", "true",evaluate(scenario,"[...document.querySelectorAll('.coach-lineup-controls,.coach-lineup-eleven li,.coach-lineup-fit,.coach-lineup-actions button')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return e.scrollWidth<=e.clientWidth+2&&e.scrollHeight<=e.clientHeight+2&&r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&(e.tagName!=='BUTTON'||r.height>=43.9);})"));
            tapWebElement(scenario,"#coach-lineup-preview");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            screenshot(scenario,"android-coach-skill-comparison.png");
            tapWebElement(scenario,"#coach-lineup-apply");
            assertEquals("true",evaluate(scenario,"state.lineup.includes('g1')&&!state.lineup.includes('g2')"));
            String applied=evaluate(scenario,"JSON.stringify(season)");
            assertEquals("true",evaluate(scenario,"JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))===JSON.stringify(season)"));
            tapWebElement(scenario,".match-popup-header [data-match-popup-close]");
            awaitTrue(scenario,"view==='tactics'&&!document.getElementById('match-popup').open");
            assertEquals(applied,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("false",evaluate(scenario,"F.running(state)"));
            scenario.onActivity(activity -> assertTrue("Lineup comparison caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void naturalCornerReceiptOpensOriginalCoachDialogueAndTheRealSetPieceEditor() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeOperationsPage();managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(17,{startingClub:true,suspensions:true});state=season.match;customPositions={};tacticalRoles={};setView('club');const r=Opposition.preview(season);F.enableStoppage(state);F.enableContinuous(state,{ruleVersion:12,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(state);window.cornerStoryReady=false;window.cornerStoryError=null;const pump=()=>{try{if(!F.running(state)&&state.phase!=='full')F.begin(state);F.advanceContinuous(state,600);if(state.phase==='full'){window.cornerFullSnapshot=JSON.stringify(state);season=S.settle(season);state=season.match;setView('club');window.cornerStoryReady=true;}else setTimeout(pump,0);}catch(e){window.cornerStoryError=String(e);}};setTimeout(pump,0);return true;})()");
            awaitTrue(scenario,"cornerStoryReady||state.continuous.tick>=18000||!!cornerStoryError");
            awaitTrue(scenario,"cornerStoryReady||state.continuous.tick>=36000||!!cornerStoryError");
            awaitTrue(scenario,"cornerStoryReady||!!cornerStoryError");
            assertEquals("null",evaluate(scenario,"cornerStoryError"));
            String fullEncoded=evaluate(scenario,"cornerFullSnapshot"),fullRaw=(String)new JSONTokener(fullEncoded).nextValue();
            byte[] fullDigest=java.security.MessageDigest.getInstance("SHA-256").digest(fullRaw.getBytes(StandardCharsets.UTF_8));
            StringBuilder fullHash=new StringBuilder();for(byte value:fullDigest){fullHash.append(Character.forDigit((value>>>4)&15,16));fullHash.append(Character.forDigit(value&15,16));}
            assertEquals("The complete rule12 game must be identical in Node and the actual WebView", "6a98f77a32bc7da100183d166f8b0d1f113bda3a350a895a0f43ee2688618a52", fullHash.toString());
            assertEquals("true",evaluate(scenario,"season.statistics.records[0].continuousVersion===12&&season.statistics.records[0].physicalStats.corners[0]>0"));
            String before=evaluate(scenario,"JSON.stringify(season)");
            evaluate(scenario,"openClubStory('1:deadball-second-v1');openClubStory('1:deadball-second-v1');true");
            for(int page=0;page<12&&!"true".equals(evaluate(scenario,"document.querySelector('.story-choices').checkVisibility()"));page++)tapWebElement(scenario,"[data-story-page=next]");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("true",evaluate(scenario,"[...document.querySelectorAll('.story-choices button')].length===3&&document.querySelector('.story-reading').scrollHeight<=document.querySelector('.story-reading').clientHeight+2"));
            screenshot(scenario,"android-corner-coach-question.png");
            tapWebElement(scenario,"[data-story-choice=practical]");
            for(int page=0;page<12&&!"true".equals(evaluate(scenario,"document.querySelector('.story-choices').checkVisibility()"));page++)tapWebElement(scenario,"[data-story-page=next]");
            tapWebElement(scenario,"[data-story-choice=honest]");
            assertEquals("2",evaluate(scenario,"ClubStory.scene(season,'1:deadball-second-v1').step"));
            assertEquals("true",evaluate(scenario,"document.querySelector('.story-reading').textContent.includes('코너')&&document.querySelector('[data-story-action=setpieces]').checkVisibility()"));
            screenshot(scenario,"android-corner-coach-reply.png");
            assertEquals("true",evaluate(scenario,"JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))===JSON.stringify(season)"));
            String answered=evaluate(scenario,"JSON.stringify(season)");
            tapWebElement(scenario,"[data-story-action=setpieces]");
            awaitTrue(scenario,"matchPopupActive==='setpieces'&&!storyDialog.open");
            assertEquals(answered,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("false",evaluate(scenario,"F.running(state)"));
            scenario.onActivity(activity -> assertTrue("Corner dialogue caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
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
            evaluate(scenario, "openPortability();document.querySelector('[data-portable=export]').click();true");
            awaitTrue(scenario, "portabilityStatus.includes('저장했습니다')&&!portabilityExportBusy");
            assertEquals("true",evaluate(scenario,"!document.getElementById('campaign-import-file').disabled&&document.getElementById('campaign-file-progress').hidden"));
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

    private String shellForDisplayTest(String command) throws Exception {
        try (InputStream input = new android.os.ParcelFileDescriptor.AutoCloseInputStream(
                InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command));
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return new String(output.toByteArray(), StandardCharsets.UTF_8).trim();
        }
    }
    private void restoreDisplaySetting(String name, String value) throws Exception {
        shellForDisplayTest(value.matches("[0-3]") ? "settings put system " + name + " " + value : "settings delete system " + name);
    }
    @Test public void gameCategoryKeepsLandscapeOnDisposableLargeScreenEmulator() throws Exception {
        assertTrue("Display mutation is restricted to a disposable emulator", "ranchu".equals(Build.HARDWARE) || "goldfish".equals(Build.HARDWARE));
        String density = shellForDisplayTest("wm density");
        String accelerometer = shellForDisplayTest("settings get system accelerometer_rotation");
        String rotation = shellForDisplayTest("settings get system user_rotation");
        java.util.regex.Matcher override = java.util.regex.Pattern.compile("Override density: (\\d+)").matcher(density);
        String restoreDensity = override.find() ? "wm density " + override.group(1) : "wm density reset";
        try {
            // Keep the same pixel count, but cross sw600dp and request portrait from the system.
            shellForDisplayTest("wm density 160");
            shellForDisplayTest("settings put system accelerometer_rotation 0");
            shellForDisplayTest("settings put system user_rotation 0");
            String displayConfiguration = shellForDisplayTest("am get-config");
            java.util.regex.Matcher screenWidth = java.util.regex.Pattern.compile("sw(\\d+)dp").matcher(displayConfiguration);
            assertTrue("The system display must cross sw600dp: " + displayConfiguration, screenWidth.find() && Integer.parseInt(screenWidth.group(1)) >= 600);
            try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
                awaitReady(scenario);
                screenshot(scenario,"android-game-tablet-candidate.png");
                scenario.onActivity(activity -> {
                    assertEquals(android.content.pm.ApplicationInfo.CATEGORY_GAME, activity.getApplicationInfo().category);
                    // A game may have a smaller compatibility window on a portrait tablet.
                    android.util.Log.i("GameSmoke", "tablet-activity:" + activity.getResources().getConfiguration());
                    assertEquals(Configuration.ORIENTATION_LANDSCAPE, activity.getResources().getConfiguration().orientation);
                    assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, activity.getRequestedOrientation());
                });
                awaitTrue(scenario,"innerWidth>innerHeight&&innerWidth>=600&&document.documentElement.scrollWidth<=innerWidth+1");
                String before = evaluate(scenario,"JSON.stringify(season)");
                screenshot(scenario,"android-game-tablet-landscape.png");
                assertEquals("Checking tablet orientation must not alter the campaign", before, evaluate(scenario,"JSON.stringify(season)"));
                scenario.onActivity(activity -> assertTrue("Tablet launch caused console errors: " + activity.consoleErrorsForTest(), activity.consoleErrorsForTest().isEmpty()));
            }
        } finally {
            restoreDisplaySetting("accelerometer_rotation", accelerometer);
            restoreDisplaySetting("user_rotation", rotation);
            shellForDisplayTest(restoreDensity);
        }
    }

    @Test public void pendingExportKeepsControlsLockedUntilItsOwnCompletion() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"window.savedExportForAudit=exportCampaign;window.exportAuditResolves=[];exportCampaign=()=>new Promise(resolve=>exportAuditResolves.push(resolve));openPortability();document.querySelector('[data-portable=export]').click();true");
            awaitTrue(scenario,"exportAuditResolves.length===1");
            assertEquals("true",evaluate(scenario,"portabilityExportBusy&&!document.getElementById('campaign-file-progress').hidden&&document.getElementById('campaign-import-file').disabled&&document.querySelector('[data-portable=export]').disabled&&requestCampaignExport()===false"));
            evaluate(scenario,"closePortability();openPortability();document.querySelector('[data-portable=export]').click();true");
            awaitTrue(scenario,"exportAuditResolves.length===2");
            evaluate(scenario,"exportAuditResolves[0]('old');true");
            assertEquals("true",evaluate(scenario,"portabilityExportBusy&&!document.getElementById('campaign-file-progress').hidden&&document.getElementById('campaign-import-file').disabled"));
            evaluate(scenario,"portabilityStatus='저장을 취소했습니다.';exportAuditResolves[1](null);true");
            awaitTrue(scenario,"!portabilityExportBusy");
            assertEquals("true",evaluate(scenario,"document.getElementById('campaign-file-progress').hidden&&!document.getElementById('campaign-import-file').disabled&&document.getElementById('campaign-file-status').textContent==='저장을 취소했습니다.'"));
            evaluate(scenario,"exportCampaign=window.savedExportForAudit;closePortability();true");
            scenario.onActivity(activity -> assertTrue("Pending export caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void rule13PartialSaveMatchesTheCanonicalSourceFingerprint() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            String encoded=evaluate(scenario,"(()=>{const s=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:13,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);s.match.paused=true;return JSON.stringify(s);})()");
            String raw=(String)new JSONTokener(encoded).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("Rule13 support, movement and contact state must agree with Node", "b9ffdef062d1d13640f1ba562f11985ec08a13844de0a91d9655439fd672d22a",hash.toString());
        }
    }

    @Test public void rule13CounterCommandsAndWholePhysicalMatchMatchTheSource() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{const s=window.rule13Audit=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:13,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);F.setTactic(s.match,'counter');F.setAttackFocus(s.match,'combination');F.advanceContinuous(s.match,10);F.swap(s.match,'m4','m5');F.advanceContinuous(s.match,137);s.match.paused=true;window.rule13CounterReady=false;window.rule13CounterError=null;window.rule13CrossApplied=false;s.match.paused=false;const pump=()=>{try{if(s.match.phase==='half'&&!window.rule13CrossApplied){F.setAttackFocus(s.match,'cross');window.rule13CrossApplied=true;}if(!F.running(s.match)&&s.match.phase!=='full')F.begin(s.match);F.advanceContinuous(s.match,600);if(s.match.phase==='full'){window.rule13CounterSnapshot=JSON.stringify(s.match);window.rule13CounterReady=true;}else setTimeout(pump,0);}catch(e){window.rule13CounterError=String(e);}};setTimeout(pump,0);return true;})()");
            awaitTrue(scenario,"rule13CounterReady||rule13Audit.match.continuous.tick>=18000||!!rule13CounterError");
            awaitTrue(scenario,"rule13CounterReady||rule13Audit.match.continuous.tick>=36000||!!rule13CounterError");
            awaitTrue(scenario,"rule13CounterReady||!!rule13CounterError");
            assertEquals("null",evaluate(scenario,"rule13CounterError"));
            String raw=(String)new JSONTokener(evaluate(scenario,"rule13CounterSnapshot")).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("The entire commanded13 counter game must agree with Node", "d51be0fa258d61add5569c0e444f04cf434a263225720484d87bfd7e92ebd56e",hash.toString());
            assertEquals("true",evaluate(scenario,"rule13Audit.match.continuousSetup.version===13&&rule13Audit.match.lineup.includes('m5')&&!rule13Audit.match.lineup.includes('m4')&&rule13CrossApplied"));
            scenario.onActivity(activity -> assertTrue("Rule13 counter replay caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void rule14PartialSaveMatchesTheCanonicalSourceFingerprint() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            String encoded=evaluate(scenario,"(()=>{const s=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:14,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);s.match.paused=true;return JSON.stringify(s);})()");
            String raw=(String)new JSONTokener(encoded).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("Rule14 support, movement and contact state must agree with Node", "52456d8cd763c9e09021940ecba0bd5b76720b9c8dec0f303dfb8d3df23ff840",hash.toString());
        }
    }

    @Test public void rule14CounterCommandsAndWholePhysicalMatchMatchTheSource() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{const s=window.rule14Audit=S.create(17,{startingClub:true,suspensions:true}),r=Opposition.preview(s);F.enableStoppage(s.match);F.enableContinuous(s.match,{ruleVersion:14,opponentFormation:r.teams[1].formation,opponentPlayers:r.teams[1].players});F.begin(s.match);F.advanceContinuous(s.match,723);F.setTactic(s.match,'counter');F.setAttackFocus(s.match,'combination');F.advanceContinuous(s.match,10);F.swap(s.match,'m4','m5');F.advanceContinuous(s.match,137);s.match.paused=true;window.rule14CounterReady=false;window.rule14CounterError=null;window.rule14CrossApplied=false;s.match.paused=false;const pump=()=>{try{if(s.match.phase==='half'&&!window.rule14CrossApplied){F.setAttackFocus(s.match,'cross');window.rule14CrossApplied=true;}if(!F.running(s.match)&&s.match.phase!=='full')F.begin(s.match);F.advanceContinuous(s.match,600);if(s.match.phase==='full'){window.rule14CounterSnapshot=JSON.stringify(s.match);window.rule14CounterReady=true;}else setTimeout(pump,0);}catch(e){window.rule14CounterError=String(e);}};setTimeout(pump,0);return true;})()");
            awaitTrue(scenario,"rule14CounterReady||rule14Audit.match.continuous.tick>=18000||!!rule14CounterError");
            awaitTrue(scenario,"rule14CounterReady||rule14Audit.match.continuous.tick>=36000||!!rule14CounterError");
            awaitTrue(scenario,"rule14CounterReady||!!rule14CounterError");
            assertEquals("null",evaluate(scenario,"rule14CounterError"));
            String raw=(String)new JSONTokener(evaluate(scenario,"rule14CounterSnapshot")).nextValue();
            byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hash=new StringBuilder();for(byte value:digest){hash.append(Character.forDigit((value>>>4)&15,16));hash.append(Character.forDigit(value&15,16));}
            assertEquals("The entire commanded14 counter game must agree with Node", "bbe6d0540b757a3d0c8cb29dcadace1ad1cf541bdc33504ccf6d12f6a25adf62",hash.toString());
            assertEquals("true",evaluate(scenario,"rule14Audit.match.continuousSetup.version===14&&rule14Audit.match.lineup.includes('m5')&&!rule14Audit.match.lineup.includes('m4')&&rule14CrossApplied"));
            assertEquals("true",evaluate(scenario,"JSON.stringify(S.restore(JSON.parse(JSON.stringify(rule14Audit))))===JSON.stringify(rule14Audit)"));
            scenario.onActivity(activity -> assertTrue("Rule14 counter replay caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void regainedBallPreviewIsReadOnlyAndFitsTheLandscapeWorkspace() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeOperationsPage();managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;customPositions={};tacticalRoles={};setView('match');openMatchPopup('analysis');return true;})()");
            String before=evaluate(scenario,"JSON.stringify(season)");
            tapWebElement(scenario,"[data-tactics-preview=counter]");
            if("true".equals(evaluate(scenario,"document.querySelector('[data-shape-filter=zone]').checkVisibility()"))){
                evaluate(scenario,"(()=>{const e=document.querySelector('[data-shape-filter=zone]');e.value='transition';e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
            }else tapWebElement(scenario,"[data-tactics-zone=transition]");
            awaitTrue(scenario,"teamShapeFrame?.zone==='transition'&&document.querySelector('.shape-names')._labels?.length===22");
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            assertEquals("true",evaluate(scenario,"document.querySelector('.shape-names')._labels.every((p,i,a)=>a.slice(i+1).every(q=>Math.min(p.x+p.width,q.x+q.width)-Math.max(p.x,q.x)<=.1||Math.min(p.y+p.height,q.y+q.height)-Math.max(p.y,q.y)<=.1))&&teamShapeFrame.version===14&&teamShapeFrame.tactic==='counter'&&teamShapeFrame.observation.includes('탈취 직후')"));
            assertEquals("Landscape controls and statistics must stay within the current viewport", "true",evaluate(scenario,"[...document.querySelectorAll('.team-shape-board button,.team-shape-board select,.shape-report table,.shape-field figure')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+2&&e.scrollHeight<=e.clientHeight+2&&(!['BUTTON','SELECT'].includes(e.tagName)||r.height>=43.9);})"));
            screenshot(scenario,"android-regained-ball-preview.png");
            tapWebElement(scenario,"[data-tactics-apply=counter]");
            assertEquals("true",evaluate(scenario,"state.tactic==='counter'"));
            assertEquals("true",evaluate(scenario,"state.phase==='prep'"));
            tapWebElement(scenario,".match-popup-header [data-match-popup-close]");
            assertEquals("false",evaluate(scenario,"F.running(state)"));
            scenario.onActivity(activity -> assertTrue("Regain preview caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void cappedSquadForecastKeepsAllEighteenRowsAndTheCampaign() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeOperationsPage();managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;let trained=S.create(41,{startingClub:true,suspensions:true});while(!S.ready(trained)){if(trained.competition==='league'&&S.trainingPreview(trained,'technique').available)S.train(trained,'technique');while(trained.match.phase!=='full'){if(!F.running(trained.match))F.begin(trained.match);F.finishSegment(trained.match);}trained=S.settle(trained);}season=S.nextSeason(trained);state=season.match;if(JSON.stringify(S.restore(JSON.parse(JSON.stringify(season))))!==JSON.stringify(season))throw Error('Capped fixture must be a valid completed-season career');setView('club');openManagementPanel('training-card');return true;})()");
            String before=evaluate(scenario,"JSON.stringify(season)");
            assertEquals("true",evaluate(scenario,"(()=>{const rows=[...document.querySelectorAll('.team-training-preview li')];return rows.length===18&&rows.every(e=>e.querySelector('small').title==='성장 한계 도달'&&e.textContent.includes('한계'));})()"));
            assertEquals("Capped forecast names and numbers must remain inside their rows", "true",evaluate(scenario,"[...document.querySelectorAll('.team-training-preview,.team-training-preview ul,.team-training-preview li,.team-training-preview small,.team-training-preview strong,.team-energy')].filter(e=>e.checkVisibility()).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth+2&&e.scrollHeight<=e.clientHeight+2;})"));
            screenshot(scenario,"android-capped-training-forecast.png");
            tapWebElement(scenario,"[data-team-focus=recovery]");
            assertEquals("true",evaluate(scenario,"[...document.querySelectorAll('.team-training-preview li small')].length===18&&[...document.querySelectorAll('.team-training-preview li small')].every(e=>e.title==='최대 체력 도달'&&e.textContent.includes('최대'))"));
            assertEquals(before,evaluate(scenario,"JSON.stringify(season)"));
            scenario.onActivity(activity -> assertTrue("Capped training forecast caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }

    @Test public void landscapeSaveComparisonKeepsActionsVisibleAndNeverAppliesOnViewing() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitReady(scenario);
            evaluate(scenario,"window.saveWorkspaceOriginal=JSON.stringify(currentCampaignPayload());openPortability();previewCampaignText(CampaignFile.stringify(currentCampaignPayload()));true");
            assertEquals("true",evaluate(scenario,"(()=>{const d=document.getElementById('portability-dialog'),body=d.querySelector('.portable-body'),actions=[...d.querySelectorAll('.portable-actions>*')];return d.open&&d.querySelectorAll('.portable-summary').length===2&&body.scrollHeight<=body.clientHeight+1&&body.scrollWidth<=body.clientWidth+1&&actions.length===4&&actions.every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;})&&JSON.stringify(currentCampaignPayload())===saveWorkspaceOriginal;})()"));
            screenshot(scenario,"android-save-comparison.png");
            evaluate(scenario,"window.saveWorkspaceWrite=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Storage full','QuotaExceededError')};applyCampaignImport();Storage.prototype.setItem=saveWorkspaceWrite;true");
            assertEquals("true",evaluate(scenario,"(()=>{const e=document.getElementById('campaign-import-error'),r=e.getBoundingClientRect(),body=document.querySelector('.portable-body');return e.textContent.includes('저장 공간이 부족')&&r.top>=0&&r.bottom<=innerHeight&&body.scrollHeight<=body.clientHeight+1&&JSON.stringify(currentCampaignPayload())===saveWorkspaceOriginal;})()"));
            screenshot(scenario,"android-save-storage-error.png");
            evaluate(scenario,"document.querySelector('[data-android-privacy]').click();true");
            assertEquals("true",evaluate(scenario,"document.getElementById('android-privacy-dialog').open&&JSON.stringify(currentCampaignPayload())===saveWorkspaceOriginal"));
            evaluate(scenario,"document.getElementById('android-privacy-dialog').close();closePortability();true");
            assertEquals("true",evaluate(scenario,"!document.getElementById('portability-dialog').open&&pendingImport===null&&JSON.stringify(currentCampaignPayload())===saveWorkspaceOriginal"));
            scenario.onActivity(activity -> assertTrue("Save workspace caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
        }
    }
    @Test public void storeScreenshotsUseActualNativeLandscapeFrames() throws Exception {
        assertTrue("Store capture changes only a disposable emulator", "ranchu".equals(Build.HARDWARE) || "goldfish".equals(Build.HARDWARE));
        String density=shellForDisplayTest("wm density"),size=shellForDisplayTest("wm size");
        String accelerometer=shellForDisplayTest("settings get system accelerometer_rotation"),rotation=shellForDisplayTest("settings get system user_rotation");
        java.util.regex.Matcher d=java.util.regex.Pattern.compile("Override density: (\\d+)").matcher(density),s=java.util.regex.Pattern.compile("Override size: (\\d+x\\d+)").matcher(size);
        String restoreDensity=d.find()?"wm density "+d.group(1):"wm density reset",restoreSize=s.find()?"wm size "+s.group(1):"wm size reset";
        try {
            shellForDisplayTest("wm size 1080x1920");shellForDisplayTest("wm density 420");
            shellForDisplayTest("settings put system accelerometer_rotation 0");shellForDisplayTest("settings put system user_rotation 0");
            try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
                awaitReady(scenario);String savedClub=evaluate(scenario,"localStorage.getItem(storageKey)");
                try {
                awaitTrue(scenario,"innerWidth>innerHeight&&innerWidth>=600");
                awaitAppWindowFocus(scenario);
                Bitmap physical=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
                assertNotNull(physical);try{assertEquals(1920,physical.getWidth());assertEquals(1080,physical.getHeight());}finally{physical.recycle();}
                evaluate(scenario,"document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');document.getElementById('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(941,{startingClub:true,suspensions:true,rebirth:true});state=season.match;selected=null;customPositions={};tacticalRoles={};setView('club');window.storeCaptureOriginal=JSON.stringify(season);true");
                screenshot(scenario,"android-store-home-1920x1080.png");
                tapWebElement(scenario,".view-nav [data-view=squad]");
                awaitTrue(scenario,"document.querySelectorAll('#squad-overview-dialog [data-squad-detail]').length===18");
                screenshot(scenario,"android-store-squad-1920x1080.png");
                tapWebElement(scenario,".view-nav [data-view=tactics]");
                awaitTrue(scenario,"document.querySelectorAll('[data-workspace-formation]').length===12&&document.querySelectorAll('#tactics-pane [data-tactical-player]').length===11");
                screenshot(scenario,"android-store-tactics-1920x1080.png");
                assertEquals("Store reading routes never spend or alter the club",evaluate(scenario,"storeCaptureOriginal"),evaluate(scenario,"JSON.stringify(season)"));
                tapWebElement(scenario,".view-nav [data-view=match]");tapWebElement(scenario,"#primary");
                awaitTrue(scenario,"document.getElementById('match-ceremony').open&&document.getElementById('match-ceremony').dataset.kind==='preview'&&state.phase==='prep'");
                tapWebElement(scenario,"#ceremony-ready");
                awaitTrue(scenario,"document.getElementById('match-ceremony').open&&document.getElementById('match-ceremony').dataset.kind==='kickoff'");
                awaitTrue(scenario,"!document.getElementById('match-ceremony').open&&state.continuous?.tick>300");
                tapWebElement(scenario,"#primary");awaitTrue(scenario,"state.paused&&document.getElementById('match-names')._labels?.length===22");
                assertEquals("true",evaluate(scenario,"document.getElementById('field').getBoundingClientRect().width>document.getElementById('match-live-stats').getBoundingClientRect().width&&document.documentElement.scrollHeight<=innerHeight+1"));
                screenshot(scenario,"android-store-match-1920x1080.png");
                scenario.onActivity(activity->assertTrue("Store capture caused JavaScript errors: "+activity.consoleErrorsForTest(),activity.consoleErrorsForTest().isEmpty()));
                } finally {evaluate(scenario,"(()=>{const prior="+savedClub+";if(prior===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,prior);return true;})()");}
            }
        } finally {
            restoreDisplaySetting("accelerometer_rotation",accelerometer);restoreDisplaySetting("user_rotation",rotation);
            shellForDisplayTest(restoreDensity);shellForDisplayTest(restoreSize);
        }
    }

}
