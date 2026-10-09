(function(root){
 'use strict';
 const routes=Object.freeze({cross:'크로스',cutback:'컷백',through_ball:'침투 패스',dribble:'개인 돌파',combination:'패스 연계',corner:'코너킥',freeKick:'직접 프리킥'});
 const blank=()=>({chances:0,blocked:0,shots:0,goals:0});
 function routeFor(event){if(event.setPiece)return Object.hasOwn(routes,event.setPiece)&&['corner','freeKick'].includes(event.setPiece)?event.setPiece:null;return Object.hasOwn(routes,event.action)&&!['corner','freeKick'].includes(event.action)?event.action:null;}
 function read(match,{pendingEvent=null}={}){
  if(!match||!Array.isArray(match.logs)||!Number.isInteger(match.minute)||match.minute<0||match.minute>90)return {valid:false};
  const origin=Math.max(0,match.statisticsOriginMinute||0),pending=match.logs.includes(pendingEvent)&&['goal','shot','chance'].includes(pendingEvent?.type)&&[0,1].includes(pendingEvent.team)?pendingEvent:null;
  const rows=Object.entries(routes).map(([id,label])=>({id,label,teams:[blank(),blank()]})),byId=new Map(rows.map(r=>[r.id,r])),totals=[blank(),blank()],unclassified=[0,0],wide=[{left:0,right:0},{left:0,right:0}];
  for(const event of match.logs){
   if(event===pending||!['chance','shot','goal'].includes(event?.type)||![0,1].includes(event.team)||!Number.isInteger(event.minute)||event.minute<=origin||event.minute>match.minute)continue;
   const id=routeFor(event),team=event.team;
   if(!id){unclassified[team]++;continue;}
   for(const count of [byId.get(id).teams[team],totals[team]]){count.chances++;if(event.type==='chance')count.blocked++;else count.shots++;if(event.type==='goal')count.goals++;}
   if(['cross','cutback'].includes(id)&&['left','right'].includes(event.side))wide[team][event.side]++;
  }
  const leaders=[0,1].map(team=>{const active=rows.filter(r=>r.teams[team].chances).sort((a,b)=>b.teams[team].chances-a.teams[team].chances||b.teams[team].shots-a.teams[team].shots);return active.length&&(!active[1]||active[0].teams[team].chances>active[1].teams[team].chances)?{id:active[0].id,label:active[0].label,...active[0].teams[team]}:null;});
  return {valid:true,minute:match.minute,origin,limited:origin>0,pending:!!pending,rows,totals,wide,leaders,unclassified,note:'실제 기록된 공격 기회만 집계합니다. 모든 패스·크로스 시도 횟수나 성공률은 아닙니다. 골은 슈팅에 포함됩니다.'};
 }
 const api={read,routes};root.AttackAnalysis=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
