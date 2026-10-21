'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),F=require('./dist/engine.js'),S=require('./dist/season.js'),N=require('./dist/club-story.js'),File=require('./dist/campaign-file.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
let established=S.create(724,{startingClub:true});for(let i=0;i<3;i++)established=finish(established);
test('all twelve follow-up branches depend on the recorded answer and both endings survive restore',()=>{
 for(const key of ['arrival','shape','captain','fans']){
  const questions=new Set();
  for(const first of ['listen','bold','practical'])for(const final of ['commit','honest']){
   const s=copy(established),id='1:'+key,before=copy(s);let d=N.scene(s,id);
   assert.equal(d.reaction,null);assert.equal(d.reply,null);assert.equal(d.impact,null);
   d=N.choose(s,id,0,first,N.fingerprint(s));questions.add(d.question);
   assert.equal(d.reply,null);assert.equal(d.impact,null);assert.deepEqual(d.choices.map(c=>c.id),['commit','honest']);
   assert.deepEqual(s.match,before.match);assert.deepEqual(s.finance,before.finance);
   const offered=d.choices.find(c=>c.id===final).label;
   d=N.choose(s,id,1,final,N.fingerprint(s));assert.equal(d.finalLabel,offered);assert.ok(d.reply);assert.equal(d.choices.length,0);
   const restored=File.read(File.stringify({season:s})).payload.season;
   assert.equal(N.scene(restored,id).question,d.question);assert.equal(N.scene(restored,id).reply,d.reply);
   assert.deepEqual(s.finance,before.finance);assert.deepEqual(s.statistics,before.statistics);
   const after=copy(s.match),original=copy(before.match);delete after.storyMood;delete original.storyMood;assert.deepEqual(after,original);
   const frozen=JSON.stringify(s);N.scene(s,id);N.read(s);assert.equal(JSON.stringify(s),frozen);
  }
  assert.equal(questions.size,3,key+' should remember all three opening answers');
 }
});
test('existing partial and completed v1 dialogue receipts need no migration or repeated effect',()=>{
 const s=S.create(725,{startingClub:true});s.clubStory={version:1,records:[{event:'1:arrival',step:0,choice:'bold',actor:'board',atRound:0}]};
 const restored=S.restore(copy(s));assert.equal(N.scene(restored,'1:arrival').step,1);
 N.choose(restored,'1:arrival',1,'honest',N.fingerprint(restored));const saved=JSON.stringify(restored);
 assert.throws(()=>N.choose(restored,'1:arrival',1,'honest',N.fingerprint(restored)));
 assert.equal(JSON.stringify(restored),saved);assert.doesNotThrow(()=>S.restore(copy(restored)));
});
test('turn-specific lines remain hidden until chosen and replay reconstructs the same exchange',()=>{
 const s=S.create(726,{startingClub:true}),nodes={'.story-conversation':{innerHTML:''},'.story-choices':{hidden:false},'.story-complete':null,'[data-story-action]':null};
 const ctx=vm.createContext({ClubStory:N,ClubArt:require('./dist/club-art.js'),season:s,escapeText:String,$:()=>({dataset:{},querySelector:key=>nodes[key]})});
 const source=fs.readFileSync(__dirname+'/dist/club-story-ui.js','utf8');vm.runInContext(source.slice(0,source.indexOf('const storyPanel=')),ctx);
 const opening=N.scene(s,'1:arrival');ctx.renderStoryPage(opening);assert.ok(nodes['.story-choices'].hidden);
 assert.ok(!nodes['.story-conversation'].innerHTML.includes(opening.replies[1]));
 const second=N.choose(s,'1:arrival',0,'bold',N.fingerprint(s));ctx.renderStoryPage(second);
 assert.ok(nodes['.story-conversation'].innerHTML.includes(second.reaction));assert.ok(!nodes['.story-conversation'].innerHTML.includes(second.question));
 vm.runInContext('clubStoryPage++',ctx);ctx.renderStoryPage(second);assert.equal(nodes['.story-choices'].hidden,false);
 assert.ok(nodes['.story-conversation'].innerHTML.includes(second.question));
 const done=N.choose(s,'1:arrival',1,'honest',N.fingerprint(s)),before=JSON.stringify(s),pages=ctx.clubStoryPages(done);
 const q=pages.findIndex(p=>p.text===second.question);assert.ok(q>0);assert.equal(pages[q+1].text,second.choices[1].label);assert.equal(pages[q+2].text,done.reply);assert.equal(JSON.stringify(s),before);
});
test('the actual rookie minute promise retains its deadline and is not replaced by general dialogue',()=>{
 const s=copy(established),id='1:rookie';N.choose(s,id,0,'listen',N.fingerprint(s));const pending=N.scene(s,id);
 assert.ok(pending.question.includes('30분'));const done=N.choose(s,id,1,'commit',N.fingerprint(s));
 assert.equal(done.mission.target,30);assert.equal(done.mission.start,4);assert.equal(done.mission.end,5);assert.equal(done.mission.minutes,0);
 assert.doesNotThrow(()=>S.restore(copy(s)));
});
console.log('Validated '+groups+' dialogue continuity groups.');
