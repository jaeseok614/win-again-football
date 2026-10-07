'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),B=require('./dist/tactics-board.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function pure(s,options){const before=JSON.stringify(s),b=B.read(s,options);assert.equal(JSON.stringify(s),before);return b;}
function at(phase,seed=1501){const s=S.create(seed);while(s.match.phase!==phase){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return s;}
function pausedAt(minute,seed=1516){const s=S.create(seed);while(s.match.minute<minute){if(!F.running(s.match))F.begin(s.match);F.tick(s.match);}if(!F.running(s.match))F.begin(s.match);s.match.paused=true;return s;}
function energy(s,value){for(const id of s.match.lineup)s.match.players[id].energy=value;}
function approx(a,b){assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);}
function checkForecast(p,m){const projected=p.rawCost/p.costPer90*90,start=m.minute-projected,red=m.discipline?.events.find(e=>e.team===0&&e.id===p.id&&e.card==='red');const duration=Math.max(0,Math.min(m.minute,red?.minute??90)-start);approx(m.players[p.id].energy,Math.max(0,p.before-p.costPer90*duration/90));approx(p.after,Math.max(0,p.before-p.rawCost));}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}return m;}

test('pre-match board reads the real eleven, condition-adjusted rating and current fixture',()=>{
 const s=S.create(1502),b=pure(s);assert.equal(b.valid,true);assert.equal(b.reason,null);assert.deepEqual(b.current.rating,F.ratings(s.match));assert.equal(b.lineup.length,11);assert.deepEqual(b.lineup.map(p=>p.id),s.match.lineup);for(const p of b.lineup){const actual=s.match.players[p.id];assert.equal(p.identity,actual.identity);assert.equal(p.name,actual.name);assert.equal(p.energy,actual.energy);assert.equal(p.primary,actual[F.roleKey(actual)]);}assert.equal(b.context.opponentId,S.opponentFor(s).id);assert.equal(b.context.round,1);assert.equal(b.context.year,1);assert.equal(b.context.stage,null);for(const row of b.current.comparisons){assert.equal(row.ours,b.current.rating[row.key]);assert.equal(row.delta,row.ours-row.opponent);}
});

test('each editable window previews only its actual next 45, 20 or 25 minute segment',()=>{
 for(const [phase,start,end] of [['prep',0,45],['half',45,65],['late',65,90]]){const s=at(phase),b=pure(s);assert.equal(b.valid,true);assert.deepEqual(b.segment,{start,end,minutes:end-start});assert.equal(b.context.phase,phase);assert.equal(b.context.minute,start);assert.equal(b.previews.length,4);assert.deepEqual(b.context.score,s.match.score);}
});

test('unpaused running matches explain the pause requirement and completed or absent matches expose no board',()=>{
 for(const minute of [0,2,46,66]){const s=pausedAt(minute,1503);s.match.paused=false;const b=pure(s);assert.equal(b.valid,false);assert.equal(b.reason,'전술 보드를 보려면 경기를 잠시 멈추세요.');assert.equal(b.fingerprint,null);}const s=at('full',1503);assert.equal(pure(s).valid,false);s.match=null;assert.equal(pure(s).valid,false);assert.equal(B.read(null).valid,false);
});

test('paused running boards use only the positive time remaining to the real next interruption',()=>{
 for(const [minute,phase,end] of [[0,'first',45],[2,'first',45],[15,'first',45],[44,'first',45],[45,'second',65],[46,'second',65],[52,'second',65],[64,'second',65],[65,'third',90],[66,'third',90],[75,'third',90],[89,'third',90]]){const s=pausedAt(minute),b=pure(s);assert.equal(b.valid,true);assert.deepEqual(b.segment,{start:minute,end,minutes:end-minute});assert.equal(b.context.phase,phase);assert.equal(b.context.minute,minute);assert.equal(b.context.paused,true);assert.equal(b.context.rng,s.match.rng);for(const p of b.previews){assert.equal(p.expectedChances.ours,p.rating.ourRate*(end-minute));assert.equal(p.expectedChances.opponent,p.rating.oppRate*(end-minute));}}
});

