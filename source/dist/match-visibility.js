(function(root){
 'use strict';
 function pending(match,event){return !!match&&Array.isArray(match.logs)&&match.logs.includes(event)&&['goal','shot','chance'].includes(event?.type)&&[0,1].includes(event.team);}
 function read(match,event=null){
  if(!pending(match,event))return match;
  const team=event.team,m={...match,logs:match.logs.filter(e=>e!==event),score:[...match.score],shots:[...match.shots],chances:[...match.chances],presentationPending:true};
  m.chances[team]=Math.max(0,m.chances[team]-1);if(event.type!=='chance')m.shots[team]=Math.max(0,m.shots[team]-1);if(event.type==='goal')m.score[team]=Math.max(0,m.score[team]-1);
  return m;
 }
 const api={read,pending};root.MatchVisibility=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
