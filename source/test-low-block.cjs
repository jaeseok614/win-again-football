'use strict';
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),B=require('./dist/tactics-board.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,run){run();groups++;console.log('PASS '+name);}
function approx(a,b){assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);}

test('the current five-tier career receives the versioned low-block tactic without changing old engine versions',()=>{
 const current=S.create(41806,{startingClub:true});assert.equal(current.match.version,8);assert.equal(current.plan.tactic,'balanced');
 const older=copy(current);older.match.version=6;delete older.match.setPieces;assert.doesNotThrow(()=>F.restore(older.match));assert.throws(()=>F.setTactic(older.match,'lowBlock'),/경기 지시/);
 const legacy=S.create(41807);assert.equal(legacy.match.version,5);assert.throws(()=>F.setTactic(legacy.match,'lowBlock'),/경기 지시/);
 assert.equal(B.read(legacy).previews.length,3);
});

test('the low block offers an explicit defensive tradeoff against the real balanced preview',()=>{
 const s=S.create(41808,{startingClub:true}),before=JSON.stringify(s),board=B.read(s),balanced=board.previews.find(p=>p.tactic==='balanced'),low=board.previews.find(p=>p.tactic==='lowBlock');
 assert.equal(board.valid,true);assert.equal(board.previews.length,4);assert.equal(low.label,'로우 블록');
 assert.ok(low.expectedChances.ours<balanced.expectedChances.ours);assert.ok(low.expectedChances.opponent<balanced.expectedChances.opponent);
 approx(low.rating.ourRate,balanced.rating.ourRate*.86);approx(low.rating.oppRate,balanced.rating.oppRate*.72);
 approx(low.rating.defense,balanced.rating.defense*1.08);assert.ok(low.goalChance.opponent<balanced.goalChance.opponent);
 assert.equal(low.averageCost,balanced.averageCost);assert.equal(JSON.stringify(s),before);
});

test('the coach recommends a low block for a stronger opponent and keeps chase/fatigue priorities',()=>{
 const s=S.create(41809,{startingClub:true});for(const p of Object.values(s.match.players))p.energy=100;
 F.begin(s.match);F.finishSegment(s.match);
 s.match.opponent.attack=99;s.match.opponent.middle=99;s.match.score=[1,0];let board=B.read(s);assert.equal(board.recommendation.tactic,'lowBlock');assert.equal(board.recommendation.rule,'underdog');
 s.match.score=[0,1];board=B.read(s);assert.equal(board.recommendation.tactic,'press');assert.equal(board.recommendation.rule,'chase');
 s.match.score=[1,0];s.match.players[s.match.lineup[0]].energy=49;board=B.read(s);assert.equal(board.recommendation.tactic,'balanced');assert.equal(board.recommendation.rule,'fatigue');
});

test('a low-block change can be paused, serialized, replayed and restored without consuming extra stamina or RNG',()=>{
 const s=S.create(41810,{startingClub:true}),m=s.match;F.begin(m);while(m.minute<9)F.tick(m);m.paused=true;
 const rng=m.rng,energy=Object.fromEntries(m.lineup.map(id=>[id,m.players[id].energy]));F.setTactic(m,'lowBlock');assert.equal(m.rng,rng);assert.equal(m.tactic,'lowBlock');
 s.plan.tactic='lowBlock';const restoredSeason=S.restore(copy(s));assert.equal(restoredSeason.match.version,8);assert.equal(restoredSeason.match.tactic,'lowBlock');
 const a=F.restore(copy(m)),b=F.restore(copy(m));F.finishSegment(a);F.finishSegment(b);assert.deepEqual(a,b);assert.equal(a.minute,45);assert.equal(a.segments.at(-1).tactic,'lowBlock');
 for(const id of m.lineup){const balancedCost=35*(1+(50-m.players[id].endurance)/250);approx(energy[id]-a.players[id].energy,balancedCost*36/90);}
 while(a.phase!=='full'){if(!F.running(a))F.begin(a);F.finishSegment(a);}assert.deepEqual(F.restore(copy(a)),a);
});

console.log(`Passed ${groups} checks.`);
