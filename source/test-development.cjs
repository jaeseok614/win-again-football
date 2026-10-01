'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),T=require('./dist/training.js'),D=require('./dist/development.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function energy(s,value,slot='f3'){s.squad[slot].energy=value;s.match.players[slot].energy=value;s.match.players[slot].initialEnergy=value;}
function stat(s,key,value,slot='f3'){s.squad[slot][key]=value;s.match.players[slot][key]=value;}
function analyzePure(s,slot='f3'){const before=JSON.stringify(s),d=D.analyze(s,slot);assert.equal(JSON.stringify(s),before);return d;}

test('all current players receive identity-bound development goals without changing gameplay',()=>{
 const s=S.create(1201),before=JSON.stringify(s);for(const p of Object.values(s.squad)){const d=D.analyze(s,p.id);assert.equal(d.valid,true);assert.equal(d.slot,p.id);assert.equal(d.identity,p.identity);assert.equal(d.growth.key,F.roleKey(p));assert.equal(d.growth.remaining,p.potential-p[F.roleKey(p)]);assert.equal(d.growth.individualTechniqueSessions,Math.ceil(d.growth.remaining/2));assert.equal(d.experience.confirmedMinutes,p.xp);assert.equal(d.experience.minutesToXpStep,270);assert.equal(d.recommendation.available,true);}assert.equal(JSON.stringify(s),before);
});

test('exact 270-minute boundaries begin a new experience interval instead of promising immediate growth',()=>{
 const s=S.create(1202);for(const xp of [0,1,180,269,270,539,540,810,999]){s.squad.f3.xp=xp;const d=analyzePure(s);assert.equal(d.experience.xpInStep,xp%270);assert.equal(d.experience.completedSteps,Math.floor(xp/270));assert.equal(d.experience.minutesToXpStep,270-xp%270);assert.equal(d.experience.nextPrimaryGrowthMinutes,270-xp%270);}assert.equal(D.analyze(s,'f3').growth.individualTechniqueSessions,Math.ceil((s.squad.f3.potential-s.squad.f3.attack)/2));
});

test('unconfirmed match minutes never advance confirmed experience or enable mid-match training',()=>{
 const s=S.create(1203);s.squad.f2.xp=269;F.begin(s.match);for(let i=0;i<20;i++)F.tick(s.match);assert.equal(s.match.players.f2.minutes,20);const d=analyzePure(s,'f2');assert.equal(d.experience.confirmedMinutes,269);assert.equal(d.experience.xpInStep,269);assert.equal(d.experience.nextPrimaryGrowthMinutes,1);assert.equal(d.currentEnergy,s.match.players.f2.energy);assert.equal(d.recommendation.available,false);assert.equal(d.recommendation.focus,null);assert.match(d.recommendation.reason,/시작 전/);
});

test('fatigue below 70 takes priority, while exactly 70 permits technical growth',()=>{
 const s=S.create(1204);for(const value of [0,5,35,69,69.5]){energy(s,value);const d=analyzePure(s);assert.equal(d.recommendation.focus,'recovery');assert.equal(d.recommendation.available,true);assert.deepEqual(d.recommendation.preview,T.preview(s,'f3','recovery','f3'));assert.equal(d.recommendation.preview.after,Math.min(100,value+25));}energy(s,70);const d=analyzePure(s);assert.equal(d.recommendation.focus,'technique');assert.equal(d.recommendation.preview.energyAfter,60);
});

test('technical recommendations use the actual remaining potential and exact clipped gain',()=>{
 const s=S.create(1205),p=s.squad.f3;stat(s,'attack',p.potential-1);const d=analyzePure(s);assert.equal(d.growth.remaining,1);assert.equal(d.growth.individualTechniqueSessions,1);assert.equal(d.recommendation.focus,'technique');assert.equal(d.recommendation.preview.gain,1);assert.equal(d.recommendation.preview.after,p.potential);assert.equal(d.recommendation.preview.cost,10);
});

test('a capped primary skill suggests the lower trainable secondary skill and handles ties',()=>{
 const s=S.create(1206);stat(s,'attack',s.squad.f3.potential);for(const [speed,endurance,focus] of [[50,70,'pace'],[80,65,'fitness'],[80,80,'fitness'],[99,98,'fitness'],[98,99,'pace']]){stat(s,'speed',speed);stat(s,'endurance',endurance);const d=analyzePure(s);assert.equal(d.growth.capped,true);assert.equal(d.growth.individualTechniqueSessions,0);assert.equal(d.experience.nextPrimaryGrowthMinutes,null);assert.equal(d.recommendation.focus,focus);assert.equal(d.recommendation.available,true);assert.deepEqual(d.recommendation.preview,T.preview(s,'f3',focus,'f3'));}
});

