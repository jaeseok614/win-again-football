'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('./dist/engine.js'),S=require('./dist/season.js'),T=require('./dist/player-traits.js'),Details=require('./dist/player-details.js');
const test=(name,fn)=>{fn();console.log('PASS '+name);},copy=x=>JSON.parse(JSON.stringify(x));

test('named starter profiles distinguish winger, fullback and two-footed captain',()=>{
 const s=S.create(7101,{startingClub:true}),son=s.squad.f1,kul=s.squad.m3,porro=s.squad.d3;
 assert.deepEqual(T.feet(son),{left:5,right:5,label:'양발',stars:'왼발 5/5 · 오른발 5/5'});
 assert.deepEqual(T.feet(kul),{left:5,right:3,label:'왼발',stars:'왼발 5/5 · 오른발 3/5'});
 assert.ok(T.suitability(kul,'RW')>T.suitability(kul,'RB')+30);
 assert.ok(T.suitability(porro,'RB')>T.suitability(porro,'RW')+25);
 assert.ok(T.suitability(son,'LW')>T.suitability(son,'LB')+40);
 assert.ok(T.allPositions(son).some(p=>p.code==='LB'&&p.score<T.suitability(son,'LW')));
});

test('new Tottunham campaign places natural fullbacks outside and centre-backs inside',()=>{
 const s=S.create(7105,{startingClub:true}),ids=s.match.lineup.filter(id=>s.match.players[id].pos==='DEF');
 assert.deepEqual(ids.map(id=>s.match.players[id].identity),['sp_d4','sp_d1','sp_d2','sp_d3']);
 const coords=F.formationPositions['442'].DEF;
 assert.deepEqual(coords.map(([x,y])=>F.assignedPosition(x,y,'DEF').code),['LB','CB','CB','RB']);
 assert.ok(ids.every((id,i)=>T.suitability(s.match.players[id],F.assignedPosition(...coords[i],'DEF').code)>=80));
 assert.deepEqual(S.restore(copy(s)).match.lineup,s.match.lineup);
});

test('foot and position traits belong to identity across transfers and old save restoration',()=>{
 let s=S.create(7102,{startingClub:true});const original=T.feet(s.squad.f3),before=JSON.stringify(s);
 assert.deepEqual(T.feet(s.squad.f3),original);assert.equal(JSON.stringify(s),before);
 s=S.recruit(s,'t_f2','f3');const incoming=T.feet(s.squad.f3);assert.deepEqual(incoming,T.feet(F.identityProfile('t_f2')));
 assert.notDeepEqual(incoming,original);assert.deepEqual(T.feet(S.restore(copy(s)).squad.f3),incoming);
 for(const p of [...F.market,F.youthCandidates(7102,1,1,'MID')]){
  const foot=T.feet(p);assert.ok([1,2,3,4,5].includes(foot.left));assert.ok([1,2,3,4,5].includes(foot.right));assert.ok(Math.max(foot.left,foot.right)===5);
  assert.equal(T.allPositions(p).length,14);
 }
});

test('match form is distinct from stamina, stable on restore and responds to a recorded talk',()=>{
 const s=S.create(7103,{startingClub:true}),p=s.squad.f1,before=JSON.stringify(s),first=T.condition(s,p);
 assert.ok(first.score>=25&&first.score<=99);assert.equal(T.condition(s,p).score,first.score);
 s.match.players.f1.energy=12;assert.equal(T.condition(s,p).score,first.score);
 s.match.morale={...(s.match.morale||{}),f1:2};assert.equal(T.condition(s,p).score,Math.min(99,first.score+8));
 assert.deepEqual(T.condition(S.restore(copy(S.create(7103,{startingClub:true}))),p),first);
 assert.equal(JSON.stringify(S.create(7103,{startingClub:true})),before);
});

test('detail report contains both foot strengths, all position scores and independent condition',()=>{
 const s=S.create(7104,{startingClub:true}),d=Details.read(s,'sp_f1');
 assert.equal(d.feet.label,'양발');assert.equal(d.positions.length,14);assert.ok(d.positions.find(p=>p.code==='LW').score>d.positions.find(p=>p.code==='LB').score);
 assert.equal(d.matchCondition.score,T.condition(s,s.squad.f1).score);
 assert.equal(d.current.energy,s.squad.f1.energy);
 const ui=fs.readFileSync(path.join(__dirname,'dist/player-details-ui.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'dist/player-traits.css'),'utf8'),app=fs.readFileSync(path.join(__dirname,'dist/app.js'),'utf8');
 assert.match(ui,/왼발 \$\{d\.feet\.left\}\/5/);assert.match(ui,/player-position-groups/);
 assert.match(app,/class="player-stamina stamina-/);assert.match(app,/class="player-form form-/);assert.ok(!app.includes('<span class="player-energy'));
 assert.match(css,/height:var\(--stamina-level\)/);for(const color of ['#77df75','#f0ce52','#f07062'])assert.ok(css.includes(color));
});
