(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),keys=['apps','starts','goals','assists','minutes','cleanSheets','yellowCards','redCards'],competitions=['all','league','cup','europe'];
 const season=()=>root.Season||(typeof require==='function'?require('./season.js'):null),cup=()=>root.Cup||(typeof require==='function'?require('./cup.js'):null),europe=()=>root.Europe||(typeof require==='function'?require('./europe.js'):null);
 const zero=()=>Object.fromEntries(keys.map(k=>[k,0])),allRecords=s=>(s.statistics?.archive||[]).flatMap(a=>a.records).concat(s.statistics?.records||[]);
 function filtered(s,competition){if(!competitions.includes(competition))throw Error('통산 기록의 대회를 선택하세요.');return allRecords(s).filter(r=>competition==='all'||r.competition===competition);}
 function coverage(s,records){const t=s.statistics;return {fromYear:t?.originYear??s.year,fromRound:(t?.originRound??0)+1,fromMinute:t?.originMatchMinute??0,partial:!t||t.originYear>1||t.originRound>0||t.originMatchMinute>0||records.some(r=>r.unassignedGoals>0),unassignedGoals:records.reduce((n,r)=>n+r.unassignedGoals,0),cardsPartial:records.some(r=>!Array.isArray(r.cards)),matches:records.length};}
 function add(row,p,r){row.apps+=p.minutes>0?1:0;row.starts+=p.started?1:0;for(const key of ['goals','assists','minutes','cleanSheets'])row[key]+=p[key];for(const c of r.cards||[]){if(c.team!==0||c.id!==p.id)continue;if(c.card==='yellow'||c.reason==='second-yellow')row.yellowCards++;if(c.card==='red')row.redCards++;}return row;}
 function summary(s,{competition='all',ownership='all',sort='goals'}={}){
  if(!['all','current','departed'].includes(ownership)||!['goals','assists','minutes','apps','cleanSheets'].includes(sort))throw Error('통산 기록의 범위와 정렬을 선택하세요.');const records=filtered(s,competition),owned=new Set(Object.values(s.squad).map(p=>p.identity)),rows=new Map();
  const include=identity=>{if(!rows.has(identity)){const p=F.identityProfile(identity);rows.set(identity,{identity,name:p.name,pos:p.pos,owned:owned.has(identity),...zero()});}return rows.get(identity);};
  for(const p of Object.values(s.squad))include(p.identity);for(const r of records)for(const p of r.players)add(include(p.identity),p,r);
  const players=[...rows.values()].filter(p=>ownership==='all'||p.owned===(ownership==='current')).sort((a,b)=>b[sort]-a[sort]||b.minutes-a.minutes||a.name.localeCompare(b.name,'ko')||a.identity.localeCompare(b.identity));let rank=0,last=null;players.forEach((p,i)=>{if(p[sort]!==last)rank=i+1;p.rank=p[sort]>0?rank:null;last=p[sort];});
  const leaders={};for(const key of ['goals','assists','minutes','cleanSheets']){const candidates=[...rows.values()].filter(p=>key!=='cleanSheets'||p.pos==='GK'),best=Math.max(0,...candidates.map(p=>p[key]));leaders[key]={value:best,players:best?candidates.filter(p=>p[key]===best).map(p=>({identity:p.identity,name:p.name})):[]};}
  return {competition,ownership,sort,players,leaders,coverage:coverage(s,records),seasons:new Set(records.map(r=>r.year)).size,goals:records.reduce((n,r)=>n+r.score[0],0),recordedGoals:[...rows.values()].reduce((n,p)=>n+p.goals,0)};
 }
 function player(s,identity,competition='all'){
  const registered=Object.values(s.squad).find(p=>p.identity===identity),history=allRecords(s);if(!registered&&!history.some(r=>r.players.some(p=>p.identity===identity)))return {valid:false,reason:'우리 구단에 등록된 기록이 없는 선수입니다.'};
  const profile=F.identityProfile(identity),records=filtered(s,competition),total=zero(),seasons=new Map(),games=[];
  for(const r of records){const p=r.players.find(p=>p.identity===identity);if(!p)continue;if(!seasons.has(r.year))seasons.set(r.year,{year:r.year,division:r.division,...zero(),cardsPartial:false,partial:r.year===s.statistics.originYear&&(s.statistics.originRound>0||s.statistics.originMatchMinute>0)});const year=seasons.get(r.year);add(total,p,r);add(year,p,r);year.cardsPartial||=!Array.isArray(r.cards);year.partial||=r.statisticsOriginMinute>0||r.unassignedGoals>0;if(!p.minutes)continue;const home=r.home==='brynwell',opponent=season().club(home?r.away:r.home);games.push({id:r.id,year:r.year,label:r.competition==='league'?'리그 '+r.round+'R':r.competition==='cup'?'국내컵 '+cup().stageNames[r.stage]:'유럽 '+europe().stageNames[r.stage],opponent:opponent.short,home,score:[...r.score],minutes:p.minutes,goals:p.goals,assists:p.assists,started:p.started});}
  if(registered&&!seasons.has(s.year))seasons.set(s.year,{year:s.year,division:s.league.division,...zero(),cardsPartial:false,partial:false});
  return {valid:true,identity,name:profile.name,pos:profile.pos,owned:!!registered,competition,total,seasons:[...seasons.values()].sort((a,b)=>b.year-a.year),games:games.reverse(),coverage:coverage(s,records),currentXp:registered?.xp??null};
 }
 const api={summary,player};root.CareerRecords=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