test('a player at all skill caps can recover but receives no action when fully rested',()=>{
 const s=S.create(1207);stat(s,'attack',s.squad.f3.potential);stat(s,'speed',99);stat(s,'endurance',99);energy(s,85);const recovery=analyzePure(s);assert.equal(recovery.recommendation.focus,'recovery');assert.equal(recovery.recommendation.preview.gain,15);energy(s,100);const ready=analyzePure(s);assert.equal(ready.recommendation.focus,null);assert.equal(ready.recommendation.available,false);assert.equal(ready.recommendation.preview,null);assert.match(ready.recommendation.reason,/다른 선수/);assert.equal(ready.experience.minutesToXpStep,270);
});

test('injury takes priority even if the week is used or a Cup match is selected',()=>{
 const s=S.create(1208);s.squad.f3.injury={remaining:1,kind:'knock',since:1};s.match.players.f3.injuryRemaining=1;for(const mutate of [()=>{},()=>s.trained='technique',()=>s.competition='cup']){mutate();const d=analyzePure(s);assert.equal(d.recommendation.available,false);assert.equal(d.recommendation.focus,null);assert.match(d.recommendation.reason,/부상/);assert.match(d.recommendation.reason,/경기 휴식/);assert.equal(d.recommendation.preview,null);}
});

test('shared weekly actions, Cup games, invalid prep and season completion block recommendation actions',()=>{
 const base=S.create(1209);for(const mutate of [s=>S.train(s,'fitness'),s=>T.train(s,'f2','technique'),s=>s.competition='cup',s=>s.match.minute=1,s=>{s.match=null;s.round=14;},s=>s.match.players.f3.identity='t_f2']){const s=copy(base);mutate(s);const d=analyzePure(s);assert.equal(d.recommendation.available,false);assert.equal(d.recommendation.focus,null);assert.equal(d.recommendation.preview,null);assert.ok(d.recommendation.reason);}
});

test('recommendations remain bound to recruited identities and are exact inputs to the existing training model',()=>{
 let s=S.recruit(S.create(1210),'t_f2','f3');assert.equal(s.squad.f3.identity,'t_f2');const d=analyzePure(s);assert.equal(d.identity,'t_f2');assert.equal(d.growth.current,s.squad.f3.attack);assert.equal(d.experience.confirmedMinutes,0);assert.equal(d.recommendation.preview.identity,'t_f2');const done=T.train(s,d.slot,d.recommendation.focus,d.identity);for(const key of ['before','after','gain','energyBefore','energyAfter','cost'])assert.equal(done[key],d.recommendation.preview[key]);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('the pure model loads in a browser without CommonJS or extra season metadata',()=>{
 const context=vm.createContext({Football:F,Training:T});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/development.js'),'utf8'),context);const s=S.create(1211),before=JSON.stringify(s),keys=Object.keys(s);const d=context.PlayerDevelopment.analyze(s,'g2');assert.equal(d.growth.key,'keeping');assert.equal(d.recommendation.preview.key,'keeping');assert.equal(JSON.stringify(s),before);assert.deepEqual(Object.keys(s),keys);assert.deepEqual(JSON.parse(JSON.stringify(d)),D.analyze(s,'g2'));assert.equal(D.analyze(s,'missing').valid,false);assert.equal(D.analyze(null,'f3').recommendation.available,false);
});

test('UI states show honest targets, escape names and expose program selection only when available',()=>{
 const s=S.create(1212),context=vm.createContext({season:s,PlayerDevelopment:D});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/development-ui.js'),'utf8'),context);s.squad.f3.name='A <script>alert(1)</script> "B"';const available=context.renderDevelopment(s.squad.f3);assert.match(available,/출전 270분 더하면 결정력 \+1/);assert.match(available,/data-development-focus="technique"/);assert.match(available,/data-development-identity="f3"/);assert.match(available,/기술 \+2 기준의 단순 계산/);assert.match(available,/&lt;script&gt;/);assert.doesNotMatch(available,/<script>/);s.trained='fitness';const blocked=context.renderDevelopment(s.squad.f3);assert.doesNotMatch(blocked,/data-development-focus=/);assert.match(blocked,/이번 주 훈련 완료/);s.trained=null;stat(s,'attack',s.squad.f3.potential);const capped=context.renderDevelopment(s.squad.f3);assert.match(capped,/주요 능력 성장 한계 도달/);assert.doesNotMatch(capped,/출전 270분 더하면/);energy(s,66.75999999999817);const recovery=context.renderDevelopment(s.squad.f3);assert.ok(recovery.includes("체력 66.76 → 91.76 (+25)"));assert.doesNotMatch(recovery,/99999/);assert.equal(context.renderDevelopment({id:'missing'}),'');
});
console.log('Validated '+groups+' player development groups, including exact XP targets, safe recommendations and display-only UI.');