test('turning off the optional 65 minute pause forecasts halftime and paused second-half play through full time',()=>{
 for(const [s,start,defaultMinutes] of [[at('half',1520),45,20],[pausedAt(59,1520),59,6]]){const original=JSON.stringify(s),standard=pure(s),extended=pure(s,{coachPause65:false});assert.deepEqual(standard.segment,{start,end:65,minutes:defaultMinutes});assert.deepEqual(extended.segment,{start,end:90,minutes:90-start});assert.equal(extended.context.forecastEnd,90);assert.equal(extended.context.coachPause65,false);assert.equal(standard.context.coachPause65,true);assert.notEqual(standard.fingerprint,extended.fingerprint);for(const preview of extended.previews){assert.equal(preview.expectedChances.ours,preview.rating.ourRate*(90-start));assert.equal(preview.expectedChances.opponent,preview.rating.oppRate*(90-start));const m=copy(s.match);F.setTactic(m,preview.tactic);while(m.phase!=='full'){if(!F.running(m))F.begin(m);m.paused=false;F.tick(m);}assert.equal(m.minute,90);assert.equal(m.tactic,preview.tactic);assert.deepEqual(m.lineup,s.match.lineup);for(const p of preview.energy)checkForecast(p,m);}assert.equal(JSON.stringify(s),original);}
});

test('the optional pause preference guards stale forecasts without changing first-half or final-period windows',()=>{
 for(const s of [S.create(1521),pausedAt(17,1521),at('late',1521),pausedAt(74,1521)]){const standard=pure(s),extended=pure(s,{coachPause65:false});assert.deepEqual(extended.segment,standard.segment);assert.deepEqual(extended.previews,standard.previews);assert.notEqual(extended.fingerprint,standard.fingerprint);assert.equal(extended.context.forecastEnd,standard.context.forecastEnd);assert.equal(extended.context.coachPause65,false);}const s=pausedAt(59,1521);assert.deepEqual(pure(s,{coachPause65:true}),pure(s));assert.match(pure(s,{coachPause65:false}).assumption,/현재 체력/);assert.match(pure(s,{coachPause65:false}).assumption,/활동 선수와 미리보기 전술을 유지/);assert.match(pure(s,{coachPause65:false}).assumption,/확정 찬스 수나 예상 스코어를 뜻하지 않습니다/);
});

test('paused boards reject mismatched, fractional and exhausted clocks instead of previewing a zero segment',()=>{
 const clock=S.create(1504);clock.match.minute=1;assert.equal(pure(clock).valid,false);for(const [phase,minute] of [['first',-1],['first',45],['second',44],['second',65],['third',64],['third',90],['first',15.5],['second',NaN]]){const s=pausedAt(15);s.match.phase=phase;s.match.minute=minute;assert.equal(pure(s).valid,false);}
});

test('all supported formations keep actual positional counts and reserve players out of the preview',()=>{
 for(const formation of Object.keys(F.formations)){const s=S.create(1505);F.setFormation(s.match,formation);const reserve=Object.values(s.match.players).find(p=>!s.match.lineup.includes(p.id));reserve.energy=0;const b=pure(s);assert.equal(b.valid,true);assert.equal(b.lineup.some(p=>p.id===reserve.id),false);for(const [pos,count] of Object.entries({GK:1,...F.formations[formation]}))assert.equal(b.lineup.filter(p=>p.pos===pos).length,count);assert.equal(b.context.formation,formation);}
});

test('three tactical snapshots use exactly the engine rates and per-shot goal chance without predicting scores',()=>{
 const s=at('half'),b=pure(s);for(const preview of b.previews){const rating=F.ratings({...s.match,tactic:preview.tactic});assert.deepEqual(preview.rating,rating);assert.equal(preview.expectedChances.ours,rating.ourRate*20);assert.equal(preview.expectedChances.opponent,rating.oppRate*20);assert.equal(preview.goalChance.ours,rating.ourGoal);assert.equal(preview.goalChance.opponent,rating.oppGoal);assert.equal(preview.paceBonus,rating.paceBonus);assert.equal('score' in preview,false);assert.equal('winProbability' in preview,false);}const balanced=b.previews.find(p=>p.tactic==='balanced'),press=b.previews.find(p=>p.tactic==='press'),counter=b.previews.find(p=>p.tactic==='counter');assert.ok(press.expectedChances.ours>balanced.expectedChances.ours);assert.ok(press.expectedChances.opponent>balanced.expectedChances.opponent);assert.ok(counter.expectedChances.ours<balanced.expectedChances.ours);assert.ok(counter.expectedChances.opponent<balanced.expectedChances.opponent);assert.match(b.assumption,/현재 체력/);assert.match(b.assumption,/매분/);
});

