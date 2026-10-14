
(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),Media=root.MediaRoom||(typeof require==='function'?require('./media-room.js'):null),Life=root.ClubLife||(typeof require==='function'?require('./club-life.js'):null);
 function summary(text){return String(text||'').split(/(?<=[.!?。])\s+/)[0];}
 function art(style){return style==='analysis'?{type:'story',key:'coach'}:style==='players'?{type:'story',key:'captain'}:{type:'memory',key:'office'};}
 function get(s,key){
  if(typeof key!=='string')return null;
  if(key.startsWith('review:')){
   const item=Media.read(s).find(a=>a.style===key.slice(7));if(!item)return null;
   const me=S.standings(s).find(c=>c.id===S.own),tier=S.divisionInfo(s),last=s.statistics?.records?.at(-1);
   const context=me.played?'현재 '+tier.name+' '+me.rank+'위, '+me.points+'점이다. 리그 '+me.played+'경기를 마쳤으며 정규 일정은 '+S.roundCount(s)+'경기다.':'현재 '+tier.name+'의 첫 리그 경기를 준비하고 있다. 정규 리그는 '+S.roundCount(s)+'경기이며, 아직 확정된 리그 순위와 경기 평가가 없다.';
   const record=last?'최근 확정 경기의 상대는 '+S.club(last.home===S.own?last.away:last.home).short+'이며, 우리 팀 기준 점수는 '+last.score.join(' : ')+'이다.':'첫 결과가 확정되면 감독과 선수에 대한 평가가 이 기록을 바탕으로 갱신된다.';
   return {key,headline:item.headline,outlet:item.outlet,tag:item.desk,verdict:item.verdict,summary:summary(item.body),paragraphs:[item.body,context,record],fact:item.fact,year:s.year,art:art(item.style),fictional:true};
  }
  if(key.startsWith('news:')){
   const item=Life.news(s).find(a=>a.id===key.slice(5));if(!item)return null;
   return {key,headline:item.headline,outlet:'구단 소식',tag:item.tag,summary:summary(item.body),paragraphs:[item.body],fact:item.year+'시즌 · 확정 기록',year:item.year,art:item.kind==='staff'?{type:'story',key:'coach'}:item.kind==='press'?{type:'memory',key:'office'}:{type:'story',key:'captain'},fictional:true};
  }
  return null;
 }
 const api={summary,art,get};root.Newsroom=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
