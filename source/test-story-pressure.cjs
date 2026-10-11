'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),P=require('./dist/story-pressure.js'),N=require('./dist/club-story.js'),Mood=require('./dist/story-mood.js'),B=require('./dist/owner-board.js'),File=require('./dist/campaign-file.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
function to(s,round){while(s.round<round)s=finish(s);return s;}
function answer(s,id,first='listen',last='honest'){N.choose(s,id,0,first,N.fingerprint(s));return N.choose(s,id,1,last,N.fingerprint(s));}
const campaign=to(S.create(45),20);
test('owner personality is stable, varies by campaign and exposes the actual division without writing state',()=>{
 const ids=new Set();for(let seed=0;seed<4;seed++){const s=S.create(seed),before=JSON.stringify(s),p=P.profile(s);ids.add(p.id);assert.deepEqual(p,P.profile(S.restore(copy(s))));assert.equal(B.read(s).personality.id,p.id);assert.equal(JSON.stringify(s),before);}
 assert.equal(ids.size,4);const topOwner=S.create(44);topOwner.league.division=1;assert.match(P.profile(topOwner).line,/TOP 6/);assert.doesNotMatch(P.profile(topOwner).line,/승격/);assert.doesNotMatch(P.profile(S.create(47)).line,/승격의 기쁨/);for(let division=1;division<=5;division++){const s=copy(campaign);s.league.division=division;assert.equal(P.profile(s).division,division);assert.ok(P.profile(s).reach);assert.equal(P.events(s,1).filter(e=>!e.key.endsWith('followup')).length,4);}
});
test('incidents wait for complete confirmed league records and select stable ability or pressure-based actors',()=>{
 const s=S.create(46);assert.equal(P.events(s,1).length,0);const four=to(s,4),star=P.events(four,1).find(e=>e.key.includes('-star-'));
 const eligible=[...new Set(four.statistics.records.flatMap(g=>g.players.filter(p=>p.minutes>0).map(p=>p.identity)))].map(F.identityProfile);
 assert.equal(P.ability(F.identityProfile(star.actor)),Math.max(...eligible.map(P.ability)));
 const original=P.events(campaign,1),photo=original.find(e=>e.key.includes('-private-'));
 const eight=campaign.statistics.records.filter(g=>g.competition==='league').slice(0,8),actors=[...new Set(eight.flatMap(g=>g.players.filter(p=>p.minutes>0).map(p=>p.identity)))];
 assert.equal(F.mentalProfile(photo.actor).pressure,Math.min(...actors.map(id=>F.mentalProfile(id).pressure)));
 const changed=copy(four);for(const p of Object.values(changed.squad)){p.attack=99;p.passing=99;p.speed=99;}
 assert.equal(P.events(changed,1).find(e=>e.key===star.key).actor,star.actor);
 const partial=copy(campaign);partial.statistics.records.forEach(g=>g.statisticsOriginMinute=20);assert.equal(P.events(partial,1).length,0);
 const cups=copy(campaign);cups.statistics.records.forEach(g=>g.competition='cup');assert.equal(P.events(cups,1).length,0);
});
test('all incidents provide two explicit answers, private rumours never become financial, medical or disciplinary facts',()=>{
 for(const e of P.events(campaign,1)){
  const s=copy(campaign),before=copy(s),id='1:'+e.key,d=N.scene(s,id);assert.equal(d.reaction,null);assert.equal(d.reply,null);assert.equal(d.impact,null);assert.ok(d.fictional);
  N.choose(s,id,0,'bold',N.fingerprint(s));assert.equal(N.scene(s,id).impact,null);assert.deepEqual(s.match,before.match);
  const done=N.choose(s,id,1,'honest',N.fingerprint(s));assert.ok(done.impact);assert.equal(done.mission,null);
  assert.deepEqual(s.finance,before.finance);assert.deepEqual(s.health,before.health);assert.deepEqual(s.statistics,before.statistics);assert.deepEqual(s.squad,before.squad);
  const m=copy(s.match),prior=copy(before.match);delete m.storyMood;delete prior.storyMood;assert.deepEqual(m,prior);
  assert.deepEqual(File.read(File.stringify({season:s})).payload.season.clubStory,s.clubStory);assert.throws(()=>answer(s,id));
 }
 const photo=P.events(campaign,1).find(e=>e.key.includes('-private-'));assert.match(photo.scene,/확인되지 않았다/);assert.match(photo.scene,/실제 생활에 대한 정보가 아니다/);
});
test('a private-photo follow-up remembers the answer and only two later completed league games unlock it',()=>{
 let s=to(S.create(45),8),e=P.events(s,1).find(e=>e.key.includes('-private-')),id='1:'+e.key;answer(s,id,'practical','honest');const label=N.scene(s,id).finalLabel;
 assert.equal(N.scene(s,id+'-followup'),null);s=to(s,9);assert.equal(N.scene(s,id+'-followup'),null);s=to(s,10);
 const d=N.scene(s,id+'-followup'),actual=s.statistics.records.filter(g=>g.competition==='league'&&g.round>8&&g.round<=10).reduce((n,g)=>n+(g.players.find(p=>p.identity===e.actor)?.minutes||0),0);
 assert.equal(d.actor,e.actor);assert.ok(d.scene.includes(label));assert.ok(d.scene.includes(actual+'분'));assert.match(d.scene,/사생활을 증명할 수도 없다/);answer(s,d.id);assert.doesNotThrow(()=>S.restore(copy(s)));
 const bad=copy(s);bad.clubStory.records.at(-1).actor='sp_f1';if(e.actor==='sp_f1')bad.clubStory.records.at(-1).actor='sp_d1';assert.throws(()=>S.restore(bad));
});
test('owner style changes focus after the answer, respects player personality and expires within the existing cap',()=>{
 const low=F.roster.find(p=>F.mentalProfile(p).pressure<=10),high=F.identityProfile('sp_f1');
 const source=id=>({event:'1:pressure-public-'+id,relation:'board',actor:'board',first:'bold',last:'honest'});
 assert.ok(P.focus(source('spotlight'),low)<P.focus(source('spotlight'),high));assert.notEqual(Mood.contribution(source('spotlight'),high),Mood.contribution(source('guardian'),high));
 let s=to(S.create(46),12),e=P.events(s,1).find(e=>e.key.includes('-public-'));answer(s,'1:'+e.key,'bold','honest');assert.ok(Mood.summary(s.match).rows.every(p=>Math.abs(p.value)<=2));
 const summary=Mood.summary(s.match),description=N.scene(s,'1:'+e.key).impact;assert.ok(description.includes('집중 상승 '+summary.positive+'명'));assert.ok(description.includes('부담 '+summary.negative+'명'));
 const before=JSON.stringify(s);N.scene(s,'1:'+e.key);assert.equal(JSON.stringify(s),before);s=to(s,14);assert.ok(!s.match.storyMood?.sources.some(r=>r.event==='1:'+e.key));
});
test('recorded incidents survive player departure and a real explicit season transition; promotion speech follows history',()=>{
 let s=copy(campaign),e=P.events(s,1).find(e=>e.key.includes('-star-'));answer(s,'1:'+e.key);
 const absent=copy(s);delete absent.squad[Object.keys(absent.squad).find(k=>absent.squad[k].identity===e.actor)];assert.ok(P.events(absent,1).some(r=>r.key===e.key));
 const noReceipt=copy(absent);delete noReceipt.clubStory;assert.ok(!P.events(noReceipt,1).some(r=>r.key===e.key));
 while(!S.ready(s))s=finish(s);const next=S.nextSeason(s);assert.doesNotThrow(()=>S.restore(copy(next)));assert.equal(N.scene(next,'1:'+e.key).choices.length,0);
 const promoted=next.league.division<s.league.division,entry=P.events(next,2).find(r=>r.key.includes('-promoted-'));assert.equal(!!entry,promoted);
 if(entry){assert.ok(entry.scene.includes(s.league.division+'부에서 '+next.league.division+'부로'));answer(next,'2:'+entry.key);assert.doesNotThrow(()=>S.restore(copy(next)));}
 const top=copy(next);top.year=5;top.league.division=1;top.history=[...top.history,{year:4,division:2,rules:'five-tier'}];const one=P.events(top,5).find(r=>r.key.includes('-promoted-'));assert.ok(one.scene.includes('2부에서 1부로'));assert.doesNotMatch(one.question,/승격을 보장/);
});
console.log('Validated '+groups+' personality and media incident groups.');
