'use strict';
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),M=require('./dist/movement.js');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('offside uses ball and second-last defender at release, with halves and both orientations',()=>{
 assert.equal(F.offsidePosition(23,42,[12,29,31,34],0),true);
 assert.equal(F.offsidePosition(29,42,[12,29,31,34],0),false);
 assert.equal(F.offsidePosition(33,42,[12,29,31,34],0),false);
 assert.equal(F.offsidePosition(23,20,[12,29,31,34],0),false);
 assert.equal(F.offsidePosition(77,58,[88,71,69,66],1),true);
 assert.equal(F.offsidePosition(71,58,[88,71,69,66],1),false);
 assert.equal(F.offsidePosition(48,53,[88,71,69,66],1),false);
 assert.equal(F.offsideAtPass('through_ball',null,0,.95),true);
 assert.equal(F.offsideAtPass('through_ball',null,0,.05),false);
 assert.equal(F.offsideAtPass('cross',null,0,.95),false);
 assert.equal(F.offsideAtPass('through_ball','corner',0,.95),false);
});
test('new through-ball offsides stop before goals while saving deterministic match states',()=>{
 let n=0,goals=0,shots=0;
 for(let seed=1;seed<=160;seed++){
  const m=F.create(seed);while(m.phase!=='full'){if(!F.running(m))F.begin(m);m.paused=false;F.finishSegment(m);}
  F.restore(JSON.parse(JSON.stringify(m)));
  for(const e of m.logs.filter(e=>e.offside)){
   n++;assert.equal(e.action,'through_ball');assert.equal(e.type,'chance');
   assert.match(e.text,/오프사이드/);
  }
  goals+=m.score[0]+m.score[1];shots+=m.shots[0]+m.shots[1];
 }
 assert.ok(n>0);assert.ok(shots>0&&goals>=0);
});
test('mid-range shots use lower expected chance and real goal-directed footage',()=>{
 let sample=null;
 for(let seed=1;seed<=260&&!sample;seed++){
  const m=F.create(seed);while(m.phase!=='full'){if(!F.running(m))F.begin(m);m.paused=false;F.finishSegment(m);}
  const event=m.logs.find(e=>e.action==='long_shot'&&['goal','shot'].includes(e.type));
  if(event)sample={m,event};
 }
 assert.ok(sample,'long shot generated');
 assert.match(sample.event.text,/중거리 슈팅/);
 const origin=M.frame({match:sample.m,elapsedMs:6200,motion:true});
 const input={match:sample.m,event:sample.event,eventOrigin:origin,eventElapsedMs:6200,elapsedMs:6200,motion:true};
 const v=M.frame({...input,eventAgeMs:M.timing.shot+50});
 assert.equal(v.phase,'shot');assert.equal(v.action,'long_shot');
 assert.match(M.broadcast(sample.event,sample.m,[],v),/중거리 슈팅/);
 assert.ok(v.ball.x>=4&&v.ball.x<=96);
 for(const team of [0,1])for(const quality of [.06,.15,.3,.48])assert.ok(F.openPlayExpectedGoals({ourGoal:quality,oppGoal:quality},team,'long_shot')<F.openPlayExpectedGoals({ourGoal:quality,oppGoal:quality},team,'combination'));
});
test('actual long shots add distance-adjusted expected goals and survive current saves',()=>{
 let shots=0;
 for(let seed=1;seed<=40;seed++){
  const m=F.create(seed);
  while(m.phase!=='full'){
   if(!F.running(m))F.begin(m);const r=F.ratings(m),old=[...m.xg],events=F.tick(m);
   for(const e of events.filter(e=>e.action==='long_shot'&&e.type!=='chance')){shots++;assert.ok(Math.abs((m.xg[e.team]-old[e.team])-F.openPlayExpectedGoals(r,e.team,e.action))<1e-10);}
  }
  const before=JSON.stringify(m),restored=F.restore(JSON.parse(before));assert.deepEqual(restored.xg,m.xg);assert.deepEqual(restored.score,m.score);assert.equal(JSON.stringify(m),before);
 }
 assert.ok(shots>0);
});
console.log('Validated '+checks+' football realism groups.');
