(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),S=root.Season||(typeof require==='function'?require('./season.js'):null),ST=root.Statistics||(typeof require==='function'?require('./statistics.js'):null),P=root.Cup||(typeof require==='function'?require('./cup.js'):null),MP=root.MatchPerformance||(typeof require==='function'?require('./match-performance.js'):null);
 const copy=value=>JSON.parse(JSON.stringify(value)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),own='brynwell',growthLabels={attack:'결정력',defense:'수비',passing:'패스',keeping:'선방'};
 const europeModule=()=>root.Europe||(typeof require==='function'?require('./europe.js'):null);
 const resultId=(year,competition,round,stage)=>competition==='league'?'match-'+year+'-'+round:competition+'-'+year+'-'+stage;
 const invalid=(source,reason)=>({valid:false,source,reason});
 function oriented(f,score){return f.home===own?[...score]:[score[1],score[0]];}
 function resultContext(s,competition,round,stage){
  const r=competition!=='league'?(competition==='cup'?s.cup:s.europe)?.results?.find(item=>item.stage===stage&&item.week===round&&(item.home===own||item.away===own)):s.results?.find(item=>item.round===round-1&&(item.home===own||item.away===own));
  if(!r)return null;
  const score=oriented(r,r.goals),opponentId=r.home===own?r.away:r.home;
  return {id:resultId(s.year,competition,round,stage),year:s.year,competition,round,stage:competition!=='league'?stage:null,home:r.home,away:r.away,opponentId,score,penalties:competition!=='league'&&r.penalties?oriented(r,r.penalties):null,winner:competition!=='league'?r.winner:score[0]===score[1]?null:score[0]>score[1]?own:opponentId};
 }
 function latestContext(s,receipt){
  if(receipt)return resultContext(s,receipt.type==='match'?'league':receipt.type,receipt.round,receipt.type!=='match'?receipt.stage:null);
  // Older saves may predate financial receipts as well as player records.
  const cup=s.cup?.results?.filter(item=>item.home===own||item.away===own).at(-1);
  if(cup&&cup.week===s.round)return resultContext(s,'cup',cup.week,cup.stage);
  return s.round>0?resultContext(s,'league',s.round,null):null;
 }
 function reportMatches(report,context){
  return !!report&&(report.year===undefined||report.year===context.year)&&report.competition===context.competition&&report.round===context.round&&(context.competition==='league'||report.stage===context.stage)&&report.fixturehome===context.home&&report.opponent===context.opponentId&&same(report.score,context.score)&&same(report.penalties??null,context.penalties)&&report.winner===context.winner;
 }
 function person(s,row){
  const profile=F.identityProfile(row.identity),registered=Object.values(s.squad).find(p=>p.identity===row.identity),slot=F.roster.find(p=>p.id===row.id);
  return {...row,name:profile.name,pos:profile.pos,no:slot?.no??null,owned:!!registered,slot:registered?.id??null};
 }
 function player(s,row){return person(s,{id:row.id,identity:row.identity,minutes:row.minutes,started:!!row.started,apps:row.minutes>0?1:0,goals:row.goals,assists:row.assists,cleanSheets:row.cleanSheets,played:row.minutes>0});}
 function eventsFor(events){return events.map(event=>({...event,scorerName:F.identityProfile(event.scorerIdentity).name,assistName:event.assistIdentity===null?null:F.identityProfile(event.assistIdentity).name}));}
 function leaderFor(players){
  for(const kind of ['goals','assists','cleanSheets']){const value=Math.max(0,...players.map(p=>p[kind]));if(value>0){const leaders=players.filter(p=>p[kind]===value);return {kind,value,players:copy(leaders),tied:leaders.length>1};}}
  return null;
 }
 function presentation(context){
  const opponent=S.club(context.opponentId),isHome=context.home===own;
  return {...context,opponent:{id:opponent.id,name:opponent.name,short:opponent.short,code:opponent.code},venue:{isHome,label:isHome?S.club(own).short+' 파크':opponent.short+' 스타디움'}};
 }
 function growthFor(s,report,players,legacy){
  return (Array.isArray(report.changes)?report.changes:[]).filter(change=>{
   const profile=F.identityProfile(change?.identity);if(!profile||change.key!==F.roleKey(profile)||change.gained!==1)return false;
   return legacy?s.squad[change.id]?.identity===change.identity:players.some(p=>p.id===change.id&&p.identity===change.identity&&p.minutes>0);
  }).map(change=>person(s,{id:change.id,identity:change.identity,key:change.key,label:growthLabels[change.key],gained:change.gained}));
 }
 function healthFor(s,context,players,legacy){
  const report=s.health?.lastReport,aligned=!!report&&report.year===context.year&&report.round===context.round&&report.competition===context.competition&&report.game===s.health.playedGames;
  if(!aligned)return {healthAligned:false,injuries:[],recovered:[]};
  const rows=list=>(Array.isArray(list)?list:[]).filter(row=>F.identityProfile(row?.identity)&&(legacy?s.squad[row.id]?.identity===row.identity:players.some(p=>p.id===row.id&&p.identity===row.identity))).map(row=>person(s,copy(row)));
  return {healthAligned:true,injuries:rows(report.incidents),recovered:rows(report.recovered)};
 }
 function substitutionsFor(match,performance){
  if(!match?.players||!Array.isArray(match.decisions))return [];
  const ratings=new Map((performance?.rows||[]).map(row=>[row.id,row]));
  return match.decisions.filter(decision=>decision?.type==='sub'&&Number.isInteger(decision.minute)&&decision.minute>=1&&decision.minute<=90&&match.players[decision.out]&&match.players[decision.in]).map(decision=>{
   const out=match.players[decision.out],incoming=match.players[decision.in],outRating=ratings.get(out.id),inRating=ratings.get(incoming.id);
   return {minute:decision.minute,out:person({squad:{}},{id:out.id,identity:out.identity,minutes:out.minutes}),incoming:person({squad:{}},{id:incoming.id,identity:incoming.identity,minutes:incoming.minutes}),outMinutes:out.minutes,inMinutes:incoming.minutes,outRating:outRating?.rating??null,inRating:inRating?.rating??null};
  });
 }
 function pending(s){
  const source='pending',m=s.match;if(!m||m.phase!=='full'||m.minute!==90)return invalid(source,'현재 경기를 90분까지 마친 뒤 리포트를 볼 수 있어요.');
  try{
   const match=F.restore(m),fixture=S.fixtureFor(s);if(!fixture||match.isHome!==(fixture.home===own))return invalid(source,'현재 경기와 대진이 맞지 않아 리포트를 표시할 수 없어요.');
   const opponentId=fixture.home===own?fixture.away:fixture.home,rawOpponent=S.rawClub?.(opponentId)||S.club(opponentId);if(match.opponentName!==rawOpponent?.name)return invalid(source,'현재 경기와 상대 구단이 맞지 않아요.');
   const competition=s.competition,round=competition!=='league'?s.round:s.round+1,stage=competition!=='league'?fixture.stage:null,result=competition==='cup'?P.preview(s,match):competition==='europe'?europeModule().preview(s,match):null;
   const context={id:resultId(s.year,competition,round,stage),year:s.year,competition,round,stage,home:fixture.home,away:fixture.away,opponentId,score:[...match.score],penalties:result?.penalties?oriented(result,result.penalties):null,winner:result?result.winner:match.score[0]===match.score[1]?null:match.score[0]>match.score[1]?own:opponentId};
   const events=eventsFor(F.goalAttributions(match)),players=Object.values(match.players).map(p=>player(s,{id:p.id,identity:p.identity,minutes:p.minutes,started:match.segments[0].lineup.includes(p.id),goals:events.filter(e=>e.scorerIdentity===p.identity).length,assists:events.filter(e=>e.assistIdentity===p.identity).length,cleanSheets:p.pos==='GK'&&p.minutes===90&&match.score[1]===0?1:0})),unassignedGoals=match.score[0]-events.length;
   const performance=MP?.fromMatch(match)||null;
   return {valid:true,source,reason:null,confirmed:false,pending:true,legacy:false,limited:match.statisticsOriginMinute>0||unassignedGoals>0,...presentation(context),rank:null,points:null,cashflow:null,players,events,performance,substitutions:substitutionsFor(match,performance),growth:[],injuries:[],recovered:[],healthAligned:false,coverage:{statisticsOriginMinute:match.statisticsOriginMinute,unassignedGoals,partial:match.statisticsOriginMinute>0||unassignedGoals>0},leader:leaderFor(players)};
  }catch{return invalid(source,'현재 경기 기록을 읽을 수 없어요.');}
 }
 function read(s,options={}){
  const source=options?.source??'latest';if(!['latest','pending'].includes(source))return invalid(source,'최근 확정 경기나 현재 종료 경기 중 하나를 선택하세요.');
  if(!s||!Number.isInteger(s.year)||!s.statistics||!s.finance||!s.squad)return invalid(source,'현재 시즌의 경기 기록을 확인할 수 없어요.');
  if(source==='pending')return pending(s);
  try{
  const receipt=s.finance.ledger.filter(entry=>entry.year===s.year&&['match','cup','europe'].includes(entry.type)).at(-1),record=ST.lastMatch(s),context=latestContext(s,receipt),report=s.lastReport;
  if(!context||!report)return invalid(source,'아직 확정한 경기 리포트가 없습니다.');
  if(!reportMatches(report,context))return invalid(source,'최근 경기와 결산 리포트가 맞지 않아 내용을 섞어 표시할 수 없어요.');
  if(record&&(record.id!==context.id||record.year!==context.year||record.competition!==context.competition||record.round!==context.round||record.stage!==context.stage||record.home!==context.home||record.away!==context.away||!same(record.score,context.score)))return invalid(source,'최근 선수 기록과 경기 결과가 맞지 않아 리포트를 표시할 수 없어요.');
  if(receipt&&(receipt.id!==context.id||report.cashflow&&!same(report.cashflow,receipt)))return invalid(source,'최근 경기와 재정 결산이 맞지 않아요.');
  const legacy=!record,players=record?record.players.map(row=>player(s,row)):[],events=record?eventsFor(record.events):[],unassignedGoals=record?record.unassignedGoals:context.score[0];
  return {valid:true,source,reason:null,confirmed:true,pending:false,legacy,limited:legacy||record.statisticsOriginMinute>0||unassignedGoals>0,...presentation(context),rank:report.rank,points:report.points,cashflow:receipt?copy(receipt):null,players,events,performance:record&&MP?.fromRecord(record)||null,substitutions:[],growth:growthFor(s,report,players,legacy),...healthFor(s,context,players,legacy),coverage:{statisticsOriginMinute:record?record.statisticsOriginMinute:null,unassignedGoals,partial:legacy||record.statisticsOriginMinute>0||unassignedGoals>0},leader:leaderFor(players)};
  }catch{return invalid(source,'현재 시즌의 최근 경기 기록을 읽을 수 없어요.');}
 }
 const api={read};root.MatchReview=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
