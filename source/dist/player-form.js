(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null),clubId='brynwell';
 function empty(identity,limit){return {valid:true,identity,limit,appearances:0,form:'',wins:0,draws:0,losses:0,goals:0,assists:0,minutes:0,matches:[]};}
 function invalid(reason){return {valid:false,reason,identity:null,limit:5,appearances:0,form:'',wins:0,draws:0,losses:0,goals:0,assists:0,minutes:0,matches:[]};}
 function describe(record,player){
  if(!Array.isArray(record.score)||record.score.length!==2||!record.score.every(Number.isInteger))return null;
  const [forGoals,againstGoals]=record.score,outcome=forGoals>againstGoals?'win':forGoals<againstGoals?'loss':'draw',opponentId=record.home===clubId?record.away:record.home;
  let opponent=opponentId;try{opponent=S.club(opponentId)?.short||opponentId;}catch{}
  const competition=record.competition==='league'?'리그 '+record.round+'R':record.competition==='cup'?'국내컵 '+(Number.isInteger(record.stage)?record.stage+1:'')+'단계':record.competition==='europe'?'유럽 '+(Number.isInteger(record.stage)?record.stage+1:'')+'단계':'경기';
  return {year:record.year,competition,opponent,score:[forGoals,againstGoals],outcome,minutes:player.minutes,goals:player.goals,assists:player.assists,started:!!player.started};
 }
 function squad(s,limit=5){
  if(!Number.isInteger(limit)||limit<1||limit>10)limit=5;
  if(!s||!s.statistics||!Array.isArray(s.statistics.records)||!Array.isArray(s.statistics.archive)||!s.squad||typeof s.squad!=='object'||Array.isArray(s.squad))return {};
  const rows=new Map(Object.values(s.squad).filter(p=>typeof p?.identity==='string').map(p=>[p.identity,[]]));if(!rows.size)return {};
  const historyYears=s.statistics.archive.map(archive=>Array.isArray(archive?.records)?archive.records:[]).concat([s.statistics.records]);let needed=rows.size;
  for(let year=historyYears.length-1;year>=0&&needed;year--){const records=historyYears[year];for(let i=records.length-1;i>=0&&needed;i--){
   const record=records[i];if(!Array.isArray(record?.players)||!Array.isArray(record.score))continue;
   for(const player of record.players){const history=rows.get(player?.identity);if(!history||history.length>=limit||!Number.isInteger(player.minutes)||player.minutes<=0)continue;const match=describe(record,player);if(match){history.push(match);if(history.length===limit)needed--;}}
  }}
  return Object.fromEntries([...rows].map(([identity,matches])=>{
   const report=empty(identity,limit);report.matches=matches;report.appearances=matches.length;
   for(const match of matches){report[match.outcome==='win'?'wins':match.outcome==='draw'?'draws':'losses']++;report.goals+=match.goals;report.assists+=match.assists;report.minutes+=match.minutes;}
   report.form=matches.map(match=>match.outcome==='win'?'W':match.outcome==='draw'?'D':'L').join('');return [identity,report];
  }));
 }
 function read(s,identity,limit=5){
  if(typeof identity!=='string'||!s?.squad||!Object.values(s.squad).some(p=>p?.identity===identity))return invalid('현재 선수단에 등록된 선수가 아닙니다.');
  const all=squad(s,limit);return all[identity]||empty(identity,Number.isInteger(limit)&&limit>=1&&limit<=10?limit:5);
 }
 const api={read,squad};root.PlayerForm=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
