(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),own='brynwell';
 const club=id=>{const c=S.club(id);return {id:c.id,name:c.name,short:c.short};};
 function read(s,{round=null,clubId='all'}={}){
  const fixtures=S.fixturesFor(s),rounds=fixtures.length,selectedRound=Number.isInteger(round)&&round>=1&&round<=rounds?round:Math.min(s.round+1,rounds),throughRound=Math.min(selectedRound,s.round),clubs=S.leagueClubs(s).map(c=>club(c.id));
  if(!clubs.some(c=>c.id===clubId))clubId='all';
  const results=s.results.filter(r=>r.round<throughRound),previous=S.standings({...s,results:results.filter(r=>r.round<throughRound-1)}),current=S.standings({...s,results});
  function form(id){return results.filter(r=>r.home===id||r.away===id).sort((a,b)=>a.round-b.round).slice(-5).map(r=>{const home=r.home===id,goals=home?[...r.goals]:[r.goals[1],r.goals[0]];return {round:r.round+1,home,opponent:club(home?r.away:r.home),goals,outcome:goals[0]>goals[1]?'win':goals[0]<goals[1]?'loss':'draw'};});}
  const d=s.league.division,five=s.league.rules==='five-tier';
  const table=current.map(row=>({...row,own:row.id===own,change:throughRound>1?previous.find(p=>p.id===row.id).rank-row.rank:null,form:form(row.id),zone:!throughRound?null:five&&d>1&&row.rank<=2?'promotion':five&&d<5&&row.rank>=7?'relegation':!five&&d===2&&row.rank<=2?'promotion':!five&&d===1&&row.rank>=7?'relegation':d===1&&row.rank===1?'leader':null}));
  const matches=fixtures[selectedRound-1].filter(f=>clubId==='all'||f.home===clubId||f.away===clubId).map(f=>{
   const result=results.find(r=>r.round===selectedRound-1&&r.home===f.home&&r.away===f.away),ourGame=f.home===own||f.away===own,active=!result&&ourGame&&s.competition==='league'&&s.round===selectedRound-1&&!!s.match;
   const score=result?[...result.goals]:active&&s.match.minute>0?(f.home===own?[...s.match.score]:[s.match.score[1],s.match.score[0]]):null;
   const recordId='match-'+s.year+'-'+selectedRound,detailsAvailable=!!result&&ourGame&&!!s.statistics?.records.some(r=>r.id===recordId);
   return {home:club(f.home),away:club(f.away),ourGame,active,score,status:result?'confirmed':active?(s.match.phase==='full'?'pending':s.match.phase==='prep'?'next':'live'):'scheduled',minute:active?s.match.minute:null,recordId:detailsAvailable?recordId:null};
  });
  const me=table.find(r=>r.id===own),boundaryRank=d===2||five&&d>1?2:6,boundary=table[boundaryRank-1],selected=clubId==='all'?null:table.find(r=>r.id===clubId);
  const roundStates=fixtures.map((_,i)=>i<s.round?'확정':i===s.round&&s.competition==='league'&&s.match?(s.match.phase==='full'?'결과 미확정':s.match.phase==='prep'?'이번 경기':'진행 중'):'예정');
  return {year:s.year,division:s.league.division,league:S.divisionInfo(s).name,rounds,roundStates,selectedRound,throughRound,completedRounds:s.round,clubId,clubs,table,matches,selected,remaining:rounds-throughRound,race:{rank:throughRound?me.rank:null,points:me.points,boundaryRank,boundaryPoints:boundary.points,gap:me.points-boundary.points,label:d===2||five&&d>1?'승격선':'잔류선',final:throughRound===rounds},note:'순위와 최근 5경기는 선택 라운드까지 확정된 리그 결과만 반영합니다. 국내컵·유럽 대회와 미확정 점수는 제외합니다.'};
 }
 const api={read};root.LeagueCentre=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
