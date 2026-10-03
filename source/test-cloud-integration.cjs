'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),H=require('./dist/health.js'),M=require('./dist/matchday.js');
const copy=x=>JSON.parse(JSON.stringify(x)),freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const advance=(s,to)=>{while(s.match.minute<to){if(!F.running(s.match))F.begin(s.match);s.match.paused=false;F.tick(s.match);}return s;};
let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS '+name);};
test('planner reflects formation, injuries, fatigue and remaining substitutes without mutation',()=>{
 const s=S.create(2040);F.setFormation(s.match,'433');const before=copy(s),d=H.depth(freeze(copy(s)));
 assert.deepEqual(d.positions.map(p=>p.required),[1,4,3,3]);assert.deepEqual(s,before);
 for(const id of ['f3','f4']){s.squad[id].injury={remaining:1,kind:'muscle',since:1};s.match.players[id].injuryRemaining=1;}
 assert.equal(H.depth(s).positions.find(p=>p.position==='FW').status,'shortage');
 const fit=S.create(2040);fit.match.players.f1.energy=20;const row=H.depth(fit).positions.find(p=>p.position==='FW');assert.equal(row.status,'rotate');assert.equal(row.action,'match');
 advance(fit,17);F.swap(fit.match,'f1','f3');assert.equal(H.depth(fit).positions.find(p=>p.position==='FW').available,3);
});
test('momentum boundaries count actual attacks once and never use card events',()=>{
 const s=S.create(2040);s.match.minute=31;s.match.logs=[{minute:15,type:'goal',team:0},{minute:16,type:'shot',team:1},{minute:30,type:'chance',team:1},{minute:31,type:'card',team:0}];
 const before=copy(s),flow=M.read(freeze(copy(s))).momentum;assert.equal(flow.windows[0].own,4);assert.equal(flow.windows[1].opponent,3);assert.equal(flow.windows[2].own,0);assert.equal(flow.active,2);assert.deepEqual(s,before);
});
test('analyst priorities depend on real pressure, fatigue and late deficit',()=>{
 const s=advance(S.create(2040),70);s.match.logs=[];s.match.score=[0,1];assert.equal(M.read(s).insight.id,'chase');
 for(const id of s.match.lineup.slice(0,3))s.match.players[id].energy=20;
 assert.equal(M.read(s).insight.id,'fatigue');s.match.logs.push({minute:70,type:'goal',team:1});assert.equal(M.read(s).insight.id,'pressure');
 s.match.phase='full';assert.equal(M.read(s).insight,null);
});
test('dismissed players are excluded from suggested substitutions and condition previews',()=>{
 let s,red;for(let seed=1;seed<=30;seed++){s=advance(S.create(seed),80);red=s.match.discipline.events.find(e=>e.team===0&&e.card==='red');if(red)break;}
 assert.ok(red);for(const p of Object.values(s.match.players))p.energy=100;s.match.players[red.id].energy=1;
 const before=copy(s),model=M.read(s,red.id);assert.equal(model.selected,null);assert.equal(model.substitution.suggestion,null);assert.equal(model.averageEnergy,100);assert.deepEqual(s,before);
});
test('rotation confirmation rejects a preview from another match and changed ranking',()=>{
 const s=S.create(2040),plan=H.rotationPlan(s),other=copy(s);other.match.seed++;
 assert.throws(()=>H.applyRotation(other,plan.fingerprint));s.match.players.f4.attack++;assert.throws(()=>H.applyRotation(s,plan.fingerprint));
});
test('home handoff saves with cards migrate to explicit rules without altering the match',()=>{
 const s=advance(S.create(2040),17);delete s.disciplineRules;const restored=S.restore(copy(s));assert.equal(restored.disciplineRules,1);
 assert.deepEqual(restored.match.discipline,s.match.discipline);assert.equal(restored.match.rng,s.match.rng);assert.equal(s.disciplineRules,undefined);
});
console.log('Validated '+groups+' cloud integration groups.');
