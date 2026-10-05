'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),T=require('./dist/training.js'),C=globalThis.Career;
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;
function test(name,fn){fn();groups++;console.log('PASS '+name);}
function finish(m){while(m.phase!=='full'){if(!F.running(m))F.begin(m);F.finishSegment(m);}return m;}
function play(s){finish(s.match);return S.settle(s);}
function league(s){while(s.competition==='cup')s=play(s);return s;}
function rejectAtomic(s,fn){const before=JSON.stringify(s);assert.throws(()=>fn(s));assert.equal(JSON.stringify(s),before);}
function setEnergy(s,slot,energy){s.squad[slot].energy=energy;s.match.players[slot].energy=energy;s.match.players[slot].initialEnergy=energy;}

test('each focus gives an exact read-only preview for the current player and correct limit',()=>{
 const s=S.create(1101),before=JSON.stringify(s);for(const p of Object.values(s.squad))for(const focus of Object.keys(T.choices)){const q=T.preview(s,p.id,focus);assert.equal(q.identity,p.identity);assert.equal(q.slot,p.id);assert.equal(q.key,focus==='technique'?F.roleKey(p):T.choices[focus].key);assert.equal(q.cap,focus==='recovery'?100:focus==='technique'?p.potential:99);assert.equal(q.gain,Math.min(q.cap,p[q.key]+T.choices[focus].amount)-p[q.key]);assert.equal(q.available,focus!=='recovery'||p.energy<100);}assert.equal(JSON.stringify(s),before);
});

test('individual sessions change only the selected player and match inputs, never RNG or finances',()=>{
 for(const focus of Object.keys(T.choices)){const s=S.create(1102),slot='f3';setEnergy(s,slot,50);const before=copy(s),q=T.preview(s,slot,focus),result=T.train(s,slot,focus,s.squad[slot].identity);assert.equal(result.gain,q.gain);assert.equal(s.trained,focus);assert.equal(s.squad[slot][q.key],q.after);assert.equal(s.squad[slot].energy,q.energyAfter);assert.equal(s.match.players[slot][q.key],q.after);assert.equal(s.match.players[slot].energy,q.energyAfter);assert.equal(s.match.players[slot].initialEnergy,q.energyAfter);assert.equal(s.squad[slot].xp,before.squad[slot].xp);for(const id of Object.keys(s.squad).filter(id=>id!==slot)){assert.deepEqual(s.squad[id],before.squad[id]);assert.deepEqual(s.match.players[id],before.match.players[id]);}for(const key of ['rng','seed','lineup','formation','tactic','score','logs','segments','decisions'])assert.deepEqual(s.match[key],before.match[key]);for(const key of ['finance','career','health','statistics','cup'])assert.deepEqual(s[key],before[key]);assert.deepEqual(S.restore(copy(s)),s);}
});