test('previewed clipped energy agrees with actual engine segment consumption for every tactic and window',()=>{
 for(const phase of ['prep','half','late']){const s=at(phase,1506);s.match.players[s.match.lineup[0]].energy=.4;const b=pure(s);for(const preview of b.previews){const m=copy(s.match);F.setTactic(m,preview.tactic);F.begin(m);F.finishSegment(m);for(const p of preview.energy){checkForecast(p,m);approx(p.cost,p.before-p.after);assert.ok(p.after>=0&&p.after<=p.before);assert.equal(p.identity,s.match.players[p.id].identity);}assert.equal(preview.energy[0].after,0);assert.equal(preview.energy[0].cost,.4);}}
});

test('paused previews match actual remaining-minute energy after a tactic change without restarting play',()=>{
 for(const minute of [0,2,15,44,45,52,64,65,75,89]){const s=pausedAt(minute,1517);s.match.players[s.match.lineup[0]].energy=.4;const b=pure(s);for(const preview of b.previews){const m=copy(s.match),rng=m.rng;F.setTactic(m,preview.tactic);assert.equal(m.paused,true);assert.equal(m.minute,minute);assert.equal(m.rng,rng);assert.equal(m.tactic,preview.tactic);F.finishSegment(m);assert.equal(m.minute,b.segment.end);assert.equal(m.paused,false);for(const p of preview.energy){checkForecast(p,m);approx(p.cost,p.before-p.after);}}}
});

test('pressing adds precisely eight endurance-adjusted energy points per ninety minutes',()=>{
 const s=S.create(1507);energy(s,100);const b=pure(s),balanced=b.previews.find(p=>p.tactic==='balanced'),press=b.previews.find(p=>p.tactic==='press');for(const p of press.energy){const other=balanced.energy.find(x=>x.id===p.id);approx(p.costPer90-other.costPer90,8);approx(p.cost-other.cost,4);}approx(press.averageCost-balanced.averageCost,4);
});

test('fatigue takes recommendation priority over chasing a result or a positive pace bonus',()=>{
 const s=at('half',1508);s.match.score=[0,1];s.match.opponent.speed=1;energy(s,64);let b=pure(s);assert.equal(b.recommendation.tactic,'balanced');assert.equal(b.recommendation.rule,'fatigue');assert.ok(b.previews.find(p=>p.tactic==='counter').paceBonus>0);energy(s,90);s.match.players[s.match.lineup[0]].energy=49.99;b=pure(s);assert.equal(b.recommendation.rule,'fatigue');assert.equal(b.recommendation.tactic,'balanced');assert.ok(b.condition.averageEnergy>65);assert.equal(b.condition.criticalIds.length,1);
});

test('a deficit at any post-kickoff pause recommends pressing only when raw energy thresholds are met',()=>{
 for(const s of [at('half',1509),at('late',1509),pausedAt(2,1509),pausedAt(52,1509),pausedAt(75,1509)]){s.match.score=[0,2];energy(s,65);const b=pure(s);assert.equal(b.condition.averageEnergy,65);assert.equal(b.recommendation.tactic,'press');assert.equal(b.recommendation.rule,'chase');energy(s,90);s.match.players[s.match.lineup[0]].energy=50;assert.equal(pure(s).recommendation.tactic,'press');s.match.players[s.match.lineup[0]].energy=49.99;assert.equal(pure(s).recommendation.rule,'fatigue');}const prep=S.create(1510);energy(prep,100);prep.match.opponent.speed=99;assert.equal(pure(prep).recommendation.rule,'balance');
});

test('counter recommendation follows the real positive pace bonus and never appears without it',()=>{
 const s=S.create(1511);energy(s,100);for(const p of Object.values(s.match.players).filter(p=>p.pos==='FW'))p.speed=99;s.match.opponent.speed=1;const fast=pure(s);assert.equal(fast.recommendation.tactic,'counter');assert.equal(fast.recommendation.rule,'pace');assert.equal(fast.previews.find(p=>p.tactic==='counter').paceBonus,15);for(const p of Object.values(s.match.players).filter(p=>p.pos==='FW'))p.speed=1;s.match.opponent.speed=99;const slow=pure(s);assert.equal(slow.previews.find(p=>p.tactic==='counter').paceBonus,0);assert.equal(slow.recommendation.tactic,'balanced');
});

