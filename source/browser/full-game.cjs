'use strict';
// Run against generated native HTML in an isolated browser, never a real Play purchase.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--blink-settings=minimumFontSize=8,minimumLogicalFontSize=8'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.WinAgainBilling={postMessage:message=>{window.billingRequests??=[];window.billingRequests.push(JSON.parse(message));}};});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../../android/app/src/main/assets/game/index.html')).href);
  await page.locator('#launch-continue').click();await page.locator('#full-game-dialog').waitFor({state:'visible'});
  const emit=state=>page.evaluate(value=>WinAgainBilling.onmessage({data:JSON.stringify({type:'billing',owned:false,canBuy:false,busy:false,price:'',status:'trial',message:'첫 시즌 무료 체험 중입니다.',...value})}),state);
  const fit=()=>page.evaluate(()=>{
   const dialog=document.getElementById('full-game-dialog'),copy=dialog.querySelector('.full-game-copy'),rect=dialog.getBoundingClientRect();
   return {visible:dialog.open,fits:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,scroll:dialog.scrollHeight>dialog.clientHeight+1||copy.scrollHeight>copy.clientHeight+1,
    buttons:[...dialog.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.top>=rect.top&&r.bottom<=rect.bottom;})};
  });
  const statuses=[{status:'unavailable',message:'정식판 판매를 준비하고 있습니다. 첫 시즌은 무료로 체험할 수 있어요.'},
   {status:'trial',price:'₩4,900',canBuy:true},
   {status:'pending',message:'결제 대기 중입니다. Google Play에서 결제가 완료된 뒤 다시 확인해 주세요. 아직 정식판이 열리지 않았어요.'},
   {status:'error',message:'구매 권한을 기기에 저장하지 못했어요. 저장 공간을 확보한 뒤 구매 복원으로 다시 확인해 주세요. 다시 결제하지 마세요.'},
   {status:'owned',owned:true,message:'정식판이 열렸습니다. 다음 시즌은 시즌 결산에서 직접 시작해 주세요.'}];
  for(const [width,height] of [[568,280],[568,320],[640,360],[740,360],[844,364],[844,390],[915,412],[1024,768]]){
   await page.setViewportSize({width,height});
   for(const state of statuses){await emit(state);const result=await fit();if(result.scroll)console.log(await page.evaluate(()=>[...document.getElementById('full-game-dialog').querySelectorAll('header,.full-game-copy,footer,p')].map(n=>({tag:n.tagName,cls:n.className,h:n.clientHeight,sh:n.scrollHeight,rect:n.getBoundingClientRect().height,font:getComputedStyle(n).fontSize,margin:getComputedStyle(n).margin}))));assert.deepEqual(result,{visible:true,fits:true,scroll:false,buttons:true},state.status+' '+width+'x'+height);}
   console.log('PASS full-game disclosure, all purchase states and 44px actions '+width+'x'+height);
  }
  await emit({price:'₩4,900',canBuy:true});await page.locator('[data-full-buy]').click();
  assert.equal(await page.locator('[data-full-buy]').isDisabled(),true);assert.equal(await page.evaluate(()=>billingRequests.at(-1).action),'buy');
  await emit({status:'pending',canBuy:true});assert.equal(await page.evaluate(()=>WinAgainFullGame.status.owned),false);assert.equal(await page.locator('[data-full-buy]').isDisabled(),true);
  await page.locator('[data-full-restore]').click();assert.equal(await page.evaluate(()=>billingRequests.at(-1).action),'restore');
  await emit({status:'error'});await page.locator('[data-full-save]').click();
  assert.equal(await page.locator('#portability-dialog').isVisible(),true);await page.locator('[data-full-open]').click();assert.equal(await page.locator('#full-game-dialog').isVisible(),true);
  assert.equal(await page.locator('[data-full-buy]').isDisabled(),true);assert.deepEqual(errors,[]);
  console.log('PASS buy/restore loading and access to the existing save/export screen without entitlement');
  const fixtures=path.resolve(__dirname,'../../work/native-test-assets');require('../build-android-fixtures.cjs').build(fixtures);
  const history=JSON.parse(fs.readFileSync(path.join(fixtures,'notebook-history.json'),'utf8'));
  await page.evaluate(value=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;season=S.restore(value);state=season.match;setView('club');openManagerNotebook();},history);
  await page.waitForFunction(()=>!!notebookRows);
  assert.equal(await page.evaluate(()=>season.year===3&&!WinAgainFullGame.status.owned),true);
  await page.locator('[data-notebook-tab=history]').click();
  await page.locator('[data-notebook-year]').selectOption('1');await page.locator('[data-notebook-page="1"]').click();
  const before=await page.evaluate(()=>JSON.stringify(season));await page.locator('[data-notebook-event^="1:"]').first().click();
  assert.equal(await page.evaluate(()=>ClubStory.scene(season,clubStoryEvent).readOnly),true);assert.equal(await page.locator('#club-story-dialog [data-story-choice]').count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify(season)),before);
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  assert.equal(await page.evaluate(()=>{try{F.begin(state);return false;}catch{return !!document.querySelector('#full-game-dialog[open]');}}),true);
  assert.deepEqual(errors,[]);console.log('PASS validated later-season history stays readable and byte-identical while paid match progression stays blocked');
  const trained=JSON.parse(fs.readFileSync(path.join(fixtures,'trained-season.json'),'utf8'));
  await page.evaluate(value=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());closeOperationsPage();season=S.restore(value);state=season.match;setView('club');openManagementPanel('training-card');},trained);
  assert.equal(await page.evaluate(()=>{const rows=[...document.querySelectorAll('.team-training-preview li')];return season.year===2&&!WinAgainFullGame.status.owned&&rows.length===18&&rows.every(e=>e.querySelector('small').title==='성장 한계 도달');}),true);
  const trainedBefore=await page.evaluate(()=>JSON.stringify(season));await page.locator('[data-team-focus=recovery]').click();assert.equal(await page.evaluate(()=>JSON.stringify(season)),trainedBefore);
  assert.deepEqual(errors,[]);console.log('PASS capped 18-player later-season forecast remains readable without an entitlement or campaign mutation');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
