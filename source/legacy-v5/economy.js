(function(root){
 'use strict';
 const F=root.Football||(typeof require==='function'?require('./engine.js'):null),copy=x=>JSON.parse(JSON.stringify(x));
 const money=n=>Number.isSafeInteger(n)&&Math.abs(n)<=10000000000;
 const positions=['GK','DEF','MID','FW'],boardTasks={wins:{threshold:3,amount:20000},growth:{threshold:3,amount:15000},youth:{threshold:270,amount:25000}};
 const clubIds=['brynwell','aldermere','norhaven','bellwick','redmere','montevaro','selcanto','falkenruh'],cupBonuses=[12000,22000,50000];
 const marketPerson=id=>F.market.find(p=>p.identity===id);
 function youthIds(seed,year,cycle,pos){return typeof F.youthCandidates==='function'?F.youthCandidates(seed,year,cycle,pos).map(p=>typeof p==='string'?p:p.identity):[];}
 function offeredPerson(s,identity){
  const market=marketPerson(identity);if(market)return market;
  const person=F.identityProfile(identity);if(!person?.academy||person.academySeed!==s.seed||person.academyYear!==s.year)return null;
  const report=s.career?.reports?.find(r=>r.cycle===person.academyCycle&&r.pos===person.pos&&r.candidates?.includes(identity)),paid=s.finance.ledger.some(e=>e.type==='scout'&&e.year===s.year&&e.cycle===person.academyCycle&&e.pos===person.pos&&e.amount===-12000);
  return report&&paid&&youthIds(s.seed,s.year,person.academyCycle,person.pos).includes(identity)?person:null;
 }
 function initialize(s){s.finance={opening:160000,balance:160000,origin:{year:s.year,round:s.round},ledger:[],marketUsed:[],transferWeek:null,outcome:null};return s;}
 function wages(s){return Object.values(s.squad).reduce((n,p)=>n+F.identityProfile(p.identity||p.id).wage,0);}
 function resale(p){const base=F.identityProfile(p.identity||p.id),growth=Math.max(0,p[F.roleKey(p)]-base[F.roleKey(base)]);return Math.floor(Math.min(base.fee*.85,base.fee*.7+growth*1000)/1000)*1000;}
 function quote(s,identity,slot){const incoming=offeredPerson(s,identity),outgoing=s.squad[slot];if(!incoming||!outgoing||incoming.pos!==outgoing.pos)throw Error('같은 포지션의 이적·유소년 선수를 선택하세요.');const credit=resale(outgoing),fee=incoming.fee,cost=fee-credit+5000;return {fee,credit,commission:5000,cost,wageChange:incoming.wage-F.identityProfile(outgoing.identity||outgoing.id).wage,balanceAfter:s.finance.balance-cost};}
 function recruit(s,identity,slot){if(s.competition==='cup'||!s.match||s.match.phase!=='prep'||s.match.minute!==0)throw Error('영입은 리그 경기를 시작하기 전에 할 수 있어요.');if(s.finance.transferWeek===s.year+'-'+s.round)throw Error('이번 주 영입을 완료했어요. 다음 경기 뒤 다시 살펴보세요.');if(s.finance.marketUsed.includes(identity)||Object.values(s.squad).some(p=>p.identity===identity))throw Error('이번 시즌에 이미 계약한 선수입니다.');const terms=quote(s,identity,slot);if(terms.balanceAfter<0)throw Error('영입 차액을 지불할 구단 자금이 부족합니다.');const next=copy(s),outgoing=next.squad[slot],fresh=F.profileForSlot(slot,identity);next.squad[slot]={...fresh,xp:0};next.match.players[slot]=F.create(next.match.seed,{players:next.squad}).players[slot];next.finance.balance=terms.balanceAfter;next.finance.marketUsed.push(identity);next.finance.transferWeek=next.year+'-'+next.round;next.finance.ledger.push({id:'transfer-'+next.year+'-'+(next.round+1),type:'transfer',year:next.year,round:next.round+1,amount:-terms.cost,incoming:identity,outgoing:outgoing.identity||outgoing.id,outgoingPrimary:outgoing[F.roleKey(outgoing)],slot,...terms});root.Career?.register(next,slot);return next;}
 function payScout(s,pos,cycle){
  if(s.competition==='cup'||!s.match||s.match.phase!=='prep'||s.match.minute!==0||s.round>=14)throw Error('유소년 탐색은 리그 경기를 시작하기 전에 할 수 있어요.');
  if(!positions.includes(pos)||cycle!==Math.floor(s.round/7)+1)throw Error('이번 탐색 기간과 포지션을 선택하세요.');
  if(s.finance.ledger.some(e=>e.id==='scout-'+s.year+'-'+cycle)||s.career?.reports?.some(r=>r.cycle===cycle))throw Error('이번 기간의 유소년 보고서를 이미 받았어요.');
  if(!money(s.finance.balance)||s.finance.balance<12000)throw Error('탐색 비용을 지불할 구단 자금이 부족합니다.');
  const entry={id:'scout-'+s.year+'-'+cycle,type:'scout',year:s.year,round:s.round+1,cycle,pos,amount:-12000};s.finance.balance-=12000;s.finance.ledger.push(entry);return entry;
 }
 function awardBoard(s,task,progress){
  const rule=boardTasks[task];if(!rule||!Number.isInteger(s.round)||s.round<1||s.round>14||!Number.isSafeInteger(progress)||progress<rule.threshold||progress>100000000)throw Error('완료한 구단 과제의 보상만 받을 수 있어요.');
  const id='board-'+s.year+'-'+task;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 구단 과제의 보상을 이미 받았어요.');if(!money(s.finance.balance+rule.amount))throw Error('구단 재정을 반영할 수 없어요.');
  const entry={id,type:'board',year:s.year,round:s.round,task,progress,amount:rule.amount};s.finance.balance+=entry.amount;s.finance.ledger.push(entry);return entry;
 }
 function applyRound(s,fixture,score){const id='match-'+s.year+'-'+(s.round+1);if(s.finance.ledger.some(e=>e.id===id))throw Error('이 경기의 재정을 이미 반영했습니다.');const gate=fixture.home==='brynwell'?25000:10000,sponsor=7500,bonus=score[0]>score[1]?2500:score[0]===score[1]?1000:0,payroll=wages(s),income=gate+sponsor+bonus,amount=income-payroll,entry={id,type:'match',year:s.year,round:s.round+1,gate,sponsor,bonus,payroll,income,amount};s.finance.balance+=amount;s.finance.ledger.push(entry);s.finance.transferWeek=null;return entry;}
 function applyCup(s,result){
  if(!result||!Number.isInteger(result.stage)||result.stage<0||result.stage>2||result.week!==s.round||!Number.isInteger(s.round)||s.round<1||s.round>14||!clubIds.includes(result.home)||!clubIds.includes(result.away)||result.home===result.away||![result.home,result.away].includes('brynwell')||![result.home,result.away].includes(result.winner))throw Error('완료한 컵 경기의 재정만 반영할 수 있어요.');
  const id='cup-'+s.year+'-'+result.stage;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 컵 경기의 재정을 이미 반영했습니다.');
  const gate=result.home==='brynwell'?18000:8000,advanceBonus=result.winner==='brynwell'?cupBonuses[result.stage]:0,income=gate+advanceBonus;if(!money(s.finance.balance+income))throw Error('구단 재정을 반영할 수 없어요.');
  const entry={id,type:'cup',year:s.year,round:s.round,stage:result.stage,home:result.home,away:result.away,winner:result.winner,gate,advanceBonus,income,amount:income};s.finance.balance+=income;s.finance.ledger.push(entry);return entry;
 }
 function goal(s,table){const me=table.find(c=>c.id==='brynwell'),target=s.year===1?6:s.year===2?4:1,achieved=me.rank<=target,bonus=achieved?(me.rank===1?100000:me.rank<=4?60000:30000):0;return {target,rank:me.rank,achieved,bonus};}
 function finishSeason(s,table){const id='goal-'+s.year;if(s.finance.ledger.some(e=>e.id===id))throw Error('이 시즌 보상을 이미 반영했습니다.');const outcome=goal(s,table);s.finance.outcome=outcome;s.finance.balance+=outcome.bonus;s.finance.ledger.push({id,type:'goal',year:s.year,round:14,amount:outcome.bonus,...outcome});}
 function nextYear(s){s.finance.marketUsed=[];s.finance.transferWeek=null;s.finance.outcome=null;}
 function validate(s,table){
  const fail=()=>{throw Error('저장한 구단 재정을 읽을 수 없어요.');},f=s.finance;
  if(!f||f.opening!==160000||!money(f.balance)||!f.origin||!Number.isInteger(f.origin.year)||f.origin.year<1||f.origin.year>s.year||!Number.isInteger(f.origin.round)||f.origin.round<0||f.origin.round>14||f.origin.year===s.year&&f.origin.round>s.round||!Array.isArray(f.ledger)||f.ledger.length>150000||f.ledger.some(e=>!e||typeof e.id!=='string')||new Set(f.ledger.map(e=>e.id)).size!==f.ledger.length||!Array.isArray(f.marketUsed)||new Set(f.marketUsed).size!==f.marketUsed.length||f.marketUsed.some(id=>!marketPerson(id)&&!F.identityProfile(id)?.academy))fail();
  let balance=f.opening,order=-1;const contracts=Object.fromEntries(F.roster.map(p=>[p.id,p.identity])),usedByYear={},scouts={};
  for(const e of f.ledger){
   if(!money(e.amount)||!Number.isInteger(e.year)||e.year<f.origin.year||e.year>s.year||!Number.isInteger(e.round)||e.round<1||e.round>14||e.year===f.origin.year&&e.round<=f.origin.round&&e.type!=='goal'&&!(e.round===f.origin.round&&['cup','board'].includes(e.type)))fail();
   const stamp=e.year*100+e.round*4+({scout:0,transfer:0,match:1,board:2,cup:2,goal:2}[e.type]??999);if(stamp<order)fail();order=stamp;
   if(e.type==='scout'){
    if(e.id!=='scout-'+e.year+'-'+e.cycle||![1,2].includes(e.cycle)||Math.floor((e.round-1)/7)+1!==e.cycle||!positions.includes(e.pos)||e.amount!==-12000||balance<12000||scouts[e.year+'-'+e.cycle]||e.year===s.year&&e.round>s.round+1)fail();scouts[e.year+'-'+e.cycle]=e;
   }else if(e.type==='transfer'){
    const incoming=F.identityProfile(e.incoming),outgoing=F.identityProfile(e.outgoing),slot=F.roster.find(p=>p.id===e.slot);
    if(e.id!=='transfer-'+e.year+'-'+e.round||!incoming||!outgoing||!slot||incoming.pos!==slot.pos||outgoing.pos!==slot.pos||contracts[e.slot]!==e.outgoing||Object.values(contracts).includes(e.incoming)||usedByYear[e.year]?.includes(e.incoming)||e.fee!==incoming.fee||e.commission!==5000||!Number.isInteger(e.outgoingPrimary)||e.outgoingPrimary<outgoing[F.roleKey(outgoing)]||e.outgoingPrimary>99)fail();
    if(!marketPerson(e.incoming)){const scout=scouts[e.year+'-'+incoming.academyCycle];if(!incoming.academy||incoming.academySeed!==s.seed||incoming.academyYear!==e.year||!scout||scout.pos!==incoming.pos||scout.round>e.round||!youthIds(s.seed,e.year,incoming.academyCycle,incoming.pos).includes(e.incoming))fail();}
    const credit=resale({...outgoing,[F.roleKey(outgoing)]:e.outgoingPrimary});if(e.credit!==credit||e.cost!==e.fee-e.credit+5000||e.amount!==-e.cost||e.wageChange!==incoming.wage-outgoing.wage||!money(e.balanceAfter)||e.balanceAfter!==balance+e.amount||e.balanceAfter<0)fail();
    if(e.year===s.year&&e.round>s.round+1)fail();contracts[e.slot]=e.incoming;(usedByYear[e.year]??=[]).push(e.incoming);
   }else if(e.type==='match'){
    const payroll=Object.values(contracts).reduce((n,id)=>n+F.identityProfile(id).wage,0),result=e.year===s.year?s.results.find(r=>r.round===e.round-1&&(r.home==='brynwell'||r.away==='brynwell')):null;
    if(e.id!=='match-'+e.year+'-'+e.round||![10000,25000].includes(e.gate)||e.sponsor!==7500||![0,1000,2500].includes(e.bonus)||e.payroll!==payroll||e.income!==e.gate+e.sponsor+e.bonus||e.amount!==e.income-e.payroll||e.year===s.year&&e.round>s.round)fail();
    if(result){const score=result.home==='brynwell'?result.goals:[result.goals[1],result.goals[0]];if(e.gate!==(result.home==='brynwell'?25000:10000)||e.bonus!==(score[0]>score[1]?2500:score[0]===score[1]?1000:0))fail();}
   }else if(e.type==='cup'){
    if(e.id!=='cup-'+e.year+'-'+e.stage||!Number.isInteger(e.stage)||e.stage<0||e.stage>2||!clubIds.includes(e.home)||!clubIds.includes(e.away)||e.home===e.away||![e.home,e.away].includes('brynwell')||![e.home,e.away].includes(e.winner)||e.gate!==(e.home==='brynwell'?18000:8000)||e.advanceBonus!==(e.winner==='brynwell'?cupBonuses[e.stage]:0)||e.income!==e.gate+e.advanceBonus||e.amount!==e.income||Object.hasOwn(e,'payroll')||e.year===s.year&&e.round>s.round)fail();
    if(e.year===s.year){const result=s.cup?.results?.find(r=>r.stage===e.stage&&(r.home==='brynwell'||r.away==='brynwell'));if(!result||result.week!==e.round||result.home!==e.home||result.away!==e.away||result.winner!==e.winner)fail();}
   }else if(e.type==='board'){
    const rule=boardTasks[e.task];if(!rule||e.id!=='board-'+e.year+'-'+e.task||!Number.isSafeInteger(e.progress)||e.progress<rule.threshold||e.progress>100000000||e.amount!==rule.amount||e.year===s.year&&e.round>s.round)fail();
   }else if(e.type==='goal'){
    const target=e.year===1?6:e.year===2?4:1,rank=e.year===s.year?table.find(c=>c.id==='brynwell').rank:s.history.find(h=>h.year===e.year)?.rank,bonus=rank<=target?(rank===1?100000:rank<=4?60000:30000):0;
    if(e.id!=='goal-'+e.year||e.round!==14||e.target!==target||e.rank!==rank||e.achieved!==(rank<=target)||e.bonus!==bonus||e.amount!==bonus||e.year===s.year&&s.round!==14)fail();
   }else fail();balance+=e.amount;
  }
  if(balance!==f.balance||F.roster.some(p=>s.squad[p.id].identity!==contracts[p.id]))fail();
  for(const result of s.cup?.results||[])if(result.home==='brynwell'||result.away==='brynwell'){const entry=f.ledger.find(e=>e.id==='cup-'+s.year+'-'+result.stage);if(!entry||entry.type!=='cup'||entry.round!==result.week||entry.home!==result.home||entry.away!==result.away||entry.winner!==result.winner)fail();}
  for(let year=f.origin.year;year<=s.year;year++){const begin=year===f.origin.year?f.origin.round:0,end=year===s.year?s.round:14;for(let round=begin+1;round<=end;round++)if(!f.ledger.some(e=>e.id==='match-'+year+'-'+round))fail();if(end===14&&!(year===f.origin.year&&begin===14)&&!f.ledger.some(e=>e.id==='goal-'+year))fail();}
  const used=usedByYear[s.year]||[];if(used.length!==f.marketUsed.length||used.some(id=>!f.marketUsed.includes(id)))fail();
  const thisWeek=f.ledger.some(e=>e.type==='transfer'&&e.year===s.year&&e.round===s.round+1);if(f.transferWeek!==(thisWeek?s.year+'-'+s.round:null))fail();const expected=s.round===14?goal(s,table):null;if(JSON.stringify(f.outcome)!==JSON.stringify(expected))fail();return s;
 }
 const api={initialize,wages,resale,quote,recruit,payScout,awardBoard,applyRound,applyCup,goal,finishSeason,nextYear,validate};root.Economy=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
