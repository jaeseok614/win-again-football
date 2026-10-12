(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const speeds={slow:{label:'차분하게',multiplier:.5,stepMs:3600},normal:{label:'보통',multiplier:1,stepMs:1800},fast:{label:'빠르게',multiplier:2,stepMs:900},rapid:{label:'아주 빠르게',multiplier:4,stepMs:450}};
 function normalize(value){return {speed:Object.hasOwn(speeds,value?.speed)?value.speed:'normal',coachPause65:value?.coachPause65===true,...(['key','full'].includes(value?.watch)?{watch:value.watch}:{})};}
 const watchMode=value=>value?.watch==='full'?'full':'key';
 const watchModes={key:'핵심 장면',full:'전체 관전'};
 // Read only what has happened in the physical world; never precompute outcomes.
 function viewingPhase(match){
  const w=match?.continuous;if(!w)return 'routine';const b=w.ball,recent=w.tick-(w.cue?.tick??-100);
  if(b.flight?.kind==='shot'||recent<12&&['shot','save','parry','header','block','woodwork','goal'].includes(w.cue?.kind))return 'decisive';
  if(b.flight?.kind==='cross')return 'attack';
  const targetY=team=>(team===0?0:105)*(w.half===1?1:0)+(team===0?105:0)*(w.half===1?0:1);
  const close=(p,team)=>p&&Math.abs(p.y-targetY(team))<20&&Math.abs(p.x-34)<21;
  const carrier=b.owner? w.players.find(p=>p.active&&p.id===b.owner):null;
  if(carrier&&close(b,carrier.team))return 'attack';
  const flight=b.flight,receiver=flight?.receiver?w.players.find(p=>p.active&&p.id===flight.receiver):null;
  if(receiver&&close(receiver,receiver.team))return 'attack';
  if(w.restart&&['penalty','corner','freeKick'].includes(w.restart.kind)&&Math.abs(w.restart.y-targetY(w.restart.team))<30)return 'attack';
  return 'routine';
 }
 function displayRate(match,prefs){
  const speed=speeds[prefs?.speed]?.multiplier||1,w=match.continuous;
  if(watchMode(prefs)==='key'){const phase=viewingPhase(match);return phase==='decisive'?Math.min(4,2*speed):phase==='attack'?Math.min(12,4*speed):48*speed;}
  if(w.ball.flight?.kind==='shot'||w.tick-w.cue.tick<12&&['save','parry','header','block','woodwork'].includes(w.cue.kind))return Math.min(4,1.5*speed);
  if(w.ball.flight?.kind==='cross'||w.ball.flight&&Math.min(w.ball.y,105-w.ball.y)<30)return Math.min(8,3*speed);
  if(w.ball.flight)return Math.min(8,4*speed);
  if(w.cue.kind==='control'&&w.tick-w.cue.tick<4)return Math.min(2,speed);
  return 12*speed;
 }
 const routineLogs=new Set(['pass','receive','recovery','tackle','header','restart']);
 function broadcastEvent(event){return !!event&&!routineLogs.has(event.type);}
 const broadcastCache=new WeakMap();
 function recentBroadcast(match){if(!match)return null;const logs=match.logs||[];let cache=broadcastCache.get(match);if(!cache||cache.logs!==logs||cache.count>logs.length)cache={logs,count:0,event:null};for(let i=cache.count;i<logs.length;i++)if(broadcastEvent(logs[i]))cache.event=logs[i];cache.count=logs.length;broadcastCache.set(match,cache);return cache.event;}
 function step(match,prefs){
  if(!F.running(match)||match.paused)return [];
  const from=match.logs.length;F.tick(match);
  if(match.phase==='late'&&!normalize(prefs).coachPause65)F.begin(match);
  return match.logs.slice(from);
 }
 function advanceFive(match,prefs){
  if(!F.running(match))throw Error('진행 중인 경기에서 5분을 볼 수 있어요.');
  match.paused=false;const events=[];
  for(let i=0;i<5&&F.running(match);i++)events.push(...step(match,prefs));
  if(F.running(match))match.paused=true;
  return events;
 }
 function createClock(){
  let dueAt=null,lastSpeed=null;
  return {reset(){dueAt=null;lastSpeed=null;},due(now,active,speed='normal'){
   if(!Number.isFinite(now)||!active){dueAt=null;lastSpeed=null;return false;}
   const chosen=Object.hasOwn(speeds,speed)?speed:'normal',interval=speeds[chosen].stepMs;
   if(dueAt===null||lastSpeed!==chosen){lastSpeed=chosen;dueAt=now+interval;return false;}
   if(now<dueAt)return false;dueAt=now+interval;return true;
  }};
 }
 const api={speeds,normalize,watchMode,watchModes,viewingPhase,displayRate,broadcastEvent,recentBroadcast,step,advanceFive,createClock};root.MatchFlow=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
