'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),S=require('./dist/season.js'),O=require('./dist/opposition.js'),M=require('./dist/movement.js');
const s=S.create(91),match=s.match,club=S.opponentFor(s),roster=O.roster(club);F.begin(match);
const before=JSON.stringify(s),base={match,opponentFormation:O.plan(club).formation,opponentRoster:roster,eventElapsedMs:4200};
for(const team of [0,1])for(const type of ['shot','goal','chance']){
 const event={type,team,minute:23,scorerId:team===0?match.lineup.find(id=>match.players[id].pos==='FW'):undefined};
 const initial=M.frame({...base,event,eventAgeMs:0,elapsedMs:4200}),mid=M.frame({...base,event,eventAgeMs:M.timing.shot+100,elapsedMs:9100}),alternate=M.frame({...base,event,eventAgeMs:M.timing.shot+100,elapsedMs:23000}),end=M.frame({...base,event,eventAgeMs:M.timing.impact,elapsedMs:9700});
 assert.deepEqual(mid.ball,alternate.ball,'shot origin must stay fixed despite display time');
 assert.equal(mid.phase,type==='chance'?'intercept':'shot');
 assert.ok(M.commentary(event,match,roster).includes(initial.performerName),'commentator and visual actor must agree');
 if(type==='goal'){assert.equal(end.phase,'goal');assert.equal(end.ball.y,team===0?4:96,'goal crosses goal line into net');}
 if(type==='shot'){const keeper=[...end.own,...end.opponent].find(p=>p.id===end.keeperId);assert.equal(end.carrierId,keeper.id);assert.equal(end.ball.x,keeper.x);assert.equal(end.ball.y,keeper.y);assert.equal(end.ownerTeam,1-team);}
}
assert.equal(new Set(roster.map(p=>p.name)).size,11);
const normal=M.frame({...base,elapsedMs:80});assert.ok(normal.opponent.every(p=>p.name));assert.ok(M.liveCommentary(normal).includes(normal.own.find(p=>p.id===normal.carrierId)?.name||normal.own.find(p=>p.id===normal.receiverId)?.name));
assert.equal(JSON.stringify(s),before,'broadcast must preserve RNG, score and campaign');
console.log('Live broadcast checks passed: frozen trajectories, goal line, keeper catches, names and pure commentary.');
