'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),SaveRecovery=require('./dist/save-recovery.js'),CampaignFile=require('./dist/campaign-file.js'),MatchFlow=require('./dist/match-flow.js'),Training=require('./dist/training.js');
let groups=0;const copy=value=>JSON.parse(JSON.stringify(value)),key='qa-save-recovery-v17';
function storage(entries=[]){const values=new Map(entries),writes=[],reads=[],options={};return {values,writes,reads,options,getItem(name){reads.push(name);if(options.readDenied)throw Error('SecurityError');return values.has(name)?values.get(name):null;},setItem(name,value){writes.push(name);if(options.failKey===name)throw Error('QuotaExceededError');values.set(name,String(value));},removeItem:name=>values.delete(name)};}
function recovery(store,legacyKeys=[]){return SaveRecovery.create({key,legacyKeys,storage:()=>store,restore:data=>({...data,season:S.restore(data.season)})});}
function raw(seed=3501){return JSON.stringify({season:S.create(seed),view:'club'});}
function midmatch(seed=3502){const season=S.create(seed);F.begin(season.match);while(season.match.minute<23)F.tick(season.match);F.setTactic(season.match,'press');F.swap(season.match,'f2','f3');while(season.match.minute<31)F.tick(season.match);return season;}
function boot(store){
 const source=fs.readFileSync(path.join(__dirname,'dist/app.js'),'utf8'),portable=fs.readFileSync(path.join(__dirname,'dist/portability-ui.js'),'utf8'),notice={};
 const context=vm.createContext({Football:F,Season:S,Economy:require('./dist/economy.js'),Career:require('./dist/career.js'),Cup:require('./dist/cup.js'),Health:require('./dist/health.js'),Statistics:require('./dist/statistics.js'),SaveRecovery,Training,MatchFlow,localStorage:store,document:{getElementById:()=>notice},playbackPrefs:{speed:'normal',coachPause65:false},mediaPrefs:{effects:true,haptics:false},individualTrainingSlot:'',individualTrainingFocus:'technique',squadTab:'health',recordFilter:'all',recordSort:'goals',recordYear:null});
 vm.runInContext(portable.match(/^function currentCampaignPayload\(\).*$/m)[0]+'\n'+source.slice(0,source.indexOf('\nconst coords='))+'\n'+source.match(/^function save\(\).*$/m)[0]+'\nsave();',context);
 return {context,notice,read:expression=>vm.runInContext(expression,context)};
}
// Reuse the existing browser-like harness, exercising the actual import and dialog UI.
const uiSource=fs.readFileSync(path.join(__dirname,'test-portability-ui.cjs'),'utf8'),uiContext=vm.createContext({require,__dirname,console,Blob,TextEncoder});
vm.runInContext(uiSource.slice(0,uiSource.indexOf('async function main()')),uiContext);
function ui(original='{broken JSON',legacy=null){
 const h=uiContext.harness(S.create(3503)),store=h.context.localStorage;
 h.storage.set(h.context.storageKey,original);
 if(legacy)h.storage.set('qa-legacy',legacy);
 h.context.saveRecovery=SaveRecovery.create({key:h.context.storageKey,legacyKeys:['qa-legacy'],storage:()=>store,restore:data=>({...data,season:S.restore(data.season)})});
 const restored=h.context.saveRecovery.load();if(restored.payload){h.context.season=restored.payload.season;h.context.state=h.context.season.match;}
 h.context.canSave=!restored.blocked;h.context.window={confirm:()=>false};return h;
}
async function test(name,fn){await fn();groups++;console.log('PASS '+name);}
(async()=>{
 await test('malformed JSON, damaged season and future-version saves survive actual app boot and repeated saves',()=>{
  const future=copy(S.create(3504));future.version=99;const broken=copy(S.create(3505));broken.squad.f2.identity='missing';
  for(const original of ['{broken JSON',JSON.stringify({season:broken}),JSON.stringify({season:future}), '']){
   const store=storage([['win-again-season-v17',original]]),h=boot(store);assert.equal(h.read('saveRecovery.isBlocked()'),true);assert.equal(h.read('canSave'),false);assert.equal(store.values.get('win-again-season-v17'),original);h.read('save();save();');assert.equal(store.writes.length,0);assert.match(h.notice.textContent,/원본/);
  }
 });
 await test('a valid mid-match boot keeps RNG, score, decisions, lineup and preferences and pauses exactly at the saved minute',()=>{
  const season=midmatch(),payload={season,view:'academy',playback:{speed:'slow',coachPause65:true},media:{effects:false,haptics:true},lineupPlan:{roles:{[season.squad.f2.identity]:'poacher'},positions:{[season.squad.f2.identity]:[35,23]}}},store=storage([['win-again-season-v17',JSON.stringify(payload)]]),h=boot(store),saved=JSON.parse(store.values.get('win-again-season-v17'));
  assert.equal(h.read('saveRecovery.isBlocked()'),false);assert.equal(h.read('canSave'),true);assert.equal(saved.season.match.minute,31);assert.equal(saved.season.match.paused,true);assert.equal(saved.season.match.rng,season.match.rng);assert.deepEqual(saved.season.match.decisions,season.match.decisions);assert.deepEqual(saved.season.match.score,season.match.score);assert.deepEqual(saved.season.match.lineup,season.match.lineup);assert.deepEqual(saved.lineupPlan,payload.lineupPlan);assert.deepEqual(saved.playback,payload.playback);assert.equal(saved.view,'match');assert.equal(store.writes.length,1);
 });
 await test('legacy candidates are read separately and a damaged current key is protected while an older valid match can be previewed',()=>{
  const store=storage([[key,'{damaged'],['qa-v16','null'],['qa-v15',raw(3506)]]),r=recovery(store,['qa-v16','qa-v15','qa-v14']),loaded=r.load();assert.equal(loaded.payload.season.seed,3506);assert.equal(loaded.loadedKey,'qa-v15');assert.equal(loaded.blocked,true);assert.deepEqual(store.reads,[key,'qa-v16','qa-v15']);assert.equal(r.save({season:S.create(1)}),false);assert.equal(store.writes.length,0);assert.deepEqual(r.originals().map(entry=>entry.key),[key,'qa-v16']);assert.equal(store.values.get(key),'{damaged');const preview=r.candidate();preview.season.finance.balance=0;assert.notEqual(r.candidate().season.finance.balance,0);
 });
 await test('legacy-only valid saves migrate normally without changing the legacy source or unrelated browser data',()=>{
  const text=raw(3507),store=storage([['qa-v16',text],['private-browser-data','private']]),r=recovery(store,['qa-v16']);assert.equal(r.load().blocked,false);assert.equal(r.save(r.candidate()),true);assert.equal(store.values.get('qa-v16'),text);assert.equal(JSON.parse(store.values.get(key)).season.seed,3507);assert.equal(store.values.get('private-browser-data'),'private');
 });
 await test('a denied storage read blocks writes and an explicit recovery retries the read before retaining unseen originals',()=>{
  const original='{unreadable original',store=storage([[key,original]]),r=recovery(store);store.options.readDenied=true;assert.equal(r.load().readFailed,true);assert.equal(r.save({season:S.create(1)}),false);assert.throws(()=>r.replace({season:S.create(1)},raw(3508)));assert.equal(store.writes.length,0);store.options.readDenied=false;assert.equal(r.replace({season:S.create(3509)},raw(3508)),true);assert.equal(store.values.get(key+'-recovery-original'),original);assert.equal(r.isBlocked(),false);
 });
 await test('an unseen valid campaign is also retained when storage becomes readable, and failed replacement keeps the lock',()=>{
  const original=raw(3529),store=storage([[key,original]]),r=recovery(store);store.options.readDenied=true;r.load();store.options.readDenied=false;store.options.failKey=key+'-recovery-original';assert.throws(()=>r.replace({season:S.create(3530)},raw(3531)));assert.equal(r.isBlocked(),true);assert.equal(store.values.get(key),original);assert.equal(r.save({season:S.create(1)}),false);delete store.options.failKey;r.replace({season:S.create(3530)},raw(3531));assert.equal(store.values.get(key+'-recovery-original'),original);assert.equal(r.isBlocked(),false);
 });
 await test('retaining an original is required before replacing a blocked campaign, including quota failure and retry',()=>{
  const original='{damaged',store=storage([[key,original]]),r=recovery(store),next={season:S.create(3510)};r.load();store.options.failKey=key+'-recovery-original';assert.throws(()=>r.replace(next,raw(3511)));assert.equal(r.isBlocked(),true);assert.equal(store.values.get(key),original);assert.equal(store.values.has(key+'-before-import'),false);delete store.options.failKey;assert.equal(r.replace(next,raw(3511)),true);assert.equal(store.values.get(key+'-recovery-original'),original);assert.equal(JSON.parse(store.values.get(key)).season.seed,3510);
 });
 await test('different originals retain separate slots and a retry never replaces an earlier recovery archive',()=>{
  const store=storage([[key,'{new original'],[key+'-recovery-original','{older original']]),r=recovery(store);r.load();store.options.failKey=key;assert.throws(()=>r.replace({season:S.create(3512)},raw(3513)));assert.equal(store.values.get(key+'-recovery-original'),'{older original');assert.equal(store.values.get(key+'-recovery-original-2'),'{new original');delete store.options.failKey;r.replace({season:S.create(3512)},raw(3513));assert.equal(store.values.has(key+'-recovery-original-3'),false);assert.equal(store.values.get(key+'-recovery-original'),'{older original');
 });
 await test('retained originals stay discoverable after a successful recovery and a fresh application session',()=>{
  const original='{retained original',store=storage([[key,original]]),r=recovery(store);r.load();r.replace({season:S.create(3526)},raw(3527));const restarted=recovery(store);assert.equal(restarted.load().blocked,false);assert.deepEqual(restarted.archivedOriginals(),[{key,text:original}]);assert.equal(JSON.parse(store.values.get(key)).season.seed,3526);
 });
 await test('failed main-write recovery preserves the old recovery slot and damaged main, without enabling auto-save',()=>{
  const store=storage([[key,'{damaged'],[key+'-before-import',raw(3514)]]),r=recovery(store);r.load();store.options.failKey=key;assert.throws(()=>r.replace({season:S.create(3515)},raw(3516)));assert.equal(store.values.get(key),'{damaged');assert.equal(store.values.get(key+'-before-import'),raw(3514));assert.equal(store.values.get(key+'-recovery-original'),'{damaged');assert.equal(r.isBlocked(),true);assert.equal(r.save({season:S.create(1)}),false);
 });
 await test('a failed import into an empty recovery slot removes only the newly written recovery entry',()=>{
  const store=storage([[key,raw(3517)]]),r=recovery(store);r.load();store.options.failKey=key;assert.throws(()=>r.replace({season:S.create(3518)},raw(3519)));assert.equal(store.values.has(key+'-before-import'),false);assert.equal(store.values.get(key),raw(3517));
 });
 await test('a successful replacement backs up the current in-memory campaign including roles and restores normal saving',()=>{
  const store=storage([[key,raw(3520)]]),r=recovery(store),current={season:midmatch(3521),lineupPlan:{roles:{f2:'poacher'},positions:{f2:[35,23]}}};r.load();r.replace({season:S.create(3522)},JSON.stringify(current));assert.deepEqual(JSON.parse(store.values.get(key+'-before-import')),current);assert.equal(r.save({season:S.create(3523)}),true);assert.equal(JSON.parse(store.values.get(key)).season.seed,3523);
 });
 await test('the recovery panel downloads the exact damaged original without writing or replacing the current campaign',async()=>{
  const original='  {damaged original\n',h=ui(original),before=JSON.stringify(h.context.season);h.context.openPortability();assert.ok(h.get('campaign-recovery-title'));assert.ok(h.find('[data-portable="recovery-export"]'));await h.event(h.find('[data-portable="recovery-export"]'),'click');assert.equal(await h.objectUrls[0].blob.text(),original);assert.match(h.downloads[0].download,/recovery-original/);assert.equal(h.storage.get(h.context.storageKey),original);assert.equal(h.writes.length,0);assert.equal(JSON.stringify(h.context.season),before);assert.equal(h.context.saveRecovery.isBlocked(),true);h.context.closePortability();assert.equal(h.context.saveRecovery.isBlocked(),true);
 });
 await test('invalid backup previews and cancelled new-campaign confirmation preserve the damaged original and lock',async()=>{
  const h=ui(),before=JSON.stringify(h.context.season);h.context.openPortability();h.context.previewCampaignText('{invalid backup');assert.equal(h.context.applyCampaignImport(),false);await h.event(h.find('[data-portable="recovery-new"]'),'click');assert.equal(JSON.stringify(h.context.season),before);assert.equal(h.context.saveRecovery.isBlocked(),true);assert.equal(h.writes.length,0);assert.equal(h.storage.get(h.context.storageKey),'{broken JSON');
 });
 await test('a valid backup import retains the damaged raw original and restores a paused match with its exact progress',()=>{
  const h=ui(),incoming=midmatch(3524),before=JSON.stringify(h.context.currentCampaignPayload());h.context.openPortability();h.context.previewCampaignText(CampaignFile.stringify({season:incoming}));assert.equal(h.context.applyCampaignImport(),true);assert.equal(h.storage.get(h.context.storageKey+'-recovery-original'),'{broken JSON');assert.equal(h.storage.get(h.context.storageKey+'-before-import'),before);assert.equal(h.context.saveRecovery.isBlocked(),false);assert.equal(h.context.state.minute,31);assert.equal(h.context.state.rng,incoming.match.rng);assert.equal(h.context.state.paused,true);assert.deepEqual(copy(h.context.state.decisions),incoming.match.decisions);assert.equal(h.dialog.open,false);assert.equal(h.context.canSave,true);
 });
 await test('the ordinary save dialog can download a retained original after recovery without changing the recovered campaign',async()=>{
  const h=ui('{retained original');h.context.openPortability();h.context.previewCampaignText(CampaignFile.stringify({season:S.create(3528)}));h.context.applyCampaignImport();const before=JSON.stringify(h.context.season),writes=h.writes.length;h.context.openPortability();assert.ok(h.find('[data-portable="recovery-export"]'));assert.equal(h.find('[data-portable="recovery-new"]'),null);await h.event(h.find('[data-portable="recovery-export"]'),'click');assert.equal(await h.objectUrls[0].blob.text(),'{retained original');assert.equal(JSON.stringify(h.context.season),before);assert.equal(h.writes.length,writes);
 });
 await test('the previous valid legacy preview remains read-only until the explicit import button is clicked',async()=>{
  const legacy=raw(3525),h=ui('{current damaged',legacy);h.context.openPortability();await h.event(h.find('[data-portable="recovery-preview"]'),'click');assert.equal(h.read('pendingImport.payload.season.seed'),3525);assert.equal(h.writes.length,0);assert.equal(h.context.saveRecovery.isBlocked(),true);await h.event(h.find('[data-portable="import"]'),'click');assert.equal(h.context.saveRecovery.isBlocked(),false);assert.equal(h.storage.get('qa-legacy'),legacy);assert.equal(h.storage.get(h.context.storageKey+'-recovery-original'),'{current damaged');assert.equal(h.context.season.seed,3525);
 });
 await test('explicitly confirmed new campaigns retain the original, while a retention quota failure keeps the existing model',async()=>{
  for(const fail of [true,false]){const h=ui(),before=JSON.stringify(h.context.season);let confirmations=0;h.context.window.confirm=()=>{confirmations++;return true;};h.context.openPortability();if(fail)h.options.failKey=h.context.storageKey+'-recovery-original';await h.event(h.find('[data-portable="recovery-new"]'),'click');assert.equal(confirmations,1);if(fail){assert.equal(h.context.saveRecovery.isBlocked(),true);assert.equal(JSON.stringify(h.context.season),before);assert.equal(h.storage.get(h.context.storageKey),'{broken JSON');assert.match(h.get('campaign-import-error').textContent,/현재 구단은 유지/);}else{assert.equal(h.context.saveRecovery.isBlocked(),false);assert.equal(h.storage.get(h.context.storageKey+'-recovery-original'),'{broken JSON');assert.equal(h.context.season.year,1);assert.equal(h.context.season.round,0);assert.equal(h.context.state.phase,'prep');assert.equal(h.context.canSave,true);}}
 });
 console.log('Validated '+groups+' save recovery groups with isolated storage and actual startup/import UI.');
})().catch(error=>{console.error(error);process.exitCode=1;});
