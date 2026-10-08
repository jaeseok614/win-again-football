'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),Matchday=require('./dist/matchday.js');
const copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function advance(m,target){while(m.minute<target){if(!F.running(m))F.begin(m);m.paused=false;F.tick(m);}return m;}


test('the opponent attacks when trailing and closes down space when ahead, with actual chance-rate tradeoffs',()=>{
 for(const [seed,mode,ours,theirs,defense] of [[9,'chase',1.14,1.2,.92],[2,'protect',.88,.84,1.08]]){
  const m=advance(F.create(seed,{version:10}),45),base=F.ratings({...m,opponentPlans:[]}),changed=F.ratings(m);
  assert.equal(F.opponentPlan(m),mode);assert.equal(m.logs.at(-1).type,'opponent-tactic');
  assert.ok(Math.abs(changed.ourRate/base.ourRate-ours)<1e-8);
  assert.ok(Math.abs(changed.oppRate/base.oppRate-theirs)<1e-8);
  assert.ok(Math.abs(changed.opponent.defense/base.opponent.defense-defense)<1e-8);
 }
});

test('45 and 65 minute decisions replay exactly after save and reject forged opponent tactics',()=>{
 for(const stop of [0,44,45,65,90]){
  const m=advance(F.create(9,{version:10}),stop),resumed=F.restore(copy(m));assert.deepEqual(resumed.opponentPlans,m.opponentPlans);
  advance(m,90);advance(resumed,90);assert.deepEqual(resumed,m);
 }
 const m=advance(F.create(9,{version:10}),65);
 for(const change of [x=>x.opponentPlans[0].mode='protect',x=>x.opponentPlans[0].score=[0,0],x=>x.logs.find(e=>e.type==='opponent-tactic').text='가짜 지시',x=>x.opponentPlans.pop()]){const bad=copy(m);change(bad);assert.throws(()=>F.restore(bad));}
});

test('live and final football facts use recorded events and clearly label estimated possession',()=>{
 const m=advance(F.create(9,{version:10}),65),before=copy(m),rows=Matchday.facts(m),pick=key=>rows.find(row=>row.key===key);
 assert.match(pick('possession').label,/추정/);assert.equal(Number.parseInt(pick('possession').own)+Number.parseInt(pick('possession').opponent),100);
 assert.equal(pick('xg').own,m.xg[0].toFixed(2));assert.equal(pick('corner').own,m.logs.filter(e=>e.team===0&&e.setPiece==='corner').length);
 assert.equal(pick('freeKick').opponent,m.logs.filter(e=>e.team===1&&e.setPiece==='freeKick').length);assert.deepEqual(m,before);
 assert.equal(Matchday.facts(F.create(9,{version:10})).find(row=>row.key==='corner').own,0);
});
console.log('Opponent adaptation and live facts checks passed: '+checks+' groups.');