test('all positions improve their own main skill and technical gain clips at their potential',()=>{
 for(const slot of ['g2','d5','m5','f3']){const s=S.create(1103),p=s.squad[slot],key=F.roleKey(p),before=p[key];T.train(s,slot,'technique');assert.equal(p[key],before+2);assert.equal(s.match.players[slot][key],p[key]);assert.doesNotThrow(()=>S.restore(copy(s)));}
 const s=S.create(1104),p=s.squad.f3,key=F.roleKey(p);p[key]=p.potential-1;s.match.players.f3[key]=p[key];C.initialize(s);const q=T.preview(s,'f3','technique');assert.equal(q.gain,1);T.train(s,'f3','technique');assert.equal(p[key],p.potential);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('speed and endurance use their existing 99 ceiling and recovery clips at 100',()=>{
 for(const [focus,key] of [['pace','speed'],['fitness','endurance']]){const s=S.create(1105);s.squad.f3[key]=98;s.match.players.f3[key]=98;assert.equal(T.preview(s,'f3',focus).gain,1);T.train(s,'f3',focus);assert.equal(s.squad.f3[key],99);assert.doesNotThrow(()=>S.restore(copy(s)));}
 const s=S.create(1106);setEnergy(s,'f3',88);assert.equal(T.preview(s,'f3','recovery').gain,12);T.train(s,'f3','recovery');assert.equal(s.squad.f3.energy,100);assert.equal(s.match.players.f3.initialEnergy,100);assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('whole-squad and individual training consume the same once-per-league-week choice',()=>{
 const a=S.create(1107);T.train(a,'f3','technique');rejectAtomic(a,x=>S.train(x,'recovery'));rejectAtomic(a,x=>T.train(x,'f2','pace'));assert.doesNotThrow(()=>S.restore(copy(a)));
 const b=S.create(1108);S.train(b,'fitness');rejectAtomic(b,x=>T.train(x,'f3','recovery'));rejectAtomic(b,x=>T.train(x,'g2','technique'));assert.doesNotThrow(()=>S.restore(copy(b)));
 const next=play(a);assert.equal(next.trained,null);assert.ok(T.preview(next,'f3','technique').available);T.train(next,'f3','technique');assert.doesNotThrow(()=>S.restore(copy(next)));
});

test('invalid players, unknown focuses and a replaced identity fail atomically',()=>{
 const s=S.create(1109);rejectAtomic(s,x=>T.train(x,'missing','technique'));rejectAtomic(s,x=>T.train(x,'f3','magic'));rejectAtomic(s,x=>T.train(x,'f3','technique','t_f1'));
 const old=s.squad.f3.identity,next=S.recruit(s,'t_f2','f3');rejectAtomic(next,x=>T.train(x,'f3','technique',old));const before=next.squad.f3.attack;T.train(next,'f3','technique','t_f2');assert.equal(next.squad.f3.attack,before+2);assert.equal(next.match.players.f3.identity,'t_f2');assert.equal(next.career.baselines.t_f2,before);assert.doesNotThrow(()=>S.restore(copy(next)));
});

test('match segments, halftime, full time and Cup preparation reject training atomically',()=>{
 const s=S.create(1110);F.begin(s.match);rejectAtomic(s,x=>T.train(x,'f3','technique'));F.finishSegment(s.match);assert.equal(s.match.phase,'half');rejectAtomic(s,x=>T.train(x,'f3','recovery'));F.begin(s.match);F.finishSegment(s.match);assert.equal(s.match.phase,'late');rejectAtomic(s,x=>T.train(x,'f3','pace'));finish(s.match);rejectAtomic(s,x=>T.train(x,'f3','fitness'));
 let cup=S.create(1111);for(let i=0;i<4;i++)cup=play(cup);assert.equal(cup.competition,'cup');rejectAtomic(cup,x=>T.train(x,'f3','recovery'));assert.match(T.preview(cup,'f3','technique').reason,/컵/);
});

test('injured, exhausted and capped players retain every stat on rejected sessions',()=>{
 const s=S.create(1112);s.squad.f3.injury={remaining:1,kind:'knock',since:1};s.match.players.f3.injuryRemaining=1;for(const focus of Object.keys(T.choices))rejectAtomic(s,x=>T.train(x,'f3',focus));
 const tired=S.create(1113);setEnergy(tired,'f3',5);for(const focus of ['technique','pace','fitness'])rejectAtomic(tired,x=>T.train(x,'f3',focus));assert.ok(T.preview(tired,'f3','recovery').available);
 for(const [focus,key] of [['technique','attack'],['pace','speed'],['fitness','endurance'],['recovery','energy']]){const capped=S.create(1114),cap=focus==='technique'?capped.squad.f3.potential:focus==='recovery'?100:99;capped.squad.f3[key]=cap;capped.match.players.f3[key]=cap;rejectAtomic(capped,x=>T.train(x,'f3',focus));assert.equal(T.preview(capped,'f3',focus).gain,0);}
});

test('pending technical growth of four persists before settlement, then pays the board task once',()=>{
 let s=S.create(1115);T.train(s,'f3','technique');s=play(s);assert.equal(s.squad.f3.xp,0);assert.equal(C.progress(s).growth,2);assert.equal(s.career.missions.growth,null);T.train(s,'f3','technique');assert.equal(C.progress(s).growth,4);assert.equal(s.career.missions.growth,null);assert.deepEqual(S.restore(copy(s)),s);
 s=play(s);assert.equal(s.career.missions.growth,2);const entries=s.finance.ledger.filter(e=>e.type==='board'&&e.task==='growth');assert.equal(entries.length,1);assert.equal(entries[0].progress,4);assert.equal(entries[0].amount,15000);assert.doesNotThrow(()=>S.restore(copy(s)));s=league(s);T.train(s,'f3','technique');s=play(s);assert.equal(s.finance.ledger.filter(e=>e.type==='board'&&e.task==='growth').length,1);
});

test('technical training plus the earned 270-minute step can record growth five safely',()=>{
 let s=S.create(1116);s.squad.f3.xp=180;T.train(s,'f3','technique');s=play(s);assert.equal(s.squad.f3.xp,180);assert.equal(C.progress(s).growth,2);F.swap(s.match,'f1','f3');T.train(s,'f3','technique');assert.equal(C.progress(s).growth,4);assert.doesNotThrow(()=>S.restore(copy(s)));s=play(s);assert.equal(s.squad.f3.xp,270);assert.equal(C.progress(s).growth,5);assert.equal(s.finance.ledger.find(e=>e.type==='board'&&e.task==='growth').progress,5);assert.doesNotThrow(()=>S.restore(copy(s)));
 let early=S.create(1117);early.squad.f2.xp=180;T.train(early,'f2','technique');early=play(early);assert.equal(C.progress(early).growth,3);assert.equal(early.career.missions.growth,1);assert.doesNotThrow(()=>S.restore(copy(early)));
});

test('new seasons retain trained player skills while resetting the common weekly action',()=>{
 let s=S.create(1118);T.train(s,'f3','pace');const speed=s.squad.f3.speed;while(s.match)s=play(s);assert.ok(S.ready(s));const before=JSON.stringify(s);assert.equal(T.preview(s,'f3','fitness').available,false);rejectAtomic(s,x=>T.train(x,'f3','fitness'));assert.equal(JSON.stringify(s),before);s=S.nextSeason(s);assert.equal(s.trained,null);assert.equal(s.squad.f3.speed,speed);assert.equal(s.squad.f3.energy,100);T.train(s,'f3','fitness');assert.doesNotThrow(()=>S.restore(copy(s)));
});

test('the training model works as a browser script without CommonJS and leaves the season schema intact',()=>{
 const context=vm.createContext({Football:F});vm.runInContext(fs.readFileSync(path.join(__dirname,'dist/training.js'),'utf8'),context);assert.ok(context.Training);const s=S.create(1119),keys=Object.keys(s);context.Training.train(s,'f3','technique');assert.deepEqual(Object.keys(s),keys);assert.equal(s.version,9);assert.equal(s.match.version,5);assert.equal(s.squad.f3.attack,F.roster.find(p=>p.id==='f3').attack+2);assert.doesNotThrow(()=>S.restore(copy(s)));
});
console.log('Validated '+groups+' individual training groups, including shared weekly actions, identity growth and persistence.');
