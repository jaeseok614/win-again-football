// Run after build-pwa. Optional PLAYWRIGHT_MODULE / CHROME_PATH select installed tools.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{const p=await b.newPage({viewport:{width:844,height:390}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);await p.evaluate(()=>{managerGuideActive=false;managerGuideWaiting=null;appSessionStarted=true;launchBusy=false;document.body.classList.remove('launch-mode');$('launch-screen').hidden=true;document.querySelector('.app').hidden=false;season=S.create(41,{startingClub:true,suspensions:true});state=season.match;setView('match');openMatchPopup('tactics');});
for(const [width,height] of [[568,320],[640,360],[740,360],[844,390],[915,412],[1024,768],[1280,720]]){
 await p.setViewportSize({width,height});
 for(const shape of await p.evaluate(()=>Object.keys(F.formations))){
  await p.evaluate(shape=>{applyFormationDefaults(shape);render();},shape);
  const faults=await p.evaluate(()=>{
   const faults=[],rect=e=>e.getBoundingClientRect(),inside=(a,b)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;
   const cards=[...document.querySelectorAll('[data-tactical-player]')];
   for(const card of cards){const r=rect(card);for(const selector of ['.placement-badge','b','em','.tactical-short-name'])if(!inside(rect(card.querySelector(selector)),r))faults.push(card.dataset.tacticalPlayer+' outside '+selector);}
   for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=rect(cards[i]),b=rect(cards[j]);if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)faults.push('overlap '+cards[i].dataset.tacticalPlayer+'/'+cards[j].dataset.tacticalPlayer);}
   const profile=document.querySelector('.tactical-selected-profile');if(profile.scrollHeight-profile.clientHeight>1)faults.push('profile scroll '+(profile.scrollHeight-profile.clientHeight));
   for(const button of document.querySelectorAll('.match-popup-nav button')){if(button.scrollHeight>button.clientHeight+1||button.scrollWidth>button.clientWidth+1)faults.push('menu overflow '+button.textContent);if(getComputedStyle(button).wordBreak!=='keep-all')faults.push('word breaks');}
   const title=$('match-popup-title');if(!inside(rect(title),rect(title.parentElement)))faults.push('title overflow');
   return faults;
  });
  assert.deepEqual(faults,[],width+'x'+height+' '+shape);
 }
 console.log('PASS '+width+'x'+height+' / 12 formations / card contents / no card overlap / whole profile / word wrapping');
}
await p.setViewportSize({width:844,height:390});
assert.equal(await p.locator('[data-match-popup="lineup"]').first().innerText(),'코치 선발\n제안');
assert.equal(await p.locator('[data-match-popup="setpieces"]').first().innerText(),'세트피스\n작전실');
await p.locator('.match-popup-nav [data-match-popup="setpieces"]').click();assert.equal(await p.evaluate(()=>matchPopupActive),'setpieces');
await p.locator('.match-popup-nav [data-match-popup="tactics"]').click();
const prior=await p.evaluate(()=>JSON.stringify(season));
await p.evaluate(()=>{state.players.f1.name='아주 긴 이름을 가진 영입 선수';selected='f1';render();});
assert.ok(await p.locator('.tactical-selected-profile header').innerText().then(t=>t.includes('아주 긴 이름을 가진 영입 선수')));
assert.ok(await p.locator('[data-tactical-player="f1"]').getAttribute('aria-label').then(t=>t.includes('아주 긴 이름을 가진 영입 선수')));
await p.locator('[data-tactical-player="f1"]').focus();await p.keyboard.press('ArrowDown');
assert.ok(await p.locator('[data-tactical-player="f1"]').evaluate(e=>e.matches(':focus-visible')));
const band=await p.evaluate(()=>{const p=state.players.f1,r=positions().find(r=>r.id==='f1'),rating=PlayerTraits.placement(p,tacticalPosition(r.x,r.y,p.pos).code);return [tacticalAbilityBand(rating.overall),document.querySelector('[data-tactical-player="f1"] .placement-badge').dataset.abilityBand];});assert.equal(band[0],band[1]);
assert.deepEqual(errors,[]);console.log('PASS real menu buttons, full long-name profile/accessibility, keyboard movement/focus and synchronized rating colors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