test('fingerprints change with all meaningful context, lineup, skills, energy and opponent changes',()=>{
 const base=S.create(1512),fingerprint=pure(base).fingerprint;assert.equal(pure(copy(base)).fingerprint,fingerprint);for(const mutate of [s=>F.setTactic(s.match,'counter'),s=>F.setFormation(s.match,'433'),s=>F.swap(s.match,'f1','f3'),s=>s.match.players.f2.energy-=1,s=>s.match.players.f2.attack+=1,s=>s.match.opponent.attack+=1,s=>s.match.score[0]++,s=>s.match.seed++,s=>s.match.rng++,s=>s.year++]){const s=copy(base);mutate(s);const b=pure(s);assert.equal(b.valid,true);assert.notEqual(b.fingerprint,fingerprint);}const half=at('half',1512);assert.notEqual(pure(half).fingerprint,fingerprint);
});

test('pause and live RNG are explicit context guards and re-pausing after a tick invalidates the prior fingerprint',()=>{
 const s=pausedAt(15,1518),b=pure(s),signature=JSON.parse(b.fingerprint);assert.equal(signature.context.paused,true);assert.equal(signature.context.rng,s.match.rng);assert.equal(pure(S.restore(copy(s))).fingerprint,b.fingerprint);const changed=copy(s);changed.match.rng++;assert.notEqual(pure(changed).fingerprint,b.fingerprint);s.match.paused=false;assert.equal(pure(s).fingerprint,null);F.tick(s.match);s.match.paused=true;assert.notEqual(pure(s).fingerprint,b.fingerprint);assert.equal(pure(s).segment.minutes,29);assert.equal(pure(s).context.rng,s.match.rng);
});

test('continuous tactical changes and substitutions read the current paused lineup and preserve it through restore',()=>{
 const s=pausedAt(17,1519),first=pure(s),rng=s.match.rng;F.setTactic(s.match,'press');const changed=pure(s);assert.equal(changed.context.tactic,'press');assert.notEqual(changed.fingerprint,first.fingerprint);assert.deepEqual(changed.segment,{start:17,end:45,minutes:28});F.swap(s.match,'f1','f3');const subbed=pure(s);assert.equal(subbed.valid,true);assert.equal(subbed.lineup.some(p=>p.identity===s.match.players.f1.identity),false);assert.equal(subbed.lineup.some(p=>p.identity===s.match.players.f3.identity),true);assert.equal(s.match.paused,true);assert.equal(s.match.minute,17);assert.equal(s.match.rng,rng);assert.notEqual(subbed.fingerprint,changed.fingerprint);assert.deepEqual(pure(S.restore(copy(s))),subbed);
});

test('injuries, duplicate identities, missing roles and nonfinite energy cannot create misleading boards',()=>{
 const base=S.create(1513);for(const mutate of [s=>s.match.players.g1.injuryRemaining=1,s=>s.match.lineup[1]=s.match.lineup[0],s=>s.match.players.f2.identity='t_f2',s=>{s.match.players.f2.identity='sp_f1';s.squad.f2.identity='sp_f1';},s=>s.match.lineup.splice(0,1),s=>s.match.players.g1.energy=NaN,s=>s.match.isHome=!s.match.isHome]){const s=copy(base);mutate(s);assert.equal(pure(s).valid,false);}
});

test('Cup boards use their actual stage and migrated saves keep the same next segment',()=>{
 let s=S.create(1514);while(s.competition!=='cup'){finish(s.match);s=S.settle(s);}const b=pure(s);assert.equal(b.valid,true);assert.equal(b.context.competition,'cup');assert.equal(b.context.round,12);assert.equal(b.context.stage,0);const restored=S.restore(copy(s));assert.deepEqual(pure(restored),b);F.begin(s.match);F.finishSegment(s.match);assert.equal(pure(s).segment.minutes,20);
});

test('read-only analysis preserves RNG and later outcomes, with detached data and browser UMD compatibility',()=>{
 const s=S.create(1515),control=copy(s),b=pure(s),before=JSON.stringify(s),version=s.match.version;b.context.score[0]=99;b.current.rating.attack=99;b.previews[0].energy[0].after=99;b.lineup[0].energy=99;assert.equal(JSON.stringify(s),before);const ctx=vm.createContext({Football:F,Season:S});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/tactics-board.js'),'utf8'),ctx);assert.deepEqual(JSON.parse(JSON.stringify(ctx.TacticsBoard.read(s))),B.read(s));F.setTactic(s.match,'counter');F.setTactic(control.match,'counter');finish(s.match);finish(control.match);assert.deepEqual(s,control);assert.equal(s.version,10);assert.equal(s.match.version,version);
});
console.log('Validated '+groups+' tactical board groups, including exact engine snapshots, energy previews and read-only context guards.');
