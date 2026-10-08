(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),E=root.Economy||(typeof require==='function'?require('./economy.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const roundCount=s=>root.Season?.leagueRoundCount?.(s)??14,scoutCycle=(s,completed)=>completed<Math.ceil(roundCount(s)/2)?1:2;
 const positions=['GK','DEF','MID','FW'],tasks={wins:{threshold:3,amount:20000,increment:1},growth:{threshold:3,amount:15000,increment:3},youth:{threshold:270,amount:25000,increment:90}};
 const candidates=(s,cycle,pos)=>F.youthCandidates(s.seed,s.year,cycle,pos).map(p=>typeof p==='string'?p:p.identity);
 function initialize(s){s.career={year:s.year,originRound:s.round,originLedger:s.finance.ledger.length,reports:[],baselines:{},minutes:{},missions:{wins:null,growth:null,youth:null}};for(const slot of Object.keys(s.squad))register(s,slot);return s;}
 function register(s,slot){if(!s.career)return s;const p=s.squad[slot];if(!p||!F.identityProfile(p.identity))throw Error('등록한 선수를 확인할 수 없어요.');if(!Object.hasOwn(s.career.baselines,p.identity))s.career.baselines[p.identity]=p[F.roleKey(p)];if(!Object.hasOwn(s.career.minutes,p.identity))s.career.minutes[p.identity]=0;return s;}
 function transactions(s){return s.finance.ledger.slice(s.career.originLedger).filter(e=>e.year===s.year);}
 function cupMatchesThrough(s,round){return transactions(s).filter(e=>e.type==='cup'&&e.round<=round&&s.cup?.results?.some(r=>r.stage===e.stage&&r.week===e.round&&(r.home==='brynwell'||r.away==='brynwell'))).length;}
 function europeMatchesThrough(s,round){return transactions(s).filter(e=>e.type==='europe'&&e.round<=round&&s.europe?.results?.some(r=>r.stage===e.stage&&r.week===e.round&&(r.home==='brynwell'||r.away==='brynwell'))).length;}
 function nonLeagueMatchesThrough(s,round){return cupMatchesThrough(s,round)+europeMatchesThrough(s,round);}
 function matchesThrough(s,round){return round-s.career.originRound+nonLeagueMatchesThrough(s,round);}
 function coachedWeeks(s,round){
  const start=root.Staff?.clock?.(s,s.year,s.career.originRound)??((s.year-1)*14+s.career.originRound),end=root.Staff?.clock?.(s,s.year,round)??((s.year-1)*14+round),weeks=new Set(),ledger=s.finance.ledger,releases=new Map();
  for(const e of ledger)if(e.type==='staff-release')releases.set(e.role+'-'+e.started,(root.Staff?.clock?.(s,e.year,e.round)??((e.year-1)*14+e.round)));
  for(const e of ledger){
   if(!['staff-hire','staff-renew'].includes(e.type)||e.role==='MED')continue;
   const expires=Math.min(e.expires,releases.get(e.role+'-'+e.started)??e.expires);
   for(let week=Math.max(start,e.trainingFrom);week<Math.min(end,expires);week++)weeks.add(week);
  }
  return weeks;
 }
 function winsThrough(s,round){return s.results.filter(r=>r.round>=s.career.originRound&&r.round<round&&(r.home==='brynwell'||r.away==='brynwell')).filter(r=>r.home==='brynwell'?r.goals[0]>r.goals[1]:r.goals[1]>r.goals[0]).length;}
 function progress(s){
  let growth=0,youth=0;const c=s.career;
  for(const p of Object.values(s.squad))if(Object.hasOwn(c.baselines,p.identity))growth=Math.max(growth,p[F.roleKey(p)]-c.baselines[p.identity]);
  for(const e of transactions(s))if(e.type==='transfer'&&Object.hasOwn(c.baselines,e.outgoing))growth=Math.max(growth,e.outgoingPrimary-c.baselines[e.outgoing]);
  for(const [identity,minutes] of Object.entries(c.minutes))if(F.identityProfile(identity)?.academy)youth=Math.max(youth,minutes);
  return {wins:winsThrough(s,s.round),growth:Math.max(0,growth),youth};
 }
 function scout(s,pos){
  if(!positions.includes(pos))throw Error('탐색할 포지션을 선택하세요.');if(s.competition!=='league'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=roundCount(s))throw Error('유소년 탐색은 리그 경기 전에 할 수 있어요.');
  const cycle=scoutCycle(s,s.round);if(s.career.reports.some(r=>r.cycle===cycle))throw Error('이번 기간의 유소년 보고서를 이미 받았어요.');
  const next=copy(s),ids=candidates(next,cycle,pos);E.payScout(next,pos,cycle);next.career.reports.push({cycle,round:next.round+1,pos,candidates:ids});return next;
 }
 function advance(s,match,{cup=false,nonLeague=false}={}){
  for(const played of Object.values(match.players)){register(s,played.id);s.career.minutes[played.identity]+=played.minutes;}
  const current=progress(s);for(const [task,rule] of Object.entries(tasks))if(!((cup||nonLeague||s.competition!=='league')&&task==='wins')&&s.career.missions[task]===null&&current[task]>=rule.threshold){E.awardBoard(s,task,current[task]);s.career.missions[task]=s.round;}return s;
 }
 function nextYear(s){return initialize(s);}
 function validate(s){
  const fail=()=>{throw Error('저장한 유소년·구단 과제를 읽을 수 없어요.');},c=s.career,ledger=s.finance.ledger;
  if(!c||c.year!==s.year||!Number.isInteger(c.originRound)||c.originRound<0||c.originRound>s.round||!Number.isInteger(c.originLedger)||c.originLedger<0||c.originLedger>ledger.length||!Array.isArray(c.reports)||c.reports.length>2||!c.baselines||typeof c.baselines!=='object'||Array.isArray(c.baselines)||!c.minutes||typeof c.minutes!=='object'||Array.isArray(c.minutes)||!c.missions||typeof c.missions!=='object'||Array.isArray(c.missions))fail();
  if(ledger.slice(0,c.originLedger).some(e=>e.year===s.year&&['scout','board'].includes(e.type))||ledger.slice(c.originLedger).some(e=>e.year!==s.year||e.round<c.originRound||e.round===c.originRound&&!['cup','europe','board'].includes(e.type)))fail();
  const entries=transactions(s),scouts=entries.filter(e=>e.type==='scout'),boards=entries.filter(e=>e.type==='board');
  if(scouts.length!==c.reports.length||new Set(c.reports.map(r=>r?.cycle)).size!==c.reports.length)fail();
  for(const report of c.reports){
   if(!report||![1,2].includes(report.cycle)||!Number.isInteger(report.round)||report.round<c.originRound+1||report.round>Math.min(roundCount(s),s.round+1)||scoutCycle(s,report.round-1)!==report.cycle||!positions.includes(report.pos)||!Array.isArray(report.candidates)||report.candidates.length!==3||JSON.stringify(report.candidates)!==JSON.stringify(candidates(s,report.cycle,report.pos)))fail();
   const entry=scouts.find(e=>e.id==='scout-'+s.year+'-'+report.cycle);if(!entry||entry.round!==report.round||entry.pos!==report.pos||entry.cycle!==report.cycle||entry.amount!==-(E.scoutCost?.(s,report.year)||12000))fail();
  }
  const identities=new Set(Object.values(s.squad).map(p=>p.identity));for(const e of entries)if(e.type==='transfer'){identities.add(e.incoming);identities.add(e.outgoing);}
  const baselineIds=Object.keys(c.baselines),minuteIds=Object.keys(c.minutes);if(baselineIds.length!==identities.size||minuteIds.length!==identities.size||baselineIds.some(id=>!identities.has(id))||minuteIds.some(id=>!identities.has(id)))fail();
  const completed=matchesThrough(s,s.round);let minutes=0;for(const identity of identities){const profile=F.identityProfile(identity),base=c.baselines[identity],played=c.minutes[identity];if(!profile||profile.identity!==identity||!positions.includes(profile.pos)||!Number.isInteger(base)||base<0||base>99||!Number.isInteger(played)||played<0||played>completed*90)fail();minutes+=played;}
  const receiptIds=new Set(entries.filter(e=>['match','cup','europe'].includes(e.type)).map(e=>e.id));
  const tracked=(s.statistics?.records||[]).filter(r=>receiptIds.has(r.id));
  const lost=tracked.reduce((sum,r)=>sum+(r.cards||[]).filter(e=>e.team===0&&e.card==='red').reduce((n,e)=>n+90-e.minute,0),0);
  if(minutes!==completed*990-lost)fail();
  // When every career match is tracked, check each identity, including sold players.
  if(tracked.length===completed)for(const identity of identities){const actual=tracked.reduce((n,r)=>n+r.players.filter(p=>p.identity===identity).reduce((v,p)=>v+p.minutes,0),0);if(c.minutes[identity]!==actual)fail();}
  const current=progress(s);if(Object.keys(c.missions).length!==3||boards.length!==Object.values(c.missions).filter(r=>r!==null).length)fail();
  for(const [task,rule] of Object.entries(tasks)){
   const earned=c.missions[task],entry=boards.find(e=>e.id==='board-'+s.year+'-'+task);
   const coached=task==='growth'?coachedWeeks(s,earned===null?s.round+1:earned):new Set(),lastWeek=(root.Staff?.clock?.(s,s.year,earned===null?s.round:earned-1)??((s.year-1)*14+(earned===null?s.round:earned-1))),bonus=coached.has(lastWeek)?1:0;
   if(earned===null){if(entry||current[task]>=rule.threshold&&(task!=='growth'||s.competition!=='league'||!s.match||s.trained!=='technique'||current.growth>rule.threshold+1+bonus))fail();continue;}
   if(!Number.isInteger(earned)||earned<c.originRound||earned===c.originRound&&nonLeagueMatchesThrough(s,earned)===0||earned>s.round||!entry||entry.task!==task||entry.round!==earned||entry.amount!==rule.amount||!Number.isInteger(entry.progress)||entry.progress<rule.threshold||entry.progress>=rule.threshold+rule.increment+bonus||entry.progress>current[task])fail();
   if(task==='wins'&&(entry.progress!==winsThrough(s,earned)||winsThrough(s,earned-1)>=rule.threshold))fail();
   if(task==='growth'&&entry.progress>(earned-c.originRound)*3+coached.size+nonLeagueMatchesThrough(s,earned)||task==='youth'&&entry.progress>matchesThrough(s,earned)*90)fail();
  }
  return s;
 }
 const api={initialize,register,progress,scout,advance,nextYear,validate,tasks};root.Career=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
