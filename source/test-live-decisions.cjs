const assert=require('node:assert/strict'),F=require('./dist/engine.js');
const clone=value=>JSON.parse(JSON.stringify(value));
let checks=0;function test(label,fn){fn();checks++;console.log('PASS '+label);}
function advance(match,minute,afterTick){while(match.minute<minute){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);if(afterTick)afterTick(match);}return match;}
function schedule(match){switch(match.minute){case 7:F.setTactic(match,'press');break;case 12:F.swap(match,'f1','f3');break;case 17:F.setTactic(match,'counter');break;case 28:F.setTactic(match,'balanced');break;case 59:F.swap(match,'m1','m5');break;case 74:F.swap(match,'d1','d5');break;}}
function continuous(seed=20260930){return advance(F.create(seed),90,schedule);}
function atomic(match,fn,pattern){const before=JSON.stringify(match);assert.throws(fn,pattern);assert.equal(JSON.stringify(match),before);}
function normalized(match){const value=clone(match);value.paused=false;return value;}
function expectRejected(match,mutations){for(const mutate of mutations){const raw=clone(match);mutate(raw);assert.throws(()=>F.restore(raw));}}

test('live and paused tactics apply at 7, 17 and 28 without moving time, energy or RNG',()=>{
 const match=F.create(20260930);for(const [minute,tactic,paused] of [[7,'press',false],[17,'counter',true],[28,'balanced',false]]){
  advance(match,minute);match.paused=paused;const before=clone(match),active=match.segments.at(-1);
  F.setTactic(match,tactic);assert.equal(match.minute,minute);assert.equal(match.paused,paused);assert.equal(match.rng,before.rng);assert.deepEqual(match.players,before.players);
  for(const key of ['score','shots','chances','xg'])assert.deepEqual(match[key],before[key]);
  assert.deepEqual(match.logs.slice(0,before.logs.length),before.logs);assert.deepEqual(match.segments.slice(0,-2),before.segments.slice(0,-1));
  assert.equal(active.end,minute);assert.equal(match.segments.at(-1).start,minute);assert.equal(match.segments.at(-1).end,null);assert.equal(match.segments.at(-1).tactic,tactic);
  assert.deepEqual(match.segments.at(-1).rating,F.ratings(match));assert.deepEqual(match.decisions.at(-1),{minute,type:'tactic',from:before.tactic,to:tactic});
  assert.deepEqual(normalized(F.restore(clone(match))),normalized(match));
 }
});

test('12, 59 and 74 minute substitutions preserve actual played minutes and energy',()=>{
 const match=continuous();assert.equal(match.subs,3);assert.deepEqual(match.out,['f1','m1','d1']);
 for(const [outId,inId,minute] of [['f1','f3',12],['m1','m5',59],['d1','d5',74]]){assert.equal(match.players[outId].minutes,minute);assert.equal(match.players[inId].minutes,90-minute);}
 assert.equal(Object.values(match.players).reduce((sum,p)=>sum+p.minutes,0),990);assert.equal(match.players.g2.energy,100);assert.equal(match.players.g2.minutes,0);
 assert.deepEqual(match.segments.map(segment=>[segment.start,segment.end]),[[0,7],[7,12],[12,17],[17,28],[28,45],[45,59],[59,65],[65,74],[74,90]]);
 assert.deepEqual(F.restore(clone(match)),match);
});

test('same-minute commands keep one open segment and same-tactic requests are strict no-ops',()=>{
 const match=advance(F.create(),17);match.paused=true;const rng=match.rng;F.setTactic(match,'press');F.swap(match,'f1','f3');F.setTactic(match,'counter');
 assert.equal(match.segments.length,2);assert.deepEqual(match.segments.map(s=>[s.start,s.end]),[[0,17],[17,null]]);assert.equal(match.segments[1].tactic,'counter');assert.ok(match.segments[1].lineup.includes('f3'));assert.ok(!match.segments[1].lineup.includes('f1'));
 assert.equal(match.paused,true);assert.equal(match.rng,rng);assert.equal(match.minute,17);const before=JSON.stringify(match);F.setTactic(match,'counter');assert.equal(JSON.stringify(match),before);
 assert.deepEqual(F.restore(clone(match)),match);advance(match,90);assert.ok(match.segments.every(s=>s.end>s.start));assert.equal(match.players.f1.minutes,17);assert.equal(match.players.f3.minutes,73);assert.deepEqual(F.restore(clone(match)),match);
});

