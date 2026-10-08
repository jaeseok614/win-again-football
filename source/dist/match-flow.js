(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null);
 const speeds={slow:{label:'차분하게',multiplier:.5,stepMs:3600},normal:{label:'보통',multiplier:1,stepMs:1800},fast:{label:'빠르게',multiplier:2,stepMs:900},rapid:{label:'아주 빠르게',multiplier:4,stepMs:450}};
 function normalize(value){return {speed:Object.hasOwn(speeds,value?.speed)?value.speed:'normal',coachPause65:value?.coachPause65===true};}
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
 const api={speeds,normalize,step,advanceFive,createClock};root.MatchFlow=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
