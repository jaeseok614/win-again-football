(function(root){
 'use strict';
 const S=root.Season||(typeof require==='function'?require('./season.js'):null),F=root.Football||(typeof require==='function'?require('./engine.js'):null),P=root.Cup||(typeof require==='function'?require('./cup.js'):null),U=root.Europe||(typeof require==='function'?require('./europe.js'):null),own='brynwell';
 const forYear=(s,year)=>year===s.year?s.statistics?.records||[]:s.statistics?.archive.find(a=>a.year===year)?.records||[];
 const label=r=>r.competition==='league'?'리그 '+r.round+'R':r.competition==='cup'?'국내컵 '+P.stageNames[r.stage]:'유럽 '+U.stageNames[r.stage];
 function years(s){return [s.year,...s.history.map(h=>h.year)].sort((a,b)=>b-a);}
 function list(s,year=s.year){if(!years(s).includes(year))throw Error('경기 기록의 시즌을 선택하세요.');return forYear(s,year).map(r=>({id:r.id,year:r.year,label:label(r),opponent:S.club(r.home===own?r.away:r.home).name,home:r.home===own,score:[...r.score]}));}
 function read(s,id){
  const records=[...(s.statistics?.records||[]),...(s.statistics?.archive||[]).flatMap(a=>a.records)],r=records.find(r=>r.id===id);if(!r)return {valid:false,reason:'이 경기의 상세 기록이 저장에 남아 있지 않습니다.'};
  const opponentId=r.home===own?r.away:r.home,opponent=S.club(opponentId),receipt=s.finance.ledger.find(e=>e.id===id),result=r.year===s.year&&r.competition!=='league'?(r.competition==='cup'?s.cup:s.europe)?.results.find(x=>x.stage===r.stage&&(x.home===own||x.away===own)):null;
  const winner=r.score[0]>r.score[1]?own:r.score[0]<r.score[1]?opponentId:receipt?.winner??null,shootout=r.score[0]===r.score[1]&&!!winner;
  const savedPenalties=result?.penalties||receipt?.penalties,penalties=savedPenalties?(r.home===own?[...savedPenalties]:[savedPenalties[1],savedPenalties[0]]):null;
  const players=r.players.map(p=>{const profile=F.identityProfile(p.identity);return {...p,name:profile.name,pos:profile.pos,owned:Object.values(s.squad).some(x=>x.identity===p.identity),redMinute:r.cards?.find(e=>e.team===0&&e.id===p.id&&e.card==='red')?.minute??null,suspended:!!r.suspended?.includes(p.identity)};});
  const byId=new Map(players.map(p=>[p.id,p])),timeline=r.events.map(e=>({minute:e.minute,type:'goal',team:0,title:F.identityProfile(e.scorerIdentity).name+' 득점',detail:e.assistIdentity?'도움 · '+F.identityProfile(e.assistIdentity).name:'도움 기록 없음'}));
  for(const c of r.cards||[]){const name=c.team===0?byId.get(c.id).name:'상대 선수 '+c.id.replace(/^opp/,''),red=c.card==='red';timeline.push({minute:c.minute,type:red?'red':'yellow',team:c.team,title:name+' · '+(red?'퇴장':'경고'),detail:red?(c.reason==='second-yellow'?'경고 2회 퇴장':'직접 퇴장'):'경고'});}
  for(let i=1;i<r.segments.length;i++){const before=r.segments[i-1].lineup,after=r.segments[i].lineup,entered=after.filter(id=>!before.includes(id)),left=before.filter(id=>!after.includes(id));if(entered.length)timeline.push({minute:r.segments[i].start,type:'sub',team:0,title:'우리 구단 교체',detail:left.map(id=>byId.get(id).name).join(' · ')+' → '+entered.map(id=>byId.get(id).name).join(' · ')});}
  timeline.sort((a,b)=>a.minute-b.minute||({goal:0,yellow:1,red:2,sub:3}[a.type]-{goal:0,yellow:1,red:2,sub:3}[b.type]));
  const staff=receipt?.type==='match'?s.finance.ledger.filter(e=>e.type==='staff-wages'&&e.year===r.year&&e.round===r.round).reduce((n,e)=>n+e.amount,0):0;
  return {valid:true,id:r.id,year:r.year,division:r.division,competition:r.competition,label:label(r),home:r.home===own,opponent:{id:opponentId,name:opponent.name,short:opponent.short},score:[...r.score],winner,outcome:winner===own?'승리':winner?'패배':'무승부',shootout,penalties,players,timeline,
   partial:r.statisticsOriginMinute>0||r.unassignedGoals>0,originMinute:r.statisticsOriginMinute,unassignedGoals:r.unassignedGoals,cardsTracked:Array.isArray(r.cards),finance:receipt?{amount:receipt.amount+staff,matchAmount:receipt.amount,staffPayroll:Math.abs(staff)}:null};
 }
 const api={years,list,read};root.MatchArchive=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