test('kickoff substitutions are rejected atomically, tactics remain available and prep swaps remain free',()=>{
 const prep=F.create();F.swap(prep,'f1','f3');assert.equal(prep.subs,0);assert.deepEqual(prep.decisions,[]);assert.ok(prep.lineup.includes('f3'));
 for(const paused of [false,true]){const match=F.create();F.begin(match);match.paused=paused;atomic(match,()=>F.swap(match,'f1','f3'),/첫 1분부터.*경기 준비/);F.setTactic(match,'press');assert.equal(match.minute,0);assert.equal(match.paused,paused);assert.equal(match.rng,match.seed>>>0);assert.equal(match.segments.length,1);assert.equal(match.segments[0].tactic,'press');assert.deepEqual(normalized(F.restore(clone(match))),normalized(match));
  advance(match,1);F.swap(match,'f1','f3');assert.equal(match.players.f1.minutes,1);assert.equal(match.subs,1);assert.equal(match.segments[0].end,1);assert.ok(match.segments[0].lineup.includes('f1'));assert.ok(match.segments[1].lineup.includes('f3'));
 }
});

test('the last legal played minute supports tactics and substitutions in both live and paused states',()=>{
 for(const paused of [true,false]){const match=advance(F.create(),89);match.paused=paused;F.setTactic(match,'press');F.swap(match,'f1','f3');assert.equal(match.minute,89);assert.equal(match.paused,paused);assert.equal(match.players.f1.minutes,89);advance(match,90);assert.equal(match.players.f3.minutes,1);assert.equal(match.phase,'full');assert.deepEqual(F.restore(clone(match)),match);}
});

test('past scores, goals, attributed players and closed segments survive later decisions unchanged',()=>{
 const match=advance(F.create(20260930),45);const first=clone(match.segments),logs=clone(match.logs),goals=F.goalAttributions(match);F.begin(match);advance(match,59);F.setTactic(match,'press');F.swap(match,'f1','f3');advance(match,90);
 assert.deepEqual(match.segments.slice(0,first.length),first);assert.deepEqual(match.logs.slice(0,logs.length),logs);assert.deepEqual(F.goalAttributions(match).filter(goal=>goal.minute<=45),goals);
 for(const goal of F.goalAttributions(match)){const segment=match.segments.find(segment=>goal.minute>segment.start&&goal.minute<=segment.end);assert.ok(segment.lineup.includes(goal.scorerId));if(goal.assistId!==null)assert.ok(segment.lineup.includes(goal.assistId));if(goal.minute>59){assert.notEqual(goal.scorerId,'f1');assert.notEqual(goal.assistId,'f1');}}
 assert.deepEqual(F.restore(clone(match)),match);
});

test('commands consume no random draws while every played minute consumes exactly eight',()=>{
 const match=F.create(47);let expected=47;for(let minute=1;minute<=90;minute++){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);for(let draw=0;draw<8;draw++)expected=(Math.imul(expected,1664525)+1013904223)>>>0;
  const before=match.rng;schedule(match);assert.equal(match.rng,before);assert.equal(match.rng,expected);
 }
 assert.deepEqual(F.restore(clone(match)),match);
});

test('continuous histories resume deterministically at every tactical and substitution checkpoint',()=>{
 const expected=continuous();for(const minute of [0,7,12,17,28,44,45,52,59,64,65,74,89]){const original=advance(F.create(20260930),minute,schedule),resumed=F.restore(clone(original));assert.equal(resumed.paused,F.running(resumed));advance(resumed,90,schedule);assert.deepEqual(resumed,expected);}
});

test('invalid tactics, formation changes, wrong positions, injured reserves and exhausted subs are atomic',()=>{
 const match=advance(F.create(),17);match.paused=true;atomic(match,()=>F.setTactic(match,'unknown'));atomic(match,()=>F.setFormation(match,'433'));atomic(match,()=>F.swap(match,'f1','m5'));atomic(match,()=>F.swap(match,'f1','f2'));atomic(match,()=>F.swap(match,'none','f3'));
 match.players.f3.injuryRemaining=1;atomic(match,()=>F.swap(match,'f1','f3'));match.players.f3.injuryRemaining=0;
 F.swap(match,'f1','f3');F.swap(match,'m1','m5');F.swap(match,'d1','d5');atomic(match,()=>F.swap(match,'g1','g2'));atomic(match,()=>F.swap(match,'f3','f1'));
 advance(match,90);atomic(match,()=>F.setTactic(match,'counter'));atomic(match,()=>F.swap(match,'f3','f4'));
});

