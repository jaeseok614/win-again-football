'use strict';
const assert=require('node:assert/strict'),S=require('./dist/season.js'),F=require('./dist/engine.js'),P=require('./dist/match-preparation.js'),O=require('./dist/opposition.js'),R=require('./dist/rebirth.js'),N=require('./dist/club-story.js'),Mood=require('./dist/story-mood.js');
const copy=x=>JSON.parse(JSON.stringify(x));let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
function play(s){while(s.match.phase!=='full'){if(!F.running(s.match))F.begin(s.match);F.finishSegment(s.match);}return S.settle(s);}
test('fresh preparation reads the actual opponent and selected eleven, and navigation data cannot mutate the save',()=>{
 const s=S.create(45),before=copy(s),d=P.read(s),o=O.read(s);assert.ok(d.valid);assert.equal(d.roles.length,11);assert.equal(d.opponent.name,o.club.name);assert.equal(d.context.player.identity,o.keyPlayer.identity);assert.equal(d.form.length,0);assert.deepEqual(s,before);d.roles[0].name='edited';d.context.player.name='edited';assert.deepEqual(s,before);
});
test('fatigue takes priority over roles or tactics and names the real tired starter',()=>{
 const s=S.create(45),p=s.match.players[s.match.lineup.find(id=>s.match.players[id].pos==='FW')];p.energy=40;const d=P.read(s);assert.equal(d.priority.id,'fatigue');assert.equal(d.priority.playerId,p.id);assert.ok(d.priority.title.includes(p.name));assert.equal(d.checks.find(c=>c.label==='피로 주의').value,'1명');assert.equal(d.priority.action,'roster');
});
test('custom placement determines assigned roles and support without changing identity or the instruction',()=>{
 const s=S.create(45),p=s.match.players.f2,provided=[{id:p.id,x:14,y:60}],before=copy(s),d=P.read(s,provided),row=d.roles.find(r=>r.id===p.id);assert.equal(row.code,F.assignedPosition(14,60,p.pos).code);assert.equal(row.identity,p.identity);assert.deepEqual(s,before);F.setAttackFocus(s.match,'cross');assert.equal(P.read(s).instruction,F.attackFocuses.cross);
});
test('recent form uses complete confirmed league receipts and copies their actual scores',()=>{
 let s=S.create(45);for(let i=0;i<4;i++)s=play(s);const before=copy(s),d=P.read(s),rows=s.statistics.records.slice(-3);assert.deepEqual(d.form.map(g=>g.score),rows.map(g=>g.score));assert.equal(d.form.length,3);d.form[0].score[0]=90;assert.deepEqual(s,before);const partial=copy(s);partial.statistics.records.forEach(g=>g.statisticsOriginMinute=20);assert.equal(P.leagueForm(partial).length,0);
});
test('a chosen three-game contract is shown with actual progress and never answered by a briefing read',()=>{
 let s=S.create(45,{rebirth:true});while(s.round<6)s=play(s);const before=copy(s);P.read(s);assert.deepEqual(s,before);assert.ok(R.read(s).pending);s=R.choose(s,'steady');const chosen=copy(s),d=P.read(s);assert.equal(d.context.kind,'promise');assert.ok(d.context.text.includes('리그 3경기'));assert.ok(d.context.text.includes('현재 0'));assert.deepEqual(s,chosen);
});
test('actual prior dialogue burdens are counted only after its two explicit choices',()=>{
 let s=S.create(46);while(s.round<12)s=play(s);const id=N.events(s).find(e=>e.key==='pressure-public-spotlight').id;assert.notEqual(P.read(s).priority.id,'mood');N.choose(s,id,0,'bold',N.fingerprint(s));assert.notEqual(P.read(s).priority.id,'mood');N.choose(s,id,1,'honest',N.fingerprint(s));const count=Mood.summary(s.match).negative;assert.ok(count>=3);const d=P.read(s);assert.equal(d.priority.id,'mood');assert.ok(d.priority.text.includes(count+'명'));assert.equal(d.priority.action,'talk');
});
test('running and ended matches never expose a pre-match forecast or read the story catalog',()=>{const s=S.create(45);F.begin(s.match);const before=copy(s);assert.equal(P.read(s).valid,false);assert.deepEqual(s,before);assert.equal(P.read(null).valid,false);});
console.log('Validated '+groups+' match preparation groups.');
