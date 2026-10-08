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
    ?{id:'defend',title:'공격 봉쇄',hint:'우리 실점 1골 이하',done:record?conceded<=1:null,evidence:record?`실점 ${conceded}골`:null}
    :{id:'attack',title:'추가 득점',hint:'우리 팀 2골 이상',done:record?scored>=2:null,evidence:record?`우리 ${scored}골`:null},
   {id:'substitute',title:'감독의 한 수',hint:'경기 중 선수 교체 1명 이상',done:record?subs>=1:null,evidence:record?`교체 ${subs}명`:null}
  ];
 }
 function result(record){
  const opponent=opponentForRecord(record),cards=goals(opponent,record),completed=cards.filter(c=>c.done).length;
  return {opponent:opponent.name,competition:record.competition,score:[...record.score],cards,completed,perfect:completed===cards.length};
 }
 function current(s){
  const m=s?.match,fixture=m&&S.fixtureFor(s);if(!m||!fixture)return {valid:false};
  const opponent=S.club(fixture.home===own?fixture.away:fixture.home),prep=m.phase==='prep',pending=m.phase==='full',substitutions=(m.decisions||[]).filter(d=>d.type==='sub').length;
  const cards=goals(opponent).map(card=>{
   const value=card.id==='substitute'?substitutions:card.id==='defend'?m.score[1]:m.score[0],target=card.id==='attack'?2:1,met=card.id==='defend'?value<=target:value>=target;
   return {...card,value,target,met:prep?null:met,status:prep?'waiting':card.id==='defend'?(met?'holding':'missed'):(met?'met':'working'),evidence:card.id==='substitute'?'실제 교체 '+value+'명':card.id==='defend'?'현재 실점 '+value+'골 · 허용 '+target+'골': '현재 득점 '+value+' / '+target+'골'};
  });
  return {valid:true,opponent:opponent.name,competition:s.competition,minute:m.minute,prep,pending,cards,met:prep?0:cards.filter(c=>c.met).length,confirmed:false};
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
 const api={read,goals,result,current};root.MatchdayObjectives=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
