'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),S=require('./dist/season.js'),F=require('./dist/engine.js'),N=require('./dist/club-story.js'),Book=require('./dist/story-notebook.js'),Art=require('./dist/club-art.js');
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
function harness(){
 const season=S.create(761,{startingClub:true}),queue=[],counts={events:0,scenes:0,focus:0},nodes=new Map(),listeners={};
 F.begin(season.match);F.tick(season.match);
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',open:false,isConnected:true,focus(){counts.focus++;},closest(){return null;},addEventListener(type,fn){listeners[type]=fn;},showModal(){this.open=true;},close(){this.open=false;listeners.close?.();},querySelector(){return {focus(){counts.focus++;}};}});return nodes.get(id);};
 const dialog=node('manager-notebook'),ctx={season,ClubStory:{events(...args){counts.events++;return N.events(...args);},scene(...args){counts.scenes++;return N.scene(...args);}},StoryNotebook:Book,ClubArt:Art,storyIllustration:d=>d.art||'locker',escapeText:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),pauseForPlanning(){season.match.paused=true;},openClubStory(){},$:node,requestAnimationFrame:fn=>queue.push(fn),document:{activeElement:node('opener'),createElement:()=>dialog,body:{append(){}}}};
 dialog.setAttribute=()=>{};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/dist/story-notebook-ui.js','utf8'),ctx);
 return {ctx,season,dialog,counts,frame(){assert.ok(queue.length);queue.shift()();},click(selector,dataset={}){dialog.onclick({target:{closest:key=>key===selector?{dataset}:null}});},run:code=>vm.runInContext(code,ctx)};
}
test('opening paints preparation and pauses immediately before any record derivation; reading preserves the campaign',()=>{
 const h=harness(),before=JSON.parse(JSON.stringify(h.season));h.ctx.openManagerNotebook();assert.ok(h.dialog.open);assert.match(h.dialog.innerHTML,/정리하고 있습니다/);assert.equal(h.counts.events,0);assert.equal(h.season.match.paused,true);h.frame();assert.equal(h.counts.events,0);h.frame();assert.ok(h.counts.scenes>0);assert.match(h.dialog.innerHTML,/도착한 이야기/);before.match.paused=true;assert.deepEqual(h.season,before);assert.deepEqual(S.restore(h.season),h.season);
});
test('closing during preparation cancels stale callbacks and never silently resumes football',()=>{
 const h=harness();h.ctx.openManagerNotebook();h.dialog.close();h.frame();h.frame();assert.equal(h.counts.events,0);assert.equal(h.dialog.open,false);assert.equal(h.season.match.paused,true);assert.equal(h.run('notebookRows'),null);
});
test('preparation failure is visible and retry is explicit, pure and uses current records',()=>{
 const h=harness(),events=h.ctx.ClubStory.events;h.ctx.ClubStory.events=()=>{throw Error('fixture read failed');};h.ctx.openManagerNotebook();h.frame();h.frame();assert.match(h.dialog.innerHTML,/수첩을 열지 못했습니다/);assert.match(h.dialog.innerHTML,/data-notebook-retry/);h.ctx.ClubStory.events=events;h.click('[data-notebook-retry]');h.frame();h.frame();assert.match(h.dialog.innerHTML,/도착한 이야기/);assert.equal(h.season.round,0);assert.equal(h.season.clubStory,undefined);
});
test('tab and page changes reuse one derived list while reopening sees an actual new answer',()=>{
 const h=harness();h.ctx.openManagerNotebook();h.frame();h.frame();const calls={...h.counts};h.click('[data-notebook-tab]',{notebookTab:'complete'});h.click('[data-notebook-page]',{notebookPage:'1'});assert.equal(h.counts.events,calls.events);assert.equal(h.counts.scenes,calls.scenes);h.dialog.close();N.choose(h.season,'1:arrival',0,'practical',N.fingerprint(h.season));N.choose(h.season,'1:arrival',1,'honest',N.fingerprint(h.season));const before=JSON.stringify(h.season);h.ctx.openManagerNotebook();h.frame();h.frame();assert.equal(h.run("notebookRows.find(d=>d.id==='1:arrival').step"),2);assert.equal(JSON.stringify(h.season),before);
});
test('the shared batch path derives once per opening and never recalculates during page or tab changes',()=>{const h=harness();let calls=0;h.ctx.ClubStory.scenes=()=>{calls++;return N.scenes(h.season);};h.ctx.openManagerNotebook();h.frame();h.frame();assert.equal(calls,1);assert.equal(h.counts.events,0);assert.equal(h.counts.scenes,0);h.click('[data-notebook-tab]',{notebookTab:'complete'});h.click('[data-notebook-page]',{notebookPage:'1'});assert.equal(calls,1);h.dialog.close();N.choose(h.season,'1:arrival',0,'practical',N.fingerprint(h.season));h.ctx.openManagerNotebook();h.frame();h.frame();assert.equal(calls,2);assert.equal(h.run("notebookRows.find(d=>d.id==='1:arrival').step"),1);});
console.log('Validated '+groups+' notebook preparation and navigation groups.');
