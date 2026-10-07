'use strict';
const assert=require('node:assert/strict');
const F=require('./dist/engine.js'),S=require('./dist/season.js');
const copy=value=>JSON.parse(JSON.stringify(value));let checks=0;
function test(name,run){run();checks++;console.log('PASS '+name);}
function complete(match){if(match.paused)match.paused=false;if(!F.running(match))F.begin(match);while(match.phase!=='full'){if(!F.running(match))F.begin(match);F.tick(match);}return match;}

test('fresh five-tier campaigns use the versioned set-piece plan while historic match engines stay unchanged',()=>{
 const modern=S.create(60101,{startingClub:true}),legacy=S.create(60102);assert.equal(modern.match.version,9);assert.deepEqual(Object.keys(modern.match.setPieces).sort(),['corner','freeKick','target']);assert.equal(legacy.match.version,5);assert.equal(Object.hasOwn(legacy.match,'setPieces'),false);
 const old=copy(modern.match);old.version=7;delete old.setPieces;delete old.opponentPlans;assert.doesNotThrow(()=>F.restore(old));assert.throws(()=>F.assignSetPieceRole(old,'corner',old.lineup[1]));
});

test('the manager can assign all three roles only to a starting field player before kickoff',()=>{
 const m=F.create(60103,{version:8}),chosen=m.lineup.find(id=>m.players[id].pos==='MID');const rng=m.rng;F.assignSetPieceRole(m,'corner',chosen);F.assignSetPieceRole(m,'freeKick',chosen);F.assignSetPieceRole(m,'target',chosen);assert.equal(m.setPieces.corner,chosen);assert.equal(m.rng,rng);assert.throws(()=>F.assignSetPieceRole(m,'corner','g1'));F.begin(m);assert.throws(()=>F.assignSetPieceRole(m,'corner',chosen));
});

test('corner and direct-free-kick events use selected players, create distinct records and restore deterministically',()=>{
 const m=F.create(42,{version:8});F.assignSetPieceRole(m,'freeKick','m2');F.begin(m);while(m.minute<27)F.tick(m);const checkpoint=F.restore(copy(m)),a=complete(m),b=complete(checkpoint);assert.deepEqual(a.logs,b.logs);assert.deepEqual(a.score,b.score);const own=a.logs.filter(event=>event.team===0&&event.setPiece);assert.ok(own.some(event=>event.setPiece==='freeKick'));for(const event of own){assert.equal(event.actorId,event.setPiece==='freeKick'?a.setPieces.freeKick:event.actorId);assert.match(event.text,/프리킥|코너킥/);assert.ok(['chance','shot','goal'].includes(event.type));}assert.deepEqual(F.restore(copy(a)),a);
});

test('set-piece specialist ratings shape expected-goal quality, and role changes do not consume RNG',()=>{
 const m=F.create(60104,{version:8}),players=m.lineup.filter(id=>m.players[id].pos!=='GK').map(id=>m.players[id]),kicker=[...players].sort((a,b)=>F.setPieceScore(b,'corner')-F.setPieceScore(a,'corner'))[0],target=[...players].sort((a,b)=>F.setPieceScore(b,'target')-F.setPieceScore(a,'target'))[0],weak=[...players].sort((a,b)=>F.setPieceScore(a,'target')-F.setPieceScore(b,'target'))[0],strongXg=F.setPieceExpectedGoals(m,0,'corner',kicker,target),weakXg=F.setPieceExpectedGoals(m,0,'corner',kicker,weak),rng=m.rng;
 assert.ok(strongXg>=weakXg);F.assignSetPieceRole(m,'corner',kicker.id);F.assignSetPieceRole(m,'target',target.id);assert.equal(m.rng,rng);assert.equal(F.setPieceScore(target,'target'),F.setPieceScore(m.players[target.id],'target'));
});

test('set-piece logs occur in actual match simulations and tampered assignments or events are rejected',()=>{
 const kinds=new Set();for(let seed=1;seed<=160;seed++){const m=complete(F.create(seed,{version:8}));for(const event of m.logs)if(event.team===0&&event.setPiece)kinds.add(event.setPiece);}assert.deepEqual([...kinds].sort(),['corner','freeKick']);
 const bad=F.create(60105,{version:8});bad.setPieces.corner='g1';assert.throws(()=>F.restore(bad));const played=complete(F.create(42,{version:8})),event=played.logs.find(item=>item.team===0&&item.setPiece);assert.ok(event);const tampered=copy(played);tampered.logs.find(item=>item.minute===event.minute&&item.team===0).setPiece='throwIn';assert.throws(()=>F.restore(tampered));
});

test('in-progress season save keeps role assignments and accepts a pre-upgrade version-seven match',()=>{
 const season=S.create(60106,{startingClub:true}),replacement=season.match.lineup.find(id=>season.match.players[id].pos==='DEF');F.assignSetPieceRole(season.match,'target',replacement);F.begin(season.match);for(let i=0;i<18;i++)F.tick(season.match);const restored=S.restore(copy(season));assert.equal(restored.match.version,9);assert.equal(restored.match.setPieces.target,replacement);assert.deepEqual(restored.match.logs,season.match.logs);
 const prior=copy(season);prior.match.version=7;delete prior.match.setPieces;delete prior.match.opponentPlans;const old=S.restore(prior);assert.equal(old.match.version,7);assert.equal(Object.hasOwn(old.match,'setPieces'),false);
});

test('a corner header updates identity-based goals and assists in the confirmed season record',()=>{
 const season=S.create(79,{startingClub:true});complete(season.match);const goal=season.match.logs.find(event=>event.type==='goal'&&event.team===0&&event.setPiece==='corner');assert.ok(goal);const settled=S.settle(season),record=settled.statistics.records.at(-1),receipt=record.events.find(event=>event.setPiece==='corner');assert.equal(receipt.scorerId,goal.scorerId);assert.equal(receipt.assistId,goal.assistId);assert.equal(record.players.find(player=>player.identity===goal.scorerIdentity).goals,1);assert.equal(record.players.find(player=>player.identity===goal.assistIdentity).assists,1);assert.doesNotThrow(()=>S.restore(copy(settled)));
 const forged=copy(settled);forged.statistics.records.at(-1).events.find(event=>event.setPiece==='corner').assistId=null;assert.throws(()=>S.restore(forged));
});

console.log(`Passed ${checks} set-piece checks.`);
