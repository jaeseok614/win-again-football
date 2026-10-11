'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),F=require('./dist/engine.js'),S=require('./dist/season.js'),R=require('./dist/rebirth.js'),M=require('./dist/story-rebirth.js'),N=require('./dist/club-story.js'),File=require('./dist/campaign-file.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function play(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
function skills(s,value){for(const p of Object.values(s.squad))for(const key of ['attack','defense','passing','speed','endurance','keeping'])p[key]=Math.min(value,key===F.roleKey(p)?p.potential:99);S.selectNextMatch(s);return s;}
function answer(s,id,first='listen',last='honest'){N.choose(s,id,0,first,N.fingerprint(s));return N.choose(s,id,1,last,N.fingerprint(s));}
let end=skills(S.create(54,{rebirth:true}),10);
for(let i=0;i<50&&R.read(end).status==='active';i++){if(R.read(end).pending)end=R.choose(end,'steady');end=play(end);}
assert.equal(R.read(end).status,'sacked');
test('memory prose uses the actual prior life and all three selected memories without changing either run',()=>{
 const stories=new Set();for(const memory of ['calm','fight','together']){const s=R.restart(end,memory),before=JSON.stringify(s),m=M.memory(s),intro=M.opening(s);assert.equal(m.played,R.read(end).played);assert.equal(m.previous,1);assert.ok(intro.text.includes(m.name));assert.ok(intro.text.includes(m.played+'경기'));stories.add(intro.text);assert.equal(JSON.stringify(s),before);assert.equal(M.events(s,1).length,0);assert.deepEqual(S.restore(copy(s)),s);}
 assert.equal(stories.size,3);assert.equal(M.memory(S.create(1)),null);assert.equal(M.opening(S.create(1,{rebirth:true})),null);
});
test('browser scripts loaded before Rebirth resolve the later runtime for actual imported lives',()=>{
 const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/dist/story-rebirth.js','utf8'),c);c.Rebirth=R;const s=R.restart(end,'calm');assert.equal(c.StoryRebirth.memory(s).attempt,2);assert.ok(c.StoryRebirth.opening(s).text.includes('2번째 삶'));assert.equal(c.StoryRebirth.events(s,1).length,0);
});
test('a first confirmed full league result unlocks the memory scene, cups and partial records do not',()=>{
 const s=play(R.restart(end,'fight')),before=JSON.stringify(s),e=M.events(s,1).find(e=>e.key==='memory-return-fight');assert.equal(e.round,1);assert.ok(e.scene.includes(s.statistics.records[0].score.join(' : ')));assert.equal(JSON.stringify(s),before);
 const partial=copy(s);partial.statistics.records[0].statisticsOriginMinute=20;assert.equal(M.events(partial,1).length,0);const cups=copy(s);cups.statistics.records[0].competition='cup';assert.equal(M.events(cups,1).length,0);
});
test('each memory dialogue keeps explicit answers, hidden reactions and portable receipt validation',()=>{
 for(const memory of ['calm','fight','together']){const s=play(R.restart(end,memory)),id='1:memory-return-'+memory,before=copy(s);assert.equal(N.scene(s,id).impact,null);assert.equal(N.scene(s,id).reaction,null);N.choose(s,id,0,'bold',N.fingerprint(s));assert.equal(N.scene(s,id).impact,null);assert.equal(N.scene(s,id).choices.length,2);const answerLast=N.choose(s,id,1,'honest',N.fingerprint(s));assert.ok(answerLast.reply);assert.ok(answerLast.impact);assert.deepEqual(s.finance,before.finance);assert.deepEqual(s.squad,before.squad);assert.deepEqual(s.statistics,before.statistics);assert.deepEqual(File.read(File.stringify({season:s})).payload.season,s);assert.throws(()=>answer(s,id));}
});
test('the two-game follow-up remembers the exact choice and the actual later league points',()=>{
 let s=play(R.restart(end,'together'));const id='1:memory-return-together';answer(s,id,'practical','commit');const label=N.scene(s,id).finalLabel;
 s=play(s);assert.equal(N.scene(s,'1:memory-answer-together'),null);s=play(s);const d=N.scene(s,'1:memory-answer-together'),rows=s.statistics.records.filter(g=>g.competition==='league'&&g.round>1),points=rows.reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0);assert.ok(d.scene.includes(label));assert.ok(d.scene.includes('승점 '+points+'점'));answer(s,d.id);assert.deepEqual(S.restore(copy(s)),s);
 const bad=copy(s);bad.clubStory.records.at(-1).actor='board';assert.throws(()=>S.restore(bad));
});
test('a real warning and successful three-game reprieve create distinct scenes from full records only',()=>{
 let previous=skills(S.create(68,{rebirth:true}),10);while(R.read(previous).status==='active'){if(R.read(previous).pending)previous=R.choose(previous,'steady');previous=play(previous);}
 let s=skills(R.restart(previous,'calm'),10);for(let i=0;i<40&&!R.read(s).warning;i++){if(R.read(s).pending)s=R.choose(s,'steady');s=play(s);}
 const r=R.read(s);assert.ok(r.warning);assert.equal(M.events(s,s.year).find(e=>e.key==='memory-warning').round,s.round);answer(s,s.year+':memory-warning');for(let i=0;i<3;i++)s=play(s);const latest=R.read(s);assert.equal(latest.status,'active');assert.ok(latest.timeline.some(t=>t.kind==='survived'));
 const d=N.scene(s,s.year+':memory-survived'),rows=latest.records.slice(r.warning.after,r.warning.after+3),points=rows.reduce((n,g)=>n+(g.score[0]>g.score[1]?3:g.score[0]===g.score[1]?1:0),0);assert.ok(d.scene.includes('승점 '+points+'점'));answer(s,d.id);assert.deepEqual(S.restore(copy(s)),s);
});
console.log('Validated '+groups+' rebirth memory story groups.');
