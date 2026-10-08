'use strict';
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),D=require('./dist/discipline.js'),S=require('./dist/season.js'),ST=require('./dist/statistics.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const advance=(m,to=90)=>{while(m.minute<to){if(!F.running(m))F.begin(m);m.paused=false;F.tick(m);}return m;};
const fixture=seed=>D.initialize(F.create(seed));
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
test('direct red freezes participation and energy and blocks replacement',()=>{
 const m=advance(fixture(7),32),red=m.discipline.events.find(e=>e.card==='red'&&e.team===0);
 assert.deepEqual(red,{minute:32,team:0,id:'m1',card:'red',reason:'direct-red'});
 const energy=m.players.m1.energy,before=JSON.stringify(m);
 assert.throws(()=>F.swap(m,'m1','m5'),/퇴장/);assert.equal(JSON.stringify(m),before);
 const resumed=F.restore(copy(m));advance(m);advance(resumed);assert.deepEqual(resumed,m);
 assert.equal(m.players.m1.minutes,32);assert.equal(m.players.m1.energy,energy);
 assert.ok(m.logs.filter(e=>e.minute>32&&e.type==='goal'&&e.team===0).every(e=>e.scorerId!=='m1'&&e.assistId!=='m1'));
});
test('second yellow dismisses once and removes the player from the active lineup',()=>{
 const m=advance(fixture(1)),events=m.discipline.events.filter(e=>e.team===0&&e.id==='d3');
 assert.equal(events.length,2);assert.equal(events[0].card,'yellow');assert.equal(events[1].reason,'second-yellow');
 assert.equal(m.players.d3.minutes,78);assert.ok(!D.active(m).includes('d3'));assert.equal(D.active(m).length,9);
 assert.deepEqual(F.restore(copy(m)),m);
});
test('forged cards and card commentary are rejected',()=>{
 const m=advance(fixture(7));
 for(const mutate of [x=>x.discipline.events[0].minute++,x=>x.discipline.events.pop(),x=>x.logs.find(e=>e.type==='card').text='fake']){
  const bad=copy(m);mutate(bad);assert.throws(()=>F.restore(bad));
 }
});
test('cards use an independent random stream and old matches remain card free',()=>{
 const old=advance(F.create(7)),current=advance(fixture(7));assert.equal(current.rng,old.rng);
 assert.equal(old.discipline,undefined);assert.deepEqual(F.restore(copy(old)),old);
 const currentSeason=S.create(7);assert.ok(currentSeason.match.discipline);const bad=copy(currentSeason);delete bad.disciplineRules;assert.throws(()=>S.restore(bad));
});
test('season career and statistics settle actual red-card minutes and restore',()=>{
 let s,red;for(let seed=1;seed<=30;seed++){s=S.create(seed);advance(s.match);red=s.match.discipline.events.find(e=>e.team===0&&e.card==='red');if(red)break;}
 assert.ok(red);const match=copy(s.match),expected=Object.values(match.players).reduce((sum,p)=>sum+p.minutes,0);
 assert.ok(expected<990);s=S.settle(s);assert.equal(ST.summary(s).minutes,expected);
 assert.equal(Object.values(s.career.minutes).reduce((sum,n)=>sum+n,0),expected);
 assert.deepEqual(S.restore(copy(s)),s);
 const bad=copy(s);bad.career.minutes[match.players[red.id].identity]++;assert.throws(()=>S.restore(bad));
});
console.log('Validated '+checks+' discipline groups.');
