'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),android=path.join(root,'android'),read=file=>fs.readFileSync(path.join(android,file),'utf8');
function test(name,run){run();console.log('PASS '+name);}
test('native app targets API36, keeps offline permissions, and disables OS backup',()=>{
 const manifest=read('app/src/main/AndroidManifest.xml'),gradle=read('app/build.gradle');
 assert.match(gradle,/applicationId 'com\.jaeseok614\.winagainfootball'/);assert.match(gradle,/targetSdk 36/);assert.match(gradle,/minSdk 24/);
 assert.doesNotMatch(manifest,/<uses-permission/);assert.match(manifest,/allowBackup="false"/);assert.match(manifest,/usesCleartextTraffic="false"/);
 assert.doesNotMatch(gradle,/signingConfig\s/);assert.match(read('.gitignore'),/\*\.jks/);
 assert.doesNotMatch(read('app/src/main/res/values/styles.xml'),/windowLightNavigationBar/);
});
test('official Gradle wrapper and distribution SHA256 are pinned',()=>{
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(android,'gradle/wrapper/gradle-wrapper.jar'))).digest('hex');
 assert.equal(actual,'81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f');
 assert.equal(read('gradle/wrapper/gradle-wrapper.jar.sha256').trim(),actual);
 assert.match(read('gradle/wrapper/gradle-wrapper.properties'),/distributionSha256Sum=20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78/);
});
test('Android title, stadium loader, football bitmap and adaptive safe icon are bundled',()=>{
 const manifest=read('app/src/main/AndroidManifest.xml'),strings=read('app/src/main/res/values/strings.xml');
 assert.match(manifest,/android:label="@string\/app_name"/);assert.match(manifest,/@mipmap\/ic_launcher_round/);
 assert.ok(strings.includes('눈 떠보니 5부 리그 감독! 토투넘 1부 귀환기'));
 const png=fs.readFileSync(path.join(android,'app/src/main/res/drawable-nodpi/football_icon.png'));
 assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);
 const stadium=fs.readFileSync(path.join(android,'app/src/main/res/drawable-nodpi/launch_stadium.webp'));
 assert.equal(stadium.subarray(8,12).toString(),'WEBP');assert.ok(stadium.length<150000);
 for(const file of ['ic_launcher','ic_launcher_round'])assert.match(read('app/src/main/res/mipmap-anydpi-v26/'+file+'.xml'),/<adaptive-icon/);
 const java=read('app/src/main/java/com/jaeseok614/winagainfootball/MainActivity.java');
 assert.match(java,/R\.drawable\.launch_stadium/);assert.match(java,/compact \? 0\.70f : 0\.50f/);
 assert.match(java,/setIndeterminate\(indeterminate\)/);assert.match(java,/setProgress\(value\)/);
});
test('WebView restricts local origin, untrusted navigation, file access, and bridge',()=>{
 const java=read('app/src/main/java/com/jaeseok614/winagainfootball/MainActivity.java');
 assert.match(java,/WebViewAssetLoader/);assert.match(java,/setAllowFileAccess\(false\)/);assert.match(java,/setAllowContentAccess\(false\)/);
 assert.doesNotMatch(java,/addJavascriptInterface/);assert.match(java,/Collections\.singleton\(GAME_ORIGIN\)/);assert.match(java,/!isMainFrame/);
 assert.match(java,/request\.hasGesture\(\)/);assert.match(java,/Intent\.ACTION_CREATE_DOCUMENT/);assert.match(java,/Intent\.ACTION_OPEN_DOCUMENT/);
 assert.match(java,/MAX_FILE_BYTES = 2 \* 1024 \* 1024/);assert.match(java,/onRenderProcessGone/);
 assert.match(java,/!request\.isForMainFrame\(\) && isInlineImage\(uri\)/);
 for(const mime of ['png','webp','jpeg'])assert.ok(java.includes('data:image/'+mime+';base64,'));
 assert.doesNotMatch(java,/data:text\/html|data:image\/svg/);
});
let context,posts=[],dialogs=[],pauses=0,saves=0,renders=0,closed=0,view='match';
const adapter=read('web/android-adapter.js');
function setup(){
 posts=[];dialogs=[];pauses=0;saves=0;renders=0;closed=0;
 const native={postMessage:message=>posts.push(JSON.parse(message))};
 context={window:null,WinAgainNative:native,Blob,Map,Object,Promise,Event,
  document:{querySelectorAll:selector=>selector==='dialog[open]'?dialogs:[],getElementById:()=>null,addEventListener(){}},
  pauseForPlanning:()=>pauses++,save:()=>saves++,render:()=>renders++,setView:next=>context.view=next,
  view:'match',tacticsBoardOpen:false,downloadCampaignText(){},exportCampaign(){},exportRecoveryOriginal(){},renderPwaStatus(){},
  portabilityStatus:'',portabilityError:'',updateImportPreview(){},CampaignFile:{stringify:JSON.stringify},currentCampaignPayload:()=>({save:'unchanged'}),
  season:{year:1,round:0},recoveryIsBlocked:()=>true,saveRecovery:{originals:()=>[{text:'malformed original bytes'}]},
  addEventListener(){}};
 context.window=context;vm.createContext(context);new vm.Script(adapter).runInContext(context);
}
test('Android back closes game dialogs before switching tabs or exiting',()=>{
 setup();dialogs=[{dispatchEvent:()=>true,close:()=>closed++}];assert.equal(context.WinAgainAndroid.handleBack(),true);assert.equal(closed,1);
 dialogs=[];assert.equal(context.WinAgainAndroid.handleBack(),true);assert.equal(context.view,'club');
 assert.equal(context.WinAgainAndroid.handleBack(),false);assert.equal(pauses,1);assert.equal(saves,1);assert.equal(renders,1);
});
test('Android pause saves the campaign without automatically resuming play',()=>{
 setup();context.WinAgainAndroid.pause();assert.equal(pauses,1);assert.equal(saves,1);assert.equal(renders,1);
});
(async()=>{
 setup();const text='{"campaign":"구단","version":1}';
 const result=context.WinAgainAndroid.exportFile(text,'win-again.json');assert.equal(posts.length,1);assert.equal(posts[0].text,text);
 await assert.rejects(context.WinAgainAndroid.exportFile(text,'second.json'),/저장 창/);
 context.WinAgainNative.onmessage({data:JSON.stringify({id:posts[0].id,status:'saved',message:'saved'})});assert.equal((await result).status,'saved');
 console.log('PASS native export preserves UTF8 JSON and prevents duplicate picker');
 const cancel=context.WinAgainAndroid.exportFile(text,'cancel.json');
 context.WinAgainNative.onmessage({data:JSON.stringify({id:posts[1].id,status:'cancelled'})});assert.equal((await cancel).status,'cancelled');
 await assert.rejects(context.WinAgainAndroid.exportFile(text,'../../escape.json'),/형식/);
 await assert.rejects(context.WinAgainAndroid.exportFile('가'.repeat(800000),'large.json'),/크기/);
 console.log('PASS cancelled export, traversal filename and oversized UTF8 export are handled');
 const recovered=context.exportRecoveryOriginal();assert.equal(posts[2].text,'malformed original bytes');
 context.WinAgainNative.onmessage({data:JSON.stringify({id:posts[2].id,status:'error',message:'disk failed'})});assert.equal(await recovered,null);assert.equal(context.portabilityError,'disk failed');
 console.log('PASS native raw recovery export retains original bytes and reports failed save');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'win-again-android-test-'));
 try{
  const {buildAndroid}=require('./build-android.cjs');const first=buildAndroid(temp),html=fs.readFileSync(path.join(temp,'index.html'),'utf8'),second=buildAndroid(temp);
  assert.equal(first.sha256,second.sha256);assert.equal(first.bytes,Buffer.byteLength(html));assert.equal(first.saveKey,'win-again-season-v17');
  assert.equal(crypto.createHash('sha256').update(html).digest('hex'),first.sha256);
  assert.match(html,/Content-Security-Policy/);assert.match(html,/connect-src 'none'/);assert.match(html,/window\.WinAgainAndroid/);
  assert.doesNotMatch(html,/<script src=|<link rel="(?:stylesheet|manifest)"|navigator\.serviceWorker\.register/);
  assert.match(html,/id="campaign-import-file"|id=\\"campaign-import-file\\"/);
  assert.equal((html.match(/data:image\/jpeg;base64,/g)||[]).length,1);
  assert.doesNotMatch(html,/player-faces-v15\.jpg/);
  console.log('PASS Android bundle is complete, deterministic, offline and retains the shared importer');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
