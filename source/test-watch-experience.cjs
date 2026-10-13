'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),Flow=require('./dist/match-flow.js');
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
function world(){const m=F.create(41);F.enableContinuous(m);F.begin(m);return m;}
test('old playback settings retain their original shape while explicit viewing choices round trip',()=>{
 const old={speed:'fast',coachPause65:true};assert.deepEqual(Flow.normalize(old),old);assert.equal(Flow.watchMode(old),'key');
 for(const watch of ['key','full'])assert.equal(Flow.normalize({...old,watch}).watch,watch);
 assert.equal(Flow.watchMode({watch:'unknown'}),'key');assert.ok(!Object.hasOwn(Flow.normalize({watch:'unknown'}),'watch'));
});
test('routine play accelerates without treating every pass and first touch as a highlight',()=>{
 const m=world(),w=m.continuous;w.restart=null;w.ball.owner=null;w.ball.flight={kind:'pass',receiver:null};w.ball.y=52;w.cue={kind:'control',tick:w.tick};
 assert.equal(Flow.viewingPhase(m),'routine');assert.equal(Flow.displayRate(m,{speed:'normal'}),180);assert.equal(Flow.displayRate(m,{speed:'rapid'}),720);
 assert.equal(Flow.displayRate(m,{speed:'rapid',watch:'full'}),8);
});
test('actual shooting, save and rebound action always stay readable at every selected speed',()=>{
 const m=world(),w=m.continuous;for(const kind of ['shot','save','parry','header','block','woodwork','goal']){
  w.ball.flight=kind==='shot'?{kind:'shot'}:null;w.cue={kind,tick:w.tick};
  assert.equal(Flow.displayRate(m,{speed:'normal',watch:'key'}),2.25);assert.equal(Flow.displayRate(m,{speed:'rapid',watch:'key'}),4.5);assert.equal(Flow.displayRate(m,{speed:'slow',watch:'key'}),1.125);
 }
 w.cue={kind:'pass',tick:w.tick};for(const speed of Object.keys(Flow.speeds)){w.ball.flight={kind:'cross'};const attack=Flow.displayRate(m,{speed,watch:'key'});w.ball.flight={kind:'shot'};assert.equal(Flow.displayRate(m,{speed,watch:'key'}),attack*.75,'shooting is only slightly slower at '+speed);}w.ball.flight={kind:'cross'};assert.equal(Flow.displayRate(m,{speed:'rapid'}),6);
});
test('dangerous possession, passes and set pieces use the real team direction in both halves',()=>{
 const m=world(),w=m.continuous;w.cue={kind:'pass',tick:-100};
 for(const half of [1,2])for(const team of [0,1]){
  w.half=half;const p=w.players.find(p=>p.team===team&&p.pos!=='GK'),goal=(team===0?0:105);p.x=34;p.y=half===1?goal===0?15:90:goal===0?90:15;
  w.restart=null;w.ball.owner=p.id;w.ball.flight=null;w.ball.x=p.x;w.ball.y=p.y;assert.equal(Flow.viewingPhase(m),'attack');
  w.ball.owner=null;w.ball.y=52;w.ball.flight={kind:'pass',receiver:p.id};assert.equal(Flow.viewingPhase(m),'attack');
  w.ball.flight=null;w.restart={kind:'freeKick',team,x:34,y:p.y};assert.equal(Flow.viewingPhase(m),'attack');
 }
});
test('broadcast filtering keeps every saved contact and goal while ignoring routine text updates',()=>{
 const m=world();m.logs.push({type:'goal',tick:10,text:'실제 득점'},{type:'pass',tick:11,text:'연결'},{type:'receive',tick:12,text:'첫 터치'});
 const before=JSON.stringify(m);assert.equal(Flow.recentBroadcast(m).text,'실제 득점');assert.equal(Flow.recentBroadcast(m).text,'실제 득점');assert.equal(JSON.stringify(m),before);
 m.logs.push({type:'card',tick:13,text:'경고'});assert.equal(Flow.recentBroadcast(m).text,'경고');assert.equal(m.logs.at(-2).type,'receive');
 m.logs=m.logs.slice(0,1);assert.equal(Flow.recentBroadcast(m),m.logs[0]);
});
test('view mode, speed and filtering never mutate the world, RNG or pause',()=>{
 const m=world();m.paused=true;const before=JSON.stringify(m);for(const watch of ['key','full'])for(const speed of Object.keys(Flow.speeds)){Flow.displayRate(m,{watch,speed});Flow.viewingPhase(m);Flow.recentBroadcast(m);Flow.normalize({watch,speed});}
 assert.equal(JSON.stringify(m),before);
});
console.log('Validated '+groups+' spectator experience groups.');
