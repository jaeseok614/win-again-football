// Run after build-pwa. Optional PLAYWRIGHT_MODULE / CHROME_PATH select installed tools.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{const p=await b.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await p.evaluate(()=>{managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');$('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;setView('match');openMatchPopup('tactics');});

await p.evaluate(()=>{closeMatchPopup();F.begin(state);F.tick(state);render();});
for(const [width,height] of [[568,280],[568,320],[640,360],[740,360],[844,390],[915,412],[1024,768]]){
 await p.setViewportSize({width,height});await p.evaluate(()=>{setView('match');render();});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const live=await p.evaluate(()=>{const pitch=$('pitch').getBoundingClientRect(),nav=document.querySelector('.view-nav').getBoundingClientRect();return {height:pitch.height,commentary:document.querySelector('#matchday-live>.commentary').getBoundingClientRect().bottom,top:pitch.top,bottom:pitch.bottom,nav:nav.top,scroll:document.documentElement.scrollWidth-innerWidth};});
 assert.ok(live.height>=120,JSON.stringify({width,height,live}));assert.ok(live.commentary<=live.top&&live.bottom<live.nav);assert.equal(live.scroll,0);
 let actionY=null;
 for(let step=0;step<6;step++){
  await p.evaluate(step=>openManagerGuide(step),step);
  const guide=await p.evaluate(()=>{const d=$('manager-guide'),c=$('manager-guide-copy'),buttons=[...d.querySelectorAll('button')].filter(e=>e.getClientRects().length);return {scroll:c.scrollHeight-c.clientHeight,dialog:d.scrollHeight-d.clientHeight,top:$('manager-guide-next').getBoundingClientRect().top,inside:buttons.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.height>=44})};});
  assert.ok(guide.scroll<=1,JSON.stringify({width,height,step,guide}));assert.equal(guide.dialog,0);assert.ok(guide.inside);if(actionY!==null)assert.equal(guide.top,actionY);actionY=guide.top;
 }
 await p.evaluate(()=>{managerGuideActive=false;$('manager-guide').close();openClubStory('1:arrival');});
 const before=await p.evaluate(()=>ClubStory.fingerprint(season));
 for(let page=0;page<3;page++){
  if(page)await p.locator('[data-story-page=next]').click();
  const story=await p.evaluate(()=>{const d=$('club-story-dialog'),r=d.querySelector('.story-reading'),buttons=[...d.querySelectorAll('button')].filter(e=>e.getClientRects().length);return {page:clubStoryPage,scroll:d.scrollHeight-d.clientHeight,reading:r.scrollHeight-r.clientHeight,inside:buttons.every(e=>{const q=e.getBoundingClientRect();return q.left>=0&&q.right<=innerWidth&&q.bottom<=innerHeight&&q.height>=44})};});
  assert.equal(story.page,page);assert.equal(story.scroll,0);assert.ok(story.reading<=1,JSON.stringify({width,height,page,story}));assert.ok(story.inside);
 }
 assert.equal(await p.evaluate(()=>ClubStory.fingerprint(season)),before,'reading must not answer');await p.locator('[data-story-page=previous]').click();assert.equal(await p.evaluate(()=>clubStoryPage),1);
 await p.evaluate(()=>{$('club-story-dialog').close();setView('club');openManagerNotebook();});await p.waitForFunction(()=>!!notebookRows);
 assert.deepEqual(await p.evaluate(()=>[notebookDialog.scrollHeight-notebookDialog.clientHeight,...[...notebookDialog.querySelectorAll('.notebook-card')].map(e=>e.scrollHeight-e.clientHeight)]),[0,0,0]);
 await p.evaluate(()=>notebookDialog.close());console.log('PASS landscape reading and match '+width+'x'+height);
}
await p.setViewportSize({width:844,height:390});await p.evaluate(()=>setView('squad'));await p.locator('[data-management-open=squad-overview]').click();assert.ok(await p.locator('#squad-overview-dialog').evaluate(e=>e.open));await p.evaluate(()=>$('squad-overview-dialog').close());
for(const id of ['staff-panel','transfer-search-panel','club-life-panel','individual-training','academy-overview']){
 await p.evaluate(id=>openManagementPanel(id),id);
 assert.deepEqual(await p.evaluate(()=>{const d=$('management-dialog'),c=$('management-content'),close=$('management-close').getBoundingClientRect();return [d.scrollWidth-d.clientWidth,d.scrollHeight-d.clientHeight,c.scrollWidth-c.clientWidth,close.bottom<=innerHeight];}),[0,0,0,true],id);
 if(id==='transfer-search-panel'){await p.locator('#transfer-position').selectOption('FW');assert.ok(await p.locator('.market-card').count()>0);assert.ok((await p.locator('.market-card .position').allTextContents()).every(s=>s==='FW'));}
 await p.locator('#management-close').click();
}
await p.evaluate(()=>openClubStory('1:arrival'));for(let i=0;i<2;i++)await p.locator('[data-story-page=next]').click();await p.locator('[data-story-choice]').first().click();assert.equal(await p.evaluate(()=>ClubStory.scene(season,'1:arrival').step),1);await p.locator('[data-story-page=next]').click();await p.locator('[data-story-choice]').first().click();assert.equal(await p.evaluate(()=>ClubStory.scene(season,'1:arrival').step),2);
assert.deepEqual(errors,[]);console.log('PASS management routing, filter-only search and explicit story choices');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
