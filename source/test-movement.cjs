'use strict';
const assert=require('node:assert/strict'),Movement=require('./dist/movement.js'),F=require('./dist/engine.js');
const copy=value=>JSON.parse(JSON.stringify(value));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function active(formation='442',tactic='balanced'){const match=F.create(20260930);F.setFormation(match,formation);F.setTactic(match,tactic);F.begin(match);return match;}
function bounds(value){
 assert.equal(value.own.length,11);assert.equal(value.opponent.length,11);
 for(const p of [...value.own,...value.opponent])for(const key of ['x','y'])assert.ok(Number.isFinite(p[key])&&p[key]>=10&&p[key]<=90,JSON.stringify(p));
 for(const p of [value.ball,...value.trail])for(const key of ['x','y'])assert.ok(Number.isFinite(p[key])&&p[key]>=4&&p[key]<=96,JSON.stringify(p));
 for(const team of [value.own,value.opponent])assert.equal(new Set(team.map(p=>p.id)).size,11);
}
test('all formations and tactics remain within pitch bounds over connected passing cycles',()=>{
 for(const formation of Object.keys(F.formations))for(const tactic of ['balanced','press','counter']){
  const match=active(formation,tactic);
  for(let ms=0;ms<42000;ms+=73)bounds(Movement.frame({match,elapsedMs:ms,motion:true}));
 }
});
test('frames preserve gameplay state, RNG, lineup and input coordinates',()=>{
 const match=active('433','counter'),before=copy(match),positions=Movement.frame({match,motion:false}).own.map(p=>({...p,p:match.players[p.id]})),beforePositions=copy(positions);
 for(let ms=0;ms<15000;ms+=127)Movement.frame({match,positions,elapsedMs:ms,event:{type:'goal',team:0,minute:21,scorerId:'f2'},eventAgeMs:ms%2200,motion:true});
 assert.deepEqual(match,before);assert.deepEqual(positions,beforePositions);
});
test('frozen clocks produce an identical paused frame without resetting to the formation',()=>{
 const match=active();const before=Movement.frame({match,elapsedMs:4250,motion:true});match.paused=true;
 assert.deepEqual(Movement.frame({match,elapsedMs:4250,motion:true}),before);
 const event={type:'shot',team:1,minute:19};const a=Movement.frame({match,elapsedMs:4250,event,eventAgeMs:620,motion:true});
 assert.deepEqual(Movement.frame({match,elapsedMs:4250,event,eventAgeMs:620,motion:true}),a);
});
test('reduced motion shows a stable formation and no synthetic passing or shot movement',()=>{
 const match=active('352','press'),first=Movement.frame({match,elapsedMs:0,motion:false});
 for(const elapsedMs of [21,500,8999,50000])assert.deepEqual(Movement.frame({match,elapsedMs,event:{type:'goal',team:0,scorerId:'f2'},eventAgeMs:500,motion:false}),first);
 assert.deepEqual(first.ball,{x:50,y:50});assert.equal(first.trail.length,0);assert.equal(first.carrierId,null);
});
test('static match phases preserve their own labels without a real event',()=>{
 const match=active('433');
 for(const [phase,label] of Object.entries({prep:'경기 준비',half:'하프타임',late:'65분 작전 시간',full:'경기 종료'})){
  match.phase=phase;const a=Movement.frame({match,elapsedMs:10,motion:true}),b=Movement.frame({match,elapsedMs:7000,motion:true});assert.deepEqual(a,b);assert.equal(a.label,label);bounds(a);
 }
});
test('actual goal scorers and a substituted starting goalkeeper guide real event animation',()=>{
 const match=F.create(20260930);F.swap(match,'g1','g2');F.begin(match);
 const actualScorer=match.lineup.find(id=>match.players[id].pos==='FW'),goal={type:'goal',team:0,minute:42,scorerId:actualScorer,scorerIdentity:match.players[actualScorer].identity};
 const start=Movement.frame({match,elapsedMs:3500,event:goal,eventAgeMs:700,motion:true});assert.equal(start.carrierId,actualScorer);assert.equal(start.scorerId,actualScorer);assert.equal(start.attributed,true);
 const end=Movement.frame({match,elapsedMs:3500,event:goal,eventAgeMs:1500,motion:true});assert.equal(end.phase,'goal');assert.equal(end.ball.y,4);
 const save=Movement.frame({match,elapsedMs:3500,event:{type:'shot',team:1,minute:19},eventAgeMs:1500,motion:true});assert.equal(save.phase,'save');assert.equal(save.keeperId,'g2');assert.equal(save.carrierId,'g2');assert.equal(save.ball.y,86);
});
test('all actual engine event types are bounded for both teams and every animation age',()=>{
 for(const formation of Object.keys(F.formations))for(const tactic of ['press','balanced','counter']){
  const match=active(formation,tactic),scorerId=match.lineup.find(id=>match.players[id].pos==='FW');
  for(const type of ['goal','shot','chance'])for(const team of [0,1])for(const eventAgeMs of [0,1,300,700,1200,1500,1900,2000,2199,2200,5000])bounds(Movement.frame({match,elapsedMs:3920,event:{type,team,minute:42,scorerId:team===0?scorerId:undefined},eventAgeMs,motion:true}));
 }
});
test('an actual stoppage-time goal still animates after the engine reaches its break',()=>{
 const match=active();match.phase='full';const event={type:'goal',team:0,minute:90,scorerId:match.lineup.find(id=>match.players[id].pos==='FW')};
 const shown=Movement.frame({match,event,eventAgeMs:1500,motion:true});assert.equal(shown.phase,'goal');assert.equal(shown.ball.y,4);
 const ended=Movement.frame({match,event,eventAgeMs:2200,motion:true});assert.equal(ended.phase,'static');assert.equal(ended.label,'경기 종료');
});
test('passing labels never invent a goal, save or shot and visible players move meaningfully',()=>{
 const match=active('433','counter'),seen=new Set(),positions=new Map();let carried=0;
 for(let ms=0;ms<28000;ms+=50){const value=Movement.frame({match,elapsedMs:ms,motion:true});seen.add(value.label);assert.ok(!['goal','shot','save','saved'].includes(value.phase));if(value.carrierId)carried++;
  for(const p of value.own){if(!positions.has(p.id))positions.set(p.id,[]);positions.get(p.id).push(p);}
 }
 assert.ok(seen.has('역습 전개'));assert.ok(seen.has('수비 전환'));assert.ok(carried>0);
 const mid=positions.get(match.lineup.find(id=>match.players[id].pos==='MID'));assert.ok(Math.max(...mid.map(p=>p.y))-Math.min(...mid.map(p=>p.y))>20);
});
test('continuous normal frames avoid teleports at pass and cycle boundaries',()=>{
 const match=active();for(const ms of [1400,2800,4200,5600,7000,8400,9800,11200,12600,14000,28000]){
  const before=Movement.frame({match,elapsedMs:ms-.01,motion:true}),after=Movement.frame({match,elapsedMs:ms+.01,motion:true});assert.ok(Math.abs(before.ball.x-after.ball.x)<.05);assert.ok(Math.abs(before.ball.y-after.ball.y)<.05);
  for(let i=0;i<before.own.length;i++){assert.ok(Math.abs(before.own[i].x-after.own[i].x)<.05);assert.ok(Math.abs(before.own[i].y-after.own[i].y)<.05);}
 }
});
test('missing or unrelated event metadata safely falls back to normal movement',()=>{
 const match=active(),normal=Movement.frame({match,elapsedMs:3700,motion:true});
 assert.deepEqual(Movement.frame({match,elapsedMs:3700,event:{type:'shot',team:1},eventAgeMs:Infinity,motion:true}),normal);
 for(const event of [null,{type:'sub',team:0},{type:'goal',team:9},{type:'break'},{type:'start'}])assert.deepEqual(Movement.frame({match,elapsedMs:3700,event,eventAgeMs:500,motion:true}),normal);
 const oldShot=Movement.frame({match,elapsedMs:3700,event:{type:'shot',team:0,minute:21,text:'알 수 없는 선수의 슈팅'},eventAgeMs:500,motion:true});assert.equal(oldShot.attributed,false);assert.equal(oldShot.scorerId,null);bounds(oldShot);
 assert.doesNotThrow(()=>Movement.frame());assert.doesNotThrow(()=>Movement.frame({match:{},elapsedMs:NaN,eventAgeMs:NaN}));
});
test('named legacy shots only attribute a shooter present in the active eleven',()=>{
 const match=active(),shooter=match.lineup.find(id=>match.players[id].pos==='FW'),event={type:'shot',team:0,minute:17,text:match.players[shooter].name+'의 슈팅!'};
 const shown=Movement.frame({match,event,eventAgeMs:700,motion:true});assert.equal(shown.scorerId,shooter);assert.equal(shown.carrierId,shooter);assert.equal(shown.attributed,true);
 const bench=Object.values(match.players).find(p=>p.pos==='FW'&&!match.lineup.includes(p.id));event.text=bench.name+'의 슈팅!';assert.equal(Movement.frame({match,event,eventAgeMs:0,motion:true}).attributed,false);
});
test('event entry retains the visible ball and ownership, wins possession before the shot and returns continuously',()=>{
 const match=active(),before=copy(match);
 for(const team of [0,1])for(const type of ['goal','shot','chance'])for(const elapsedMs of [0,2000,6000,9000,13000]){
  const origin=Movement.frame({match,elapsedMs,motion:true}),event={team,type,minute:12,scorerId:team===0?'f1':undefined};
  const input={match,event,eventOrigin:origin,eventElapsedMs:elapsedMs,motion:true};
  const entry=Movement.frame({...input,elapsedMs,eventAgeMs:0});assert.deepEqual(entry.ball,origin.ball);assert.equal(entry.ownerTeam,origin.ownerTeam);assert.equal(entry.carrierId,origin.carrierId);
  const ready=Movement.frame({...input,elapsedMs:elapsedMs+700,eventAgeMs:700});assert.equal(ready.ownerTeam,team);assert.equal(ready.phase,type==='chance'?'intercept':'shot');
  for(const boundary of [350,700,1450,1900,2200]){
   const a=Movement.frame({...input,elapsedMs:elapsedMs+boundary-.01,eventAgeMs:boundary-.01}),b=Movement.frame({...input,elapsedMs:elapsedMs+boundary+.01,eventAgeMs:boundary+.01});
   assert.ok(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<.05,JSON.stringify({boundary,team,type,a:a.ball,b:b.ball}));
  }
 }
 assert.deepEqual(match,before);
});
test('goalkeepers cover the near post on both flanks for both teams without changing the event or match',()=>{const match=active(),before=copy(match);for(const team of [0,1])for(const x of [15,85]){const origin=Movement.frame({match,elapsedMs:4200,motion:true}),shooter=team===0?origin.own.find(p=>p.pos==='FW'):origin.opponent.filter(p=>p.pos==='FW')[0],keeper=(team===0?origin.opponent:origin.own).find(p=>p.pos==='GK');shooter.x=x;keeper.x=50;const frozen=copy(origin),event={type:'shot',team,minute:0,...(team===0?{scorerId:shooter.id}:{})},input={match,event,eventOrigin:origin,eventElapsedMs:4200,motion:true},entry=Movement.frame({...input,eventAgeMs:0}),ready=Movement.frame({...input,eventAgeMs:700}),saved=Movement.frame({...input,eventAgeMs:1450});assert.equal((team===0?entry.opponent:entry.own).find(p=>p.pos==='GK').x,50);const readyKeeper=(team===0?ready.opponent:ready.own).find(p=>p.pos==='GK');assert.ok(x<50?readyKeeper.x<50:readyKeeper.x>50);assert.equal(saved.ball.x,x<50?43:57);assert.equal((team===0?saved.opponent:saved.own).find(p=>p.pos==='GK').x,saved.ball.x);bounds(saved);assert.deepEqual(origin,frozen);}assert.deepEqual(match,before);});
console.log('Movement checks passed: '+groups+' groups.');