test('segment gaps, overlaps, zero lengths, unclosed prefixes and missing automatic boundaries are rejected',()=>{
 const match=continuous();expectRejected(match,[
  x=>x.segments[1].start++,x=>x.segments[1].start--,x=>x.segments[1].start=7.5,x=>x.segments[1].end=x.segments[1].start,x=>x.segments[0].end=null,
  x=>x.segments.at(-1).end=89,x=>x.segments[0].start=1,x=>x.segments.push(clone(x.segments.at(-1))),
  x=>{x.segments[4].end=46;x.segments[5].start=46;},x=>{x.segments[6].end=66;x.segments[7].start=66;},
  x=>x.decisions.splice(0,1),x=>x.segments[2].lineup[0]=x.segments[2].lineup[1]
 ]);
 const playing=advance(F.create(),17,schedule);expectRejected(playing,[x=>x.segments[0].end=null,x=>x.segments.at(-1).end=17,x=>x.segments.at(-1).chances[0]=1]);
});

test('restore validates actual per-player minutes, endurance costs, ratings and seed-derived RNG',()=>{
 const match=continuous();expectRejected(match,[
  x=>{x.players.f1.minutes++;x.players.f3.minutes--;},x=>x.players.f3.energy+=.01,x=>x.players.f3.initialEnergy--,
  x=>x.segments[1].rating.ourRate+=.01,x=>x.segments[1].rating.pace+=.01,x=>x.segments[1].rating.opponent.speed++,x=>x.rng=(x.rng+1)>>>0,
  x=>x.segments[1].tactic='balanced',x=>x.segments[2].lineup=x.segments[0].lineup.slice(),x=>x.tactic='press'
 ]);
});

test('restore rejects invented, misordered, duplicate and inconsistent continuous decisions',()=>{
 const match=continuous();expectRejected(match,[
  x=>x.decisions[0].from='counter',x=>x.decisions[0].to='balanced',x=>x.decisions[0].minute=6,x=>x.decisions[0].minute=.5,x=>x.decisions[0].type='other',
  x=>x.decisions.reverse(),x=>x.decisions.push({...x.decisions[0],minute:74}),x=>x.decisions[1].energyDelta++,x=>x.decisions[1].attackDelta++,
  x=>x.decisions[1].in='f4',x=>x.decisions[1].minute=0,x=>x.out.reverse(),x=>x.subs=2,
  x=>{const raw=x.decisions[1];raw.out='m1';raw.in='m5';},x=>x.decisions.push({type:'tactic',minute:90,from:'balanced',to:'press'})
 ]);
});

test('automatic pauses at 45 and 65 remain compatible with free changes before the next segment',()=>{
 const match=advance(F.create(),45,schedule);assert.equal(match.phase,'half');assert.equal(F.running(match),false);assert.equal(match.paused,false);F.setTactic(match,'press');F.swap(match,'m1','m5');assert.equal(match.segments.at(-1).end,45);assert.deepEqual(F.restore(clone(match)),match);
 advance(match,65);assert.equal(match.phase,'late');assert.equal(F.running(match),false);assert.equal(match.paused,false);F.setTactic(match,'counter');F.swap(match,'d1','d5');assert.deepEqual(F.restore(clone(match)),match);advance(match,90);assert.equal(match.players.m1.minutes,45);assert.equal(match.players.m5.minutes,45);assert.equal(match.players.d1.minutes,65);assert.equal(match.players.d5.minutes,25);assert.deepEqual(F.restore(clone(match)),match);
});

test('frequent legal decisions remain within the bounded save schema without empty closed segments',()=>{
 const match=F.create(121);F.begin(match);F.setTactic(match,'press');for(let minute=1;minute<=90;minute++){if(!F.running(match))F.begin(match);match.paused=false;F.tick(match);if(F.running(match))F.setTactic(match,match.tactic==='press'?'counter':'press');}
 assert.equal(match.version,5);assert.equal(match.segments.length,90);assert.ok(match.segments.every(segment=>segment.end-segment.start===1));assert.equal(match.subs,0);assert.deepEqual(F.restore(clone(match)),match);
});

console.log('Validated '+checks+' live decision groups.');
