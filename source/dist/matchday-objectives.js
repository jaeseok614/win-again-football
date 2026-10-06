(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null);
 const own=S.own;
 function opponentForRecord(record){return S.club(record.home===own?record.away:record.home);}
 function substituteCount(record){
  const first=new Set(record.segments[0].lineup),introduced=new Set();
  for(const segment of record.segments.slice(1))for(const id of segment.lineup)if(!first.has(id))introduced.add(id);
  return introduced.size;
 }
 function goals(opponent,record=null){
  const strongAttack=opponent.attack>=80||opponent.speed>=75;
  const scored=record?.score[0]??0,conceded=record?.score[1]??0,subs=record?substituteCount(record):0;
  return [
   {id:'score',title:'골문 열기',hint:'우리 팀 1골 이상',done:record?scored>=1:null,evidence:record?`우리 ${scored}골`:null},
   strongAttack
    ?{id:'defend',title:'공격 봉쇄',hint:'상대 실점 1골 이하',done:record?conceded<=1:null,evidence:record?`실점 ${conceded}골`:null}
    :{id:'attack',title:'추가 득점',hint:'우리 팀 2골 이상',done:record?scored>=2:null,evidence:record?`우리 ${scored}골`:null},
   {id:'substitute',title:'감독의 한 수',hint:'경기 중 선수 교체 1명 이상',done:record?subs>=1:null,evidence:record?`교체 ${subs}명`:null}
  ];
 }
 function result(record){
  const opponent=opponentForRecord(record),cards=goals(opponent,record),completed=cards.filter(c=>c.done).length;
  return {opponent:opponent.name,competition:record.competition,score:[...record.score],cards,completed,perfect:completed===cards.length};
 }
 function read(s){
  const fixture=S.fixtureFor(s),opponent=fixture?S.club(fixture.home===own?fixture.away:fixture.home):null;
  const records=s.statistics?.records||[];
  const outcomes=records.map(result);let currentStreak=0,bestStreak=0,streak=0,completedGoals=0;
  for(const outcome of outcomes){completedGoals+=outcome.completed;if(outcome.perfect){streak++;bestStreak=Math.max(bestStreak,streak);}else streak=0;}
  for(let i=outcomes.length-1;i>=0&&outcomes[i].perfect;i--)currentStreak++;
  return {upcoming:opponent?{opponent:opponent.name,competition:s.competition,cards:goals(opponent)}:null,
   pending:s.match?.phase==='full',last:outcomes.at(-1)||null,perfectCount:outcomes.filter(outcome=>outcome.perfect).length,
   currentStreak,bestStreak,completedGoals,recordCount:records.length};
 }
 const api={read,goals,result};root.MatchdayObjectives=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
