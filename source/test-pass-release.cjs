'use strict';
const assert=require('node:assert/strict'),F=require('./dist/engine.js'),M=require('./dist/movement.js'),T=M.timing;
let groups=0;function test(name,fn){fn();groups++;console.log('PASS '+name);}
function scene(shape,team,offside,type='shot'){
 const match=F.create(9821);F.setFormation(match,shape);F.begin(match);
 const event={minute:12,type:offside?'chance':type,team,action:'through_ball',side:'left',...(offside?{offside:true}:{}),...(team===0?{actorId:match.lineup.find(id=>match.players[id].pos==='FW'),sourceId:match.lineup.find(id=>match.players[id].pos==='MID')}:{actorIndex:0})};
 const origin=M.frame({match,opponentFormation:shape,elapsedMs:1800});
 const input={match,opponentFormation:shape,event,eventOrigin:origin,eventElapsedMs:1800};
 return {match,input,at:age=>M.frame({...input,eventAgeMs:age,elapsedMs:1800+age})};
}
test('the visible pass release agrees with the ball and actual second-last opponent in twelve shapes',()=>{
 for(const shape of Object.keys(F.formations))for(const team of [0,1])for(const offside of [false,true]){
  const {match,at}=scene(shape,team,offside),before=JSON.stringify(match),v=at(T.carry),players=team?v.opponent:v.own,defenders=team?v.own:v.opponent,receiver=players.find(p=>p.id===v.performerId);
  assert.equal(F.offsidePosition(receiver.y,v.ball.y,defenders.map(p=>p.y),team),offside,shape+' team '+team);
  assert.equal(v.passRelease.offside,offside);assert.equal(v.ownerTeam,team);
  assert.equal(JSON.stringify(match),before);
 }
});
test('legal runners cross the line after release, receive at their feet and then shoot toward goal',()=>{
 for(const shape of Object.keys(F.formations))for(const team of [0,1]){
  const {at}=scene(shape,team,false),release=at(T.carry),touch=at(T.shot-1),shot=at(T.shot+200),receiver=[...touch.own,...touch.opponent].find(p=>p.id===touch.carrierId),direction=team===0?-1:1;
  assert.ok((receiver.y-release.passRelease.receiverY)*direction>3);assert.equal(touch.carrierId,touch.performerId);
  assert.ok(Math.hypot(touch.ball.x-receiver.x,touch.ball.y-receiver.y)<2);assert.equal(shot.phase,'shot');
  assert.ok((shot.shotTarget.y-shot.shotFrom.y)*direction>0);
 }
});
test('offside does not teleport a runner, shoot or save, and continues with an indirect free kick',()=>{
 for(const shape of Object.keys(F.formations))for(const team of [0,1]){
  const {at}=scene(shape,team,true);
  for(const boundary of Object.values(T)){
   const a=at(boundary-.01),b=at(boundary+.01);assert.ok(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<.05,shape+' ball at '+boundary);
   for(const p of a.own.concat(a.opponent)){const q=b.own.concat(b.opponent).find(q=>q.id===p.id);assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<.05,shape+' '+p.id+' at '+boundary);}
  }
  for(let age=T.carry;age<T.end;age+=37){const v=at(age);assert.ok(!['shot','goal','save','saved'].includes(v.phase));assert.equal(v.shotProgress,undefined);}
  const whistle=at(T.delivery+100),restart=at(T.hold+100),outlet=at(T.end-100);
  assert.equal(whistle.restart,'indirect-free-kick');assert.equal(whistle.deadBall.team,1-team);
  assert.equal(restart.carrierId,whistle.deadBall.takerId);assert.equal(outlet.phase,'outlet');
  assert.equal(outlet.sourceId,whistle.deadBall.takerId);assert.ok(outlet.receiverId);
 }
});
test('release geometry is stable on pause and preserves current match restoration and reduced motion',()=>{
 const {match,input,at}=scene('433',0,true),before=JSON.stringify(match);
 assert.deepEqual(at(T.carry+50),at(T.carry+50));
 assert.equal(M.frame({...input,eventAgeMs:T.carry+50,motion:false}).phase,'static');
 F.restore(JSON.parse(before));assert.equal(JSON.stringify(match),before);
 assert.equal(F.offsideLine(40,[12],0),null);assert.equal(F.offsideLine(40,[12,NaN],0),null);
});
console.log('Validated '+groups+' pass release groups.');
